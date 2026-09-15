# TASK-DEV-MAINT-001
Lifecycle: ACTIVE · Status: implementing · Mode: Maintenance
## Intent
让局部开发按模块读取上下文并选择验证；详细验收范围见[已提交基线](../../construction/DEV_AGENT_MAINTAINABILITY_REFACTOR.md)。
## Target Modules
dev-infrastructure；知识导航跨模块是本任务明确例外，不改变其产品行为。
## Allowed Write Scope
AGENTS、README/文档入口、.vibecoding、docs新知识/测试/任务/ADR/维护目录、scripts/dev、electron/package.json；旧文档只降级/去重。
## Read-only Dependencies
全部产品模块仅检查入口、边界和测试副作用。
## Forbidden Scope
electron/src、runtime/src、vendor、Product Truth、用户未跟踪目录；无全仓迁移。
## Relevant Product Truth
[§5/7/8/9](../../product/PRODUCT_REQUIREMENTS.md)：确认、Secret、非目标与真实证据。
## Relevant Contracts
[dev-infrastructure](../../modules/dev-infrastructure/CONTRACT.md)、[Layer](../../construction/LAYER_CONTRACT.md)。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。
## Relevant Source Files
electron/package.json；electron/scripts；runtime/scripts；scripts/dev。
## Relevant Tests
新工具负例、地图/路径、架构、聚合去重；Runtime/Electron 类型、Main构建、Explore/Serial/Project等离线回归；最终一次 Renderer/Runtime 构建。
## Invariants
不变更产品行为；旧脚本兼容；未知路径不skip；无重复真相；历史保留。
## Acceptance Criteria
执行基线 DoD；测量前后指标并演练 Explore history UI / Serial session。
## Validation Commands
测试策略与[任务 evidence](../../testing/evidence/TASK-DEV-MAINT-001.md)记录实际完整命令和首次失败。
## Rollback Point
backup/pre-phase-dev-maintainability-20260915 → 71d63d5d；后续阶段独立备份。
## Risks
路由漏测、静态误报、测试副作用；先验证负例和实际脚本，再扩范围。
## Explicit Exclusions
不重打包、不调用真实模型/知乎、不触板；不拆核心文件。
