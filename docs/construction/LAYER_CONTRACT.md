# Layer Contract

依据当前源码核实后确定责任。知识 Store、安全连接、首次使用安装/Secret 向导、固定搜索桥、受限分析/计划、结果 UI、Handoff、有界 Context 与一次性确认执行门禁已实现；真实知乎“找灵感”和最新 Windows 包软件门禁已验收，真实知乎＋全网排障、全新用户连接和硬件仍待验收。

| 层 | 责任与复用入口 | 禁止 |
| --- | --- | --- |
| Renderer | 启动工程选择/创建意图、探索两个入口与历史、Agent/编辑器/任务工程视图、Context 勾选、结果与确认操作；复用 BrowserPanel/ChatPanel 设计 | 自行拼接/信任工程绝对路径、Secret 输入/传输、知乎 HTTP、任意 shell/文件、直接 Hardboard、独立 Agent |
| Preload / Gateway | 现有显式 IPC 白名单与 Main 注册；校验输入、ID、来源、选择、确认归属 | 暴露任意命令执行、路径读取或 Secret IPC |
| Main | Project Session 单一真相、工程注册/创建、按工程 Agent/Explore 目录、原子切换门禁、用户数据、受控 Context 与桥接；paths/workbench/serial controller | 自动选择第一/旧工程、跨工程会话注入、重写官方 CLI auth、把计划提示当程序授权 |
| Worker / Agent | 绑定 projectId/projectDir 的对话、任务、检索、证据综合、结构化返回、现有 taskId/queue 的计划及执行 | 第二套队列/Agent、任务静默改绑、跨工程续聊、未确认写文件、来源伪造、自由文本猜测关键状态 |
| Skill Manager | 标准 Skill discovery、完整 support tree、部署、@引用；源官方字节保留 | 修改 vendor 协议；在发现目录存同名备份 |
| Official zhihu | search zhihu/global；官方脚本 status/setup、CLI 生命周期与系统凭证 | 宿主自写等价 API；默认引入其他官方能力 |
| Runtime MCP | 既有 ESP-IDF、Build、Flash、Serial、snapshot、EventBus/任务进程 | 知乎搜索、LLM 判断、将 build 当 runtime success |
| Local Knowledge Store | 主动收藏、摘要/引用、项目关联、验证记录、最小相关发现 | 全文镜像、OAuth、自动注入、无证据有效标记 |

## 跨层不变量（必须测试）

1. 无效输入在 Main/Worker 拒绝，不能只靠 UI disabled。
2. Explore/Plan 写文件及硬件副作用拒绝；确认与具体 Handoff/计划版本、任务绑定，取消/过期不得重用。
3. Result 来源保留 URL/标题/作者/片段；无法校验的 Result 不直接进入执行。
4. Context 候选与已选择集合分离；用户取消的源码/日志/知识卡不得进入 Agent 输入。
5. 真实工具结果按 task/project/time 关联；完成消息不能替代 Build/Flash/Serial 证据。
6. 本地知识写入不覆盖未知损坏数据；只保存任务摘要和验证记录。
7. CLI stdout/stderr、提示词、日志无 Secret；连接凭证走官方系统存储，不能经现有会记录全文的 chat:send 输入。
8. 冷启动未明确确认工程时，active project 必须为空；Editor 写入、Explore 提交、Agent 工程任务、Build 与 Flash 在 Main/Worker 拒绝。
9. 工程切换必须同步仓库/编辑器、Agent conversations/context、Explore histories、Build/Flash/Serial 目标和事件过滤；活动/排队任务或未保存编辑不能静默改绑。
10. Agent 与 Explore 记录必须带 Main 签发的 projectId。找灵感/解问题按 mode/sessionId 分目录保存多次历史；旧全局 Agent 对话只能进入未归属历史，不能自动注入。

## 2026-09-10 Phase 7 工程会话边界

- `hardboard/projects` 根目录只能由 Main 的路径服务解析；Renderer 只提交工程 ID 或安全新工程名称，Main 校验 lexical path、realpath、符号链接、保留名和直接子目录边界。
- project-sessions 位于 Main user-data，不写入安装资源或默认污染源码工程。目录索引、Agent 对话和 Explore session 文件版本化、限额、原子替换并保留损坏证据。
- Project Session 激活是原子转换；消费者不能各自保存另一份权威 projectDir。Runtime 最近工程只能作为历史证据，不能成为启动选择 fallback。
- Agent conversation、Worker task、Explore request/plan/handoff、Build/Flash/Serial task 都必须绑定 projectId/projectDir 快照；迟到结果只能回到原工程记录。
- 本节已由 Phase 7 源码和专项自动化落地；打包版冷启动工程门禁与 Chat UI 已验证。用户成品人工复测仍不得用自动化替代。

## 2026-09-10 Phase 8 工程内状态与交接边界

- 用户新确认的 Phase 8 要求覆盖 Phase 7“project-sessions 只位于 userData”的旧目标；新目标为 `<project>/.catnip/{agent,explore,handoffs}`，路径只由 Main 从 active project 解析并校验。
- 左侧工程 Agent 与 Explore Agent 复用同一 Worker/模型基础设施，但拥有不同 conversation store 和 Renderer 事件通道；复用基础设施不等于共享对话。
- Explore 第三阶段只允许 Main 写 `.catnip/handoffs/<sessionId>/` 的结构化交接与 Markdown 计划，不开放任意工程写权限。
- 第四阶段必须重新读取磁盘 artifact 并校验摘要；Renderer 内存对象、按钮 disabled 或自然语言提示都不能充当确认授权。


## 2026-09-07 知识底座程序边界

- Renderer 只能经 preload 请求 list/save/addVerification/findRelated/selectForContext。
- Main 对 IPC 输入执行运行时校验；整篇正文和未知字段不会写入知识卡。
- findRelated 只发现候选；selectForContext 必须收到用户明确选择的 card ID。
- 磁盘 JSON 语法或卡片结构损坏时保留原文件并报错，不自动覆盖。

## 2026-09-08 Request 准备程序边界

- Renderer 经 preload 提交共享 `ExploreRequest`；Main 必须再次运行时校验。
- Main 只保留 `selected=true` 的 Context；取消项不得返回给后续分析输入。
- 找灵感声明知乎必需、全网按需；解问题声明知乎与全网均必需。
- `explore:request:prepare` 不执行搜索、Agent、文件写入、Build、Flash 或 Serial。准备成功不等于已产生 Idea/Diagnosis。

## 2026-09-08 官方能力与凭证边界

- CLI 缺失或不兼容时，Renderer 只提供显式安装授权动作；Main 固定调用官方 setup 并对并发请求去重。CLI 可用但缺 Secret 时，每次进入探索最多自动弹一次安全窗口，取消后不由轮询重复弹出。

- Renderer 只触发零参数连接动作；Main 打开固定个人中心并启动独立遮蔽输入窗口，凭证只经官方 CLI stdin 写系统凭证库。
- Main 固定搜索桥只允许 `search zhihu` / `search global`，不开放热榜、直答、本人数据、官方知识库、额度查询或 OAuth。Access Secret 已通过独立宿主窗口配置并由官方 CLI 验证；真实知乎“找灵感”已通过，`search global` 留待真实排障 Demo 验收。
- Catnip 的 `userData/explore/knowledge.json` 是本地知识卡 Store，不是知乎官方 Knowledge Base。
## 2026-09-08 Phase 3a 只分析程序边界

- Worker 队列项显式携带 `default` 或 `explore_analysis`，不能从自然语言推断；跨档位追加被拒绝，排队保持原档位。
- Agent 进程按档位隔离。`explore_analysis` 使用 `--bare`、`--permission-mode plan`、`--strict-mcp-config`、空 MCP 配置和仅 `Skill` 工具白名单，不携带 `--dangerously-skip-permissions`。
- Worker 对受限任务只允许观察 `Skill`；任意文件读取/写入及其他工具调用立即失败。普通模型文本、工具结果和非法 JSON 不进入 Renderer。
- 只有 schemaVersion=1、requestId/mode 与活动请求一致、灵感含知乎来源、排障每个假设同时含知乎与 Web 来源的对象，才进入内部 `explore:analysis:result`。
- CLI JSON schema 模式的 `structured_output` 由 `ChatBuffer` 显式保留；默认 Chat 的 `result` 文本语义不变，不从文本或代码围栏猜测对象。
- preload/Renderer 已消费合法结构化结果；DeepSeek 真实计划与真实知乎 Idea 输出均已通过。Diagnosis 的知乎＋全网双来源仍未验收，不能用软件门禁或找灵感结果替代。
## 2026-09-08 Phase 4a 有界 Context

- Main 只接受 Hardboard projects 内且包含顶层 `CMakeLists.txt` 的工程；同时检查 lexical path 与 realpath，跳过符号链接及 `.git`、`build`、`node_modules`、`managed_components`、`dist*`。
- 深度最多 5，源码候选最多 6，单文件真正定长读取最多 8 KiB，总计最多 32 KiB；每个传给共享 Domain 的摘要仍受 2,000 字符限制。
- Runtime 只保留最近 24 小时且归属同一工程的 `hardboard.build.*` / `hardboard.flash.*`，最多 40 条；共享串口最多 40 条并标明未证明项目归属。
- Runtime/串口读取失败只产生可见警告，不丢弃已取得的工程证据；Context 收集完成前诊断提交禁用，取消项继续由 Main prepare 剔除。

## 2026-09-12 Phase 16 模型与凭证边界

- Renderer 只持有模型配置的非敏感字段和 `configured` 状态；API Key 与 Access Secret 不得跨 preload 返回。
- Main 是模型配置 schema、原子 Store、系统凭据引用、用途兼容校验和任务模型快照的唯一所有者。
- Agent/Worker 只消费 Main 为本次任务解析的运行配置；模型档案按工程/会话选择，运行任务不受随后默认值变化影响。
- Zhihu 替换、验证和退出继续由 Main 编排 vendor `scripts/run.* auth` 命令；Renderer 不接触 CLI 参数或标准输入。
- 任何协议在没有适配器与专项测试时不得标为工程 Agent 可用；失败不得静默 fallback 到另一模型。

## 2026-09-13 Phase 18 Claude Code 供应商切换边界

- 本节覆盖 Phase 16 的按会话模型选择：Renderer 不再为 Chat 写入 `modelProfileId`，Main 从应用级唯一活动 Claude Code 供应商为新任务签发快照。
- Renderer 只维护名称、HTTPS Base URL、固定鉴权类型、主模型及 Haiku/Sonnet/Opus 映射和凭据状态；Secret 继续禁止跨 preload。
- Main 原子维护活动供应商，向应用专用 Claude `settings.json` 合并非敏感字段并保留未知设置；普通配置中不得存在鉴权值。
- Worker/Agent 只在执行冻结任务时解密对应凭据；子进程环境清除父进程全部相关 `ANTHROPIC_*` 后再注入快照值。
- CC Switch 只作为 Claude Code 供应商行为参考，不成为新的运行时依赖或第二套配置/任务系统。
