# 新 Agent 接力入口

更新时间：2026-09-08。当前分支 `idea_to_production`，探索 MVP 未完成。开工必须动态运行 `git branch --show-current`、`git status --short`、`git rev-parse HEAD`，本文件的 hash 只代表最近一次核对快照。

## 先读

1. `AGENTS.md` 与 `docs/product/PRODUCT_REQUIREMENTS.md`。
2. `docs/construction/CODEX_MASTER_REQUIREMENTS.md`、`CONSTRUCTION_PLAN.md`、`WORKFLOW.md`。
3. `LAYER_CONTRACT.md`、`TOOL_POLICY.md`、`TEST_METRICS.md`、`LOG.md`。
4. 当前真实代码；旧 docs 只作历史证据。

不得创建 worktree 或委派子 Agent。不得调用 DeepSeek，直到用户明确说明余额恢复。不得把 Secret 放进 Renderer、Chat、日志、URL、仓库或安装包。

## 产品与 Phase 状态

产品保持 Electron 本地硬件 AI IDE。当前可见工作区为：仓库、监视器、任务管理器、编辑器、探索；探索首页只有找灵感和解问题。

- Phase 0：完成，Product Truth、Decision/Assumption、Git/测试基线和施工文档已建立。
- Phase 1：离线宿主集成完成。官方 `zhihu` Skill 的 15 个 vendor 文件已保真导入、完整部署并进入 `@zhihu`/打包契约；官方 CLI 安装在 `D:\ZhihuCLI`。真实搜索和 Agent Skill 调用仍未验收。
- Phase 2：完成。共享 Domain、运行时校验、Main JSON 知识 Store、五个知识 IPC、相关发现与显式选择已实现。
- Phase 3：进行中。第五页签、两入口表单、排障 Context 取消、官方 status 安全桥和 Request 准备 IPC 已实现；真实搜索、结构化 Idea/Diagnosis、结果 UI 和 Handoff 尚未实现。
- Phase 4–6：未开始。

## 当前实现边界

`ExplorePanel.tsx` 生成共享 `ExploreRequest`，经 preload 到 `explore:request:prepare`。Main 运行时校验并剔除未选择 Context；找灵感声明知乎必需/全网按需，解问题声明两者均必需。该 IPC 不执行搜索、Agent、文件修改或硬件操作，准备成功不能称为已形成 Idea/Diagnosis。

官方连接状态由 `explore-zhihu-status.ts` 调用 vendor `scripts/run.ps1 status` 并映射为安全字段。子进程使用环境白名单。知识数据位于 Electron `userData/explore/knowledge.json`，Renderer 不直接读写文件；历史知识只发现，显式选择后才进入 Context。

现有 Worker 仍使用单队列和 persistent Agent。`agent.ts` 当前带 `--dangerously-skip-permissions`，因此 Explore 不能仅靠提示词接入；必须先有程序级只分析/计划门禁及拒绝副作用测试。不得新建第二套 Agent、任务队列、Skill 系统或 Runtime。

## 下一步 1–3 项

1. **先完成并推送独立文档基线**：范围、拒绝用例、验收与风险见 [Phase 3a 基线](PHASE_3A_RESTRICTED_ANALYSIS_BASELINE.md)。该提交不得包含业务实现。
2. 文档基线远端核对后，在其限定的现有 Worker/Agent 边界实现最小受限模式；程序拒绝 Explore 分析中的文件写入、Build、Flash、Serial，验证非法结构化结果不会进入 UI。没有门禁前不得让 Explore 表单触发 Agent。
3. 外部条件恢复后再做 live 验收：用户通过官方安全流程配置 Access Secret；DeepSeek 只有用户明确允许恢复后才调用。分别验证官方知乎/全网搜索和真实 `Skill(zhihu)`，保留真实来源。

## Decision 与 Assumption

D001–D020 全部有效，见 `DECISION_LOG.md`。关键约束：页面叫探索；知乎只是知识渠道；Explore 只分析；交给 Catnip 先出计划；用户确认后才施工；排障交叉验证；知识主动收藏且历史卡加入 Context 前由用户决定。

- A1 TESTING：复用 chat/worker/skillRefs/queue；受限模式和返回通道未完成。
- A2 TESTING：Domain schema 已有；真实模型结构化输出未验证。
- A3 CONFIRMED：原子 JSON Store 的保存、重启、损坏保护和选择语义已验证。
- A4/A5 TESTING：相关源码及 Build/Serial 的项目、时间和读取上限仍待 Phase 4。
- A6 TESTING：开发机 CLI/status 与 builder 规则通过；真实成品未验证。
- A7 BLOCKED：官方 status 为 `auth.configured=false`。
- A8 UNVERIFIED：未选定并实测比赛硬件故障。
- A9 CONFIRMED：第五页签和两入口已通过 UI 契约与 Renderer build；完整结果页仍待实现。

## Blocker、Known Issues 与真实验证

- `LIVE_INTEGRATION_PENDING`：没有获取或配置用户 Access Secret，未执行真实知乎/全网搜索。
- `AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE`：两次受限 smoke 都在 tool use 前返回 HTTP 402；用户已禁止重试。
- `REAL_HARDWARE_VALIDATION_PENDING`：未执行本轮真实 Build/Flash/Serial，不能声称硬件闭环完成。
- Phase 6 的真实 Windows package、冷启动和 packaged Skill status 未执行。
- Phase 0 的两次 Python pytest 均因环境缺 pytest，未进入断言；不得写成测试通过。
- 过程审计发现 Phase 2/3 若干小闭环把实现和收尾文档放在同一提交，缺少严格的“小闭环先文档”提交证据。WORKFLOW 已收紧；下一业务小项必须先有独立文档提交。

## 测试快照

Phase 0：13 个检查目标通过、2 次 pytest 启动失败、3 组未验证。Phase 1 离线集成相关回归通过，live 搜索与 Agent 调用待验。Phase 2：5 组通过、0 最终失败、2 个外部项未验证。Phase 3 已完成三个小闭环，最终分别为 3/4/4 组通过、0 最终失败；首次 UI、GPU、环境白名单失败均保留在 `TEST_METRICS.md` 和 `LOG.md`。

2026-09-08 文档漂移修正专项：3 个检查目标通过、0 失败；只修改 AGENTS/施工文档，未重复业务构建。

## Git 快照与回滚

- baseline：`f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`。
- 审计开始时 local/remote：`bff953900d1af98aa9e69f50308ed137c4b0b373`；push 与 `ls-remote` 已核对，工作区当时干净。
- 备份：`backup/pre-phase-0-20260907` → baseline；`backup/pre-phase-1-20260907` → `bba40d57`；`backup/pre-phase-2-20260907` → `b3b32a4b`；`backup/pre-phase-3-20260907` → `42d74e56`。local/remote 均已有核对记录。
- 只能精确暂存；禁止 `reset --hard`、`clean -fd`、`push --force`、擅自 stash 或覆盖用户修改。撤回已提交工作使用经审查的 `git revert <commit>` 并重新测试。

本次文档漂移修正完成后的提交与远端 hash，必须用 Git 动态查询；不能让提交正文虚称包含自身 hash。
