# Catnip Forge 当前施工接力

> Lifecycle: SUPERSEDED（全文为迁移前历史，停止追加当前状态/全局流水）。当前开发入口为 [PROJECT_INDEX](../PROJECT_INDEX.md)，状态只维护 [CURRENT](../state/CURRENT.md)，新任务及测试转入 tasks/ 与 testing/evidence/。本文件旧维护要求不再生效；历史正文保留。

更新时间：2026-09-15（Asia/Shanghai）。本次为 DWIDE 文档校正；最近业务提交为 `f2449a19`（2026-09-12）。原接力全文保留在 [历史副本](HANDOFF_HISTORY_THROUGH_20260912.md)；历史包、测试和联调结果不等于本轮复验结果。

## 当前 Git 与现场保护

- 用户指定施工分支为 `DWIDE`，工作区为 `E:\Agent\vibeide\vibeide`，不创建 worktree、不擅自委派子 Agent。
- 本次审计开工时，`DWIDE`、本地 `catnip-GUAGUA` 与远端 `origin/catnip-GUAGUA` 均为 `f2449a199b1a92fb644276403a75da116c6fb586`；当时远端尚无 DWIDE。收尾按 [流程](WORKFLOW.md) 推送 DWIDE 并动态核对；本段记录开工快照，不预写文档提交自身 hash。
- 恢复点 `backup/pre-phase-doc-sync-20260915` 已推送至 origin 并核对为上述提交。
- 开工时无已跟踪文件改动；保护未跟踪的 `docs/tutorials/`、`electron/radio/`、`runtime/hardboard/projects/hello_world_esp32s3/.catnip/`。未跟踪目录不是本分支已提交成果。
- 开工执行 `git branch --show-current`、`git status --short --branch`、`git rev-parse HEAD`，并只读核对 origin。只向 origin 指定施工/备份分支推送，未经验收不合入或推送 main。

## 当前产品与源码

| 项目 | 已核对状态 |
| --- | --- |
| 版本 | `config/version.json`：公开 v2.0.0 / Build 7201 / npm 2.0.0-7201 / Windows PE 2.0.0.7201 |
| 六工作区 | 仓库、监视器、任务管理器、编辑器、探索、Neil 的 skill 小站；正常桌面默认进入探索，测试夹具按自己的启动规则运行 |
| 视觉 | 固定深蓝主题，无明暗切换；三段顶栏与真实窗口控制；找灵感/解问题深蓝双列工作页、学院呱呱插画、仓库与任务/监视器主题已收敛 |
| 当前工程 | 冷启动显式选/建工程；Agent、编辑器、Explore 与 Build/Flash/Serial 目标按工程绑定，切换有任务和未保存编辑保护 |
| 工程内数据 | Agent：`<project>/.catnip/agent/`；探索：`<project>/.catnip/explore/<mode>/<sessionId>/`；交接：`<project>/.catnip/handoffs/<sessionId>/` |
| 探索 | 两入口、独立对话与多历史、可取消 Context、结构化结果和来源、四阶段回看；并发模式结果归原会话，空草稿清理与历史重命名已实现 |
| 交接门禁 | 第三步生成计划/材料，第四步重读磁盘，可编辑保存和打开目录；Main/Worker 校验绑定、材料摘要和一次性确认后才进入既有工程 Agent 队列 |
| 本地知识 | userData 保存收藏、受限来源对话快照及验证记录；用户主动删除、选择加入 Context，相关发现不自动注入 |
| Skills | 9 个已跟踪标准目录型 Skill，含官方 vendor zhihu；复用现有 Skill Manager。小站仅打开固定网页，站点到本地下载安装闭环尚待完成 |
| 助手与引导 | “Neil·Bauman's 学院呱呱”及新手旅程覆盖探索、独立历史、四阶段和 Skill 小站；GitHub 入口经 Main 白名单 |

源码入口：[BrowserPanel](../../electron/src/renderer/components/BrowserPanel.tsx)、[App](../../electron/src/renderer/App.tsx)、[工程会话](../../electron/src/main/project-session.ts)、[探索会话/材料](../../electron/src/main/explore-session.ts)、[交接校验](../../electron/src/main/explore-analysis.ts)、[Worker](../../electron/src/main/worker/orchestrator.ts)、[Skill Manager](../../electron/src/main/skill-manager.ts)。

## 阶段进展

- Phase 0–6：官方 Skill、受限分析/计划、两类搜索桥、知识底座和发布链的软件实现已具备；真实排障与硬件验收尚未完成，不能写成整个 MVP COMPLETE。
- Phase 7–8：工程隔离、多历史、工程内数据、独立 Explore 对话、磁盘交接和程序确认门禁已实现并有历史专项记录。
- Phase 9–14：指定使用记录/四个 Skill 清理、v2.0.0、历史恢复、材料编辑、助手/引导、收藏快照和插画完成；清理是当时授权动作，不应再次执行。
- Phase 15 及 9 月 12 日修复：星空外壳、两流程工作页、来源打开、并发会话、历史重命名、仓库目录/同步、任务日志入口、固定深色与 150% 缩放适配完成。
- 最新三个业务提交：`1e95e7c5` 知乎安全窗口渲染可见性；`e8b40b5f` 固定主题与缩放布局；`f2449a19` Windows 解压包目录更名。本轮只修正文档。

## 已有验证证据及适用范围

- 2026-09-09 真实“找灵感”曾获得 8 条知乎来源并生成 3 个合法 Idea；真实计划生成亦有记录。这不证明当前机器凭据已配置或真实 Diagnosis 已通过。
- 2026-09-12 知乎修复等待 WPF `ContentRendered` 的一次性 ready 标记；提前退出和 15 秒超时显式报错。用户已目视确认遮罩窗口弹出，但该次未输入真实 Secret、未执行知乎请求，不能代替新用户完整连接验收。
- 2026-09-12 固定主题/布局检查记录通过 Electron typecheck、Renderer build、Explore 静态与 live layout；覆盖 `1280x720`、`1707x960`、`1707x1067` 对应的 150% 缩放场景，Renderer console error 为 0。
- 最近已记录的 Windows 成品为 `electron/dist-package/Catnip Forge/Catnip Forge.exe`，2026-09-12 包目录总计 4,502,227,001 字节；Runtime/Main/Renderer 构建、发布检查、官方 Skill 15 文件/filter 和隔离首启记录通过。定制 `pack:win` 中 `win-unpacked` 仅为构建中间目录。
- 该发布记录包含离线 Node v22.14.0、隔离 Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；当时扫描未发现真实 Key、历史、收藏、日志和工程 .catnip。未配置代码签名。本轮不重打包、不核验本机留存包，不把其他分支产生的忽略文件当 DWIDE 成品。
- 历史 `smoke:workbench` 在 2026-09-11 因端口占用后又遇 Chromium GPU 退出而未通过；另行 CDP 交互通过不覆盖该失败记录。
- 完整命令、首次失败和本轮基线结果见 [TEST_METRICS](TEST_METRICS.md)，本轮范围与 Review 见 [文档校正记录](DWIDE_DOC_SYNC_20260915.md)。

## 仍待完成与后续顺序

1. 人工复测最新 v2.0.0 的六工作区、引导/助手、跨工程、Explore 历史恢复/删除、材料编辑和确认提交。
2. 完成并验证 Skill 小站到既有 Skill Manager 的安全下载安装桥；来源、确认、路径和覆盖保护需先明确，不能另建 Skill 系统。
3. 完成全新 Windows 用户官方 CLI 安装授权 → Secret 安全窗口 → connected 的人工验收；窗口可见性修复只覆盖其中一段。
4. 经用户授权执行真实知乎＋全网“解问题”验收；保留 `LIVE_DIAGNOSIS_PENDING`。
5. 确认工程、设备、端口和修复计划后，验收工程 Agent 修改 → Build → Flash → Serial → 运行结果 → 知识验证回写；保留 `REAL_HARDWARE_VALIDATION_PENDING`。
6. 发布时补完整人工分发验收与代码签名。软件构建、mock、截图和历史实机记录均不能替代当前探索 MVP 的实机证据。

## 必读与门禁

顺序：[Product Truth](../product/PRODUCT_REQUIREMENTS.md) → 本文 → [主约束](CODEX_MASTER_REQUIREMENTS.md) / [计划](CONSTRUCTION_PLAN.md) → 真实代码/Git和带日期的[状态报告](PROJECT_STATE_REPORT.md) → [分层契约](LAYER_CONTRACT.md)、[流程](WORKFLOW.md)、[工具策略](TOOL_POLICY.md)、[测试记录](TEST_METRICS.md)。

Secret 不进入源码、Renderer、Chat、日志、URL、截图、Agent 输出或包。官方 zhihu 首次调用前仍先执行 vendor 的 `scripts/run.* status`；安装/升级按官方 Skill 取得授权。Explore 只分析，确认前允许的工程写入仅限交接材料；只有用户明确确认后才可进入工程修改与硬件执行。本次文档校正不更改产品要求或扩大执行权限。
