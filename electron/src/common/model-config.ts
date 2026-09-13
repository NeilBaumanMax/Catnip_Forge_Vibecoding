export const MODEL_CONFIG_SCHEMA_VERSION = 3 as const;

export type ModelProtocol = 'anthropic-compatible' | 'openai-compatible';
export type ModelCapability = 'engineering-agent' | 'software-assistant' | 'vision';
export type ModelDefaultUse = ModelCapability;
export type ClaudeCodeAuthField = 'ANTHROPIC_AUTH_TOKEN' | 'ANTHROPIC_API_KEY';
export type ClaudeApiFormat = 'anthropic';
export type ModelSetupMode = 'preset' | 'custom';

export interface ClaudeCodeProviderConfig {
  apiFormat: ClaudeApiFormat;
  isFullUrl: boolean;
  authField: ClaudeCodeAuthField;
  primaryModel: string;
  modelsUrl?: string;
  haikuModel?: string;
  haikuModelName?: string;
  sonnetModel?: string;
  sonnetModelName?: string;
  opusModel?: string;
  opusModelName?: string;
  fableModel?: string;
  fableModelName?: string;
  subagentModel?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  websiteUrl?: string;
  notes?: string;
  baseUrl: string;
  protocols: ModelProtocol[];
  enabled: boolean;
  builtIn: boolean;
  credentialId: string;
  claudeCode?: ClaudeCodeProviderConfig;
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
  setupMode?: ModelSetupMode;
  activeClaudeProviderId: string;
  providers: ProviderConfig[];
  models: ModelProfile[];
  defaults: Partial<Record<ModelDefaultUse, string>>;
}

export interface ProviderCredentialStatus {
  providerId: string;
  configured: boolean;
  updatedAt?: string;
}

export interface ModelManagementSnapshot {
  config: ModelConfigState;
  credentials: ProviderCredentialStatus[];
  setupComplete: boolean;
}

export interface ClaudeModelDiscoverySnapshot {
  providerId: string;
  providerName: string;
  revision: number;
  activeModel: string;
  models: Array<{ id: string; ownedBy?: string }>;
}

export interface ClaudeProviderPreview {
  providerId: string;
  requestUrl: string;
  modelsUrl?: string;
  settings: { env: Record<string, string> };
}

export interface ClaudeProviderTestResult {
  providerId: string;
  ok: true;
  status: number;
  latencyMs: number;
  model: string;
  message: string;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PROTOCOLS = new Set<ModelProtocol>(['anthropic-compatible', 'openai-compatible']);
const CAPABILITIES = new Set<ModelCapability>(['engineering-agent', 'software-assistant', 'vision']);
const CLAUDE_AUTH_FIELDS = new Set<ClaudeCodeAuthField>(['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY']);
const CLAUDE_API_FORMATS = new Set<ClaudeApiFormat>(['anthropic']);
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

function optionalHttpsUrl(value: unknown, label: string): string | undefined {
  if (value == null || value === '') return undefined;
  return baseUrl(value, label);
}

function rejectSensitiveFields(value: Record<string, unknown>, label: string): void {
  for (const key of Object.keys(value)) {
    if (SENSITIVE_KEY.test(key)) throw new Error(`${label} must not contain Secret material`);
  }
}

function optionalText(value: unknown, label: string, max: number): string | undefined {
  if (value == null || value === '') return undefined;
  return text(value, label, max);
}

function normalizeClaudeCode(value: unknown, label: string): ClaudeCodeProviderConfig | undefined {
  if (value == null) return undefined;
  const input = record(value, label);
  rejectSensitiveFields(input, label);
  const authField = text(input.authField, `${label}.authField`, 40) as ClaudeCodeAuthField;
  if (!CLAUDE_AUTH_FIELDS.has(authField)) throw new Error(`${label}.authField is invalid`);
  const apiFormat = text(input.apiFormat, `${label}.apiFormat`, 40) as ClaudeApiFormat;
  if (!CLAUDE_API_FORMATS.has(apiFormat)) throw new Error(`${label}.apiFormat is invalid; Catnip currently supports Anthropic Messages direct mode only`);
  return {
    apiFormat,
    isFullUrl: boolean(input.isFullUrl, `${label}.isFullUrl`),
    authField,
    primaryModel: text(input.primaryModel, `${label}.primaryModel`, 200),
    modelsUrl: optionalHttpsUrl(input.modelsUrl, `${label}.modelsUrl`),
    haikuModel: optionalText(input.haikuModel, `${label}.haikuModel`, 200),
    haikuModelName: optionalText(input.haikuModelName, `${label}.haikuModelName`, 100),
    sonnetModel: optionalText(input.sonnetModel, `${label}.sonnetModel`, 200),
    sonnetModelName: optionalText(input.sonnetModelName, `${label}.sonnetModelName`, 100),
    opusModel: optionalText(input.opusModel, `${label}.opusModel`, 200),
    opusModelName: optionalText(input.opusModelName, `${label}.opusModelName`, 100),
    fableModel: optionalText(input.fableModel, `${label}.fableModel`, 200),
    fableModelName: optionalText(input.fableModelName, `${label}.fableModelName`, 100),
    subagentModel: optionalText(input.subagentModel, `${label}.subagentModel`, 200),
  };
}

function normalizeProvider(value: unknown, index: number): ProviderConfig {
  const input = record(value, `providers[${index}]`);
  rejectSensitiveFields(input, `providers[${index}]`);
  return {
    id: id(input.id, `providers[${index}].id`),
    name: text(input.name, `providers[${index}].name`, 100),
    websiteUrl: optionalHttpsUrl(input.websiteUrl, `providers[${index}].websiteUrl`),
    notes: optionalText(input.notes, `providers[${index}].notes`, 500),
    baseUrl: baseUrl(input.baseUrl, `providers[${index}].baseUrl`),
    protocols: uniqueList(input.protocols, `providers[${index}].protocols`, PROTOCOLS, 2),
    enabled: boolean(input.enabled, `providers[${index}].enabled`),
    builtIn: boolean(input.builtIn, `providers[${index}].builtIn`),
    credentialId: id(input.credentialId, `providers[${index}].credentialId`),
    claudeCode: normalizeClaudeCode(input.claudeCode, `providers[${index}].claudeCode`),
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
    activeClaudeProviderId: 'deepseek',
    providers: [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        websiteUrl: 'https://www.deepseek.com',
        baseUrl: 'https://api.deepseek.com',
        protocols: ['anthropic-compatible', 'openai-compatible'],
        enabled: true,
        builtIn: true,
        credentialId: 'deepseek',
        claudeCode: {
          apiFormat: 'anthropic',
          isFullUrl: false,
          authField: 'ANTHROPIC_AUTH_TOKEN',
          primaryModel: 'deepseek-v4-pro',
          modelsUrl: 'https://api.deepseek.com/models',
          haikuModel: 'deepseek-v4-flash',
          haikuModelName: 'DeepSeek V4 Flash',
          sonnetModel: 'deepseek-v4-pro',
          sonnetModelName: 'DeepSeek V4 Pro',
          opusModel: 'deepseek-v4-pro',
          opusModelName: 'DeepSeek V4 Pro',
          fableModel: 'deepseek-v4-pro',
          fableModelName: 'DeepSeek V4 Pro',
          subagentModel: 'deepseek-v4-flash',
        },
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
        id: 'deepseek-v4-flash-agent',
        providerId: 'deepseek',
        name: 'DeepSeek V4 Flash（Agent）',
        upstreamModel: 'deepseek-v4-flash',
        protocol: 'anthropic-compatible',
        capabilities: ['engineering-agent'],
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

export function upgradeModelConfig(value: ModelConfigState): ModelConfigState {
  const upgraded = cloneModelConfig(value);
  const defaults = createDefaultModelConfig();
  for (const builtIn of defaults.providers.filter((item) => item.builtIn)) {
    const existing = upgraded.providers.find((item) => item.id === builtIn.id);
    if (existing && !existing.claudeCode && builtIn.claudeCode) existing.claudeCode = { ...builtIn.claudeCode };
  }
  for (const builtIn of defaults.models.filter((item) => item.builtIn)) {
    if (!upgraded.models.some((item) => item.id === builtIn.id)) upgraded.models.push({ ...builtIn, capabilities: [...builtIn.capabilities] });
  }
  return normalizeModelConfig(upgraded);
}

function migrateLegacyConfig(input: Record<string, unknown>): Record<string, unknown> {
  let migrated = input;
  if (migrated.schemaVersion === 1) {
  const providers = Array.isArray(input.providers) ? structuredClone(input.providers) as Array<Record<string, unknown>> : [];
  const models = Array.isArray(input.models) ? input.models as Array<Record<string, unknown>> : [];
  const defaults = input.defaults && typeof input.defaults === 'object' ? input.defaults as Record<string, unknown> : {};
  const defaultEngineeringId = typeof defaults['engineering-agent'] === 'string' ? defaults['engineering-agent'] : '';
  const defaultEngineering = models.find((model) => model.id === defaultEngineeringId)
    ?? models.find((model) => Array.isArray(model.capabilities) && model.capabilities.includes('engineering-agent'));
  const activeClaudeProviderId = typeof defaultEngineering?.providerId === 'string' ? defaultEngineering.providerId : 'deepseek';
  for (const provider of providers) {
    const providerModels = models.filter((model) => model.providerId === provider.id
      && Array.isArray(model.capabilities) && model.capabilities.includes('engineering-agent'));
    if (!providerModels.length) continue;
    const primary = providerModels.find((model) => model.id === defaultEngineeringId) ?? providerModels[0];
    const flash = providerModels.find((model) => String(model.upstreamModel || '').toLowerCase().includes('flash'));
    provider.claudeCode = {
      apiFormat: 'anthropic',
      isFullUrl: false,
      authField: provider.id === 'deepseek' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY',
      primaryModel: primary.upstreamModel,
      ...(flash?.upstreamModel ? { haikuModel: flash.upstreamModel } : {}),
      sonnetModel: primary.upstreamModel,
      opusModel: primary.upstreamModel,
    };
  }
    migrated = { ...input, schemaVersion: 2, setupMode: 'preset', activeClaudeProviderId, providers };
  }
  if (migrated.schemaVersion === 2) {
    const providers = Array.isArray(migrated.providers) ? structuredClone(migrated.providers) as Array<Record<string, unknown>> : [];
    for (const provider of providers) {
      if (!provider.claudeCode || typeof provider.claudeCode !== 'object' || Array.isArray(provider.claudeCode)) continue;
      const claudeCode = provider.claudeCode as Record<string, unknown>;
      const fallback = typeof claudeCode.primaryModel === 'string' ? claudeCode.primaryModel : '';
      claudeCode.apiFormat = 'anthropic';
      claudeCode.isFullUrl = false;
      if (!claudeCode.fableModel) claudeCode.fableModel = claudeCode.opusModel || fallback;
      if (!claudeCode.subagentModel) claudeCode.subagentModel = claudeCode.haikuModel || fallback;
    }
    migrated = { ...migrated, schemaVersion: MODEL_CONFIG_SCHEMA_VERSION, providers };
  }
  return migrated;
}

export function normalizeModelConfig(value: unknown): ModelConfigState {
  const input = migrateLegacyConfig(record(value, 'model config'));
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

  const activeClaudeProviderId = id(input.activeClaudeProviderId, 'model config activeClaudeProviderId');
  const activeClaudeProvider = providerById.get(activeClaudeProviderId);
  if (!activeClaudeProvider || !activeClaudeProvider.enabled || !activeClaudeProvider.protocols.includes('anthropic-compatible') || !activeClaudeProvider.claudeCode) {
    throw new Error('model config activeClaudeProviderId must reference an enabled Claude Code compatible provider');
  }
  const setupMode = input.setupMode == null ? undefined : text(input.setupMode, 'model config setupMode', 20) as ModelSetupMode;
  if (setupMode && setupMode !== 'preset' && setupMode !== 'custom') throw new Error('model config setupMode is invalid');

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
    setupMode,
    activeClaudeProviderId,
    providers,
    models,
    defaults,
  };
}

export function cloneModelConfig(value: ModelConfigState): ModelConfigState {
  return structuredClone(value);
}
