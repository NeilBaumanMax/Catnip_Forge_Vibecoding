const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

class TestCipher {
  available() { return true; }
  encrypt(value) { return Buffer.from(`sealed:${value}`, 'utf8'); }
  decrypt(value) { return value.toString('utf8').replace(/^sealed:/, ''); }
}

async function main() {
  await app.whenReady();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-model-runtime-'));
  try {
    const { ModelConfigStore } = require('../dist/main/model-config-store.js');
    const { ModelCredentialStore } = require('../dist/main/model-credentials.js');
    const { hydrateOpenAiCompatibleModel } = require('../dist/main/model-runtime.js');
    const configStore = new ModelConfigStore(path.join(root, 'models.json'));
    const credentialStore = new ModelCredentialStore(path.join(root, 'credentials.json'), new TestCipher());
    credentialStore.set('deepseek', 'sk-runtime-deepseek-fixture');
    credentialStore.set('qwen', 'sk-runtime-qwen-fixture');
    const software = hydrateOpenAiCompatibleModel('software-assistant', { configStore, credentialStore });
    assert.equal(software.profileId, 'deepseek-v4-flash');
    assert.equal(software.upstreamModel, 'deepseek-v4-flash');
    assert.equal(software.baseUrl, 'https://api.deepseek.com');
    const vision = hydrateOpenAiCompatibleModel('vision', { configStore, credentialStore });
    assert.equal(vision.profileId, 'qwen-vl-plus');
    assert.equal(vision.upstreamModel, 'qwen-vl-plus');
    const changed = configStore.read();
    changed.models.push({ id: 'assistant-alt', providerId: 'deepseek', name: 'Assistant Alt', upstreamModel: 'deepseek-alt', protocol: 'openai-compatible', capabilities: ['software-assistant'], enabled: true, builtIn: false });
    changed.defaults['software-assistant'] = 'assistant-alt';
    configStore.replace(changed, changed.revision);
    assert.equal(hydrateOpenAiCompatibleModel('software-assistant', { configStore, credentialStore }).upstreamModel, 'deepseek-alt');
    changed.models.at(-1).protocol = 'anthropic-compatible';
    changed.revision = configStore.read().revision;
    configStore.replace(changed, changed.revision);
    assert.throws(() => hydrateOpenAiCompatibleModel('software-assistant', { configStore, credentialStore }), /OpenAI-compatible/);
    console.log('model runtime verification passed: assistant/vision defaults, secure credentials, protocol rejection');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => { console.error(error); app.exit(1); });
