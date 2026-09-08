# 探索 / 官方 Zhihu Skill MVP 施工主约束

Product Truth：[已确认需求](../product/PRODUCT_REQUIREMENTS.md)。决定索引：[D001–D020](DECISION_LOG.md)。现场证据：[当前状态报告](PROJECT_STATE_REPORT.md)。用户需求优先于旧规则；历史文档不能授权额外功能。

## 范围与完成定义

按 Phase 0–6 增量完成官方 Skill、最小 domain/store、找灵感、排障、知识反馈、桌面交付。每个 Phase 小闭环先文档再业务代码；Phase 0 只文档/AGENTS.md。不 worktree，不大规模重构，不重写既有 Agent/Runtime/Skill/Hardboard。全部不做内容以 Product Truth §8 为准。

最终完成必须满足 Product Truth §9；软件成功不能替代 live 搜索、实机或成品验收。真实 API 缺失记 `LIVE_INTEGRATION_PENDING`；实机缺失记 `REAL_HARDWARE_VALIDATION_PENDING`；推送备份失败记 `REMOTE_BACKUP_PENDING`。不得编造来源和已验证状态。

## 必须停止的情况

官方 Skill 缺失；产品与代码根本冲突；必须覆盖大量用户工作；未提交修改高度冲突；需要真实 Secret；官方 CLI 安装/升级或授权需用户确认；无权限的实机操作；两方案产生明显不同产品行为；核心 API 实测无法满足需求。报告事实、冲突、影响和一个具体决定，不开始其他分支工作。

当前缺口（权限门禁、结构化输出、多行 Skill 描述）是拟实现/验证范围，不是改变产品方向的理由。未证明不可实现；若运行验证证明根本不可行，再停止。

## Assumption Register

状态仅限 UNVERIFIED / TESTING / CONFIRMED / REJECTED / BLOCKED。以下按 2026-09-07 Phase 0 证据登记。

| ID | 假设内容 | 为什么仍是假设 | 错误时影响 | 验证方式 | 状态 | 验证证据 | 模块 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 复用 chat/worker/skillRefs/queue 可支撑 Explore | 只分析档位、队列隔离和内部结果通道已离线验证，尚无真实模型进程证据 | Handoff 安全与返回通道受阻 | 恢复模型后验证真实任务 ID、取消、模式切换及确认门禁 | TESTING | `explore_analysis` 使用 plan/bare/空 MCP/仅 Skill 白名单；专项拒绝文件读写/Runtime/硬件工具并保留默认队列回归 | Main/Worker/Agent |
| A2 | 现有 Agent 能可靠返回结构化 Idea/Diagnosis | 版本化 envelope 与非法结果拒绝已实现，但 DeepSeek 被用户要求停止调用，尚无真实模型输出证据 | UI 无法稳定消费判断 | 恢复模型后验证合法结构化返回、真实来源及非法响应拒绝 | TESTING | `common/explore.ts` 校验 requestId/mode/Idea/Diagnosis/来源；Worker 仅推送合法对象；真实模型仍待验 | Agent/domain |
| A3 | 原子 JSON user-data 足以存知识卡 | 已按现有 Main user-data 路径实现并完成当前 MVP 容量/损坏场景验证 | 跨重启丢失、损坏或混入安装目录 | 原子替换、重启、语法/结构损坏保留、项目关联测试 | CONFIRMED | `explore-knowledge.ts`；`verify:explore-knowledge` 通过，坏文件不覆盖 | Local Store/Main |
| A4 | 可从当前工程和 main/CMakeLists 收集最小相关源码 | 已有受控读取/文件索引；相关性与限额尚未定 | 过量读取或漏掉关键证据 | 单工程白名单、路径越界、截断、用户取消测试 | TESTING | workbench readWorkbenchFile、hardboard/project-files.ts；不能直接把全部候选注入 | Main/Context |
| A5 | EventBus 和共享串口能稳定提供最新 Context | 已有最近 500 事件与串口增量读取；项目关联/过期需验证 | 误用其他工程或旧运行数据 | taskId/projectDir/timestamp 筛选、无数据/过期/清空场景 | TESTING | event-store getRecentRuntimeEvents、SerialMonitorSession.read/wait | Runtime/Main |
| A6 | 官方CLI在Windows开发和打包版可运行 | 开发机安装/status及部署脚本通过，真实成品尚未验证 | Phase 1成品运行受影响 | builder契约已测，Phase 6真实包/status | TESTING | D盘CLI compatible；部署run.ps1 status通过；package config通过 | Official Skill/Packaging |
| A7 | 用户已配置可用Access Secret，且产品存在不经过 Renderer/Chat 的安全配置路径 | 安装后的CLI实际status返回auth.configured=false；Explore 当前只有状态检查和重新检查按钮 | 真实知乎搜索只能保持待验收；若用普通输入框或 Chat 补洞会泄露高权限 API 凭证 | 先确定宿主拥有的安全交互，由宿主通过官方 CLI stdin 验证并写系统凭证库；测试 Renderer IPC/日志/Agent 输出无完整值，再做最小搜索 | BLOCKED | next_action=request_access_secret；未获取或配置凭据；安全配置 UI/流程未实现 | CLI/Main |
| A8 | 有可复现运行异常的真实板/工程可做 Demo | 发现三个工程，未连接或选择故障 | 排障不能称完整闭环 | 用户确认项目/端口后实测 Build/Flash/Serial | UNVERIFIED | hello_world_esp32s3、touch_hello、wifi_connect_fmai；无板证据 | Hardboard/Demo |
| A9 | 延续现有 UI 能容纳探索 | 功能入口和构建已验证；完整结果页与视觉验收尚未完成 | 若后续结果密度超出布局，需最小调整 | 继续沿用现有样式完成结果 UI，并在 Phase 6 做真实桌面验收 | CONFIRMED | BrowserPanel 已有五页签；ExplorePanel 两入口；verify:explore-ui 与 renderer build 通过 | Renderer |

## 风险与 Review 结论

1. 标准 Skill 多行 description 当前会变成 `>-`，部署重写文件；属于宿主兼容 Bug。
2. `agent/CLAUDE.md` 和自动建议的 browser/search Skills 有旧“所有搜索先平台 URL”规则。官方 Skill 搜索必须通过最小显式能力路由解除不适用约束，保留旧浏览器功能。
3. 现有 Agent `--dangerously-skip-permissions`、系统提示“先创建骨架”不适用于 Explore/Plan。需要执行层拒绝，而非自由文本 heuristic。
4. 本地 JSON 现状不是对写入可靠性的保证；新 store 必须原子写与损坏显式报错。
5. EventBus 最近事件虽有限，但当前实现读取日志文件再截尾；Explore 不得放大为全历史读取，需测性能和界限。

第一性原理：最短路径是把知识搜集和证据交接加入现有能力边界，不把新页面当新执行系统；先验证官方 Skill 和受限结构化任务，再加用户界面。当前计划未引入新依赖服务或未确认产品功能。

## 官方知乎能力选择与 Access Secret 门禁（2026-09-08）

- 官方 Skill 的完整能力不等于探索页面已经使用的能力。当前页面只实际调用 `scripts/run.ps1 status`；`search zhihu`、`search global` 仍未接通，来源策略字段不能冒充业务调用。
- 探索 MVP 后续只接知乎搜索和全网搜索。热榜、直答、本人创作/关注/收藏、官方知识库、额度页和 OAuth 保持不接；Catnip 本地知识卡不等于知乎官方知识库。
- Access Secret 是用户个人的开放平台 API 鉴权凭证并决定额度归属，不是普通偏好设置。当前页面没有安全配置入口；在宿主安全交互与官方 CLI stdin 路径有程序测试前，不得增加 Renderer 文本框、Secret IPC 或 Chat 粘贴流程。
- status 的 installed/compatible/authConfigured 只能证明安装与本地凭证状态。`authConfigured=false` 时不得调用业务搜索；update check unavailable 时不得宣称已是最新版。
