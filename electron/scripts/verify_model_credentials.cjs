const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

class TestCipher {
  constructor(isAvailable = true) { this.isAvailable = isAvailable; }
  available() { return this.isAvailable; }
  encrypt(value) { return Buffer.from(`protected:${Buffer.from(value).toString('base64')}`); }
  decrypt(value) {
    const encoded = value.toString().replace(/^protected:/, '');
    return Buffer.from(encoded, 'base64').toString();
  }
}

async function main() {
  await app.whenReady();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-model-credentials-'));
  const file = path.join(root, 'models', 'credentials.json');
  const legacyDeepSeek = path.join(root, 'apikey.txt');
  const legacyQwen = path.join(root, 'qwen-apikey.txt');
  const secret = ['sk-test', 'value', 'must', 'stay', 'encrypted'].join('-');
  const qwenSecret = ['sk-qwen', 'fixture', 'value', 'only'].join('-');
  const {
    ModelCredentialStore,
    migrateLegacyCredentials,
  } = require('../dist/main/model-credentials.js');

  try {
    const store = new ModelCredentialStore(file, new TestCipher());
    assert.deepEqual(store.status(['deepseek']), [{ credentialId: 'deepseek', configured: false, updatedAt: undefined }]);
    const status = store.set('deepseek', secret);
    assert.equal(status.configured, true);
    assert.equal(store.get('deepseek'), secret);
    const raw = fs.readFileSync(file, 'utf8');
    assert(!raw.includes(secret), 'credential file must never contain plaintext');
    assert(raw.includes('ciphertext'), 'credential file must contain only encrypted payload metadata');
    assert.equal(new ModelCredentialStore(file, new TestCipher()).get('deepseek'), secret, 'encrypted credential must survive restart');

    assert.throws(() => new ModelCredentialStore(path.join(root, 'unavailable.json'), new TestCipher(false)).set('deepseek', secret), /unavailable/);
    assert.equal(fs.existsSync(path.join(root, 'unavailable.json')), false, 'unavailable encryption must not create a plaintext fallback');
    assert.throws(() => store.set('../escape', secret), /credentialId/);
    assert.throws(() => store.set('deepseek', '   '), /length/);

    fs.writeFileSync(legacyQwen, `# keep this comment\nQWEN_API_KEY=${qwenSecret}\nKEEP_ME=yes\n`, 'utf8');
    const migrated = migrateLegacyCredentials(store, [{
      credentialId: 'qwen',
      environmentName: 'QWEN_API_KEY',
      filePath: legacyQwen,
    }]);
    assert.equal(migrated[0].outcome, 'migrated');
    assert.equal(store.get('qwen'), qwenSecret);
    const cleaned = fs.readFileSync(legacyQwen, 'utf8');
    assert(!cleaned.includes(qwenSecret), 'legacy plaintext must be removed only after secure round-trip');
    assert(cleaned.includes('# keep this comment'));
    assert(cleaned.includes('KEEP_ME=yes'));
    assert(!fs.readFileSync(file, 'utf8').includes(qwenSecret));

    fs.writeFileSync(legacyDeepSeek, `DEEPSEEK_API_KEY=${secret}\n`, 'utf8');
    const alreadySecure = migrateLegacyCredentials(store, [{
      credentialId: 'deepseek',
      environmentName: 'DEEPSEEK_API_KEY',
      filePath: legacyDeepSeek,
    }]);
    assert.equal(alreadySecure[0].outcome, 'already_secure');
    assert.equal(fs.readFileSync(legacyDeepSeek, 'utf8'), '');
    for (const candidate of fs.readdirSync(root, { recursive: true })) {
      const target = path.join(root, String(candidate));
      if (fs.statSync(target).isFile()) {
        const content = fs.readFileSync(target, 'utf8');
        assert(!content.includes(secret) && !content.includes(qwenSecret), `plaintext leaked into ${candidate}`);
      }
    }

    fs.writeFileSync(legacyDeepSeek, 'DEEPSEEK_API_KEY=sk-different-fixture-value\n', 'utf8');
    const conflict = migrateLegacyCredentials(store, [{
      credentialId: 'deepseek',
      environmentName: 'DEEPSEEK_API_KEY',
      filePath: legacyDeepSeek,
    }]);
    assert.equal(conflict[0].outcome, 'conflict');
    assert(fs.readFileSync(legacyDeepSeek, 'utf8').includes('sk-different-fixture-value'), 'conflicting legacy source must be preserved');

    const failedLegacy = path.join(root, 'failed-apikey.txt');
    fs.writeFileSync(failedLegacy, `DEEPSEEK_API_KEY=${secret}\n`, 'utf8');
    const failed = migrateLegacyCredentials(
      new ModelCredentialStore(path.join(root, 'failed.json'), new TestCipher(false)),
      [{ credentialId: 'deepseek', environmentName: 'DEEPSEEK_API_KEY', filePath: failedLegacy }],
    );
    assert.equal(failed[0].outcome, 'failed');
    assert(fs.readFileSync(failedLegacy, 'utf8').includes(secret), 'failed secure write must preserve the legacy source');

    fs.writeFileSync(file, '{ invalid', 'utf8');
    assert.throws(() => store.get('deepseek'), /original file was preserved/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{ invalid');

    console.log('Model credential store verification passed.');
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
