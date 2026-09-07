const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

async function main() {
  await app.whenReady();
  const { mapOfficialZhihuStatus, readExploreZhihuConnectionStatus } = require('../dist/main/explore-zhihu-status.js');

  assert.equal(mapOfficialZhihuStatus({ ok: true, installed: false, auth: { configured: false } }).state, 'needs_install');
  assert.equal(mapOfficialZhihuStatus({ ok: true, installed: true, cli: { compatible: true }, auth: { configured: false } }).state, 'needs_secret');
  assert.equal(mapOfficialZhihuStatus({ ok: true, installed: true, cli: { compatible: true }, auth: { configured: true } }).state, 'connected');
  assert.equal(mapOfficialZhihuStatus(null).state, 'error');

  const status = await readExploreZhihuConnectionStatus();
  assert(['connected', 'needs_secret', 'needs_install', 'error'].includes(status.state));
  assert.deepEqual(Object.keys(status).sort(), ['authConfigured', 'compatible', 'installed', 'message', 'state']);
  assert(!JSON.stringify(status).toLowerCase().includes('secret":"'), 'status response must not expose a credential value');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'explore-zhihu-status.ts'), 'utf8');
  assert(!source.includes('env: { ...process.env }'), 'status child must not inherit the full application environment');
  assert(source.includes("'ZHIHU_CLI_HOME'"), 'status child must preserve the official CLI home');
  console.log(`explore zhihu status passed: state=${status.state} installed=${status.installed} compatible=${status.compatible}`);
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
