# Project Session
Lifecycle: ACTIVE · Module: project-session

## Owns
当前工程唯一绑定、工程内状态路径、切换与用户数据迁移。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[ipc](../ipc/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
requireActiveProject / getActiveProjectStatePath；project:* IPC。
入口：[project-session.ts](../../../electron/src/main/project-session.ts)、[project-session.ts](../../../electron/src/common/project-session.ts)、[paths.ts](../../../electron/src/main/paths.ts)、[user-data-path.ts](../../../electron/src/main/user-data-path.ts)。
## Invariants
冷启动无隐式工程；路径/realpath校验；活动任务或未保存编辑禁止静默切换。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs project-session` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
