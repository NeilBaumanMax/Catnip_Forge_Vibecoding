# TASK-EXPLORE-003 — Extract Explore analysis result views
Lifecycle: ARCHIVED
Status: completed
Owner: Development Agent
Mode: Maintenance

## Intent
把灵感候选和诊断假设结果卡从ExplorePanel提取为局部展示组件，继续降低结果UI任务的源码阅读范围。
## Target Modules
explore；dev-infrastructure（局部路由/测试）。预计2个产品源码文件，0跨层，0依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExploreAnalysisResults.tsx；紧凑专项、npm/离线组、project-map/路由测试、Explore Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
common/explore.ts结果类型、ExploreSourceList及explore.less；父组件sourceList/beginPlan保持原职责。
## Forbidden Scope
分析请求/响应、计划生成/确认门禁、Main/Worker/Runtime、来源收藏语义、CSS/视觉改版、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) Explore分析只读、来源证据和选择后生成计划相关章节。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)、[Dev Infrastructure](../../modules/dev-infrastructure/CONTRACT.md)；[Layer](../../construction/LAYER_CONTRACT.md) Renderer和Explore确认边界。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel的ideaResults/diagnosisResults；新组件接收已判别结果、选择/计划状态、sourceList renderer及beginPlan回调。
## Relevant Tests
严格TSX和结果/回调特征；父文件反向还原；现有Explore静态契约；现有隔离layout UI；配置变化后INTEGRATION。
## Invariants
候选顺序/编号/选中与dimmed不变；计划中按钮状态与参数不变；来源列表标签不变；诊断冲突、工程证据空态、下一步验证不变；无执行授权逻辑进入子组件。
## Acceptance Criteria
父组件除两段结果JSX/import不变；局部组件无状态/IPC；results-ui focus直接定位；现有隔离UI通过；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_explore_analysis_results.cjs --parent-ref=101a57be...`；`npm.cmd --prefix electron run verify:explore-layout-ui`；`npm.cmd --prefix electron run verify:integration`；context focus。结果进evidence。
## Rollback Point
101a57bec31074f86fc52dc952c7fd7fa8822ba9；backup/pre-phase-explore-results-20260915已推origin并核hash一致。
## Risks
判别联合类型、render prop和beginPlan可选参数接线错误。若需改请求/计划生命周期则停止并另开Task。
## Explicit Exclusions
不改产品功能、Runtime Agent、CSS、生产包、真实网络/硬件或用户运行中的App。

## Outcome
灵感候选与诊断假设结果成为108行无状态组件，ExplorePanel 1676→1613行。严格TSX/4组特征、父文件反向还原、静态契约、完整隔离layout及30步INTEGRATION通过；首次失败是新增测试class查询与旧断言路径错误，局部修正后通过。results-ui直接路由局部结果/来源组件，计划与执行门禁仍在原边界。完整记录见[任务evidence](../../testing/evidence/TASK-EXPLORE-003.md)。
