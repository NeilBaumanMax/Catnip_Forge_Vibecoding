# Catnip Forge 施工入口

本轮仅在当前工作区、`DWIDE` 分支施工（用户于 2026-09-15 指定，从 `catnip-GUAGUA` 创建）。不要创建 worktree。开工先动态检查 Git，不能把本文件中的分支和历史提交当作实时状态；后续用户明确指定的分支优先。

## 必读与真相顺序

1. 用户当前指令及 [Product Truth](docs/product/PRODUCT_REQUIREMENTS.md)。
2. [接力](docs/construction/HANDOFF.md)、[主约束与 Assumptions](docs/construction/CODEX_MASTER_REQUIREMENTS.md)、[计划](docs/construction/CONSTRUCTION_PLAN.md)。
3. 当前真实代码与 Git；[现场报告](docs/construction/PROJECT_STATE_REPORT.md)是带日期的检查记录。
4. [分层契约](docs/construction/LAYER_CONTRACT.md)、[流程](docs/construction/WORKFLOW.md)、[工具边界](docs/construction/TOOL_POLICY.md)、[测试](docs/construction/TEST_METRICS.md)。

`CLAUDE.md`、`docs/ARCHITECTURE.md`、`docs/HANDOFF.md`、`docs/DEV_PROGRESS.md`、`docs/LOG.md` 和旧施工文档保留为证据；它们的采集 IDE、浏览器工作台、搜索必经平台 URL 等旧描述不能覆盖本次 Product Truth。`agent/CLAUDE.md` 是产品内部 Agent 规则，不能用它禁止施工 Agent 修改已授权的产品源码。

## 禁止与门禁

- 新模块叫“探索”，入口只有“找灵感 / 解问题”；复用 Agent、Skill Manager、Runtime MCP、Hardboard。不得新增第二套 Agent/Skill/任务系统、云后端、OAuth 画像、搜索 Feed 或 Web 版。
- 官方 `zhihu` 是 vendor：不得自行重建 API、鉴权或修改上游协议。首次使用先执行该 Skill 的 `scripts/run.* status`；安装/升级 CLI 需按官方 SKILL.md 取得授权。
- Explore 只分析；交接先计划，用户确认后才允许修改、Build、Flash、Serial 验证。必须有程序门禁测试，不能只用提示词约束。
- Secret 不进源码、Renderer、日志、URL、Agent 输出、截图或包。不得把 Secret 放进产品 Chat。
- 源码完成、编译、烧录、运行正常分别凭真实证据判定；无实机证据记 `REAL_HARDWARE_VALIDATION_PENDING`。
- 历史知识自动发现不等于自动加入 Context；用户主动收藏和选择，不抓取镜像。
- 重大冲突按主约束停止；普通工程选择自主记录。不得擅自委派子 Agent。

## Git 与测试

禁止 `git reset --hard`、`git clean -fd`、`git push --force` 及等价破坏；保护用户修改，不擅自 stash。精确暂存，禁止 `git add -A`。重要 Phase 前建立 `backup/pre-phase-X-YYYYMMDD` 并核对 origin；失败记 `REMOTE_BACKUP_PENDING`。小闭环先文档、实现、Review、专项测试、根因修复、文档、Commit、Push、远端核对。未经合并验收不推 main。

基线含 Runtime/Electron typecheck/build、相关 verify 脚本和 diff 检查。每次记录完整命令、首次失败与后续结果；不把 mock 当真机，不因旧 scaffold 测试失败删除旧代码。发布阶段才做完整包及真机验收。

## 关键源码入口

- UI：`electron/src/renderer/components/BrowserPanel.tsx`（六个可见工作区，含“探索”和“Neil 的 skill 小站”）、`ExplorePanel.tsx`、`ChatPanel.tsx`、`App.tsx`。
- IPC：`electron/src/preload/index.ts` → `electron/src/main/gateway.ts`。
- Agent：`electron/src/main/worker/orchestrator.ts`、`context.ts`、`task-state.ts`、`electron/src/main/agent.ts`。
- Skill：`electron/src/main/skill-manager.ts`、`agent/skills/<id>/SKILL.md`。
- 本地数据：`electron/src/main/paths.ts`、`user-data-path.ts`、`worker/session-store.ts`。
- 硬件：`runtime/src/mcp/hardboard.tool.ts`、`runtime/src/hardboard/`、`runtime/src/eventbus/`、`electron/src/main/serial-monitor-*.ts`。
- 打包与验证：`electron/electron-builder.yml`、`electron/scripts/`、`runtime/scripts/`。
