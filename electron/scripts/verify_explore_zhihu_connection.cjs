const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

async function main() {
  await app.whenReady();
  const root = path.join(__dirname, '..', '..');
  const mainSource = fs.readFileSync(path.join(root, 'electron', 'src', 'main', 'explore-zhihu-status.ts'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'electron', 'src', 'preload', 'index.ts'), 'utf8');
  const panel = fs.readFileSync(path.join(root, 'electron', 'src', 'renderer', 'components', 'ExplorePanel.tsx'), 'utf8');
  const hostScript = fs.readFileSync(path.join(root, 'agent', 'host-tools', 'configure-zhihu-secret.ps1'), 'utf8');
  const vendorRun = fs.readFileSync(path.join(root, 'agent', 'skills', 'zhihu', 'scripts', 'run.ps1'), 'utf8');
  const { buildExploreZhihuConnectionLaunch, ZHIHU_PROFILE_URL } = require('../dist/main/explore-zhihu-status.js');

  assert.equal(ZHIHU_PROFILE_URL, 'https://developer.zhihu.com/profile');
  const launch = buildExploreZhihuConnectionLaunch();
  assert.equal(launch.options.windowsHide, false);
  assert.equal(launch.options.detached, true);
  assert.deepEqual(launch.options.stdio, 'ignore');
  assert(launch.args.includes('-OfficialRunScript'));
  assert(!launch.args.join(' ').toLowerCase().includes('access secret'));
  assert(!JSON.stringify(launch.options.env).toLowerCase().includes('zhihu_access_secret'));

  assert.match(preload, /beginExploreZhihuConnection:\s*\(\)\s*=>/);
  assert(!/beginExploreZhihuConnection:\s*\([^)]*(secret|accessSecret)/i.test(preload));
  assert.match(panel, /连接知乎开放平台/);
  assert(!/<input[^>]+(?:secret|password)/i.test(panel));
  assert.match(mainSource, /shell\.openExternal\(ZHIHU_PROFILE_URL\)/);
  assert.match(hostScript, /Read-Host[^\r\n]+-AsSecureString/);
  assert.match(hostScript, /auth set --secret-stdin/);
  assert.match(hostScript, /ZeroFreeBSTR/);
  assert(!/SetEnvironmentVariable|ZHIHU_ACCESS_SECRET|Out-File|Set-Content|Add-Content/.test(hostScript));
  assert(vendorRun.length > 0, 'official vendor script must remain present');

  console.log('explore zhihu connection passed: zero-argument renderer action, masked host input, stdin-only auth');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
