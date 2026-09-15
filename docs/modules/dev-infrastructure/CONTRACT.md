# Development Infrastructure
Lifecycle: ACTIVE · Module: dev-infrastructure

## Owns
开发导航、Task Context、分层验证和静态维护约束；产品不依赖。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
现有标准库/本层类型；不引入新的产品依赖。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
project-map / Task Context；开发脚本CLI。
入口：[AGENTS.md](../../../AGENTS.md)、[scripts](../../../scripts)、[package.json](../../../electron/package.json)、[package.json](../../../runtime/package.json)。
## Invariants
唯一canonical来源；旧脚本兼容；未知路径扩大验证；不修改产品Runtime Agent行为。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs dev-infrastructure` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
