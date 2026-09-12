const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const electronRoot = path.resolve(__dirname, '..');
const versionInfo = JSON.parse(fs.readFileSync(path.join(electronRoot, '..', 'config', 'version.json'), 'utf-8'));
const outputRoot = process.env.CATNIP_PACKAGE_OUTPUT
  ? path.resolve(electronRoot, process.env.CATNIP_PACKAGE_OUTPUT)
  : path.join(electronRoot, 'dist-package');
const generatedPackageRoot = path.join(outputRoot, 'win-unpacked');
const packageRoot = path.join(outputRoot, versionInfo.productName);
const resourcesRoot = path.join(packageRoot, 'resources');
const exePath = path.join(packageRoot, `${versionInfo.productName}.exe`);
const builder = path.join(electronRoot, 'node_modules', 'electron-builder', 'cli.js');
const stamp = path.join(electronRoot, 'scripts', 'stamp_win_exe_version.cjs');
const localElectronDist = path.join(electronRoot, 'node_modules', 'electron', 'dist');
const requiredBundleSources = [
  path.join(electronRoot, '..', '_bundled', 'nodejs', 'node.exe'),
  path.join(electronRoot, '..', '_bundled', 'python', 'python.exe'),
  path.join(electronRoot, '..', '_bundled', 'python', 'Lib', 'site-packages', 'serial'),
  path.join(electronRoot, '..', '_bundled', 'python', 'Lib', 'site-packages', 'click', 'core.py'),
  path.join(electronRoot, '..', '_bundled', 'python', 'Lib', 'site-packages', 'idf_component_manager', '__init__.py'),
  path.join(electronRoot, '..', '_bundled', 'playwright'),
];
const missingBundleSources = requiredBundleSources.filter((source) => !fs.existsSync(source));

if (missingBundleSources.length) {
  console.error('[pack:win] required ignored bundle sources are missing:');
  missingBundleSources.forEach((source) => console.error(`  - ${path.relative(path.join(electronRoot, '..'), source)}`));
  console.error('[pack:win] restore _bundled resources before rebuilding win-unpacked.');
  process.exit(1);
}

const bundledPythonRoot = path.join(electronRoot, '..', '_bundled', 'python');
const bundledPython = path.join(bundledPythonRoot, 'python.exe');
const pythonProbe = spawnSync(bundledPython, ['-c', [
  'import pathlib, serial, click.core, idf_component_manager, esptool',
  'root = pathlib.Path(__import__("sys").executable).resolve().parent',
  'assert all(str(pathlib.Path(module.__file__).resolve()).lower().startswith(str(root).lower()) for module in [serial, click.core, idf_component_manager, esptool])',
].join('; ')], {
  cwd: electronRoot,
  encoding: 'utf-8',
  windowsHide: true,
  env: { ...process.env, PYTHONHOME: bundledPythonRoot, PYTHONNOUSERSITE: '1' },
});
if (pythonProbe.status !== 0) {
  console.error(`[pack:win] bundled Python isolation probe failed: ${pythonProbe.stderr || pythonProbe.stdout}`);
  process.exit(pythonProbe.status || 1);
}

const relativeOutputRoot = path.relative(electronRoot, outputRoot);
if (!relativeOutputRoot || relativeOutputRoot.startsWith('..') || path.isAbsolute(relativeOutputRoot)) {
  console.error(`[pack:win] refusing to clean output outside electron workspace: ${outputRoot}`);
  process.exit(1);
}
fs.rmSync(outputRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });

const builderArgs = [
  builder, '--win', '--x64', '--dir',
  `--config.directories.output=${outputRoot}`,
  '--config.extraResources=[]',
];
if (fs.existsSync(path.join(localElectronDist, 'electron.exe'))) {
  builderArgs.push(`--config.electronDist=${localElectronDist}`);
  console.log(`[pack:win] reusing installed Electron distribution: ${localElectronDist}`);
}

const result = spawnSync(process.execPath, builderArgs, {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.error(`[pack:win] electron-builder failed (status=${result.status}, signal=${result.signal || 'none'}).`);
  if (result.error) console.error(result.error);
  process.exit(result.status || 1);
}

if (!fs.existsSync(generatedPackageRoot)) {
  console.error(`[pack:win] electron-builder output is missing: ${generatedPackageRoot}`);
  process.exit(1);
}
fs.renameSync(generatedPackageRoot, packageRoot);
console.log(`[pack:win] renamed package directory: ${path.basename(packageRoot)}`);

function copyTree(source, target, excluded = () => false) {
  if (!fs.existsSync(source)) throw new Error(`[pack:win] missing resource source: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (candidate) => {
      const relative = path.relative(source, candidate).replace(/\\/g, '/');
      return !excluded(relative, path.basename(candidate));
    },
  });
}

function hasSegment(relative, names) {
  return relative.split('/').some((segment) => names.has(segment));
}

console.log('[pack:win] copying packaged resources in the top-level process');
copyTree(path.join(electronRoot, 'apikey.txt.example'), path.join(resourcesRoot, 'apikey.txt.example'));
copyTree(path.join(electronRoot, 'CATNIP_FORGE_USER_GUIDE.md'), path.join(resourcesRoot, 'CATNIP_FORGE_USER_GUIDE.md'));
copyTree(path.join(electronRoot, 'assets', 'icon.ico'), path.join(resourcesRoot, 'electron', 'assets', 'icon.ico'));
copyTree(path.join(electronRoot, 'assets', 'icon.png'), path.join(resourcesRoot, 'electron', 'assets', 'icon.png'));
copyTree(path.join(electronRoot, '..', 'agent'), path.join(resourcesRoot, 'agent'), (relative) => {
  const first = relative.split('/')[0];
  return new Set(['logs', 'screenshots', 'recordings']).has(first)
    || relative.endsWith('.html') || relative.endsWith('.png')
    || relative.includes('node_modules/.cache/');
});
copyTree(path.join(electronRoot, '..', 'runtime', 'dist'), path.join(resourcesRoot, 'runtime', 'dist'));
copyTree(path.join(electronRoot, '..', 'runtime', 'package.json'), path.join(resourcesRoot, 'runtime', 'package.json'));
copyTree(path.join(electronRoot, '..', 'runtime', 'node_modules'), path.join(resourcesRoot, 'runtime', 'node_modules'), (relative) => (
  hasSegment(relative, new Set(['.cache', 'chrome_profile', 'recordings', 'workflows', 'logs']))
));
copyTree(path.join(electronRoot, '..', 'runtime', 'hardboard'), path.join(resourcesRoot, 'runtime', 'hardboard'), (relative) => (
  hasSegment(relative, new Set(['build', '.git', '.cache', '.catnip', 'logs', 'events']))
  || /(?:^|\/)esptools\/esp-idf-v[^/]+\/esp-idf\/examples(?:\/|$)/.test(relative)
  || /(?:^|\/)idf-tools\/python_env(?:\/|$)/.test(relative)
));
copyTree(path.join(electronRoot, '..', 'scripts'), path.join(resourcesRoot, 'scripts'), (relative) => hasSegment(relative, new Set(['__pycache__'])));
copyTree(path.join(electronRoot, '..', 'config'), path.join(resourcesRoot, 'config'));
copyTree(path.join(electronRoot, '..', '_bundled', 'nodejs'), path.join(resourcesRoot, 'runtime', 'nodejs'));
copyTree(path.join(electronRoot, '..', '_bundled', 'python'), path.join(resourcesRoot, 'runtime', 'python'), (_relative, name) => name.startsWith('python312._pth.disabled'));
copyTree(path.join(electronRoot, '..', '_bundled', 'python', 'python.exe'), path.join(resourcesRoot, 'runtime', 'python', 'Scripts', 'python.exe'));
copyTree(path.join(electronRoot, '..', '_bundled', 'python', 'python312.dll'), path.join(resourcesRoot, 'runtime', 'python', 'Scripts', 'python312.dll'));
copyTree(path.join(electronRoot, '..', 'runtime', 'python', 'python312-scripts._pth'), path.join(resourcesRoot, 'runtime', 'python', 'Scripts', 'python312._pth'));
copyTree(path.join(electronRoot, '..', 'runtime', 'python', 'sitecustomize.py'), path.join(resourcesRoot, 'runtime', 'python', 'Lib', 'site-packages', 'sitecustomize.py'));
copyTree(path.join(electronRoot, '..', '_bundled', 'playwright'), path.join(resourcesRoot, 'runtime', 'playwright'));

for (const forbidden of ['apikey.txt', 'qwen-apikey.txt']) {
  if (fs.existsSync(path.join(resourcesRoot, forbidden))) {
    console.error(`[pack:win] forbidden credential file exists in package: resources/${forbidden}`);
    process.exit(1);
  }
}

const stampResult = spawnSync(process.execPath, [stamp, exePath], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(stampResult.status || 0);
