const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-secure-startup-'));
app.setPath('userData', path.join(tempRoot, 'user-data'));

class TestCipher {
  available() { return true; }
  encrypt(value) { return Buffer.from(`sealed:${value}`, 'utf8'); }
  decrypt(value) { return value.toString('utf8').replace(/^sealed:/, ''); }
}

async function main() {
  await app.whenReady();
  const root = path.join(__dirname, '..', '..');
  const preload = fs.readFileSync(path.join(root, 'electron', 'src', 'preload', 'index.ts'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'electron', 'src', 'renderer', 'App.tsx'), 'utf8');
  const mainIndex = fs.readFileSync(path.join(root, 'electron', 'src', 'main', 'index.ts'), 'utf8');
  const { ModelCredentialStore } = require('../dist/main/model-credentials.js');
  const { saveStartupApiKeys } = require('../dist/main/first-run.js');
  const storePath = path.join(tempRoot, 'credentials.json');
  const store = new ModelCredentialStore(storePath, new TestCipher());
  const deepSeek = 'sk-secure-startup-deepseek-fixture';
  const qwen = 'sk-secure-startup-qwen-fixture';
  assert.deepEqual(saveStartupApiKeys(deepSeek, qwen, store), { ok: true, qwenSaved: true });
  const persisted = fs.readFileSync(storePath, 'utf8');
  assert(!persisted.includes(deepSeek) && !persisted.includes(qwen));
  assert.equal(store.get('deepseek'), deepSeek);
  assert.equal(store.get('qwen'), qwen);
  assert.match(preload, /configureStartupModel:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('startup:configure-model'\)/);
  assert.doesNotMatch(preload, /saveStartupApiKey|startup:save-apikey/);
  assert.match(mainIndex, /ipcMain\.handle\('startup:configure-model', async \(\) =>/);
  assert.doesNotMatch(mainIndex, /startup:save-apikey/);
  const dialogStart = renderer.indexOf('{startupStatus?.firstRun');
  const dialogEnd = renderer.indexOf('{startupStatus && !startupStatus.firstRun', dialogStart);
  const dialog = renderer.slice(dialogStart, dialogEnd);
  assert.doesNotMatch(dialog, /type="password"|startupApiKey\}|startupQwenApiKey/);
  assert.match(dialog, /打开安全窗口并配置/);
  const firstRunSource = fs.readFileSync(path.join(root, 'electron', 'src', 'main', 'first-run.ts'), 'utf8');
  assert.match(firstRunSource, /if \(!isUsableApiKeyContent\(normalized\)\) throw new Error\('DeepSeek API Key 格式无效'\)/);
  console.log('secure startup verification passed: native no-argument IPC, encrypted store, no Renderer secret state');
  app.quit();
}

main().catch((error) => { console.error(error); app.exit(1); });
