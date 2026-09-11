# Catnip Forge 当前施工接力

更新时间：2026-09-11（Asia/Shanghai）

这是下一位施工 Agent 的第一入口。开工必须动态执行 `git branch --show-current`、`git status --short --branch`、`git rev-parse HEAD`，并只读核对 `origin`；下列提交号是交接审计时证据，不代替实时 Git。

## 当前 Git 与保护现场

- 工作区：`E:\Agent\vibeide\vibeide`；当前施工分支：`catnip-GUAGUA`。
- 文档审计开工时 local 与 `origin/catnip-GUAGUA` 均为 `881121f8`；Phase 14 文档提交后的 hash 必须重新动态查询。
- 恢复点 `backup/pre-phase-14-doc-handoff-20260911` 已推送并核对为 `881121f8`。Phase 13 恢复点 `backup/pre-phase-13-20260911` 为 `2a7ae185`。
- 未跟踪的 `docs/Catnip_Forge_UI_Handoff/` 和 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/` 属于用户现场。本轮没有暂存、删除或改写；接手时继续保护，不得用 `git clean`。
- 只推 `origin`，不推 `upstream`；禁止 worktree、擅自 stash、`reset --hard`、`clean -fd`、force push 和宽泛 `git add -A`。

## 当前产品真相

- 产品：Catnip Forge / Catnip 硬件智能开发平台 / Autonomous Hardware Development Agent。
- 当前公开版本 `v2.0.0`，Build `7201`，npm `2.0.0-7201`，Windows PE `2.0.0.7201`。
- 六个可见工作区：仓库、监视器、任务管理器、编辑器、探索、Neil 的 skill 小站。Skill 小站当前只负责在内置浏览器打开固定站点且不显示录制控件；代码中尚无已验证的站点 → 本地 Skill Manager 一键安装桥，不得把网页下载能力写成本地自动安装完成。
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
