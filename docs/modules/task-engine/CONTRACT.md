# Task Engine
Lifecycle: ACTIVE · Module: task-engine

## Owns
任务队列、追加/取消、异步事件与探索执行策略编排。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[runtime-agent](../runtime-agent/CONTRACT.md)、[skills](../skills/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
submitTask / submitExploreAnalysis / submitExplorePlan / confirmExploreExecution。
入口：[orchestrator.ts](../../../electron/src/main/worker/orchestrator.ts)、[task-state.ts](../../../electron/src/main/worker/task-state.ts)、[index.ts](../../../electron/src/main/worker/index.ts)、[quick-tasks.ts](../../../electron/src/main/worker/quick-tasks.ts)、[TaskProgress.tsx](../../../electron/src/renderer/components/TaskProgress.tsx)。
## Invariants
单活动任务；taskId/project绑定；受限档位不能继承default执行权；取消后迟到事件不串任务。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs task-engine` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
