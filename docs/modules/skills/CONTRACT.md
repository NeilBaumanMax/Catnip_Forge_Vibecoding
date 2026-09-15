# Skill System
Lifecycle: ACTIVE · Module: skills

## Owns
标准Skill发现、部署保真、支持文件与本地管理；官方zhihu vendor。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[ipc](../ipc/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
listManagedSkills / syncManagedSkills；官方scripts/run.*。
入口：[skill-manager.ts](../../../electron/src/main/skill-manager.ts)、[skills](../../../agent/skills)、[configure-zhihu-secret.ps1](../../../agent/host-tools/configure-zhihu-secret.ps1)。
## Invariants
vendor原字节/协议保真；CLI安装授权；Secret只原生输入/stdin/系统凭据；不新增第二套Skill存储。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs skills` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
