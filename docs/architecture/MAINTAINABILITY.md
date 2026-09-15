# Maintainability
Lifecycle: ACTIVE · Development policy；全局产品架构仍以 [Layer Contract](../construction/LAYER_CONTRACT.md) 为准。

## No New Business Logic Zone
[基线](../../.vibecoding/maintainability.json)列出的 ExplorePanel、BrowserPanel、App、worker/orchestrator、ChatPanel 是已知热点。
允许局部 Bug 修复和组合层调整；新业务职责先考虑提取到独立模块。Task 必须解释留在热点的必要性、增长量、责任边界与保护测试。
不得以减少行数为由压缩代码、删功能或批量迁移；“行数减少”不能代替行为验证。
热点基线不得每轮自动调高。真正拆分后，在同一 Task 中审查新旧职责、地图、测试并更新基线。

## Soft size budgets
| 类型 | normal | review | extraction preferred | no new major business logic |
| --- | --- | --- | --- | --- |
| UI / TSX | <400 | 400–800 | >800 | >1200 |
| Service / TS | <500 | 500–800 | >800 | 已知热点单独指定 |

`npm.cmd --prefix electron run check:maintainability` 输出已有警报和相对基线增长；尺寸为软预算，不因历史大文件而退出失败。
文件被移动/删除而基线未更新则失败，防止静默遗失保护。
扫描 TS/TSX 的体积只是维护信号；类型声明也可能长，抽取决策必须检查职责。
Change Budget 只在 [AGENTS](../../AGENTS.md)维护：超预算先拆 Task 或记录用户明确授权的例外。

## Machine architecture coverage
`npm.cmd --prefix electron run check:architecture` 使用现有 TypeScript AST 和 tsconfig 模块解析；无新依赖。
| Rule | 静态检查范围 | 对应既有契约 |
| --- | --- | --- |
| ARCH-001 | Renderer 禁 Node/Electron 导入及 Main/Preload/Runtime 越层导入；计算式模块加载需审查 | Layer Renderer / IPC |
| ARCH-002 | common 禁平台 API 和实现层导入 | Layer 分层边界 |
| ARCH-003 | Runtime 禁 Electron/产品 Agent/已知 LLM SDK 导入 | Layer Runtime 无 LLM 决策 |
| ARCH-004 | 产品源码禁导入 .vibecoding / scripts/dev | 本轮 Development-only 边界 |

涵盖 import/export/require/dynamic import/import type/import-equals，忽略注释和普通字符串，解析错误失败；含负例。
范围是直接导入边界，**不是安全沙箱、完整调用图、Secret 污点分析或 LLM 决策的充分证明**。
不能把字符串 URL、包装后的任意 fetch、eval 或任意第三方包能力全部静态判定；此轮没有添加夸大的通用“禁止网络”检查。
Runtime attachment/client 的 Main loopback bridge 合法；保留现有职责，不为检查改业务。
Gateway 是 IPC 路由入口，但 Main 多个服务已有专属注册；本轮不强制所有 ipcMain 只能在单文件。
分析权限/一次性确认/跨项目绑定继续由 verify:explore-analysis-gate、verify:explore-search-handoff、verify:project-session、verify:explore-session 的程序测试验证。
当前未覆盖项、既有违规与发布限制见 [CURRENT](../state/CURRENT.md)；此检查 PASS 仅代表表中四项通过。

## Next extraction
[HOTSPOTS](../refactor/HOTSPOTS.md) 是带基线的拆分候选报告，不是新架构真相。
先为一个纯函数或展示组件补行为保护，再小步提取；会话、订阅、取消/迟到事件必须先做特征测试。
Review 除 diff 外应明确：新职责有没有进入热点、是否改变跨层数量、是否增加无关 Context/tests。
