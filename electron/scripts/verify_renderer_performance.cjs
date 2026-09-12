const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const rendererRoot = path.join(root, 'src', 'renderer');
const assetRoot = path.join(rendererRoot, 'assets');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const optimizedAssets = [
  ['catnip-agent-welcome-v2.webp', true],
  ['catnip-app-icon.webp', true],
  ['catnip-assistant.webp', true],
  ['catnip-cosmic-shell.jpg', false],
  ['chat-history-night-v2.jpg', false],
  ['explore-academy-hero.jpg', false],
  ['explore-diagnosis-guagua.webp', true],
  ['explore-diagnosis-workspace.jpg', false],
  ['explore-idea-guagua.webp', true],
  ['explore-idea-workspace.jpg', false],
  ['guagua-avatar.jpg', false],
  ['task-manager-empty-guagua-v2.webp', true],
];

let optimizedBytes = 0;
for (const [name, alphaExpected] of optimizedAssets) {
  const file = path.join(assetRoot, name);
  const contents = fs.readFileSync(file);
  optimizedBytes += contents.length;
  if (name.endsWith('.webp')) {
    assert.equal(contents.subarray(0, 4).toString('ascii'), 'RIFF', `${name} is not RIFF WebP`);
    assert.equal(contents.subarray(8, 12).toString('ascii'), 'WEBP', `${name} is not WebP`);
    if (alphaExpected) assert.ok(contents.includes(Buffer.from('ALPH')), `${name} lost its alpha plane`);
  } else {
    assert.equal(contents[0], 0xff, `${name} is not JPEG`);
    assert.equal(contents[1], 0xd8, `${name} is not JPEG`);
  }
}
assert.ok(optimizedBytes < 2_500_000, `optimized renderer images exceed budget: ${optimizedBytes}`);

const sourceFiles = [];
function collectSources(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSources(target);
    else if (/\.(?:ts|tsx|less)$/.test(entry.name)) sourceFiles.push(target);
  }
}
collectSources(rendererRoot);
const rendererSource = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const [name] of optimizedAssets) {
  const legacy = name.replace(/\.(?:webp|jpg)$/, '.png');
  assert.ok(!rendererSource.includes(legacy), `legacy uncompressed asset is still referenced: ${legacy}`);
}

const browserPanel = read('src/renderer/components/BrowserPanel.tsx');
assert.match(browserPanel, /React\.lazy\(\(\) => import\('\.\/CodeEditor'\)\)/, 'CodeEditor must be lazy-loaded');
assert.match(browserPanel, /React\.lazy\(\(\) => import\('\.\/ModelPanel'\)\)/, 'ModelPanel must be lazy-loaded');
assert.match(browserPanel, /React\.lazy\(\(\) => import\('\.\/WorkspacePanel'\)\)/, 'WorkspacePanel must be lazy-loaded');
assert.doesNotMatch(browserPanel, /import CodeEditor from|import ModelPanel from|import WorkspacePanel from/, 'heavy panels must not have static imports');

const mainProcess = read('src/main/index.ts');
const preload = read('src/preload/index.ts');
const startupPreload = read('src/renderer/startup-preload.ts');
assert.match(mainProcess, /CATNIP_DISABLE_GPU === '1'[\s\S]{0,180}disableHardwareAcceleration/, 'GPU fallback escape hatch is missing');
assert.doesNotMatch(mainProcess, /app\.disableHardwareAcceleration\(\);\s*app\.commandLine\.appendSwitch\('disable-gpu-compositing'\);\s*\n\s*\/\//, 'hardware acceleration must not be disabled unconditionally');
assert.match(mainProcess, /backgroundThrottling:\s*false/, 'hidden renderer must remain active during splash preload');
assert.match(mainProcess, /renderer:interactive[\s\S]{0,400}finishSplash\(\)/, 'renderer readiness must gate splash completion');
assert.match(mainProcess, /RENDERER_INTERACTIVE_TIMEOUT_MS[\s\S]*renderer-interactive-timeout[\s\S]{0,250}finishSplash\(\)/, 'renderer readiness needs a bounded Main fallback');
assert.match(preload, /notifyRendererInteractive:\s*\(\) => ipcRenderer\.send\('renderer:interactive'\)/, 'narrow readiness bridge is missing');
assert.match(startupPreload, /document\.fonts\?\.ready/, 'font warm-up is missing');
assert.match(startupPreload, /image\.decode\(\)/, 'critical image decoding is missing');
assert.match(startupPreload, /MAX_CRITICAL_PRELOAD_MS/, 'renderer warm-up needs a bounded fallback');
assert.doesNotMatch(startupPreload, /localStorage|sessionStorage|userData|data:/, 'startup warm-up must not create a persistent resource copy');

console.log(JSON.stringify({ ok: true, optimizedAssets: optimizedAssets.length, optimizedBytes }, null, 2));
