# Phase 7：当前工程会话与 Explore 工作保存施工基线

日期：2026-09-10

状态：源码、专项回归和 Windows `win-unpacked` 已完成；实现提交为 `6d8187e4`，最终远端 hash 仍以动态查询为准。用户成品人工复测、真实双搜索 Diagnosis 与真机闭环仍待执行。

施工前备份：`origin/backup/pre-phase-7-20260910` → `8f28ca3d131ab315aed4f8205181737f9181568a`，已远端核对。

## 用户现场与代码根因

1. 用户完成一次找灵感分析，返回探索首页后再次进入找灵感，刚生成的结果消失；解问题具有同类风险。
2. `ExplorePanel` 的 Idea/Diagnosis 输入、请求、结果、Plan、Handoff 和执行阶段全部是组件内 `useState`。
3. `enter()` 每次进入 Idea 或 Diagnosis 都主动清空 analysis/result/request/plan/handoff 等状态；返回首页后再次进入必然丢失结果。
4. `BrowserPanel` 只在 `mode === 'explore'` 时挂载 `ExplorePanel`；切换右侧工作区会卸载组件，全部本地 Explore 状态丢失。
5. `BrowserPanel` 在 `projectDir` 为空且项目列表非空时自动执行 `setProjectDir(projectOptions[0].value)`；项目列表按名称排序，因此用户没有确认也会选中第一项。
6. Explore 的 `currentProject` 又回退到 `runtimeState.activeProjectDir`，会把之前 Build/Flash 的工程当成当前工程。这两条路径共同造成“没有选择却在旧项目执行”。
7. 当前 Agent `session-store.ts` 使用一个全局 `activeConversationId`，对话没有工程归属；只切换工程目录不足以隔离聊天历史和持续上下文。
8. 编辑器、Build/Flash/Serial 与 Runtime 事件目前存在各自保存路径或状态的入口；若只修改 Explore，下游仍可能使用旧工程或把旧证据展示给新工程。

## 产品结果

- 冷启动完成必要 API Key 首启门禁后，进入独立“选择工作工程”门禁；未确认工程前可以查看说明，但项目相关动作不可执行。
- 选择列表来自 Main 解析的 `getHardboardDir('projects')`。开发版对应仓库 Runtime，当前解压版对应 `resources/runtime/hardboard/projects`；Renderer 不拼接或信任绝对路径。
- 用户可选择现有工程，或输入安全名称创建新工程。创建只允许 projects 根目录的直接子目录；拒绝绝对路径、`..`、分隔符、符号链接逃逸、同名覆盖和 Windows 保留名。
- 新工程应生成最小可识别 ESP-IDF scaffold，而不是只有空目录：根 `CMakeLists.txt`、`main/CMakeLists.txt`、`main/main.c`。模板内容与 target 默认值在实现 Review 时固定，不自动 Build/Flash。
- 可以展示“上次使用”作为建议，但每次冷启动必须由用户点击确认；不得静默激活。
- 当前工程提升到 App/Main 可共享的单一状态，不继续由 `BrowserPanel` 私有持有。仓库/编辑器、任务 Build/Flash/Serial、Explore、运行事件过滤、Knowledge 关联及 Agent 会话/工程 Context 都消费同一个规范化 projectDir。
- 切换工程是一个原子状态转换：先检查未保存编辑、运行/排队 Agent、分析、Build、Flash 和 Serial 归属风险，再切换工程树、打开文件、Agent 会话列表、Explore 历史及任务/证据视图。任何子模块失败都不得留下“一半新工程、一半旧工程”的 UI。
- Skills、参考代码、全局知识列表仍是全局资源；“工作区都在当前工程”指项目读写和证据归属，不把全局资源复制到工程目录。

## 工程会话目录

状态存储在 Main 管理的 user-data 下，不写入安装包的 `resources/runtime/hardboard/projects`，也不默认污染用户源码目录。建议目录结构：

```text
userData/project-sessions/
  index.json
  <projectId>/
    manifest.json
    agent/
      conversations.json
      conversations/<conversationId>.json
    explore/
      idea/index.json
      idea/<sessionId>/session.json
      diagnosis/index.json
      diagnosis/<sessionId>/session.json
```

`projectId` 由 Main 注册并绑定规范化/realpath 后的工程目录，Renderer 不能构造。索引和会话文件版本化、限额并原子替换；损坏文件原样保留并显式报错，不静默覆盖。删除源码工程不得自动删除历史目录，历史可显示为“工程不可用”。未来若要导出或随工程迁移，必须另做显式导出，不能将包含上下文的私有记录自动写入 Git 工程。

## Agent 对话按工程隔离

- 每个工程有独立的对话列表与 active conversation；选择工程 A 只加载 A 的历史、消息、附件引用和持续上下文，切到 B 后全部切为 B，切回 A 可恢复。
- 现有全局 Conversation Store 升级时不得丢数据。无 projectId 的旧对话进入“未归属历史”，默认只读且不进入任何工程 Context；用户未来可显式归属或复制到某工程。
- 新建对话必须绑定当时的 projectId/projectDir 快照。发送消息、追加消息、恢复会话和 Worker 任务都在 Main 再校验当前工程与会话归属，不能只靠 Renderer 筛选。
- 若当前工程存在活动/排队 Agent 任务，切换不得重定向任务；默认阻止切换并说明原因，后续可设计显式等待/取消，但不得静默迁移。
- Agent 的项目级缓存/续聊标识、附件读取权限和结果回写随会话归属切换；Skills 和产品帮助仍为全局资源。

## Explore 历史与工作会话

找灵感和解问题不是每种模式一个覆盖式 JSON，而是各自有历史索引和多个 `sessionId` 目录。新建探索创建新目录；继续使用更新原目录；历史列表能区分标题/摘要、更新时间、当前阶段、完成/未完成/中断状态。用户明确删除一条历史时只删除对应会话，不删除 Knowledge 或其他模式记录。

会话归属：`projectId + mode + sessionId`。Idea 与 Diagnosis 完全分离，切换工程加载对应工程历史；每种模式记住该工程最后打开的 session，但不能覆盖其他历史。

最小保存字段：

- `mode`、`projectDir`、`updatedAt`、当前 stage/status；
- goal/problem、已选择 Context ID 与历史知识 ID；
- analysis request/requestId、结构化 result、来源；
- selectedIdeaId、Handoff、plan requestId/result；
- execution disposition/taskId；
- notice/error 的安全摘要，不保存 Secret、原始受限输出或未选 Context。

状态至少区分 `draft / analyzing / result_ready / planning / awaiting_confirmation / execution_queued / interrupted / error`。页面返回和工作区切换只改变可见视图，不清除业务会话。用户点击“新建探索/清除本次工作”时二次确认并清除当前工程当前模式；不得连带删除 Knowledge。

分析和 Plan 结果必须继续校验 requestId、mode、projectDir/Handoff 绑定。组件卸载时 Main/Worker 任务继续；重新挂载从 Store 恢复并接收后续结果。应用进程重启后若 Store 显示 pending 但 Worker 没有对应活动/排队任务，转换为 `interrupted` 并提供显式重试，不自动重新发起搜索或消耗额度。

## 实现分层与预计文件

- Common：新增/扩展 Project Session、工程归属 Conversation、Explore History/Work Session 类型、schema 与运行时 normalize。
- Main：新增受控项目会话/创建服务和 project-sessions 目录 Store；升级 `worker/session-store.ts`，复用 `getHardboardDir`、`getUserDataPath`、原子写入模式，不新建云服务或数据库。
- Gateway/Preload：只暴露窄 IPC，例如项目启动状态、选择、创建，按工程列出/打开 Agent 与 Explore 历史，以及 Explore session save/delete；Main 再校验全部输入。
- App：持有启动工程门禁和唯一 active project；每次冷启动要求明确确认。
- BrowserPanel/Editor：删除“空值自动选第一项”和 `runtimeState.activeProjectDir` 兜底；工程树、文件 tab 与所有项目动作使用 App 提供的 active project，并处理未保存文件切换确认。
- ChatPanel/Worker：对话列表、active conversation、任务与持续上下文按 projectId 隔离；完成旧全局 Store 的保留式迁移。
- ExplorePanel：提供当前工程的 Idea/Diagnosis 历史列表，从选定 session 初始化/保存；`enter()` 不再清空已有会话；提供继续、新建和删除操作。
- Runtime/Hardboard/Context：把 active project 绑定进 Build/Flash/Serial、运行事件和 Explore request，不以自由文本或旧 runtime 状态猜工程。
- 测试与文档：新增项目门禁、路径反例、跨导航/重载/重启恢复、异步归属和跨工程隔离专项；更新现有 smoke stub。

## 施工顺序

1. Phase 7a：先写失败回归，证明重新进入/切工作区丢状态、自动选择第一工程和旧 Runtime fallback。
2. Phase 7b：实现 Main Project Session、项目列表/创建/显式激活与 App 启动门禁。
3. Phase 7c：将 BrowserPanel、Editor、Build/Flash/Serial、Explore Context 与事件过滤改为唯一 active project，并实现原子切换门禁。
4. Phase 7d：升级 Agent Conversation Store，完成按工程会话隔离、旧历史保留式迁移与 Worker 归属校验。
5. Phase 7e：实现工程会话目录、Idea/Diagnosis 多历史、恢复/删除和 interrupted 语义。
6. Phase 7f：Review 项目切换竞态、任务/requestId 归属、Store 损坏、Secret/日志边界并修根因。
7. Phase 7g：专项、Electron/Runtime build、布局/首启/打包回归；完成后再重打 Windows 包并人工试用。

## 强制验收

- 冷启动不操作项目选择时，`activeProjectDir === null`；Build、Flash、Explore 提交和 Agent 工程任务均不可执行。
- 现有项目只有用户点击确认后激活；创建项目只发生在 Main 解析的 projects 根目录内。
- 上次 Runtime 工程、项目列表第一项、Editor 最近文件都不能隐式成为当前工程。
- 工程 A/B 分别拥有自己的仓库树、编辑器 tab、Agent 对话列表和 active conversation；切换后不显示、不注入另一工程历史，切回能恢复。
- 旧版全局 Agent 对话迁移后仍可在“未归属历史”查看，且不会自动关联任一工程。
- Build、Flash、Serial 命令和 Runtime 证据必须携带当前工程归属；切换后不得继续显示为新工程结果或向旧/新工程静默改绑。
- 找灵感结果在“返回首页→再次进入”、切换仓库/监视器/任务/编辑器再返回后仍存在。
- 解问题的输入、Context 勾选、相关知识选择、Diagnosis、Plan/Handoff 同样保留。
- Idea/Diagnosis、工程 A/工程 B 状态互不覆盖；每个模式可保存并重新打开多条已完成/未完成/中断历史，切回后恢复各自最后会话。
- Renderer reload 和应用重启可恢复已保存工作；无法恢复的运行中任务显示 interrupted，不自动重试。
- 切换工程时若存在未保存编辑、运行/排队分析、Agent、Build、Flash 或 Serial 归属风险，必须阻止或显式处理，不允许静默重绑。
- Secret 不进入新 Store、Renderer IPC 参数、日志、URL、截图或包；历史知识仍需用户主动选择才进入 Context。
- 现有 Explore、Connection、Knowledge、Handoff、Agent Queue、Runtime、Hardboard 功能全部回归通过。

## 本轮边界

本提交只允许 Product Truth、Decision、施工计划、测试指标、接力和日志文档；不修改 TypeScript/LESS/CJS、不运行真实搜索、不创建用户工程、不执行 Build/Flash/Serial。后续源码施工必须由用户确认后开始。

## 未验证

- 真实双搜索 Diagnosis：`LIVE_DIAGNOSIS_PENDING`。
- 真实开发板闭环：`REAL_HARDWARE_VALIDATION_PENDING`。
- Phase 7 用户成品人工复测：`NOT VERIFIED`。自动化已验证冷启动无默认工程、显式激活、工程 A/B 会话隔离、Explore 多历史及 interrupted 恢复、返回/切工作区保持、Build/Flash/Serial 路径门禁。

## 2026-09-10 实施结果

- Main 已建立唯一 Project Session：工程列表、受控新建、显式激活、规范路径/realpath 校验和活动任务切换门禁均在 Main；Renderer 不再以项目列表第一项或旧 Runtime 状态猜测当前工程。
- App 在 API Key 门禁之后显示独立工程选择窗口；每次冷启动 `activeProject === null`，上次工程只作为建议。编辑器未保存内容会阻止切换；切换后仓库树、编辑器 tab、Runtime/Serial 视图按新工程重置或过滤。
- Agent conversation store 已按 `projectId` 隔离；旧全局历史一次性保留为“未归属 · 只读”，不会自动进入任何工程上下文。Worker、Explore Plan 和确认执行均再次校验工程归属。
- Explore Idea/Diagnosis 使用 `project-sessions/<projectId>/explore/<mode>/<sessionId>/session.json` 多会话目录；输入、用户主动选择的 Context/Knowledge、结果、Plan、确认状态和 request/task 归属可恢复。返回首页或切换工作区不清空；重启后无法续接的 pending 工作显示 `interrupted`，不会自动重试。
- Workbench 文件读写与 Build/Flash/Serial 使用 Main 当前工程；跨工程、符号链接逃逸和无当前工程请求被拒绝。Knowledge 仍为全局资源，历史知识仍只有用户主动选择后才进入 Context。
- 最新包位于 `electron/dist-package/win-unpacked`，版本 `1.0.0.7201`，总计 4,464,648,810 字节。发布校验确认 DeepSeek/Qwen Key 均未入包。
