# Packaging / Release
Lifecycle: ACTIVE · Module: packaging-release

## Owns
版本、离线资源、构建与Windows交付验证。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[desktop-shell](../desktop-shell/CONTRACT.md)、[runtime-mcp](../runtime-mcp/CONTRACT.md)、[skills](../skills/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
pack:win / verify:release / verify:first-run。
入口：[version.json](../../../config/version.json)、[electron-builder.yml](../../../electron/electron-builder.yml)、[pack_win_unpacked.cjs](../../../electron/scripts/pack_win_unpacked.cjs)、[verify_win_unpacked_release.cjs](../../../electron/scripts/verify_win_unpacked_release.cjs)。
## Invariants
交付完整Catnip Forge目录；无真实Key/用户状态；发布/实机不进日常FAST。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
运行 `node scripts/dev/context.cjs packaging-release` 获取地图中的唯一专项推荐；[分级与副作用](../../testing/TEST_STRATEGY.md)决定执行范围。
Runtime改动加Runtime typecheck；无已审离线专项则升级集成并标明coverage gap；UI/设备/API须显式验收。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
