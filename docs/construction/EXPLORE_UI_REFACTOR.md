# Explore UI Refactor 施工基线

日期：2026-09-10

施工分支（历史）：`EXPLORE_UI_REFACTOR`（从 `idea_to_production` 的 `d0265836` 创建）

重构前备份：`origin/backup/pre-explore-ui-refactor-20260910` → `d0265836`

合并状态：实现提交 `48dd8d32` 已通过 merge commit `669059c2` 合入并推送 `idea_to_production`；文档收尾为 `8f28ca3d`。合并前远端备份 `origin/backup/pre-explore-ui-merge-20260910` → `d0265836`。

## 目标与范围

只重构 Explore / 探索工作区的前端结构、布局、样式与交互层级，使其根据 Explore 自身可用宽度在 Compact、Normal、Wide 三档布局间切换，并在大屏形成输入/Context 与结果/Plan 并列的 Research Workspace。保留现有 Electron、Agent、Search、Handoff、Knowledge、Zhihu 安全连接与确认门禁，不修改 Main IPC 协议、Runtime 或 Hardboard。

允许修改：

- `electron/src/renderer/components/ExplorePanel.tsx`
- 必要的 Explore 纯展示子组件
- `electron/src/renderer/styles/apple.less`
- 必要的 `BrowserPanel.tsx` 容器/测试钩子
- Explore UI 契约验证脚本
- 本施工文档及收尾记录

## 当前实现能力清单（回归基线）

1. “探索”是 BrowserPanel 第五个可见工作区，并可从监视器、失败任务等入口携带问题线索进入 Diagnosis。
2. 首页提供找灵感、解问题、知乎四态连接与安装/Secret/重检动作、连接状态轮询、收藏数量和前六条知识预览。
3. Idea 流程保留目标、工程/硬件条件、请求准备、分析事件、Idea 全字段、来源、收藏、选定方向、只读计划、明确确认和既有 Agent 队列。
4. Diagnosis 流程保留有界 Context 收集、loading/error/available、工程/target/hardware/source/build/serial、相关收藏发现、默认不选、手动加入 Context、分析、Handoff、Plan 和 Confirm。
5. Knowledge 保留本地列表、重复收藏判断、三种验证状态、验证说明/证据/关联工程、相关搜索及显式 Context 选择。
6. Zhihu 保留 `connected / needs_secret / needs_install / error`；Renderer 只发起零 Secret IPC，Secret 继续在 Main 拉起的独立安全窗口中处理。
7. Plan 保留 steps、risks 和程序确认门禁；分析完成不得自动执行或修改工程。

## 已确认的 UI 缺口

- `.explore-entry-grid`、`.explore-connection-card`、`.explore-knowledge-preview` 被限制为 960px；`.explore-form` 被限制为 820px；Hero 被限制为 760px。
- 响应式主要依赖窗口 `@media (max-width: 820px)`，不能反映 Chat 分栏改变后的 Explore 实际宽度。
- Context、Knowledge、Source 和普通说明使用了过多 border/background/radius，信息层级接近卡片堆叠。
- Diagnosis 未渲染现有 `projectEvidence` 与 `sourceConflicts`。
- Source 未充分渲染现有 `type / excerpt / url`。
- 输入、结果与 Plan 持续纵向堆叠，缺少阶段位置和进入下一阶段后的聚焦。

## 实现约束与设计决定

- Explore 根元素建立 inline-size container；阈值采用 `<700px` 单栏、`700–1200px` Normal、`>1200px` Wide。
- Wide 使用约 320–440px 的输入/Context 轨道和 `minmax(0, 1fr)` 结果轨道；正文控制在约 70ch。
- Card 仅保留入口、Idea、关键连接动作、错误/冲突、结果重点和 Plan Confirm；Context、Knowledge、Source、Evidence、Risk 使用列表、分隔线与 tint。
- 使用集中 Explore tokens；Light/Dark 分别给出深蓝主色及低饱和 Indigo/Cyan/Purple/Orange/Green/Red 辅助色。
- Stage indicator 展示描述、分析、计划、执行；由当前异步状态和结果状态推导，不改变业务状态机。
- Plan 出现后聚焦 Plan；原输入/Context 变为可回看的紧凑侧栏摘要，不自动确认。

## 风险与验收

- 风险：现有正则型 UI 契约脚本依赖 JSX 文案/结构；拆分组件时必须同步增强契约，不能删除业务断言。
- 风险：异步 Analysis/Plan 共用事件通道；仅改变展示状态，不改变 listener 与 request/handoff ID 行为。
- 风险：Container Query 需要明确 containment 节点，并确保 Electron Chromium 版本支持。
- 风险：大屏视觉验证若只做静态 CSS 检查不足，需实际渲染并验证容器尺寸。

必须通过：Electron typecheck、Renderer build、Explore UI/entry/context/request/knowledge/analysis/handoff/Zhihu 专项、`git diff --check`。应执行可用 UI smoke；light/dark、Compact/Normal/Wide、Chat 24/34/45/52% 与折叠、大屏等必须留真实验证证据。未执行真实知乎网络或真实硬件操作时分别标记 `NOT VERIFIED`，不得由 UI 回归替代。

## 实现结果

- 新增 `ExploreStageNav` 与 `ExploreSourceList` 两个无业务状态展示组件；所有请求、异步事件、Knowledge、Handoff 和确认逻辑仍集中在原 `ExplorePanel`。
- 首页连接成功态缩为轻量状态行；需要安装、Secret 或错误时才使用带动作的 glass strip。Secret 仍只经 Main 原生安全窗口处理。
- Context、相关历史知识、Knowledge、Source、工程证据、Plan Steps 和 Risks 改为行、分隔线与 tint；Card 保留给两入口、Idea、冲突、Plan/Confirm 和验证浮层。
- 输入提交后折叠为目标/资料摘要；Idea 选择后突出当前方向；Plan 出现后成为主内容，原分析结论在明确的 details 入口中折叠。
- `explore.less` 提供集中 deep-blue 与辅助色 tokens、light/dark 变体、70ch 行宽、focus-visible 与 reduced-motion/transparency/contrast。

## 验证结果

- PASS：Runtime typecheck/build；Electron typecheck、Main build、Renderer production build。
- PASS：Explore UI、Entry、Context、Request、Knowledge、Analysis Gate、Search/Handoff、Zhihu Status、Zhihu Connection 全部专项。
- PASS：现有 `smoke:workbench`。
- PASS：新增 `verify:explore-layout-ui`；覆盖 8 个视口/分栏场景。1920×1080 的 Explore 实际宽度分别为 1412/1222/1013/880px（Chat 24/34/45/52%）及折叠 1854px；2560×1440 为 1365px；3840×2160 为 1801.6px；1200×900 + Chat 52% 为 534.4px。Wide flow 为 1644.4px、两栏，控制台错误 0。
- 首次 layout smoke 失败：浏览器测试 stub 缺少 BrowserPanel mode 变化所需的 `setBrowserBounds`，Explore 未挂载；补齐无副作用 stub 和诊断后复测通过。产品代码未因此放宽或增加 fallback。
- Renderer build 保留项目既有的 chunk >500kB warning；未更改构建配置掩盖。
- NOT VERIFIED：真实知乎＋全网 Diagnosis、真实模型/Agent 执行、真实 Build/Flash/Serial、实体 27 寸显示器人工观感。

## 合并验收

- `idea_to_production` 合并后重新执行 Runtime typecheck/build、Electron typecheck/Main build/Renderer build，全部 exit 0；Renderer 仍只有既有 chunk >500kB warning。
- 重新执行 Explore Context、Request、Knowledge、Analysis Gate、Search/Handoff、UI、Entry、Zhihu Status、Zhihu Connection 与 Layout UI 专项，全部通过。
- Layout UI 再次覆盖 1920×1080 的 Chat 24/34/45/52% 与折叠、2560×1440、3840×2160、Compact/Normal/Wide、light/dark、Diagnosis/Plan 和 console error 0。
- `smoke:workbench` 与 `git diff --check` 通过。未执行真实网络 Diagnosis、真实 Agent 执行、Windows 重新打包或硬件动作，原 NOT VERIFIED 结论不变。

## 合并后 Windows 包

- 随后从 `idea_to_production@8f28ca3d` 完整执行 `pack:win`，生成 `electron/dist-package/win-unpacked`；总计 4,464,604,893 字节，EXE `1.0.0.7201`。
- `verify:release`、`verify:version`、隔离 APPDATA 首启、打包版 UI smoke 与 app.asar Explore/连接标记通过；包未配置代码签名。
- 用户成品试用发现的 Explore 工作丢失和工程自动选择属于 UI 重构验收未覆盖的工程会话缺口；后续 Phase 7 已完成修复、专项和重新打包，见 [Phase 7 工程会话实施与验收](PHASE_7_PROJECT_SESSION_BASELINE.md)。本段保留缺口发现历史，但不再代表当前产品状态。
