# Onboarding / Software Assistant
Lifecycle: ACTIVE · Module: onboarding-assistant

## Owns
首启配置、使用助手和新手引导。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[ipc](../ipc/CONTRACT.md)、[desktop-shell](../desktop-shell/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
software-assistant:*；first-run:*；CatnipOnboarding props。
入口：[first-run.ts](../../../electron/src/main/first-run.ts)、[software-assistant.ts](../../../electron/src/main/software-assistant.ts)、[CatnipOnboarding.tsx](../../../electron/src/renderer/components/CatnipOnboarding.tsx)。
## Invariants
助手不占工程Agent队列；新手引导不绕过工程确认；Key不进Chat。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs onboarding-assistant` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
