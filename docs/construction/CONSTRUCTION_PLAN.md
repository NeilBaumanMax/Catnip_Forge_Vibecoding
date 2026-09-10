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
- `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留；已有发布候选验收不能替代最新源码重新打包，软件门禁或串口 mock 不能替代真机。

以上是 2026-09-09 当时快照。2026-09-10 的当前状态如下。

## 2026-09-10 当前执行状态

- Explore UI Research Workspace 已由 `EXPLORE_UI_REFACTOR` 合入 `idea_to_production`；合并后 Runtime/Electron 构建、Explore 全专项、布局矩阵与 Workbench smoke 通过。
- UI 合并后的 `idea_to_production@8f28ca3d` 已完整重建 Windows `win-unpacked`；release/version、隔离首启、打包版 UI 与 app.asar Explore/连接标记通过。包未配置代码签名，全新用户真实安装/连接仍待人工验收。
- 用户成品试用确认 Explore 工作会在重新进入/切工作区时丢失，且未显式选工程时会自动落到列表第一项或旧 Runtime 工程。下一业务小闭环调整为 [Phase 7 当前工程会话与 Explore 工作保存](PHASE_7_PROJECT_SESSION_BASELINE.md)，优先于真实双搜索验收。
- Phase 7 完成并由用户复测后，再在全新 Windows 用户环境人工验收安装授权→Secret 安全窗口→连接确认；随后经用户授权工程摘要执行真实 Diagnosis，有设备后执行确认后的修改、Build、Flash、Serial 与知识验证回写。
- `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 继续保留。UI、mock、软件门禁和最新 Windows 包都不能替代真实网络或实机证据。

## Phase 7：当前工程会话与 Explore 工作保存

- 7a 先建立失败回归：Explore 重新进入/切工作区丢状态、空工程自动选第一项、旧 Runtime 工程 fallback。
- 7b 建立 Main 受控 Project Session 与启动工程选择/创建门禁；每次冷启动必须由用户确认。
- 7c 将 App、BrowserPanel、Editor、Build/Flash/Serial、运行证据与 Explore Context/Handoff 统一到唯一 active project，并建立有副作用任务的切换门禁。
- 7d 将 Agent Conversation Store 升级为按工程隔离；工程切换同步切换会话列表、当前会话和持续上下文，旧全局对话保留为未归属历史。
- 7e 建立 `project-sessions/<projectId>/explore/{idea,diagnosis}/<sessionId>/` 历史目录，覆盖多次已完成、未完成、中断记录及 result/plan/confirm 状态。
- 7f 完成路径逃逸、跨工程隔离、requestId/task 归属、切换竞态、损坏 Store、Secret 隔离和全功能回归。
- 7g 重打 Windows 包并由用户验收返回、切页、重启、切工程、Agent 历史、编辑器、烧录目标和新建工程；通过前不恢复真实 Diagnosis 验收。
## Phase 1 已定位的最小工程范围

- 新增 `agent/skills/zhihu`，按用户 ZIP 原字节导入，不创建假 Skill。
- `skill-manager.ts`：标准目录 SKILL.md 部署保真，展示所需 multiline description 正确解析；旧扁平兼容保持。先回归证明当前 `>-` 和部署改写问题。
- `context.ts` / 产品 Agent 规则仅在确有冲突时最小区分官方 Skill 搜索与旧 browser 搜索；不改旧平台业务实现。
- 集成测试：真实目录、manifest/support hash、显式位置校验、Worker 加载指令、打包过滤器；不拿构造的 tool event 冒充真实 LLM 加载。
- 第一条实际官方调用必须是 `scripts/run.ps1 status`。若需 CLI 安装/升级则按官方明确授权规则停，不继续 Phase 2 绕开。

## Review / 第一性原理（2026-09-07）

没有第二套 Agent/IPC 执行系统，没有数据库预设或新云端。最可能导致“看起来成功”的错误是未确认修改、自由文本结果解析、来源伪造、mock 当硬件；将它们前置为可验证门禁。最大复用风险是旧 Chat 无权限隔离，因此不能先接 UI 再补安全。当前最简单可靠路线是官方 Skill → 可校验数据/受限执行契约 → 两条 UI 闭环 → 知识反馈 → 成品。
