const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

class TestCipher {
  available() { return true; }
  encrypt(value) { return Buffer.from(`encrypted:${Buffer.from(value).toString('base64')}`); }
  decrypt(value) { return Buffer.from(value.toString().replace(/^encrypted:/, ''), 'base64').toString(); }
}

async function main() {
  await app.whenReady();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-model-management-'));
  const { ModelConfigStore } = require('../dist/main/model-config-store.js');
  const { ModelCredentialStore } = require('../dist/main/model-credentials.js');
  const { createModelManagementHandlers, registerModelManagementIpc } = require('../dist/main/model-management.js');
  const { syncClaudeCodeSettings } = require('../dist/main/claude-provider-switch.js');
  const configStore = new ModelConfigStore(path.join(root, 'config.json'));
  const credentialStore = new ModelCredentialStore(path.join(root, 'credentials.json'), new TestCipher());
  const settingsFile = path.join(root, 'claude', 'settings.json');
  const submittedSecret = ['sk', 'management', 'fixture', 'only'].join('-');
  let promptCount = 0;
  let discoveryCount = 0;
  let releasePrompt;
  const promptGate = new Promise((resolve) => { releasePrompt = resolve; });
  const handlers = createModelManagementHandlers({
    configStore,
    credentialStore,
    prompt: async (providerName) => {
      promptCount += 1;
      assert.equal(providerName, 'DeepSeek');
      await promptGate;
      return { outcome: 'submitted', secret: submittedSecret };
    },
    syncClaudeSettings: (provider) => syncClaudeCodeSettings(provider, settingsFile),
    discoverModels: async (provider, credential, revision) => {
      discoveryCount += 1;
      assert.equal(credential, submittedSecret);
      return { providerId: provider.id, providerName: provider.name, revision, activeModel: provider.claudeCode.primaryModel, models: [{ id: 'deepseek-v4-flash', ownedBy: 'deepseek' }, { id: 'deepseek-v4-pro', ownedBy: 'deepseek' }] };
    },
  });

  try {
    const routes = new Map();
    registerModelManagementIpc({ handle: (channel, handler) => routes.set(channel, handler) }, handlers);
    assert.deepEqual([...routes.keys()].sort(), [
      'models:available',
      'models:claude-model:activate',
      'models:claude-provider:activate',
      'models:credential:configure',
      'models:credential:delete',
      'models:list',
      'models:save',
    ]);
    const initial = await routes.get('models:list')(null);
    assert.equal(initial.config.revision, 0);
    assert.equal(initial.credentials.find((item) => item.providerId === 'deepseek').configured, false);
    assert.equal(initial.setupComplete, false);
    assert(!JSON.stringify(initial).includes('ciphertext'), 'Renderer snapshot must not contain encrypted payloads');

    const invalidDelete = structuredClone(initial.config);
    invalidDelete.providers = invalidDelete.providers.filter((item) => item.id !== 'deepseek');
    invalidDelete.models = invalidDelete.models.filter((item) => item.providerId !== 'deepseek');
    delete invalidDelete.defaults['engineering-agent'];
    delete invalidDelete.defaults['software-assistant'];
    assert.throws(() => handlers.save(invalidDelete, 0), /内置供应商|activeClaudeProviderId/);

    const custom = structuredClone(initial.config);
    custom.providers.push({
      id: 'custom', name: 'Custom', baseUrl: 'https://models.example.com',
      protocols: ['openai-compatible'], enabled: true, builtIn: true, credentialId: 'custom',
    });
    custom.models.push({
      id: 'custom-chat', providerId: 'custom', name: 'Custom Chat', upstreamModel: 'chat-1',
      protocol: 'openai-compatible', capabilities: ['software-assistant'], enabled: true, builtIn: true,
    });
    custom.defaults['software-assistant'] = 'custom-chat';
    const saved = handlers.save(custom, 0);
    assert.equal(saved.config.revision, 1);
    assert.equal(saved.config.providers.at(-1).credentialId, 'custom', 'Renderer cannot choose another provider credential slot');
    assert.equal(saved.config.providers.at(-1).builtIn, false, 'Renderer cannot create a built-in provider');
    assert.equal(saved.config.models.at(-1).builtIn, false, 'Renderer cannot create a built-in model');

    credentialStore.set('custom', submittedSecret);
    const removeCustom = structuredClone(saved.config);
    removeCustom.providers = removeCustom.providers.filter((item) => item.id !== 'custom');
    removeCustom.models = removeCustom.models.filter((item) => item.providerId !== 'custom');
    removeCustom.defaults['software-assistant'] = 'deepseek-v4-flash';
    assert.throws(() => handlers.save(removeCustom, 1), /先清除/, 'provider deletion must not orphan an encrypted credential');
    credentialStore.delete('custom');

    const firstPrompt = routes.get('models:credential:configure')(null, 'deepseek');
    const secondPrompt = routes.get('models:credential:configure')(null, 'deepseek');
    releasePrompt();
    const [firstResult, secondResult] = await Promise.all([firstPrompt, secondPrompt]);
    assert.equal(promptCount, 1, 'concurrent credential requests must share one native prompt');
    assert.equal(firstResult.outcome, 'submitted');
    assert.deepEqual(firstResult, secondResult);
    assert.equal(firstResult.snapshot.credentials.find((item) => item.providerId === 'deepseek').configured, true);
    assert(!JSON.stringify(firstResult).includes(submittedSecret), 'credential response must never echo plaintext');
    assert(!fs.readFileSync(path.join(root, 'credentials.json'), 'utf8').includes(submittedSecret));

    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(settingsFile, JSON.stringify({ permissions: { allow: ['Skill'] }, env: { KEEP_ME: 'yes', ANTHROPIC_AUTH_TOKEN: submittedSecret } }), 'utf8');
    fs.writeFileSync(`${settingsFile}.bak`, JSON.stringify({ theme: 'dark', env: { ANTHROPIC_API_KEY: submittedSecret } }), 'utf8');
    const activated = await routes.get('models:claude-provider:activate')(null, 'deepseek', 1, 'preset');
    assert.equal(activated.config.activeClaudeProviderId, 'deepseek');
    assert.equal(activated.config.setupMode, 'preset');
    assert.equal(activated.setupComplete, true);
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    assert.deepEqual(settings.permissions, { allow: ['Skill'] }, 'activation must preserve unrelated Claude settings');
    assert.equal(settings.env.KEEP_ME, 'yes');
    assert.equal(settings.env.ANTHROPIC_BASE_URL, 'https://api.deepseek.com/anthropic');
    assert.equal(settings.env.ANTHROPIC_MODEL, 'deepseek-v4-pro');
    assert.equal(settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'deepseek-v4-flash');
    assert.equal('ANTHROPIC_AUTH_TOKEN' in settings.env, false, 'plaintext token must be removed from settings');
    assert.equal(JSON.parse(fs.readFileSync(`${settingsFile}.bak`, 'utf8')).theme, 'dark');
    assert(!fs.readFileSync(`${settingsFile}.bak`, 'utf8').includes(submittedSecret), 'existing settings backup must also be sanitized without discarding unrelated fields');

    const discovered = await routes.get('models:available')(null);
    assert.deepEqual(discovered.models.map((item) => item.id), ['deepseek-v4-flash', 'deepseek-v4-pro']);
    assert(!JSON.stringify(discovered).includes(submittedSecret), 'model discovery must not expose the credential');
    const modelActivated = await routes.get('models:claude-model:activate')(null, 'deepseek-v4-flash', activated.config.revision);
    assert.equal(modelActivated.config.providers.find((item) => item.id === 'deepseek').claudeCode.primaryModel, 'deepseek-v4-flash');
    assert.equal(JSON.parse(fs.readFileSync(settingsFile, 'utf8')).env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'deepseek-v4-flash');
    await assert.rejects(() => routes.get('models:claude-model:activate')(null, 'not-returned', modelActivated.config.revision), /可用列表/);
    assert.equal(discoveryCount, 3);

    const withZhipu = structuredClone(modelActivated.config);
    withZhipu.providers.push({
      id: 'zhipu', name: '智谱清言', baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      protocols: ['anthropic-compatible'], enabled: true, builtIn: false, credentialId: 'zhipu',
      claudeCode: { authField: 'ANTHROPIC_API_KEY', primaryModel: 'glm-4.7', haikuModel: 'glm-4.5-air' },
    });
    const zhipuSaved = handlers.save(withZhipu, modelActivated.config.revision);
    credentialStore.set('zhipu', submittedSecret);
    const zhipuActivated = handlers.activateClaudeProvider('zhipu', zhipuSaved.config.revision, 'custom');
    assert.equal(zhipuActivated.config.activeClaudeProviderId, 'zhipu');
    assert.equal(zhipuActivated.setupComplete, true);
    const zhipuSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    assert.equal(zhipuSettings.env.ANTHROPIC_BASE_URL, 'https://open.bigmodel.cn/api/anthropic');
    assert.equal(zhipuSettings.env.ANTHROPIC_MODEL, 'glm-4.7');
    assert.equal(zhipuSettings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-4.5-air');
    assert.equal('ANTHROPIC_API_KEY' in zhipuSettings.env, false);
    assert.throws(() => handlers.activateClaudeProvider('zhipu', zhipuActivated.config.revision, 'preset'), /不匹配/);

    const cleared = await routes.get('models:credential:delete')(null, 'deepseek');
    assert.equal(cleared.credentials.find((item) => item.providerId === 'deepseek').configured, false);
    await assert.rejects(() => routes.get('models:credential:configure')(null, 'missing'), /不存在/);

    const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.ts'), 'utf8');
    assert(!/configureModelCredential:\s*\([^)]*(?:key|secret|token)/i.test(preload), 'credential IPC must accept provider id only');
    assert.match(preload, /activateClaudeProvider:\s*\(providerId: string, expectedRevision: number/);
    assert.match(preload, /listAvailableClaudeModels:\s*\(\)/);
    assert.match(preload, /activateClaudeModel:\s*\(modelId: string, expectedRevision: number/);
    const host = fs.readFileSync(path.join(__dirname, '..', '..', 'agent', 'host-tools', 'configure-model-credential.ps1'), 'utf8');
    assert.match(host, /<PasswordBox x:Name="SecretInput"/);
    assert.match(host, /ZeroFreeBSTR/);
    assert.doesNotMatch(host, /Write-Host\s+\$plainSecret/i);

    console.log('Model management verification passed.');
  } finally {
    app.quit();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
