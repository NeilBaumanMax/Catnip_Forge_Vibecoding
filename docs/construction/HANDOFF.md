# Catnip Forge 当前施工接力

## 2026-09-13 — Phase 18 Claude Code 供应商切换纠偏

- 当前施工分支由用户明确为 `model-ccswitch`。本地 HEAD/恢复基线为 `e745ac38`，恢复标签 `backup/pre-phase-18-claude-provider-switch-20260913` 已建立；已 fetch 核对 `origin/model-ccswitch` 为 `1390cad1`，远端恢复标签尚未推送，记 `REMOTE_BACKUP_PENDING`。
- 用户人工验收明确否决 Phase 16 的模型切换：现有“供应商/模型档案/用途能力/会话下拉”与真实 Claude Code CLI 运行语义不一致。
- 当前唯一目标见 [Phase 18 文档](PHASE_18_CLAUDE_CODE_PROVIDER_SWITCH.md)：只实现类似 CC Switch Claude Code 页的供应商保存、凭据维护和一键启用；Chat 改为只读显示当前活动供应商。
- API Key 继续只进 safeStorage 和 Claude 子进程环境；应用专用 Claude settings 只保存非敏感 Base URL 与模型角色映射。
- 首次未完成配置时自动进入模型页：预设路径只需 DeepSeek Key、Qwen 视觉 Key 选填并自动启用 DeepSeek；其他供应商路径才展开 CC Switch 风格配置。Agent、找灵感、解问题共享活动供应商。
- `docs/tutorials/` 与 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/` 是既有未跟踪现场，禁止触碰或纳入提交。

## 2026-09-13 — Phase 17 Renderer 性能开工

- 当前分支 `model-ccswitch` 的本地与 `origin/model-ccswitch` 已核对为 `0e83f409`；远端恢复点 `backup/pre-phase-17-20260913` 指向同一提交。
- 用户要求降低前端显示卡顿、压缩图片并利用启动动画预加载。现场确认发布版 JS/CSS 已由 Electron 从本地构建目录读取，不能用重复 userData 缓存替代解析/解码优化。
- 施工采用非首屏分块、图片按 alpha 选 JPEG/WebP、Splash 等待首屏字体/关键图片 decode 的有界 readiness 协议；范围与验收见 [Phase 17 基线](PHASE_17_RENDERER_STARTUP_PERFORMANCE.md)。
- `docs/tutorials/` 与 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/` 是用户未跟踪现场，继续不纳入提交且不得触碰。
- 实现已完成：12 张主图 16,612,583 → 2,093,673 bytes（-87.4%）；入口 JS 约 4.2 MB → 347,441 bytes，Monaco 3,828,397 bytes 隔离为编辑器按需 chunk。
- 启动链路现等待 Renderer 首屏 commit、字体与关键图片 decode，Renderer 2.5 秒/Main 8 秒双兜底，并保留 5 秒最短动画；GPU 合成默认启用，`CATNIP_DISABLE_GPU=1` 为显式兼容回退。
- 性能专项、开发版真实 CDP、Explore/150% 布局、模型中心、模型选择、安全首启、Runtime/Electron typecheck 和 Main/Renderer build 已通过。完整 Windows 包未重建，记 `NOT VERIFIED`。

## 2026-09-12 — Phase 16 模型与凭证管理开工

- 当前施工分支为 `model-ccswitch`，从 `origin/catnip-GUAGUA` 的 `f2449a19` 创建；远端恢复点 `backup/pre-model-ccswitch-20260912` 已核对为同一提交。
- 用户确认三个目标：CC Switch 类似的模型管理工作区、Agent 对话显式模型选择、知乎已连接后的 Access Secret 维护入口。
- 施工范围和安全/测试边界见 [Phase 16 基线](PHASE_16_MODEL_CENTER_AND_CREDENTIAL_MAINTENANCE.md)。先完成并远端核对独立文档提交，随后按 16b→16g 小闭环推进。
- `docs/tutorials/` 和 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/` 均为未跟踪现场，不纳入 Phase 16 文档提交；后者不得触碰。
- 文档基线提交 `39dbfac6` 已推送并核对远端一致。16b 模型配置 Domain/Store 已实现并通过专项；下一小项是 16c Main 安全凭据 adapter 与旧 Key 非破坏迁移。
- 16b 提交 `1659b7ed`、16c1 提交 `e4c4a485` 已推送。16c2–16f 已完成模型原生安全输入、模型工作区、Agent 会话模型选择/任务快照和知乎凭证维护，并通过专项与 Renderer build；提交号须在本轮提交后动态补记。
- 16c2b 已收敛首次启动、软件助手与 Qwen：Renderer 明文输入/IPC 和 Key 路径已移除，三类运行链路优先读 safeStorage 与模型中心用途默认值；旧文件只作 Main 迁移兼容。
- 尚待闭环：原生安全窗口人工可用性、完整 UI/Windows 发布包回归；真实付费模型、真实知乎在线验证和硬件均未在本轮执行。
- 真实 Electron 模型中心几何回归已通过，并新增 `deepseek-v4-flash-agent` 增量内置档案，使 Agent 下拉真实出现 Pro/Flash 两项；完整 Windows 发布包仍未重打。

## 2026-09-12 — 固定深蓝主题与 150% 显示适配

- Renderer 现为 dark-only：`index.html` 在首帧前声明深色，`App.tsx` 固定 `data-theme="dark"`、清除旧主题偏好且不再渲染黑白切换按钮。
- 响应式锁覆盖 `1280x720`、`1707x960`、`1707x1067`。最小视口把 Agent 历史收为 44px 轨道并缩短公共顶栏，同时保留三个顶栏框和全部窗口控制。
- `verify_explore_layout_ui.cjs` 会截图并拦截三个目标视口的页面越界、探索横向裁切、输入框不可见、对话区过窄和阶段导航伸出标题框。
- 用户工程中未跟踪的 `.catnip` 数据未触碰。

## 2026-09-11 — Latest clean Windows package

- Rebuilt `electron/dist-package/win-unpacked` from an empty output directory at commit `69d895a7`.
- Package contains 41,927 files / 4,502,224,578 bytes. `Catnip Forge.exe` SHA-256 is `F62CAD60A7E94BAD05D4D6CF209F912670C8A652A4DDB35EA5FF611E9A01E226`.
- Release gate and isolated packaged first-run pass. Full filename scan finds no `.catnip`, local knowledge/favorites, conversation/history/session state, logs, events, recordings, browser profile, or real DeepSeek/Qwen key.
- Temporary first-run APPDATA and all packaged verification processes were removed. The user's development `.catnip` directory remains untouched and untracked.
- Pre-package remote recovery tag: `backup/pre-clean-package-20260911` → `69d895a7`.


## 2026-09-11 — Latest workspace correction: Task Manager / Monitor

- Normal desktop startup now opens Explore; the workbench smoke-test fixture still starts in Repository for its isolated assertions.
- Task Manager follows the blue-purple Build/Flash reference with distinct cyan and violet operation bands, a gradient result surface, and a transparent generated 学院呱呱 empty-state asset.
- The duplicate standalone `完整日志` entry is removed. `实时日志` remains for the rolling event stream, while each history row's `查看` action opens that task's scoped log.
- Monitor fields, panels, buttons, and status surfaces use the same deep blue-violet tokens.
- Evidence: Electron typecheck, Explore UI contract, Renderer build, live CDP interaction checks, and `electron/.tmp/phase15-pass19-task-manager-comparison.png` pass. The desktop app is left open on Explore.


## 2026-09-11 — Latest repository workspace correction

- Repository uses the selected deep-blue Skill Repository layout with working Skill filters, search, sort, and existing Skill Manager actions.
- Hardware projects and reference code stay expanded and enumerate real top-level folders. Each collection has `立即同步` wired to the existing overview refresh and `打开目录` wired to the guarded folder bridge.
- The renderer smoke contract requires Skills-first ordering, expanded folder-only resources, and both collection actions.
- Evidence: Electron typecheck/Main/Renderer builds and live 1124 × 912 CDP verification pass; `electron/.tmp/phase15-pass18-repository-comparison.png` is the same-size visual comparison.
- The standalone workbench smoke launcher still hits the pre-existing Windows Chromium GPU-process failure; do not report it as passed. The desktop app is left running for review.

## 2026-09-11 — Latest correction: empty drafts and history rename

- `returnToExploreHome` discards only a pristine default draft. Any input, custom title, result, conversation, plan, handoff, or execution state keeps the session.
- Recent Explore history has inline rename/save/cancel controls. `sessionTitle` is independent from request input, so autosave and reopen preserve custom names.
- The layout smoke verifies immediate-return cleanup and custom-title persistence across reopen; existing analysis, plan, workspace-switch, and concurrent-mode scenarios continue to pass.

## 2026-09-11 — Latest correction: concurrent Explore sessions and source links

- Idea and Diagnosis analyses are now isolated by originating session/request. Switching modes during analysis is supported; late status/result/error events persist to the background session and do not replace the active screen.
- The conversation visibly records the official Zhihu Skill search start and traceable-source return state.
- Analyze-stage cards use the deep-blue visual system with readable secondary copy.
- Zhihu source buttons use the Main-process external URL bridge. The bridge accepts only credential-free HTTP/HTTPS URLs and opens them in the system browser.
- Regression evidence: `verify:explore-ui`, `verify:explore-layout-ui`, Electron typecheck, Main/Renderer builds, and `electron/.tmp/phase15-pass16-results-comparison.png`.

## 2026-09-11 — Latest UI correction: shared Explore header

- Idea now uses the Diagnosis header geometry: 132px surface, 48px return button, 31/69 copy-to-stage grid, and 62px stage cards.
- Both initial flow screens keep their own wording/art while sharing identical alignment and responsive breakpoints.
- Draft badges are hidden on both initial screens; non-draft runtime statuses remain supported.
- Evidence: `electron/.tmp/phase15-pass15-flow-header-parity.png`; layout regression gate passes at the shared 1448 × 1086 viewport.

更新时间：2026-09-11（Asia/Shanghai）

这是下一位施工 Agent 的第一入口。开工必须动态执行 `git branch --show-current`、`git status --short --branch`、`git rev-parse HEAD`，并只读核对 `origin`；下列提交号是交接审计时证据，不代替实时 Git。

## 当前 Git 与保护现场

- 工作区：`E:\Agent\vibeide\vibeide`；当前施工分支：`model-ccswitch`。
- Phase 16 开工基线 local、`origin/catnip-GUAGUA` 与新分支起点均为 `f2449a19`；任何后续 hash 必须动态查询。
- 恢复点 `backup/pre-phase-14-doc-handoff-20260911` 已推送并核对为 `881121f8`。Phase 13 恢复点 `backup/pre-phase-13-20260911` 为 `2a7ae185`。
- 未跟踪的 `docs/Catnip_Forge_UI_Handoff/` 和 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/` 属于用户现场。本轮没有暂存、删除或改写；接手时继续保护，不得用 `git clean`。
- 只推 `origin`，不推 `upstream`；禁止 worktree、擅自 stash、`reset --hard`、`clean -fd`、force push 和宽泛 `git add -A`。

## 当前产品真相

- 产品：Catnip Forge / Catnip 硬件智能开发平台 / Autonomous Hardware Development Agent。
- 当前公开版本 `v2.0.0`，Build `7201`，npm `2.0.0-7201`，Windows PE `2.0.0.7201`。
- 七个可见工作区：仓库、监视器、任务管理器、编辑器、探索、模型、Neil 的 skill 小站。模型工作区管理本机供应商/模型元数据与安全凭据状态，不新增 Agent 或任务系统。Skill 小站当前只负责在内置浏览器打开固定站点且不显示录制控件；代码中尚无已验证的站点 → 本地 Skill Manager 一键安装桥，不得把网页下载能力写成本地自动安装完成。
- 当前工程是仓库/编辑器、Build/Flash/Serial、任务证据、工程 Agent、Explore Context/Handoff 的唯一工程上下文；冷启动必须显式选择或创建工程。
- 工程 Agent 数据位于 `<project>/.catnip/agent/`；Explore 多历史位于 `<project>/.catnip/explore/<mode>/<sessionId>/`；交接材料位于 `<project>/.catnip/handoffs/<sessionId>/`。
- Explore 使用独立对话通道。找灵感/解问题每条历史保存草稿、选择、结果、来源、对话、阶段和交接状态；生成材料或确认提交后仍能恢复查看。
- 四阶段可回看已到达步骤。第三步只生成计划与交接材料；第四步从磁盘重读并展示，可编辑保存、打开所在目录。只有用户明确确认后才进入既有工程 Agent 队列。
- 本地知识库仍在 Electron userData；收藏可带受限来源 Explore 对话快照并可单条删除。相关历史只自动发现，必须由用户勾选才进入 Context。
- 吉祥物和独立软件助手名为“Neil·Bauman's 学院呱呱”。其知识覆盖 v2.0.0、探索与 Skill 小站；作者 GitHub 只通过 Main 固定白名单在系统浏览器打开。
- 新手旅程版本 7，覆盖探索独立历史、四阶段门禁、Skill 小站与学院呱呱。探索首页两入口已使用紫色/青色学院呱呱场景插画。

## 已完成阶段

- Phase 0–6：官方 `zhihu` vendor Skill、连接/Secret 隔离、固定双搜索桥、受限分析与计划、结构化结果、知识收藏/验证和 Windows 基础发布链已实现。真实找灵感曾取得 8 条知乎来源并返回 3 个合法 Idea。
- Phase 7：冷启动工程门禁、全模块当前工程绑定、按工程 Agent 会话与 Explore 多历史完成。
- Phase 8：工程内 `.catnip` 分层、独立 Explore 对话、可回看四阶段、磁盘 Handoff 和一次性确认门禁完成。
- Phase 9：按用户授权删除既有使用记录和四个指定 Skill；当前不再展示“未归属·只读”Agent 历史。四个 Skill 为 `1688-source-finding`、`bilibili-search-workflow`、`douyin-product-rank`、`taobao-listing`。
- Phase 10：修复 Explore 编辑黑屏、计划执行态、可编辑/可打开材料、字号/步骤框、当前工程标识，并升级 v2.0.0。
- Phase 11：补强确认后的 Explore 持久化；新手引导、学院呱呱知识和作者 GitHub 白名单入口完成。
- Phase 12：学院呱呱输入区/发送按钮/头像/GitHub 按钮完成；收藏保存来源对话快照和删除完成；入口色彩增强。
- Phase 13：找灵感/解问题学院呱呱插画、透明 PNG 门禁和 8 场景响应式布局验证完成。
- Phase 15：按用户目标图完成星空品牌壳、Agent 欢迎区和亮色 Explore 首页升级；保留六工作区、真实工程数据和 Explore 四阶段门禁。同视口评审见根目录 `design-qa.md`。
- Phase 15 第二轮：历史侧栏与 Agent 呱呱按局部参考重做；Explore Hero、双入口与下方摘要进一步对齐；顶部品牌、六标签、当前工程和设置已成为不受分栏影响的独立首行。1536 × 1024 导航几何与 8 组 Explore 布局门禁通过。
- Phase 15 第三轮：Explore 双入口增高约 50%，历史/知识/工程行强化为独立卡片；主窗口改为无原生标题栏，由顶栏右侧真实最小化、最大化/还原、关闭按钮控制。六标签收拢到中部约 48% 宽度，1573 × 1276 下摘要区纵向填充，专项布局门禁与同屏视觉 QA 通过。
- Phase 15 第四轮：顶栏拆为品牌、六标签、工程/设置/窗口操作三个独立框；中部在 2048px 视口占约 50%，任务管理器完整显示。用户提供的方形呱呱已用于品牌与 Electron PNG/ICO；助手链接改为 `Neil Bauman · GitHub`，不再使用“作者”称谓。
- Phase 15 第五轮：移除三个分段上的 NES 黑灰表面，并彻底清空全宽定位层的背景、阴影、滤镜与伪元素；现在只有三个蓝色半透明玻璃框，框间直接露出星空壁纸。专项门禁已覆盖该材质契约。
- Phase 15 第六轮：Explore 双入口增至桌面 500px，知乎状态与安全连接操作成为左侧独立卡片；首页改为低亮度蓝紫渐变并系统放大标题、正文、标签与数据文字。2048 × 1105 归一化对照和可读性门禁通过。
- Phase 15 第七/八轮：启动页改为新软件图标、透明学院呱呱、深蓝彩色表面和 13px 蓝色进度条；Explore 连接入口并入 Hero 背景，历史/知识获得独立稳定滚动区并约束长路径；历史夜景扩大填充，Composer 操作进入输入框且发送改为纸飞机；品牌去框并放大；Skill 小站压缩为蓝色单行标签/地址栏。专项构建、布局与视觉比较通过。
- Phase 15 第九轮：历史夜景从会话列表列提升为整个左侧历史面板的统一背景，44px 功能轨不再是纯色空带；素材按 112% 面板高度等比铺放，减少中段纯蓝留白并避免 128% 方案的角色过度裁切。
- Phase 15 第十轮：删除历史功能轨的 1px 硬分隔线和阴影，并以向右透明的深蓝渐隐替代矩形遮罩；夜景在图标轨和列表列之间连续显示。

## 最新发布与验证证据

- 成品：`electron/dist-package/win-unpacked/Catnip Forge.exe`，EXE 188,969,472 bytes。
- Phase 13 `pack:win`、`verify:release`、`verify:version` 通过；发布目录总计 4,468,679,868 bytes。
- 随包 Node v22.14.0、隔离 Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；DeepSeek/Qwen API Key 未入包。未配置代码签名。
- Runtime/Electron typecheck、Main/Renderer build、Explore UI 和布局专项通过。布局覆盖 Explore 宽度 534–1802px，两张图完成加载且不遮挡文字，Renderer console error 为 0。
- 最新布局专项额外验证：顶部品牌无框且图标 ≥40px、Composer 操作位于统一输入框内、纸飞机按钮保持蓝色、历史图覆盖扩大、Explore 历史/知识滚动槽稳定、长工程路径省略、Skill 小站单行高度 ≤64px 且旧冗余栏不存在。
- 历史插画门禁额外确认：图片只挂在整个 `.chat-history`，主列背景图为 `none`，背景尺寸为 `auto 112%`，功能轨遮罩 alpha 为 0.62；聚焦对照见 `phase15-pass9-chat-comparison.png`。
- 历史接缝门禁额外确认：功能轨 `border-right-width: 0px`、`box-shadow: none`，遮罩为向右透明的线性渐隐；聚焦对照见 `phase15-pass10-chat-seam-comparison.png`。
- Windows Headless Chromium 退出时偶发临时 profile `EPERM` 最佳努力清理提示，但专项退出码为 0；不要误记为产品失败。

## 尚未完成与不得虚称

- Skill 小站到本地 Skill Manager 的下载安装桥尚未找到实现或专项证据；若继续施工，必须复用现有 Skill Manager，并先定义来源、确认、路径和覆盖保护，不能让网页直接获得任意文件写权限。
- `LIVE_DIAGNOSIS_PENDING`：真实“解问题”尚未完成知乎 + 全网双搜索成品验收。
- `REAL_HARDWARE_VALIDATION_PENDING`：本轮没有真实工程 Agent 改码、真实 Build、Flash、Serial 或设备运行证据。
- 全新 Windows 用户从安装官方 CLI、输入 Access Secret 到 connected 状态的人工流程尚未验收；代码签名也未完成。
- 用户尚需对最新 v2.0.0 成品做完整人工体验验收。软件测试、mock、截图和打包成功均不能替代真实网络或实机证据。

## 下一步

1. 人工复测最新 v2.0.0：六工作区、新手引导、学院呱呱、Explore 历史恢复/删除、材料编辑打开和确认提交。
2. 完成并验证 Skill 小站 → 既有 Skill Manager 的安全下载安装闭环；不得新增第二套 Skill 存储或让网页直接写任意路径。
3. 经用户明确授权再做真实 Diagnosis；有开发板与端口授权后才进入工程 Agent 修改 → Build → Flash → Serial → 知识验证闭环。

## 必读顺序与关键入口

1. `AGENTS.md`、[Product Truth](../product/PRODUCT_REQUIREMENTS.md)、本文。
2. [主约束](CODEX_MASTER_REQUIREMENTS.md)、[施工计划](CONSTRUCTION_PLAN.md)、[分层契约](LAYER_CONTRACT.md)、[流程](WORKFLOW.md)、[工具边界](TOOL_POLICY.md)、[测试指标](TEST_METRICS.md)。
3. [Phase 10](PHASE_10_UI_V2_BASELINE.md)、[Phase 11](PHASE_11_HISTORY_ONBOARDING_GUAGUA.md)、[Phase 12](PHASE_12_GUAGUA_EXPLORE_POLISH.md)、[Phase 13](PHASE_13_EXPLORE_ENTRY_ILLUSTRATIONS.md)。
4. UI：`BrowserPanel.tsx`、`ExplorePanel.tsx`、`ChatPanel.tsx`、`CatnipOnboarding.tsx`、`App.tsx`；Main/IPC/Agent/Hardboard 入口以 `AGENTS.md` 为准。

## Secret 与施工门禁

Secret 不进源码、Renderer、Chat、日志、URL、截图、Agent 输出或包。官方 Zhihu 首次使用仍先运行 vendor `scripts/run.* status`；安装/升级 CLI 必须按官方 Skill 取得授权。Explore 只分析，交接文件是确认前唯一允许写入工程的内容。任何“完成/成功/正常”声明必须附真实文件、Build、Flash、Serial 对应证据。

## 2026-09-11 最新视觉收敛

- Phase 15 第十一轮将知乎已连接/检查中状态收紧为 52px 单行卡，平台名、连接结果和重新检查完整显示；安装、Secret 与错误态保持展开高度。
- 布局门禁确认紧凑状态卡完全落在 Explore Hero 内；聚焦证据为 `electron/.tmp/phase15-pass11-zhihu-status-comparison.png`。

## 2026-09-11 找灵感工作页高保真重构

- 按用户选定的 1421 × 1105 目标图，将找灵感工作页重构为深蓝 30/70 两列：左侧集中想法输入、示例、真实工程条件、主操作与本次探索对话，右侧为学院夜间研究室 Hero 和结构化结果空态。
- 新增真实位图 `electron/src/renderer/assets/explore-idea-workspace.png`；可见图标继续使用 Lucide，未用 CSS 图形冒充插画或新增第二套 Agent/Skill/任务系统。
- 四阶段导航补充副说明；示例标签可回填输入；知乎连接状态、既有 Explore Session、分析/计划/确认门禁及 Agent 交接行为保持不变。
- 1421 × 1105 同尺寸证据为 `electron/.tmp/explore-idea-workspace-target-1421x1105.png`，源图/实现纵向对照为 `electron/.tmp/phase15-pass12-idea-comparison.png`。
- TypeScript、Renderer build、Explore 静态契约及布局专项通过；布局专项同时覆盖 8 组响应式、Diagnosis 四阶段与 handoff 恢复、console error 0。
- 本轮未执行真实知乎搜索、Build/Flash/Serial 或实机动作；`REAL_HARDWARE_VALIDATION_PENDING` 保留。

## 2026-09-11 解问题工作页高保真重构

- 解问题初始页已按 1448 × 1086 目标改为深蓝 30/70 双列；左侧保留真实问题输入、Context 勾选、工程证据、历史知识和分析动作，右侧加入学院呱呱诊断工作室 Hero 与三类报告空态。
- 新增 `electron/src/renderer/assets/explore-diagnosis-workspace.png`；问题示例按钮可回填输入，Context 卡仍绑定原 checkbox，四阶段 Analyze → Plan → Handoff → Agent 确认门禁未改。
- 布局门禁新增同尺寸 Diagnosis 描述态，验证问题卡、至少 5 条 Context、真实插画、4 个阶段副说明、双图标 CTA、深色画布和列高关系；既有 8 组响应式及全流程仍通过。
- 同尺寸证据：`electron/.tmp/explore-diagnosis-workspace-target-1448x1086.png`；源图/实现对照：`electron/.tmp/phase15-pass13-diagnosis-comparison.png`。
- 未执行真实知乎/全网搜索、Build/Flash/Serial 或实机动作；`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留。

### 解问题头部纠偏

- 用户实屏发现返回键被标题遮住、说明文字越过头部边框、草稿状态掉到问题卡上方。现已将返回键固定为头部内的 48px 绝对定位控件，头部增至 132px，桌面说明保持单行；Diagnosis 草稿态隐藏，其他运行状态保留。
- 布局专项新增返回键边界、标题说明边界与草稿隐藏断言，1448 × 1086 截图复核通过。

## 2026-09-12 知乎 Access Secret 安全窗口修复

- 新电脑出现“个人中心已打开、但没有 Secret 输入窗口”的根因，是 Main 只等待 PowerShell 进程 spawn，随后 detached/unref；WPF 尚未完成渲染时宿主可能已经退出。
- 安全窗口现在保持挂接，并在 WPF `ContentRendered` 后通过 Electron userData 下的一次性 ready 文件确认真正可见；Main 对提前退出和 15 秒超时返回明确错误，确认后立即清理标记。
- Explore 连接卡会分别显示“正在从知乎官方下载并校验 CLI”和“正在等待 Access Secret 安全窗口显示”，用户不再需要猜测当前阶段。
- 用户已目视确认诊断启动时遮罩输入窗口弹出。测试没有填写、读取、记录或截图真实 Secret；正式配置仍只通过官方 `zhihu` Skill 的 `auth set --secret-stdin` 写入系统凭据库。
- 首启验收最初为了隔离 userData 误用了 `VIBEIDE_SMOKE_WORKBENCH_OPEN=1`；该模式会完成仓库 smoke 后主动关闭 Main，因此人为制造了只剩 27% splash 的状态。失败实例均在保护门限按精确 PID 清理，生产启动页改动已全部撤回。`VIBEIDE_SMOKE_APP_DATA` 现可独立重定向测试数据；按正确模式重打包复测后，原启动页正常结束，首启弹层、品牌、Skills、Playwright 与占位 Key 拒绝均通过。
- 最终干净成品位于 `electron/dist-package/win-unpacked`，版本 `v2.0.0` build `7201`，总计 4,502,226,610 字节；EXE SHA-256 为 `80490D0441CF9ACBDCA8E3495442046AA70CCDD4B7A40C931D7F3360ED96D368`。发布/版本/隔离首启门禁及本地数据排除扫描通过。
## 2026-09-12 — Windows 解压包目录命名

- 当前 Windows 解压包交付根目录为 `electron/dist-package/Catnip Forge`，可执行文件为其下的 `Catnip Forge.exe`；`win-unpacked` 仅是 electron-builder 构建中的瞬时目录。
- `pack_win_unpacked.cjs` 会拒绝清理 Electron 工作区之外的输出路径，打包前清空安全限定的输出根，避免旧包可变数据污染候选包。
- `verify:release`、打包聊天烟测及依赖 packaged Playwright 的验证默认路径已同步至新目录。
