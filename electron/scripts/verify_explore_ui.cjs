const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const browserPanel = fs.readFileSync(path.join(root, 'src', 'renderer', 'components', 'BrowserPanel.tsx'), 'utf8');
const explorePanel = fs.readFileSync(path.join(root, 'src', 'renderer', 'components', 'ExplorePanel.tsx'), 'utf8');
const globalStyles = fs.readFileSync(path.join(root, 'src', 'renderer', 'styles', 'global.less'), 'utf8');
const appleStyles = fs.readFileSync(path.join(root, 'src', 'renderer', 'styles', 'apple.less'), 'utf8');

assert.match(browserPanel, /type PanelMode = [^;]*'explore'/, 'PanelMode must include explore');
assert.equal((browserPanel.match(/data-tour-id="tab-/g) || []).length, 5, 'exactly five visible workspace tabs are required');
assert.match(browserPanel, /data-tour-id="tab-explore"[^\r\n]*>探索<\/button>/, 'visible Explore tab is missing');
assert.doesNotMatch(browserPanel, /tab-zhihu/, 'Zhihu must not be a workspace name');
assert.match(browserPanel, /mode === 'explore'[\s\S]*<ExplorePanel/, 'Explore panel must render from the workspace mode');

assert.match(explorePanel, />找灵感</, 'idea entry is missing');
assert.match(explorePanel, />解问题</, 'diagnosis entry is missing');
assert.match(explorePanel, /本次分析 Context/, 'diagnosis context picker is missing');
assert.match(explorePanel, /取消勾选后，该项不会进入分析/, 'context exclusion promise is missing');
assert.match(explorePanel, /需要先连接知乎开放平台/, 'safe connection wording is missing');
assert.match(explorePanel, /不会修改文件、Build、Flash 或操作串口/, 'Explore side-effect boundary is missing');

assert.match(globalStyles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\) minmax\(160px, 0\.9fr\)/);
assert.match(appleStyles, /grid-template-columns: repeat\(5, minmax\(88px, 120px\)\) minmax\(120px, 1fr\)/);
assert.match(appleStyles, /\.explore-panel\s*\{/);

console.log('explore UI contract passed: 5 tabs, 2 entries, context exclusion, safe connection boundary');
