import fs from 'node:fs';
import path from 'node:path';
import type { ProviderConfig } from '../common/model-config';
import { writeUtf8Atomically } from './atomic-file';
import { getRuntimeDataDir } from './paths';

const SECRET_ENV_KEYS = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'] as const;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
  return value as Record<string, unknown>;
}

export function claudeCodeBaseUrl(provider: ProviderConfig): string {
  const normalized = provider.baseUrl.replace(/\/+$/, '');
  return provider.id === 'deepseek' && !normalized.endsWith('/anthropic') ? `${normalized}/anthropic` : normalized;
}

export function buildClaudeCodeSettingsEnv(provider: ProviderConfig): Record<string, string> {
  const config = provider.claudeCode;
  if (!provider.enabled || !provider.protocols.includes('anthropic-compatible') || !config) {
    throw new Error(`${provider.name} 不是可用的 Claude Code 供应商`);
  }
  return {
    ANTHROPIC_BASE_URL: claudeCodeBaseUrl(provider),
    ANTHROPIC_MODEL: config.primaryModel,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: config.haikuModel || config.primaryModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: config.sonnetModel || config.primaryModel,
    ANTHROPIC_DEFAULT_OPUS_MODEL: config.opusModel || config.primaryModel,
  };
}

function writeSanitizedSettings(filePath: string, content: string, containedSecret: boolean): void {
  if (!containedSecret) {
    writeUtf8Atomically(filePath, content);
    return;
  }
  // Never move a plaintext credential into the generic .bak file.
  const handle = fs.openSync(filePath, 'r+');
  try {
    fs.ftruncateSync(handle, 0);
    fs.writeFileSync(handle, content, 'utf8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
}

function sanitizeBackupCredentials(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Claude settings 备份路径不是安全的普通文件');
  let settings: Record<string, unknown>;
  try {
    settings = object(JSON.parse(fs.readFileSync(filePath, 'utf8')), 'Claude settings backup');
  } catch (error) {
    throw new Error(`Claude settings 备份无法安全清理，原文件已保留：${String(error)}`);
  }
  if (settings.env == null) return;
  const env = object(settings.env, 'Claude settings backup.env');
  if (!SECRET_ENV_KEYS.some((key) => key in env)) return;
  const sanitized = { ...env };
  for (const key of SECRET_ENV_KEYS) delete sanitized[key];
  const content = `${JSON.stringify({ ...settings, env: sanitized }, null, 2)}\n`;
  const handle = fs.openSync(filePath, 'r+');
  try {
    fs.ftruncateSync(handle, 0);
    fs.writeFileSync(handle, content, 'utf8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
}

export function syncClaudeCodeSettings(
  provider: ProviderConfig,
  filePath = path.join(getRuntimeDataDir('claude-config'), 'settings.json'),
): void {
  let settings: Record<string, unknown> = {};
  let containedSecret = false;
  if (fs.existsSync(filePath)) {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Claude settings 路径不是安全的普通文件');
    try {
      settings = object(JSON.parse(fs.readFileSync(filePath, 'utf8')), 'Claude settings');
    } catch (error) {
      throw new Error(`Claude settings 无法读取，原文件已保留：${String(error)}`);
    }
  }
  const rawEnv = settings.env == null ? {} : object(settings.env, 'Claude settings.env');
  const env: Record<string, unknown> = { ...rawEnv };
  for (const key of SECRET_ENV_KEYS) {
    if (key in env) containedSecret = true;
    delete env[key];
  }
  Object.assign(env, buildClaudeCodeSettingsEnv(provider));
  const next = `${JSON.stringify({ ...settings, env }, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeSanitizedSettings(filePath, next, containedSecret);
  sanitizeBackupCredentials(`${filePath}.bak`);
}
