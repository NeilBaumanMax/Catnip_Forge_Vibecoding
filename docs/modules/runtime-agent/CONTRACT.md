# Runtime Agent Integration
Lifecycle: ACTIVE · Module: runtime-agent

## Owns
产品内Claude Code CLI生命周期、权限档位、模型输入上下文。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[skills](../skills/CONTRACT.md)、[runtime-mcp](../runtime-mcp/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
buildAgentLaunchArgs / buildAgentMcpConfig / ensureAgentProcess。
入口：[agent.ts](../../../electron/src/main/agent.ts)、[context.ts](../../../electron/src/main/worker/context.ts)、[CLAUDE.md](../../../agent/CLAUDE.md)。
## Invariants
与Development Agent角色分开；官方Skill显式能力路由；不在开发治理任务改变产品权限或模型行为。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
FAST：相关package typecheck。
MODULE：verify:explore-analysis-gate、verify:hardboard。
以上为electron既有脚本；Runtime改动加Runtime typecheck。UI几何/真实设备/API验证按Task显式安排，不由静态通过推断。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
