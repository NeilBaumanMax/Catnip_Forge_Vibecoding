# TASK-EXPLORE-006 Evidence
Lifecycle: ACTIVE · Task evidence · 2026-09-15

## Preflight / scope
- DWIDE；HEAD/origin/DWIDE=`253d96aab4e9bdffe3afe81c5af624f4adc71a75`；tracking origin/DWIDE。
- 工作区仅用户未跟踪docs/tutorials/、electron/radio/、hello_world_esp32s3/.catnip/；绕开且不暂存。
- backup/pre-phase-explore-empty-ui-20260915已推origin并核hash一致。
- 选择输出初始空态纯展示；状态机、结果、计划、artifact和执行确认均不动。依赖/lock不变，不install。

## Validation
- `node electron/scripts/verify_explore_output_empty_state.cjs --parent-ref=253d96aab4e9bdffe3afe81c5af624f4adc71a75`：首次FAIL，仓库根执行时无法解析Electron内Vite图片声明；显式把既有`electron/node_modules/vite/client.d.ts`加入专项program后PASS，3组双模式文案/插图/无控件、严格TSX、父文件精确反向还原，零Main构建。
- `node electron/scripts/verify_explore_ui.cjs`：PASS，既有Explore静态契约保持。
- `node scripts/dev/context.cjs explore --focus empty-ui`：PASS，仅路由5份入口/契约文档、4个目标资源、1个只读父文件和2个局部测试。
- `node scripts/dev/check-knowledge.cjs`：PASS，17模块、17 Contract、101个映射源码。
- `node scripts/dev/check-maintainability.cjs`：PASS；ExplorePanel 1486行，baseline 1486，growth 0。
- `node --test scripts/dev/verification.test.cjs scripts/dev/guardrails.test.cjs`：首次FAIL，纯Explore视觉资源变更未明确要求隔离layout evidence；changed routing增加Explore styles/assets保守要求后PASS 20/20。
- `npm.cmd --prefix electron run verify:explore-layout-ui`：PASS，21.198s；双模式插图/说明/结果分类及三组150%布局正常，`consoleErrors=[]`；人工检查idea/diagnosis截图未见回归。退出后临时Chromium profile清理报告Windows EPERM，不影响断言、退出码或仓库文件。
- `npm.cmd --prefix electron run verify:integration`：PASS 33/33，28.255s；Main只构建一次；新增专项1.133s。
- 隔离Electron子进程仍输出已知`os_crypt`/GPU stderr，所有最终行为断言与退出码通过。

## Metrics / scope result
- `ExplorePanel.tsx`：1535 → 1486（本Task -49）；从首次热点基线1761 → 1486，累计 -275（约15.6%）。
- 新`ExploreOutputEmptyState.tsx`：65行，无状态、回调或IPC；空态专用插图/图标依赖移出父文件。
- 依赖/lockfile：不变；未运行install。
- Production renderer/runtime build、packaging、packaged first run：NOT RUN（RELEASE范围）。
- Real network / real hardware：PENDING。

## Repair / rollback decision
两次失败分别为专项类型声明入口和changed视觉证据要求，根因明确、修复局部且提高保守覆盖，因此继续Repair。最终验证通过，无需Rollback。
