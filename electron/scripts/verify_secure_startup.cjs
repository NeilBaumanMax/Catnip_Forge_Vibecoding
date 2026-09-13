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
  const browserPanel = fs.readFileSync(path.join(root, 'electron', 'src', 'renderer', 'components', 'BrowserPanel.tsx'), 'utf8');
  const modelPanel = fs.readFileSync(path.join(root, 'electron', 'src', 'renderer', 'components', 'ModelPanel.tsx'), 'utf8');
  const mainIndex = fs.readFileSync(path.join(root, 'electron', 'src', 'main', 'index.ts'), 'utf8');
  const singlePromptPath = path.join(root, 'agent', 'host-tools', 'configure-model-credential.ps1');
  const startupPromptPath = path.join(root, 'agent', 'host-tools', 'configure-startup-model.ps1');
  const startupPrompt = fs.readFileSync(startupPromptPath, 'utf8');
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
  assert.match(mainIndex, /ipcMain\.handle\('startup:restart-after-model-setup', async \(\) =>/);
  assert.doesNotMatch(mainIndex, /startup:save-apikey/);
  assert.match(renderer, /startup-key-dialog/, 'first run must show the preset setup overlay');
  assert.match(renderer, /配置 DeepSeek \/ 千问/);
  assert.match(renderer, /使用其他模型供应商/);
  assert.doesNotMatch(renderer, /type="password"/, 'secrets must never be entered in Renderer');
  assert.doesNotMatch(renderer, /disabled=\{startupApiKeySaving \|\| startupApiKeyRestarting \|\| !startupStatus\.playwrightReady\}/, 'model setup must not be blocked by unrelated Playwright resources');
  assert.doesNotMatch(renderer, /发布包缺少浏览器运行资源，请重新获取完整压缩包/, 'development startup must not show a false package-integrity error');
  assert.match(renderer, /startupStatus && !startupStatus\.firstRun \? <div[\s\S]{0,180}className=\{`appearance-settings/, 'unconfigured first run must hide the unavailable floating assistant');
  assert.match(browserPanel, /startsInHarnessMode \? 'repo' : 'explore'/);
  assert.match(browserPanel, /if \(startInCustomModelSetup\) setMode\('models'\)/);
  assert.match(modelPanel, /restartAfterModelSetup\(\)/);
  assert.match(modelPanel, /使用预设模型配置/);
  assert.match(modelPanel, /使用其他模型供应商/);
  assert.match(modelPanel, /DeepSeek API Key/);
  assert.match(modelPanel, /千问 API Key/);
  assert.match(modelPanel, /当前启用/);
  assert.match(modelPanel, /替换千问 Key/);
  assert.match(modelPanel, /deleteCredential\('qwen', '千问'\)/);
  assert.match(modelPanel, /清除千问 Key/);
  assert.match(modelPanel, /credential\?\.configured \? '替换' : '配置'/);
  assert.match(modelPanel, /保存更改/);
  assert.match(modelPanel, /启用此供应商/);
  assert.doesNotMatch(modelPanel, /type="password"/);
  assert.deepEqual([...fs.readFileSync(singlePromptPath).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.deepEqual([...fs.readFileSync(startupPromptPath).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal((startupPrompt.match(/<PasswordBox /g) || []).length, 2);
  assert.match(startupPrompt, /DeepSeek API Key（必填）/);
  assert.match(startupPrompt, /千问 API Key（选填/);
  assert.match(startupPrompt, /ZeroFreeBSTR/);
  const firstRunSource = fs.readFileSync(path.join(root, 'electron', 'src', 'main', 'first-run.ts'), 'utf8');
  assert.match(firstRunSource, /configureStartupPreset/);
  assert.match(firstRunSource, /setupMode: 'preset'/);
  console.log('secure startup verification passed: preset overlay, dual native prompt, encrypted store, no Renderer secret state');
  app.quit();
}

main().catch((error) => { console.error(error); app.exit(1); });
