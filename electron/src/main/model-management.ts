import type { IpcMain } from 'electron';
import {
  normalizeModelConfig,
  type ModelConfigState,
  type ClaudeModelDiscoverySnapshot,
  type ModelManagementSnapshot,
} from '../common/model-config';
import { createModelConfigStore, type ModelConfigStore } from './model-config-store';
import { createModelCredentialStore, type ModelCredentialStore } from './model-credentials';
import { promptForModelCredential, type ModelCredentialPromptResult } from './model-credential-prompt';
import { syncClaudeCodeSettings } from './claude-provider-switch';
import type { ModelSetupMode } from '../common/model-config';
import { discoverProviderModels } from './model-discovery';

export interface ModelManagementDependencies {
  configStore: ModelConfigStore;
  credentialStore: ModelCredentialStore;
  prompt: (providerName: string) => Promise<ModelCredentialPromptResult>;
  syncClaudeSettings: (provider: ModelConfigState['providers'][number]) => void;
  discoverModels: (provider: ModelConfigState['providers'][number], credential: string, revision: number) => Promise<ClaudeModelDiscoverySnapshot>;
}

function protectBuiltIns(value: unknown, current: ModelConfigState): ModelConfigState {
  const next = normalizeModelConfig(value);
  for (const provider of current.providers.filter((item) => item.builtIn)) {
    const replacement = next.providers.find((item) => item.id === provider.id);
    if (!replacement) throw new Error(`内置供应商 ${provider.name} 不能删除`);
    replacement.builtIn = true;
    replacement.credentialId = provider.credentialId;
  }
  for (const provider of next.providers.filter((item) => !current.providers.some((existing) => existing.id === item.id && existing.builtIn))) {
    provider.builtIn = false;
    provider.credentialId = provider.id;
  }
  for (const model of current.models.filter((item) => item.builtIn)) {
    const replacement = next.models.find((item) => item.id === model.id);
    if (!replacement) throw new Error(`内置模型 ${model.name} 不能删除`);
    replacement.builtIn = true;
  }
  for (const model of next.models.filter((item) => !current.models.some((existing) => existing.id === item.id && existing.builtIn))) {
    model.builtIn = false;
  }
  return normalizeModelConfig(next);
}

export function createModelManagementHandlers(dependencies?: Partial<ModelManagementDependencies>) {
  const configStore = dependencies?.configStore ?? createModelConfigStore();
  const credentialStore = dependencies?.credentialStore ?? createModelCredentialStore();
  const prompt = dependencies?.prompt ?? promptForModelCredential;
  const syncClaudeSettings = dependencies?.syncClaudeSettings ?? syncClaudeCodeSettings;
  const discoverModels = dependencies?.discoverModels ?? discoverProviderModels;
  let promptInFlight: Promise<{ outcome: string; snapshot: ModelManagementSnapshot }> | null = null;

  const snapshot = (): ModelManagementSnapshot => {
    const config = configStore.read();
    const byCredentialId = new Map(credentialStore.status(config.providers.map((item) => item.credentialId))
      .map((item) => [item.credentialId, item]));
    const credentials = config.providers.map((provider) => {
      const status = byCredentialId.get(provider.credentialId);
      return { providerId: provider.id, configured: status?.configured === true, updatedAt: status?.updatedAt };
    });
    const activeProvider = config.providers.find((item) => item.id === config.activeClaudeProviderId);
    const activeCredentialReady = credentials.find((item) => item.providerId === config.activeClaudeProviderId)?.configured === true;
    const setupComplete = activeCredentialReady && (
      (config.setupMode === 'preset' && config.activeClaudeProviderId === 'deepseek')
      || (config.setupMode === 'custom' && activeProvider?.builtIn === false)
    );
    return {
      config,
      credentials,
      setupComplete,
    };
  };

  return {
    list: snapshot,
    save: (value: unknown, expectedRevision: number): ModelManagementSnapshot => {
      const current = configStore.read();
      const protectedValue = protectBuiltIns(value, current);
      const removedProviders = current.providers.filter((provider) => !protectedValue.providers.some((item) => item.id === provider.id));
      const configured = new Map(credentialStore.status(removedProviders.map((item) => item.credentialId))
        .map((item) => [item.credentialId, item.configured]));
      if (removedProviders.some((item) => configured.get(item.credentialId))) {
        throw new Error('删除供应商前请先清除其本机凭据');
      }
      configStore.replace(protectedValue, expectedRevision);
      return snapshot();
    },
    configureCredential: (providerId: string): Promise<{ outcome: string; snapshot: ModelManagementSnapshot }> => {
      if (promptInFlight) return promptInFlight;
      const config = configStore.read();
      const provider = config.providers.find((item) => item.id === providerId);
      if (!provider) return Promise.reject(new Error('模型供应商不存在'));
      promptInFlight = prompt(provider.name).then((result) => {
        if (result.outcome === 'submitted') credentialStore.set(provider.credentialId, result.secret);
        return { outcome: result.outcome, snapshot: snapshot() };
      }).finally(() => { promptInFlight = null; });
      return promptInFlight;
    },
    deleteCredential: (providerId: string): ModelManagementSnapshot => {
      const config = configStore.read();
      const provider = config.providers.find((item) => item.id === providerId);
      if (!provider) throw new Error('模型供应商不存在');
      credentialStore.delete(provider.credentialId);
      return snapshot();
    },
    listAvailableClaudeModels: async (): Promise<ClaudeModelDiscoverySnapshot> => {
      const config = configStore.read();
      const provider = config.providers.find((item) => item.id === config.activeClaudeProviderId);
      if (!provider?.claudeCode) throw new Error('当前 Claude Code 供应商不存在或配置不完整');
      const credential = credentialStore.get(provider.credentialId);
      if (!credential) throw new Error(`请先配置 ${provider.name} 的 API Key`);
      return discoverModels(provider, credential, config.revision);
    },
    activateClaudeModel: async (modelId: string, expectedRevision: number): Promise<ModelManagementSnapshot> => {
      const config = configStore.read();
      if (config.revision !== expectedRevision) throw new Error('模型配置已变化，请重新打开模型列表');
      const provider = config.providers.find((item) => item.id === config.activeClaudeProviderId);
      if (!provider?.claudeCode) throw new Error('当前 Claude Code 供应商不存在或配置不完整');
      const credential = credentialStore.get(provider.credentialId);
      if (!credential) throw new Error(`请先配置 ${provider.name} 的 API Key`);
      const discovered = await discoverModels(provider, credential, config.revision);
      if (!discovered.models.some((item) => item.id === modelId)) throw new Error('所选模型不在当前 Key 的可用列表中');
      const latest = configStore.read();
      if (latest.revision !== expectedRevision || latest.activeClaudeProviderId !== provider.id) {
        throw new Error('模型配置已变化，请重新打开模型列表');
      }
      const updatedProvider = {
        ...provider,
        claudeCode: {
          ...provider.claudeCode,
          primaryModel: modelId,
          haikuModel: modelId,
          sonnetModel: modelId,
          opusModel: modelId,
        },
      };
      syncClaudeSettings(updatedProvider);
      configStore.replace({
        ...latest,
        providers: latest.providers.map((item) => item.id === provider.id ? updatedProvider : item),
      }, expectedRevision);
      return snapshot();
    },
    activateClaudeProvider: (providerId: string, expectedRevision: number, setupMode?: ModelSetupMode): ModelManagementSnapshot => {
      const current = configStore.read();
      if (current.revision !== expectedRevision) throw new Error('模型配置已变化，请重新载入后再启用');
      const provider = current.providers.find((item) => item.id === providerId);
      if (!provider || !provider.enabled || !provider.protocols.includes('anthropic-compatible') || !provider.claudeCode) {
        throw new Error('该供应商尚未完成 Claude Code 配置');
      }
      const status = credentialStore.status([provider.credentialId])[0];
      if (!status?.configured) throw new Error(`请先配置 ${provider.name} 的 API Key`);
      const normalizedMode = setupMode ?? current.setupMode ?? (provider.builtIn ? 'preset' : 'custom');
      if (normalizedMode !== 'preset' && normalizedMode !== 'custom') throw new Error('首次配置方式无效');
      if ((normalizedMode === 'preset' && provider.id !== 'deepseek') || (normalizedMode === 'custom' && provider.builtIn)) {
        throw new Error('供应商与首次配置方式不匹配');
      }
      syncClaudeSettings(provider);
      configStore.replace({ ...current, activeClaudeProviderId: provider.id, setupMode: normalizedMode }, expectedRevision);
      return snapshot();
    },
  };
}

export function registerModelManagementIpc(
  registrar: Pick<IpcMain, 'handle'>,
  handlers = createModelManagementHandlers(),
): void {
  registrar.handle('models:list', async () => handlers.list());
  registrar.handle('models:save', async (_event, value, expectedRevision: number) => handlers.save(value, expectedRevision));
  registrar.handle('models:credential:configure', async (_event, providerId: string) => handlers.configureCredential(providerId));
  registrar.handle('models:credential:delete', async (_event, providerId: string) => handlers.deleteCredential(providerId));
  registrar.handle('models:available', async () => handlers.listAvailableClaudeModels());
  registrar.handle('models:claude-model:activate', async (_event, modelId: string, expectedRevision: number) => handlers.activateClaudeModel(modelId, expectedRevision));
  registrar.handle('models:claude-provider:activate', async (_event, providerId: string, expectedRevision: number, setupMode?: ModelSetupMode) => handlers.activateClaudeProvider(providerId, expectedRevision, setupMode));
}
