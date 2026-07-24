const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-data-paths-'));
const oldRoot = path.join(tempRoot, '@vibeide', 'electron');
const expectedRoot = path.join(tempRoot, '@Catnip_Forge', 'electron');
fs.mkdirSync(path.join(oldRoot, 'runtime-data', 'claude-session'), { recursive: true });
fs.mkdirSync(path.join(oldRoot, 'runtime-data', 'attachments', 'fixture'), { recursive: true });
fs.writeFileSync(path.join(oldRoot, 'runtime-data', 'claude-session', 'session.json'), '{"legacy":true}\n');
fs.writeFileSync(path.join(oldRoot, 'runtime-data', 'attachments', 'fixture', 'manifest.json'), '{"attachment":true}\n');
fs.writeFileSync(path.join(oldRoot, 'DevToolsActivePort'), 'must-not-migrate');

app.setPath('appData', tempRoot);

try {
  const paths = require('../dist/main/user-data-path.js');
  const first = paths.configureCatnipUserDataPath();
  assert.equal(first.userDataPath, expectedRoot);
  assert.equal(first.legacyUserDataPath, oldRoot);
  assert.equal(first.migrated, true, JSON.stringify(first));
  assert.equal(app.getPath('userData'), expectedRoot);
  assert(fs.existsSync(path.join(expectedRoot, 'runtime-data', 'claude-session', 'session.json')));
  assert(fs.existsSync(path.join(expectedRoot, 'runtime-data', 'attachments', 'fixture', 'manifest.json')));
  assert(!fs.existsSync(path.join(expectedRoot, 'DevToolsActivePort')));
  assert(fs.existsSync(oldRoot), 'legacy data must remain as a non-destructive backup');

  const sessionFile = path.join(expectedRoot, 'runtime-data', 'claude-session', 'session.json');
  fs.writeFileSync(sessionFile, '{"new":true}\n');
  fs.writeFileSync(path.join(oldRoot, 'runtime-data', 'claude-session', 'session.json'), '{"legacyChanged":true}\n');
  const second = paths.configureCatnipUserDataPath();
  assert.equal(second.migrated, false);
  assert.equal(fs.readFileSync(sessionFile, 'utf8'), '{"new":true}\n');

  const electronPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(electronPackage.main, 'dist/main/bootstrap.js');
  const bootstrap = fs.readFileSync(path.join(__dirname, '..', 'dist', 'main', 'bootstrap.js'), 'utf8');
  assert(bootstrap.indexOf('configureCatnipUserDataPath') < bootstrap.indexOf("require('./index')"));

  const runtimePaths = fs.readFileSync(path.join(__dirname, '..', '..', 'runtime', 'src', 'paths.ts'), 'utf8');
  assert(runtimePaths.includes("const aliasRoot = 'C:\\\\Catnip_Forge'"));
  assert(runtimePaths.includes("'Catnip_Forge', 'hardboard'"));
  console.log(`catnip data paths verification passed: ${expectedRoot}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

app.whenReady().finally(() => {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // Best effort; the test path is isolated under the system temp directory.
  }
  app.quit();
});
