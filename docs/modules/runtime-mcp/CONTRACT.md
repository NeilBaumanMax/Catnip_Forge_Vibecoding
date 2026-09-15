# Runtime MCP & Events
Lifecycle: ACTIVE · Module: runtime-mcp

## Owns
MCP工具注册、Runtime事件、任务/进程执行与共享运行态类型。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
现有标准库/本层类型；不引入新的产品依赖。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
desktop-shell、runtime-agent 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
MCP tool registration；EventBus task/project/time envelope。
入口：[index.ts](../../../runtime/src/index.ts)、[server.ts](../../../runtime/src/mcp/server.ts)、[eventbus](../../../runtime/src/eventbus)、[task](../../../runtime/src/task)、[process](../../../runtime/src/process)。
## Invariants
执行工具不做LLM决策；事件证据带task/project/time；不把完成消息当运行成功。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
FAST：相关package typecheck。
MODULE：无独立离线专项；需要时升级集成，不声称已覆盖。
以上为electron既有脚本；Runtime改动加Runtime typecheck。UI几何/真实设备/API验证按Task显式安排，不由静态通过推断。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
