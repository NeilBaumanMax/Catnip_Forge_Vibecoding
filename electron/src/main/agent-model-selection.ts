import fs from 'node:fs';
import { getApiKeyPath } from './paths';
import { createModelConfigStore } from './model-config-store';
import { createModelCredentialStore } from './model-credentials';
import type { ClaudeCodeAuthField } from '../common/model-config';
import { buildClaudeCodeSettingsEnv } from './claude-provider-switch';

export interface EngineeringAgentModelSnapshot {
  profileId: string;
  providerId: string;
  providerName: string;
  upstreamModel: string;
  protocol: 'anthropic-compatible';
  baseUrl: string;
  credentialId: string;
  authField: ClaudeCodeAuthField;
  haikuModel: string;
  sonnetModel: string;
  opusModel: string;
}

export interface EngineeringAgentRuntimeModel extends EngineeringAgentModelSnapshot {
  authToken: string;
  authSource: 'secure-storage' | 'legacy-file';
}

function readLegacyDeepSeekKey(): string | null {
  try {
    const text = fs.readFileSync(getApiKeyPath(), 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^DEEPSEEK_API_KEY\s*=\s*(.+)$/i);
      const value = (match?.[1] ?? (!line.includes('=') ? line : '')).trim();
      if (value.length > 12 && !/your-key-here/i.test(value)) return value;
    }
  } catch { /* legacy fallback is optional */ }
  return null;
}

export function snapshotEngineeringAgentModel(): EngineeringAgentModelSnapshot {
  const config = createModelConfigStore().read();
  const provider = config.providers.find((item) => item.id === config.activeClaudeProviderId);
  if (!provider?.claudeCode) throw new Error('当前 Claude Code 供应商不存在或配置不完整');
  const env = buildClaudeCodeSettingsEnv(provider);
  return {
    profileId: provider.id,
    providerId: provider.id,
    providerName: provider.name,
    upstreamModel: env.ANTHROPIC_MODEL,
    protocol: 'anthropic-compatible',
    baseUrl: env.ANTHROPIC_BASE_URL,
    credentialId: provider.credentialId,
    authField: provider.claudeCode.authField,
    haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
  };
}

export function hydrateEngineeringAgentModel(snapshot: EngineeringAgentModelSnapshot): EngineeringAgentRuntimeModel {
  let authToken: string | null;
  try {
    authToken = createModelCredentialStore().get(snapshot.credentialId);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '无法读取模型安全凭据');
  }
  let authSource: EngineeringAgentRuntimeModel['authSource'] = 'secure-storage';
  if (!authToken && snapshot.providerId === 'deepseek') {
    authToken = readLegacyDeepSeekKey();
    authSource = 'legacy-file';
  }
  if (!authToken) throw new Error(`尚未配置 ${snapshot.providerName} 的模型凭据`);
  return { ...snapshot, authToken, authSource };
}
