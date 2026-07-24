import { randomBytes, timingSafeEqual } from 'node:crypto';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { app } from 'electron';
import { readQwenApiKey } from './first-run';
import {
  inspectAttachment,
  readAttachmentImage,
  readAttachmentText,
  searchAttachmentText,
} from './attachment-store';

const QWEN_BASE_URL = resolveQwenBaseUrl();
const QWEN_MODEL = process.env.CATNIP_QWEN_VISION_MODEL || 'qwen-vl-plus';
const MAX_BODY_BYTES = 64 * 1024;
let server: http.Server | null = null;
let bridgeUrl = '';
let bridgeToken = '';
let startPromise: Promise<void> | null = null;

function resolveQwenBaseUrl(): string {
  const raw = process.env.CATNIP_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const parsed = new URL(raw);
  const isLocalDevelopment = !app.isPackaged
    && parsed.protocol === 'http:'
    && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
  const isDashScope = parsed.protocol === 'https:'
    && (parsed.hostname === 'dashscope.aliyuncs.com' || parsed.hostname === 'dashscope-intl.aliyuncs.com');
  if (!isLocalDevelopment && !isDashScope) {
    throw new Error('Qwen Base URL 必须使用受支持的 DashScope HTTPS 地址');
  }
  return raw.replace(/\/+$/, '');
}

export function startAttachmentBridge(): Promise<void> {
  if (server && bridgeUrl) return Promise.resolve();
  if (startPromise) return startPromise;
  bridgeToken = randomBytes(32).toString('hex');
  server = http.createServer((request, response) => void handleRequest(request, response));
  const pending = new Promise<void>((resolve, reject) => {
    const active = server!;
    active.once('error', reject);
    active.listen(0, '127.0.0.1', () => {
      const address = active.address();
      if (!address || typeof address === 'string') return reject(new Error('附件桥接服务未取得本地端口'));
      bridgeUrl = `http://127.0.0.1:${address.port}/rpc`;
      resolve();
    });
  }).finally(() => { startPromise = null; });
  startPromise = pending;
  return pending;
}

export async function stopAttachmentBridge(): Promise<void> {
  const active = server;
  server = null;
  bridgeUrl = '';
  bridgeToken = '';
  if (active) await new Promise<void>((resolve) => active.close(() => resolve()));
}

export function getAttachmentBridgeEnv(): Record<string, string> {
  return bridgeUrl && bridgeToken ? {
    CATNIP_ATTACHMENT_BRIDGE_URL: bridgeUrl,
    CATNIP_ATTACHMENT_BRIDGE_TOKEN: bridgeToken,
  } : {};
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.method !== 'POST' || request.url !== '/rpc') return send(response, 404, { ok: false, error: 'not found' });
  if (!authorized(request)) return send(response, 401, { ok: false, error: 'unauthorized' });
  try {
    const body = await readJsonBody(request);
    const result = await dispatch(String(body.method || ''), asRecord(body.params));
    send(response, 200, { ok: true, result });
  } catch (error) {
    send(response, 400, { ok: false, error: safeError(error) });
  }
}

async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  const conversationId = stringParam(params.conversationId);
  const attachmentId = stringParam(params.attachmentId);
  switch (method) {
    case 'status':
      return { qwenConfigured: Boolean(readQwenApiKey()), model: QWEN_MODEL };
    case 'inspect':
      return inspectAttachment(conversationId, attachmentId);
    case 'read_text':
      return { text: readAttachmentText(conversationId, attachmentId, numberParam(params.offset, 0), numberParam(params.limit, 12_000)) };
    case 'search':
      return { matches: searchAttachmentText(conversationId, attachmentId, stringParam(params.query)) };
    case 'analyze':
      return analyzeImage(conversationId, attachmentId, stringParam(params.prompt, '请分析这张图片，提取文字、对象、元件、连接关系、置信度和不确定项。'));
    default:
      throw new Error(`未知附件方法: ${method}`);
  }
}

async function analyzeImage(conversationId: string, attachmentId: string, prompt: string): Promise<unknown> {
  const apiKey = readQwenApiKey();
  if (!apiKey) throw new Error('尚未配置千问 Qwen API Key；DeepSeek 主 Agent 仍可读取本地提取文字');
  const { dataUrl, manifest } = readAttachmentImage(conversationId, attachmentId);
  const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          {
            type: 'text',
            text: `${prompt}\n只返回 JSON，字段为 summary、ocrText、components、connections、warnings、confidence。看不清时必须写入 warnings，不要猜测。`,
          },
        ],
      }],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`Qwen 请求失败（HTTP ${response.status}）：${payload.error?.message || '请检查 Key、地域和额度'}`);
  const content = String(payload.choices?.[0]?.message?.content || '').trim();
  const normalized = parseModelJson(content);
  return {
    attachmentId,
    name: manifest.name,
    model: QWEN_MODEL,
    evidence: normalized.value,
    warning: normalized.warning,
  };
}

function parseModelJson(content: string): { value: unknown; warning?: string } {
  const candidate = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return { value: JSON.parse(candidate) };
  } catch {
    return { value: { summary: candidate.slice(0, 12_000), warnings: ['Qwen 未返回标准 JSON'] }, warning: '响应已按受限文本降级' };
  }
}

function authorized(request: IncomingMessage): boolean {
  const provided = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!provided || provided.length !== bridgeToken.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(bridgeToken));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const raw of request) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  return asRecord(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]').slice(0, 1000);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringParam(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberParam(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
