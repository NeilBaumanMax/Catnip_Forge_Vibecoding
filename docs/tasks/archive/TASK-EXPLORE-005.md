# TASK-EXPLORE-005 — Extract Explore connection status presentation
Lifecycle: ARCHIVED
Status: complete
Owner: Development Agent
Mode: Maintenance

## Intent
提取探索首页知乎连接状态卡，缩小连接UI修改的上下文，同时保持官方CLI安装、Secret安全窗口和轮询策略在父组件/Main原边界。
## Target Modules
explore；dev-infrastructure（路由/验证）。2个产品源码文件，0跨层，0依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExploreConnectionStatus.tsx；专项验证、Explore聚合、project-map focus、Explore Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
common/explore.ts 的 `ExploreZhihuConnectionStatus`；explore.less；现有知乎连接专项和隔离layout测试。
## Forbidden Scope
`electronAPI`、Main/preload、官方CLI命令、Secret输入/传输、安装/连接/轮询实现、自动弹窗次数、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) §7：连接入口使用产品语言；Secret不进入Renderer/日志/截图；安装升级需显式授权。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)；[Layer](../../construction/LAYER_CONTRACT.md) §Renderer/Secret及连接不变量61/63。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel 的 `connectionBadge` 纯JSX；新组件仅接收状态、三个pending标志和安装/连接/刷新回调。
## Relevant Tests
严格TSX、状态文案/按钮/步骤/disabled/回调；父文件反向还原；现有连接安全专项、Explore静态契约、隔离layout；配置变化后INTEGRATION。
## Invariants
unknown状态按checking展示；安装和Secret动作仅对应各自状态；Secret安全文案不变；子组件无IPC/Secret值/自动连接逻辑；父回调仍调用既有函数。
## Acceptance Criteria
父组件除connectionBadge/import不变；子组件无状态/副作用；connection-ui focus直接定位；安全专项/隔离UI/集成通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_explore_connection_status.cjs --parent-ref=475a2dc4...`；`npm.cmd --prefix electron run verify:explore-layout-ui`；`npm.cmd --prefix electron run verify:integration`；context focus。
## Rollback Point
475a2dc4410d1c3e3967793273fb9e81058acfb2；backup/pre-phase-explore-connection-ui-20260915已推origin并核hash一致。
## Risks
条件分支或disabled状态接线变化。若需改变安装/Secret/轮询行为则停止并另开跨层Task。
## Explicit Exclusions
不改产品需求/Runtime Agent，不执行真实网络连接、生产构建、打包或硬件验证。

## Outcome
`ExploreConnectionStatus.tsx` 承接 67 行连接卡展示；`ExplorePanel.tsx` 从 1575 降至 1535 行。官方CLI安装、Secret安全窗口、轮询与自动弹窗策略留在原边界。局部、独立UI及32项集成验证通过，详见 [evidence](../../testing/evidence/TASK-EXPLORE-005.md)。
