# Phase 18：Claude Code CLI 供应商切换纠偏

日期：2026-09-13（Asia/Shanghai）

施工分支：`model-ccswitch`

本地施工基线：`e745ac384182dca3e1a7d4061966d7a4f133993f`

本地恢复点：`backup/pre-phase-18-claude-provider-switch-20260913`

远端状态：已执行 `git fetch origin`，`origin/model-ccswitch` 为 `1390cad1`；本地 Phase 17 实现提交 `e745ac38` 尚未推送。恢复标签尚未推送，记 `REMOTE_BACKUP_PENDING`，不得宣称远端已包含本基线。

上游参考：[CC Switch](https://github.com/farion1231/cc-switch)、[Claude Code 供应商切换说明](https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/zh/2-providers/2.2-switch.md)、[Claude 供应商映射源码](https://github.com/farion1231/cc-switch/blob/main/src-tauri/src/provider.rs)、[MIT License](https://github.com/farion1231/cc-switch/blob/main/LICENSE)。本 Phase 只借鉴 Claude Code CLI 供应商切换的产品语义与配置字段，不复制 Codex、Gemini、MCP、提示词、数据库、导入导出或其他模块，也不直接复制上游源码。

## 1. 验收结论与根因

用户已明确判定 Phase 16 的“切换模型”未通过人工验收。此前自动化通过只能证明旧实现内部自洽，不能覆盖本次人工结论。

当前实现存在三层语义偏差：

1. 产品真实执行器是随应用交付的 Claude Code CLI，但模型页展示的是 Catnip 自定义的“供应商 → 模型档案 → 用途能力 → 会话选择”，用户需要理解内部抽象后才能配置。
2. Chat 下拉框保存 `modelProfileId`，任务创建时再把档案翻译成 `ANTHROPIC_*` 环境变量；这表现为“每个会话换模型”，而不是 CC Switch 式“启用一个 Claude Code 供应商”。
3. Main 强制使用应用独立的 `CLAUDE_CONFIG_DIR`，同时只在启动子进程时临时注入 Base URL、Token 和单一 Model；模型页没有把当前启用项呈现为 Claude Code CLI 的全局运行配置，也没有 Haiku/Sonnet/Opus 角色映射，用户无法确认切换是否真正生效。

因此 Phase 16 中“Agent 会话模型选择已完成”的表述属于文档漂移，必须由本 Phase 覆盖。旧实现保留为迁移证据，不再作为目标产品逻辑。

## 2. 本 Phase 唯一目标

“模型”工作区只面向 Catnip 实际使用的 Claude Code CLI，提供类似 CC Switch Claude Code 页的供应商管理和一键启用：

- 用户维护多个 Claude Code 兼容供应商；
- 每个供应商配置名称、Base URL、鉴权变量类型、主模型以及可选的 Haiku/Sonnet/Opus 模型映射；
- 用户点击“启用”后，它成为应用级唯一活动 Claude Code 供应商；
- 下一次新建的 Agent / Explore 任务读取该活动供应商快照；已经运行或入队的任务继续使用创建时快照，不被中途改绑；
- Chat 只显示当前活动供应商和主模型，不再提供按工程或按会话选择模型的下拉框。

软件助手和图片理解仍可保留现有内部 OpenAI-compatible 默认配置，但不混入“Claude Code 供应商”页面，不得让用户误以为它们也是 Claude Code CLI 的切换对象。

## 3. 与 CC Switch 对齐及安全差异

CC Switch 的 Claude Code 模式通过切换 Claude 配置中的 `env` 项生效，核心字段包括：

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN` 或 `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`

Catnip 保持同一供应商/角色映射语义，但因既有 Product Truth 禁止 Secret 进入普通配置文件，作如下安全适配：

- 应用独立的 `CLAUDE_CONFIG_DIR/settings.json` 只原子合并非敏感 Base URL 和模型映射；保留未知顶层字段、权限和其他非敏感 `env` 项；主动移除磁盘中的两种鉴权值。
- 真实 API Key 继续由 Main 原生遮罩窗口写入 Windows `safeStorage`，只在启动 Claude Code 子进程时按供应商选择注入 `ANTHROPIC_AUTH_TOKEN` 或 `ANTHROPIC_API_KEY`。
- Renderer、Preload 返回、日志、任务快照和会话文件只包含 `configured` 状态与非敏感供应商快照。

这不是重新实现 Claude API，也不修改 Claude Code CLI；Main 只管理 CLI 已支持的配置环境。

## 4. 数据与迁移契约

现有配置升级为版本化契约，并新增：

- `activeClaudeProviderId`：应用级唯一活动供应商；
- 供应商 `claudeCode` 配置：`authField`、`primaryModel`、可选的 `haikuModel`、`sonnetModel`、`opusModel`；
- 只有启用、包含 `anthropic-compatible` 且 Claude Code 字段完整的供应商可以激活；激活前必须已有安全凭据；
- DeepSeek 旧工程 Agent 默认模型迁移为 DeepSeek Claude Code 供应商的主模型，旧安全凭据引用不变；
- 旧 `modelProfileId` 会话字段只为历史兼容读取，不再影响新任务，也不主动删除历史；
- 软件助手/视觉模型档案继续保留，避免升级破坏既有功能。

不得以“OpenAI-compatible”推断 Claude Code 兼容。自定义供应商由用户明确按 Claude Code/Anthropic-compatible endpoint 配置；没有真实联网证据时只显示“配置完整，尚未在线验证”，不能显示“连接成功”。

## 5. 运行与切换时序

1. 用户编辑供应商并保存非敏感配置。
2. 用户通过原生安全窗口配置或替换凭据。
3. 用户点击“启用”；Main 重新读取并校验 revision、供应商、Claude Code 字段和凭据状态。
4. Main 更新唯一 `activeClaudeProviderId`，将非敏感字段合并到应用专用 Claude `settings.json`，再返回活动快照。
5. Task 提交时 Main 只从活动供应商生成非敏感快照；任务入队后切换供应商不会改写该快照。
6. Worker 真正启动任务时才从 `safeStorage` 解密相应凭据，构建完整 Claude 子进程环境，并清除父进程可能继承的全部 `ANTHROPIC_*` 供应商字段。
7. 进程复用键必须包含供应商、Base URL、鉴权字段和全部模型映射；下一个任务若配置不同，旧空闲 Agent 进程退出并按新供应商重启。

任何一步失败都显式报告，禁止回退到 DeepSeek、父进程环境或另一付费供应商。旧 Key 文件只保留既有非破坏迁移兼容，不成为切换失败后的静默兜底。

## 6. UI 验收结构

模型页改名为“Claude Code 供应商”，界面只保留完成任务所需信息：

- 左侧供应商卡：名称、当前/未启用、凭据已配置/未配置；
- 主编辑区：名称、Base URL、鉴权字段、主模型；“高级模型映射”折叠显示 Haiku/Sonnet/Opus；
- 明确的“保存更改”和“启用此供应商”两步，未保存或缺凭据时按钮给出直接原因；
- 当前活动供应商置顶显示，并说明“对下一次任务生效；运行中任务不会改变”；
- 不再展示协议复选框、用途能力、模型档案列表和 Chat 会话模型下拉。

人工验收至少覆盖：第一次添加自定义供应商、保存、配置凭据、启用、回到 Chat 查看当前供应商、创建下一任务、切回另一供应商、重启后活动状态仍一致。

## 7. 分层边界

- Renderer：只编辑非敏感 Claude 供应商元数据并触发保存、凭据维护和启用；不取得 Secret，不选择任意环境变量名。
- Preload：提供 list/save/configure/delete/activate 的窄 IPC；`authField` 只能是两个固定枚举。
- Main：配置 schema、迁移、revision、系统凭据、启用校验、Claude settings 合并与任务快照唯一所有者。
- Worker/Agent：只消费 Main 为任务冻结的活动供应商快照和运行时凭据；不得读取 Chat 旧 `modelProfileId` 决定供应商。
- Claude Code CLI：继续使用现有打包二进制、现有 MCP/Skill/权限模式，不修改上游 CLI。

## 8. 施工顺序

| 小项 | 修改范围 | 验收门禁 |
| --- | --- | --- |
| 18a 文档纠偏 | Product Truth、Decision、约束、计划、分层、接力、测试、本文 | 文档独立提交；明确 Phase 16 人工未通过和远端状态 |
| 18b Schema/Store | `common/model-config`、Main store、迁移 | v1→v2、活动项、角色映射、非法 authField、损坏/并发/重启 |
| 18c CLI 配置与运行 | settings 合并、Agent snapshot/env、Worker/Gateway | 无 Secret 落盘；保留未知设置；任务冻结；无 fallback；全部角色变量 |
| 18d 窄 IPC 与 UI | management/preload/types/ModelPanel/ChatPanel/styles | 添加→保存→配 Key→启用路径；Chat 只读活动状态；无旧下拉 |
| 18e Review/测试 | 专项、安全扫描、typecheck/build、真实 Electron UI | 自动化全通过；真实付费调用与完整包状态单列 |
| 18f Git 收尾 | 文档、精确暂存、Commit/Push、远端核对 | 不纳入未跟踪用户目录；失败明确记录 |

## 9. 测试矩阵

- Config：v1 默认迁移、已有自定义供应商迁移、唯一活动项、字段长度与 HTTPS、authField 枚举、角色映射、revision 冲突、损坏文件保留。
- Activate：供应商不存在/停用/非 Claude compatible/缺凭据拒绝；成功后活动项重启恢复；并发旧 revision 拒绝。
- Settings：不存在时创建；保留 `permissions`、未知顶层字段和普通 env；删除磁盘鉴权值；写入 Base URL 和四类模型；写入失败显式报错。
- Runtime：父进程六类 `ANTHROPIC_*` 被清除；按 authField 注入唯一 Secret；不同供应商不复用进程；快照/日志无 Secret；无活动项或凭据损坏拒绝。
- Session：旧 `modelProfileId` 可读取但新任务忽略；切换只影响切换后提交的任务；不跨工程改写历史。
- UI：1280×720、1600×1000、1707×1067、150% 缩放；键盘焦点；新增/保存/配置/启用提示；活动项和 Chat 指示一致；旧协议/用途/会话下拉不可见。
- 基线：`verify:model-*`、session/task queue、secure startup、Chat、Explore、Electron typecheck/Main/Renderer build、Runtime typecheck、`git diff --check`。

离线测试使用虚构 URL、虚构 Key 和注入 cipher，不调用真实付费 API。只有用户明确授权并提供可用供应商后才做真实 Claude Code 请求；未执行时记 `LIVE_CLAUDE_PROVIDER_VALIDATION_PENDING`。本 Phase 不涉及硬件，继续保留 `REAL_HARDWARE_VALIDATION_PENDING`。

## 10. 非目标与停工条件

不引入 CC Switch 的 SQLite、系统托盘、代理、测速、用量统计、导入导出、Codex、Gemini、MCP、提示词管理或云同步；不直接运行或嵌入 cc-switch 应用；不修改官方 Zhihu vendor；不新增第二套 Agent/Skill/任务系统。

若必须把 Secret 写入 Renderer 或普通 `settings.json`、必须改造 Claude Code 上游协议、迁移会覆盖用户配置、或无法证明某 endpoint 是 Claude Code compatible，则停止扩展并明确报告。
