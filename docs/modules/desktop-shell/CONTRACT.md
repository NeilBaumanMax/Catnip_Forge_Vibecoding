# Desktop Shell
Lifecycle: ACTIVE · Module: desktop-shell

## Owns
窗口生命周期、顶层组合、工作区导航和主题；大文件只承担组合。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[chat](../chat/CONTRACT.md)、[explore](../explore/CONTRACT.md)、[workspace-editor](../workspace-editor/CONTRACT.md)、[onboarding-assistant](../onboarding-assistant/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
App / BrowserPanel props；Main 窗口事件。
任务历史纯投影见[task-history.ts](../../../electron/src/renderer/components/task-manager/task-history.ts)：只接收Renderer事件快照，不拥有轮询、工程过滤或清空状态；局部上下文用context.cjs desktop-shell --focus task-history。
任务历史展示见[TaskHistoryPanel.tsx](../../../electron/src/renderer/components/task-manager/TaskHistoryPanel.tsx)：只消费已投影列表、格式化函数和父回调；不拥有事件订阅/清理、日志定位或失败分析。纯表格UI使用`context.cjs desktop-shell --focus task-history-ui`。
入口：[index.ts](../../../electron/src/main/index.ts)、[bootstrap.ts](../../../electron/src/main/bootstrap.ts)、[tray.ts](../../../electron/src/main/tray.ts)、[App.tsx](../../../electron/src/renderer/App.tsx)、[BrowserPanel.tsx](../../../electron/src/renderer/components/BrowserPanel.tsx)。
## Invariants
正常桌面默认探索；六工作区；窗口动作经 preload；保留工程切换门禁。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs desktop-shell` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
