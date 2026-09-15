# Serial Session
Lifecycle: ACTIVE · Module: serial

## Owns
Main共享串口、read/wait/capture缓冲、鉴权桥与Runtime串口客户端。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[ipc](../ipc/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
explore 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
SerialMonitorSession start/write/read/wait；loopback bridge。
入口：[serial-monitor-session.ts](../../../electron/src/main/serial-monitor-session.ts)、[serial-monitor-controller.ts](../../../electron/src/main/serial-monitor-controller.ts)、[serial-monitor-bridge.ts](../../../electron/src/main/serial-monitor-bridge.ts)、[serial-monitor-client.ts](../../../runtime/src/hardboard/serial-monitor-client.ts)。
## Invariants
UI/Agent复用单会话；本机随机令牌；事件增量/清空语义；mock不是真机。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
FAST：相关package typecheck。
MODULE：verify:serial-monitor。
以上为electron既有脚本；Runtime改动加Runtime typecheck。UI几何/真实设备/API验证按Task显式安排，不由静态通过推断。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
