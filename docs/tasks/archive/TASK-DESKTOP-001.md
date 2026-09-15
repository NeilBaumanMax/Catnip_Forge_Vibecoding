# TASK-DESKTOP-001 — Extract task history projection
Lifecycle: ARCHIVED · Status: completed · Mode: Maintenance · 2026-09-15

## Intent
继续首次治理后的有界拆分：将BrowserPanel的事件合并/任务历史投影提取，保持产品行为。
## Target Modules
desktop-shell；开发验证接入属于dev-infrastructure配套。2模块、0跨层接口、2个产品源码文件、0新依赖。
## Allowed Write Scope
electron/src/renderer/components/BrowserPanel.tsx；新增components/task-manager/task-history.ts；对应electron/scripts专项与package别名；scripts/dev验证白名单/测试；project-map与维护基线；Task/evidence/CURRENT/相关契约和热点引用。
## Read-only Dependencies
renderer/types/index.ts里的RuntimeEvent类型；BrowserPanel调用点/工程过滤/清空generation；原Layer条款。无须加载完整Main/Worker/Runtime。
## Forbidden Scope
App、ExplorePanel、orchestrator、Main/Runtime产品源码；IPC/数据格式/权限/凭据/样式布局；用户三处未跟踪目录。
## Relevant Product Truth
[§1工程与任务证据隔离、§5真实验证](../../product/PRODUCT_REQUIREMENTS.md)。
## Relevant Contracts
[desktop-shell](../../modules/desktop-shell/CONTRACT.md)、[维护规则](../../architecture/MAINTAINABILITY.md)；Layer §5/9的事件归属、工程切换。
## Relevant ADRs
[ADR-0002](../../decisions/ADR-0002-development-verification.md)：模块验证无重复Main构建；没有新增产品架构决定。
## Relevant Source Files
BrowserPanel中的TaskHistoryItem、mergeRuntimeEventWindow、taskHistoryFromEvents；只读使用点availableRuntimeEvents、轮询setRuntimeEvents、taskHistory。
## Relevant Tests
先用相同特征用例验证提取前两个函数，再验证提取后模块。覆盖重复ID覆盖、time/seq排序、500条上限、不变输入、任务状态/回退字段、无效payload、同任务更新顺序和列表排序。
新增模块严格类型检查；使用现有TypeScript内存编译执行纯函数测试，无新包、无旧dist依赖。
## Invariants
函数体与返回语义保持；调用处和状态所有权不变；不把Renderer路径过滤当Main安全边界；不改任何执行/清空/异步竞态行为。
## Acceptance Criteria
BrowserPanel减少约50行；提取前后同组用例通过；新模块由地图定位与选测；新源码严格typecheck；FAST/相关回归通过；精确提交/push/核hash。
## Validation Commands
npm.cmd --prefix electron run verify:fast；新verify:task-history；verify:changed -- --plan --files 新源码；具体命令与首次结果见[evidence](../../testing/evidence/TASK-DESKTOP-001.md)。
## Rollback Point
backup/pre-phase-task-history-20260915 → abd3dbf9258328632439d20d10ac5a0f57e0bb9d；本任务可独立revert，不reset/stash。
## Risks
现有“后出现任务快照覆盖前者”等语义可能不是理想设计，本轮按事实保留；发现需改变行为则另拆任务。
## Explicit Exclusions
不补全Renderer类型系统、不修启动Key边界、不拆状态/hooks、不运行成品CDP、production build、真实网络或硬件。
