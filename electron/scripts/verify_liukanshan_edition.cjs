const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const currentSurfaces = [
  'assets/splash.html',
  'CATNIP_FORGE_USER_GUIDE.md',
  'src/main/software-assistant.ts',
  'src/renderer/App.tsx',
  'src/renderer/components/BrowserPanel.tsx',
  'src/renderer/components/CatnipOnboarding.tsx',
  'src/renderer/components/ChatPanel.tsx',
  'src/renderer/components/ExplorePanel.tsx',
  'src/renderer/components/WorkspacePanel.tsx',
];

const surfaceSource = currentSurfaces.map(read).join('\n');
assert.match(surfaceSource, /刘看山/, 'the Liu Kanshan identity is missing');
assert.doesNotMatch(surfaceSource, /学院呱呱/, 'a current user-facing surface still exposes the old mascot name');

const requiredAssets = [
  'assets/icon.ico',
  'assets/icon.png',
  'assets/splash-liukanshan.png',
  'src/renderer/assets/liukanshan-agent-welcome.png',
  'src/renderer/assets/liukanshan-app-icon.png',
  'src/renderer/assets/liukanshan-assistant.png',
  'src/renderer/assets/liukanshan-avatar.jpg',
  'src/renderer/assets/liukanshan-chat-history-night.jpg',
  'src/renderer/assets/liukanshan-explore-diagnosis-workspace.jpg',
  'src/renderer/assets/liukanshan-explore-diagnosis.png',
  'src/renderer/assets/liukanshan-explore-idea-workspace.jpg',
  'src/renderer/assets/liukanshan-explore-idea.png',
  'src/renderer/assets/liukanshan-task-manager-empty.png',
];

for (const relativePath of requiredAssets) {
  const contents = fs.readFileSync(path.join(root, relativePath));
  assert.ok(contents.length > 20_000, `${relativePath} is unexpectedly small`);
  if (relativePath.endsWith('.png')) {
    assert.deepEqual([...contents.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${relativePath} is not PNG`);
  } else if (relativePath.endsWith('.ico')) {
    assert.deepEqual([...contents.subarray(0, 4)], [0, 0, 1, 0], `${relativePath} is not ICO`);
  } else {
    assert.deepEqual([...contents.subarray(0, 2)], [0xff, 0xd8], `${relativePath} is not JPEG`);
  }
}

const appSource = read('src/renderer/App.tsx');
const onboardingSource = read('src/renderer/components/CatnipOnboarding.tsx');
const exploreSource = read('src/renderer/components/ExplorePanel.tsx');
assert.match(appSource, /liukanshan-assistant\.png/);
assert.match(appSource, /liukanshan-avatar\.jpg/);
assert.match(onboardingSource, /刘看山新手旅程 · 知乎特供版/);
assert.match(exploreSource, /liukanshan-explore-idea-workspace\.jpg/);
assert.match(exploreSource, /liukanshan-explore-diagnosis-workspace\.jpg/);
assert.match(read('src/main/software-assistant.ts'), /知乎特供版内置的软件使用助手“刘看山”/);

console.log(JSON.stringify({ ok: true, surfaces: currentSurfaces.length, assets: requiredAssets.length }, null, 2));
