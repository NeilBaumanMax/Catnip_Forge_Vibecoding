# IPC Boundary
Lifecycle: ACTIVE · Module: ipc

## Owns
Renderer 白名单桥、Main IPC 注册与输入验证入口。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
现有标准库/本层类型；不引入新的产品依赖。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
window.electronAPI；ipcMain.handle 注册及各服务 register*Ipc。
入口：[index.ts](../../../electron/src/preload/index.ts)、[gateway.ts](../../../electron/src/main/gateway.ts)、[index.ts](../../../electron/src/renderer/types/index.ts)。
## Invariants
Renderer 只提交受控请求；Main 再校验；无任意 shell/路径/Secret IPC。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs ipc` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
