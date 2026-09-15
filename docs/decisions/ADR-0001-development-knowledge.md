# ADR-0001 — Development Knowledge Routing
Lifecycle: ACTIVE · Accepted: 2026-09-15（用户明确授权）
## Decision
默认 Maintenance：User Task → PROJECT_INDEX / project-map → CURRENT → Task Context → 局部实施 → 分层验证 → evidence → commit/push/remote。
Bootstrap 仅用于新项目或大型新子系统：Idea → Product → Architecture → Knowledge → Construction。
Development Agent 负责仓库；Runtime Agent 是产品中的 CLI，二者规则不混用。

## Canonical sources
Product Truth 不变；全局架构/不变量仍在原 LAYER_CONTRACT；模块 Contract 只解释局部接口/测试并引用全局编号。
CURRENT 只保存现在；Task Context 在 active，完成后归 archive；evidence 每任务一份；CURRENT_TEST_STATUS 只给当前结果指针。
PROJECT_INDEX 只导航；project-map 是同一模块导航的机器视图，不承载第二套产品需求/状态。YAML 使用 JSON 兼容子集，以 Node 内置解析避免引入依赖。

## Lifecycle / migration
- ACTIVE：当前可执行规则、导航、契约、模板、状态。
- REFERENCE：仍有解释价值，但不是当前指令。
- SUPERSEDED：被指定 canonical 替代，保留旧正文/版本供调查。
- ARCHIVED：完成任务与历史证据，不继续追加为当前状态。
- 新 ACTIVE AGENTS/WORKFLOW 提交后旧“更新全局 LOG/DEV_PROGRESS/HANDOFF/TEST_METRICS”规则失效。
- construction 默认 REFERENCE；例外 ACTIVE 为 WORKFLOW、LAYER_CONTRACT、TOOL_POLICY；本轮施工基线在任务完成后变 REFERENCE。
- DEV_PROGRESS、LOG、TEST_METRICS、PROJECT_STATE_REPORT、旧HANDOFF保留历史但停止全局流水写入。
- 旧 CLAUDE.md、ARCHITECTURE、DEVELOPMENT*、REFACTOR_PLAN 等不覆盖新的开发入口；产品 agent/CLAUDE.md 不改。

## Consequences
默认上下文减少；依赖接口变化仍须读 P1 Contract。未知模块必须扩大调查与验证，不能用小预算为漏测辩护。
