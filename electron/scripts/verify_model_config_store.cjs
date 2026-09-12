const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  await app.whenReady();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-model-config-'));
  const file = path.join(root, 'models', 'config.json');
  const { ModelConfigStore } = require('../dist/main/model-config-store.js');
  const { createDefaultModelConfig, normalizeModelConfig } = require('../dist/common/model-config.js');

  try {
    const store = new ModelConfigStore(file);
    const defaults = store.read();
    assert.equal(defaults.revision, 0);
    assert.equal(defaults.defaults['engineering-agent'], 'deepseek-v4-pro');
    assert.equal(defaults.defaults['software-assistant'], 'deepseek-v4-flash');
    assert.equal(defaults.defaults.vision, 'qwen-vl-plus');
    assert(defaults.models.some((item) => item.id === 'deepseek-v4-flash-agent' && item.protocol === 'anthropic-compatible' && item.capabilities.includes('engineering-agent')));
    assert.equal(fs.existsSync(file), false, 'read-only default migration must not create a file');

    defaults.providers[0].name = 'Changed outside store';
    assert.equal(store.read().providers[0].name, 'DeepSeek', 'read results must be cloned');

    const first = createDefaultModelConfig();
    first.providers.push({
      id: 'custom-anthropic',
      name: 'Custom Anthropic Gateway',
      baseUrl: 'https://models.example.com/anthropic',
      protocols: ['anthropic-compatible'],
      enabled: true,
      builtIn: false,
      credentialId: 'custom-anthropic',
    });
    first.models.push({
      id: 'custom-pro',
      providerId: 'custom-anthropic',
      name: 'Custom Pro',
      upstreamModel: 'custom-pro-2026',
      protocol: 'anthropic-compatible',
      capabilities: ['engineering-agent'],
      enabled: true,
      builtIn: false,
    });
    const saved = store.replace(first, 0);
    assert.equal(saved.revision, 1);
    assert.deepEqual(normalizeModelConfig(saved), saved, 'persisted state must round-trip through schema validation');
    assert.equal(new ModelConfigStore(file).read().models.at(-1).id, 'custom-pro', 'config must survive restart');
    assert(!fs.readFileSync(file, 'utf8').match(/apiKey|accessSecret|Bearer/i), 'persisted config must contain no Secret fields');

    const legacyWithoutFlashAgent = structuredClone(saved);
    legacyWithoutFlashAgent.models = legacyWithoutFlashAgent.models.filter((item) => item.id !== 'deepseek-v4-flash-agent');
    fs.writeFileSync(file, `${JSON.stringify(legacyWithoutFlashAgent, null, 2)}\n`, 'utf8');
    const upgraded = new ModelConfigStore(file).read();
    assert(upgraded.models.some((item) => item.id === 'deepseek-v4-flash-agent'), 'existing stores must gain the built-in Flash Agent profile');
    assert.equal(fs.readFileSync(file, 'utf8').includes('deepseek-v4-flash-agent'), false, 'read-only upgrade must not rewrite user config');
    fs.writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');

    assert.throws(() => store.replace(first, 0), /reload before saving/, 'stale revision must not overwrite newer config');
    const withSecret = structuredClone(saved);
    withSecret.providers[0].apiKey = 'MUST_NOT_PERSIST';
    assert.throws(() => store.replace(withSecret, 1), /Secret material/);
    assert(!fs.readFileSync(file, 'utf8').includes('MUST_NOT_PERSIST'));

    const insecure = structuredClone(saved);
    insecure.providers[0].baseUrl = 'http://models.example.com?token=bad';
    assert.throws(() => normalizeModelConfig(insecure), /HTTPS/);
    const incompatible = structuredClone(saved);
    incompatible.models.at(-1).protocol = 'openai-compatible';
    assert.throws(() => normalizeModelConfig(incompatible), /unsupported provider protocol/);
    const danglingDefault = structuredClone(saved);
    danglingDefault.defaults['engineering-agent'] = 'missing-model';
    assert.throws(() => normalizeModelConfig(danglingDefault), /enabled compatible model/);

    const second = structuredClone(saved);
    second.providers.at(-1).name = 'Renamed Gateway';
    const updated = store.replace(second, 1);
    assert.equal(updated.revision, 2);
    assert.equal(new ModelConfigStore(`${file}.bak`).read().revision, 1, 'atomic replacement must retain the previous valid revision');

    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, '{ broken json', 'utf8');
    assert.throws(() => new ModelConfigStore(file).read(), /original file was preserved/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{ broken json', 'invalid source must remain untouched');
    fs.writeFileSync(file, original, 'utf8');
    assert.equal(new ModelConfigStore(file).read().revision, 2);
    assert.equal(fs.readdirSync(path.dirname(file)).filter((name) => name.endsWith('.tmp')).length, 0, 'atomic writes must leave no temp file');

    console.log('Model config store verification passed.');
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
