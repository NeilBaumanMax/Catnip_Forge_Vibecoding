# Hardboard
Lifecycle: ACTIVE · Module: hardboard

## Owns
ESP-IDF环境/工程/Build/Flash、硬件MCP工具及本地状态桥。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[runtime-mcp](../runtime-mcp/CONTRACT.md)、[project-session](../project-session/CONTRACT.md)、[serial](../serial/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
explore 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
hardboard.*；idf_build / idf_flash；工程候选索引。
入口：[hardboard.tool.ts](../../../runtime/src/mcp/hardboard.tool.ts)、[hardboard](../../../runtime/src/hardboard)、[hardboard.ts](../../../runtime/src/hardboard.ts)、[hardboard.ts](../../../electron/src/main/hardboard.ts)。
## Invariants
项目/target/端口明确后执行；Build/Flash/运行证据分开；不扫描全build/全部串口历史。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs hardboard` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
