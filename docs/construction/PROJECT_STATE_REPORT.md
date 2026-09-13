# 项目当前真实状态报告

## 2026-09-13 模型分支与人工验收动态补充

- 用户确认 `model-ccswitch` 为当前最新产品形态和后续唯一施工分支；`idea_to_production` 不再用于开发。
- 文档开工时本地 HEAD 为 `029dd543`，远端 `origin/model-ccswitch` 为 `1390cad1`，本地 ahead 9。该状态是动态检查结果，不保证后续不变。
- CC Switch 供应商编辑页人工验收失败：当前 Catnip 页面缺少供应商信息、请求地址模式、Fable、独立默认兜底模型、编辑页模型列表、脱敏配置预览和显式配置测试。
- 已有自动化只能证明当前精简实现内部一致；真实 Key 在线发现、付费模型执行、完整 Windows 包与人工复验均未完成。
- 本闭环只修文档，不修改源码或运行配置。

18j 后续实现已完成上述页面差距的代码和自动化闭环：schema v3、五角色映射（含 Subagent）、显示名/1M、模型列表候选、Main-only 测试和脱敏预览均已落地，真实 Electron 三档布局通过。该结果不覆盖用户此前的失败结论；只有用户再次目视操作并用自己的供应商配置验证后，才可关闭 `LIVE_CLAUDE_PROVIDER_VALIDATION_PENDING`。

初始检查日期：2026-09-07（Asia/Shanghai）。下方原始报告保留当时快照，不替代后续动态检查。当前实现状态以本节、Product Truth、HANDOFF 和真实代码为准。

## 2026-09-11 Phase 14 动态补充

- 文档审计开工时分支为 `catnip-GUAGUA`，local 与 `origin/catnip-GUAGUA` 均为 `881121f8`；恢复点 `backup/pre-phase-14-doc-handoff-20260911` 已推送到同一提交。最终文档提交 hash 仍须动态核对。
- 当前公开版本 `v2.0.0` / Build `7201` / npm `2.0.0-7201` / PE `2.0.0.7201`。六个可见工作区包括 Neil 的 skill 小站；学院呱呱、新手引导、Explore 独立历史、收藏来源对话快照和两入口插画均已落地。
- 最新包位于 `electron/dist-package/win-unpacked`；Phase 13 发布核验总计 4,468,679,868 字节，EXE 188,969,472 字节，DeepSeek/Qwen Key 未入包。
- 本轮发现但保护的未跟踪用户现场为 `docs/Catnip_Forge_UI_Handoff/` 与 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/`；未暂存、未删除、未改写。
- 仍未验证真实双搜索 Diagnosis、真实工程 Agent 改码和 Build/Flash/Serial、全新 Windows 用户连接及代码签名。

2026-09-10 Phase 8 增量：工程 Agent 对话与 Explore session 已改存各工程 `.catnip` 分层目录；Explore 有独立 conversation、可回看的四阶段和工程内 handoff artifact，只有第四步明确确认后才进入当前工程 Agent。相关构建、专项和布局矩阵通过；新版 Windows 包、真实双搜索、真实 Agent 改码及硬件仍未验证。

## 2026-09-10 Phase 7 完成补充

- 本次交接审计开始时，本地与 `origin/idea_to_production` 均为 `c4adf87990840638c89072d6afd4d81ec67a16ae`，工作区干净；最终文档提交必须再次动态核对，不能预写自身 hash。
- Explore Research Workspace 已合入目标分支。Phase 7 实现提交 `6d8187e4` 建立 Main Project Session、冷启动显式选/建工程、按工程 Agent 会话、编辑器/Build/Flash/Serial 联动和 Explore Idea/Diagnosis 多历史持久化；打包/验收收口提交为 `c4adf879`。
- 最新 Windows 成品位于 `electron/dist-package/win-unpacked`，版本 `1.0.0.7201`、总计 4,464,648,810 字节。无 Key 首启、工程选择、打包版 Chat UI、release/version 均通过；打包验收时 DeepSeek/Qwen Key 未入包，未配置代码签名。用户运行后自行配置的本机 Key 不属于 Git 或原始打包证据。
- 仍未验证：用户对最新成品的返回/切页/重启/跨工程人工复测、真实知乎＋全网 Diagnosis、真实 Agent 修改、真实 Build/Flash/Serial、全新 Windows 用户安装连接。继续标记 `LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-07 初始快照（历史）

## Git 现场

- 工作区：`E:\Agent\vibeide\vibeide`；未创建 worktree。
- 分支：`idea_to_production`；检查开始时无 upstream。
- HEAD / baseline：`f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`。
- 工作区干净；未提交文件：无；unmerged：无。
- origin：`git@github.com:NeilBaumanMax/Catnip_Forge_Vibecoding.git`。
- upstream remote：`https://github.com/howtion0/vibeide.git`；本轮不向此 remote 推送。
- 当前 tags：`v0.1.0`、`v0.4.0.7161`、`v1.0.0`、`v1.5.0`；不把 tag 推断为 HEAD。
- 最近提交：`f6e20e8e` 发布包校验、`89a0e5c8` public tag 更新、`57a21ff7` 主线文档、`67b84af1` 规则规范、`a16a5e75` 滚动条验收、`01b91643` 验收失败检查。
- `git ls-remote --heads origin main` 返回 baseline；未 pull、merge 或改变 main。
- 远端 `backup/pre-phase-0-20260907` 已建立，查询 hash 等于 baseline。

## 当前产品与技术（代码核实）

Electron 主进程、React Renderer、TypeScript、Vite、Monaco；三个 npm package 分别为 `@vibeide/electron`、`@vibeide/runtime`、`@vibeide/agent`，版本 `1.0.0-7201`。本机 Node v24.15.0、npm 11.12.1、系统 Python 3.11.6；不将推荐 Node 22 误写成当前版本。

`BrowserPanel.tsx` 的 PanelMode 保留 workbench，但可见 tab 只渲染仓库/监视器/任务管理器/编辑器（875–878 行基线）。没有探索页。`App.tsx` 管理会话/UI，`ChatPanel.tsx` 支持显式 Skill 引用。

preload `sendMessage` → gateway `chat:send` → Orchestrator `submitTask`，请求含 text、skillRefs、attachments，模式 auto/guide/queue。单活动任务、追加要求和独立排队复用；`taskId` 关联异步回调。`context.ts` 要求显式 Skill 全部加载；orchestrator 观察 Skill tool invocation，缺失先补一次再失败。

`agent.ts` 启动现有 Claude Code 常驻进程，stream-json 输入/输出、动态 Runtime MCP 配置，默认 DeepSeek Anthropic 兼容端点。当前包含 `--dangerously-skip-permissions`，没有专门 Explore/Plan 权限模式。`task-state.ts` 为 idle/context/running/navigating/extracting/cleaning/done/failed，尚无本需求交接状态。stream-json 不等于业务结构化 Result 已支持。

## Skills 与官方源

Phase 1 当时基线为 12 个普通标准目录；2026-09-10 用户明确移除 `1688-source-finding`、`bilibili-search-workflow`、`douyin-product-rank`、`taobao-listing` 后，当前保留 browser-guide、data-extract、espidf-hardboard、html-game-generation、page-understanding、recording-workflow、replay-workflow-tooling、search-workflow，加上官方 vendor `zhihu` 共 9 个。历史 `verify:skills` 的 12 deployed 仅是当时证据。

`skill-manager.ts` 支持 sourceEntries、support tree、树哈希、部署 manifest、同名非托管保护、CRUD。开发源 `agent/skills`；部署 `runtime/agent-workspace/.claude/skills`；打包源 `resources/agent/skills`，部署在 userData/runtime-data 下。标准 Skill 当前会 parse/serialize 后写部署文档；`description: >-` 未解析多行，是已定位兼容缺口。

用户提供官方 ZIP：`E:\Agent\vibeide\zhihu-cli-skill-0.5.3-beta.20260904115023.zip`，55,077 bytes。

SHA-256：`f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7`。

ZIP 内 15 个普通文件：SKILL.md、manifest.json、9 个 references、4 个 scripts。版本 `0.5.3-beta.20260904115023`，最低 CLI `0.5.0-beta.20260826061344`；官方 manifest 域 `developer-cdn.zhihu.com`；支持 windows-amd64。来源为用户指定包及其自带 manifest，尚未独立比对远端包签名/散列，不扩大声称已认证供应链。包不含 CLI；run.ps1 使用用户目录 current/zhihu-cli.exe，不查 PATH；缺少可用 binary 时返回 request_install_consent。当前仅审读，status 待 Phase 1。

## Runtime / 硬件 / Context

`runtime/src/mcp/hardboard.tool.ts` 注册 env_status、devices_list、idf_set_target/build/flash/clean/erase_flash、serial_status/open/close/write/read/wait/clear/capture、snapshot_create。现有 runner、EventBus、Task Registry/Manager、process runner 提供硬件闭环，不需要重写。

`hardboard/env.ts` 默认 5.4.3，`runIdfSetTarget` 默认 esp32s3。本轮以真实 env 解析出的 Python/IDF 调用 `idf.py --version`，返回 `ESP-IDF v5.4.3`；同时提示缺少 IDF 自己的 .git 元数据并回读 source version。不是本仓库损坏，不等于完成 build/flash。

项目目录当前有 hello_world_esp32s3、touch_hello、wifi_connect_fmai。默认 target 来自代码，未把它认定为当前设备或每个工程的实测 target。未枚举/打开串口，不读取全部源码或敏感 sdkconfig，未选择 Demo 故障。

Electron `serial-monitor-controller/session/bridge` 持有共享串口；Runtime serial-monitor-client 调用 loopback 随机令牌桥接。Session.read 支持增量，wait 支持匹配。EventBus 含 taskId/projectDir/time 与 build/flash 完成事件，getRecentRuntimeEvents 返回最近 500 条以内，但底层仍读 JSONL 文件再截取，不能宣称已有高效有限 IO。

workbench 提供受控目录与 readWorkbenchFile；hardboard/project-files 从 CMake/main 生成候选索引，不遍历 build。尚无 Explore 相关性筛选、Context 取消或跨项目过期控制。

## 数据与打包

`paths.ts`：开发 getRuntimeDataDir 在源码 runtime 下；生产在 app.getPath('userData')/runtime-data。bootstrap/user-data-path 设置 `%APPDATA%/@Catnip_Forge/electron`，旧路径仅非破坏迁移。session-store 用 JSON 文件；并非 SQLite，也没有 Explore 知识 store。新知识应落 user-data；开发也不应把个人知识当作源码配置。

`electron-builder.yml` 已有 Windows x64 NSIS、extraResources agent 整树、Runtime dist/dependencies、ESP-IDF、Python、Node、Playwright。`pack:win` 经自定义脚本生成 win-unpacked；现有 verify:release、first-run、CDP smoke。配置允许 Skill 文档/manifest/scripts/references 入包，但不能因此声称新 Skill 成品已验收；Phase 1 加实际过滤器检查，Phase 6 重建冷启动。旧包验收仅是历史。

## 测试与一致性

本轮基线 10 个 npm 检查目标通过，另 IDF 版本探针成功（带上述警告）、git diff --check 通过。Python 结构测试两次启动失败：系统与随包解释器都无 pytest。详见 TEST_METRICS，不隐藏失败。旧 scaffold 另缺 src/coddecat，未运行全量旧测试，不删除或伪造实现。

与 Product Truth 一致：产品主架构、四页签、标准 Skill 支持、显式 @、单队列、MCP 硬件工具、共享串口、桌面包。

差异/风险：官方 Skill 尚未入库、多行元数据兼容 Bug、旧全搜索浏览器提示与官方 CLI 边界不符、Agent 无确认门禁、无结构化 Explore/domain/store。它们是本轮最小新增/修复任务；未发现必须改变 Product Truth 的根本冲突。A1–A9 在主约束逐条登记，未经测试不得改为 CONFIRMED。

已读取旧入口：README、CLAUDE、docs/INDEX、ARCHITECTURE、DEVELOPMENT、DEV_PROGRESS、HANDOFF、LOG（最新与历史段）、REFACTOR_PLAN、DEVELOPMENT_WORKFLOW_CONSTRUCTION、GITHUB_SYNC、SECURITY；仅保留经代码核对的事实。旧文档不覆盖或删除。
