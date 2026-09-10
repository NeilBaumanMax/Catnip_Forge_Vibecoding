const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const browser = fs.readFileSync(path.join(root, 'src/renderer/components/BrowserPanel.tsx'), 'utf8');
const explore = fs.readFileSync(path.join(root, 'src/renderer/components/ExplorePanel.tsx'), 'utf8');

assert.match(browser, /data-tour-id="monitor-analyze-problem"/);
assert.match(browser, /data-tour-id="task-analyze-problem"/);
assert.match(browser, /task\.status === 'failed'/);
assert.match(browser, /setMode\('explore'\)/);
assert.match(browser, /onClick=\{openExploreHome\}/);
assert.match(browser, /setExploreDiagnosisSeed\(null\)/);
assert.match(browser, /diagnosisSeed=\{exploreDiagnosisSeed\}/);
assert.match(browser, /接收区当前有 \$\{visibleCharacters\} 个字符/);
assert.doesNotMatch(browser, /\$\{serialText(?:\.|\})/);

assert.match(explore, /createExploreWorkSession\('diagnosis'\)/);
assert.match(explore, /input: diagnosisSeed\.problem/);
assert.match(explore, /setView\(session\.mode\)/);
assert.match(explore, /saveExploreWorkSession/);
assert.match(explore, /请核对描述和 Context 后再开始分析/);
assert.match(explore, /onSubmit=\{\(event\) => void prepareRequest\(event\)\}/);
assert.match(explore, /分析阶段不会修改文件、Build、Flash 或操作串口/);

console.log('Explore diagnosis entry verification passed.');
