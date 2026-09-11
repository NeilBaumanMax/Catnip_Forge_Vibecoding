# Phase 15：Catnip Forge 品牌壳与探索首页视觉升级

日期：2026-09-11

施工分支：`catnip-GUAGUA`

施工基线：`d4a4524ee760cb25881c53b5b7cfa94ed8c952e1`

远端恢复点：`backup/pre-phase-15-visual-shell-20260911`

## 1. 用户目标与视觉真相

用户提供两张同一状态的桌面端截图：

- 目标图：基于真实页面用 AI 生图软件改造的明亮蓝紫学院风 Catnip Forge。
- 基线图：当前 `catnip-GUAGUA` 分支运行出的深色真实页面。

本阶段以目标图的布局、层级、色彩、圆角、留白、品牌氛围和信息密度为视觉真相，以当前真实代码与 Product Truth 为功能真相。目标不是制作静态假页面，而是在保留真实数据和交互的前提下，将现有 Electron Renderer 升级到目标图方向。

目标桌面视口为 `1536 × 1024`。等比或近似宽屏下应达到以下构图：

1. 顶部形成连续的品牌导航壳：左侧 Catnip Forge 标识，中部六个现有工作区，右侧当前工程和窗口操作区。
2. 左侧工作区形成“历史列表 + Agent 对话”双列结构，当前空会话显示学院呱呱欢迎区、四个真实快捷提问和推荐问题。
3. 探索首页形成浅色内容画布：顶部品牌 Hero、找灵感/解问题双入口、最近探索记录、知识库和当前工程摘要。
4. 全局使用深蓝星空外壳、半透明玻璃层、蓝紫高光和学院呱呱插画；内容画布保持足够亮度与可读性。

## 2. 产品与安全边界

- 六个工作区、当前工程选择、Agent 对话、Skill Manager、Runtime MCP、Hardboard 与 Explore 四阶段均继续复用现有实现。
- 探索首页仍只有“找灵感 / 解问题”两个入口；不新增搜索 Feed、云服务、OAuth、第二套 Agent、Skill 或任务系统。
- Explore 仍只分析和生成交接材料；用户明确确认前不得修改工程、Build、Flash 或操作 Serial。
- UI 可以重排和增加当前已有数据的摘要，但不得用目标图中的静态示例替代真实会话、知识卡、工程文件或连接状态。
- 不读取、展示或写入 Secret。截图、测试产物和新增位图不得包含 Secret。
- 本阶段不进行真实搜索、不消耗模型/知乎额度、不执行 Build/Flash/Serial；硬件状态继续记 `REAL_HARDWARE_VALIDATION_PENDING`。

## 3. 施工范围

允许修改：

- `electron/src/renderer/App.tsx`
- `electron/src/renderer/components/BrowserPanel.tsx`
- `electron/src/renderer/components/ChatPanel.tsx`
- `electron/src/renderer/components/ExplorePanel.tsx`
- `electron/src/renderer/styles/global.less`
- `electron/src/renderer/styles/explore.less`
- `electron/src/renderer/assets/` 下本阶段新增的项目位图资产
- 与上述 UI 契约直接相关的 `electron/scripts/verify_*` 脚本
- 本文、`HANDOFF.md`、`TEST_METRICS.md`、`DEV_PROGRESS.md`、`LOG.md` 等施工证据文档

默认不修改 Main、Preload、Gateway、Worker、Runtime、Hardboard、Skill Manager、官方 `zhihu` vendor 文件和持久化 Schema。若真实实现证明必须跨层，先回写本文并重新核对分层约束。

## 4. 视觉与交互实现决策

### 4.1 全局应用壳

- 保留原生 Electron 桌面窗口和现有窗口控件，不伪造第二套系统窗口行为。
- 用 CSS Token 统一深蓝背景、玻璃面板、蓝紫强调色、圆角与阴影；目标图中的流体星空作为单独的装饰位图资产，不在 DOM 中用大量元素模拟。
- 顶部六个工作区继续使用真实 `BrowserPanel` mode；激活态、键盘焦点和当前工程切换保持可操作。

### 4.2 Agent 区

- 保留真实按工程会话列表、重命名、置顶、删除、消息发送、附件和 Skills 选择。
- 空会话将现有学院呱呱资产用于欢迎插画，快捷提问只调用既有输入/发送路径，不创建独立 Agent。
- 历史栏在标准宽屏保持可见；紧凑视口允许折叠或压缩，不能遮挡发送按钮和核心输入。

### 4.3 探索首页

- 入口卡继续使用已验证的 `explore-idea-guagua.png` 与 `explore-diagnosis-guagua.png`，HTML 保留标题、说明和按钮文案。
- 最近探索记录继续来自当前工程 Explore Session；知识库继续来自本地 Knowledge Store。
- 当前工程摘要只展示 Renderer 已有的安全信息和有限文件入口，不扫描新目录、不制造虚假大小/日期。
- 连接状态继续真实反映官方 Skill 状态；只有可操作时才显示安装/连接步骤。
- 已有找灵感/解问题四阶段页面、Handoff 编辑与确认门禁保持功能等价，仅继承新视觉 Token。

### 4.4 响应式与可访问性

- 目标视口为 `1536 × 1024`，同时保留现有 `920 / 2560 / 3840` 与 Explore 宽度矩阵的可用性。
- 所有主操作保留可见焦点；正文与控件满足可读对比度；图片使用装饰语义时保持空 `alt`。
- `prefers-reduced-motion` 下取消非必要漂浮、位移和缩放动画；高对比度模式不能依赖背景图表达状态。

## 5. 实施顺序

1. 新增品牌背景位图，检查尺寸、裁切和透明/压缩质量。
2. 抽取全局视觉 Token，完成应用壳、顶部导航、左右分栏和 Agent 空态。
3. 重排探索首页 DOM 和 CSS；接入真实历史、知识与工程数据。
4. 保持探索流程页、Chat、工程切换和六工作区交互不回归。
5. 更新专项门禁，执行 TypeScript、Renderer build、Explore/Chat/Workbench UI 专项与 `git diff --check`。
6. 启动真实 Electron 开发版，在目标视口截图；把目标图和实现截图放入同一比较图，修复 P0/P1/P2。
7. 在仓库根写入 `design-qa.md`，只有 `final result: passed` 才进行交接。

## 6. 验收门禁

### 6.1 静态与构建

- `npm.cmd --prefix electron run typecheck`
- `npm.cmd --prefix electron run build:renderer`
- `npm.cmd --prefix electron run build:main`
- `npm.cmd --prefix runtime run typecheck`
- `git diff --check`

### 6.2 功能与布局专项

- `npm.cmd --prefix electron run verify:explore-ui`
- `npm.cmd --prefix electron run verify:explore-layout-ui`
- `npm.cmd --prefix electron run smoke:chat-ui`
- `npm.cmd --prefix electron run smoke:composer-geometry`
- `npm.cmd --prefix electron run verify:project-session-ui`
- `npm.cmd --prefix electron run verify:onboarding-ui`

若现有脚本因视觉重构中的正确 DOM 变化失败，先核对产品行为，再更新稳定契约；不得删除正确测试或放宽安全门禁来迎合实现。

### 6.3 视觉 QA

- 目标图与实现截图使用相同 `1536 × 1024` 内容视口和探索首页状态。
- 比较字体层级、区域比例、间距、颜色、位图质量、中文文案和核心控件可见性。
- P0/P1/P2 必须修复并重新截图比较；仅允许在 `design-qa.md` 中留下不阻塞的 P3。

## 7. 风险与非目标

- 目标图包含 AI 生成的示例历史、知识和工程文件；实现必须映射真实数据，空数据时使用诚实空态，因此内容数量不会逐字复制。
- 目标图大量依赖高亮背景和极细文字；实现将优先保证桌面软件可读性与键盘可用性，局部字号可能略大。
- 本阶段不重新设计探索四阶段的信息模型，不实现 Skill 小站到本地 Skill Manager 的缺失安装桥。
- Windows 完整打包不是本阶段首轮视觉迭代门禁；只有源码与真实 Electron 视觉验收稳定后，才决定是否生成新的发布候选。

## 8. 完成定义

- 当前真实 Electron 开发版在 `catnip-GUAGUA` 上呈现目标图方向的品牌壳、Agent 区和探索首页。
- 六工作区、当前工程、Agent、Explore 历史、知识卡和双入口仍连接真实逻辑。
- 相关专项与构建通过，首次失败、根因和复测均记录。
- `design-qa.md` 包含参考图、实现截图、同视口对比、交互与控制台检查，且最终结果为 `passed`。
- 未进行的真实搜索、Windows 新包和实机验证明确列为未验证，不以截图或 mock 代替。

## 9. 基线检查记录

- 首次 `git diff --cached --check` 失败：文档头部为 Markdown 强制换行保留了行尾双空格；根因是文档格式而非业务代码。
- 修复：改为独立空行分隔元数据，移除行尾空格；修复后重新执行 `git diff --check`。

## 10. 实施结果

- 新增星空应用壳位图和 Explore 学院 Hero 位图，不含烘焙文字、Logo 或伪造控件。
- 完成深蓝玻璃应用壳、蓝紫工作区导航、Agent 欢迎区与四个真实输入快捷项。
- Explore 首页完成亮色 Hero、紫/青双入口、跨列历史以及知识库/当前工程摘要；全部继续连接现有数据和四阶段流程。
- 目标图中的虚构历史、文件清单和重复左侧导航未复制；真实数据为空时保留诚实空态。
- 同视口并排评审证据与完整结论见仓库根目录 `design-qa.md`。
- 用户补充的角色/品牌与功能图标表纳入视觉真相；顶部六工作区和 Explore 双入口使用 `lucide-react` 独立矢量图标与蓝紫发光底座，不从大图硬裁 sprite。

## 11. 验证记录

- `npm.cmd --prefix electron run typecheck`：通过。
- `npm.cmd --prefix runtime run typecheck` / `build`：通过。
- `npm.cmd --prefix electron run build:main` / `build:renderer`：通过；接入图标库后 Renderer 2819 modules，仅保留既有大 chunk warning。
- `verify:explore-ui` / `verify:explore-layout-ui` / `verify:onboarding-ui` / `verify:explore-entry`：通过。布局门禁包含 1536 × 1024 目标截图、8 组响应式场景、四个 Agent 快捷项与完整 Explore 四阶段，控制台错误为 0。
- 图标接入后 `verify:explore-ui` 首次失败：旧正则要求 Explore 按钮中文直接作为文本节点，新的图标 + `<span>` 是正确 DOM 变化。将契约改为同时验证 `Compass` 和“探索”后复测通过。
- `smoke:chat-ui` 首次失败：固定 CDP 9230 端口已被用户打开的旧 `win-unpacked` 成品占用，脚本连到后台成品窗口并在 `skill-options-ready` 阶段超时。未终止用户成品进程；改由当前 Renderer 的 `verify:explore-layout-ui` 验证 Chat 快捷输入、品牌、composer 和发送按钮。`smoke:composer-geometry` 与 `verify:project-session-ui` 同样依赖该固定端口，本轮不再冒充重试。
- 视觉 QA 首轮发现 Hero 占高和下方摘要折行两个 P1/P2，修复并重新截图后清零。两次比较图合成命令分别因 .NET `Save` 重载选择和 PowerShell 类型语法失败，更正后生成完整与聚焦对照图。
- Headless Chromium 退出时仍有 Windows 临时 profile `EPERM` 最佳努力清理提示，脚本退出码为 0，不是产品失败。
- `git diff --check`：通过，仅有 LF → CRLF 工作树提示。
- 未运行真实搜索、模型 Agent 改码、新 Windows 包、Build/Flash/Serial 或实机验收；`REAL_HARDWARE_VALIDATION_PENDING`不变。
