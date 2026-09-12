# Phase 施工计划

顺序固定，Phase 内小闭环。无重大阻塞不形式询问；出现用户列明停工条件时停止。每项范围、证据、测试先明确再编码。不得 worktree 或开其他产品分支。

| Phase | 小闭环与最小修改范围 | 验收门禁 |
| --- | --- | --- |
| 0 | 现场/Git/旧文档、Product Truth、Decision/Assumption、分层/测试/Git 基线；只 AGENTS 与新文档 | 要求文件齐备、测试执行且失败记录、远端备份真实、无业务修改、文档先提交推送 |
| 1 | 1a 官方 ZIP 来源/完整性及状态；1b 宿主标准 Skill 兼容、support sync、显式 @zhihu；1c 官方 CLI 授权边界与 packaged resource 检查 | 真实包存在；无 vendor 改写；反例测试→修根因；开发发现/部署/显式加载契约；真实 status；过滤器包含全树；无 Secret；实际 LLM 调用和新成品未测时单列 |
| 2 | 2a 验证 A1/A2 并定最小 domain 对象；2b Main user-data store 与 IPC；2c 相关发现和用户选择 | Explore Request/Context/Source/Idea/Diagnosis/Handoff/Knowledge/Verification 最小字段可校验；原子保存/重启/坏文件/选择拒绝测试；无 UI 扩展/新 DB 服务 |
| 3 | 3a 复用 Worker 的受限分析/计划能力；3b 探索入口和灵感流程；3c Handoff 与确认前保护 | 模糊目标自动检索，Idea 为主且真实引用；Context 匹配；交现有 Agent 只出计划；未确认文件不变、硬件不动；无 Secret 记 live pending |
| 4 | 4a Context gatherer 有界读取和勾选；4b 监视器/任务最小分析入口；4c 双搜索 Diagnosis；4d 同队列确认执行与实机验证 | 软件：真实来源、项目/时间归属、源冲突保留、Handoff 状态和确认门禁；硬件：确认后真实修改/Build/Flash/Serial，缺失单列 REAL_HARDWARE_VALIDATION_PENDING |
| 5 | 5a 主动收藏与重启；5b 历史相关卡发现经用户选择；5c 真实验证回写 | A 收藏→重启→发现→拒绝不入 Context；B 真实有效→项目验证记录；C 失败→明确无效/失败记录；不做 OAuth |
| 6 | 回归、安全、Windows 包、冷启动、Skill 入包、两 Demo、文档/Git 收尾 | 软件全通过；真实搜索/设备/包有证据；无 Secret；baseline/backup/commit/远端一致；不扩功能 |

## 2026-09-08 执行状态与顺序纠正

- Phase 0–2 完成；Phase 3 软件闭环完成。安全连接、固定搜索桥、受限分析、结果 UI、Handoff 与无工具计划已实现；DeepSeek 真实计划输出通过，真实知乎搜索按用户要求暂缓。
- Phase 4 进行中：4a 有界 Context 收集已实现；4c 双搜索 Diagnosis 的软件路径已在 3b2 提前完成，但真实来源仍待验。下一项为 4b 监视器/失败任务入口，然后进入 4d 同队列确认执行。
- 用户确认前，“确认并执行”保持禁用；不得修改工程或调用 Build/Flash/Serial。无实机证据继续记 `REAL_HARDWARE_VALIDATION_PENDING`。
- Access Secret 未配置且用户要求暂不测试，真实知乎/全网检索继续记 `LIVE_INTEGRATION_PENDING`，不以 mock 或静态门禁冒充。

以上是 2026-09-08 当时快照，不代表当前状态。

## 2026-09-09 当前执行状态

- Phase 0–5 的软件范围完成，Phase 6 最终验收中；安全连接、固定搜索桥、受限分析/计划、结构化结果、Handoff、一次性确认执行、知识收藏和验证反馈均已实现。
- Access Secret 已通过独立宿主窗口配置；官方验证、最小本人内容请求和真实“找灵感”通过。该请求取得 8 条知乎来源并展示 3 个合法 Idea。
- Phase 6e 首次使用连接向导与最新 Windows 候选软件验收已完成：缺 CLI 需用户点击授权安装；CLI 可用但缺 Secret 时进入探索自动弹一次安全窗口；完整 `pack:win`、release/version、app.asar 标记与隔离冷启动通过。下一小项按顺序为：真实“解问题”知乎＋全网双搜索 Demo；全新 Windows 用户真实安装/连接人工验收；有设备后完成确认施工及 Build/Flash/Serial 实机验收。
- `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留；Phase 7 最新源码已重新打包，但软件门禁、打包 UI 或串口 mock 仍不能替代真实网络与真机。

以上是 2026-09-09 当时快照。2026-09-10 的当前状态如下。

## 2026-09-10 当前执行状态

- Explore UI Research Workspace 已由 `EXPLORE_UI_REFACTOR` 合入 `idea_to_production`；合并后 Runtime/Electron 构建、Explore 全专项、布局矩阵与 Workbench smoke 通过。
- Phase 7 最新源码已完整重建 Windows `win-unpacked`；release/version、无 Key 隔离首启、显式工程选择与打包版 Chat UI 通过，包体 4,464,648,810 字节。包未配置代码签名，全新用户真实安装/连接仍待人工验收。
- [Phase 7 当前工程会话与 Explore 工作保存](PHASE_7_PROJECT_SESSION_BASELINE.md) 已完成源码、专项、构建与 Windows 包自动化验收；冷启动工程门禁、工程隔离、Agent/Editor/Build/Flash/Serial 联动和 Explore 多历史已落地。
- 下一步由用户复测最新成品；随后在全新 Windows 用户环境人工验收安装授权→Secret 安全窗口→连接确认，并经用户授权执行真实 Diagnosis；有设备后执行确认后的修改、Build、Flash、Serial 与知识验证回写。
- `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 继续保留。UI、mock、软件门禁和最新 Windows 包都不能替代真实网络或实机证据。

## Phase 7：当前工程会话与 Explore 工作保存

- 7a–7f：`COMPLETE`。失败回归、Main Project Session、全模块 active project、Agent 会话隔离、Explore 多历史、路径/request/task/Secret 门禁均已实现并通过专项。
- 7g 软件与打包自动化：`COMPLETE`。Windows 包、无 Key 首启、显式工程选择、打包版 Chat UI、release/version 已通过。
- 7g 用户人工成品验收：`NOT VERIFIED`。需复测返回、切页、重启、切工程、Agent 历史、编辑器、烧录目标和新建工程；完成后再恢复真实 Diagnosis 验收。

## Phase 8：工程内会话、独立 Explore Agent 与交接材料

- 施工基线见 [Phase 8 文档](PHASE_8_EXPLORE_AGENT_HANDOFF_BASELINE.md)；施工前远端备份 `backup/pre-phase-8-20260910` 已核对为 `050ae64d`。
- 8a：`COMPLETE`。工程 `.catnip` 路径、manifest、Agent/Explore store 保留迁移和跨工程/符号链接/损坏保护已实现。
- 8b：`COMPLETE`。Explore 独立 conversation 与 IPC 已实现，受限分析/计划过程不再进入左侧 `chat:message`。
- 8c：`COMPLETE`。四阶段可回看；第三阶段生成三份材料，第四阶段从磁盘展示并经摘要/绑定/一次性门禁确认提交。
- 8d：`COMPLETE`。Source/Idea 操作层级、36px 命中区、keyboard、reduced-motion、wide/normal/compact 和 light/dark 回归已完成。
- 8e 自动 Review/专项/Runtime/Electron build：`COMPLETE`；成品人工验收、真实 Diagnosis、真实 Agent 改码与硬件：`NOT VERIFIED`。本轮未重新打包 Windows 成品。

## Phase 9：使用记录清理、四个 Skill 移除与重新打包

- 施工与删除边界见 [Phase 9 文档](PHASE_9_USAGE_RESET_SKILL_REMOVAL_PACKAGE.md)；远端恢复点 `backup/pre-phase-9-20260910` 已核对为 `f976be8e`。
- 9a：停止开发进程，精确删除工程 `.catnip`、收藏 Store、当前/旧工程会话记录。
- 9b：删除四个指定 Skill 的开发源、开发部署与 userData 部署副本，同时移除产品快捷映射和残留引用。
- 9c：专项、Runtime/Electron 构建、安全检查、Windows 打包、release/version 与包内容核对。
- 真实搜索、真实 Agent 改码和真机 Build/Flash/Serial 不属于本轮。
- 9a–9c：`COMPLETE`。清理目标逐项不存在，剩余 Skill 9 个，Windows `win-unpacked` 已生成并通过 release/version/Skill 内容门禁。

## 2026-09-11 Phase 10–14 当前状态

- Phase 10：`COMPLETE`。修复未归属历史展示、Explore 编辑黑屏、计划等待态、材料编辑/打开、四步层级和当前工程标识；版本升级到 v2.0.0。
- Phase 11：`COMPLETE`。确认后 Explore 历史显式落盘；新手旅程覆盖探索/Skill 小站；学院呱呱名称、知识和 GitHub 白名单入口完成。
- Phase 12：`COMPLETE`。助手聊天框、头像和 GitHub 按钮修复；收藏保存来源对话快照并可删除；入口配色增强。
- Phase 13：`COMPLETE`。两入口学院呱呱插画和响应式门禁完成；v2.0.0 Windows 包通过 release/version，包体 4,468,679,868 字节。
- Phase 14：`COMPLETE`。已修正当前文档漂移并重写接力入口；未改源码、未重打包、未触碰用户未跟踪目录。
- 后续顺序：用户人工复测 v2.0.0 → 经授权完成真实双搜索 Diagnosis → 有实机和端口授权后执行修改/Build/Flash/Serial。`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留。
## Phase 1 已定位的最小工程范围

- 新增 `agent/skills/zhihu`，按用户 ZIP 原字节导入，不创建假 Skill。
- `skill-manager.ts`：标准目录 SKILL.md 部署保真，展示所需 multiline description 正确解析；旧扁平兼容保持。先回归证明当前 `>-` 和部署改写问题。
- `context.ts` / 产品 Agent 规则仅在确有冲突时最小区分官方 Skill 搜索与旧 browser 搜索；不改旧平台业务实现。
- 集成测试：真实目录、manifest/support hash、显式位置校验、Worker 加载指令、打包过滤器；不拿构造的 tool event 冒充真实 LLM 加载。
- 第一条实际官方调用必须是 `scripts/run.ps1 status`。若需 CLI 安装/升级则按官方明确授权规则停，不继续 Phase 2 绕开。

## Review / 第一性原理（2026-09-07）

没有第二套 Agent/IPC 执行系统，没有数据库预设或新云端。最可能导致“看起来成功”的错误是未确认修改、自由文本结果解析、来源伪造、mock 当硬件；将它们前置为可验证门禁。最大复用风险是旧 Chat 无权限隔离，因此不能先接 UI 再补安全。当前最简单可靠路线是官方 Skill → 可校验数据/受限执行契约 → 两条 UI 闭环 → 知识反馈 → 成品。

## Phase 16：模型中心、Agent 模型选择与知乎凭证维护

- 施工基线见 [Phase 16 文档](PHASE_16_MODEL_CENTER_AND_CREDENTIAL_MAINTENANCE.md)。分支从 `origin/catnip-GUAGUA` 的 `f2449a19` 创建；恢复点 `backup/pre-model-ccswitch-20260912` 已远端核对。
- 16a：文档基线，必须独立 Commit/Push 后才能修改业务源码。
- 16b：`COMPLETE`。版本化模型配置契约、默认迁移、Main 原子 Store、revision 并发保护和离线专项已完成。
- 16c1：`COMPLETE`。Main-only DPAPI-backed 凭据 Store、无明文 fallback、旧 Key 非破坏迁移和专项完成。
- 16c2：`COMPLETE`。模型 Key 与首次启动均通过 Main 控制的 WPF PasswordBox 接入 safeStorage；Agent、软件助手与 Qwen 统一优先使用安全凭据，旧文件只作迁移兼容且不再暴露给 Renderer。
- 16d：`IMPLEMENTED`。第七个“模型”工作区与供应商/模型/默认用途管理已完成并通过类型、专项和 Renderer build。
- 16e：`IMPLEMENTED`。Agent 会话模型选择、按工程会话持久化、任务快照与运行时凭据注入已完成；不兼容协议和缺凭据显式拒绝。
- 16f：`IMPLEMENTED`。知乎替换、在线验证和本机退出复用官方命令，专项通过；未使用真实 Access Secret 联网验证。
- 下一项：做 Phase 16 全量 UI/发布回归与原生窗口人工可用性验收；真实付费 API 与真实知乎在线验证必须另获用户授权。
- 16d–16e：再完成第七工作区与 Agent 会话模型选择；任务创建时冻结模型快照，不允许静默 fallback。
- 16f：复用官方 `zhihu` 命令补齐已连接后的替换、验证和退出。
- 16g：完成专项、安全扫描、Runtime/Electron typecheck/build、文档与 Git 远端核对。真实付费 API、真实 Diagnosis 和硬件证据分别标记，不以离线测试替代。
