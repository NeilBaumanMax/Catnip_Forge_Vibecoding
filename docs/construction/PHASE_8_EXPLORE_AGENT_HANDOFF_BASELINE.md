# Phase 8：工程内会话、独立 Explore Agent 与交接材料施工基线

日期：2026-09-10

状态：用户已确认产品行为；本提交只建立施工范围、目录契约、风险和验收，不修改业务源码。

施工前备份：`origin/backup/pre-phase-8-20260910` → `050ae64d8415406068518136d6d9be0873921ac7`，已通过 `git ls-remote` 核对。目标分支 `origin/idea_to_production` 同为该提交。

## 用户现场与代码根因

1. Phase 7 已做到工程切换时加载不同 Agent 会话，但 `session-store.ts` 实际写入 Electron `userData/project-sessions/<projectId>/agent/conversations.json`，不满足“会话统一保存在对应项目文件夹”的新要求。
2. Explore 分析和计划虽然使用受限执行档位，却默认取得左侧工程 Agent 的 active conversationId；Orchestrator 的过程消息仍发送到 `chat:message`，Gateway 会把它们写进左侧工程 Agent 对话。
3. Explore session 当前只保存输入、Context、结构化结果和任务 ID，没有独立、可查看的 AI 对话时间线。
4. 四阶段导航只显示派生出来的当前进度，不能点击回看。第三阶段只在内存/Explore session 中保存 Handoff 与 Plan，没有在工程目录生成交接材料；第四阶段不能展示工程内材料后再确认提交。
5. 来源操作按钮当前最小高度 28px、字号 10px，收藏与打开原文层级过弱；Idea 主按钮在不同卡片高度下缺少稳定操作区，截图中出现尺寸和对齐混乱。

## 工程内目录契约

每个被激活工程由 Main 管理以下目录，不在 Renderer 拼接路径：

```text
<project>/.catnip/
  manifest.json
  agent/
    conversations.json
  explore/
    idea/<sessionId>/session.json
    diagnosis/<sessionId>/session.json
  handoffs/
    <sessionId>/
      handoff.json
      PLAN.md
      HANDOFF.md
```

- `agent/` 是左侧工程开发 Agent 的会话和持续上下文；切换工程必须原子切换。
- `explore/` 是独立 Explore Agent 的草稿、四阶段状态、结构化结果和对话时间线；不得进入左侧工程 Agent 对话列表。
- `handoffs/` 是 Explore 第三阶段生成、第四阶段展示并提交给工程 Agent 的材料。JSON 用于程序绑定，Markdown 用于用户和工程 Agent 阅读。
- Main 校验 `.catnip` 必须位于当前工程真实路径内，使用原子写入、大小/数量上限和 schema；拒绝符号链接逃逸、跨工程 ID、Secret、未选 Context 和无界原始输出。
- 旧 `userData/project-sessions/<projectId>/` 数据只做一次性保留迁移：目标不存在时复制到当前工程 `.catnip`，成功后保留旧源作为可恢复备份，不静默覆盖工程内新数据。

## Explore Agent 与四阶段行为

1. **描述**：保存草稿和用户主动选择的 Context/Knowledge。
2. **查看结论**：保存 Explore Agent 的用户输入、过程状态、安全摘要、结构化结论和来源；不写入左侧工程 Agent chat。
3. **确认计划**：Explore Agent 只读生成 Plan 后，由 Main 在当前工程 `.catnip/handoffs/<sessionId>/` 原子写入 `handoff.json`、`PLAN.md`、`HANDOFF.md`；该阶段仍不得修改业务源码或调用 Build/Flash/Serial。
4. **执行**：页面从 Main 重新读取并展示工程内交接材料。用户点击明确的“确认提交给工程 Agent”后，Main 校验 projectId、sessionId、handoffId、planRequestId、材料摘要和一次性/过期门禁，再把材料交给左侧当前工程 Agent 的新执行任务。

四个阶段在已产生相应数据后都可以点击回看；未来阶段保持禁用。切换只改变展示阶段，不删除结果、不重复搜索、不重复生成计划、不消耗额度。执行中的任务仍归属原 request/task/session，不能因阶段切换重绑。

## 独立 Explore 对话

- 每条 Idea/Diagnosis session 拥有自己的 `conversation` 数组，至少保存 role、kind、text、安全时间、requestId/taskId；数量和单条长度有上限。
- 输入、分析开始/完成/失败、计划开始/完成/失败、交接材料写入和确认提交形成清晰时间线。
- 只保存用户输入、产品生成的安全状态和已经通过 schema 的结构化结果摘要；不保存 Access Secret、CLI stdout/stderr、未选 Context、Agent 原始受限输出或完整网页正文。
- Explore 事件使用独立 IPC 通道；左侧 `chat:message`、Agent conversation store 和 active conversation 不消费受限 Explore 消息。

## UI 修正

- Idea 卡片采用内容区 + 固定底部操作区；同一行按钮统一高度、内边距、字重和圆角，卡片内容高度不同也不拉伸主按钮。
- “打开知乎原文/打开 Web 原文”与“收藏/已收藏”使用明确文字和色彩层级及至少 36px 高的命中区域；收藏状态不能仅靠细小绿色文字表达。
- “用这个方向生成计划”保持唯一主操作，但使用内容自适应宽度和统一高度，不随整列宽高畸变。
- 阶段导航变为可交互 stepper，明确 current/complete/available/disabled 状态，支持键盘焦点、`aria-current`、禁用说明和即时按压反馈；遵守 reduced-motion。

## 实现范围

- Common：扩展 Explore session conversation、displayStage、handoff artifact 类型与运行时边界。
- Main：工程 `.catnip` 路径服务、旧 userData 保留迁移、Explore artifact writer/reader；Agent/Explore store 改为工程内路径。
- Worker/Gateway/Preload：Explore 独立事件通道；计划完成后写材料；确认时从磁盘材料校验并提交到当前工程 Agent。
- Renderer：独立 Explore 对话记录、可切换四阶段、第四阶段材料预览、明确确认提交；来源与 Idea 操作区视觉修正。
- Tests：工程内目录与迁移、跨工程拒绝、Explore 不污染 Agent、四阶段回看、材料生成/篡改/错配拒绝、按钮尺寸与布局矩阵。

## 强制验收

- 工程 A/B 的左侧 Agent 对话分别只存在于各自 `<project>/.catnip/agent/`，切换后不串话，切回可恢复。
- 每条 Explore 历史拥有独立对话与草稿；同工程不同 session、Idea/Diagnosis、跨工程互不覆盖。
- Explore 分析/计划的过程消息不会新增或改写左侧工程 Agent conversation。
- 四阶段已到达步骤可随时切换；回看不重新执行网络、模型或硬件动作。
- 第三阶段生成三份工程内交接材料；第四阶段展示的是重新从磁盘读取的材料，而不是只显示 Renderer 内存对象。
- 未确认、材料被篡改、工程/会话/Handoff/Plan 错配、过期或重复确认全部由 Main/Worker 拒绝。
- 确认后只进入既有工程 Agent 队列，不新增第二套 Agent/Task 系统。
- Source 操作按钮最小高度 36px，Idea 主操作统一高度且不拉伸；wide/normal/compact 与 light/dark 无溢出、无控制台错误。
- Secret、未选 Context、无界原始输出不进入 `.catnip`、Renderer、日志、URL、截图或包。

## 本轮边界与未验证

本基线提交不运行真实搜索、模型、Build、Flash、Serial 或打包。实现完成前继续保留 `LIVE_DIAGNOSIS_PENDING`、`REAL_HARDWARE_VALIDATION_PENDING`；Phase 8 成品人工体验标记为 `NOT VERIFIED`。
