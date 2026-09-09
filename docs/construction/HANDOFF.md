# 新 Agent 接力入口

更新时间：2026-09-09。当前分支 `idea_to_production`，探索 MVP 软件功能已进入 Phase 6 前收尾。开工必须动态运行 `git branch --show-current`、`git status --short`、`git rev-parse HEAD`，本文件的 hash 只代表最近一次核对快照。

## 先读

1. `AGENTS.md` 与 `docs/product/PRODUCT_REQUIREMENTS.md`。
2. `docs/construction/CODEX_MASTER_REQUIREMENTS.md`、`CONSTRUCTION_PLAN.md`、`WORKFLOW.md`。
3. `LAYER_CONTRACT.md`、`TOOL_POLICY.md`、`TEST_METRICS.md`、`LOG.md`。
4. 当前真实代码；旧 docs 只作历史证据。

不得创建 worktree 或委派子 Agent。DeepSeek 余额已恢复并完成真实只计划调用；不得把 Secret 放进 Renderer、Chat、日志、URL、仓库或安装包。

## 产品与 Phase 状态

产品保持 Electron 本地硬件 AI IDE。当前可见工作区为：仓库、监视器、任务管理器、编辑器、探索；探索首页只有找灵感和解问题。

- Phase 0：完成，Product Truth、Decision/Assumption、Git/测试基线和施工文档已建立。
- Phase 1：离线宿主集成完成。官方 `zhihu` Skill 的 15 个 vendor 文件已保真导入、完整部署并进入 `@zhihu`/打包契约；官方 CLI 安装在 `D:\ZhihuCLI`。Skill 本身还支持热榜、直答、本人创作/关注/收藏、官方知识库和额度查询，但探索 MVP 只选用状态检查、知乎搜索和全网搜索；真实搜索和 Agent Skill 调用仍未验收。
- Phase 2：完成。共享 Domain、运行时校验、Main JSON 知识 Store、五个知识 IPC、相关发现与显式选择已实现。
- Phase 3：软件闭环完成。连接入口、固定知乎/全网搜索桥、受限分析、Idea/Diagnosis UI、结构化 Handoff 和无工具只计划档位已实现；DeepSeek 真实计划输出通过，真实知乎搜索按用户要求暂缓，“确认并执行”尚未开放。
- Phase 4、Phase 5 和 Phase 6 软件范围已完成。当前源码 Windows 发布候选、成品资源、无 Key 冷启动及 Explore/队列/Skill/串口软件回归通过；开工备份 `backup/pre-phase-6-20260909` 已推送。真实知乎与实机证据仍 pending。

## 当前实现边界

`ExplorePanel.tsx` 通过 preload/Main 调用有界 Context 收集器。解问题可见并可取消当前工程、target、最多 6 个源码候选、最近 24 小时同工程 Build/Flash 事件与最多 40 条共享串口记录；串口会明确标注尚未证明属于所选工程。Main 的 Request 准备仍只保留 `selected=true` 项。

官方连接由固定个人中心 URL、独立宿主遮蔽输入和官方 CLI stdin 完成，Secret 不经过 Renderer/Chat。固定搜索桥只允许 `search zhihu` / `search global`；当前 Access Secret 未配置，用户要求暂不做真实搜索验收，保持 `LIVE_INTEGRATION_PENDING`。

现有 Worker 继续使用单队列和 persistent Agent。`explore_analysis` 与 `explore_plan` 分别执行只分析和无工具只计划；合法结构化结果已接入 Idea/Diagnosis、来源和计划 UI。DeepSeek 真实计划输出已通过；计划完成后可由用户点击“确认并执行”，Main 以一次性、绑定计划与交接 ID、30 分钟过期的门禁提交到原有任务队列，确认前不开放文件、Build、Flash 或 Serial。

知识数据位于 Electron `userData/explore/knowledge.json`；历史知识只发现，显式选择后才进入 Context。该本地 Store 与知乎官方 Knowledge Base 不同，MVP 不调用后者。
## 下一步 1–3 项

1. 提交并远端核对 Phase 6 软件回归记录。
2. 用户恢复 Access Secret 测试后执行真实知乎来源 Demo；具备设备条件后执行真实施工/Build/Flash/Serial Demo。
3. 保持 4c 真实知乎验收暂缓；没有实机证据时继续标记硬件验证待完成。

## Decision 与 Assumption

D001–D020 全部有效，见 `DECISION_LOG.md`。关键约束：页面叫探索；知乎只是知识渠道；Explore 只分析；交给 Catnip 先出计划；用户确认后才施工；排障交叉验证；知识主动收藏且历史卡加入 Context 前由用户决定。

- A1 TESTING：复用单队列/persistent Agent 的受限档位和内部返回通道已通过离线拒绝测试；真实模型进程仍未验证。
- A2 TESTING：版本化 Idea/Diagnosis envelope、requestId/mode/来源校验和非法 UI 抑制已实现；真实模型结构化输出仍未验证。
- A3 CONFIRMED：原子 JSON Store 的保存、重启、损坏保护和选择语义已验证。
- A4/A5 TESTING：有界源码、同工程/时间 Runtime 与共享串口读取已通过软件反例；真实硬件归属仍待实机。
- A6 TESTING：开发机 CLI/status 与 builder 规则通过；真实成品未验证。
- A7 TESTING：安全连接入口已实现且 Secret 不经过 Renderer/Chat；官方 status 仍为 `auth.configured=false`，用户要求暂不做真实配置与搜索。
- A8 UNVERIFIED：未选定并实测比赛硬件故障。
- A9 CONFIRMED：第五页签、两个入口、Idea/Diagnosis 来源结果和计划展示均已实现并通过 Renderer build。

## Blocker、Known Issues 与真实验证

- `LIVE_INTEGRATION_PENDING`：没有获取或配置用户 Access Secret；Explore 已有独立安全连接入口，但按用户要求暂不测试，未执行真实知乎/全网搜索。2026-09-08 最近一次官方 status 仍为 installed/compatible=true、auth.configured=false。
- `AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE` 已解除：用户确认充值后，产品现有 `explore_plan` 档位以 `deepseek-v4-pro`、空工具和空 MCP 完成真实调用，返回合法 `structured_output`，退出码 0；本次没有调用知乎或硬件。
- `REAL_HARDWARE_VALIDATION_PENDING`：未执行本轮真实 Build/Flash/Serial，不能声称硬件闭环完成。
- Phase 6 的真实 Windows package、冷启动和 packaged Skill status 未执行。
- Phase 0 的两次 Python pytest 均因环境缺 pytest，未进入断言；不得写成测试通过。
- 过程审计发现 Phase 2/3 若干小闭环把实现和收尾文档放在同一提交，缺少严格的“小闭环先文档”提交证据。WORKFLOW 已收紧；下一业务小项必须先有独立文档提交。

## 测试快照

Phase 0：13 个检查目标通过、2 次 pytest 启动失败、3 组未验证。Phase 1 离线集成相关回归通过，live 搜索与 Agent 调用待验。Phase 2：5 组通过、0 最终失败、2 个外部项未验证。Phase 3 前三个小闭环最终分别为 3/4/4 组通过；Phase 3a 受限门禁本轮 6 个核心目标通过、0 最终失败。既有 UI、GPU、环境白名单失败历史均保留在 `TEST_METRICS.md` 和 `LOG.md`。

2026-09-08 文档漂移修正专项：3 个检查目标通过、0 失败；只修改 AGENTS/施工文档，未重复业务构建。

## Git 快照与回滚

- baseline：`f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`。
- 审计开始时 local/remote：`bff953900d1af98aa9e69f50308ed137c4b0b373`；push 与 `ls-remote` 已核对，工作区当时干净。
- 备份：`backup/pre-phase-0-20260907` → baseline；`backup/pre-phase-1-20260907` → `bba40d57`；`backup/pre-phase-2-20260907` → `b3b32a4b`；`backup/pre-phase-3-20260907` → `42d74e56`。local/remote 均已有核对记录。
- 只能精确暂存；禁止 `reset --hard`、`clean -fd`、`push --force`、擅自 stash 或覆盖用户修改。撤回已提交工作使用经审查的 `git revert <commit>` 并重新测试。

本次文档漂移修正完成后的提交与远端 hash，必须用 Git 动态查询；不能让提交正文虚称包含自身 hash。
