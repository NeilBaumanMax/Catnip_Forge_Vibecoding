# 新 Agent 接力入口

更新时间：2026-09-10。当前目标分支为 `idea_to_production`。本次交接审计开始时 local/remote 均为 `c4adf87990840638c89072d6afd4d81ec67a16ae`；它是 Phase 7 源码与打包基线，不是本文档提交后的实时 Git 状态。接手仍须运行 `git branch --show-current`、`git status --short`、`git rev-parse HEAD` 并核对远端。

## 当前状态

- UI 独立施工基线 `b7063512` 与实现提交 `48dd8d32` 已推送；合并前远端备份 `backup/pre-explore-ui-merge-20260910` 已核对为 `d0265836`。
- `EXPLORE_UI_REFACTOR` 已合入 `idea_to_production`。合并后 Electron/Runtime 构建、Explore 全专项、布局矩阵与 Workbench smoke 均通过；Main/Preload/IPC/Agent/Search/Runtime/Hardboard 未因 UI 重构改变。
- Explore 首页、Idea、Diagnosis、Source、Knowledge 和 Plan 已按 Research Workspace 重排；保留全部原 IPC、连接、收藏、验证、相关知识显式选择、Handoff 与 Confirm 行为。
- Explore 根元素使用 inline-size Container Query：小于 700px 单栏，700–1200px Normal，大于 1200px Wide 输入/Context + 结果/Plan 双栏。旧 760/820/960px 限宽已移除。
- Diagnosis 正式显示 `projectEvidence` 与 `sourceConflicts`；Source Row 显示 type/title/author/excerpt/url 主机并保留打开/收藏。
- DOM layout smoke 覆盖 1920×1080 下 Chat 24/34/45/52% 与折叠、2560×1440、3840×2160、Compact，以及 light/dark、阶段/Plan/Confirm 和控制台错误；最终通过并生成 `electron/.tmp/explore-layout-ui.png`。
- Phase 7 最新源码已重新完整生成 `electron/dist-package/win-unpacked`；release/version、无 Key 隔离冷启动、显式工程选择和打包版 Chat UI 通过，包体 4,464,648,810 字节，EXE 为 `1.0.0.7201`。未配置代码签名。
- 用户成品试用确认的工程会话阻断已完成源码修复：冷启动显式选择/创建工程；Agent 历史、编辑器、Build/Flash/Serial 与 Explore Context/Handoff 统一绑定当前工程；找灵感/解问题按工程和模式保存多次完成、未完成与中断历史。实现提交为 `6d8187e4`，详见 [Phase 7 施工基线](PHASE_7_PROJECT_SESSION_BASELINE.md)。
- 真实知乎 Diagnosis、真实 Agent 执行与真实硬件未在本 UI 闭环重跑，继续分别标记 `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING`。

## 先读

1. `AGENTS.md` 与 `docs/product/PRODUCT_REQUIREMENTS.md`。
2. `docs/construction/CODEX_MASTER_REQUIREMENTS.md`、`CONSTRUCTION_PLAN.md`、`WORKFLOW.md`。
3. `LAYER_CONTRACT.md`、`TOOL_POLICY.md`、`TEST_METRICS.md`、`LOG.md`。
4. 当前真实代码；旧 docs 只作历史证据。

不得创建 worktree 或委派子 Agent。DeepSeek 余额已恢复并完成真实只计划调用；不得把 Secret 放进 Renderer、Chat、日志、URL、仓库或安装包。

## 产品与 Phase 状态

产品保持 Electron 本地硬件 AI IDE。当前可见工作区为：仓库、监视器、任务管理器、编辑器、探索；探索首页只有找灵感和解问题。

- Phase 0：完成，Product Truth、Decision/Assumption、Git/测试基线和施工文档已建立。
- Phase 1：官方 `zhihu` Skill 的 15 个 vendor 文件已保真导入、完整部署并进入 `@zhihu`/打包契约；官方 CLI 安装在 `D:\ZhihuCLI`。Access Secret、官方验证、最小本人内容请求和真实知乎搜索已通过；显式 `@zhihu` Agent Skill 调用仍未单独验收。
- Phase 2：完成。共享 Domain、运行时校验、Main JSON 知识 Store、五个知识 IPC、相关发现与显式选择已实现。
- Phase 3：软件闭环完成。连接入口、固定知乎/全网搜索桥、受限分析、Idea/Diagnosis UI、结构化 Handoff 和无工具只计划档位已实现；DeepSeek 真实计划输出及知乎“找灵感”通过，一次性“确认并执行”门禁已开放。
- Phase 4、Phase 5 和 Phase 6 软件范围已完成。Phase 6e 补齐首次使用连接向导：全新用户明确点击安装官方 CLI，已有 CLI 但缺 Secret 时进入探索自动弹一次原生遮蔽窗口。最新 Windows 候选已完整重打并通过 release/version、app.asar 标记和隔离冷启动；真实“找灵感”已通过，真实双搜索排障与实机证据仍 pending。
- Phase 7 软件与打包自动化完成。Main Project Session、冷启动选/建工程、按工程 Agent 会话、编辑器/Build/Flash/Serial 联动、Explore Idea/Diagnosis 多历史和 interrupted 恢复已实现；等待用户人工复测最新成品。

## 当前实现边界

`ExplorePanel.tsx` 通过 preload/Main 调用有界 Context 收集器。解问题可见并可取消当前工程、target、最多 6 个源码候选、最近 24 小时同工程 Build/Flash 事件与最多 40 条共享串口记录；串口会明确标注尚未证明属于所选工程。Main 的 Request 准备仍只保留 `selected=true` 项。

Project Session 由 Main 签发 projectId 并绑定规范化 projectDir；冷启动不自动激活。Agent 数据位于 `userData/project-sessions/<projectId>/agent/`，Explore 数据位于 `userData/project-sessions/<projectId>/explore/<mode>/<sessionId>/session.json`。旧全局 Agent 历史只读保留在未归属区；返回 Explore 首页和切换右侧工作区不卸载/清空当前工作，重启后无法续接的 pending 请求转为 interrupted，不自动搜索或消耗额度。

官方连接由固定个人中心 URL、独立宿主遮蔽输入和官方 CLI stdin 完成，Secret 不经过 Renderer/Chat。若 CLI 缺失或不兼容，探索页只在用户点击“安装连接组件并继续”后运行固定官方 setup；若 CLI 可用但缺 Secret，进入探索每次最多自动弹窗一次，取消后不循环。Access Secret 已配置并经官方最小调用验收；固定搜索桥的 `search zhihu` 已真实通过，`search global` 等待排障 Demo 验收。

现有 Worker 继续使用单队列和 persistent Agent。`explore_analysis` 与 `explore_plan` 分别执行只分析和无工具只计划；合法结构化结果已接入 Idea/Diagnosis、来源和计划 UI。DeepSeek 真实计划输出已通过；计划完成后可由用户点击“确认并执行”，Main 以一次性、绑定计划与交接 ID、30 分钟过期的门禁提交到原有任务队列，确认前不开放文件、Build、Flash 或 Serial。

知识数据位于 Electron `userData/explore/knowledge.json`；历史知识只发现，显式选择后才进入 Context。该本地 Store 与知乎官方 Knowledge Base 不同，MVP 不调用后者。
## 下一步 1–3 项

1. 由用户对最新 `electron/dist-package/win-unpacked` 人工复测：返回、切工作区、重启、切工程、Agent 历史、编辑器/烧录目标与新建工程。
2. 经用户授权具体工程摘要外发且不暴露 Secret，执行真实“解问题”知乎＋全网双搜索 Demo。
3. 具备设备条件后，在用户确认 Plan 后完成真实修改、Build、Flash、Serial 与 Knowledge 验证回写。

## Decision 与 Assumption

D001–D020 全部有效，见 `DECISION_LOG.md`。关键约束：页面叫探索；知乎只是知识渠道；Explore 只分析；交给 Catnip 先出计划；用户确认后才施工；排障交叉验证；知识主动收藏且历史卡加入 Context 前由用户决定。

- A1 TESTING：单队列/persistent Agent 的受限档位、内部返回通道、真实分析/计划和一次性确认门禁已验证；真实硬件执行仍待验收。
- A2 TESTING：真实模型已返回合法 Idea；真实 Diagnosis 的知乎＋全网双来源仍待验收。
- A3 CONFIRMED：原子 JSON Store 的保存、重启、损坏保护和选择语义已验证。
- A4/A5 TESTING：有界源码、同工程/时间 Runtime 与共享串口读取已通过软件反例；真实硬件归属仍待实机。
- A6 TESTING：Phase 7 最新 Windows 候选已完整重打，packaged Skill、release/version、无 Key 冷启动、工程选择和打包版 Chat UI 通过；全新 Windows 用户的真实安装/连接仍待人工验收。
- A7 CONFIRMED：安全连接入口不经过 Renderer/Chat；官方凭证验证、最小本人内容请求与真实知乎搜索均成功。
- A8 UNVERIFIED：未选定并实测比赛硬件故障。
- A9 CONFIRMED：第五页签、两个入口、Idea/Diagnosis 来源结果和计划展示均已实现并通过 Renderer build。
- A10 REJECTED：组件本地状态足以承载 Explore 工作。Phase 7 已改为 Main 持久化的按工程会话，并通过返回/切工作区保持回归。
- A11 REJECTED：空 projectDir 可安全回退到列表第一项或最近 Runtime 工程。Phase 7 已实现冷启动显式工程门禁，打包 UI 验证 `activeProject === null`。
- A12 REJECTED：全局 Agent Conversation Store 能安全服务多个工程。Phase 7 已按工程隔离会话，旧全局历史保留为未归属只读。
- A13 REJECTED：每种 Explore 模式只保存一个最新状态即可。Phase 7 已采用工程 + 模式 + sessionId 的多历史目录，覆盖完成、草稿与中断记录。

## Blocker、Known Issues 与真实验证

- `LIVE_DIAGNOSIS_PENDING`：Access Secret 与真实知乎找灵感已通过；真实排障所需的知乎＋全网双搜索尚未验收。
- `AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE` 已解除：用户确认充值后，产品现有 `explore_plan` 档位以 `deepseek-v4-pro`、空工具和空 MCP 完成真实调用，返回合法 `structured_output`，退出码 0；本次没有调用知乎或硬件。
- `REAL_HARDWARE_VALIDATION_PENDING`：未执行本轮真实 Build/Flash/Serial，不能声称硬件闭环完成。
- 最新 Phase 7 Windows 候选已重建；冷启动、工程选择、packaged UI/Skill 与 Explore 标记已验证。代码签名、全新用户真实安装/连接仍待人工验收。
- Phase 0 的两次 Python pytest 均因环境缺 pytest，未进入断言；不得写成测试通过。
- 过程审计发现 Phase 2/3 若干小闭环把实现和收尾文档放在同一提交，缺少严格的“小闭环先文档”提交证据。WORKFLOW 已收紧；下一业务小项必须先有独立文档提交。

## 测试快照

Phase 0：13 个检查目标通过、2 次 pytest 启动失败、3 组未验证。Phase 1 离线集成相关回归通过，后续官方验证、最小内容请求与真实知乎搜索已补验；显式 `@zhihu` Agent 调用未单独验收。Phase 2：5 组通过、0 最终失败。Phase 3a 受限门禁 6 个核心目标通过。Phase 6b 的 8 项软件回归全部通过；Phase 6c 真实找灵感通过；Phase 6e 的连接专项、status、类型/构建、UI、Request 与 Handoff 回归通过。2026-09-10 UI 合并验收再次通过 Electron/Runtime typecheck/build、10 项 Explore 专项、8 场景布局 smoke、Workbench smoke 与 diff check；真实全新包首次连接仍待验。

2026-09-08 文档漂移修正专项：3 个检查目标通过、0 失败；只修改 AGENTS/施工文档，未重复业务构建。

## Git 快照与回滚

- baseline：`f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`。
- 审计开始时 local/remote：`bff953900d1af98aa9e69f50308ed137c4b0b373`；push 与 `ls-remote` 已核对，工作区当时干净。
- 备份：`backup/pre-phase-0-20260907` → baseline；`backup/pre-phase-1-20260907` → `bba40d57`；`backup/pre-phase-2-20260907` → `b3b32a4b`；`backup/pre-phase-3-20260907` → `42d74e56`。local/remote 均已有核对记录。
- UI 合并备份：`backup/pre-explore-ui-merge-20260910` → `d0265836`，已推送并经 `ls-remote` 核对；本地合并提交为 `669059c2`，最终远端状态以动态查询为准。
- Phase 7 施工前备份：`backup/pre-phase-7-20260910` → `8f28ca3d`；实现提交 `6d8187e4`，打包/验收收口提交 `c4adf879`，均已推送。本文档提交后的最终 hash 仍须动态核对。
- 只能精确暂存；禁止 `reset --hard`、`clean -fd`、`push --force`、擅自 stash 或覆盖用户修改。撤回已提交工作使用经审查的 `git revert <commit>` 并重新测试。

本次文档漂移修正完成后的提交与远端 hash，必须用 Git 动态查询；不能让提交正文虚称包含自身 hash。
