const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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
  assert.equal(launch.options.windowsHide, true);
  assert.equal(launch.options.detached, true);
  assert.deepEqual(launch.options.stdio, 'ignore');
  assert(launch.args.includes('-OfficialRunScript'));
  assert(launch.args.includes('-Sta'));
  assert.deepEqual(launch.args.slice(launch.args.indexOf('-WindowStyle'), launch.args.indexOf('-WindowStyle') + 2), ['-WindowStyle', 'Hidden']);
  assert(fs.existsSync(launch.args[launch.args.indexOf('-File') + 1]), 'host input script path must follow -File');
  assert(fs.existsSync(launch.args[launch.args.indexOf('-OfficialRunScript') + 1]), 'official run script path must follow its flag');
  assert(!launch.args.join(' ').toLowerCase().includes('access secret'));
  assert(!JSON.stringify(launch.options.env).toLowerCase().includes('zhihu_access_secret'));

  assert.match(preload, /beginExploreZhihuConnection:\s*\(\)\s*=>/);
  assert(!/beginExploreZhihuConnection:\s*\([^)]*(secret|accessSecret)/i.test(preload));
  assert.match(panel, /连接知乎开放平台/);
  assert(!/<input[^>]+(?:secret|password)/i.test(panel));
  assert.match(mainSource, /shell\.openExternal\(ZHIHU_PROFILE_URL\)/);
  assert.match(hostScript, /auth set --secret-stdin/);
  assert.match(hostScript, /<PasswordBox x:Name="SecretInput"/, 'host dialog must use a native masked input');
  assert.match(hostScript, /SecurePassword\.Copy\(\)/, 'host dialog must obtain a SecureString from the masked input');
  assert.match(hostScript, /Topmost="True"/, 'host dialog must be brought above the browser and app');
  assert.match(hostScript, /WindowStyle="None"/, 'host dialog must not expose a console-like window frame');
  assert.match(hostScript, /ShowDialog\(\)/, 'host must use an independent native dialog');
  assert.doesNotMatch(hostScript, /Read-Host\s+['\"]请粘贴 Access Secret/, 'console input is not reliable from packaged Electron');
  assert.match(hostScript, /ZeroFreeBSTR/);
  assert(!/SetEnvironmentVariable|ZHIHU_ACCESS_SECRET|Out-File|Set-Content|Add-Content/.test(hostScript));
  assert(vendorRun.length > 0, 'official vendor script must remain present');

  const powershell = path.join(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const hostPath = path.join(root, 'agent', 'host-tools', 'configure-zhihu-secret.ps1');
  const xamlProbe = [
    `$source=[IO.File]::ReadAllText('${hostPath.replaceAll("'", "''")}')`,
    "$start=$source.IndexOf('<Window ')",
    "$finish=$source.IndexOf('</Window>',$start)",
    "if($start -lt 0 -or $finish -lt 0){exit 2}",
    '$markup=$source.Substring($start,$finish-$start+9)',
    'Add-Type -AssemblyName PresentationFramework',
    '[xml]$xaml=$markup',
    '$reader=[System.Xml.XmlNodeReader]::new($xaml)',
    '$window=[Windows.Markup.XamlReader]::Load($reader)',
    "if($null -eq $window.FindName('SecretInput')){exit 3}",
    '$window.Close()',
  ].join('; ');
  const xamlResult = spawnSync(powershell, ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-Command', xamlProbe], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000,
  });
  assert.equal(xamlResult.status, 0, `native secure panel must load on Windows: ${xamlResult.stderr}`);

  console.log('explore zhihu connection passed: renderer isolation, native panel load, masked stdin-only auth');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
