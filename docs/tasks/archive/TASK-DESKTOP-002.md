# TASK-DESKTOP-002 — Extract task history panel presentation
Lifecycle: ARCHIVED
Status: complete
Owner: Development Agent
Mode: Maintenance

## Intent
从BrowserPanel提取“最近任务与结果”表格，令任务历史UI修改不需要读取Browser/Serial/Editor等无关组合代码。
## Target Modules
desktop-shell；dev-infrastructure（路由/验证）。2个产品源码文件，0跨层，0依赖。
## Allowed Write Scope
BrowserPanel.tsx、components/task-manager/TaskHistoryPanel.tsx；专项验证、desktop-shell路由/Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
task-history.ts 的 `TaskHistoryItem`；既有样式和task history投影专项；任务管理器现有UI验证。
## Forbidden Scope
Runtime事件订阅/清理、日志定位、失败分析/Explore跳转、Build/Flash、Browser Workbench、Serial、Editor、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md)：Build/Flash/运行状态必须基于真实事件证据，失败记录可交给解问题流程分析。
## Relevant Contracts
[Desktop Shell](../../modules/desktop-shell/CONTRACT.md)；不触及跨层接口或frozen browser-workbench。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
BrowserPanel的`task-history-panel` JSX；新组件接收投影列表、清理状态/反馈、格式化函数及查看/分析/清理回调。
## Relevant Tests
严格TSX、空态/列表/失败分析/清理状态/回调、父文件反向还原；现有task-history投影；相关UI静态/隔离验证；配置变化后INTEGRATION。
## Invariants
列表顺序由父投影决定；仅failed显示分析；清理/查看/分析逻辑仍在父组件；空态插图/三步骤不变；子组件无IPC/状态/副作用。
## Acceptance Criteria
父组件除TaskHistoryPanel/import/专用插图不变；task-history-ui focus直接定位；专项/集成通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_task_history_panel.cjs --parent-ref=6c14830f...`；`node electron/scripts/verify_task_history.cjs`；相关UI验证；`npm.cmd --prefix electron run verify:integration`。
## Rollback Point
6c14830fbf56ee55bef4009db9a4730980a9625f；backup/pre-phase-task-history-view-20260915已推origin并核hash一致。
## Risks
状态标签、失败分析按钮或清理反馈接线变化。若需改事件投影/Runtime清理则停止并另开Task。
## Explicit Exclusions
不改产品需求/Runtime Agent，不生产构建/打包/网络/硬件。
