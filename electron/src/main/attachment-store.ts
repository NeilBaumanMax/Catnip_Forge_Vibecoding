import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { BrowserWindow, dialog } from 'electron';
import { getRuntimeDataDir } from './paths';

export type AttachmentKind = 'image' | 'pdf' | 'word' | 'powerpoint' | 'text';

export interface AttachmentReference {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
  textAvailable: boolean;
  warning?: string;
}

interface AttachmentManifest extends AttachmentReference {
  conversationId: string;
  createdAt: string;
  sha256: string;
  originalFile: string;
  extractedFile?: string;
}

const ROOT = process.env.CATNIP_ATTACHMENT_ROOT
  ? path.resolve(process.env.CATNIP_ATTACHMENT_ROOT)
  : getRuntimeDataDir('attachments');
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 6;
const MAX_EXTRACTED_CHARS = 600_000;
const ALLOWED = new Map<string, { kind: AttachmentKind; mime: string }>([
  ['.png', { kind: 'image', mime: 'image/png' }],
  ['.jpg', { kind: 'image', mime: 'image/jpeg' }],
  ['.jpeg', { kind: 'image', mime: 'image/jpeg' }],
  ['.webp', { kind: 'image', mime: 'image/webp' }],
  ['.pdf', { kind: 'pdf', mime: 'application/pdf' }],
  ['.docx', { kind: 'word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
  ['.pptx', { kind: 'powerpoint', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }],
  ['.txt', { kind: 'text', mime: 'text/plain' }],
  ['.md', { kind: 'text', mime: 'text/markdown' }],
  ['.json', { kind: 'text', mime: 'application/json' }],
]);

export async function pickChatAttachments(window: BrowserWindow, conversationId: string): Promise<{ attachments: AttachmentReference[] }> {
  validateConversationId(conversationId);
  const result = await dialog.showOpenDialog(window, {
    title: '添加图片或文档',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '支持的附件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'docx', 'pptx', 'txt', 'md', 'json'] },
      { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
      { name: '文档', extensions: ['pdf', 'docx', 'pptx', 'txt', 'md', 'json'] },
    ],
  });
  if (result.canceled) return { attachments: [] };
  if (result.filePaths.length > MAX_FILES) throw new Error(`每次最多添加 ${MAX_FILES} 个附件`);
  return { attachments: result.filePaths.map((file) => importAttachment(file, conversationId)) };
}

export function importAttachmentPaths(conversationId: string, filePaths: string[]): { attachments: AttachmentReference[] } {
  validateConversationId(conversationId);
  if (!Array.isArray(filePaths) || filePaths.length > MAX_FILES) throw new Error(`每次最多添加 ${MAX_FILES} 个附件`);
  return { attachments: filePaths.map((file) => importAttachment(file, conversationId)) };
}

export function validateAttachmentReferences(conversationId: string, inputs: unknown): AttachmentReference[] {
  validateConversationId(conversationId);
  if (!Array.isArray(inputs)) return [];
  if (inputs.length > MAX_FILES) throw new Error(`一条消息最多包含 ${MAX_FILES} 个附件`);
  return inputs.map((input) => {
    if (!input || typeof input !== 'object') throw new Error('附件引用无效');
    const id = String((input as { id?: unknown }).id || '');
    return toReference(readManifest(conversationId, id));
  });
}

export function inspectAttachment(conversationId: string, attachmentId: string): AttachmentReference & { extractedChars: number; preview: string } {
  const manifest = readManifest(conversationId, attachmentId);
  const text = readExtractedText(manifest);
  return { ...toReference(manifest), extractedChars: text.length, preview: text.slice(0, 1200) };
}

export function readAttachmentText(conversationId: string, attachmentId: string, offset = 0, limit = 12_000): string {
  const manifest = readManifest(conversationId, attachmentId);
  const text = readExtractedText(manifest);
  const start = Math.max(0, Math.floor(offset));
  return text.slice(start, start + Math.min(30_000, Math.max(1, Math.floor(limit))));
}

export function searchAttachmentText(conversationId: string, attachmentId: string, query: string): Array<{ offset: number; text: string }> {
  const text = readAttachmentText(conversationId, attachmentId, 0, MAX_EXTRACTED_CHARS);
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const results: Array<{ offset: number; text: string }> = [];
  let cursor = 0;
  while (results.length < 20) {
    const index = text.toLowerCase().indexOf(needle, cursor);
    if (index < 0) break;
    results.push({ offset: index, text: text.slice(Math.max(0, index - 180), Math.min(text.length, index + needle.length + 420)) });
    cursor = index + needle.length;
  }
  return results;
}

export function readAttachmentImage(conversationId: string, attachmentId: string): { dataUrl: string; manifest: AttachmentManifest } {
  const manifest = readManifest(conversationId, attachmentId);
  if (manifest.kind !== 'image') throw new Error('当前视觉工具只直接接收 PNG、JPG/JPEG 或 WEBP；文档请先读取本地提取文字');
  const file = path.join(recordDir(conversationId, attachmentId), manifest.originalFile);
  const data = fs.readFileSync(file);
  if (data.length > MAX_FILE_BYTES) throw new Error('图片超过视觉服务大小限制');
  return { dataUrl: `data:${manifest.mimeType};base64,${data.toString('base64')}`, manifest };
}

export function buildAttachmentPromptContext(conversationId: string, attachments: AttachmentReference[]): string {
  if (!attachments.length) return '';
  const lines = [
    '【本轮聊天附件】',
    `conversationId=${conversationId}`,
    '需要视觉理解时调用 attachment.* / vision.qwen_analyze MCP；Qwen 只提供证据，最终决策仍由你完成。',
  ];
  for (const item of attachments) {
    const inspected = inspectAttachment(conversationId, item.id);
    lines.push(`- ${item.name} | attachmentId=${item.id} | ${item.kind} | ${item.size} bytes | textAvailable=${item.textAvailable}`);
    if (inspected.preview) lines.push(`  本地文字预览：${inspected.preview.replace(/\s+/g, ' ').slice(0, 500)}`);
    if (item.warning) lines.push(`  警告：${item.warning}`);
  }
  return lines.join('\n');
}

function importAttachment(sourceFile: string, conversationId: string): AttachmentReference {
  const resolved = path.resolve(sourceFile);
  const extension = path.extname(resolved).toLowerCase();
  const allowed = ALLOWED.get(extension);
  if (!allowed) throw new Error(`不支持的附件类型：${extension || '(无扩展名)'}`);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error('只能添加文件');
  if (stat.size <= 0 || stat.size > MAX_FILE_BYTES) throw new Error(`单个附件必须小于 ${MAX_FILE_BYTES / 1024 / 1024} MB`);

  const id = `att_${randomUUID().replace(/-/g, '')}`;
  const directory = recordDir(conversationId, id);
  fs.mkdirSync(directory, { recursive: true });
  const originalFile = `original${extension}`;
  const target = path.join(directory, originalFile);
  fs.copyFileSync(resolved, target);
  const buffer = fs.readFileSync(target);
  const extraction = extractText(buffer, extension);
  let extractedFile: string | undefined;
  if (extraction.text) {
    extractedFile = 'extracted.txt';
    fs.writeFileSync(path.join(directory, extractedFile), extraction.text.slice(0, MAX_EXTRACTED_CHARS), 'utf8');
  }
  const manifest: AttachmentManifest = {
    id,
    conversationId,
    name: safeDisplayName(path.basename(resolved)),
    mimeType: allowed.mime,
    size: stat.size,
    kind: allowed.kind,
    textAvailable: Boolean(extractedFile),
    warning: extraction.warning,
    createdAt: new Date().toISOString(),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    originalFile,
    extractedFile,
  };
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return toReference(manifest);
}

function extractText(buffer: Buffer, extension: string): { text: string; warning?: string } {
  if (extension === '.txt' || extension === '.md' || extension === '.json') {
    return { text: buffer.toString('utf8') };
  }
  if (extension === '.docx' || extension === '.pptx') {
    try {
      const entries = readZipEntries(buffer);
      const pattern = extension === '.docx'
        ? /^word\/(?:document|header\d+|footer\d+)\.xml$/
        : /^ppt\/(?:slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/;
      const text = [...entries.entries()]
        .filter(([name]) => pattern.test(name))
        .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
        .map(([name, data]) => `\n--- ${name} ---\n${xmlToText(data.toString('utf8'))}`)
        .join('\n')
        .trim();
      return { text, warning: text ? undefined : '文档没有提取到可读文字，可能需要视觉解析' };
    } catch (error) {
      return { text: '', warning: `文档文字提取失败：${error instanceof Error ? error.message : String(error)}` };
    }
  }
  if (extension === '.pdf') {
    const text = extractPdfText(buffer);
    return { text, warning: text.length > 40 ? 'PDF 文字为本地最佳努力提取；复杂排版或扫描页需要视觉解析' : 'PDF 没有提取到足够文字，可能是扫描件' };
  }
  return { text: '' };
}

function extractPdfText(buffer: Buffer): string {
  const chunks: string[] = [];
  const sources: Buffer[] = [buffer];
  const sourceText = buffer.toString('latin1');
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (const match of sourceText.matchAll(streamPattern)) {
    try { sources.push(zlib.inflateSync(Buffer.from(match[1], 'latin1'))); } catch { /* uncompressed or unsupported stream */ }
  }
  for (const source of sources) {
    const text = source.toString('latin1');
    for (const match of text.matchAll(/\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")/g)) chunks.push(decodePdfString(match[0].slice(1, match[0].lastIndexOf(')'))));
    for (const array of text.matchAll(/\[(.*?)\]\s*TJ/gs)) {
      const pieces = [...array[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((part) => decodePdfString(part[0].slice(1, -1)));
      if (pieces.length) chunks.push(pieces.join(''));
    }
  }
  return [...new Set(chunks.map((item) => item.trim()).filter(Boolean))].join('\n').slice(0, MAX_EXTRACTED_CHARS);
}

function decodePdfString(value: string): string {
  const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, char: string) => escapes[char] || char)
    .replace(/\\([0-7]{1,3})/g, (_match, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('不是有效的 Office Open XML 文件');
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  for (let index = 0; index < count; index++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');
    if (buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(start, start + compressedSize);
      if (method === 0) entries.set(name, Buffer.from(compressed));
      if (method === 8) entries.set(name, zlib.inflateRawSync(compressed));
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<(?:w:tab|a:tab)\b[^>]*\/>/g, '\t')
    .replace(/<(?:w:br|a:br)\b[^>]*\/>/g, '\n')
    .replace(/<\/(?:w:p|a:p)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readManifest(conversationId: string, attachmentId: string): AttachmentManifest {
  validateConversationId(conversationId);
  if (!/^att_[a-f0-9]{32}$/.test(attachmentId)) throw new Error('附件 ID 无效');
  const file = path.join(recordDir(conversationId, attachmentId), 'manifest.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as AttachmentManifest;
  if (parsed.id !== attachmentId || parsed.conversationId !== conversationId) throw new Error('附件不属于当前对话');
  return parsed;
}

function readExtractedText(manifest: AttachmentManifest): string {
  if (!manifest.extractedFile) return '';
  return fs.readFileSync(path.join(recordDir(manifest.conversationId, manifest.id), manifest.extractedFile), 'utf8');
}

function recordDir(conversationId: string, attachmentId: string): string {
  validateConversationId(conversationId);
  return path.join(ROOT, conversationId, attachmentId);
}

function validateConversationId(value: string): void {
  if (!/^conversation-[a-f0-9-]{20,}$/i.test(value)) throw new Error('对话 ID 无效');
}

function safeDisplayName(value: string): string {
  return value.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').slice(0, 180) || 'attachment';
}

function toReference(manifest: AttachmentManifest): AttachmentReference {
  const { id, name, mimeType, size, kind, textAvailable, warning } = manifest;
  return { id, name, mimeType, size, kind, textAvailable, warning };
}
