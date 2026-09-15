# Attachments / Vision
Lifecycle: ACTIVE · Module: attachments-vision

## Owns
附件受控存储和本机桥，按需Qwen视觉旁路。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[ipc](../ipc/CONTRACT.md)、[runtime-mcp](../runtime-mcp/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
attachment.* / vision.qwen_analyze；随机附件ID。
入口：[attachment-store.ts](../../../electron/src/main/attachment-store.ts)、[attachment-bridge.ts](../../../electron/src/main/attachment-bridge.ts)、[client.ts](../../../runtime/src/attachment/client.ts)、[attachment.tool.ts](../../../runtime/src/mcp/attachment.tool.ts)。
## Invariants
Main掌管Key；附件绑定会话；Runtime只请求桥服务，不自行选择模型决策；不泄露路径/凭据。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs attachments-vision` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
