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

## 12. 第二轮局部高保真收敛

用户于 2026-09-11 补充 7 张局部视觉真相，要求不再只参考总体风格，而是对以下区域做更精确的构图、密度和图标匹配：

- 历史侧栏：`codex-clipboard-58wGhG.png`，使用窄图标轨、历史列表和底部城市夜景 + 电脑呱呱的连续垂直构图。
- Agent 欢迎区：`codex-clipboard-iz0rJ0.png` 与 `codex-clipboard-k9i5ro.png`，主角是举星星的学院呱呱，快捷卡需增加颜色、内容层级和真实图标。
- Explore 总览：`codex-clipboard-3uGbOg.png`，Hero 不使用独立白色卡框；连接状态扩大并保持可操作。
- Explore Hero：`codex-clipboard-Ja58lU.png`，使用从深蓝到学院室内的通栏背景，中文标题直接落在背景上。
- Explore 双入口：`codex-clipboard-kQI9xb.png`，保持现有两张呱呱插画，增大卡高并露出完整角色；增加“从一个念头/线索开始”与底部语义标签。
- 下方信息区：`codex-clipboard-tZJcm1.png`，探索历史用带语义图标、时间和类型标签的紧凑行；知识库和当前工程并排，强调色、字重和分隔线与参考一致。

数据边界不变：参考图中的历史标题、日期、知识项和文件行只表达布局密度，实施不得写死或伪造；仍由当前工程的真实会话、Explore Session、Knowledge Store 和已有工程摘要驱动。

第二轮验收时将为历史侧栏、Agent 欢迎区、Explore Hero/双入口与下方信息区生成同视口局部对照；重新执行 Electron typecheck/build、Explore UI/layout、Onboarding 和 `git diff --check`。

## 13. 第二轮实施结果与故障记录

- 新增 `chat-history-night-v2.png`：按纵向槽位生成深蓝学院城市夜景、手写品牌句与电脑呱呱；Renderer 中仅作为历史侧栏背景。
- 新增 `catnip-agent-welcome-v2.png`：透明背景的举星星学院呱呱，替换 Agent 空态中比例和姿态不符的旧形象。
- 历史区增加窄功能轨、搜索、真实过滤和蓝色新对话按钮；Agent 空态增加四张彩色快捷卡和四条建议，均写入既有 composer。
- Explore Hero 去除独立卡框、放大连接状态；双入口提高卡高并增加语义标签；历史、知识和工程摘要按参考重排但不伪造数据。
- 顶部导航通过 React portal 提升为全局独立层，品牌、六工作区、工程选择和设置同排；设置继续调用既有外观/软件助手面板。
- `verify:explore-layout-ui` 第一次因旧测试仍在历史区查找品牌失败；更新为全局品牌和新增交互契约。
- 第二次因正文宽度选择器误命中入口插画失败；排除插画节点后发现约 5px 重叠，将插画宽度从 50% 收敛为 49% 后通过。
- 新增 1536 宽度顶部栏几何断言时，首次准确暴露设置按钮换到第二行；根因是导航仍受旧八列网格与 BrowserPanel 层级影响，改为全局 portal + 九列网格后通过。
- 第二轮同视口证据为 `electron/.tmp/phase15-v2-comparison.png`；最终视觉结论见根目录 `design-qa.md`。

## 14. 第三轮 16:9 与无边框窗口施工范围

用户以 `codex-clipboard-IPnre5.png` 指出 1573 × 1276 窗口下 Explore 下半部留白过大，并以 `codex-clipboard-JXPylP.png` / `codex-clipboard-IPnre5.png` 要求：

- Explore 双入口相对第二轮再增高约 50%，插画同步按 contain 放大但不得遮挡正文。
- Explore 历史、知识和当前工程区域随可用高度展开；列表行使用独立浅色卡片、边框与悬停态，避免信息粘连。
- 顶部应用栏收敛为“品牌左、导航居中、工程/设置/窗口控制右”的单行结构，标签宽度更紧凑，不再平均铺满整行。
- Windows 主窗口移除原生标题栏和菜单，使用 Renderer 自绘的最小化、最大化/还原和关闭按钮；按钮只通过最小 IPC 调用当前 `BrowserWindow`，不引入第二套窗口系统。

门禁新增：Main 窗口 `frame: false` / 无菜单，Preload 仅暴露三个窗口动作；Renderer 布局专项验证自绘按钮存在、同排、位于设置之后，Explore 入口增高且 16:9/高窗口下摘要区纵向填充。关闭按钮不在自动化中实际触发，避免破坏测试宿主进程。

## 15. 第三轮实施与复测结果

- Explore 双入口固定为 438px 高（紧凑视口 380px），相对第二轮 292px 提升约 50%；1573 × 1276 下摘要网格最小高度 490px，历史、知识和工程卡随剩余高度展开。
- 历史行、知识行和工程摘要行增加独立浅蓝底、边框、圆角与悬停态；真实数据为空时仍显示诚实空态，不写入参考图中的虚构内容。
- 主窗口改为 `frame: false` 并移除原生菜单；Renderer 顶栏新增最小化、最大化/还原、关闭三个按钮，通过 Preload 的三个最小 IPC 调用当前 `BrowserWindow`。
- 顶栏最终使用 12 列显式轨道：品牌、弹性留白、六个紧凑标签、弹性留白、工程、设置、窗口控制。旧九列 cascade lock 曾把窗口控制挤出视口，现由文件末尾 Pass 3 lock 覆盖并加入几何门禁。
- `verify:explore-layout-ui` 最终通过：1536 × 1024 标签组横跨 320–1054px（734px，约视口 48%），窗口控制位于 1389–1521px；1573 × 1276 两入口均为 438px、摘要区 558px、控制区右边界 1558px，console error 0。
- 同视口最终并排证据：`electron/.tmp/phase15-v3-final-comparison.png`。真实搜索、Build/Flash/Serial 和实机验证未执行，`REAL_HARDWARE_VALIDATION_PENDING` 不变。

## 16. 第四轮三段式顶栏与品牌图标

用户以 `codex-clipboard-NqedPo.png`、`codex-clipboard-F09384.png`、`codex-clipboard-dzsEqZ.png`、`codex-clipboard-I1Cmro.png` 补充以下真相：

- 助手 GitHub 按钮删除“作者”二字，仅保留 `Neil Bauman · GitHub`；无论贡献者数量如何变化，都不把 Neil 描述为唯一作者。
- 顶栏不再是一条连续长框，拆成品牌、六工作区标签、工程/设置/窗口操作三个独立玻璃框；中间框约占桌面视口 50%。
- 用户提供的方形呱呱图作为品牌和软件图标，生成 Renderer PNG、512px 应用 PNG 与包含 256px PNG 帧的 ICO；不重新绘制或替换角色。
- “任务管理器”必须完整显示；门禁检查文本边界位于按钮内部，不能依靠省略号掩盖布局不足。

最终 1536 × 1024 几何为：品牌框 x=14–234、中部框 x=319–1087、右侧框 x=1172–1522；“任务管理器”完整，三框分离且窗口控制位于视口内。2048px 实现截图为 `electron/.tmp/workspace-shell-target-2048x1152.png`，聚焦对照为 `electron/.tmp/phase15-v4-shell-comparison.png`。

## 17. 第五轮顶栏材质纠偏

用户以 `codex-clipboard-M4GJ1A.png` 和 `codex-clipboard-MFkVAd.png` 指出三段容器虽然已建立，但旧的外层长条材质仍覆盖整行，三段之间无法直接看到星空壁纸；同时 NES `is-dark` 表面产生了不符合目标的黑灰色框。

- 三个子容器移除 `nes-container is-dark`，统一使用原有深蓝半透明玻璃、蓝色细边框与轻量阴影。
- `.workspace-global-nav` 只负责全宽定位和三列几何；背景、边框、阴影、滤镜、背景模糊及伪元素全部关闭。
- 自动门禁同时验证外层计算样式为透明、无边框、无 `filter/backdrop-filter`，并验证恰有三个蓝色半透明子表面。
- 2048px 聚焦对照更新为 `electron/.tmp/phase15-v6-shell-comparison.png`：上行为用户指出问题的截图，下行为修复后实现；三段之间与段外均可直接看到未被长条遮暗的星空壁纸。

## 18. 第六轮 Explore 可读性与连接入口

用户以 `codex-clipboard-v0IC9N.png` 指出 Explore 首页入口高度仍不足、知乎状态/连接入口缺少独立边界、整体浅色画布过亮且文字尺寸偏小。

- 首页知乎状态从 Hero 胶囊摘要中移出，连接组件始终以左侧独立卡片呈现；已连接时保留重新检查，待配置/安装时复用原有安全连接操作和步骤。
- 双入口桌面高度从 438px 增至 500px，低高度窗口为 450px，窄容器为 410px；插画保持右侧 contain，不遮挡正文。
- 首页画布、双入口与三块摘要区改为低亮度蓝紫渐变，降低连续纯白面积，同时维持深蓝正文对比度。
- Explore 标题、正文、入口标题/说明/按钮/标签、历史、知识库和工程摘要文字分层放大；门禁验证入口标题不小于 31px、说明不小于 15px。
- 用户截图 2559 × 1381 归一化为 2048 × 1105，与同尺寸实现并排比较于 `electron/.tmp/phase15-v7-explore-comparison.png`。

## 第七/八轮：启动页、内容滚动与工作区细节收敛（2026-09-11）

- 启动页左上角使用既有新软件图标；学院呱呱由用户参考图经内置图像编辑补全为透明 PNG，保存为 `electron/assets/splash-guagua-v2.png`。
- 启动页保持原有真实进度时间线，只替换深蓝彩色视觉层和 13px 蓝色进度轨，不改变主进程启动语义。
- Explore 的知乎连接状态保留真实状态与安全操作，但进入 Hero 的同一连续背景；历史/知识列表各自拥有稳定滚动槽，长路径单行省略，不再越过条目卡片。
- 左侧历史夜景提高背景覆盖；Composer 改为一个统一容器，附件、Skills 和蓝色纸飞机发送按钮都位于容器内部。
- 顶部品牌去除独立外框，图标和副标题放大；中间/右侧蓝色玻璃框不变。
- Skill 小站删除重复的标签头、下方 Browser Workbench 和当前 URL 行，标签与地址表单合并为一条蓝色命令栏。
- `verify:splash-ui` 与 `verify:explore-layout-ui` 分别覆盖启动页资源/进度/无溢出，以及双滚动槽、路径省略、品牌、Composer、历史图、Skill 单行与既有响应式/四阶段流程。
- 对照证据：`phase15-pass8-splash-comparison.png`、`phase15-pass8-explore-comparison.png`、`phase15-pass8-chat-comparison.png`、`phase15-pass8-skill-comparison.png`；结论见根目录 `design-qa.md`。

## 第九轮：左侧历史插画满幅纠偏（2026-09-11）

用户以 `codex-clipboard-L7ufbW.png` 指出历史侧栏仍存在两类空区：插画只属于右侧会话列表列，44px 功能轨始终为纯色；原始纵向插画上部留白较多，导致高窗口中段仍像未铺图。

- 将 `chat-history-night-v2.png` 从 `.chat-history-main` 提升为整个 `.chat-history` 的统一背景，使功能轨与会话列表共享同一幅夜景。
- 背景按面板高度放大并保持底部锚定，裁去素材顶部的大块纯蓝留白，让城市、文案和学院呱呱更早进入可视区；禁止非等比拉伸。
- 功能轨、搜索区和列表只保留半透明深蓝可读层，底部不得重新覆盖为纯色；交互、真实历史数据和筛选行为保持不变。
- 布局专项门禁验证：背景资产只挂载一次、挂载于整个历史面板、垂直覆盖率大于 100%，且功能轨和主列均允许插画透出。

实施结果：夜景改由整个 `.chat-history` 统一承载，主列不再重复挂图；功能轨遮罩降至 0.62，插画以 112% 面板高度等比铺放并保持底部锚定。128% 首轮视觉检查出现角色过大和脸部裁切，随后收敛为 112%。聚焦对照为 `electron/.tmp/phase15-pass9-chat-comparison.png`，左为用户截图，右为实现；布局专项、类型、Main/Renderer 构建和 Chat 展示契约通过。
