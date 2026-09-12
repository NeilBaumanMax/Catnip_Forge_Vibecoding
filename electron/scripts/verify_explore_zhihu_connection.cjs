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
  const {
    buildExploreZhihuConnectionLaunch,
    buildExploreZhihuSetupLaunch,
    evaluateExploreZhihuInstallation,
    mapOfficialZhihuStatus,
    ZHIHU_PROFILE_URL,
  } = require('../dist/main/explore-zhihu-status.js');

  assert.equal(ZHIHU_PROFILE_URL, 'https://developer.zhihu.com/profile');
  assert.equal(
    mapOfficialZhihuStatus({ ok: false, installed: true, cli: { compatible: false }, auth: { configured: false } }).state,
    'needs_install',
    'an incompatible CLI must require explicit update consent',
  );
  const launch = buildExploreZhihuConnectionLaunch();
  assert.equal(launch.options.windowsHide, true);
  assert.notEqual(launch.options.detached, true, 'native prompt must remain attached to the desktop Electron process');
  assert.deepEqual(launch.options.stdio, 'ignore');
  assert(launch.args.includes('-OfficialRunScript'));
  assert(launch.args.includes('-ReadyFile'));
  assert(launch.args.includes('-Sta'));
  assert.deepEqual(launch.args.slice(launch.args.indexOf('-WindowStyle'), launch.args.indexOf('-WindowStyle') + 2), ['-WindowStyle', 'Hidden']);
  assert(fs.existsSync(launch.args[launch.args.indexOf('-File') + 1]), 'host input script path must follow -File');
  assert(fs.existsSync(launch.args[launch.args.indexOf('-OfficialRunScript') + 1]), 'official run script path must follow its flag');
  assert(!launch.args.join(' ').toLowerCase().includes('access secret'));
  assert(!JSON.stringify(launch.options.env).toLowerCase().includes('zhihu_access_secret'));

  const setupLaunch = buildExploreZhihuSetupLaunch();
  assert.equal(setupLaunch.options.windowsHide, true);
  assert.deepEqual(setupLaunch.options.stdio, ['ignore', 'pipe', 'pipe']);
  assert.match(setupLaunch.args.at(-1), /skills[\\/]zhihu[\\/]scripts[\\/]setup\.ps1$/);
  assert(fs.existsSync(setupLaunch.args.at(-1)), 'official setup script must exist');

  const connected = { state: 'connected', installed: true, compatible: true, authConfigured: true, message: '已连接' };
  let setupCalls = 0;
  const repeated = await evaluateExploreZhihuInstallation(async () => connected, async () => { setupCalls += 1; });
  assert.equal(repeated.state, 'already_ready');
  assert.equal(setupCalls, 0, 'setup must not run when the official CLI is already ready');

  const statusSequence = [
    { state: 'needs_install', installed: false, compatible: false, authConfigured: false, message: '需要安装' },
    { state: 'needs_secret', installed: true, compatible: true, authConfigured: false, message: '需要连接' },
  ];
  const installed = await evaluateExploreZhihuInstallation(async () => statusSequence.shift(), async () => { setupCalls += 1; });
  assert.equal(installed.state, 'installed');
  assert.equal(installed.connection.state, 'needs_secret');
  assert.equal(setupCalls, 1, 'one explicit install request must run setup exactly once');
  assert.match(mainSource, /if \(setupInFlight\) return setupInFlight;/, 'Main must deduplicate concurrent install IPC calls');

  assert.match(preload, /beginExploreZhihuConnection:\s*\(\)\s*=>/);
  assert.match(preload, /installExploreZhihuConnection:\s*\(\)\s*=>/);
  assert(!/beginExploreZhihuConnection:\s*\([^)]*(secret|accessSecret)/i.test(preload));
  assert(!/installExploreZhihuConnection:\s*\([^)]*(secret|accessSecret)/i.test(preload));
  assert.match(panel, /连接知乎开放平台/);
  assert.match(panel, /autoConnectionPrompted\.current = true;[\s\S]{0,120}void beginConnection\(\)/, 'missing one-shot automatic secret prompt');
  assert.match(panel, /安装连接组件并继续/, 'fresh installs require a visible consent action');
  assert.match(panel, /正在从知乎官方下载并校验 CLI/, 'CLI download and verification progress must be explicit');
  assert.match(panel, /正在等待 Access Secret 安全窗口显示/, 'native prompt startup must have a visible waiting state');
  assert(!/<input[^>]+(?:secret|password)/i.test(panel));
  assert.match(mainSource, /shell\.openExternal\(ZHIHU_PROFILE_URL\)/);
  assert.match(mainSource, /fs\.existsSync\(readyFile\)/, 'Main must wait for a native-dialog readiness file');
  assert.match(mainSource, /child\.once\('close'[^]*fs\.existsSync\(readyFile\)[^]*finish\(\)/, 'a promptly cancelled but rendered prompt still counts as visible');
  assert.match(mainSource, /child\.once\('close'[^]*安全输入窗口未显示/, 'early native-dialog exit must be reported to the renderer');
  assert.match(hostScript, /auth set --secret-stdin/);
  assert.match(hostScript, /<PasswordBox x:Name="SecretInput"/, 'host dialog must use a native masked input');
  assert.match(hostScript, /SecurePassword\.Copy\(\)/, 'host dialog must obtain a SecureString from the masked input');
  assert.match(hostScript, /Topmost="True"/, 'host dialog must be brought above the browser and app');
  assert.match(hostScript, /WindowStyle="None"/, 'host dialog must not expose a console-like window frame');
  assert.match(hostScript, /ShowDialog\(\)/, 'host must use an independent native dialog');
  assert.match(hostScript, /WriteAllText\(\$ReadyFile, 'ready'/, 'host must signal only after its native dialog is rendered');
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

  console.log('explore zhihu connection passed: explicit setup gate, one-shot native prompt, renderer isolation, masked stdin-only auth');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
