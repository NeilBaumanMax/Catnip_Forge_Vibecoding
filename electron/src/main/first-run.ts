import fs from 'fs';
import path from 'path';
import { logger } from './worker/logger';
import { getApiKeyPath, getQwenApiKeyPath, getRuntimeDir } from './paths';

/**
 * 首次启动检查 — 确保 App 所需环境就绪。
 *
 * 检查项：
 * 1. API Key 是否存在（resources/apikey.txt）
 * 2. Playwright 浏览器是否存在
 * 3. 必要目录是否已创建
 */

export interface StartupStatus {
  apiKeyReady: boolean;
  qwenApiKeyReady: boolean;
  playwrightReady: boolean;
  firstRun: boolean;
}

/** 执行启动检查，返回系统状态 */
export function checkStartupStatus(): StartupStatus {
  const apiKeyReady = checkApiKey();
  const qwenApiKeyReady = checkQwenApiKey();
  const playwrightReady = checkPlaywright();
  const firstRun = !apiKeyReady;

  if (firstRun) {
    logger.info('first-run:detected', { apiKeyReady, playwrightReady });
  }

  return { apiKeyReady, qwenApiKeyReady, playwrightReady, firstRun };
}

/** 检查 API Key 是否存在 — 直接检查 resources/apikey.txt */
function checkApiKey(): boolean {
  const keyPath = getApiKeyPath();
  try {
    if (fs.existsSync(keyPath)) {
      const content = fs.readFileSync(keyPath, 'utf-8').trim();
      if (isUsableApiKeyContent(content)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function isUsableApiKeyContent(content: string): boolean {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.includes('sk-your-key-here')) return false;
    if (/^DEEPSEEK_API_KEY\s*=\s*\S+/.test(line)) return true;
    return line.length > 12;
  }
  return false;
}

function checkQwenApiKey(): boolean {
  try {
    const content = fs.readFileSync(getQwenApiKeyPath(), 'utf-8').trim();
    return readNamedKey(content, 'QWEN_API_KEY').length > 12;
  } catch {
    return false;
  }
}

function readNamedKey(content: string, name: string): string {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'i'));
    return (match?.[1] || line).trim();
  }
  return '';
}

/** 检查 Playwright 浏览器是否存在 */
function checkPlaywright(): boolean {
  // Runtime 浏览器资源随 extraResources 放在 runtime/playwright。
  const pwDir = path.join(getRuntimeDir(), 'playwright');
  if (!fs.existsSync(pwDir)) return false;

  // 检查 chromium 核心是否存在
  const chromiumDir = path.join(pwDir, 'chromium-1223');
  return fs.existsSync(chromiumDir);
}

/** 显示 API Key 配置弹窗（通过 IPC 发到 renderer） */
export function getApiKeyPromptData(): Record<string, unknown> {
  return {
    type: 'first-run',
    message: '首次使用需要配置 DeepSeek API Key',
    detail: '请粘贴你的 DeepSeek API Key 以启用 AI 采集功能。\n\nKey 仅保存在本地，不会上传。',
    keyPath: getApiKeyPath(),
    qwenKeyPath: getQwenApiKeyPath(),
    qwenOptional: true,
  };
}

/** 保存用户输入的 API Key */
export function saveApiKey(key: string): boolean {
  try {
    const normalized = key.trim().replace(/^DEEPSEEK_API_KEY\s*=\s*/i, '').trim();
    if (!isUsableApiKeyContent(normalized)) return false;
    const keyPath = getApiKeyPath();
    const dir = path.dirname(keyPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(keyPath, `DEEPSEEK_API_KEY=${normalized}\n`, 'utf-8');
    logger.info('first-run:apikey-saved', { keyPath });
    return true;
  } catch (err) {
    logger.error('first-run:apikey-save-failed', { error: String(err) });
    return false;
  }
}

/** 首启同时保存 DeepSeek（必填）与 Qwen（选填）Key。 */
export function saveStartupApiKeys(deepSeekKey: string, qwenKey = ''): { ok: boolean; qwenSaved: boolean } {
  const normalizedQwen = qwenKey.trim().replace(/^QWEN_API_KEY\s*=\s*/i, '').trim();
  // 先完成所有格式校验，避免可选 Key 写错时留下半完成的首启状态。
  if (normalizedQwen && (normalizedQwen.length <= 12 || /your-key-here/i.test(normalizedQwen))) {
    return { ok: false, qwenSaved: false };
  }
  if (!saveApiKey(deepSeekKey)) return { ok: false, qwenSaved: false };
  if (!normalizedQwen) return { ok: true, qwenSaved: false };
  try {
    const keyPath = getQwenApiKeyPath();
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, `QWEN_API_KEY=${normalizedQwen}\n`, 'utf-8');
    logger.info('first-run:apikey-saved', { keyPath, provider: 'qwen' });
    return { ok: true, qwenSaved: true };
  } catch (error) {
    logger.error('first-run:apikey-save-failed', { error: String(error), provider: 'qwen' });
    // Qwen 是可选增强能力，保存失败不能阻断必填 DeepSeek 的首启流程。
    return { ok: true, qwenSaved: false };
  }
}

export function readQwenApiKey(): string | null {
  try {
    const key = readNamedKey(fs.readFileSync(getQwenApiKeyPath(), 'utf-8'), 'QWEN_API_KEY');
    return key.length > 12 ? key : null;
  } catch {
    return null;
  }
}
