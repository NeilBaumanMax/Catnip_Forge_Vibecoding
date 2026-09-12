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
  const configStore = new ModelConfigStore(path.join(root, 'config.json'));
  const credentialStore = new ModelCredentialStore(path.join(root, 'credentials.json'), new TestCipher());
  const submittedSecret = ['sk', 'management', 'fixture', 'only'].join('-');
  let promptCount = 0;
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
  });

  try {
    const routes = new Map();
    registerModelManagementIpc({ handle: (channel, handler) => routes.set(channel, handler) }, handlers);
    assert.deepEqual([...routes.keys()].sort(), [
      'models:credential:configure',
      'models:credential:delete',
      'models:list',
      'models:save',
    ]);
    const initial = await routes.get('models:list')(null);
    assert.equal(initial.config.revision, 0);
    assert.equal(initial.credentials.find((item) => item.providerId === 'deepseek').configured, false);
    assert(!JSON.stringify(initial).includes('ciphertext'), 'Renderer snapshot must not contain encrypted payloads');

    const invalidDelete = structuredClone(initial.config);
    invalidDelete.providers = invalidDelete.providers.filter((item) => item.id !== 'deepseek');
    invalidDelete.models = invalidDelete.models.filter((item) => item.providerId !== 'deepseek');
    delete invalidDelete.defaults['engineering-agent'];
    delete invalidDelete.defaults['software-assistant'];
    assert.throws(() => handlers.save(invalidDelete, 0), /内置供应商/);

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

    const cleared = await routes.get('models:credential:delete')(null, 'deepseek');
    assert.equal(cleared.credentials.find((item) => item.providerId === 'deepseek').configured, false);
    await assert.rejects(() => routes.get('models:credential:configure')(null, 'missing'), /不存在/);

    const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.ts'), 'utf8');
    assert(!/configureModelCredential:\s*\([^)]*(?:key|secret|token)/i.test(preload), 'credential IPC must accept provider id only');
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
