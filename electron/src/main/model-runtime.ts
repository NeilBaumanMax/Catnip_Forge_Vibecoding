import fs from 'node:fs';
import { createModelConfigStore } from './model-config-store';
import type { ModelConfigStore } from './model-config-store';
import { createModelCredentialStore, type ModelCredentialStore } from './model-credentials';
import { getApiKeyPath, getQwenApiKeyPath } from './paths';

export interface OpenAiCompatibleRuntimeModel {
  profileId: string;
  providerId: string;
  providerName: string;
  baseUrl: string;
  upstreamModel: string;
  authToken: string;
}

function legacyKey(filePath: string, environmentName: string): string | null {
  try {
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(new RegExp(`^${environmentName}\\s*=\\s*(.+)$`, 'i'));
      const value = (match?.[1] ?? (!line.includes('=') ? line : '')).trim();
      if (value.length > 12 && !/your-key-here/i.test(value)) return value;
    }
  } catch { /* upgrade compatibility only */ }
  return null;
}

export function hydrateOpenAiCompatibleModel(
  capability: 'software-assistant' | 'vision',
  dependencies?: { configStore?: ModelConfigStore; credentialStore?: ModelCredentialStore },
): OpenAiCompatibleRuntimeModel {
  const config = (dependencies?.configStore ?? createModelConfigStore()).read();
  const profileId = config.defaults[capability];
  const model = config.models.find((item) => item.id === profileId);
  if (!model || !model.enabled || !model.capabilities.includes(capability)) throw new Error(`默认${capability === 'vision' ? '视觉' : '软件助手'}模型不可用`);
  if (model.protocol !== 'openai-compatible') throw new Error('所选模型尚未完成 OpenAI-compatible 协议适配');
  const provider = config.providers.find((item) => item.id === model.providerId);
  if (!provider || !provider.enabled || !provider.protocols.includes('openai-compatible')) throw new Error('所选模型的供应商不可用或协议不兼容');
  let authToken: string | null;
  try {
    authToken = (dependencies?.credentialStore ?? createModelCredentialStore()).get(provider.credentialId);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '无法读取模型安全凭据');
  }
  if (!authToken && provider.id === 'deepseek') authToken = legacyKey(getApiKeyPath(), 'DEEPSEEK_API_KEY');
  if (!authToken && provider.id === 'qwen') authToken = legacyKey(getQwenApiKeyPath(), 'QWEN_API_KEY');
  if (!authToken) throw new Error(`尚未配置 ${provider.name} 的模型凭据`);
  return {
    profileId: model.id,
    providerId: provider.id,
    providerName: provider.name,
    baseUrl: provider.baseUrl.replace(/\/+$/, ''),
    upstreamModel: model.upstreamModel,
    authToken,
  };
}
