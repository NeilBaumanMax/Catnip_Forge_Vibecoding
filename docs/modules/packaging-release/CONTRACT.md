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
FAST：verify:version、verify:zhihu-skill-package。
MODULE：无独立离线专项；需要时升级集成，不声称已覆盖。
以上为electron既有脚本；Runtime改动加Runtime typecheck。UI几何/真实设备/API验证按Task显式安排，不由静态通过推断。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
