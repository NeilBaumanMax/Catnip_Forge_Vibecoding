import type { IpcMain } from 'electron';
import {
  normalizeModelConfig,
  type ModelConfigState,
  type ModelManagementSnapshot,
} from '../common/model-config';
import { createModelConfigStore, type ModelConfigStore } from './model-config-store';
import { createModelCredentialStore, type ModelCredentialStore } from './model-credentials';
import { promptForModelCredential, type ModelCredentialPromptResult } from './model-credential-prompt';

export interface ModelManagementDependencies {
  configStore: ModelConfigStore;
  credentialStore: ModelCredentialStore;
  prompt: (providerName: string) => Promise<ModelCredentialPromptResult>;
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
  let promptInFlight: Promise<{ outcome: string; snapshot: ModelManagementSnapshot }> | null = null;

  const snapshot = (): ModelManagementSnapshot => {
    const config = configStore.read();
    const byCredentialId = new Map(credentialStore.status(config.providers.map((item) => item.credentialId))
      .map((item) => [item.credentialId, item]));
    return {
      config,
      credentials: config.providers.map((provider) => {
        const status = byCredentialId.get(provider.credentialId);
        return { providerId: provider.id, configured: status?.configured === true, updatedAt: status?.updatedAt };
      }),
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
}
