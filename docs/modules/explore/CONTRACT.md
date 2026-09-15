# Explore
Lifecycle: ACTIVE · Module: explore

## Owns
找灵感/解问题、独立多历史、Context选择、知识收藏、受限分析和交接材料。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[ipc](../ipc/CONTRACT.md)、[task-engine](../task-engine/CONTRACT.md)、[skills](../skills/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
explore:*；ExploreWorkSessionRecord；registerExploreAnalysisIpc。
历史列表展示入口：[ExploreSessionHistory.tsx](../../../electron/src/renderer/components/explore/ExploreSessionHistory.tsx)。只消费父组件传入的列表/重命名状态与回调；不持有另一套状态，不调用 IPC。ExplorePanel 继续管理会话/保存/恢复/状态标签。纯展示任务使用 `context.cjs explore --focus history-ui`，持久化/项目隔离变化才升级相关 session 专项。
知识首页展示入口：[ExploreKnowledgePreview.tsx](../../../electron/src/renderer/components/explore/ExploreKnowledgePreview.tsx)。只消费父组件传入的卡片、展开/验证状态和回调；不持有另一套知识状态，不调用IPC。纯展示任务使用 `context.cjs explore --focus knowledge-ui`；存储、自动发现或Context选择变化必须另行加载对应源码与专项。
分析结果展示入口：[ExploreAnalysisResults.tsx](../../../electron/src/renderer/components/explore/ExploreAnalysisResults.tsx)。灵感/诊断结果只消费判别后的结果、来源列表renderer和父组件beginPlan；不发分析请求、不持有选择状态、不确认执行。纯结果卡任务使用`context.cjs explore --focus results-ui`。
只读计划展示入口：[ExplorePlanView.tsx](../../../electron/src/renderer/components/explore/ExplorePlanView.tsx)。只消费计划/交接摘要并请求父组件切到材料阶段；不得直接读写artifact或确认执行。纯计划UI使用`context.cjs explore --focus plan-ui`；artifact编辑、磁盘重读和一次性确认仍属于父/Main/Worker边界。
连接状态展示入口：[ExploreConnectionStatus.tsx](../../../electron/src/renderer/components/explore/ExploreConnectionStatus.tsx)。只消费公开连接状态和父回调；不得接收Secret、调用IPC、安装CLI或管理自动弹窗。纯连接卡UI使用`context.cjs explore --focus connection-ui`；官方CLI/Secret/轮询行为仍属于父/Main边界。
输出初始空态入口：[ExploreOutputEmptyState.tsx](../../../electron/src/renderer/components/explore/ExploreOutputEmptyState.tsx)。只按idea/diagnosis模式展示既有说明和插图；不拥有stage、请求、结果或回调。纯空态UI使用`context.cjs explore --focus empty-ui`。
入口：[ExplorePanel.tsx](../../../electron/src/renderer/components/ExplorePanel.tsx)、[explore](../../../electron/src/renderer/components/explore)、[explore.ts](../../../electron/src/common/explore.ts)、[explore-session.ts](../../../electron/src/main/explore-session.ts)、[explore-analysis.ts](../../../electron/src/main/explore-analysis.ts)、[explore-request.ts](../../../electron/src/main/explore-request.ts)、[explore-context.ts](../../../electron/src/main/explore-context.ts)、[explore-knowledge.ts](../../../electron/src/main/explore-knowledge.ts)、[explore-zhihu-status.ts](../../../electron/src/main/explore-zhihu-status.ts)、[explore-zhihu-search.ts](../../../electron/src/main/explore-zhihu-search.ts)。
## Invariants
分析不改工程业务源码/触硬件；确认绑定材料摘要、工程、计划且一次性；迟到结果回原会话；未选Context不注入。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs explore` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
