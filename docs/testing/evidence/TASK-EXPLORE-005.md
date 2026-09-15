# TASK-EXPLORE-005 Evidence
Lifecycle: ACTIVE · Task evidence · 2026-09-15

## Preflight / scope
- DWIDE；HEAD/origin/DWIDE=`475a2dc4410d1c3e3967793273fb9e81058acfb2`；tracking origin/DWIDE。
- 工作区仅用户未跟踪docs/tutorials/、electron/radio/、hello_world_esp32s3/.catnip/；绕开且不暂存。
- backup/pre-phase-explore-connection-ui-20260915已推origin并核hash一致。
- 选择connectionBadge纯展示；安装、Secret安全窗口、轮询和自动弹窗留在父/Main。依赖/lock不变，不install。

## Validation
- `node electron/scripts/verify_explore_connection_status.cjs --parent-ref=475a2dc4410d1c3e3967793273fb9e81058acfb2`：首次 FAIL，反向还原只捕获 `connectionBadge`，遗漏同时迁移的两个派生常量；修正测试定位后 PASS，5组状态/按钮/步骤/回调、严格TSX、父文件精确反向还原，零Main构建。
- `node electron/scripts/verify_explore_ui.cjs`：首次 FAIL，旧契约仍从父文件读取已迁移文案；改为从新展示组件读取后 PASS。父文件IPC/自动弹窗断言未移动。
- `node scripts/dev/context.cjs explore --focus connection-ui`：PASS，仅路由5份入口/契约文档、2个目标源码、2个只读依赖和3个相关测试。
- `node scripts/dev/check-knowledge.cjs`：PASS，17模块、17 Contract、100个映射源码。
- `node scripts/dev/check-maintainability.cjs`：PASS；ExplorePanel 1535行，baseline 1535，growth 0。
- `node --test scripts/dev/verification.test.cjs scripts/dev/guardrails.test.cjs`：PASS，19/19。
- `npm.cmd --prefix electron run verify:explore-layout-ui`：PASS，20.513s；连接卡仍在首页Hero内，连接状态/重新检查入口和缩放布局正常，`consoleErrors=[]`；人工检查首页截图未见回归。退出后临时Chromium profile清理报告Windows EPERM，不影响断言、退出码或仓库文件。
- `npm.cmd --prefix electron run verify:integration`：首次在 `verify:explore-zhihu-connection` FAIL；既有专项仍从父文件找迁移文案，前15项PASS、后续fail-fast未运行。仅更新专项读取路径并保留父IPC/自动弹窗断言；复跑PASS 32/32，23.507s，Main只构建一次；新增专项0.807s。
- 隔离Electron子进程仍输出已知 `os_crypt`/GPU stderr，所有最终行为断言与退出码通过。

## Metrics / scope result
- `ExplorePanel.tsx`：1575 → 1535（本Task -40）；从首次热点基线1761 → 1535，累计 -226（约12.8%）。
- 新 `ExploreConnectionStatus.tsx`：67行，无本地状态、IPC、Secret输入、安装实现或自动弹窗逻辑。
- 依赖/lockfile：不变；未运行install。
- Production renderer/runtime build、packaging、packaged first run：NOT RUN（RELEASE范围）。
- Real network / real hardware：PENDING。

## Repair / rollback decision
两次失败均为文案迁移后的测试读取路径，根因明确、修复只触及本Task专项，不改变业务或安全不变量，因此继续Repair。最终验证通过，无需Rollback。
