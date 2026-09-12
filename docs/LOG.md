# 施工日志

## 2026-09-12 — 仅深色主题与高缩放屏幕适配

- 产品呈现改为只支持现有深蓝主题，不再提供黑白模式切换；旧浅色偏好无法在升级后恢复。
- 新增 1920x1080、2560x1440、2560x1600 在 Windows 150% 显示比例下的响应式规则和截图门禁。
- 第一次布局测试暴露默认进入探索后浏览器夹具注入过晚；无 preload 的测试夹具现安全落在仓库，正式 Electron 仍默认进入探索。
- 后续门禁依次发现通用深色 `.nes-btn` 覆盖纸飞机蓝色、紧凑高度下阶段导航伸出标题框；均完成根因修复后全矩阵通过。
- 最终静态探索门禁仍匹配旧的一行默认页实现；现已改为同时验证“真实 Electron 默认进入探索”和“无 preload 浏览器夹具延迟挂载探索”，避免测试实现细节反向限制运行时行为。
- `verify:software-assistant-ui` 首次没有可响应 CDP 主窗口而超时，随后命中了旧的 packaged renderer（仍显示 6 个按钮），因此不能作为新源码结论。其动作按钮期望值已从 6 更新为 4；自包含 live layout 夹具已真实打开软件助手并确认 4 个动作按钮、0 个主题按钮。

## 2026-09-11 — Clean package rebuild

- 建立并推送 `backup/pre-clean-package-20260911`，随后精确删除旧 `electron/dist-package` 并完整执行 `pack:win`。
- `verify:release` 通过；全包文件名扫描确认没有 `.catnip`、收藏/历史/会话状态、运行日志、事件、录制、Chrome profile 或真实 API Key。
- 隔离 APPDATA 首启第一次因默认探索使旧 `.chat-history-brand` 断言失效；改为校验当前 `.workspace-brand`（兼容旧聊天品牌）后复测通过。
- 验收临时数据和成品进程已清理；用户工程 `.catnip` 未触碰。


## 2026-09-11 — Phase 15 pass 19

- 默认可见工作区改为探索，并保留 smoke-test 专用仓库初始态。
- 任务管理器使用青蓝 Build、紫色 Flash、渐变结果区和新生成的透明学院呱呱空状态资产；监视器统一蓝紫主题。
- 经代码路径核对，“完整日志”和“实时日志”均来自同一 EventBus 窗口，因此移除前者；任务级日志仍从历史记录“查看”进入。
- `typecheck`、`verify:explore-ui`、`build:renderer` 及 1389 × 1132 桌面 CDP 状态/交互检查通过；无真实硬件操作。


## 2026-09-11 — Phase 15 pass 18

- 仓库首页升级为深蓝 Skill Repository；使用现有星空与学院呱呱资产，功能数据继续来自真实 Skill Manager / Workbench。
- 硬件工程和参考代码始终展开并展示一级目录；两个区域均提供“立即同步”和“打开目录”。
- Workbench smoke 合约补充常展开、folder-only 和双操作入口断言；真实桌面 CDP 在 1124 × 912 下通过视觉/DOM/同步点击检查。
- 修复窄视口收起 Agent 后的三列覆盖与 Skill 操作重叠。Electron typecheck、Main build、Renderer production build 通过；独立 workbench smoke 启动仍受当前 Windows Chromium GPU 进程故障阻塞，失败如实保留。

## 2026-09-11 — Phase 15 pass 17

- 修复 Explore 入口创建空草稿后直接返回仍残留“新灵感探索/新问题调查”的问题。
- 增加最近探索记录行内重命名；修复自动标题覆盖自定义名称的状态根因。
- `verify:explore-layout-ui` 新增空草稿 `3 → 2` 生命周期断言及重命名保存、重新打开、再次返回持久化断言。
- Electron typecheck、Explore UI contract、布局交互 smoke 和 Renderer production build 通过。

## 2026-09-11 — Phase 15 pass 16

- 修复找灵感分析尚未完成时切换到解问题仍被旧结果带回找灵感的问题：请求与原始 Explore session 绑定，后台消息、错误和最终结果串行写回对应会话。
- 分析前即保存用户输入与知乎 Skill 状态；取得来源后继续在“本次探索对话”突出显示处理进度。
- 结果区域收口为深蓝渐变卡片与高对比文字；知乎原文操作通过受控 `app:open-external` 在系统浏览器打开。
- `typecheck`、Explore UI contract、真实布局交互 smoke、Main build、Renderer build 和 `git diff --check` 通过；Chromium 临时目录仍可能出现退出后的 Windows EPERM 提示，但命令退出 0。
- 同尺寸视觉证据：`electron/.tmp/phase15-pass16-results-comparison.png`。

## 2026-09-11 — Phase 15 pass 15

- Standardized the Idea and Diagnosis flow headers on the Diagnosis layout geometry.
- Preserved flow-specific content (Idea sparkle and Diagnosis specialty badge) while unifying spacing, sizing, and responsive behavior.
- `verify:explore-layout-ui` passed with Idea/Diagnosis back-button, header-copy, hidden-draft, and geometry assertions; console errors remained 0.
- Visual comparison: `electron/.tmp/phase15-pass15-flow-header-parity.png`.

## 2026-08-08 — v1.5.0 Windows 成品重建与隔离 Python 验收

- 完整执行 Runtime/Electron typecheck、生产构建和 `pack:win`，重建后的 `win-unpacked` 共 41,920 个文件、`4,464,201,281` 字节，`app.asar` SHA-256 为 `7CEB034B634238D25CDB8552376E3718D6F6679598325ED9B0679C71630095B3`。
- 发布门禁确认成品版本 `v1.5.0`、Node `v22.14.0`、Claude Code `2.1.167`，DeepSeek/Qwen 真实 Key 均未入包。
- 根解释器与 Scripts 启动器均从 `resources/runtime/python/Lib/site-packages` 加载 serial、click、idf_component_manager 和 esptool；pyserial 3.5、ESP-IDF v5.4.3 通过，模块路径未逃逸到系统 Python、用户 site-packages 或旧虚拟环境。
- 无 Key 首启与保存一次性测试 Key 后自动重启闭环通过；测试 Key 和 8 个成品子进程已清理。首启 smoke 对 26px 品牌图改用 0.1px 浮点容差，兼容 CDP 返回的 `26.0000019px`，不改变产品 UI。
- 本轮没有真实 ESP/USB-UART，不把 IDF/Python 探针扩张为硬件烧录、串口或最终客户机分发已验收。

## 2026-08-08 — 开发仓库切换、主线合并与文档漂移修正

- 对外发布标签更新为 `v1.5.0`；内部 Build `7201`、npm `1.0.0-7201` 和 PE `1.0.0.7201` 保持不变，避免把未重打包的内部文件版本误写为新值。
- 默认远端 `origin` 切换为 `Catnip_Forge_Vibecoding`，当前施工源码与 `v1.0.0` 标签已同步，后续开发以该仓库为真相源。
- 审计确认远端 `main` 是 `qwen_vision_attachments` 的祖先，施工分支领先 38 个提交，可安全快进合并，不需要改写远端历史。
- README、接力文档、GitHub 同步说明、开发进度及现行 UI 施工文档统一更新为 `main`；Qwen 视觉、客户路径迁移和开发闭环施工文档保留历史分支并补充已合并状态。

## 2026-08-07 — 任务管理器滚动条 Apple UI 收口

- 先提交施工边界 `24107e22`，再在 `apple.less` 以主题变量统一工作台滚动区；任务表从旧 14px 蓝色直角滑块改为 8px 透明轨道、半透明系统灰圆角滑块，并提供 hover/active 即时反馈。
- 实现提交 `b6d11d15`；新增 `smoke:task-scrollbar-ui`，按指定 `app.asar` URL 检查横纵 overflow、scrollbar 宽高、track/corner、thumb 边框/圆角和 button。验收脚本补强提交 `424a1e00` 支持可选截图与 `Browser.close` 正常清理。
- 旧成品基线测试准确复现 `14px`、蓝色 thumb、非透明 track、`0px` 圆角；新成品两次返回 `ok=true`，值为 `8px`、透明轨道、`2px` 内缩边、`999px` 圆角、button 隐藏、横向 overflow 保留。真实窗口截图已人工复核。
- Electron typecheck、完整 `pack:win` 通过；未启动干净包的 `verify:release` 通过，总大小 `4,464,201,225` 字节，内置 Node/Python/ESP-IDF/Claude/Playwright 完整且无真实 key。干净包与 UI 验收包 `app.asar` SHA-256 一致。
- 两次原位重打包暴露旧标准包 `app.asar` 被占用；微软签名的 Sysinternals Handle 最终定位为当前 VS Code 主窗口 PID 30640。用户明确授权后，通过 UAC 只关闭两个精确文件句柄，VS Code 保持存活，标准目录完成切换。
- 第一次标准目录冷启动截图同时暴露中转 ready 包缺少 `runtime/nodejs`，EventBus 因此读取失败。立即从已通过发布门禁的同哈希干净包补齐 Node、Python、node_modules、Playwright、scripts 等资源；直接 EventBus JSON、Node `v22.14.0`、隔离 Python `3.12.9`/pyserial `3.5`、ESP-IDF `v5.4.3` 均通过。再次冷启动后，标准 URL 的滚动条 smoke 返回 `ok=true`，底部恢复“任务管理器正在订阅 runtime/hardboard/events”。
- 已删除旧残缺正式备份、第一份临时包、诊断工具和旧截图。因 VS Code 后续哈希读取，两个非正式目录各剩一个约 99 MB、无 exe 的锁定 `app.asar`；不影响标准成品，待 VS Code 正常退出后删除。

## 2026-08-07 — 成品 Runtime 三项可靠性修复

- 从真实成品会话确认 `click.core` 缺失、`IDF_PYTHON_ENV_PATH` 缺失和 `MSYSTEM=MINGW64` 污染；进一步证明旧校验使用的 `Scripts/python.exe` 会串到开发机系统 Python，造成假阳性。
- 重装被忽略的 `_bundled/python` ESP-IDF 核心依赖；应用统一使用根解释器，ESP-IDF Scripts 启动器补齐 DLL 和相对 `_pth`。打包前预检和成品发布校验现在都会验证关键模块路径及 `idf.py --version`。
- EventBus 增加跨进程 writer lock、磁盘序号重同步和坏尾行恢复；Renderer 改为最近 500 条按稳定事件 ID 去重，轮询防重入并显示错误。6 个子进程并发写入 120 条事件测试通过。
- Agent 输入框透明 textarea 与文字高亮层统一盒模型、边框、换行和滚动条槽位，聊天 UI smoke 增加几何一致性检查。真实成品首次验收发现全局样式令两层字号为 14px/13px，修正为同为 14px 后宽度、行高和全部计算样式断言通过。
- Runtime/Electron 类型检查及构建、结构测试 4 项、EventBus 专项测试、`git diff --check` 全部通过。修复版并列成品 `electron/dist-package-fixed/win-unpacked` 构建及 `verify:release` 通过，总大小 `4,464,199,142` 字节。
- 用户关闭旧实例后已重建原 `electron/dist-package/win-unpacked`；`verify:release` 通过，总大小 `4,464,220,642` 字节。
- 新增真实成品 `smoke:runtime-task-ui`：先确认首段 Build 事件进入任务历史和实时日志，再于面板保持打开时注入迟到进度/完成事件；下一轮轮询收到新日志并把任务更新为 completed。`smoke:chat-ui`、Electron typecheck、renderer build、发布校验和 `git diff --check` 同轮通过。
- 本轮三项用户问题已验收；ESP/USB-UART 真机烧录/串口、复杂文档视觉、真实云异常和最终客户机分发继续保持未验收边界。

## 2026-08-07 — 光标问题用户复测后重新施工

- 用户截图证明当前光标仍比末尾文字右移。直接连接截图中的 Renderer 后读取到 textarea 为 14px / 20.3px、高亮层为 13px / 18.85px，33 个字符累计约 31px 偏移；运行 URL 指向遗留 `electron/dist-package-fixed/win-unpacked`。
- 此前 smoke 只按同标题窗口连接，未核对成品路径，是误验收漏洞。施工文档重新打开并先提交 `bcf9203b`；实现提交 `f7d97e05` 将 packaged UI 验收绑定到指定 `app.asar` URL，并补齐 word spacing、kerning、ligature、text rendering 等字体指标。
- 新增 `smoke:composer-geometry`，在原交付成品中使用用户 33 字符原句验证：完整字体指标差异 0 项，高亮文字末端与光标字体镜像末端差值 `0px`；提交为 `2674a9bc`。
- 原交付目录重新完整构建并通过发布校验，总大小 `4,464,199,233` 字节。确认旧并列包无进程占用后已删除；当前正确成品启动后恢复了用户未发送原句和末尾选择位置。

## 2026-08-06 — 开发闭环流程整改启动

- 自查确认近期流程执行不一致：Qwen 附件和客户数据路径迁移保留了独立文档先行提交；共享串口控制与猫薄荷新手旅程没有完整保留“施工文档 → 编码 → 测试修改 → 验收”的提交阶段。
- 新增 `DEVELOPMENT_WORKFLOW_CONSTRUCTION.md`，把现状检查、施工文档先行、专项测试、失败修复、完整回归、人工/成品验收、文档收尾、精确提交、推送和远端确认设为强制闭环。
- 修正当前开发规则中的旧 `vibeide_Neil.git` 地址和已经过期的“不推送”任务级例外；历史日志继续保留原始事实。
- 2026-08-06 开工审计：工作区干净，当前分支 `qwen_vision_attachments` 无 upstream，`HEAD` 相对 `origin/main` 领先 20 个提交。后续先提交本轮纯文档基线，再执行完整验证、修复、验收和施工分支交付。
- 纯文档基线提交为 `9d3985c0`。结构测试初次因系统 Python 缺少 `pytest`/`PyYAML` 失败；依赖补入已忽略临时目录后 4 项通过。Runtime/Electron 类型检查、构建和 10 项逻辑专项验证全部通过。
- 首轮 UI 测试暴露沙箱权限、未启动桌面实例以及 CDP 宽泛标题误连 Splash 三类问题；在真实桌面权限下按正确编排复测，并修正聊天、软件助手和成品首启脚本只连接 `Catnip Forge ·` 主界面。聊天脚本增加启动状态稳定等待后，从应用启动直接复测通过。
- 工作台、启动页、聊天、软件助手和新手旅程 UI 烟测全部通过。Windows 成品重新完整构建为 36,992 个文件、`4,382,368,640` 字节；版本/发布资源、无 Key 首启和一次性测试 Key 自动重启闭环通过，测试 Key 与测试进程已清理。

## 2026-07-25 — 猫薄荷新手旅程

- 数据驱动离线导览升级为 v3 共 23 步：补充 Skill 三项操作、硬件工程/参考代码、Build/Flash 明确顺序、执行结果、编辑器分栏与字号、历史对话、专业视图、附件、Skills 和猫薄荷助手设置。
- 仓库、监视器、任务管理器和编辑器要求用户亲自点击高亮标签后推进；聚光层不截获目标指针，目标缺失时可安全跳过。
- 支持 24 小时稍后提醒、永久关闭、完成持久化、`Esc` 退出、左右方向键、深浅主题、窄窗口、减少动态效果/透明度和高对比度；助手顶部功能栏中亮暗主题旁的“？”可随时重播。
- 教程状态升级为 v3，旧 v1/v2 的完成或关闭记录会被安全忽略，让完成过简版旅程的用户再次收到详细版邀请，无需清空整个 `%APPDATA%` 用户目录。
- 根据真实全屏测试升级为 v4：进入历史/专业视图/输入/附件/Skills 前自动展开 Agent，进入猫薄荷说明前自动打开助手；受管理目标恢复期间不允许黄色跳过。
- 根据第 22 步真实复测升级为 v5：受管理目标在步骤停留期间持续检测，用户再次关闭猫薄荷助手后会自动重新展开，不再永久停在“正在恢复”；隔离 Chromium 回归会主动关闭助手并断言自动恢复。
- 聚光框改为逐帧跟踪目标位置，覆盖左右分栏收起/展开后的坐标变化；隔离 Chromium 回归会真实收起 Agent，并断言高亮跟随、Agent 恢复和助手恢复。
- 教程正文、标题、按钮和进度字号整体放大，卡片宽度提升至 380px，教程猫薄荷形象提升至 88px。
- 基础旅程不调用 DeepSeek/Qwen，不修改文件，不编译、烧录、连接串口或上传附件；工作台自动 smoke 显式禁用首次邀请。
- 新增 `verify:onboarding` 与隔离 Chromium `verify:onboarding-ui`：10 个稳定目标、持久化、重播、安全与辅助功能断言通过；真实 Renderer 中已走完首次邀请、四页面点击、完成状态和助手内重播，并生成 `electron/.tmp/catnip-onboarding-ui.png`。Electron typecheck、Renderer 生产构建和 `git diff --check` 通过。
- 按用户要求将教程重播入口移至助手顶部功能栏中亮暗主题旁的“？”，随后把教程扩展为 v3，使打开或完成过旧版成品的用户重新收到详细版邀请。
- 最终 v5 源码与同步用户手册已再次全量打入 Windows `win-unpacked`；`verify:version`、`verify:release`、20 个稳定目标专项回归和包含“关闭助手后自动恢复”的 23 步隔离 Chromium UI 流程通过，成品共 36,991 个文件，发布校验统计 `4,382,367,589` 字节、PE 版本 `1.0.0.7201`，DeepSeek/Qwen 真实 Key 均未入包。

## 2026-07-25 — 真实 Qwen 图片视觉验收与文档漂移修正

- 用户在当前界面自行配置真实 Qwen 服务，并在同一 Agent 任务中提交两张 PNG 图片；两个附件均触发“正在调用千问视觉”，返回记录显示模型为 `qwen-vl-plus`。
- 结构化视觉证据正确识别出智能手表/BANGBOO 线索以及 Espressif、ESP32、VS Code 开发环境，并被 Agent 主回答用于后续询问和 ESP-IDF 环境检查。
- 图片附件经真实云端识别、结果回传“执行过程”并被 Agent 使用的主闭环据此记为人工实测通过；不扩张为扫描 PDF、Word 内嵌图片、PPT 幻灯片视觉化或 401/429/超时/断网降级已通过。
- 同步修正 HANDOFF、开发进度、Qwen 施工文档和 Windows 发布检查表；保留自动化测试与打包门禁不使用真实 Key、不向云端上传文件的安全边界。

## 2026-07-25 — 完整打包后的施工文档漂移修正

- 以本地 Git 动态结果为准，将 README、GitHub 同步、开发进度、Apple UI 和任务管理器施工文档的当前施工分支统一为 `qwen_vision_attachments`（基于 `main`）。
- 将开发进度中的旧打包状态修正为完整打包与发布门禁已通过；当时真实 Qwen 联网服务和复杂文档页面视觉仍保留为未验收边界，随后图片视觉主闭环已由用户实测通过，见上方最新记录。
- 接力文档不再把早期 `main` 成品的 36,985 个文件误标为当时最终记录；该阶段成品为 36,991 个文件、`4,382,346,009` 字节并完成 Catnip user-data 启动验证，后续新手旅程重打包记录见本日志顶部，旧数据作为历史事实保留。
- Windows v1.0.0 发布检查表追加当前分支成品记录，不覆盖早期打包、首启和硬件验证历史。

## 2026-07-25 — Catnip Forge 客户数据路径迁移

- 目标路径固定为 `%APPDATA%\@Catnip_Forge\electron` 和 `C:\Catnip_Forge\hardboard`，新客户不再创建 `@vibeide` / `C:\vibeide-hw`。
- 先建立 [CATNIP_FORGE_DATA_PATH_MIGRATION_CONSTRUCTION](CATNIP_FORGE_DATA_PATH_MIGRATION_CONSTRUCTION.md)，再修改 bootstrap、旧数据迁移和 Hardboard 短路径。
- 已有 `%APPDATA%\@vibeide\electron` 数据采用非破坏性首次复制，新目录已存在时不覆盖；旧目录留作安全备份。
- Electron 主入口改为 bootstrap，保证 logger、session、附件和 Chromium 初始化前完成 `userData` 重定向；迁移跳过进程锁与符号链接。
- Hardboard 新建 `C:\Catnip_Forge\hardboard` junction，旧 junction 只在确认是符号链接后安全清理。
- Runtime/Electron typecheck 与隔离 `verify:data-paths` 通过。
- 按用户要求重新完整构建 `electron/dist-package/win-unpacked`；关闭仅属于旧成品的锁定进程后，electron-builder、PE 版本写入、`verify:version` 与 `verify:release` 全部通过。
- 新成品共 36,991 个文件、`4,382,346,009` 字节，版本 `1.0.0.7201`；不含 DeepSeek/Qwen 真实 Key。隐藏启动验证确认 Electron 使用 `%APPDATA%\@Catnip_Forge\electron`，验证进程与临时目录已清理。

## 2026-07-25 — Qwen 视觉与聊天附件第一阶段落地

- 从 `main` 的 `8be93ac1` 新建 `qwen_vision_attachments` 分支。
- 先建立 [QWEN_VISION_ATTACHMENT_CONSTRUCTION](QWEN_VISION_ATTACHMENT_CONSTRUCTION.md)，再进入代码施工。
- DeepSeek 主开发 Agent 保持不变；首启 DeepSeek Key 继续必填，Qwen Key 同屏选填且不能阻断主链路。
- 聊天框新增图片和文档多选、发送前附件卡片及历史恢复；附件由 Electron 主进程受控保存并绑定会话随机 ID。
- Runtime MCP 新增附件检查、文字读取/搜索和 `vision.qwen_analyze`；Qwen Key 留在主进程，经随机令牌 loopback 桥接代发，调用进入现有“执行过程”。
- 本地提取覆盖 TXT/Markdown/JSON、DOCX、PPTX 和简单文本型 PDF；本轮视觉只覆盖图片，复杂/扫描文档页面渲染、拖放、缓存与清理留待后续。
- Runtime/Electron typecheck、Qwen 本地 mock、会话、任务队列、Skill 回归、Renderer 生产构建和 `git diff --check` 通过。未使用真实 Key、未上传真实文件。
- 功能提交后按用户要求重建 `electron/dist-package/win-unpacked`；版本 `1.0.0.7201`，发布校验通过。发布门禁新增 Qwen Key 与附件桥接/MCP 文件检查，成品不含 DeepSeek/Qwen 真实 Key。

## 2026-07-25 — Agent 共享串口文档漂移修复

- README、架构、接力、开发进度、Hardboard 和 Apple UI 施工文档统一到 Electron 唯一共享串口会话。
- Hardboard Skill 改为优先使用 `serial_status/open/read/wait`，保留 `serial_capture` 兼容路径；删除已经失效的数值趋势图验收说明。
- Runtime 硬件指南和软件助手知识母版补齐 Agent MCP 控制、UI 同步、本机外部占用边界和无硬件/真实设备验收差异。
- 0.1 包的 COM7/COM8 无输出和 reset/open 建议继续作为历史事实保留，不再混入当前实现的“下一步”。
- 本轮仅修正文档和 Skill 说明，不修改串口实现、不连接真实 COM 设备、不执行打包。

## 2026-07-25 — Agent 串口监视器控制

- 新增 Electron 共享串口会话、环形事件缓冲和本机令牌桥接。
- Runtime MCP 新增 `serial_status/open/close/write/read/wait/clear`。
- `serial_capture` 增加共享会话兼容路径，独立 CLI 场景继续使用原 pyserial 路径。
- renderer 同步 Agent 打开/关闭/清空与配置变化，并显示 Agent 发送记录。
- 新增 `verify:serial-monitor` 模拟传输测试；本轮没有连接、枚举或打开真实 COM 设备。
- 验证通过：Runtime typecheck、Electron typecheck、renderer build、共享会话 mock verification。
- 本轮按用户要求只修改工程并测试，不执行 Windows 打包。

## 2026-07-25 — 仓库页突出 Skills 与辅助资源折叠

- 仓库页标题收敛为“Skills 仓库”，Skill 管理器固定排在首位并提高主区域最小高度；硬件工程和参考代码降为默认折叠的辅助区，避免工程文件列表占满首屏。
- 硬件工程和参考代码作为并排辅助组共享开合状态：点击任意标题行，两栏同时展开或收起，目录工具栏保持水平对齐；标题行显示项目数量、方向和状态文字，并提供 `aria-expanded` / `aria-controls`、焦点反馈及减少动态效果适配。
- 工作台 smoke 新增信息层级断言：先确认 Skills 位于辅助资源之前、所有辅助区默认折叠，再点击第一栏并确认全部资源同步展开，最后点击真实文件。
- Electron typecheck、Renderer 生产构建、`git diff --check` 与隔离工作台 smoke 通过。
- 关闭锁定旧 exe 的本项目成品进程后，Windows v1.0.0 已重新全量打包到原 `win-unpacked` 目录；发布校验通过，最终共 36,985 个文件、`4,382,268,512` 字节。

## 2026-07-25 — Windows v1.0.0 成品重建与文档漂移修正

- Git 当前真相源统一记录为 remote `origin`、分支 `main`；移除 README、进度和接力文档中把旧仓库地址、HTTPS、`electron_design` 或固定 HEAD 当作当前状态的表述。
- 第一次 `pack:win` 虽由 electron-builder 返回成功，但 `verify:release` 发现随包 `resources/runtime/python/Scripts/python.exe` 缺失；根因是被 Git 忽略的 `_bundled/python` 仅剩 site-packages，没有 Python 核心文件。
- 从本机已验证历史便携包恢复 Python 3.12.9 核心，确认 pyserial 3.5 后重新全量打包；打包脚本新增 Node、Python、pyserial 和 Playwright 前置检查，避免清空旧成品后生成运行时不完整的新目录。
- 最终成品位于 `electron/dist-package/win-unpacked`，共 36,985 个文件、`4,382,268,512` 字节；`verify:version`、`verify:release`、无 Key 首启及保存测试 Key 后自动重启闭环均通过，测试 Key 与成品测试进程已清理。
- 首启验证脚本新增 Renderer 异常详情输出，页面执行异常不再退化成缺少诊断信息的 `{}`。

## 2026-07-25 — Skill 正文插入交互与荧光标记

- 保留 `+ Skills` 的完整列表，但取消复选框式连续多选；每次点选一个 Skill 后弹层立即关闭，输入焦点和光标回到插入项之后，需要更多 Skill 时再次打开列表。
- 输入框增加与原生 textarea 同步的高亮层，`@skill-id` 使用由 ID 稳定生成的随机调色板显示为圆角荧光笔色块；普通正文、选区、换行、快捷键和结构化引用位置不变。
- Skill 引用增加原子退格行为：光标位于引用内或引用尾部时，一次退格删除完整引用及自动尾随空格，不再逐字符破坏 Skill ID。
- 修正输入区荧光标记与普通正文重叠：高亮层不再对 Skill 使用额外水平 padding、负 margin 或独立等宽粗体，改为严格继承 textarea 排版度量；消息发送后的展示标签仍保留独立视觉样式。
- 对话输入区新增微信式顶部横向拖拽热区，可在 64–320px 间上下调整；textarea、荧光高亮层与滚动位置同步，支持方向键无障碍微调并持久化本机高度。
- 修复拖高后只有外层和荧光层变化、白色 textarea 边框仍停留在 `rows` 固有高度的问题：textarea 改为绝对定位完整填充编辑器，smoke 同时核对三层的高度及上下边界。
- Skill 选择列表中的蓝色 `@skill-id` 从 10px 轻字提升为 12px/650 字重，并允许长 ID 省略收缩；Renderer smoke 增加最小字号和字重断言。
- 真实 Renderer smoke 增加两次开合列表、焦点回归、多个正文引用、圆角背景、不同 Skill 颜色和一次退格完整删除检查。

## 2026-07-25 — 目录型 Skill 与聊天正文多引用

- 12 个内置 Skill 从顶层扁平 Markdown 迁移为 `<skill-id>/SKILL.md` 独立目录，文件资源管理器可继续展开 `scripts/`、`references/` 和 `assets/`；旧内容与 Git 历史保留。
- Skill 管理器新增目录路径、支持文件数量和单 Skill“打开目录”；同步清单升级为 v2，树哈希覆盖主文档及全部支持文件，脚本不会在扫描或同步时自动执行。
- 聊天框移除单个 `selectedSkill` 和句首 `/skill-id` 拼接，改为在当前光标位置插入多个 `@skill-id`；输入 `@` 可搜索，Skills 按钮支持连续选择。
- 用户消息新增结构化 `skillRefs`，保存 ID、名称和正文 `start/end`；Gateway 重验部署状态及位置，对话历史将引用原位渲染为内联标签。
- Orchestrator 区分用户显式 Skill 与自动建议，显式项按首次出现顺序全部加载；首轮遗漏时自动补一次，仍遗漏则显示错误并以 code 3 结束，不能假报成功。
- 验证通过：Electron typecheck、main/renderer build、12 Skill 整树部署、多显式 Skill 顺序与位置、任务队列、会话、Hardboard 路由及真实 Renderer 双 `@Skill` 插入 smoke。

## 2026-07-25 — 旧网页自动化与 Python scaffold 冻结保留

- 用户确认网页操作录制/回放、workflow、网页爬虫、平台搜索脚本和旧 Python `coddecat` scaffold 暂不继续开发。
- 这些能力开发较早，可能存在隐式引用，因此采用“冻结保留”而非删除：相关源码、测试、配置、脚本、隐藏工作台、CDP/Playwright 桥接均不得因当前不用而清理。
- `tests/test_scaffold.py` 和 `pyproject.toml` 继续作为旧接口证据保留；当前 Git 历史没有 `src/coddecat` 实现，全量 `pytest` 的对应收集失败不计入当前主线回归。
- 近期施工范围收敛到 Windows v1.0.0、ESP-IDF/串口/任务管理器、Agent/Skills/会话稳定性和 Monaco 编辑器。
- 新增 [LEGACY_WEB_AUTOMATION_CONSTRUCTION](LEGACY_WEB_AUTOMATION_CONSTRUCTION.md) 作为冻结、兼容、测试与解冻规则的施工真相源。

## 2026-07-22 — 启动页 5 秒平滑时序

- 启动页从 `ready-to-show` 后的实际显示时刻开始计时，至少展示约 5 秒；主窗口提前就绪不会造成启动页闪退，主窗口较慢时则继续等待真实就绪。
- 进度条使用 `requestAnimationFrame` 在 5 秒内从 8% 连续推进至 94%，真实就绪与最短展示同时满足后再平滑收尾至 100%；减少动态效果模式保留等待门槛并停用连续动画。
- `verify:splash-ui` 增加默认 5000ms 时间线和单调平滑推进校验。

## 2026-07-22 — 猫薄荷可维护软件知识手册

- 将猫薄荷的软件功能事实从 `software-assistant.ts` 硬编码迁移到 `electron/CATNIP_FORGE_USER_GUIDE.md`，覆盖首启、界面、Agent 历史、Skills、仓库、编译烧录、串口、编辑器、外观和常见问题。
- 手册通过 `extraResources` 放入发布版 `resources` 根目录、保持可编辑；每次用户提问重新读取，保存修改后下一次回答立即使用，无需重启或重新编译。
- 固定系统提示词只保留角色、回答方式、无执行权限、防手册指令越权和 API Key 安全边界；产品功能与操作事实以动态手册为主要来源。
- 手册限制 60,000 字符；缺失、不可读或空文件使用安全降级，要求模型回答“不确定”，不再依靠陈旧硬编码猜测界面。
- 新增 `verify:software-assistant-guide`，实测 A→B 手册内容即时更新且无缓存，并覆盖空文件/缺失文件；发布校验新增可编辑手册的存在与完整章节断言。
- 重新生成 Windows v1.0.0 便携目录并通过 `verify:release`：源码手册与 `win-unpacked/resources/CATNIP_FORGE_USER_GUIDE.md` 一致，最终总大小 `4,466,177,540` 字节、共 42,744 个文件，且未携带真实 API Key。
- 对外测试前再次实测无 Key 首启与保存后自动重启：首启品牌、Skills、Playwright 和占位 Key 拒绝均正常；测试脚本适配新增 Splash，改为只连接主 Renderer，复跑确认新进程 `apiKeyReady=true`、弹窗消失，并安全删除一次性测试 Key。
- 最终分发审计发现 `README-FIRST.txt` 仍残留旧示例目录 `D:\Odyssey-v1.0.0`；已统一改为短路径 `D:\CatnipForge`，发布校验新增旧品牌拒绝断言，并在清单记录最长随包相对路径约 221 字符。
- VS Code 曾锁定旧包 `app.asar`，导致 builder 清空目录后无法重建；经用户授权关闭所有被 Restart Manager 确认的锁持有 `Code.exe` 后全量恢复。最终成品重新通过发布、首启、自动重启和测试 Key 清理，`app.asar` 已无文件锁。

## 2026-07-21 — Catnip Forge 品牌启动界面

- 根据用户草图重新组织启动页：移除大面积纯绿横幅，改为象牙白/浅猫薄荷绿材质、深蓝排版与克制阴影；完整使用叶片、组合标识和猫咪三张透明素材。
- 使用系统 UI 字体栈、紧凑英文标题字距和中英双层信息结构，保留 `One prompt. Working hardware.` 与“一句话，让硬件跑起来。”；支持 reduced-motion。
- 新增独立无边框 Splash 窗口，主窗口在后台隐藏加载；工作区准备、开发环境连接、Renderer 完成和 `ready-to-show` 节点分别驱动阶段文字、百分比和进度条，100% 后自动切换主窗口。
- 页面加载失败时关闭 Splash 并显示错误主窗口，避免永久阻塞；关闭应用时统一销毁两个窗口。
- 新增 `verify:splash-ui` CDP 烟测并完成 760×470 实机截图验收：三张素材、文案、63% 动态更新、系统字体和窗口边界均通过；正常模式实测 Splash 自动消失且主页面存在。
- 重新生成 Windows v1.0.0 便携目录并通过 `verify:release`：总大小 `4,466,167,398` 字节，Node、Python/pyserial、Claude Code、Runtime health 与四项 Splash asar 资源完整，且未携带真实 API Key。

## 2026-07-21 — 猫薄荷助手改为透明全身伙伴

- 使用用户提供的新透明 PNG 替换旧带背景素材，悬浮入口由 52px 圆形裁切头像改为 112px 全身角色。
- 移除圆形底板、边框、玻璃背景和局部放大，改用 `object-fit: contain` 完整显示耳朵、身体、尾巴和装饰星点；仅保留克制的投影、悬停抬升和按压反馈。
- 默认位置贴近应用右下角，拖动、坐标持久化、窗口约束和聊天框原位展开逻辑保持不变；标题栏小形象也改为完整透明图。
- UI 烟测增加全身入口尺寸、透明背景、无边框和 `contain` 断言。
- 用户反馈全身形象偏小后，将默认尺寸提升到 144px；聊天框标题栏在深浅模式旁增加“− / ＋”，按 16px 在 96–208px 间调节并持久化，缩放后自动约束到窗口内。

## 2026-07-21 — “猫薄荷”悬浮软件助手

- 将原右下角深浅模式悬浮球升级为用户提供形象的“猫薄荷”软件助手；默认位于右下角，保留拖动、防误触、坐标持久化和四象限展开能力。
- 点击形象后从触发点展开非阻塞微型聊天框，支持 Markdown 回答、连续上下文、等待反馈和键盘发送；深色/浅色切换收进助手标题栏。
- 新增独立 `software-assistant.ts` IPC 通道，复用本地 `resources/apikey.txt`，通过 DeepSeek OpenAI Chat Completions 调用 `deepseek-v4-flash`；限制为软件使用答疑，不进入硬件 Agent 队列，也不具备执行权限。
- 接口限制最近 12 条消息、单条 2000 字和 45 秒超时，不记录问题正文或 Key；错误以用户可见消息降级。
- `verify:software-assistant-ui` 实机 CDP 烟测通过：形象加载、360×500 浮层、欢迎语、输入框、主题按钮和窗口边界均正常；同时覆盖 reduced-motion、reduced-transparency 和高对比度适配。

## 2026-07-21 — 首次配置 API Key 后自动重启

- 修复首次启动保存 `resources/apikey.txt` 后仍需用户手工重启才能使用 Agent 的产品断点。
- 保存成功后 Renderer 保持首启遮罩，显示“配置完成，正在重启”状态；主进程延迟 900ms 调度 `app.relaunch()`，再通过现有统一退出清理关闭旧进程。
- 新进程重新读取 Key 并启动正常工作区；保存失败、无效占位 Key 和不可写目录仍停留在配置页并显示原有错误。
- reduced-motion 下重启状态停用旋转动画，保留静态状态反馈。
- 新增 `verify:first-run-restart` 发布版集成校验；无 Key 启动后写入一次性测试 Key，实测应用自动重启，新进程立即进入 Agent 可用状态，并在结束时安全清除测试 Key。

## 2026-07-21 — Catnip Forge 正式品牌与全量图标替换

- 用户可见正式产品名改为 `Catnip Forge`，中文全称为 `Catnip 硬件智能开发平台`，英文定位为 `Autonomous Hardware Development Agent`；`vibeide` 仅保留为仓库、npm 包和运行态兼容键。
- 用户提供的方形猫薄荷图作为唯一母版，生成 1024px 应用 PNG、16–256px 多尺寸 Windows ICO 和 256px Renderer 图；删除旧 SVG 图标。
- BrowserWindow、Windows EXE、托盘、任务栏、打包资源和前端左上角统一使用新图标；托盘不再使用透明占位图。
- 对话历史左上角使用 26px 克制品牌锚点，首次启动窗口同步显示图标、中文全称和英文定位，不改变主布局结构。
- Windows 可执行文件名改为 `Catnip Forge.exe`，PE 版本继续为 `1.0.0.7201`。

## 2026-07-21 — Windows v1.0.0 便携发布收口

- 对外版本固定为 `v1.0.0`，内部构建号 `7201`；npm 与 Windows PE 继续分别使用 `1.0.0-7201`、`1.0.0.7201`。
- 增加无 Key 首次启动配置窗口和 `resources/apikey.txt.example`，真实 `resources/apikey.txt` 不进入发布包；用户保存后写入当前解压目录。
- 发布目录根部新增 `README-FIRST.txt`，说明完整解压、可写目录、API Key、驱动与 SmartScreen 边界。
- 新增 `verify:release`，校验版本元数据、关键随包资源、无真实 Key、便携 Node/Python/Claude Code、Runtime health 和目录体积。
- 新增 `WINDOWS_V1_0_0_RELEASE_CHECKLIST.md`，作为便携包分发和复验的施工真相源。

## 2026-07-21 — 对话输入区 Skill 选择器

- 仓库概览移除“Agent 生成”卡片，保留硬件工程、参考代码和 Skills；Agent 工作区仍作为编辑器受控根目录，避免破坏生成文件访问。
- 仓库顶部保持简洁资源说明；真正的主动调用入口改到左侧 Agent 对话输入区。
- 输入区新增 Skills 按钮、已部署 Skill 弹层和选中标签；发送时自动注入 `/skill-id`，随后清除选择，用户无需记忆命令。自然语言自动选择仍保留。

## 2026-07-21 — Skill 原生部署与仓库页管理

- 保持 Windows 成品 `win-unpacked/resources/agent/skills` 路径不变，将其定义为唯一用户可编辑源仓库；开发版对应 `agent/skills`。
- 新增 `skill-manager.ts`：兼容历史扁平 Markdown 和标准 `<id>/SKILL.md`，生成 `name/description` frontmatter，部署到 Agent 工作区 `.claude/skills`，并通过管理清单避免删除非奥德赛 Skill。
- Agent 每次启动前同步 Skill；同名非托管目标拒绝覆盖。任务上下文改为原生命令推荐，不再注入整篇文档，并收紧 Hardboard 的“编译”触发条件。
- 仓库页 Skills 区升级为专用管理器：新增、编辑、回收站删除、打开目录、立即同步、可写状态和部署数量；保存后自动同步。
- 对话执行过程增加“技能”标签，分别显示任务路由推荐和 Claude Code 的实际 `Skill` 工具调用。
- 新增 `verify:skills`；typecheck、main/renderer build、Windows `pack:win`、Skill 与 Hardboard 烟测通过。工作台 smoke 已隔离 userData，但本机 Electron GPU 子进程仍以 `0xC0000135` 退出，需在完整桌面图形环境补跑。

> 当前日志只保留对现代码仍然成立的记录。

## 2026-07-21 — 历史对话标签编辑菜单

- 历史标签原直接删除按钮改为右侧“⋯”锚定菜单，集中提供重命名、置顶/取消置顶和删除。
- 修正唯一会话错误向上展开菜单的问题：首项固定向下展开，只有非首项的末两项才向上避让底边；成品烟测增加 `menuPlacementOk` 几何断言。
- 重命名使用原位输入并限制 30 字；置顶状态写入 v2 会话文件，置顶项稳定排在普通会话之前。
- 删除仍保留二次确认；菜单支持点击空白和 Esc 关闭，并适配深浅主题、减少动态与透明度偏好。
- session 烟测新增重命名/置顶排序断言，成品 CDP 烟测覆盖完整菜单交互。

## 2026-07-21 — Agent 多历史会话与重启续接

- 将单一、只供摘要记录的 `session.json` 升级为 v2 多会话存储，保存活动会话、完整 UI 消息和精简 Agent 轮次；旧格式首次加载自动迁移。
- Agent 对话内新增 144px 可收起历史侧栏，支持新建、切换和带二次确认的删除；首条用户消息生成标题，侧栏显示日期和消息数量。
- Gateway 对用户消息与流式 Agent 输出同步落盘；Renderer 启动时恢复活动会话，Agent 工作期间锁定会话操作，防止输出落入错误工程。
- Orchestrator 开始任务时真正注入所选会话最近 10 轮上下文；切换会话会重置常驻 Agent 进程，防止隐式上下文串线。
- 验证通过：类型检查、main/renderer build、session 多会话隔离/删除烟测、任务队列烟测、Windows `pack:win` 和成品侧栏新建/删除 CDP 烟测。
- 成品关闭重启实测恢复 1 个旧会话、24 条可见消息和 19 个累计轮次；新版 exe 已重新启动。

## 2026-07-21 — Agent 对话降噪与 Markdown 呈现

- 根据界面复核移除左栏底部独立“任务进度”面板；阶段状态改为当前“执行过程”下方的紧凑仪表盘，只保留当前阶段、总体进度和完成计数，并仅在 Agent 工作期间出现。
- 根据完整对话记录复盘，把 Agent stream-json 的 `text/tool_call/tool_result/system/error` 语义从主进程保留到 IPC，不再把所有输出压成同一种聊天文本。
- PID、执行计划、工具调用、工具结果、Worker 状态和等待心跳按 `taskId` 合并为一张默认收起的“执行过程”卡；专业视图可自动展开并持久化用户选择。
- 同一任务的等待状态改为原位更新，避免长任务每 15 秒新增一条“仍在执行”；未分类关键错误仍在主对话中直接显示。
- Agent 最终回复使用无 HTML 注入的 React Markdown 渲染，支持常用文档结构；ANSI/控制字符被清理，工具摘要限制 12 行且单行最多 1200 字符。
- 工具调用、工具结果和 system 内容不再写入 Claude 会话摘要，降低下一轮上下文的日志污染。
- 验证通过：Electron typecheck、main build、renderer production build、Windows `pack:win`、对话解析烟测和成品 CDP 专业视图交互烟测；新版 exe 已启动。

## 2026-07-21 — 任务状态去像素化与 packaged Skills 路径修复

- 修复编辑器未打开文件时的提示文字仍继承旧版固定深色、在深色背景上对比不足的问题；`.editor-empty-tabs`、路径/状态和代码区空状态现统一使用主题次级文字令牌，深浅主题同步适配。
- Build 行第二列由“编译工程”静态提示改为“刷新工程”按钮，复用工作台刷新链路；Flash 保持“刷新设备”。Build/Flash 左侧英文标识移除蓝色块底和阴影。
- 旧 `.compile-action-status` 的浅蓝实底与 2px 蓝边框由 Apple 主题覆盖为内容宽度胶囊，使用灰/橙/蓝/绿/红圆点区分等待、需输入、运行、完成和失败。
- 任务页纵向比例扩容：标题、Build/Flash 控制行、诊断工具条和结果表头使用统一的 40–56px 控件尺度与 8–10px 分组间距，保持六列结构不变，缓解顶部操作区拥挤。
- 修复 packaged 仓库 Skills 路径错误：不再从 `win-unpacked/agent/skills` 拼接，改用 `getAgentDir()` 指向 `resources/agent/skills`；同时移除整个安装根目录的宽泛工作台许可，只保留明确受控根目录。
- 仓库打开反馈改为短状态，完整路径/错误放入悬停提示；标题正文允许收缩、操作区限制最大宽度，长 ENOENT 不再把页面文字挤成竖排。
- 验证通过：Electron typecheck、renderer build、Windows `pack:win`；成品工程刷新保持 4 个选项，Skills 列出 12 个文件并成功打开资源管理器，成功反馈下仓库标题布局正常。

## 2026-07-21 — 应用内主题与可拖动外观入口

- 修复界面只依赖 `prefers-color-scheme` 导致运行中可能随 Windows/Electron 偏好突然由深色变浅色的问题；首次无记录时读取一次系统偏好，此后用 `data-theme="dark|light"` 和 `vibeide.appearance.theme` 固定用户选择。
- 右下角新增 Apple 风格外观浮层，支持深色/浅色预览、点击外部或 Escape 关闭，并使用应用主题令牌适配两种配色。
- 根据用户反馈解决外观按钮与编辑器字号工具条重叠：按钮默认上移，并增加 Pointer Capture 1:1 拖动、6px 防误触、可视边界约束及 `vibeide.appearance.position` 坐标持久化。
- 浮层根据悬浮按钮所在位置自动选择上下展开和左右对齐，拖动时即时关闭，避免窗口边缘越界和拖动误开菜单。
- 验证通过：Electron typecheck、renderer build、Windows `pack:win`；成品实测主题切换/重载持久化、按钮拖动/重载持久化、左上象限浮层边界和最终右侧安全位置。
- 本地功能提交：`9848c33 feat(ui): add persistent draggable theme control`；未推送远端。

## 2026-07-21 — 随包 Python、MCP、双向串口助手与 Apple 主题收口

- Windows Python 运行时统一为 `resources/runtime/python/Scripts/python.exe`；打包排除旧 `esptools/idf-tools/python_env/**`，保留 embeddable `python312._pth` 隔离，并用 `runtime/python/sitecustomize.py` 恢复当前脚本目录导入。
- Agent 动态 MCP 配置补齐 `mcp` 命令参数；开发模式增加 `ELECTRON_RUN_AS_NODE=1`，stdio initialize handshake 已验证。
- Windows 串口设备名强制 UTF-8；CIM 查询失败或为空时回退到随包 `serial.tools.list_ports`，解决中文乱码和普通权限下 COM 下拉为空。
- 串口后端由只读监视改为单一 pyserial 子进程双向收发，支持完整串口参数、文本/HEX、编码与行尾；重开前等待旧进程退出，端口占用返回中文提示。
- 前端改为左侧接收/发送、右侧配置的传统串口助手布局；按用户反馈删除数值趋势图及数字采样状态。
- 使用 `apple-design` 规则在不改变布局的前提下接入整体主题变量、卡片材质、主次/危险按钮、连接状态反馈、深色模式和 reduced-motion/reduced-transparency/prefers-contrast。
- 新增 `runtime/hardboard/projects/touch_hello`：Waveshare ESP32-S3-Touch-AMOLED-1.8 触摸按钮通过 COM5 输出 `hello`。
- 验证通过：Runtime/Electron TypeScript、main/renderer build、Windows `pack:win`、随包 Python/pyserial、打包版 ESP-IDF 冷构建、COM5 枚举/打开/关闭释放和 `touch_hello` 编译/烧录/串口输出。
- Git 边界：本轮只创建本地提交，不推送远端；`apikey.txt`、打包产物、构建目录和运行态文件继续排除。

## 2026-07-20 — electron_design Apple UI 与 1.0.0-7201 文档/Git 收口（历史基线）

- 当前施工分支切换为 `electron_design`；正式产品名为 `奥德赛1.0.0-7201`，npm 版本为 `1.0.0-7201`，Windows PE 四段版本为 `1.0.0.7201`。
- 全面移除 NES.css 依赖与像素式视觉，新增 `electron/src/renderer/styles/apple.less`，统一冷色材质、系统字体、弱边框、圆角、直接反馈和 reduced-motion/reduced-transparency。
- 仓库固定为四个受控目录并增加资源管理器入口；顶部导入功能和当前概览中的历史导入分组已删除。
- 任务管理器清除改为用户动作优先：立即清空旧记录并物理删除 EventBus/`.log`，不再因残留 PID/运行状态拒绝或回滚界面；隔离测试覆盖 running/activePid 状态。
- 当时监视器增加了“串口数值趋势”；该图表及采样逻辑已于 2026-07-21 按用户反馈删除。
- 编辑器右键菜单改用 Portal 贴近视口指针；标签等宽弹性分配，关闭按钮和字号按钮补齐 Apple 风格 hover/focus/press 反馈。
- 新增 `docs/ELECTRON_APPLE_UI_CONSTRUCTION.md`，并同步 README、INDEX、ARCHITECTURE、DEV_PROGRESS、HANDOFF、GITHUB_SYNC 与任务管理器施工文档；旧迁移和测试报告继续保留为历史事实。

## 2026-07-20 — `25065b4` 后历史文档漂移复核

- 当时以本地 `git status`、`git log`、`git branch -vv` 和现代码为真相源复核；施工分支为 `agent_task_queue_fix`，功能 HEAD 为 `25065b4`。该记录已被上方 `electron_design` 1.0.0-7201 基线取代。
- README、HANDOFF 和 GITHUB_SYNC 补齐 `443a0a6` 的旧回调隔离与 `25065b4` 的 Runtime 日志真实清理，不再把当前施工状态停留在早期 `39ef92d/86af2c8`。
- 任务管理器施工文档把“独立前端清除”修正为多个入口调用统一的后端历史清理；HANDOFF 补齐 `verify:event-clear` 和本轮完整验证事实。
- 当前打包版 Hardboard 短路径按 `runtime/src/paths.ts` 修正为 `C:\vibeide-hw\hardboard` junction；旧 `%LOCALAPPDATA%\vibeide-hardboard-runtime` 只保留在明确的历史测试记录中。
- README 的下一步移除旧 Linux/C/E 盘三方并行同步说法，继续以 `E:\Agent\vibeide\vibeide` 为唯一施工目录。

## 2026-07-20 — 任务管理器运行日志改为真实磁盘清理（历史首版）

- 用户复测发现任务管理器“清除”后重开前端旧日志再次出现；根因是 `clearRuntimeCard` / `clearTaskHistory` 只推进 Renderer 的显示游标，磁盘上的 EventBus 和构建日志从未删除。
- Runtime 新增 `hardboard:events-clear` 的首版：当时仅在任务非运行状态执行。1.0.0-7201 已移除该限制，但仍只删除 `hardboard/events/events.jsonl` 和 `hardboard/logs` 目录中的 `.log` 文件；其他文件不会删除。
- Electron 新增 `hardboard:runtimeHistoryClear` IPC，Renderer 的诊断日志和最近任务“清除”统一调用该后端接口，成功后同步归零事件、任务记录和轮询序号。
- 当时 Build/Flash 运行中禁用清除按钮并由 Runtime 二次拒绝；该行为已被 1.0.0-7201 的直接清除语义取代。
- 新增 `npm.cmd --prefix runtime run verify:event-clear`，在隔离临时目录验证 EventBus 和 `.log` 文件真实消失、状态归零且非日志文件保留。
- 验证通过：Runtime build/清理烟测、Electron typecheck、main/renderer build和 `git diff --check`。

## 2026-07-20 — Agent 停止与异步完成回调竞态加固

- 复核 `AGENT_TASK_QUEUE_CONSTRUCTION.md` 和现有实现后发现：Agent turn 返回结果、Worker 正在等待页面验收时，用户停止或切换任务，旧异步回调仍可能继续完成当前状态、启动返工，甚至污染随后开始的新任务。
- turn 完成链路现在捕获原活动 `taskId`，在追加要求检查、页面验收及失败回调恢复后重新确认任务仍然有效；过期回调只记录并忽略，不再写入新任务状态。
- Agent 进程在已经产出 turn result、进入 Worker 异步验收后关闭时，不再抢占验收链路的任务所有权；如需返工或应用追加要求，由验收链路按需重新拉起 Agent。
- 启动任务和恢复任务的异步失败也增加活动任务校验，避免迟到的 Promise rejection 结束后来任务。
- 扩展 `verify_agent_task_queue.cjs`：新增“完成回调让出执行权后任务已取消”的回归，以及停止清空追加要求和独立队列的断言。
- 验证通过：Electron typecheck、main/renderer build、任务队列烟测、Claude session 烟测、Hardboard context 烟测和 `git diff --check`。Renderer 大包提示与本机 `os_crypt_win.cc` 告警不影响退出码。

## 2026-07-18 — agent_task_queue_fix 文档漂移复核

- 以本地 `git branch -vv`、`git log`、`config/version.json` 和实际 Electron 源码为真相源复核文档；当前分支为 `agent_task_queue_fix`，父分支基线为 `d10245d`，功能提交为 `39ef92d`，首轮任务队列文档提交为 `86af2c8`。
- 修正 README 仍把 `electron_fix_neil` 写成当前施工分支的问题，并补充单活动任务、追加要求和显式排队能力边界。
- 修正 `GITHUB_SYNC.md` 仍把 `b428a0e` 写成最新功能提交的问题；明确 `electron_fix_neil=d10245d`、当前分支尚无 upstream、本轮只维护本地 Git以及用户手动推送命令。
- 修正任务管理器施工文档的分支措辞：该实现最初在 `electron_fix_neil` 落地，当前 `agent_task_queue_fix` 完整继承，而不是把父分支继续写成当前分支。
- 版本保持 `0.4.0-7171` / `0.4.0.7171`，与 `config/version.json` 一致；历史日志中的旧分支和旧提交继续作为历史事实保留，不进行全局替换。
- Git 边界：只精确暂存本轮 5 个文档文件；提交前复核未发现其他代码改动，不使用 `git add -A`，不推送远端。

## 2026-07-18 — Agent 单活动任务与追加/排队修复

- 从 `electron_fix_neil` 的 `d10245d` 单独建立 `agent_task_queue_fix`，隔离修复“上一个回答尚未结束时再次发送会并发启动另一 Agent 任务”的问题。
- 根因是 Gateway 对任务提交没有忙碌约束，Orchestrator 每次收到文本都会直接调用 Agent，同时覆盖 `currentTask`、转录和状态；原 `pendingTasks` 仅记录文本，并不负责等待调度。
- Orchestrator 改为单活动任务：空闲时立即启动；忙碌时默认把消息缓冲为当前任务的追加要求；用户显式点“排队”才创建独立 `taskId` 并按 FIFO 等待。当前 turn 或页面验收结束后优先应用追加要求，任务完成/失败后再启动下一队列项。
- Gateway、preload 和 Renderer 新增 `task:status` 状态链路，消息、进度和完成事件携带 `taskId`。对话区显示空闲/执行中/暂停、追加数和排队数，并提供“追加要求”“排队”“停止”；多行输入支持 `Shift+Enter`。
- 补齐 Agent 异常退出、turn 完成回调异常、页面验收期间追加要求、会话多轮记录和队列切换边界；停止操作会终止当前 Agent 并清空等待队列。
- 新增 `npm.cmd --prefix electron run verify:task-queue`，验证首任务立即启动、默认追加不启动第二任务、显式任务等待、追加保持当前 `taskId`、当前任务结束后才启动队列项。
- 验证通过：Electron typecheck、main/renderer build、任务队列烟测、Claude session 烟测、Hardboard context 烟测和 `git diff --check`。Renderer 大包提示与本机 `os_crypt_win.cc` 告警不影响退出码。
- Git：功能提交为 `39ef92d fix(electron): serialize agent tasks and queue follow-ups`；文档精确暂存，用户在 `runtime/hardboard/projects/hello_world_esp32s3/main/hello_world_main.c` 的未提交修改继续排除，不推送远端。

## 2026-07-18 — VS Code 风格工程编辑器与文件管理

- 编辑器从纯文本输入区升级为两栏工程编辑区：左侧按仓库分组显示 Agent 生成、硬件工程、参考代码、Skills 和用户导入目录，右侧提供多文件标签、路径、保存状态和 Monaco 代码区。
- 主进程新增受限目录枚举，文件树按需展开并过滤 `.git`、`node_modules`、build、dist 等不应显示的目录；仓库允许根目录继续作为所有读写操作的安全边界。
- Electron 内置 `monaco-editor` 与 `@monaco-editor/react`，使用本地 Worker 和内置 C/C++ 深色主题；C/C++、CMake、Markdown、JSON、TypeScript 等文本获得语法高亮、行号、括号配色和缩略图，打包后不依赖在线 CDN。
- 文件资源管理器新增右键菜单：目录可新建文件/文件夹，文件和子目录可重命名或移到系统回收站，所有节点可刷新；禁止覆盖同名条目、非法名称和修改工作区根目录。
- 文件操作改用软件内置对话框，解决 Electron 环境下原生 `prompt` 无反馈的问题；编辑器底部新增 10–24px 字号调节和重置，并持久化用户上次字号。
- 文件重命名会同步更新已打开标签、活动路径和展开目录；删除会关闭目标文件或目录范围内的标签。保留 `Ctrl+S`、未保存标记和保存结果提示。
- 验证：Electron typecheck、main build、renderer build、`git diff --check` 通过；开发预览中 Vite `5173` 和 Electron CDP `9230` 正常监听。`pytest tests/test_project.py` 因本机缺少 `pytest` 命令未执行，不记录为通过。
- Git：功能提交为 `5afcef3 feat(electron): add vscode-style project editor`，交互修复为 `63992ea fix(electron): add editor controls and file dialogs`，文档漂移修正单独提交。精确暂存 Electron 源码/依赖和本轮文档，排除 `electron/dist*`、`node_modules`、runtime 状态、硬件构建产物及用户未暂存的 `hello_world_main.c` 修改；不推送远端。

## 2026-07-17 — electron_fix_neil 前端调整与 0.4.0-7171 版本施工

- 右侧顶部隐藏“工作台”页签，当前可见入口为仓库、监视器、任务管理器和编辑器。
- 工作台 React 内部逻辑、IPC、`WebContentsView` 和主进程后端继续保留，避免删除早期链路引入回归。
- 当前发布版本更新为 `0.4.0-7171`，用户可见产品名为 `奥德赛0.4.0-7171`。
- Windows PE `FileVersion` / `ProductVersion` / `buildVersion` 使用四段映射 `0.4.0.7171`。
- Electron、Runtime、Agent 的 package/lock 文件统一使用 `0.4.0-7171`。
- 旧 `0.4.0.7161` 测试报告和日志继续作为历史事实保留。
- 主布局由固定约 42% 左栏改为默认 34%；新增可拖动分隔条、键盘左右微调、`localStorage` 宽度持久化和对话区收起/展开。
- 完成前端可读性修正：中文正文使用系统字体，代码/串口/日志使用等宽字体；正文、按钮和标签字号提升，同时增大按钮、下拉框和工具栏尺寸，修复监视器等页面文字溢出。
- 主进程工作台概览新增 `hardboardProjects`，直接枚举 `runtime/hardboard/projects`；Renderer 使用 `hardboard/projects/<name>` 相对路径，`resolveSelectedProjectDir` 保留安全相对引用供开发版和 packaged runtime 解析。
- 任务管理器改为先选工程再执行：Build/Flash 两行统一为六列，对齐操作提示、工程/串口下拉、执行按钮、状态和进度；Flash 支持刷新设备。
- 移除旧 CMake/config/source/artifact 选择器、源码预览及 PID/Task/Tool/Port/Project/Current 摘要块，避免重复信息和错误操作顺序。
- 实时日志、完整日志、事件卡片改为按钮触发的诊断卡片；页面下半区新增“最近任务与结果”，按 `taskId` 聚合 Build/Flash 的状态、工程、端口、时间、耗时和退出码。
- 状态颜色明确分离：成功绿色、失败红色、运行中蓝色、等待黄色、取消灰色；任务结果固定表头并提供纵向滚动，前端事件缓存提高到最近 500 条。
- 点击任务“查看”会在完整 EventBus 日志中按 `taskId` 定位、自动滚动并高亮对应日志段；失败为红色、成功为绿色。
- 实时日志、完整日志、事件卡片和最近任务结果均增加“清除”按钮；该阶段最初只更新前端显示游标，已在 2026-07-20 的后续修复中改为真实后端清理。
- 本轮漂移修正同步更新 `ARCHITECTURE.md`、`DEV_PROGRESS.md`、`HANDOFF.md`、`RUNTIME_TASK_MANAGER_UI_CONSTRUCTION.md` 和本日志；历史测试报告不改写。
- 收尾验证通过：`npm.cmd --prefix runtime run build`、Electron `typecheck`、`build:main`、`build:renderer`、`verify:version` 和 `git diff --check`；版本输出为 release `0.4.0.7171`、package `0.4.0-7171`、product `奥德赛0.4.0-7171`。
- Git：所有改动位于 `electron_fix_neil`，只精确暂存本轮源码和文档，不纳入 `electron/dist*`、runtime events/logs、硬件 build、密钥或其他运行态文件；按用户要求暂不推送远端。

## 2026-07-17 — 接力路径与架构文档二次漂移修正

- 当前唯一施工目录统一为 `E:\Agent\vibeide\vibeide`，修正 `HANDOFF.md` 和 `DEVELOPMENT.md` 中仍作为当前命令出现的 Linux、`D:\vibeide`、`E:\vibeide` 与 `/d/vibeide` 路径。
- `GITHUB_SYNC.md` 当前拓扑改为 Windows 当前工作区通过 Git HTTPS 对接 `vibeide_Neil`；旧 Linux、C 盘、旧 E 盘和 0.1 unpacked 目录明确降级为历史迁移记录。
- `HANDOFF.md` 明确功能提交 `b428a0e` 和 GitHub HTTPS 推送失败状态，不把早期提交 `76a3683` 误写为当前 HEAD。
- `ARCHITECTURE.md` 补齐 Runtime hardboard/eventbus/process/task/MCP Server 与 Electron hardboard/paths/agent/first-run/tray/session-store，并明确工作台只是前端入口隐藏、内部实现仍保留。
- 本次只修正文档事实，不改写历史测试报告，不清理旧代码引用；旧配置和孤立文件另行提交。

## 2026-07-17 — 旧配置、绝对路径和 coffecat 活动引用清理

- 删除 `runtime/mcp-config.json`：其中的 `D:\coffecat-windows1.0` 静态配置已经被 `electron/src/main/agent.ts` 的逐任务动态 MCP 配置取代。
- Runtime `health` 保留 `mcpConfig` 字段但改为 `generated-dynamically-by-electron`，避免继续返回不存在或不可移植的静态路径；同时删除 Electron 中未使用的 `getMcpConfigPath()`。
- 删除仓库根目录孤立的 `package-lock.json`；根目录没有对应 `package.json`，该空锁文件只残留旧包名 `coffecat`。
- `electron/bili_run.ts` 截图输出改为从当前工作目录解析 `agent/bilibili_search_result.png`，不再写死旧 Linux 用户目录。
- `README.md` 的当前分支、Windows 施工目录和启动命令统一为 `electron_fix_neil` 与 `E:\Agent\vibeide\vibeide`；旧目录只保留为历史说明。
- `build-portable.cmd`、Agent B 站工具、CDP 注释和 Docker smoke 默认镜像改用“奥德赛”或 `vibeide`；旧 `COFFECAT_WINDOWS_SMOKE_IMAGE` 仅作为环境变量兼容回退保留。
- 验证通过：Runtime build、Electron typecheck/main build、两个 Agent `.mjs` 文件的 `node --check`、Runtime `health` 和 `git diff --check`。当前 PowerShell 环境没有 `bash`，因此未执行 `bash -n scripts/docker_windows_smoke.sh`。

## 2026-07-17 — 产品和发布版本统一为 0.4.0.7161

- 产品命名规则确定为“奥德赛 + 版本号”，当前正式产品名为 `奥德赛0.4.0.7161`。
- Windows `FileVersion` / `ProductVersion` / electron-builder `buildVersion` 使用四段版本 `0.4.0.7161`。
- npm 受 SemVer 语法限制，Electron、Runtime、Agent 的 package/lock 文件使用等价映射 `0.4.0-7161`。
- 新增 `config/version.json` 作为打包和 PE stamp 的单一版本清单，并增加 `npm --prefix electron run verify:version` 一致性检查。
- 历史 Windows v0.1.0 测试报告和 Runtime UI v2 记录不改写，继续作为历史事实保留。
- Runtime/Electron typecheck、主进程/Renderer build 和 `npm.cmd --prefix electron run pack:win` 均通过。
- 已生成 `electron/dist-package/win-unpacked/奥德赛0.4.0.7161.exe`，PE 元数据中的产品名、文件版本、产品版本和原始文件名均已验证。

## 2026-07-17 — GitHub 真相源切换到 vibeide_Neil

- 当前 GitHub 切换为新的远端仓库。
- 切换前已验证新远端 `main` 与本地基线同为 `63820a3`，无需强推或合并无关历史。
- README、仓库级开发规则、HANDOFF、GITHUB_SYNC、DEVELOPMENT 和 DEV_PROGRESS 已统一更新；旧仓库地址只保留在明确的历史日志和迁移记录中。
- 未跟踪的本机 `日志.txt` 和运行态文件不纳入同步提交。

## 2026-07-16 — API Key 路径收敛：从 %APPDATA% 迁移到 resources/

- **问题**：用户发现删除解压目录重新解压后，旧 API key 仍然生效，原因是 key 被持久化到 `%APPDATA%\vibeide\apikey.txt`，删除应用目录不会清除它。另外，`resources\apikey.txt` 只作为首次复制源，修改它不会生效。
- **修复**（`electron/src/main/paths.ts`、`first-run.ts`、`agent.ts`）：
  - `getApiKeyPath()` 生产模式改为返回 `process.resourcesPath/apikey.txt`（与应用同目录）
  - 移除 `tryCopyKeyFromResources()` — 不再复制 key 到 `%APPDATA%`
  - `checkApiKey()` 和 `readDeepSeekApiKey()` 统一只读 `resources/apikey.txt`
  - 结果：编辑 `resources\apikey.txt` 重启即生效，删除应用目录即删除 key
- 文档同步：`HANDOFF.md`、`SECURITY.md`、`LOG.md`、`DEV_PROGRESS.md`

## 2026-07-11 — 修复打包版 exe ESP-IDF 编译三问题（中文路径 / Python venv / 约束文件）

- 发现并修复打包版 `奥德赛0.0.exe` 编译 ESP-IDF 工程的三大问题：
  1. **中文用户名路径（刘天凯）导致 GCC 链接器乱码** — CMake 调用 `xtensa-esp32s3-elf-gcc.exe` 时，路径 `C:\Users\刘天凯\...` 中的中文字符被错误编码，`ld.exe` 找不到 `crt0.o`、`-lgcc`、`-lc` 等运行时文件。
     - 修复：`runtime/src/paths.ts` 中 `resolveShortHardboardRoot()` 改用 `C:\vibeide-hw\hardboard`（无中文）作为 junction 目标，替代原来的 `%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard`。
  2. **Python venv pyvenv.cfg 绑定旧机器路径** — `idf5.4_py3.12_env/pyvenv.cfg` 中 `home` 写死为 `C:\Users\HP\...`，导致 Python 启动失败返回 exit 103。
     - 修复：`runtime/src/hardboard/env.ts` 中 `resolvePython()` 优先使用系统 `python`，跳过失效的 venv Python。
  3. **缺少 `espidf.constraints.v5.4.txt`** — `idf.py` 在 `IDF_TOOLS_PATH` 下找不到约束文件。
     - 修复：创建空约束文件 `runtime/hardboard/esptools/idf-tools/espidf.constraints.v5.4.txt`。
  4. **嵌式 Python (embed) 的 `.pth` 文件禁用 PYTHONPATH** — Python embed 发行版的 `python312._pth` 阻止 `idf.py` 自动发现 `python_version_checker`。
     - 修复：`env.ts` 中 `buildIdfEnv()` 设置 `PYTHONPATH=tools/`（嵌式 Python 移除了 .pth 后生效）。
  5. **便携 Python 恢复** — 重新下载 embed Python 3.12.9，安装 ESP-IDF 核心依赖（click、PyYAML、esptool、pyelftools 等 56 个包），作为系统 Python 不可用时的回退。
- 重新打包验证：`npm --prefix electron run pack:win` 通过，exe version `0.1.0`。

## 2026-07-11 — D:\vibeide DeepSeek API 配置、重建打包与 exe 验证

- 确认 `apikey.txt` 已配置 DeepSeek API key（密钥内容写入手记，不写日志）。
- 修复 Windows 中文用户名路径导致 SSH 连接失败的问题：
  - Git Bash `~` 展开为 `/c/Users/刘天凯/`，ssh.exe 对 UTF-8 中文路径编码异常。
  - 解决方法：配置 `git config --global core.sshCommand` 使用显式路径参数绕过。
- SSH key (`ed25519`) 已生成并配置，远程仓库地址已更正。
- 执行施工文档构建流程：
  - `npm --prefix runtime run build` — runtime TypeScript 编译通过
  - `npm --prefix electron run typecheck` — 类型检查通过
  - `npm --prefix electron run build:main` — 主进程编译通过
  - `npm --prefix electron run build:renderer` — React UI (Vite) 构建通过
  - `npm --prefix electron run pack:win` — electron-builder win-unpacked 打包完成（签名步骤因无证书跳过，stamp 成功）
- exe 文件属性已验证：`ProductName=奥德赛0.0`、`FileVersion=0.1.0`、`ProductVersion=0.1.0`。
- exe 启动测试通过：`D:\vibeide\electron\dist-package\win-unpacked\奥德赛0.0.exe` 进程正常启动，无崩溃。
- 产线 API key 已部署到 `%APPDATA%\vibeide\apikey.txt`。
- 远程仓库地址已更正，合并远程 6 个提交后推送成功。

## 2026-06-29 — Windows C:\vibeide 0.1 迁移启动

- 按用户要求先写施工文档：`docs/WINDOWS_0_1_MIGRATION_CONSTRUCTION.md`。
- 已将当前施工成果备份到当时的远端仓库，`main` 更新到本轮 runtime task manager / 仓库导入文件夹 / Windows 迁移施工方案。
- Electron 应用版本调整为 `0.1.0`，后续 Windows unpacked exe 需要写入 `FileVersion=0.1.0`、`ProductVersion=0.1.0`。
- 本轮 Windows 目标目录是 `C:\vibeide`，该目录已有上一版本，迁移时覆盖源码但保留依赖、硬件运行态和本地用户文件。
- 仓库页新增“导入文件夹”入口，默认精选分组之外允许用户把任意本机目录加入仓库视图；导入分组支持移除，移除后不再允许读写该目录；UI 默认分组不再显示施工文档。

## 2026-06-29 — Windows E:\vibeide 0.1 迁移、打包和 ESP32-S3 测试

- Windows 源码项目已镜像到 `E:\vibeide`。
- Windows unpacked 包已镜像到 `E:\vibeide-0.1-win-unpacked`。
- 打包 exe：`E:\vibeide-0.1-win-unpacked\奥德赛0.0.exe`。
- exe PE 版本已验证为 `FileVersion=0.1.0`、`ProductVersion=0.1.0`。
- Windows 打包版 runtime 环境验证通过：
  - `npm --prefix runtime run build`
  - `npm --prefix electron run typecheck`
  - `npm --prefix electron run build:main`
  - `npm --prefix electron run build:renderer`
  - `npm --prefix electron run pack:win`
- 打包版 runtime 硬件链路验证：
  - `hardboard:env` 指向 `E:\vibeide-0.1-win-unpacked\resources\runtime` 和 `%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard`。
  - `hardboard:devices` 发现 `COM7`、`COM8`、`COM9`。
  - `COM7` 经 esptool 确认为 ESP32-S3。
  - `wifi_connect_fmai` 编译通过、烧录到 `COM7` 通过、hash verified。
  - `hello_world_esp32s3` 编译通过、烧录到 `COM7` 通过、hash verified。
- 串口剩余问题：
  - `hardboard:serial` 可打开 `COM7` / `COM8` 并生成日志，但当前未抓到应用层输出。
  - `COM9` 打开失败，Windows 返回串口超时。
  - 已写入详细测试报告：`docs/WINDOWS_0_1_TEST_REPORT.md`。

## 2026-06-29 — Runtime UI v2 打包、日志与 asar 验证（历史记录，已被 0.1 E 盘包取代）

- 用户反馈 Linux 预览变化明显，但 Windows unpacked exe 观感未变化，判断风险点是继续打开了旧 `win-unpacked` 目录。
- 用户继续反馈 `dist-package` 没有变化、exe 版本仍像旧版本；因此最终改为直接刷新原始 `electron/dist-package/win-unpacked`，不再只依赖旁边复制目录。
- 重新执行并验证：
  - `npm --prefix electron run typecheck`
  - `npm --prefix electron run build:renderer`
  - `npm --prefix runtime run build`
  - `npm --prefix electron run build:main`
  - `npm --prefix electron run pack:win`
  - `npm --prefix electron run stamp:win`
  - `npm --prefix electron run smoke:workbench`
- 本轮 Windows unpacked 测试对象改为独立目录，避免与旧目录混淆：
  - `electron/dist-package/奥德赛0.0-runtime-ui-v2-win-unpacked/奥德赛0.0.exe`
  - `electron/dist-package/奥德赛0.0-runtime-ui-v2-win-unpacked.zip`
- 最终用户应测试的原目录也已刷新：
  - `electron/dist-package/win-unpacked/奥德赛0.0.exe`
- 新包内写入 `RUNTIME_UI_V2_BUILD.txt`，窗口顶部页签和工作台标题显示 `Runtime UI v2 · 2026-06-29 19:05`。
- 已解包检查原目录 `resources/app.asar`，确认 renderer bundle 内含 `Runtime UI v2`、`任务管理器`、`编辑器`、`硬件编译/烧录工作台`，main bundle 内含 `resolveSelectedProjectDir`。
- 已验证原目录 `resources/runtime/dist/hardboard/runner.js` 包含 `failBeforeProcess` 和失败 stderr 写入 `hardboard.build.completed / hardboard.flash.completed`。
- 新增 `electron/scripts/stamp_win_exe_version.cjs`，用 `resedit` 直接写 `win-unpacked/奥德赛0.0.exe` 的 PE 版本资源；当时历史包 `ProductName=奥德赛0.0`、`FileVersion=0.3.0`、`ProductVersion=0.3.0`。当前 0.1 包以 `docs/WINDOWS_0_1_TEST_REPORT.md` 为准。
- 新增 `electron/scripts/pack_win_unpacked.cjs`，`npm --prefix electron run pack:win` 在 Linux 上遇到 Wine 签名失败但 `win-unpacked` 已生成时，会继续执行版本资源 stamp 并返回成功，避免再次漏改 exe 文件属性。
- zip 打包时排除 `runtime/hardboard/events/*`，避免把本机历史运行态事件带进交付目录。

## 2026-06-22 — log.txt 复盘、Hardboard 工具输出收敛与奥德赛0.0 命名

- 正式项目名确定为：奥德赛0.0。
- GitHub 仓库和内部工程代号继续使用 `vibeide`，避免一次性迁移 appData、npm 包名、API key 路径和历史运行态。
- 修复 hardboard 工具输出过大问题：
  - `runIdfCommand` 会把 stdout/stderr 写入 `runtime/hardboard/logs/*.log`。
  - MCP `hardboard.idf_build`、`hardboard.idf_flash`、`hardboard.idf_set_target`、`hardboard.idf_clean`、`hardboard.idf_erase_flash` 返回 compact JSON。
  - Runtime CLI `hardboard:build`、`hardboard:flash` 也返回 compact JSON。
- 修复 Agent skill 文件定位规则：
  - 硬件任务必须先 `hardboard.env_status`，读取返回的 `docsDir/projectsDir`。
  - 禁止从 `runtime-data/agent-workspace` 猜 `..\runtime\hardboard\doc`。
  - 查工程文件必须排除 `build/**`。
  - 修改源码前先读 `main/CMakeLists.txt` 的 `SRCS`，不要猜源码叫 `main.c`。
- 用户可见命名已更新：
  - Electron 窗口标题：奥德赛0.0
  - 托盘 tooltip：奥德赛0.0
  - renderer `<title>`：奥德赛0.0
  - electron-builder `productName`：奥德赛0.0
- 文档更新：
  - `README.md`
  - `docs/HANDOFF.md`
  - `docs/GITHUB_SYNC.md`
  - `docs/HARDBOARD_CONSTRUCTION.md`
  - `docs/DEV_PROGRESS.md`
  - `runtime/hardboard/doc/README.md`
  - `agent/skills/espidf_hardboard.md`

## 2026-06-21 — Claude 软件会话与 NES UI 重构

- 新增：
  - `docs/PLAN_2026-06-21_CLAUDE_SESSION_NES_UI.md`
  - `electron/src/main/worker/session-store.ts`
  - `electron/scripts/run_workbench_smoke.cjs`
  - `electron/scripts/verify_claude_session.cjs`
  - `electron/assets/icon.svg`
  - `electron/assets/icon.png`
  - `electron/assets/icon.ico`
- 更新：
  - `electron/src/main/agent.ts`
  - `electron/src/main/worker/orchestrator.ts`
  - `electron/src/main/worker/logger.ts`
  - `electron/src/renderer/*`
  - `electron/electron-builder.yml`
  - `electron/package.json`
  - `runtime/package.json`
  - `agent/package.json`
  - `scripts/start_electron_desktop.*`
  - `.gitignore`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - 增加软件级 Claude session store，最近上下文持久化到 `runtime/claude-session/session.json`
  - 每次 Agent prompt 会注入同一软件会话上下文，避免用户体验上每问一次都是新会话
  - Claude CLI 从第二轮起尝试使用 `--continue`，并固定 `CLAUDE_CONFIG_DIR` 到 `runtime/claude-config`
  - Electron 前端改为 NES.css / 蓝白机风格，覆盖 Agent 对话、任务进度、结果区、右侧工作台和浏览器外框
  - 右侧工作台条目从纯展示改为可点击按钮，点击后通过 `workbench:openItem` 打开到右侧浏览页层
  - 增加工作台点击烟测，真实启动 Electron 并触发工作台按钮 `.click()`
  - 增加 Claude 软件会话烟测，验证 `session.json` 能跨轮保存并生成后续上下文
  - 应用标题、package、MCP server、日志前缀、浏览器 partition 从旧 `coffecat` 迁到 `vibeide`
  - 打包规则改为 `com.vibeide.app` / `vibeide`，新增 Windows icon，移除真实 `apikey.txt` extraResource
  - npm scripts 改成直接调用 `node_modules/<pkg>/...`，降低 `.bin` symlink 依赖
- 验证：
  - `pytest tests/test_project.py` 通过
  - `node --check agent/tools/build_platform_search_url.mjs` 通过
  - `node --check agent/tools/bilibili_search.mjs` 通过
  - `node --check agent/tools/cdp_navigate.mjs` 通过
  - `cd runtime && npm run typecheck && npm run build` 通过
  - `cd electron && npm run typecheck && npm run build:main && npm run build:renderer` 通过
  - `cd electron && npm run verify:session` 通过
  - `cd electron && npm run smoke:workbench` 通过，打开目标：`README.md`
  - 本机 Electron 构建产物可启动并截图确认 NES UI，截图：`/tmp/vibeide-nes-ui.png`
  - Windows `C:\vibeide` 从 GitHub clone 到 `8746cca`
  - Windows `npm --prefix runtime run typecheck && npm --prefix runtime run build` 通过
  - Windows `npm --prefix electron run typecheck && npm --prefix electron run build:main && npm --prefix electron run build:renderer` 通过
  - Windows `npm --prefix electron run verify:session` 通过
  - Windows `npm --prefix electron run smoke:workbench` 通过，打开目标：`C:\vibeide\README.md`
  - Windows `scripts\start_electron_desktop.ps1` 短时启动通过：runtime health OK、Vite 5173 ready、Electron 进程启动

## 2026-06-21 — GitHub 接力与文档重构

- 历史仓库：
  - 历史 GitHub 远端
- 新增：
  - `docs/INDEX.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/GITHUB_SYNC.md`
  - `docs/REFACTOR_PLAN.md`
  - `docs/SECURITY.md`
  - `docs/HANDOFF.md`
- 更新：
  - `README.md`
  - `CLAUDE.md`
  - `.gitignore`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - README 从旧 `coddecat` Docker/Python scaffold 叙事重写为 `vibeide` Electron + Runtime + Agent 主线
  - 仓库级规则从旧 `coffecat` 重写为当前模块边界和安全红线
  - 新增 GitHub / Windows / 本机三方接力流程
  - 新增下一步重构计划，明确命名统一、旧 Python scaffold、录制回放边界和 Windows 开发体验
  - `.gitignore` 明确排除本机配置、根 `.claude/`、`agent/.claude/`、`electron/dist/`
- 验证：
  - GitHub SSH 已验证可访问
  - Windows SSH 已验证可访问
  - Windows `C:\vibeide` 源码已同步到本机，排除依赖、构建产物、运行态和密钥

## 2026-06-10 — windows1.0 支线 Windows 适配启动

- 分支：
  - `windows1.0`
- 新增：
  - `electron/electron-builder.yml`
  - `scripts/start_electron_desktop.ps1`
  - `scripts/start_electron_desktop.cmd`
  - `agent/tools/build_platform_search_url.mjs`
  - `docs/11_Windows适配说明.md`
  - `docs/12_Docker_Windows_Smoke.md`
  - `docker/windows-smoke.Dockerfile`
  - `scripts/docker_windows_smoke.sh`
- 更新：
  - `electron/package.json`
  - `runtime/package.json`
  - `agent/CLAUDE.md`
  - `agent/skills/browser_guide.md`
  - `agent/skills/search_workflow.md`
  - `agent/skills/bilibili_search_workflow.md`
  - `docs/00_总体施工文档.md`
  - `docs/03_打包说明.md`
  - `docs/10_当前文件结构总览.md`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - Electron dev 脚本改用 `cross-env`，兼容 Windows CMD / PowerShell
  - 增加 Windows PowerShell / CMD 启动入口
  - 增加 electron-builder Windows NSIS 配置
  - 增加跨平台 Node 版平台搜索 URL 工具，Windows 不依赖 `.sh`
  - Worker 注入给 Agent 的搜索规则改为 `.mjs` 优先，避免 Windows 下继续按 `.sh` 执行
  - 增加 Docker + Wine Windows 打包 smoke 测试入口
  - `agent/tools` 长期工具补齐 Windows `.cmd` / 跨平台 `.mjs` 入口，旧 `.sh` 仅保留 Linux/macOS 兼容
- 验证：
  - `cd electron && npm run build:runtime && npm run build:main && npm run build:renderer` 通过
  - `node agent/tools/build_platform_search_url.mjs taobao 猫粮` 通过
  - `node agent/tools/build_platform_search_url.mjs bilibili 何同学` 通过
  - `node agent/tools/build_platform_search_url.mjs google windows electron 打包` 通过
  - `cd electron && npm run pack:win` 已进入 electron-builder，但当前 Linux 环境下载 Windows Electron 运行时速度过慢，停在 `app-builder unpack-electron`
  - `pytest tests/` 仍因缺少 `src/coddecat` 在收集阶段失败，属于既有 scaffold 测试问题
  - `git diff --check` 通过
  - 已安装并启动 Docker；`scripts/docker_windows_smoke.sh pack` 已开始拉取 `electronuserland/builder:wine`
  - Docker smoke 因基础镜像下载过慢由用户中止，后续改到 Windows 实机调试
  - `node --check agent/tools/bilibili_search.mjs` 通过
  - `node --check agent/tools/build_platform_search_url.mjs` 通过
  - `node --check agent/tools/cdp_navigate.mjs` 通过
  - `cd electron && npm run typecheck` 通过

## 2026-06-10 — 录制命名与重放对象选择

- 更新：
  - `electron/src/main/browser-recorder.ts`
  - `electron/src/main/workbench.ts`
  - `electron/src/main/gateway.ts`
  - `electron/src/preload/index.ts`
  - `electron/src/renderer/App.tsx`
  - `electron/src/renderer/components/BrowserPanel.tsx`
  - `electron/src/renderer/components/WorkspacePanel.tsx`
  - `electron/src/renderer/types/index.ts`
  - `electron/src/renderer/styles/global.less`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - 右侧浏览工具栏增加录制名输入，停止录制时按指定名字保存
  - 重放从 `Replay Last` 扩展为选择 / 输入录制名或文件名后执行 `Play`
  - 主进程新增按指定目标重放录制文件的 IPC
  - 工作台录制区展示 label、动作数、来源标题 / URL、文件更新时间，便于识别管理
  - 工作流区展示工作流名称、提取类型和来源信息
- 验证：
  - `cd electron && npx tsc --noEmit` 通过
  - `cd runtime && npx tsc --noEmit` 通过
  - `pytest tests/` 仍因缺少 `src/coddecat` 在收集阶段失败，属于既有 scaffold 测试问题

## 2026-06-10 — 回放优化 Skill 与 Workflow 摘要

- 新增：
  - `agent/skills/replay_workflow_tooling.md`
- 更新：
  - `agent/CLAUDE.md`
  - `agent/skills/recording_workflow.md`
  - `electron/src/main/worker/context.ts`
  - `runtime/src/workflows.ts`
  - `runtime/src/mcp/browser.tool.ts`
  - `docs/10_当前文件结构总览.md`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - 明确“封装成脚本”默认落为 `runtime/workflows/*.json`，不写绕过 MCP 的浏览器脚本
  - Skill 写清楚录制文件、workflow、workspace、skills、tools 的位置和用途
  - Agent 在优化重放、加信息捕获、下次自动调用等任务中会自动加载回放优化 skill
  - `browser.workflows_list()` 返回 workflow 摘要 JSON，便于 Agent 直接匹配并 `browser.workflow_run`
- 验证：
  - `cd runtime && npx tsc --noEmit` 通过
  - `cd electron && npx tsc --noEmit` 通过
  - context 自测确认“优化重放 / 封装成脚本”任务会加载 `replay_workflow_tooling.md`
  - `pytest tests/` 仍因缺少 `src/coddecat` 在收集阶段失败，属于既有 scaffold 测试问题

## 2026-06-10 — Worker 搜索预处理下沉

- 新增：
  - `electron/src/main/worker/search-preflight.ts`
- 更新：
  - `runtime/src/browser.ts`
  - `electron/src/main/index.ts`
  - `electron/src/main/browser-view.ts`
  - `electron/src/main/worker/orchestrator.ts`
  - `electron/src/main/worker/quick-tasks.ts`
  - `electron/src/main/worker/logger.ts`
  - `docs/00_总体施工文档.md`
  - `docs/01_架构说明.md`
  - `docs/10_当前文件结构总览.md`
  - `docs/DEV_PROGRESS.md`
- 当前变化：
  - Worker 在 Agent 启动前识别搜索 / 查找 / 整理 / 排行类任务
  - 平台选择顺序改为：用户明确平台 → 当前页面平台 → 视频榜单默认 B 站 → 普通中文搜索默认百度
  - 预处理会先把右侧浏览页导航到平台搜索结果页，再把预处理结果注入 Agent prompt
  - 明确需要整理 / 抽取的数据任务不再被 B 站快捷任务提前判定完成
  - 解决首轮直接要求“何同学最火十个视频数据整理”时 Agent 自行跑去 Google 的问题
  - 原生浏览页在未收到有效 renderer bounds 前保持隐藏，避免出现截图里网页贴到左侧 / 覆盖 UI 的错误位置
  - Runtime CDP 页面选择明确排除 Electron shell 页，避免 MCP `browser.navigate` 选中主窗口 renderer
  - Electron shell 增加外部导航拦截，若误导航到网页则转成右侧 tab，保护 React UI 不被覆盖
- 验证：
  - `cd electron && npx tsc --noEmit` 通过
  - `cd runtime && npx tsc --noEmit` 通过
  - 搜索预处理规则自测通过：B 站 / Google / 百度 / 淘宝 / 抖音 / 普通中文搜索
  - `pytest tests/` 仍因缺少 `src/coddecat` 在收集阶段失败，属于既有 scaffold 测试问题

---

## 2026-06-07 — 右侧改成固定工作台 + 浏览页层

- 新增：
  - `electron/src/main/workbench.ts`
  - `electron/src/renderer/components/WorkspacePanel.tsx`
- 更新：
  - `electron/src/main/browser-view.ts`
  - `electron/src/main/gateway.ts`
  - `electron/src/preload/index.ts`
  - `electron/src/renderer/App.tsx`
  - `electron/src/renderer/components/BrowserPanel.tsx`
  - `electron/src/renderer/types/index.ts`
  - `electron/src/renderer/styles/global.less`
- 当前变化：
  - 右侧默认不再直接显示浏览器，而是固定工作台主页
  - 工作台展示文件 / 工具 / 录制 / 重放（工作流）目录
  - 新开的浏览页仍在同一窗口内，但作为右侧可切换页面层显示
  - 上方增加 tabs + 页面 selector，可切回工作台
  - 原生浏览页宿主尺寸改为跟随 renderer 实际容器同步，不再靠主进程写死比例
  - 浏览页在右侧内容区全尺寸显示，避免被旧布局遮挡

## 2026-06-07 — 文档全面去漂移

- 重写核心文档：
  - `docs/00_总体施工文档.md`
  - `docs/01_架构说明.md`
  - `docs/05_前端设计_Phase1.md`
  - `docs/09_Electron客户端方案.md`
  - `docs/10_当前文件结构总览.md`
  - `docs/DEV_PROGRESS.md`
  - `docs/LOG.md`
- 删除旧叙事：
  - 单 `BrowserView` 最终模型
  - 右下角 popup 是当前产品方案
  - 搜索任务主要靠 agent 首页点击
- 统一为当前事实：
  - 右侧是 `WebContentsView host + tabs`
  - 新页请求统一回收到右侧 tab
  - 搜索任务优先 URL 工具

## 2026-06-07 — Runtime 对齐参考代码主链路

- `runtime/src/index.ts`
  - 补成 runtime CLI 入口，支持 `health / mcp / connect`
- `runtime/src/paths.ts`
  - 新增运行目录与 `state.json` / `ports.json` 初始化
- `runtime/src/extract.ts`
  - 按参考代码补齐 cards 提取、详情抽取、分页翻页主流程
- `runtime/src/record.ts`
  - 按参考代码补齐页面事件录制与选择器采样
- `runtime/src/replay.ts`
  - 按参考代码补齐录制动作回放基础链路
- `scripts/normalize.py`
  - 保留参考代码里的 OpenAI 兼容结构化清洗能力
- `scripts/reporter.py`
  - 保留参考代码里的 HTML 报告生成能力
- `scripts/start_electron_desktop.sh`
  - 启动前补齐 runtime 目录和状态文件
  - 启动前执行 runtime health 检查
  - 保持 Electron renderer / main 统一拉起

## 2026-06-07 — Electron 登录态持久化

- `electron/src/main/browser-view.ts`
  - 右侧 `WebContentsView` 统一切到持久分区 `persist:coffecat-browser`
  - 新增浏览器存储刷盘逻辑，退出前主动 `flushStorageData + cookies.flushStore`
- `electron/src/main/index.ts`
  - Electron `userData` 固定到 `runtime/chrome_profile/electron-shell`
  - 退出前先刷盘，再关闭应用
  - 补 `SIGTERM / SIGINT` 优雅退出，避免启动脚本重启时 cookie 丢失
- 当前效果：
  - cookie / localStorage / 登录态会跟随 Electron 浏览器区保留
  - 实测重启后 cookie 与 localStorage 都能保留

## 2026-06-07 — 录制/回放接到 Electron 可用状态

- `electron/src/main/browser-recorder.ts`
  - 新增主进程录制/回放桥接
  - 对当前 `WebContentsView` 注入录制脚本
  - 录制结果落盘到 `runtime/recordings/`
- `electron/src/main/gateway.ts`
  - 新增 `browser:startRecording`
  - 新增 `browser:stopRecording`
  - 新增 `browser:replayLatestRecording`
  - 新增 `browser:listRecordings`
- `electron/src/preload/index.ts`
  - 暴露录制/回放 IPC API
- `electron/src/renderer/App.tsx`
  - 增加录制状态与消息提示
- `electron/src/renderer/components/BrowserPanel.tsx`
  - 增加 `Start Rec / Stop Rec / Replay Last` 按钮
- 实测：
  - 通过 renderer 按钮开始录制
  - 在右侧浏览器页输入并点击
  - 停止录制后生成 JSON 文件
  - 回放最新录制后页面结果恢复正确

## 2026-06-07 — 右侧浏览器区改成 host + 多 tab

- `electron/src/main/browser-view.ts`
  - 引入 `host view`
  - 每个页面一个 `WebContentsView`
  - `window.open` / 新页请求转成右侧新 tab
- Renderer 保持固定右侧区域，不新增 popup 结构

## 2026-06-07 — 搜索任务改成工具优先

- 新增：
  - `agent/tools/build_platform_search_url.sh`
  - `agent/skills/search_workflow.md`
  - `agent/skills/bilibili_search_workflow.md`
- 更新：
  - `agent/CLAUDE.md`
  - `agent/skills/browser_guide.md`
  - `electron/src/main/worker/context.ts`
- 当前规则：
  - 搜索 / 查找 / 整理结果 类任务，必须先生成平台搜索 URL
  - 再 `browser.navigate`
  - 不支持的平台直接报错，不允许 agent 自由发挥

## 2026-06-07 — 录制 / 回放 / 抽取工作流接入 Agent

- 新增：
  - `runtime/src/workflows.ts`
  - `agent/skills/recording_workflow.md`
- 更新：
  - `runtime/src/mcp/browser.tool.ts`
  - `runtime/src/index.ts`
  - `agent/CLAUDE.md`
  - `agent/skills/browser_guide.md`
  - `electron/src/main/worker/context.ts`
- 当前能力：
  - Agent 可以直接开始录制、停止录制并命名
  - Agent 可以列出录制、按名字回放录制
  - Agent 可以把“录制动作 + 当前页面提取规则”保存成一套工作流
  - Agent 下次可以直接按工作流名称回放并抽取数据
- 当前落盘：
  - 录制文件保存在 `runtime/recordings/`
  - 工作流文件保存在 `runtime/workflows/`

## 2026-06-06 — Worker 层与 MCP 链路落地

- Worker 调度层完成
- Gateway 变薄
- Agent 流式输出接入
- Runtime MCP 可稳定被 Claude Code 调用

## 2026-09-11 — Phase 15 星空品牌壳与 Explore 首页

- 新增 `catnip-cosmic-shell.png` 和 `explore-academy-hero.png`，用于真实 Electron 应用壳与 Explore Hero。
- 更新 Chat 空态与四个可操作快捷问题；更新 Explore 首页布局并增加真实当前工程摘要。
- 用 `lucide-react` 将用户补充的蓝紫图标语言落到六工作区与 Explore 双入口，保留原有语义、焦点和点击行为。
- 增强 `verify:explore-layout-ui`：生成 1536 × 1024 截图，验证 Chat 快捷输入与八组 Explore 布局/流程。
- Runtime/Electron typecheck/build、Explore/Onboarding 专项与同视口视觉 QA 通过。`smoke:chat-ui` 因用户旧成品占用固定 CDP 9230 超时，未终止用户进程；当前 Renderer 定向门禁代替覆盖本轮变更。
- 未执行真实搜索、新 Windows 包或硬件动作；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第二轮局部高保真

- 新增纵向历史夜景与透明 Agent 欢迎呱呱两张槽位适配位图；历史栏、快捷卡、建议和 Explore 首页按用户 7 张局部参考收敛。
- 顶部工作区栏通过 portal 成为全局独立首行，设置继续打开既有设置面板；几何门禁覆盖品牌、六标签、工程和设置的顺序、同排与视口边界。
- 修复入口插画误中正文宽度规则、文图重叠及 1536 宽度设置换行；8 组布局、流程契约与控制台检查通过。
- 同视口比较写入 `electron/.tmp/phase15-v2-comparison.png`；未执行真实搜索、新包或硬件动作。

## 2026-09-11 — Phase 15 第三轮无边框窗口与纵向填充

- Explore 双入口由 292px 提升至 438px，摘要网格最小高度提升至 490px；历史、知识与工程数据行使用独立浅色边框卡片，改善 16:9/高窗口的空白与边界感。
- Electron 主窗口启用 `frame: false`、移除原生菜单；顶栏右侧加入真实最小化、最大化/还原与关闭按钮，Preload 仅暴露三个对应动作。
- 六标签固定在中部紧凑轨道。首版受文件末尾旧九列 cascade lock 覆盖，导致窗口控制落在视口外；追加最终 12 列 lock 后，1536 下标签组约占 48%，控制区完整位于右上角。
- Electron 类型/Main/Renderer 构建、Explore UI/entry/layout、Onboarding、8 组响应式与四阶段流程均通过；最终同视口证据为 `electron/.tmp/phase15-v3-final-comparison.png`，console error 0。
- 未执行真实搜索、新 Windows 包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第十一轮知乎状态紧凑化

- 用户截图确认知乎连接卡在 Explore Hero 底部显示不完整；根因是非操作态仍继承 84px 最小高度，标题、说明、状态和内边距之和超过 Hero 可用网格高度。
- 非操作态改为 52px 紧凑行；状态点、平台名、连接结果和重新检查保留。可操作态继续使用 84px 及原有步骤，连接与 Secret 安全逻辑未变。
- `verify:explore-layout-ui` 新增 48–58px 高度及完全位于 Hero 内的几何断言；typecheck、Renderer build、Explore UI/layout 与聚焦视觉比较均通过。
- 未执行真实知乎请求、新 Windows 包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第四轮三段式顶栏与应用图标

- 顶栏 DOM 拆为三个真实容器：左侧 Catnip Forge 品牌，中部六工作区，右侧工程/设置/窗口操作；2048px 下中部框宽 1024px，三部分不再共享长边框。
- 用户给出的 `codex-clipboard-dzsEqZ.png` 原图进入 Renderer；同时生成 512px `icon.png`、256px PNG 帧 `icon.ico` 并更新 `icon-master.png`，供窗口、托盘和后续安装包共用。
- 助手 GitHub 链接由“作者 Neil Bauman”改为 `Neil Bauman · GitHub`，标题和 aria-label 同步去掉“作者”；Onboarding 对应说明同步更新。
- “任务管理器”轨道独立扩到 132px，专项门禁确认文字矩形完整位于按钮内部。
- 三列首次被旧十二列 cascade lock 覆盖，更新最终锁后恢复；测试从比较内部按钮顶边改为比较三个外框顶边，避免把有意的内部垂直留白当成错位。
- Electron typecheck、Main/Renderer build、Explore/Onboarding、真实软件助手 CDP、8 组响应式与四阶段流程通过；聚焦对照为 `electron/.tmp/phase15-v4-shell-comparison.png`。

## 2026-09-11 — Phase 15 第五轮顶栏材质纠偏

- 移除三个顶栏分段继承的 NES 黑灰容器材质，改为原有深蓝半透明玻璃表面。
- 将全宽 `.workspace-global-nav` 收敛为纯几何定位层，显式清除背景、边框、阴影、滤镜、背景模糊和伪元素；三段间隙恢复显示星空壁纸。
- `verify:explore-layout-ui` 新增计算样式门禁；第一次因测试错误重复换算 RGBA alpha 误报，修正后通过，三个分段均为 `rgba(9, 39, 98, 0.76)`。
- 最终 2048px 聚焦对照为 `electron/.tmp/phase15-v6-shell-comparison.png`；未执行真实搜索、新 Windows 包或硬件动作。

## 2026-09-11 — Phase 15 第六轮 Explore 可读性与连接入口

- Explore 首页移除 Hero 中重复的知乎状态胶囊；真实连接状态、重新检查、安装/配置操作及安全说明统一进入左侧独立卡片。
- 双入口桌面高度增至 500px，低高度窗口 450px、窄容器 410px；入口标题最高 40px、正文 15px，历史/知识/工程摘要文字同步放大。
- 首页、双入口及摘要区改用低亮度蓝紫渐变，减少纯白眩光但保持深色文字对比。
- 布局专项新增连接卡左侧几何、入口高度和字体尺寸门禁；TypeScript、Renderer build、Explore UI/layout 均通过。
- 用户 2559 × 1381 截图归一化至 2048 × 1105 后与实现并排，证据为 `electron/.tmp/phase15-v7-explore-comparison.png`。

## 2026-09-11 — Phase 15 第七/八轮启动页与细节收敛

- 使用内置图像编辑将用户给出的学院呱呱补全为 1254 × 1254、32bpp ARGB 透明角色图；首版把棋盘格烘焙进像素而弃用，第二版角像素 Alpha=0 后进入 `splash-guagua-v2.png`。
- 启动页换用既有 `icon.png`，改为深蓝/青/紫色主题和 13px 蓝色进度轨；真实 Electron CDP 检查资源、时间线、63% 状态、无 overflow 并生成截图。
- Explore 连接组件进入 Hero 连续背景；历史/知识列表改为独立常驻滚动，工程路径省略。左侧历史图扩大到 96% 高度，Composer 操作收进统一框并用 Lucide 纸飞机发送。
- 品牌取消蓝色玻璃外框并放大；Skill 小站删除重复两行，只保留蓝色单行标签/地址/打开控制。
- 布局专项验证品牌无框、Composer containment、纸飞机、历史图、双滚动槽、长路径、Skill 单行及既有 8 组响应式/四阶段流程；Renderer console error 0。
- 未执行真实知乎请求、新 Windows 包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第九轮历史插画满幅纠偏

- 用户截图确认历史插画仍只出现在会话列表列，左侧功能轨形成贯穿全高的纯蓝空带；同时素材顶部留白使高窗口中段显空。
- 将唯一夜景背景移至整个 `.chat-history`，主列背景清空，功能轨和列表改为半透明深蓝可读层；交互与数据逻辑未改。
- 首版 128% 高度覆盖在聚焦截图中导致呱呱过大，最终改为 112% 等比覆盖、51% 横向焦点和底部锚定。
- 类型、Main/Renderer 构建、Chat 展示与 Explore 布局专项通过；8 组响应式、四阶段流程和 console error 0，聚焦证据为 `electron/.tmp/phase15-pass9-chat-comparison.png`。
- 未执行真实搜索、Windows 打包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第十轮历史功能轨接缝消除

- 用户实屏确认功能轨右侧仍有贯穿夜景的硬线；定位为旧 1px 右边框和矩形遮罩共同造成，而非位图本身。
- 功能轨移除右边框、阴影，遮罩改为从 `rgba(7,31,78,0.52)` 平滑过渡到透明；底图和布局保持不变。
- Explore 布局专项首次通过：接缝门禁、历史满幅、8 组响应式、四阶段流程和 console error 0；聚焦证据为 `electron/.tmp/phase15-pass10-chat-seam-comparison.png`。
- 未执行真实搜索、新 Windows 包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第十二轮找灵感工作页高保真重构

- 用户选定 `codex-clipboard-xHyTv3.png` 为找灵感工作页目标。页面由浅色稀疏表单重构为深蓝 30/70 工作区，左侧使用连续卡片承载想法输入、示例、工程条件、知乎主操作与 Explore Session 对话。
- 生成并接入 16:9 学院夜间研究室位图 `explore-idea-workspace.png`，右侧叠加知乎探索价值说明，下方保留结构化结果空态；所有操作图标来自既有 Lucide 体系。
- 四阶段导航增加副说明和完成态图标，提示标签可直接回填输入；未改变 Explore 只分析、确认后才交给 Agent 的程序门禁。
- 布局专项首轮暴露旧浅色 `!important` 覆盖深色画布，修正级联后通过；新增阶段副说明又使旧文本选择器误点第三阶段，改为稳定的第四按钮定位后通过。
- TypeScript、Renderer build、Explore UI/layout、8 组响应式、Diagnosis/handoff 与 console error 0 全部通过。同尺寸视觉证据为 `electron/.tmp/phase15-pass12-idea-comparison.png`。
- 未执行真实知乎搜索、新 Windows 包、Build/Flash/Serial 或实机验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 — Phase 15 第十三轮解问题工作页高保真重构

- 用户以 `codex-clipboard-QdAs1V.png` 选定解问题工作页目标；初始描述态由浅色松散表单重构为深蓝 30/70 双列，左侧 Context 使用可勾选紧凑证据卡和独立滚动槽。
- 通过内置 Image Gen 生成学院呱呱工程侦探研究室 16:9 位图并接入 Renderer；右侧以工程证据、经验资料和 AI 分析为主叙事，下方提供三类结构化调查报告空态。
- 问题示例按钮、Context 选择、Analysis、Plan、Handoff 和 Agent 确认行为均复用现有产品链路，未新增第二套 Agent、Skill 或任务系统。
- 首轮同尺寸视觉 QA 修复标题 Grid 错行重叠；第二轮收敛 Hero 标题宽度和字号，消除第三行孤字。最终证据为 `electron/.tmp/phase15-pass13-diagnosis-comparison.png`。
- TypeScript、Renderer build、Explore UI/layout、8 组响应式、完整 Diagnosis/handoff 与 console error 0 通过。
- 未执行真实知乎/全网搜索、新 Windows 包、Build/Flash/Serial 或实机验证；`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留。

### 第十三轮实屏纠偏

- 用户实屏指出返回键消失、头部说明越界以及“草稿”掉出头部。根因为返回键只有 top/left 而没有定位属性、112px 头部不足，以及旧草稿 badge 的绝对坐标仍生效。
- 返回键改为头部内 absolute/z-index 4，头部增至 132px，桌面说明单行；草稿态在 Diagnosis 专用页隐藏，非草稿状态仍可显示。
- `verify:explore-layout-ui` 新增三个几何/计算样式断言并通过，最新 1448 × 1086 截图确认无越界。

## 2026-09-12 — 知乎 Access Secret 原生窗口可靠性

- 复现新电脑链路：旧版 PowerShell 使用 detached/unref，Main 只确认进程 spawn，浏览器可以正常打开而 WPF 安全窗口没有可靠的可见性确认。
- 改为挂接原生进程；WPF 完成 `ContentRendered` 后在 Electron userData 写入一次性 ready 标记，Main 轮询确认后才向 Renderer 返回已打开。提前退出与 15 秒超时均显示具体错误。
- Explore 连接卡新增官方 CLI 下载/校验和等待安全窗口的明确进行中提示；Secret 仍仅进入原生 `PasswordBox`，通过 stdin 交给官方 `auth set --secret-stdin`。
- 用户目视确认诊断窗口已弹出。全程未要求或采集真实 Secret；专项门禁、类型检查及 Main/Renderer 构建通过。
- 27% 启动页经一次性日志最终确认为验收配置错误：`VIBEIDE_SMOKE_WORKBENCH_OPEN=1` 会在仓库 smoke 完成后主动关闭 Main，本不应用作普通首启的 userData 隔离开关。所有基于该假故障的启动页生产改动已撤回；仅将 `VIBEIDE_SMOKE_APP_DATA` 的隔离能力与工作台自动关闭行为解耦。正确模式的重打包首启验证通过，临时进程、测试 userData 与诊断脚本均已清理。
## 2026-09-12 — Windows 包目录改为 Catnip Forge

- 用户要求重新打包，并把交付目录由 `win-unpacked` 改为 `Catnip Forge`。electron-builder 仍在内部生成临时目录，定制打包脚本在骨架完成后立即重命名，再复制离线资源与盖章。
- 首次完整命令已完成 Runtime/Main/Renderer 构建，但旧打包程序占用 `dist-package` 导致清理报 `EPERM`；精确关闭该旧包进程树、为安全限定的输出清理增加重试后，继续打包成功。
- 发布门禁通过：总计 4,502,227,001 字节，Node v22.14.0、隔离 Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；DeepSeek/Qwen Key、历史、收藏、日志、录屏、截图与 `.catnip` 均未入包。
- 官方知乎 Skill 15 文件门禁和隔离首次启动通过；测试进程及临时用户目录已清理，未调用知乎、模型服务或硬件。

## 2026-09-12 — Phase 16b 模型配置 Domain / Store

- 在独立文档基线提交 `39dbfac6` 之后开始业务实现；未混入此前教程文件或用户工程 `.catnip`。
- 新增非敏感 `ProviderConfig` / `ModelProfile` / defaults 契约和 Main 原子 Store。DeepSeek V4 Pro、Flash 与 Qwen VL Plus 作为升级兼容默认值，不读取或迁移真实 Key。
- Store 使用 schemaVersion 与 revision 拒绝旧视图覆盖，写入前完整校验协议、用途、HTTPS、引用和 Secret 字段；替换时保留上一有效 revision，坏源文件不改写。
- `verify:model-config` 两轮、Electron typecheck、Main build 与 diff check 通过。测试只使用临时目录；Windows `os_crypt`/GPU 环境警告不影响退出码，已在 TEST_METRICS 保留原始性质。

## 2026-09-12 — Phase 16c1 Main 安全凭据底座

- 新增 Electron `safeStorage` cipher 和 Main-only 凭据 Store；不可加密或加密回读不一致时停止，不写明文 fallback。通用非敏感原子写抽到独立 helper，并由模型配置回归覆盖。
- 旧 DeepSeek/Qwen 文件迁移是显式 helper：读取目标行 → 加密存储 → Main 内回读验证 → 精确清理旧行；不同安全值发生冲突时保留旧文件。
- Review 发现初版清理复用原子 helper 会生成含明文的 `.bak`。修复为安全副本确认后的原位覆写/截断/fsync，新增全临时目录明文扫描，修复后专项通过。
- 本提交不注册 Renderer IPC、不读取用户真实 Key、不调用远端。Windows `os_crypt`/GPU 环境警告仅记录为测试宿主信息，实际专项使用可控测试 cipher。

## 2026-09-12 — Phase 16c2–16f 模型中心、会话选择与知乎维护

- 新增 Main-only 模型凭据原生输入桥、模型管理 IPC 与第七个“模型”工作区；Renderer 只收配置元数据和 `configured` 状态。
- Agent 会话增加模型选择与任务快照，Agent 进程按 profile/base/upstream model 隔离；不兼容或无凭据时不静默 fallback。
- 知乎维护复用官方 `auth set --secret-stdin`、`auth status --verify`、`auth logout`；连接成功状态保留完整维护操作条。
- 修复两项首轮问题：消息快照归一化块放错函数；connected 替换入口被后续状态判断拒绝。修复后相关 typecheck、专项与 Renderer build 通过。
- 未读取或记录真实 Secret，未调用真实模型/知乎请求，未打包或执行硬件动作；旧首次启动、软件助手与 Qwen Key 链路列为下一闭环。

## 2026-09-12 — Phase 16c2b 安全首启与模型运行统一

- 首启页面移除 Renderer 密码输入、Key state、路径展示和明文保存 IPC；无参数动作由 Main 打开原生 PasswordBox，成功写入 safeStorage 后重启。
- Main 启动时尝试把旧 DeepSeek/Qwen 文件安全迁移到凭据 Store；失败或冲突保留来源。Agent、软件助手、视觉附件统一安全读取，后两者使用模型中心用途默认档案。
- 新增安全首启和模型 Runtime 专项；Qwen mock、Electron/Runtime typecheck 与 Renderer build 通过。首启专项首轮切片边界错误已修复。
- 软件助手指南旧专项的 allowlist 字符串断言漂移且错误返回 0；已对齐当前通用 HTTP/HTTPS 无凭据门禁并改为可靠失败退出，复测通过。

## 2026-09-12 — Phase 16g1 模型中心桌面回归

- 真实 Electron 1600×1000 回归首次发现 Agent 只有 Pro 一项；根因是 Flash 原档案专用于 OpenAI-compatible 软件助手。
- 新增独立 Anthropic-compatible `deepseek-v4-flash-agent` 内置档案，并为已有 Store 增加不落盘、不覆盖用户值的只读补齐。
- 修正同名测试 fixture，重启 Main 后专项显示 7 个标签、3 个 DeepSeek 档案、2 个 Agent 选项、无横向溢出。
- 模型页截图受项目选择遮罩和后续 CDP capture 超时影响，未宣称截图通过；保留真实几何/DOM 证据。
