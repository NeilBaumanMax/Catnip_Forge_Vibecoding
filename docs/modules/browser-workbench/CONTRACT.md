# Browser Workbench (frozen)
Lifecycle: REFERENCE（Frozen，显式相关任务才加载） · Module: browser-workbench

## Owns
保留的 BrowserView、网页录制/回放和 Runtime 浏览器工具。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[ipc](../ipc/CONTRACT.md)、[runtime-mcp](../runtime-mcp/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
loadURL / getBrowserView；browser.* / storage.*。
入口：[browser-view.ts](../../../electron/src/main/browser-view.ts)、[browser-recorder.ts](../../../electron/src/main/browser-recorder.ts)、[browser.ts](../../../runtime/src/browser.ts)、[browser.tool.ts](../../../runtime/src/mcp/browser.tool.ts)。
## Invariants
Frozen不等于删除；无相关任务不加载；Skill小站沿现有BrowserView打开。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs browser-workbench` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
