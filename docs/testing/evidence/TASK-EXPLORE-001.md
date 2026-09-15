# TASK-EXPLORE-001 Evidence
Lifecycle: ARCHIVED · Task evidence · 2026-09-15

## Preflight / scope
- DWIDE；HEAD/origin/DWIDE = 6d591883f421fbb39588beeace85a9556dc2bf35；tracking origin/DWIDE。
- `git status --short`：仅用户未跟踪 docs/tutorials/、electron/radio/、runtime/hardboard/projects/hello_world_esp32s3/.catnip/；保留并排除暂存。
- `git branch backup/pre-phase-explore-history-20260915 HEAD`、`git push origin backup/pre-phase-explore-history-20260915`、`git ls-remote origin refs/heads/backup/pre-phase-explore-history-20260915 refs/heads/DWIDE`：PASS，两个远端 hash 均等于 HEAD。
- 先记录原 JSX 渲染/交互；状态/异步/持久化/样式不在写入范围。依赖已存在，只新增 script alias 无依赖变化，无需 install。

## First failure / repair decision
`npm.cmd --prefix electron run verify:integration` 首次 FAIL（5.830s）。类型、地图、架构和维护检查已 PASS；15 组开发工具测试中 14 PASS，新增路由断言失败。runner 按规则停止，Main build 与后续 21 个专项 NOT RUN。
stderr 关键原文：
```text
test at scripts\dev\verification.test.cjs:74:1
history UI routes to its component regression without building Main or launching a browser
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  [
+   'desktop-shell',
    'explore'
  ]
at TestContext.<anonymous> (scripts\dev\verification.test.cjs:77:10)
actual: [ 'desktop-shell', 'explore' ], expected: [ 'explore' ]
```
根因：新测试错误假定 `explore.less` 只归属 Explore；既有 Desktop Shell 的通配样式路径同样匹配。产品和路由无问题。Repair：只修测试，分别断言新组件归属 Explore、含共享样式的集合保守归属两个模块；不缩小路由/不改业务。局部且根因明确，无需回滚或扩大 Task。

## Validation

| Command / scope | Status | Result |
| --- | --- | --- |
| `node electron/scripts/verify_explore_history.cjs electron/.tmp/explore-history-baseline.tsx electron/.tmp/explore-history-before.json` | PASS | 修改产品前从原 JSX 建立隔离 wrapper，5 组特征用例及严格类型检查 |
| `node electron/scripts/verify_explore_history.cjs electron/src/renderer/components/explore/ExploreSessionHistory.tsx electron/.tmp/explore-history-after.json` | PASS | 相同 5 组用例；4 份 SSR HTML 与 before JSON deepEqual |
| `node electron/scripts/verify_explore_history_browser.cjs electron/.tmp/explore-history-baseline.tsx before` | PASS | 从基线保留的原 JSX；独立浏览器 |
| `node electron/scripts/verify_explore_history_browser.cjs electron/src/renderer/components/explore/ExploreSessionHistory.tsx after` | PASS | 两种宽度、autoFocus、输入/Enter、取消/删除、保存禁用、空列表/新建；无 pageerror |
| `npm.cmd --prefix electron run verify:integration`（修正测试后） | PASS | 28 步，18.855s，Main 只编译 1 次；15 组开发工具测试及 21 个离线专项 |
| `node scripts/dev/context.cjs explore --focus history-ui` | PASS | 直接定位新展示组件/相关样式；父组件/公共类型仅按符号只读 |
| `changedPlan([新组件, 'electron/package.json'])`（Node 调用既有 runner） | PASS | 升级 INTEGRATION、28 步、1 Main build；显式列浏览器与 RELEASE review requirements |
| 局部 ExplorePanel browser bundle（下方命令） | PASS | 父组件与新导入解析成功，write:false；不生成生产 dist |
| 全仓 Renderer strict / production builds / packaging / 产品成品人工体验 | NOT RUN | 本次严格类型检查只覆盖新组件及直接类型依赖；非 RELEASE 任务 |
| 真实外网 / 硬件 | PENDING | 不以受控 UI 夹具或离线测试冒充真实产品闭环 |

浏览器命令在仓库根目录运行，先设置已有浏览器；无安装、无产品 CDP、所有页面网络请求拒绝：
```powershell
$env:CATNIP_TEST_CHROMIUM = Join-Path (Get-Location) 'electron/dist-package/Catnip Forge/resources/runtime/playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
```
浏览器夹具用现有 React/ReactDOM、Runtime Playwright、Less 与 Vite 自带 esbuild；父状态使用 mock，只证明展示/回调协议，不证明 Main 持久化。持久化/项目隔离由既有 `verify:explore-session` / `verify:project-session` 提供离线证据。

局部导入/bundle 验证，PowerShell here-string 传给 Node（单个浏览器入口，非 Renderer production build）：
```js
const { createRequire } = require('module');
const req = createRequire(require('path').resolve('electron/node_modules/vite/package.json'));
req('esbuild').build({
  entryPoints: ['electron/src/renderer/components/ExplorePanel.tsx'],
  bundle: true, write: false, platform: 'browser', loader: { '.png': 'dataurl' }, logLevel: 'warning',
}).then(r => console.log(r.outputFiles[0].contents.length))
  .catch(e => { console.error(e); process.exitCode = 1; });
```

## Equivalence / visual evidence
- 基线：6d591883 的 ExplorePanel。TypeScript AST 定位 className=explore-session-history 的 JSX，用原作用域名建立临时受控 wrapper；仅缩进/类型 import 路径适配，原 JSX 保留。
- 一次性源文件比较：将新父组件的 `<ExploreSessionHistory ... />` 换回基线 section，恢复 History import、移除子组件 import；统一 CRLF 后整份父文件逐字相等。另逐项断言 props 名等于传入的原局部变量名。PASS：状态、异步处理、共享标签函数、门禁及相邻 UI 没有改动。
- 原/新渲染 JSON 四种状态（empty/history/rename/saving）逐值相等。日期在同一环境比较，避免跨机器 locale 差异。
- 原/新 Chromium 截图三组 PNG 字节完全相等；查看宽图与保存态图，列表/按钮/输入无新错位。实际产品全局壳没有在隔离夹具中启动，不能把局部对照称作完整成品视觉验收。
- 本地截图位于 `electron/.tmp/explore-history-{before,after}-{1280,720,saving}.png`（忽略产物，不纳入 Git）。对应 before/after 共同 SHA-256：
  - 1280×960：`1b540715d335274e5bdffdfb379e1284c651af0032fbf3475286b268baa0b296`
  - 720×960：`92c60068e8504416022045c5f9197209035f79518253a25af40d94661ab300aa`
  - 保存中：`edb7990e896ff9892e84f530f34141727891cdff069916c1434960f40aac761f`
- 需要复查历史对照时按上方基线从 Git 提取原 JSX；不永久维护第二份旧产品实现。新组件的 SSR/浏览器专项可独立重跑。

## Non-fatal stderr / limits
若干 Electron 离线专项 stdout 断言 PASS、exit=0，同时输出：
```text
ERROR:os_crypt_win.cc(100) Failed to decrypt: 该项不适于在指定状态下使用。 (0x8009000B)
ERROR:gpu_process_host.cc(982) GPU process exited unexpectedly: exit_code=-1073741515
```
本次未定位这两项环境诊断的根因；不为消除 stderr 改产品。离线断言与独立 Chromium 通过不能证明已解决历史 Workbench GPU 问题或凭据相关真实流程。现状限制继续由 CURRENT 指向。

## Metrics / review
- ExplorePanel：1761→1731 行；新展示组件 69 行（包含显式类型/边界）。实际减少的是后续历史 UI 的默认源码阅读范围，不把类型声明增加的行数隐藏掉。
- 2 个产品源码文件、0 跨层接口变化、0 新依赖；原 npm 命令字符串兼容测试 PASS。
- 历史 UI focus：目标组件从 1761 行父文件到 69 行局部组件；不再默认推荐读取 Main session，确实改变持久化时才升级。全局默认文档集合没有增加。
- 历史专项严格类型＋5组特征：集成中 0.959s，0 Main build；完整 INTEGRATION 18.855s，1 Main build。不同轮耗时仅是本机观测，不作跨机器性能承诺。
- 地图/Contract 仍为17模块；96个产品文件受4项AST规则覆盖；ExplorePanel 仍受禁止新增大块业务的增长审查。
- RELEASE requirement 人工审查：package.json 仅加测试 alias、锁文件和依赖未变；本次无需生产构建/打包。
- staged review 范围：仅本 Task 的2个产品文件、测试/路由及规范要求的状态/证据；不包含临时夹具、截图、用户未跟踪目录。commit/push/远端验证在交付时报告，以 Git 为提交真相。
