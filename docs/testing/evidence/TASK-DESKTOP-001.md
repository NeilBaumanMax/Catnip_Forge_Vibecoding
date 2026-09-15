# TASK-DESKTOP-001 Evidence
Lifecycle: ARCHIVED · 2026-09-15

## Preflight / scope
git status --short：仅用户原有三处未跟踪目录；git branch --show-current：DWIDE；git rev-parse HEAD：abd3dbf9258328632439d20d10ac5a0f57e0bb9d。
git remote -v：origin为用户仓库SSH，upstream只读；git rev-parse --abbrev-ref --symbolic-full-name '@{u}'：origin/DWIDE。
Task先于实现建立；本次为小范围同层提取，按ACTIVE规则与实现一起提交，无需再次独立计划提交。
禁止范围：App/Explore/Worker/Main/Runtime产品源码、IPC/状态生命周期、用户未跟踪目录；新依赖0。

## Validation
- PASS `node electron/scripts/verify_task_history.cjs`（提取前）：从BrowserPanel AST取两个原函数运行5组特征用例，全部通过。
- PASS 同一命令（提取后）：用例体不变，加载新task-history.ts并用TypeScript createProgram做strict/noEmit检查，全部通过。
- PASS `npm.cmd --prefix electron run verify:task-history`：不依赖dist、不编译Main、无外部副作用，包含相关类型严格检查。
- PASS `npm.cmd --prefix electron run verify:changed -- --plan --files electron/src/renderer/components/task-manager/task-history.ts`：识别desktop-shell、无unknown、包含verify:task-history；整模块保守计划仍含Chat与显式CDP要求，局部Task直接使用零Main构建的专项。
- PASS 提取一致性审查：与`git show abd3dbf9:electron/src/renderer/components/BrowserPanel.tsx`统一CRLF/LF后逐一比较两个函数和类型声明文本（仅去export），完全相同；移除这三项和新import后，用TS printer比较剩余组件，JSX/effects/工程过滤/清空/调用处完全相同。
- 尺寸：BrowserPanel 1518 → 1471（-47）；新模块49行。JSON软基线更新为此次已审尺寸；不是通过压缩/删除业务降行数。
- 首次一致性审查FAIL：TS printer保留原JSX中的CRLF，而patch后的文件为LF，strictEqual显示return JSX行尾差异。仅统一比较输入的换行后复查PASS；没有改动业务来消除失败。功能/类型用例均未失败；依赖未变，不install。

## Final validation
- PASS `npm.cmd --prefix electron run verify:integration`：因验证白名单/地图接入涉及开发配置，按策略运行完整离线组；27步骤、20个专项、14组开发工具测试，21.145s，Main仅构建1次。包含两项typecheck、AST/地图/尺寸检查、全部FAST步骤及新专项。
- 新专项在本轮集成内用时0.644s；仅检查49行模块及其直接类型，不声称覆盖全Renderer类型系统。
- 既有Electron环境stderr仍可见：`Failed to decrypt (0x8009000B)`及部分`GPU process exited unexpectedly: exit_code=-1073741515`；专项均exit 0，不视作真实成品UI通过。
- NOT RUN：Renderer/Runtime生产构建、成品CDP/人工UI；PENDING：真实设备与联网验收。任务不改JSX/状态和Runtime行为，无新增产品依赖。
- PASS `node scripts/dev/context.cjs desktop-shell --focus task-history`与`node scripts/dev/check-knowledge.cjs`：新模块/相关只读依赖/专项可定位，归档链接有效。
- Review：新增模块没有React/IPC/网络/时间或持久化依赖；只引入原Renderer RuntimeEvent类型。既有三个状态/异步相关函数不迁移，没有新增Task Engine。

## Git
一致性复查完整命令（只读git/source；CRLF归一化，不改源码）：

```powershell
@'
const fs = require('fs'), ts = require('./electron/node_modules/typescript');
const cp = require('child_process'), assert = require('assert/strict');
const file = 'electron/src/renderer/components/BrowserPanel.tsx';
const normalize = text => text.replace(/\r\n/g, '\n');
const parse = (name, body) => ts.createSourceFile(name, normalize(body), ts.ScriptTarget.Latest, true);
const before = parse(file, cp.execFileSync('git', ['show', 'abd3dbf9:' + file], { encoding: 'utf8' }));
const after = parse(file, fs.readFileSync(file, 'utf8'));
const helperPath = 'electron/src/renderer/components/task-manager/task-history.ts';
const helper = parse(helperPath, fs.readFileSync(helperPath, 'utf8'));
const names = ['TaskHistoryItem', 'mergeRuntimeEventWindow', 'taskHistoryFromEvents'];
for (const name of names) {
  const old = before.statements.find(n => n.name?.text === name);
  const next = helper.statements.find(n => n.name?.text === name);
  assert.equal(next.getText(helper).replace(/^export /, ''), old.getText(before), name);
}
const oldRest = ts.factory.updateSourceFile(before, before.statements.filter(n => !names.includes(n.name?.text)));
const newRest = ts.factory.updateSourceFile(after, after.statements.filter(n => !(ts.isImportDeclaration(n) && n.moduleSpecifier.text === './task-manager/task-history')));
const printer = ts.createPrinter();
assert.equal(normalize(printer.printFile(oldRest)), normalize(printer.printFile(newRest)));
console.log('PASS: declarations and remaining component are identical after CRLF/LF normalization');
'@ | node
```

`git branch backup/pre-phase-task-history-20260915 HEAD` → `git push origin backup/pre-phase-task-history-20260915` → `git ls-remote --heads origin backup/pre-phase-task-history-20260915`：PASS，完整hash与abd3dbf9258328632439d20d10ac5a0f57e0bb9d一致。
`git ls-remote --heads origin DWIDE` 开工与本地HEAD一致。完成时精确暂存并review staged diff，commit/push origin DWIDE后比较git rev-parse HEAD与ls-remote hash；本提交不写入自身hash。
用户docs/tutorials、electron/radio、hello_world_esp32s3/.catnip三个未跟踪目录不stage、不修改；未worktree/stash/reset/clean/force-push。
