# TASK-DESKTOP-003 — Extract Build / Flash task controls
Lifecycle: ARCHIVED
Status: complete
Owner: Development Agent
Mode: Maintenance

## Intent
从BrowserPanel提取任务管理器顶部的Build / Flash控制展示，使控制区UI修改不需要读取Browser、Serial、Editor和任务历史实现。
## Target Modules
desktop-shell；dev-infrastructure（路由/验证）。2个产品源码文件，0跨层，0新依赖。
## Allowed Write Scope
BrowserPanel.tsx、components/task-manager/TaskControlsPanel.tsx；专项验证、desktop-shell路由/Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
Renderer的HardboardDevice/HardboardRuntimeState类型、既有任务控制样式、Product Truth的当前工程和真实Build/Flash证据规则。
## Forbidden Scope
Build/Flash执行、Runtime事件/状态权威、工程切换门禁、端口选择权威、Serial、任务历史、Explore、Editor、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md)第17–21、65–72行：当前工程必须显式选择；Build/Flash成功必须来自真实Hardboard结果。
## Relevant Contracts
[Desktop Shell](../../modules/desktop-shell/CONTRACT.md)；不触及Runtime或project-session接口实现。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
BrowserPanel的`task-manager-compile` JSX；新组件接收版本标签、工程/设备/状态、父回调，不读取electronAPI。
## Relevant Tests
严格TSX、无工程/无端口/运行状态、进度clamp、回调与原对象；父文件反向还原；task history回归；配置变化后INTEGRATION。
## Invariants
父组件继续持有Build/Flash调用、工程门禁和双端口状态同步；按钮disabled与状态文案不变；子组件无IPC、state、effect或执行逻辑。
## Acceptance Criteria
父组件除TaskControlsPanel/import外不变；task-controls-ui focus直接定位；专项/集成通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_task_controls_panel.cjs --parent-ref=ff5ddd33...`；`node scripts/dev/context.cjs desktop-shell --focus task-controls-ui`；`npm.cmd --prefix electron run verify:integration`。
## Rollback Point
ff5ddd33a248af5cab2e303dd0f24498ae3c5601；backup/pre-phase-task-controls-view-20260916已推origin并核hash一致。
## Risks
按钮门禁、端口回调、进度或状态文案接线变化。若需修改Runtime状态或执行函数则停止并另开Task。
## Explicit Exclusions
不改产品需求/Runtime Agent，不生产构建、打包、真实Build/Flash、网络或硬件。
