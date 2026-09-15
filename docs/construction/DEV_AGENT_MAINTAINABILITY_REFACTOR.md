# Development Agent Maintainability Refactor

Lifecycle: ACTIVE（本轮施工基线；完成后归为 REFERENCE）
Task: TASK-DEV-MAINT-001 · 2026-09-15 · DWIDE

## Problem

局部修改的上下文半径随仓库增长：默认必读包含大段历史测试，当前状态在多个入口重复维护；专项命令独立编译 Main，大组件缺少增长提示。优化对象是维护 Catnip Forge 的 Development Agent，不是产品内 Claude Code CLI Runtime Agent 的业务行为或性能。

## Goals

- 用短导航、唯一当前状态、机器可读模块图和 Task Context 限定普通任务的读取/写入/验证范围。
- 保留历史与 frozen 功能，退出默认阅读；停止向全局 LOG/DEV_PROGRESS/TEST_METRICS 重复记流水。
- 保留全部既有 npm 命令，新增构建去重的模块验证和保守 changed plan；区分 FAST/MODULE/INTEGRATION/RELEASE。
- 建立低风险架构检查、软尺寸预算和热点拆分计划，实测上下文/验证改进。

## Non-goals

不改产品需求、不改变 Runtime Agent/Explore/Workbench/Worker/MCP/Hardboard/Serial/Skills/Chat/Editor/附件/打包的产品行为；不迁移包管理器或源码目录，不新增依赖，不全仓重构，不删除 legacy/frozen/用户数据。本轮不拆四个核心大文件；仅新增开发基础设施。

## Preflight / Rollback

- `git status`：无已跟踪修改；保护 `docs/tutorials/`、`electron/radio/`、`runtime/hardboard/projects/hello_world_esp32s3/.catnip/`，绕开且不暂存。
- `git branch --show-current`：DWIDE。
- `git rev-parse HEAD`：`71d63d5d69ef2b01fc320241f7c6c3628f43a248`。
- `git remote -v`：origin 为用户指定 GitHub 仓库（SSH），upstream 为 howtion0/vibeide（只读参考，不推送）。
- `git rev-parse --abbrev-ref --symbolic-full-name '@{u}'`：origin/DWIDE；`git ls-remote --heads origin DWIDE` 同上述 HEAD。
- `git branch backup/pre-phase-dev-maintainability-20260915 71d63d5d69ef2b01fc320241f7c6c3628f43a248`、`git push origin backup/pre-phase-dev-maintainability-20260915`、`git ls-remote --heads origin backup/pre-phase-dev-maintainability-20260915` 均成功，hash 一致。
- 回滚用独立提交的 `git revert <commit>`，先检查用户工作和依赖；不 reset/stash/clean，不创建 worktree。每个后续重要阶段前建立相应备份并核对 origin。

## Current Problems（测量于开工 HEAD）

| 检查 | 基线 |
| --- | --- |
| 默认必读 | AGENTS 38 + Product Truth 105 + HANDOFF 61 + MASTER 63 + PLAN 95 + STATE_REPORT 98 + LAYER 79 + WORKFLOW 18 + TOOL_POLICY 11 + TEST_METRICS 733 = 10 文件 / 1,301 行 |
| 默认历史负担 | STATE_REPORT / TEST_METRICS 直接进入必读；后者占 733 行 |
| 重复状态 | HANDOFF、STATE_REPORT、PLAN、DEV_PROGRESS 和 README 各有当前摘要 |
| 历史职责 | LOG 只追加、DEV_PROGRESS 累计进度、TEST_METRICS 测试流水；WORKFLOW 要求每项同步四份全局文件，AGENTS 又将其视作历史 |
| 验证 | electron 有 31 个 verify:*，其中 12 个前缀 `npm run build:main &&`；runtime 的 event-clear / hardboard smoke 各自 build |
| 典型 Explore 核心组 | request + analysis-gate + search-handoff：现有入口各 build 一次，共 3 次；扩展 Explore 的 8 个动态专项各自 build |
| 验证层级 | npm 中静态、Electron mock、真实 status、CDP、packaged first-run 并列，无法按任务直接判断副作用 |
| 大文件 | ExplorePanel 1761、BrowserPanel 1518、worker/orchestrator 1255、App 1093、ChatPanel 879 行；无统一增长门禁 |
| 模块定位 | 无 project-map、Module Contracts、Task Context 模板或任务路由入口 |
| 架构资产 | LAYER_CONTRACT 已有跨层不变量、工程绑定、只分析/确认门禁；应保留为唯一全局层契约，不能新造第二套架构真相 |

行数口径：UTF-8，去除文件尾空白后按 CRLF/LF 分行；默认阅读按 AGENTS 展开直接必读，不计用户消息及可选链接，不把压缩成超长单行当优化。后测用同一口径，另外列出导航/任务图选择成本。

预检 `rg --files` 对尚不存在的新知识目录返回不存在；PowerShell 下字面 glob `electron/scripts/verify_explore*.cjs` 不展开，后续使用 `rg -g 'verify_explore*.cjs' electron/scripts`。均为定位方式/目录尚未创建，不是产品失败。

## Planned Changes / Commit Boundaries

1. **Baseline（本提交）**：仅本文；Review、diff check、独立提交/推送/核远端，之后才实施。
2. **Knowledge routing**：PROJECT_INDEX、CURRENT、project-map、短 Module Contracts、Task 模板/active/archive、ADR 与 lifecycle；调整 AGENTS/WORKFLOW/旧入口；旧正文保留为历史且不能继续提供当前规则。这次提交后执行新的 ACTIVE 制度。
3. **Verification**：开发工具目录中新增配置/runner；FAST/MODULE/INTEGRATION/RELEASE；聚合按显式步骤依赖构建一次，旧脚本不删除、不改语义；changed 至少可靠 plan，未知/删除/重命名/跨层路径保守扩大，不能静默 skip。
4. **Guardrails**：基于当前源码 AST/导入边界做少量架构检查及负例测试；尺寸软警报、growth guardrail、HOTSPOTS。现有违规记录 debt，不能篡改业务使检查通过。
5. **Reconciliation**：最终完整专项/类型/构建验证；两例 Task 路由演练；前后指标、任务 evidence、CURRENT_TEST_STATUS；归档已完成任务、更新 CURRENT，提交/推送/远端核对。

## Allowed Write Scope

`AGENTS.md`、根 README/文档索引的导航；`.vibecoding/`；`docs/PROJECT_INDEX.md`、`docs/state/`、`docs/modules/`、`docs/tasks/`、`docs/decisions/`、`docs/testing/`、`docs/architecture/`、`docs/refactor/`；旧施工/历史入口的生命周期说明与 ACTIVE WORKFLOW/LAYER 的去重；`scripts/dev/` 开发工具和测试；`electron/package.json`、必要的 runtime npm 别名。不得改 `electron/src`、`runtime/src`、vendor Skill、产品需求或用户目录。

该基础设施任务有意覆盖多个模块的导航；普通任务默认 <=2 模块、<=1 跨层边界、<=8 源文件、0 新依赖。本轮例外只覆盖知识/验证治理，不允许借机扩展业务。

## Risks / Repair Decision

- 路由漏测：覆盖所有已跟踪源码路径；未知路径升级 INTEGRATION，release 配置显示 RELEASE_REQUIREMENTS，不自动启动真实设备/API。changed plan 不能因无识别模块返回空成功。
- 聚合测试用旧构建/环境：Main 每次聚合显式构建一次，无持久缓存跳过；串行运行可能共享夹具的脚本，保留退出码、超时和首次失败。
- 文档增加但不减负：旧九份不再默认必读；一类信息只一个 canonical source，map 引用 contract/state，contract 引用全局不变量。
- 静态规则误报：先审读实际基线，限定可证明的导入/API规则；配置例外必须精确、有理由，不把字符串匹配当完整授权证明。
- 根因清晰且局部、未越 Task Scope/不变量才 Repair；扩散到业务、假设不成立或需新架构时停下并选择回滚该提交，记录理由。
- 历史删除风险：原 LOG/DEV_PROGRESS/测试证据只加生命周期标识；被替换的旧入口全文保留归档或 Git 基线，可比较验证，禁止清理用户现场。

## Acceptance Criteria

- [ ] 短 PROJECT_INDEX、CURRENT（<=200 行）、有效 project-map 和核心模块 contracts；地图路径/依赖/测试可验证。
- [ ] Task 模板、active/archive、ADR、生命周期建立；默认 Maintenance/P0–P4 上下文规则；历史退出默认必读，LOG/DEV_PROGRESS 不再重复维护。
- [ ] Product Truth 和 LAYER 仍为唯一原资产；CURRENT 为唯一当前状态，任务/evidence 为唯一局部历史。
- [ ] 四级验证明确，常用模块只构建一次；旧 verify 保持兼容；changed --plan 支持未知升级与安全副作用边界。
- [ ] 架构静态检查及负例验证；大文件软预算、增长约束、拆分顺序报告；不改产品行为。
- [ ] 测量默认文件/行数、重复构建次数、FAST/module wall time、模块/contract/check 数量、大文件尺寸。
- [ ] 演练 Explore 历史 UI 与 Serial session 两类任务，列出局部 docs/source/tests；不默认读历史。
- [ ] Runtime typecheck、Electron typecheck/build、相关模块回归、架构检查、工具负例、diff/scope检查通过，外部/硬件未运行明确标记。
- [ ] 恢复点、至少五个可解释提交、每次 staged review/push/remote hash 核对；无用户修改混入。

## Evidence / Transition

本基线独立提交前只做文档/Git 检查。此前 71d63d5d 对相同产品源码已有类型/构建/静态专项记录，本轮会在实现后实测新工具及相关回归，不能引用旧结果充当新工具通过。规则迁移后唯一任务结果放 `docs/testing/evidence/TASK-DEV-MAINT-001.md`，本文不再复制流水；活动 Task Context 单独保持短小。
