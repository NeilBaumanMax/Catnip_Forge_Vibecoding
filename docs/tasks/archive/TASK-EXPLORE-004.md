# TASK-EXPLORE-004 — Extract read-only Explore plan view
Lifecycle: ARCHIVED
Status: complete
Owner: Development Agent
Mode: Maintenance

## Intent
提取Explore只读执行计划展示，缩小计划UI任务上下文，同时保持交接写入与执行确认边界不动。
## Target Modules
explore；dev-infrastructure（路由/验证）。2个产品源码文件，0跨层，0依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExplorePlanView.tsx；紧凑专项、npm/离线组、project-map/路由测试、Explore Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
common/explore.ts的Plan/Handoff类型、common/project-session.ts的artifact摘要类型、explore.less；现有隔离layout测试。
## Forbidden Scope
artifact文件编辑/open/write IPC、confirmExecution、Main/Worker一次性授权、分析/计划请求、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) 第三阶段生成只读计划、第四阶段重新读取磁盘材料且用户明确确认后执行。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)、[Dev Infrastructure](../../modules/dev-infrastructure/CONTRACT.md)；[Layer](../../construction/LAYER_CONTRACT.md)不变量2及磁盘artifact确认约束。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel的planView声明；新组件只接收pending/result/handoff/artifact摘要、请求文本和“查看材料”回调。
## Relevant Tests
严格TSX/选择优先级/进度/步骤/风险/按钮回调；父文件反向还原；Explore静态契约；现有隔离layout；配置变化后INTEGRATION。
## Invariants
确认前只读；pending安全文案不变；selectedIdea→diagnosis→requestText回退顺序不变；步骤/风险顺序不变；无artifact不能查看；子组件不出现electronAPI、文件写入或confirmExecution。
## Acceptance Criteria
父组件除planView/import不变；局部组件无状态/IPC；plan-ui focus直接定位；隔离UI/集成通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_explore_plan_view.cjs --parent-ref=3762c9c9...`；`npm.cmd --prefix electron run verify:explore-layout-ui`；`npm.cmd --prefix electron run verify:integration`；context focus。
## Rollback Point
3762c9c9d232a42a8b3c00c690ba34eda37713b1；backup/pre-phase-explore-plan-view-20260915已推origin并核hash一致。
## Risks
回退标题、pending分支、artifact按钮接线变化。若需触及文件编辑或执行授权则停止并另开Task。
## Explicit Exclusions
交接材料编辑和执行确认本轮明确不拆；不改产品需求/Runtime Agent，不生产构建/打包/网络/硬件。

## Outcome
`ExplorePlanView.tsx` 承接 67 行只读计划展示；`ExplorePanel.tsx` 从 1613 降至 1575 行。artifact 文件 I/O、磁盘重读与 `confirmExecution` 留在原边界。局部、独立 UI 与 31 项集成验证通过，详见 [evidence](../../testing/evidence/TASK-EXPLORE-004.md)。
