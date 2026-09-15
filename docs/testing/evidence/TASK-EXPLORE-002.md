# TASK-EXPLORE-002 Evidence
Lifecycle: ARCHIVED · Task evidence · 2026-09-15

## Preflight / scope
- DWIDE；HEAD/origin/DWIDE=`e9432a40573c71614cde44c2c48cef146db7bec2`；tracking origin/DWIDE。
- 工作区仅有用户未跟踪的docs/tutorials/、electron/radio/、hello_world_esp32s3/.catnip/；绕开且不暂存。
- backup/pre-phase-explore-knowledge-20260915已推origin；备份、DWIDE与HEAD哈希一致。
- 本Task仅移动Renderer展示职责；依赖/lockfile不变，不运行install。

## Validation

| Command / scope | Status | Result |
| --- | --- | --- |
| `node electron/scripts/verify_explore_knowledge_preview.cjs --panel --output=electron/.tmp/explore-knowledge-before.json` | PASS | 修改产品前从原JSX建立虚拟组件；严格TSX与5组条件渲染/回调特征 |
| `node electron/scripts/verify_explore_knowledge_preview.cjs electron/src/renderer/components/explore/ExploreKnowledgePreview.tsx --output=electron/.tmp/explore-knowledge-after.json` | PASS | 同5组；empty/cards/expanded/verification SSR快照与before deepEqual |
| `node electron/scripts/verify_explore_knowledge_preview.cjs --parent-ref=e9432a40573c71614cde44c2c48cef146db7bec2` | PASS | 反向恢复section/import后父文件与回滚点逐字相等；所有prop直接转发同名父变量 |
| 独立Chromium原/新两轮（下方命令） | PASS | 1280/720、展开/收起、来源/删除、验证输入和保存中禁用、空态；无pageerror |
| `node electron/scripts/verify_explore_ui.cjs` | PASS | 原静态契约改为同时验证父持久化接线和子展示协议 |
| `node scripts/dev/context.cjs explore --focus knowledge-ui` | PASS | 目标源码仅局部组件+样式；父组件/类型为只读依赖 |
| `node --test scripts/dev/verification.test.cjs scripts/dev/guardrails.test.cjs` | PASS | 16组；新增focus/保守共享样式路由/无Main build/显式浏览器要求 |
| `node scripts/dev/check-knowledge.cjs` / `check-architecture.cjs` | PASS | 17模块/17契约/97映射产品文件；4项规则扫描97文件 |
| `npm.cmd --prefix electron run verify:integration` | PASS | 29步，20.233s；Main只编译一次，全部已审离线专项通过 |
| 全仓Renderer strict / production build / packaging / 成品人工体验 | NOT RUN | 严格类型仅覆盖新组件及直接类型；本次不是RELEASE |
| 外网/真实硬件 | PENDING | 局部展示测试不替代LIVE_DIAGNOSIS/REAL_HARDWARE验证 |

浏览器使用仓库已有Chromium，不下载、不连接产品CDP，页面请求全部abort：
```powershell
$env:CATNIP_TEST_CHROMIUM = Join-Path (Get-Location) 'electron/dist-package/Catnip Forge/resources/runtime/playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
node electron/scripts/verify_explore_knowledge_preview_browser.cjs --panel --panel-ref=e9432a40573c71614cde44c2c48cef146db7bec2 --label=before
node electron/scripts/verify_explore_knowledge_preview_browser.cjs electron/src/renderer/components/explore/ExploreKnowledgePreview.tsx --label=after
```

## First failure / repair decision
`node electron/scripts/verify_explore_knowledge_preview_browser.cjs --panel --label=before` 首次 FAIL：`original knowledge preview missing`。根因是提取后的工作区 ExplorePanel 已只保留子组件调用，浏览器脚本的 `--panel` 错读当前工作区；产品组件的严格TSX/5组特征和原/新SSR等价此前均PASS。Repair仅让浏览器基线支持 `--panel-ref=<rollback>` 并通过`git show`读取明确回滚点，不修改产品行为或缩小断言。完整stderr关键项：
```text
[plugin knowledge-preview] original knowledge preview missing
Error: Build failed with 1 error
```

`node electron/scripts/verify_explore_knowledge_preview.cjs --parent-ref=e9432a...` 首次 FAIL：参数解析把首个选项误当源码路径，报 `ENOENT ... --parent-ref=...`，未执行产品断言。Repair：源码参数只接受不以`--`开头的参数；选项独立解析。属于专项脚本局部根因。

## Equivalence / visual evidence
- Chromium before显式读取Git回滚点中的原section，after读取新组件；同一React状态夹具与CSS。
- 三组before/after PNG逐字节相同并人工查看宽图、验证表单图；本地 `.tmp` 产物不提交：
  - 1280×960：`b09a00e9c1914996ee310019dca096fc85c5e6244f06993dfe3466b97fda26f1`
  - 720×960：`aa793cb5baf2e8d6bfc4c9cc3a4e50d685817627b517aa94797e7d240228e372`
  - verification：`429cefb253bbcf6e1974ed6eae05c7de59c94b823e00b3d7043b456b0a2400e8`
- 隔离夹具证明展示/受控回调，不证明Main知识存储。已有`verify:explore-knowledge`与`verify:project-session`在集成中PASS，分别覆盖存储选择门禁与工程隔离。

## Non-fatal stderr / limits
Electron离线专项断言PASS、exit=0，仍输出既有`os_crypt_win.cc Failed to decrypt (0x8009000B)`及部分`gpu_process_host ... -1073741515`。本Task不改凭据或GPU行为，不能把局部Chromium通过解释为历史Workbench问题已解决。

## Metrics / review
- ExplorePanel：1731→1676行；新受控组件106行。相对首次热点基线1761行累计减少85行。
- knowledge-ui目标源码从1676行父组件缩至106行组件（另加载共享样式）；父组件和common类型只读。不默认读取Main知识存储。
- 2个产品源码文件、0跨层、0依赖；父组件仍持有知识列表、展开/验证状态、IPC/open/delete/save函数与共享状态标签。
- 局部专项在集成中1.179s、0 Main build；完整离线集成20.233s、1 Main build。
- 测试配置变化触发INTEGRATION；package.json只增加验证别名，lockfile未变。RELEASE要求已人工审查，本Task无需生产构建/打包。
- 用户未跟踪目录、`.tmp`截图和基线JSON不纳入提交。commit/push/远端hash以最终Git结果为准。
