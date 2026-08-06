const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const electronRoot = path.resolve(__dirname, '..');
const versionInfo = JSON.parse(fs.readFileSync(path.join(electronRoot, '..', 'config', 'version.json'), 'utf-8'));
const outputRoot = process.env.CATNIP_PACKAGE_OUTPUT
  ? path.resolve(electronRoot, process.env.CATNIP_PACKAGE_OUTPUT)
  : path.join(electronRoot, 'dist-package');
const exePath = path.join(outputRoot, 'win-unpacked', `${versionInfo.productName}.exe`);
const builder = path.join(electronRoot, 'node_modules', 'electron-builder', 'cli.js');
const stamp = path.join(electronRoot, 'scripts', 'stamp_win_exe_version.cjs');
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

const result = spawnSync(process.execPath, [builder, '--win', '--x64', '--dir', `--config.directories.output=${outputRoot}`], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0 && !fs.existsSync(exePath)) {
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.warn('[pack:win] electron-builder failed after creating win-unpacked; continuing to stamp the unpacked exe.');
}

const stampResult = spawnSync(process.execPath, [stamp, exePath], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(stampResult.status || 0);
