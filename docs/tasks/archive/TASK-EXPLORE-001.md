# TASK-EXPLORE-001 — Extract Explore history presentation
Lifecycle: ARCHIVED
Status: completed
Owner: Development Agent
Mode: Maintenance

## Intent
继续已授权的小步热点拆分，让历史列表 UI 修改只需读取局部展示组件。
## Target Modules
explore；dev-infrastructure（局部验证与导航）。2 个产品源码文件，0 跨层边界，0 新依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExploreSessionHistory.tsx；专项测试、package script/离线组、project-map/对应路由测试、Explore Contract、维护尺寸、当前状态及本 Task/evidence。
## Read-only Dependencies
common/project-session.ts 的 Summary/Status 类型、explore.less、现有 React/lucide；原状态标签函数仍由父组件复用。
## Forbidden Scope
Main/Worker/Runtime、异步会话处理、持久化、门禁、CSS/布局设计、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) §1 工程隔离与可恢复的多历史；不复制需求。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)、[Dev Infrastructure](../../modules/dev-infrastructure/CONTRACT.md)；[Layer](../../construction/LAYER_CONTRACT.md) Renderer、跨层不变量 9/10。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel 的 explore-session-history JSX 与 workStatusLabel；提取后由受控 props 传递既有值/回调，不移动状态或 IPC。
## Relevant Tests
FAST 静态 UI；专项严格 TSX/渲染/回调特征测试；独立浏览器展示与交互；验证配置调整后跑离线 INTEGRATION。
## Invariants
列表顺序与最多 12 条、两种模式、状态/日期、重命名表单、保存中禁用、创建/恢复/删除参数不变；状态/异步生命周期仍由父组件持有。
## Acceptance Criteria
先在原 JSX 上确认行为，再对提取组件复测；原组件除 section/import 不变；路由直接到局部组件；无产品依赖变化；精确 review/commit/push/核 hash。
## Validation Commands
`node electron/scripts/verify_explore_history.cjs`；`npm.cmd --prefix electron run verify:integration`；`node scripts/dev/context.cjs explore --focus history-ui`；独立浏览器命令和结果见 [evidence](../../testing/evidence/TASK-EXPLORE-001.md)。
## Rollback Point
6d591883f421fbb39588beeace85a9556dc2bf35；backup/pre-phase-explore-history-20260915 已推 origin 且远端核 hash 一致。必要时撤回本次局部提交，不 reset 用户工作。
## Risks
JSX 替换遗漏回调、受控输入/焦点改变、静态测试仍读旧路径。以原渲染与交互特征定位；涉及会话模型则另开 Task，不扩大本次修复。
## Explicit Exclusions
不更改产品 Runtime Agent，不全仓 TSX 治理，不生产构建/打包/实机，不连接用户运行中的 App。

## Outcome
ExplorePanel 1761→1731行；历史展示独立为69行组件。5组原/新特征、4份HTML、3组浏览器截图与交互对照通过；集成28步18.855s、Main构建一次。新增路由测试首次预期过窄，局部修正后15组工具测试全部通过。完整命令/限制/证据只维护[任务 evidence](../../testing/evidence/TASK-EXPLORE-001.md)。后续纯列表UI从history-ui focus进入；持久化/订阅需另开Task。
