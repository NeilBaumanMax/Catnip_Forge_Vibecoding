# 探索 / 官方 Zhihu Skill MVP 施工主约束

Product Truth：[已确认需求](../product/PRODUCT_REQUIREMENTS.md)。决定索引：[D001–D041](DECISION_LOG.md)。当前接力：[HANDOFF](HANDOFF.md)。现场证据：[带日期状态报告](PROJECT_STATE_REPORT.md)。用户需求优先于旧规则；历史文档不能授权额外功能。当前用户指定分支为 `DWIDE`，开工动态核对 Git。

## 范围与完成定义

按 Phase 0–6 增量完成官方 Skill、最小 domain/store、找灵感、排障、知识反馈、桌面交付。每个 Phase 小闭环先文档再业务代码；Phase 0 只文档/AGENTS.md。不 worktree，不大规模重构，不重写既有 Agent/Runtime/Skill/Hardboard。全部不做内容以 Product Truth §8 为准。

最终完成必须满足 Product Truth §9；软件成功不能替代 live 搜索、实机或成品验收。真实 API 缺失记 `LIVE_INTEGRATION_PENDING`；实机缺失记 `REAL_HARDWARE_VALIDATION_PENDING`；推送备份失败记 `REMOTE_BACKUP_PENDING`。不得编造来源和已验证状态。

## 必须停止的情况

官方 Skill 缺失；产品与代码根本冲突；必须覆盖大量用户工作；未提交修改高度冲突；需要真实 Secret；官方 CLI 安装/升级或授权需用户确认；无权限的实机操作；两方案产生明显不同产品行为；核心 API 实测无法满足需求。报告事实、冲突、影响和一个具体决定，不开始其他分支工作。

权限门禁、结构化输出、多行 Skill 描述兼容、工程内会话与交接均已实现并有专项记录。最近 Windows 包验收记录为 2026-09-12，路径 `electron/dist-package/Catnip Forge`；不据此推断本机留存包与当前分支一致。Skill 小站下载安装桥仍待完成；外部验证缺口包括成品复测、新用户完整连接、双搜索 Diagnosis 和真实硬件闭环。若运行验证证明核心能力根本不可行，再停止。

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

状态仅限 UNVERIFIED / TESTING / CONFIRMED / REJECTED / BLOCKED。下表创建于 2026-09-07；2026-09-15 按截至 2026-09-12 的记录校正证据范围，不把历史凭据状态、软件测试或文档校正作为新的实机/联网结果。

| ID | 假设内容 | 为什么仍是假设 | 错误时影响 | 验证方式 | 状态 | 验证证据 | 模块 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 复用 chat/worker/skillRefs/queue 可支撑 Explore | 真实分析、真实计划、队列隔离和一次性确认门禁均已验证；真实硬件执行仍未验收 | Handoff 安全与返回通道受阻 | 用真实排障与实机闭环补齐执行侧证据 | TESTING | `explore_analysis` 真实返回 Idea；`explore_plan` 真实返回计划；受限工具拒绝、默认队列与确认门禁专项通过 | Main/Worker/Agent |
| A2 | 现有 Agent 能可靠返回结构化 Idea/Diagnosis | 真实 Idea 已通过；真实 Diagnosis 尚未完成双来源验收 | UI 无法稳定消费判断 | 执行真实知乎＋全网排障并验证合法/非法响应 | TESTING | 真实 DeepSeek 返回 3 个合法 Idea；`common/explore.ts` 与 Worker 对 requestId/mode/来源/Schema 执行程序校验 | Agent/domain |
| A3 | 原子 JSON user-data 足以存知识卡 | 已按现有 Main user-data 路径实现并完成当前 MVP 容量/损坏场景验证 | 跨重启丢失、损坏或混入安装目录 | 原子替换、重启、语法/结构损坏保留、项目关联测试 | CONFIRMED | `explore-knowledge.ts`；`verify:explore-knowledge` 通过，坏文件不覆盖 | Local Store/Main |
| A4 | 可从当前工程和 main/CMakeLists 收集最小相关源码 | 有界读取、路径反例与用户取消已验证；真实 Diagnosis 的相关性仍待实测 | 过量读取或漏掉关键证据 | 真实排障复核候选相关性，继续保留单工程白名单/截断测试 | TESTING | Main active project + workbench/project-files；最多 6 个候选、单文件 8 KiB、总计 32 KiB；未选项由 prepare 剔除 | Main/Context |
| A5 | EventBus 和共享串口能稳定提供最新 Context | 同工程/时间筛选与工程切换清理已通过软件反例；共享串口的真实设备归属仍待验证 | 误用其他工程或旧运行数据 | 真机执行 taskId/projectDir/timestamp 与断线/清空场景 | TESTING | Project Session 绑定 Build/Flash，Runtime 事件按 active project 过滤；SerialMonitorSession read/wait 已通过 mock | Runtime/Main |
| A6 | 官方CLI在Windows开发和打包版可运行 | 2026-09-12 Windows 包、官方 Skill、隔离首启与安全窗口可见性有通过记录；全新用户完整安装/连接尚未人工验收 | 全新用户安装或凭据库仍可能受机器环境影响 | 在不影响当前凭据的全新 Windows 用户环境实测安装授权→Secret 弹窗→status | TESTING | 2026-09-12 包 4,502,227,001 字节；release、官方 Skill 15 文件/filter、隔离首启通过记录；窗口等待修复通过，无真实 Secret 输入 | Official Skill/Packaging |
| A7 | 用户可通过不经过 Renderer/Chat 的安全配置路径设置 Access Secret | 历史端到端路径已验证；这不证明当前机器仍配置有效凭据 | 路径回归可能泄露高权限 API 凭证 | 保留 Renderer/IPC/日志/包无 Secret 门禁；实际调用前以官方 status 核对当时状态 | CONFIRMED | 2026-09-09 官方验证、最小内容请求及真实搜索曾通过；2026-09-12 status 请求配置 Secret，窗口可见性测试未填写 Secret | CLI/Main |
| A8 | 有可复现运行异常的真实板/工程可做 Demo | 发现三个工程，未连接或选择故障 | 排障不能称完整闭环 | 用户确认项目/端口后实测 Build/Flash/Serial | UNVERIFIED | hello_world_esp32s3、touch_hello、wifi_connect_fmai；无板证据 | Hardboard/Demo |
| A9 | 延续现有 UI 能容纳探索 | 两入口及流程有 UI 专项和截图记录；真实 Diagnosis 信息密度与完整成品人工体验仍待复核 | 真实内容可能暴露布局或交互问题 | 在真实排障 Demo 复核结果密度与交互 | CONFIRMED | 六工作区、深蓝流程页；2026-09-12 固定深色与 1280x720 / 1707x960 / 1707x1067 布局矩阵通过记录 | Renderer |

## 风险与 Review 结论

1. 标准 Skill 多行 description 的 `>-` 解析和 vendor 文件部署改写问题已修复，并以原字节保真检查防回归。
2. `agent/CLAUDE.md` 和自动建议的 browser/search Skills 有旧“所有搜索先平台 URL”规则。官方 Skill 搜索必须通过最小显式能力路由解除不适用约束，保留旧浏览器功能。
3. Explore/Plan 已使用独立受限档位和程序门禁；默认 Agent 的执行权限不能被 Explore 继承。
4. 本地知识 Store 已使用原子替换和损坏显式报错；不得因当前专项通过而移除这些保护。
5. EventBus 最近事件虽有限，但当前实现读取日志文件再截尾；Explore 不得放大为全历史读取，需测性能和界限。

第一性原理：最短路径是把知识搜集和证据交接加入现有能力边界，不把新页面当新执行系统；先验证官方 Skill 和受限结构化任务，再加用户界面。当前计划未引入新依赖服务或未确认产品功能。

## 官方知乎能力选择与 Access Secret 门禁

- 官方 Skill 的完整能力不等于探索页面使用的能力。页面只开放 status、连接和固定的 `search zhihu` / `search global`；真实找灵感已调用知乎搜索，全网搜索留待排障 Demo。
- 热榜、直答、本人创作/关注/收藏、官方知识库、额度页和 OAuth 保持不接；Catnip 本地知识卡不等于知乎官方知识库。
- Access Secret 是用户个人的开放平台 API 鉴权凭证并决定额度归属，不是普通偏好设置。页面只触发零参数连接动作；完整值在独立宿主遮蔽窗口中输入，经官方 CLI stdin 验证并写系统凭证库，不进入 Renderer、Chat、URL、日志、Agent 输出或仓库。
- `auth status --verify`、最小本人内容请求和真实知乎搜索在 2026-09-09 曾成功；不推断当前凭据状态，不重复调用作为文档验收。update check unavailable 时仍不得宣称已是最新版。
