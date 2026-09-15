# 探索 / 官方 Zhihu Skill MVP 施工主约束

Product Truth：[已确认需求](../product/PRODUCT_REQUIREMENTS.md)。决定索引：[D001–D031](DECISION_LOG.md)。现场证据：[当前状态报告](PROJECT_STATE_REPORT.md)。用户需求优先于旧规则；历史文档不能授权额外功能。

## 范围与完成定义

按 Phase 0–6 增量完成官方 Skill、最小 domain/store、找灵感、排障、知识反馈、桌面交付。每个 Phase 小闭环先文档再业务代码；Phase 0 只文档/AGENTS.md。不 worktree，不大规模重构，不重写既有 Agent/Runtime/Skill/Hardboard。全部不做内容以 Product Truth §8 为准。

最终完成必须满足 Product Truth §9；软件成功不能替代 live 搜索、实机或成品验收。真实 API 缺失记 `LIVE_INTEGRATION_PENDING`；实机缺失记 `REAL_HARDWARE_VALIDATION_PENDING`；推送备份失败记 `REMOTE_BACKUP_PENDING`。不得编造来源和已验证状态。

## 必须停止的情况

官方 Skill 缺失；产品与代码根本冲突；必须覆盖大量用户工作；未提交修改高度冲突；需要真实 Secret；官方 CLI 安装/升级或授权需用户确认；无权限的实机操作；两方案产生明显不同产品行为；核心 API 实测无法满足需求。报告事实、冲突、影响和一个具体决定，不开始其他分支工作。

权限门禁、结构化输出、多行 Skill 描述兼容与 Phase 7 工程会话均已实现并通过专项检查；最新源码 Windows 包已重建。当前外部验证缺口是用户成品复测、双搜索 Diagnosis 和真实硬件闭环。若运行验证证明核心能力根本不可行，再停止。

## Phase 7 工程会话硬约束

- 每次冷启动必须明确选择/创建工程；不存在隐式第一项目或旧 Runtime fallback。
- active project 是编辑器、Agent 会话、Explore、Build/Flash/Serial 和项目证据的唯一上下文，切换必须原子且经过运行任务/未保存编辑门禁。
- Agent 对话按工程隔离；迁移期旧全局对话不得自动注入新工程。用户已授权删除后，当前 UI 不得重新展示或重建未归属历史。
- 找灵感与解问题按 `projectId + mode + sessionId` 保存多次历史目录，包含完成、未完成和中断状态；Secret 与未选择资料不得落盘。
- 详细施工与验收以 [Phase 7 施工基线](PHASE_7_PROJECT_SESSION_BASELINE.md) 为准；实现与自动化证据已回写，用户成品人工复测仍单列为 `NOT VERIFIED`。

## Phase 8 工程内会话与 Explore 交接硬约束

- Phase 7 的 userData 目录是历史实现，不再是目标真相。工程 Agent、Explore session 与 Handoff 必须迁移到当前工程受控 `.catnip/agent`、`.catnip/explore`、`.catnip/handoffs` 子目录；旧数据保留迁移且不覆盖新数据。
- Explore 受限分析/计划必须使用独立对话记录与事件通道，不能读写左侧工程 Agent conversation。
- 四阶段只有已到达步骤可回看；第三步生成工程内交接材料，第四步从磁盘展示并经过一次性、绑定工程/会话/计划/材料摘要的确认后才提交既有工程 Agent 队列。
- 交接材料写入是 Explore 允许的唯一工程内写操作，仅限 `.catnip/handoffs`；仍不得修改业务源码或调用 Build/Flash/Serial。

## Assumption Register

状态仅限 UNVERIFIED / TESTING / CONFIRMED / REJECTED / BLOCKED。下表创建于 2026-09-07，并按 2026-09-09 真实证据更新。

| ID | 假设内容 | 为什么仍是假设 | 错误时影响 | 验证方式 | 状态 | 验证证据 | 模块 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 复用 chat/worker/skillRefs/queue 可支撑 Explore | 真实分析、真实计划、队列隔离和一次性确认门禁均已验证；真实硬件执行仍未验收 | Handoff 安全与返回通道受阻 | 用真实排障与实机闭环补齐执行侧证据 | TESTING | `explore_analysis` 真实返回 Idea；`explore_plan` 真实返回计划；受限工具拒绝、默认队列与确认门禁专项通过 | Main/Worker/Agent |
| A2 | 现有 Agent 能可靠返回结构化 Idea/Diagnosis | 真实 Idea 已通过；真实 Diagnosis 尚未完成双来源验收 | UI 无法稳定消费判断 | 执行真实知乎＋全网排障并验证合法/非法响应 | TESTING | 真实 DeepSeek 返回 3 个合法 Idea；`common/explore.ts` 与 Worker 对 requestId/mode/来源/Schema 执行程序校验 | Agent/domain |
| A3 | 原子 JSON user-data 足以存知识卡 | 已按现有 Main user-data 路径实现并完成当前 MVP 容量/损坏场景验证 | 跨重启丢失、损坏或混入安装目录 | 原子替换、重启、语法/结构损坏保留、项目关联测试 | CONFIRMED | `explore-knowledge.ts`；`verify:explore-knowledge` 通过，坏文件不覆盖 | Local Store/Main |
| A4 | 可从当前工程和 main/CMakeLists 收集最小相关源码 | 有界读取、路径反例与用户取消已验证；真实 Diagnosis 的相关性仍待实测 | 过量读取或漏掉关键证据 | 真实排障复核候选相关性，继续保留单工程白名单/截断测试 | TESTING | Main active project + workbench/project-files；最多 6 个候选、单文件 8 KiB、总计 32 KiB；未选项由 prepare 剔除 | Main/Context |
| A5 | EventBus 和共享串口能稳定提供最新 Context | 同工程/时间筛选与工程切换清理已通过软件反例；共享串口的真实设备归属仍待验证 | 误用其他工程或旧运行数据 | 真机执行 taskId/projectDir/timestamp 与断线/清空场景 | TESTING | Project Session 绑定 Build/Flash，Runtime 事件按 active project 过滤；SerialMonitorSession read/wait 已通过 mock | Runtime/Main |
| A6 | 官方CLI在Windows开发和打包版可运行 | v2.0.0 最新 Windows 包、packaged Skill、release/version 与无 Key 门禁通过；全新用户真实安装/连接尚未人工验收 | 全新用户安装或 Secret 弹窗仍可能受机器环境影响 | 在不影响当前凭据的全新 Windows 用户环境实测安装授权→Secret 弹窗→status | TESTING | Phase 13 候选 4,468,679,868 字节且不含 DeepSeek/Qwen Key；开发环境 status 与真实搜索通过 | Official Skill/Packaging |
| A7 | 用户已配置可用Access Secret，且产品存在不经过 Renderer/Chat 的安全配置路径 | 已以官方验证、最小本人内容请求和真实知乎搜索完成端到端验收 | 路径回归可能泄露高权限 API 凭证 | 持续保留 Renderer/IPC/日志/包无 Secret 的门禁 | CONFIRMED | 独立遮蔽宿主窗口经 stdin 调官方 CLI；`auth status --verify`、最小内容请求及真实知乎搜索成功 | CLI/Main |
| A8 | 有可复现运行异常的真实板/工程可做 Demo | 发现三个工程，未连接或选择故障 | 排障不能称完整闭环 | 用户确认项目/端口后实测 Build/Flash/Serial | UNVERIFIED | hello_world_esp32s3、touch_hello、wifi_connect_fmai；无板证据 | Hardboard/Demo |
| A9 | 延续现有 UI 能容纳探索 | 两入口、连接面板、结果卡、来源、计划、收藏和验证反馈已完成桌面验收 | 若真实 Diagnosis 信息密度超出布局，需最小调整 | 在真实排障 Demo 复核结果密度与交互 | CONFIRMED | BrowserPanel 六个可见工作区；两张入口插画覆盖 534–1802px；完整流程、UI 专项及 Renderer build 通过 | Renderer |

## 风险与 Review 结论

1. 标准 Skill 多行 description 的 `>-` 解析和 vendor 文件部署改写问题已修复，并以原字节保真检查防回归。
2. `agent/CLAUDE.md` 和自动建议的 browser/search Skills 有旧“所有搜索先平台 URL”规则。官方 Skill 搜索必须通过最小显式能力路由解除不适用约束，保留旧浏览器功能。
3. Explore/Plan 已使用独立受限档位和程序门禁；默认 Agent 的执行权限不能被 Explore 继承。
4. 本地知识 Store 已使用原子替换和损坏显式报错；不得因当前专项通过而移除这些保护。
5. EventBus 最近事件虽有限，但当前实现读取日志文件再截尾；Explore 不得放大为全历史读取，需测性能和界限。

第一性原理：最短路径是把知识搜集和证据交接加入现有能力边界，不把新页面当新执行系统；先验证官方 Skill 和受限结构化任务，再加用户界面。当前计划未引入新依赖服务或未确认产品功能。

## Phase 16 模型与凭证管理硬约束

- 模型中心是现有 Agent、软件助手和附件桥的配置层，不得复制 Agent、Skill、任务队列或云后端。
- Renderer 不得接收、缓存或回填 API Key/Access Secret；新增 IPC 只传配置元数据和窄操作意图。
- Agent 模型选择必须校验协议与用途，按工程/会话持久化，并在任务创建时冻结；禁止失败后静默切换模型。
- 其他供应商只有经过真实协议适配和专项验证后才能标记工程 Agent 可用，不能以修改 base URL 冒充兼容。
- 旧 Key 迁移必须非破坏：安全存储成功前不得删除旧来源；失败时明确报告且保留可恢复路径。
- 知乎维护必须继续通过官方 Skill 的 status/auth 命令，不自行实现鉴权或输出 Secret。

## Phase 17 Renderer 性能硬约束

- 发布版 JS/CSS 继续使用 Vite 内容哈希和 Electron 本地 `loadFile`；不得复制到 userData、引入远程 CDN 或 Service Worker 作为伪缓存。
- Splash 只预热首屏关键资源；非首屏工作区和大图按需加载。Renderer readiness IPC 不得携带业务数据或 Secret，并必须有 Main 超时兜底。
- 不透明场景图可转 JPEG；透明素材只能使用保留 alpha 的 WebP/PNG。所有格式替换必须经过构建、字节比较和 UI 回归。
- 性能施工不得改动模型/知乎协议、Explore 确认门禁、工程会话、Agent/Skill/任务系统或用户工程 `.catnip`。

## Phase 18 Claude Code 供应商切换硬约束

- 用户人工验收优先于 Phase 16 自动化结论：旧“按会话选择模型”不再是当前产品目标，新任务只能使用应用级当前启用的 Claude Code 供应商。
- 供应商切换必须映射 Claude Code CLI 的 `ANTHROPIC_BASE_URL`、鉴权字段、主模型及 Haiku/Sonnet/Opus 角色模型；不得把任意 OpenAI-compatible endpoint 冒充 Claude Code compatible。
- `settings.json` 只保存非敏感配置并保留未知字段；鉴权值只在 Main 的安全存储与 Claude 子进程环境之间流动。
- 供应商切换只影响切换后创建的任务；运行中和已入队任务使用其非敏感快照，禁止中途改绑或静默回退。
- 仅借鉴 CC Switch 的 Claude Code 供应商切换，不引入其其他工具、数据库或辅助模块，不复制第二套执行系统。
- 首次配置必须先选预设或其他供应商；预设路径 DeepSeek 必填、Qwen 视觉选填，并自动启用 DeepSeek。Agent 与两类 Explore 请求必须共享活动 Claude Code 供应商。
- `model-ccswitch` 是用户确认的当前最新产品分支；不得再切换到 `idea_to_production` 施工。后者仅保留为历史分叉证据。
- 当前精简供应商编辑页未通过人工验收。自动化通过只证明既有契约内部一致，不得据此写成 CC Switch 页面等价或人工验收通过。
- 只对齐 CC Switch 的 Claude Code 直连供应商能力：地址语义、固定鉴权方式、Sonnet/Opus/Fable/Haiku/Subagent 映射、显示名与 1M、默认兜底模型、模型列表、脱敏配置预览及显式验证/启用。不得引入其本地代理、协议转换、Header/Body 注入、测速、计费、故障转移或其他产品模块。

## 官方知乎能力选择与 Access Secret 门禁（2026-09-09 当前口径）

- 官方 Skill 的完整能力不等于探索页面使用的能力。页面只开放 status、连接和固定的 `search zhihu` / `search global`；真实找灵感已调用知乎搜索，全网搜索留待排障 Demo。
- 热榜、直答、本人创作/关注/收藏、官方知识库、额度页和 OAuth 保持不接；Catnip 本地知识卡不等于知乎官方知识库。
- Access Secret 是用户个人的开放平台 API 鉴权凭证并决定额度归属，不是普通偏好设置。页面只触发零参数连接动作；完整值在独立宿主遮蔽窗口中输入，经官方 CLI stdin 验证并写系统凭证库，不进入 Renderer、Chat、URL、日志、Agent 输出或仓库。
- `auth status --verify`、最小本人内容请求和真实知乎搜索均已成功；update check unavailable 时仍不得宣称已是最新版。

## Phase 21 电台完整移植硬约束

- 当前施工分支为 `liukanshan`；基线 `ea40e011`，本地恢复点 `backup/pre-phase-21-radio-20260915`。开工仍以动态 Git 为准。
- 来源 `E:\Agent\vibeide\小智` 只读。移植内容进入当前仓库后才允许修改；不得直接把来源目录变成运行时依赖，也不得在打包版引用固定盘符。
- 完整移植优先：保留 3D 场景、装配/动作/GIF 屏幕、光驱电台、知乎查询与本人数据、人设、小智文字/工具/TTS、来源呈现和所有必要模型/图片资源。
- Electron Main 是唯一生命周期所有者。一个 Python PID 同时承载 loopback HTTP 和小智 WebSocket；启动必须有超时、ready 握手、崩溃状态和重启控制，关闭应用必须先优雅终止再有界强制回收，禁止孤儿进程。
- 用户授权电台 Python 进程直接调用知乎 HTTP；只允许 `backend/zhihu.py` 已列出的只读接口和受控分页，不扩展发帖、删除、关注变更或其他写操作。探索继续走官方 Skill，不因电台改写。
- 电台 Secret 由 Main 安全输入/安全存储维护。不得沿用来源中“浏览器密码框 → Python 相邻 keyfile 加密”的生产路径；Fernet key 与数据库同目录不视为系统安全凭据。
- 电台小智模型使用独立 OpenAI-compatible 配置，不与 Claude Code compatible 配置静默共用；Key 不进入 Renderer。配置变更明确提示并重启电台 PID，不重启整个 Electron，除非真实依赖要求。
- 前端在 Electron 新标签页内完整展示。优先复用来源的独立 Vite 前端和资源，由同一 loopback 电台进程提供静态页面并嵌入受限 iframe，以降低重写造成的功能/视觉漂移；不得启用 Node integration、远程导航或任意新窗口。
- Vendor `xiaozhi-esp32-server` 保留 MIT 许可证和第三方声明；来源副本、测试数据库、`.runtime`、Key、日志和本机依赖目录不得入包。
