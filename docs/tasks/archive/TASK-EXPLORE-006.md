# TASK-EXPLORE-006 — Extract Explore output empty states
Lifecycle: ARCHIVED
Status: complete
Owner: Development Agent
Mode: Maintenance

## Intent
提取找灵感/解问题输出区的初始说明画面，缩小纯视觉空态任务上下文并减少ExplorePanel展示职责。
## Target Modules
explore；dev-infrastructure（路由/验证）。2个产品源码文件，0跨层，0依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExploreOutputEmptyState.tsx；专项验证、Explore聚合、project-map focus、Explore Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
explore.less、两张既有workspace插图、现有Explore静态与隔离layout测试。
## Forbidden Scope
状态机、分析请求/结果、计划/artifact/执行确认、连接、会话持久化、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) §3/4：找灵感展示真实讨论到可执行方向；解问题结合工程证据、社区经验与外部资料。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)；不触及跨层接口。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel输出区 `displayStage === 'describe'` 的idea/diagnosis空态；新组件只接收mode并拥有对应插图/图标。
## Relevant Tests
严格TSX、两种mode文案/插图/结构、父文件反向还原；Explore静态契约、隔离layout；配置变化后INTEGRATION。
## Invariants
只在describe且无pending/result时由父组件显示；两种模式的文案、列表、插图alt和结构不变；子组件无状态、回调、IPC。
## Acceptance Criteria
父组件除空态表达式/import与移出的专用资源不变；empty-ui focus直接定位；隔离UI/集成通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_explore_output_empty_state.cjs --parent-ref=253d96aa...`；`npm.cmd --prefix electron run verify:explore-layout-ui`；`npm.cmd --prefix electron run verify:integration`。
## Rollback Point
253d96aab4e9bdffe3afe81c5af624f4adc71a75；backup/pre-phase-explore-empty-ui-20260915已推origin并核hash一致。
## Risks
mode分支、插图或文案结构变化。若需触及状态机/结果渲染则停止并另开Task。
## Explicit Exclusions
不改产品需求/Runtime Agent，不生产构建/打包/网络/硬件。

## Outcome
`ExploreOutputEmptyState.tsx` 承接65行双模式静态说明；`ExplorePanel.tsx` 从1535降至1486行。父组件仍拥有stage/request/result条件。局部、独立UI及33项集成验证通过，详见 [evidence](../../testing/evidence/TASK-EXPLORE-006.md)。
