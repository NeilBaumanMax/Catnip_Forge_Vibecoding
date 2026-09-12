import fs from 'node:fs';
import { getApiKeyPath } from './paths';
import { createModelConfigStore } from './model-config-store';
import { createModelCredentialStore } from './model-credentials';

export interface EngineeringAgentModelSnapshot {
  profileId: string;
  providerId: string;
  providerName: string;
  upstreamModel: string;
  protocol: 'anthropic-compatible';
  baseUrl: string;
  credentialId: string;
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

export function snapshotEngineeringAgentModel(profileId?: string | null): EngineeringAgentModelSnapshot {
  const config = createModelConfigStore().read();
  const selectedId = profileId || config.defaults['engineering-agent'];
  const model = config.models.find((item) => item.id === selectedId);
  if (!model || !model.enabled || !model.capabilities.includes('engineering-agent')) throw new Error('所选工程 Agent 模型不存在、已停用或用途不兼容');
  if (model.protocol !== 'anthropic-compatible') throw new Error('所选模型尚未完成工程 Agent 协议适配');
  const provider = config.providers.find((item) => item.id === model.providerId);
  if (!provider || !provider.enabled || !provider.protocols.includes('anthropic-compatible')) throw new Error('所选模型的供应商不可用或协议不兼容');
  const normalizedBaseUrl = provider.baseUrl.replace(/\/+$/, '');
  const baseUrl = provider.id === 'deepseek' && !normalizedBaseUrl.endsWith('/anthropic')
    ? `${normalizedBaseUrl}/anthropic`
    : normalizedBaseUrl;
  return {
    profileId: model.id,
    providerId: provider.id,
    providerName: provider.name,
    upstreamModel: model.upstreamModel,
    protocol: 'anthropic-compatible',
    baseUrl,
    credentialId: provider.credentialId,
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
