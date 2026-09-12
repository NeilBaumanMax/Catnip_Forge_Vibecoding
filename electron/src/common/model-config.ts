export const MODEL_CONFIG_SCHEMA_VERSION = 1 as const;

export type ModelProtocol = 'anthropic-compatible' | 'openai-compatible';
export type ModelCapability = 'engineering-agent' | 'software-assistant' | 'vision';
export type ModelDefaultUse = ModelCapability;

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  protocols: ModelProtocol[];
  enabled: boolean;
  builtIn: boolean;
  credentialId: string;
}

export interface ModelProfile {
  id: string;
  providerId: string;
  name: string;
  upstreamModel: string;
  protocol: ModelProtocol;
  capabilities: ModelCapability[];
  enabled: boolean;
  builtIn: boolean;
}

export interface ModelConfigState {
  schemaVersion: typeof MODEL_CONFIG_SCHEMA_VERSION;
  revision: number;
  providers: ProviderConfig[];
  models: ModelProfile[];
  defaults: Partial<Record<ModelDefaultUse, string>>;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PROTOCOLS = new Set<ModelProtocol>(['anthropic-compatible', 'openai-compatible']);
const CAPABILITIES = new Set<ModelCapability>(['engineering-agent', 'software-assistant', 'vision']);
const SENSITIVE_KEY = /^(?:api[-_]?key|access[-_]?secret|secret|token|authorization|password)$/i;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const normalized = value.replace(/\r/g, '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return normalized;
}

function id(value: unknown, label: string): string {
  const normalized = text(value, label, 64).toLowerCase();
  if (!ID_PATTERN.test(normalized)) throw new Error(`${label} is invalid`);
  return normalized;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function uniqueList<T extends string>(
  value: unknown,
  label: string,
  allowed: ReadonlySet<T>,
  maxItems: number,
): T[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) throw new Error(`${label} is invalid`);
  const result = value.map((item, index) => {
    if (typeof item !== 'string' || !allowed.has(item as T)) throw new Error(`${label}[${index}] is invalid`);
    return item as T;
  });
  if (new Set(result).size !== result.length) throw new Error(`${label} contains duplicates`);
  return result;
}

function baseUrl(value: unknown, label: string): string {
  const raw = text(value, label, 500);
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error(`${label} must be a valid URL`); }
  if (parsed.protocol !== 'https:') throw new Error(`${label} must use HTTPS`);
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error(`${label} must not contain credentials, query, or fragment`);
  return parsed.toString().replace(/\/$/, '');
}

function rejectSensitiveFields(value: Record<string, unknown>, label: string): void {
  for (const key of Object.keys(value)) {
    if (SENSITIVE_KEY.test(key)) throw new Error(`${label} must not contain Secret material`);
  }
}

function normalizeProvider(value: unknown, index: number): ProviderConfig {
  const input = record(value, `providers[${index}]`);
  rejectSensitiveFields(input, `providers[${index}]`);
  return {
    id: id(input.id, `providers[${index}].id`),
    name: text(input.name, `providers[${index}].name`, 100),
    baseUrl: baseUrl(input.baseUrl, `providers[${index}].baseUrl`),
    protocols: uniqueList(input.protocols, `providers[${index}].protocols`, PROTOCOLS, 2),
    enabled: boolean(input.enabled, `providers[${index}].enabled`),
    builtIn: boolean(input.builtIn, `providers[${index}].builtIn`),
    credentialId: id(input.credentialId, `providers[${index}].credentialId`),
  };
}

function normalizeModel(value: unknown, index: number): ModelProfile {
  const input = record(value, `models[${index}]`);
  rejectSensitiveFields(input, `models[${index}]`);
  const protocol = text(input.protocol, `models[${index}].protocol`, 40) as ModelProtocol;
  if (!PROTOCOLS.has(protocol)) throw new Error(`models[${index}].protocol is invalid`);
  return {
    id: id(input.id, `models[${index}].id`),
    providerId: id(input.providerId, `models[${index}].providerId`),
    name: text(input.name, `models[${index}].name`, 100),
    upstreamModel: text(input.upstreamModel, `models[${index}].upstreamModel`, 200),
    protocol,
    capabilities: uniqueList(input.capabilities, `models[${index}].capabilities`, CAPABILITIES, 3),
    enabled: boolean(input.enabled, `models[${index}].enabled`),
    builtIn: boolean(input.builtIn, `models[${index}].builtIn`),
  };
}

export function createDefaultModelConfig(): ModelConfigState {
  return {
    schemaVersion: MODEL_CONFIG_SCHEMA_VERSION,
    revision: 0,
    providers: [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        protocols: ['anthropic-compatible', 'openai-compatible'],
        enabled: true,
        builtIn: true,
        credentialId: 'deepseek',
      },
      {
        id: 'qwen',
        name: 'Qwen / DashScope',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        protocols: ['openai-compatible'],
        enabled: true,
        builtIn: true,
        credentialId: 'qwen',
      },
    ],
    models: [
      {
        id: 'deepseek-v4-pro',
        providerId: 'deepseek',
        name: 'DeepSeek V4 Pro',
        upstreamModel: 'deepseek-v4-pro',
        protocol: 'anthropic-compatible',
        capabilities: ['engineering-agent'],
        enabled: true,
        builtIn: true,
      },
      {
        id: 'deepseek-v4-flash',
        providerId: 'deepseek',
        name: 'DeepSeek V4 Flash',
        upstreamModel: 'deepseek-v4-flash',
        protocol: 'openai-compatible',
        capabilities: ['software-assistant'],
        enabled: true,
        builtIn: true,
      },
      {
        id: 'qwen-vl-plus',
        providerId: 'qwen',
        name: 'Qwen VL Plus',
        upstreamModel: 'qwen-vl-plus',
        protocol: 'openai-compatible',
        capabilities: ['vision'],
        enabled: true,
        builtIn: true,
      },
    ],
    defaults: {
      'engineering-agent': 'deepseek-v4-pro',
      'software-assistant': 'deepseek-v4-flash',
      vision: 'qwen-vl-plus',
    },
  };
}

export function normalizeModelConfig(value: unknown): ModelConfigState {
  const input = record(value, 'model config');
  rejectSensitiveFields(input, 'model config');
  if (input.schemaVersion !== MODEL_CONFIG_SCHEMA_VERSION) throw new Error('model config schemaVersion is unsupported');
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 0) throw new Error('model config revision is invalid');
  if (!Array.isArray(input.providers) || input.providers.length === 0 || input.providers.length > 50) throw new Error('model config providers are invalid');
  if (!Array.isArray(input.models) || input.models.length === 0 || input.models.length > 200) throw new Error('model config models are invalid');
  const providers = input.providers.map(normalizeProvider);
  const models = input.models.map(normalizeModel);
  if (new Set(providers.map((item) => item.id)).size !== providers.length) throw new Error('provider ids must be unique');
  if (new Set(providers.map((item) => item.credentialId)).size !== providers.length) throw new Error('provider credential ids must be unique');
  if (new Set(models.map((item) => item.id)).size !== models.length) throw new Error('model ids must be unique');

  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  for (const model of models) {
    const provider = providerById.get(model.providerId);
    if (!provider) throw new Error(`model ${model.id} references a missing provider`);
    if (!provider.protocols.includes(model.protocol)) throw new Error(`model ${model.id} uses an unsupported provider protocol`);
  }

  const rawDefaults = record(input.defaults, 'model config defaults');
  rejectSensitiveFields(rawDefaults, 'model config defaults');
  const defaults: Partial<Record<ModelDefaultUse, string>> = {};
  for (const capability of CAPABILITIES) {
    const value = rawDefaults[capability];
    if (value == null) continue;
    const modelId = id(value, `model config defaults.${capability}`);
    const model = models.find((entry) => entry.id === modelId);
    const provider = model ? providerById.get(model.providerId) : undefined;
    if (!model || !model.capabilities.includes(capability) || !model.enabled || !provider?.enabled) {
      throw new Error(`model config defaults.${capability} must reference an enabled compatible model`);
    }
    defaults[capability] = modelId;
  }

  return {
    schemaVersion: MODEL_CONFIG_SCHEMA_VERSION,
    revision: Number(input.revision),
    providers,
    models,
    defaults,
  };
}

export function cloneModelConfig(value: ModelConfigState): ModelConfigState {
  return structuredClone(value);
}
