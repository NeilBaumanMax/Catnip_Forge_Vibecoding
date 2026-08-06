# Catnip Forge 接力开发文档

> 本文是下一次 Codex 接力的第一入口。敏感账号密码不写在本文，见本机私有文件 `.local-secrets/HANDOFF_PRIVATE.md`，该目录已被 `.gitignore` 排除。

## 当前事实

- 2026-08-07 已完成成品 Python、Runtime EventBus 持续日志和 Agent 输入框光标对齐修复。施工文档为 `PACKAGED_RUNTIME_RELIABILITY_CONSTRUCTION.md`，核心代码提交 `259c27b3`，真实成品 UI 验收补充提交 `ea3e53b7`。
- 已安全关闭旧实例并重建原交付目录 `electron/dist-package/win-unpacked`；发布校验记录为 `4,464,220,642` 字节，包内隔离 Python/pyserial、ESP-IDF v5.4.3、Node 和 Claude CLI 均通过。
- EventBus 已用 6 个并发进程、120 条事件验证序号连续唯一和半写入恢复；真实成品任务页又以两阶段事件证明日志面板打开后仍收到迟到事件并更新 completed。聊天成品 smoke 确认 textarea/高亮层同为 14px、20.3px 行高和 560px 内容宽度。
- 仍未验收：ESP/USB-UART 真机闭环、复杂文档页面视觉、真实云服务异常和最终客户机器分发；不得把事件注入 smoke 当成硬件闭环。
- 2026-08-07 用户截图复测确认其实际运行的是遗留 `dist-package-fixed`，该包仍为 textarea 14px / 高亮层 13px。旧目录现已在无进程占用后删除；唯一成品为 `electron/dist-package/win-unpacked`。UI smoke 必须核对 target 的 `app.asar` URL，不能只看窗口标题。`smoke:composer-geometry` 已用用户原句验证末端坐标差值 `0px`，测试后恢复输入。

- 当前日期：2026-08-07。
- 正式产品名：`Catnip Forge`；中文全称：`Catnip 硬件智能开发平台`；英文定位：`Autonomous Hardware Development Agent`。
- 内部工程代号：`vibeide`。
- 当前本机工作目录：`E:\Agent\vibeide\vibeide`（Windows 实机）。
- 当前远端真相源：remote `origin` = `git@github.com:NeilBaumanMax/Catnip-Forge.git`；当前施工分支：`qwen_vision_attachments`，基于 `main`。提交号和远端跟踪状态必须通过本地 Git 动态查询，不在接力文档中固化旧 HEAD。
- 当前分支在既有主线之上增加 Qwen 视觉旁路、聊天附件、客户数据路径迁移和猫薄荷新手旅程；DeepSeek 主开发模型不变。2026-07-25 的“不推送”任务级例外已经结束，当前必须完成回归、验收、施工分支推送和远端确认。
- 旧 GitHub/历史源：`git@github.com:howtion0/vibeide.git`、`git@github.com:howtio/vibeide.git` 仍可能出现在历史日志或迁移文档中，不再作为当前同步目标。

## 当前版本和验证

- 当前对外发布版本：`v1.0.0`；内部构建号 `7201`，npm 包版本 `1.0.0-7201`，Windows PE 四段版本映射为 `1.0.0.7201`。
- Windows 便携成品是完整的 `electron/dist-package/win-unpacked`，必须解压到普通可写目录后运行，不能只分发 exe。发布包不含真实 `resources/apikey.txt`，只含模板；无 Key 首启由应用内窗口完成配置。
- `win-unpacked` 只是构建输出名，不是运行时硬编码名称；分发压缩包的顶层目录可以重命名，但必须完整保留 exe、`resources`、DLL 等内部相对结构。推荐解压到路径较短的普通可写目录，避免 ESP-IDF 工具链遇到权限或长路径问题。
- 首启窗口保存 Key 成功后必须保留“状态反馈 + 自动重启”链路：Renderer 显示正在重启，主进程 900ms 后 `app.relaunch()` 并走统一退出清理；不要恢复为需要用户手工重启的流程。
- 首启现在同时显示 DeepSeek 必填 Key 与 Qwen 选填 Key。Qwen 留空或本地保存失败不能阻断 DeepSeek；`resources/qwen-apikey.txt` 只供 Electron 主进程使用，不得注入 Renderer、Agent 提示词、日志或 Git。
- 聊天附件由 Electron 主进程复制到 runtime-data 的会话目录，以随机附件 ID 绑定当前会话；Runtime MCP 只能经本机随机令牌桥接读取。当前图片可按需调用 Qwen，PDF/DOCX/PPTX 先走本地文字提取；复杂文档页面视觉尚未实现。
- 当前 `win-unpacked` 已在客户路径迁移实现后完整重建，并通过 `verify:version` 与扩展后的 `verify:release`；发布门禁同时确认 DeepSeek/Qwen 真实 Key 均未打入成品，并检查附件主进程桥接、Runtime MCP、bootstrap 与 user-data path 文件确实随包。
- 2026-07-25 猫薄荷新手旅程 v5 修复版及同步用户手册落地后已再次全量重建成品，共 36,991 个文件，`verify:release` 记录总大小为 `4,382,367,589` 字节；PE 版本仍为 `1.0.0.7201`，DeepSeek/Qwen 真实 Key 均未入包。此前隐藏启动已确认 Electron 子进程参数使用 `%APPDATA%\@Catnip_Forge\electron`。
- 2026-08-06 流程整改后再次全量重建当前分支成品，共 36,992 个文件、`4,382,368,640` 字节；Runtime/Electron 构建、逻辑专项、工作台/启动页/聊天/助手/新手旅程 UI、版本/发布资源、无 Key 首启和自动重启闭环均通过。三项 CDP 脚本已修正为只连接 `Catnip Forge ·` 主界面；测试 Key 和测试进程已清理。
- `verify:first-run-restart` 查找 CDP 目标时必须使用主界面标题 `Catnip Forge ·`，不能只匹配 `Catnip Forge`，否则重启时会误连标题为“Catnip Forge — 启动中”的 Splash。
- 当前施工分支源码需以 Runtime/Electron typecheck、main/renderer build、Windows unpacked 打包和 `git diff --check` 作为提交门禁。当前版本已执行 Windows 打包与发布资源校验；无 Key 首启及自动重启闭环、MCP handshake、随包 Python、ESP-IDF 冷构建及 COM5 串口回归来自同版本既有基线验证。2026-07-25 用户已在当前界面使用真实 Qwen 服务完成两张 PNG 图片的联网识别，`qwen-vl-plus` 返回的结构化证据进入 Agent“执行过程”并被主回答采用，图片视觉主闭环可记为实测通过；复杂文档页面视觉、真实服务异常场景和 Agent 长时间连续对话仍需持续观察。
- 启动阶段由独立 `splashWindow` 承接，主窗口必须保持 `show: false` 直到 `ready-to-show`。启动页从实际显示起至少保留约 5 秒，进度按一次性时间线平滑推进并封顶 94%；工作区、开发环境、Renderer 节点更新真实阶段文案，最终 100% 必须同时等待主窗口真实就绪。`assets/splash.html` 与三张 `splash-*.png` 必须随包，不能恢复循环假进度或在启动页之前闪现主窗口。
- 当前主题不再持续跟随 Windows/Electron 的 `prefers-color-scheme`。首次无记录时读取一次系统偏好，之后由“猫薄荷”助手标题栏选择并持久化；助手位置也独立持久化，可拖动避开编辑器字号工具条。
- “猫薄荷”是独立的软件使用帮助通道：复用 `resources/apikey.txt`，直接调用 DeepSeek Chat Completions，不得改为占用左侧硬件 Agent 队列。系统提示只允许解释 Catnip Forge 操作，真实编译/烧录/文件修改必须引导到左侧 Agent。
- 猫薄荷的软件事实来源是源码 `electron/CATNIP_FORGE_USER_GUIDE.md`，发布后位于 `resources/CATNIP_FORGE_USER_GUIDE.md`。每次提问重新读取且不缓存；维护发布版手册可立即生效，但正式改版必须同步源码母版。固定权限和密钥安全规则优先于手册，文件缺失或为空时必须降级为“不确定”，不得恢复硬编码功能清单。
- 悬浮入口必须使用 `catnip-assistant.png` 的透明全身形象完整呈现：默认 144px、`object-fit: contain`、无圆形背景与头像式裁切；角色本体承担点击和拖动入口。标题栏“− / ＋”以 16px 调节至 96–208px，尺寸写入 `vibeide.assistant.size`。
- 猫薄荷新手旅程在首次配置完成后提供 v5 的 23 步详细离线导览，以稳定 `data-tour-id` 聚光讲解 Agent、仓库、Build/Flash、编辑器、历史对话和猫薄荷设置；不调用模型、不修改文件、不编译烧录或连接串口。进入 Agent/助手相关步骤会自动恢复所需面板，步骤停留期间目标再次消失也会持续恢复，受管理目标不能显示黄色跳过提示，聚光框逐帧跟随布局变化。状态写入 `vibeide.onboarding.catnipJourney`，旧 v1/v2/v3/v4 状态会被忽略，助手顶部“？”可随时重播。
- Windows packaged 工作台资源不得用 `win-unpacked/<资源>` 手工拼接：Skills 通过 `getAgentDir()` 指向 `resources/agent/skills`，文档和硬件分别通过 `getResourcesDir()` / `getHardboardDir()` 解析。工作台允许范围是明确仓库，不包含整个安装根目录。
- `resources/agent/skills` 是唯一用户维护源仓库；`skill-manager.ts` 在 Agent 启动前把它标准化部署到用户数据下的 `agent-workspace/.claude/skills`。仓库页 Skill 管理器负责 CRUD/同步，不能把源路径改到 `%APPDATA%`。
- 仓库页当前以 Skills 为主：Skill 管理器固定在首位，硬件工程与参考代码作为双栏组默认折叠并共享开合状态；点击任意标题行都必须同步更新两栏的项目内容、方向和 `aria-expanded`，展开后两栏同时显示路径、打开目录入口与文件列表。
- 本轮继续加固任务生命周期：turn 完成后的页面验收、恢复和异常回调均校验原 `taskId`，停止或队列切换后的旧异步回调不会再完成新任务或复活旧任务；任务队列烟测已覆盖取消竞态及停止清空两类等待项。
- Agent 对话当前采用双层呈现：用户回复直接显示并安全渲染 Markdown，PID/工具/诊断/心跳按任务折叠；“专业视图”可自动展开全部过程。工具日志不再混入持久化 Agent 回复摘要，旧版整段日志刷屏不应恢复。
- 左栏旧“任务进度”步骤面板已取消；运行状态只在 Agent 工作时以紧凑仪表盘显示于当前“执行过程”下方，暂停或完成后不保留占位。
- Agent 历史已升级为 v2 多会话：成品保存在 `%APPDATA%/@Catnip_Forge/electron/runtime-data/claude-session/session.json`，旧 `%APPDATA%/@vibeide/electron` 在新目录首次启用时非破坏性复制；侧栏可新建/切换/确认删除，关闭重启恢复完整消息。
- 历史标签的管理入口统一为右侧“⋯”菜单：支持原位重命名、持久化置顶/取消置顶和二次确认删除；Agent 工作期间这些编辑操作保持锁定。
- 上一版 Windows exe PE 版本已验证（历史 v0.1.0）：
  - `FileVersion=0.1.0`
  - `ProductVersion=0.1.0`
- 本机源码目录：`E:\Agent\vibeide\vibeide`
- 目标打包 exe：`electron\dist-package\win-unpacked\Catnip Forge.exe`
- 产线 API key：`resources\apikey.txt`（DeepSeek，与应用同目录，删包即删 key）
- 仓库 remote `origin`：`git@github.com:NeilBaumanMax/Catnip-Forge.git`
- SSH key：`~/.ssh/id_ed25519`，已配置 `git config core.sshCommand` 绕过中文路径编码问题

已通过（当前源码目录 `E:\Agent\vibeide\vibeide`，2026-07-17）：

- `npm --prefix runtime run build` — runtime TypeScript 编译通过
- `npm --prefix electron run typecheck` — 类型检查通过
- `npm --prefix electron run build:main` — 主进程编译通过
- `npm --prefix electron run build:renderer` — React UI (Vite) 构建通过
- `npm --prefix electron run pack:win` — electron-builder win-unpacked 打包完成
- 上一版 `奥德赛0.0.exe` 启动验证通过（历史 v0.1.0，进程正常启动，无崩溃）
- **修复 ESP-IDF 编译三大问题**（2026-07-11）：
  - 中文路径 GCC linker 乱码 → 当前 junction 使用 `C:\Catnip_Forge\hardboard`
  - Python venv 绑定旧机器 HP 路径 → Windows 固定使用随包 `runtime/python/Scripts/python.exe`
  - 缺少 `espidf.constraints` → 运行时自动生成
  - 便携 Python 3.12.9 + ESP-IDF 56 依赖包已装好

已通过（上一发布版本 0.4.0.7161，2026-07-17）：

- `npm.cmd --prefix electron run verify:version`
- Runtime / Electron typecheck 与 build
- `npm.cmd --prefix electron run pack:win`
- `奥德赛0.4.0.7161.exe` PE 元数据：`ProductName=奥德赛0.4.0.7161`、`FileVersion=0.4.0.7161`、`ProductVersion=0.4.0.7161`
- 本轮尚未重新执行 exe 启动和 ESP32-S3 实机闭环，详见 `docs/WINDOWS_0_4_0_7161_TEST_REPORT.md`

下方各版本和早期 1.0.0-7201 记录均为历史验证事实；当前成品真相以本文“当前版本和验证”小节及 `WINDOWS_V1_0_0_RELEASE_CHECKLIST.md` 最新记录为准。`CATNIP_FORGE_DATA_PATH_MIGRATION_CONSTRUCTION.md` 中的体积仅是路径迁移阶段快照。

历史已通过（Windows v1.0.0 `main` 基线成品重建，2026-07-25）：

- 在 `E:\Agent\vibeide\vibeide` 的 `main` 分支执行 `npm.cmd --prefix electron run pack:win`，最终成品位于 `electron\dist-package\win-unpacked`，入口为 `Catnip Forge.exe`；目录共 36,985 个文件、`4,382,268,512` 字节。
- `verify:version` 与 `verify:release` 通过：PE 版本为 `1.0.0.7201`，Node `v22.14.0`、Python 3.12.9/pyserial `3.5`、Claude Code `2.1.167`、12 个目录型 Skills 和 Playwright 完整，且不含真实 `resources/apikey.txt`。
- `verify:first-run` 与 `verify:first-run-restart` 通过：首启配置、品牌资源、Skill 按钮、占位 Key 拒绝、保存一次性测试 Key 后自动拉起新进程均正常；结束后测试 Key 已清理，全部成品子进程已关闭。
- 首次构建暴露 `_bundled/python` 只有 site-packages、缺少 Python 核心的问题；从本机已验证的历史便携包恢复 Python 3.12.9 核心后重新全量打包。打包脚本现会在清理旧成品前预检 Node、Python、pyserial 与 Playwright，缺失时明确失败。

已通过（随包 Python、MCP、串口助手与触摸板回归，2026-07-21）：

- 动态 MCP 配置补齐 `mcp` 参数；开发模式以 `ELECTRON_RUN_AS_NODE=1` 启动，stdio initialize handshake 成功。
- 最终包只使用 `resources/runtime/python/Scripts/python.exe`，`pyserial 3.5` 可导入；旧 `idf-tools/python_env` 未进入包内。
- 打包版使用同一 Python 完成 `hello_world_esp32s3` 冷构建 1047/1047。
- `touch_hello` 面向 Waveshare ESP32-S3-Touch-AMOLED-1.8，已在 COM5 编译、烧录并验证触摸输出 `hello`。
- 内置串口助手支持完整参数、文本/HEX 双向收发、编码和行尾；COM5 枚举、打开、关闭释放均通过界面验证。
- 串口助手保持左侧收发/右侧配置布局，并按 `apple-design` 原则适配浅色/深色主题、材质、状态反馈和辅助功能媒体查询；趋势图已删除。
- `npm.cmd --prefix runtime run typecheck`、`npm.cmd --prefix runtime run build`、`npm.cmd --prefix electron run typecheck`、main/renderer build 和 `npm.cmd --prefix electron run pack:win` 通过。

已通过（应用主题与可拖动外观入口，2026-07-21）：

- `npm.cmd --prefix electron run typecheck`、renderer 生产构建和 Windows `pack:win` 通过；品牌切换后的最终验证对象改为 `Catnip Forge.exe`。
- 深色 `#131315` 与浅色 `#e9eaed` 可由应用内菜单切换；页面重载后主题仍保持，最终验收状态恢复为深色。
- 使用成品窗口真实指针事件将按钮拖至 `(100,100)`，松开后 `is-dragging` 正常清除，坐标写入 `vibeide.appearance.position`，页面重载后位置保持。
- 按钮位于左上区域时浮层自动向右下展开，实测边界完全位于视口内；最终按钮移回右侧、距底部约 86px，不遮挡字号工具条。

已通过（任务状态 UI 与 packaged Skills 路径，2026-07-21）：

- Build 行“编译工程”静态文字已替换为“刷新工程”按钮；成品点击后工程下拉保持 4 个选项。Build/Flash 标识改为透明底，等待/输入/运行/成功/失败使用 Apple 语义状态胶囊。
- 修复 Skills 卡片路径为 `win-unpacked/resources/agent/skills`；成品仓库页列出 12 个可见 Skills 文件，点击“在资源管理器中打开”成功。
- 目录打开反馈显示绿色短状态，完整路径放在悬停提示；成功后仓库标题正文宽 632px、头部高 147px，没有再被长错误挤成竖排。
- Electron typecheck、renderer build、Windows `pack:win` 和 `git diff --check` 通过。

已通过（原生 Skill 部署与仓库页管理，2026-07-21）：

- Electron typecheck、main/renderer build、Windows `pack:win`、`verify:skills`、`verify:hardboard`。
- 12 个随包 Skill 已标准化部署，普通 Electron 编译不触发 Hardboard，ESP32 任务推荐 `/espidf-hardboard`。
- `smoke:workbench` 已改用隔离临时 userData，但本机 Electron GPU 子进程仍以 `0xC0000135` 退出，未获得 UI 结果；需在具备完整图形运行依赖的桌面环境补跑。

已通过（Windows v1.0.0 便携发布，2026-07-21）：

- Catnip Forge 最终 `win-unpacked` 共 `4,463,705,939` 字节，入口为 `Catnip Forge.exe`，PE 文件版本和产品版本均为 `1.0.0.7201`。
- `verify:release` 验证便携 Node `v22.14.0`、pyserial `3.5`、Claude Code `2.1.167`、Runtime health、12 个 Skills、Playwright 与 ESP-IDF 资源。
- 成品无 Key 实际启动后首次配置窗口正常，模板占位 Key 被拒绝；保存一次性测试 Key 后应用自动拉起新进程，新进程实测 `apiKeyReady=true`、`firstRun=false` 且配置窗口消失；验证结束后测试 Key 已清除。
- 当前 exe 未做商业代码签名，换机运行可能出现 SmartScreen；正式对外分发前应配置可信代码签名证书。

已通过（Electron Apple UI 与 1.0.0-7201，2026-07-20）：

- 全面移除 NES.css 依赖与像素式控件表达，新增 `styles/apple.less` 冷色材质与无障碍覆盖。
- 仓库页显示硬件工程、参考代码和 Skills；Agent 工作区不再显示为仓库卡片，但仍作为编辑器受控根目录。
- 任务历史清除不再被残留 PID/运行状态阻止，界面即时归零，Runtime 删除 EventBus 与 `.log` 文件。
- 监视器确认使用真实 `pyserial`；2026-07-21 已升级为双向串口助手并删除数值趋势图，见下方最新验证。
- 编辑器标签等宽分配，关闭按钮有 hover/focus 反馈，右键菜单使用 Portal 贴近鼠标定位。
- 详细施工基线见 `docs/ELECTRON_APPLE_UI_CONSTRUCTION.md`。

已通过（编辑器功能 `5afcef3`、交互修复 `63992ea`，2026-07-18）：

- `npm.cmd --prefix electron run typecheck`
- `npm.cmd --prefix electron run build:main`
- `npm.cmd --prefix electron run build:renderer`
- `git diff --check`
- 开发预览已启动，Vite `5173` 与 Electron CDP `9230` 正常监听
- `pytest tests/test_project.py` 未执行：当前 PowerShell 环境没有 `pytest` 命令，不能记录为通过

已通过（Agent 任务串行化修复 `39ef92d`，2026-07-18）：

- `npm.cmd --prefix electron run typecheck`
- `npm.cmd --prefix electron run build:main`
- `npm.cmd --prefix electron run build:renderer`
- `npm.cmd --prefix electron run verify:task-queue`
- `npm.cmd --prefix electron run verify:session`
- `npm.cmd --prefix electron run verify:hardboard`
- `git diff --check`
- Renderer 大包提示和 Electron `os_crypt_win.cc` 本机凭据解密告警仍存在，但上述命令退出码均为 0；本轮未调用真实 Agent 做高成本联调

已通过（Agent 任务取消竞态加固，2026-07-20）：

- `npm.cmd --prefix electron run typecheck`
- `npm.cmd --prefix electron run build:main`
- `npm.cmd --prefix electron run build:renderer`
- `npm.cmd --prefix electron run verify:task-queue`
- `npm.cmd --prefix electron run verify:session`
- `npm.cmd --prefix electron run verify:hardboard`
- `git diff --check`
- Renderer 大包提示和 Electron `os_crypt_win.cc` 本机凭据解密告警仍存在，但命令退出码均为 0

已通过（Runtime 日志真实清理 `25065b4`，2026-07-20）：

- `npm.cmd --prefix runtime run verify:event-clear`
- `npm.cmd --prefix runtime run build`
- `npm.cmd --prefix electron run typecheck`
- `npm.cmd --prefix electron run build:main`
- `npm.cmd --prefix electron run build:renderer`
- `npm.cmd --prefix electron run verify:task-queue`
- `npm.cmd --prefix electron run verify:session`
- `npm.cmd --prefix electron run verify:hardboard`
- `git diff --check`

已通过（历史 E 盘验证）：

- 打包版 runtime `hardboard:env`
- 打包版 runtime `hardboard:devices`
- `wifi_connect_fmai` 编译通过
- `wifi_connect_fmai` 烧录 `COM7` 通过，hash verified
- `hello_world_esp32s3` 编译通过
- `hello_world_esp32s3` 烧录 `COM7` 通过，hash verified

历史 0.1 包剩余问题（当前 1.0.0-7201 已用 COM5/`touch_hello` 完成新闭环）：

- `hardboard:serial` 可以打开 `COM7` / `COM8` 并生成日志，但当前没有抓到应用层 `Hello world!` 输出。
- `COM9` 打开失败，Windows 返回串口超时。
- 后续应给串口工具增加明确的 reset/open 时序选项，例如 `none`、`rts`、`idf-monitor`，并在 UI 上把”端口已打开但无数据”显示清楚。

以上三项仅是 0.1 历史测试记录，不是当前 Agent 共享串口控制的未完成实现。当前源码已由 Electron 主进程唯一持有串口会话，并向 UI 与 Runtime MCP 同步状态；真实 ESP 设备上的 reset/console 差异仍属于后续实机兼容性验收。

## 当前 UI 状态

- 顶部可见页签：仓库、监视器、任务管理器、编辑器。
- 工作台：前端入口已隐藏；React 内部逻辑、IPC、`WebContentsView` 和主进程后端暂时保留，避免贸然删除早期链路。
- 监视器：使用随包 Python 的真实双向 `pyserial` 服务；Electron 主进程持有唯一共享会话，UI 与 Agent MCP 均可查询、打开、关闭、发送、读取、等待输出和清空缓冲。左侧为接收/发送区，右侧为串口/接收/发送配置，支持文本与 HEX；Agent 发送会标记来源，数值趋势图已删除。
- 主布局：左侧默认 34%，支持拖动、键盘微调、宽度持久化以及收起/展开对话区。
- Agent 对话：同一时间只运行一个活动任务；执行中“追加要求”会在当前任务下一执行点继续处理，“排队”才建立独立后续任务。标题显示空闲/执行中/暂停，状态条显示追加与排队数量，输入框支持 `Shift+Enter` 换行。
- 可读性：界面已放弃像素风；中文正文使用系统字体，代码和日志使用等宽字体，基础正文 15px，控件和元信息同步增大并提高对比度。
- 任务管理器：先从 `hardboard/projects/<name>` 相对路径选择工程，再执行对齐的 Build/Flash 控制；Build/Flash 第二列分别刷新工程/设备，状态为语义胶囊；旧文件选择器、源码预览和 PID/Task/Tool 摘要块已移除。
- 任务诊断：实时日志、完整日志、事件卡片按需打开；最近任务结果按 `taskId` 汇总并支持滚动。任一“清除”都会立即清空旧记录并删除 EventBus 历史和 Hardboard `.log` 文件，不再因残留运行状态拒绝或回滚界面。
- 日志定位：点击某条任务的“查看”会在完整日志中自动定位对应 `taskId`；失败使用克制红色，其余状态避免突兀高饱和强调。
- 编辑器：左侧显示 Agent 工作区、硬件工程、参考代码和 Skills 四个受控根目录，目录按需展开；右侧使用 Monaco Editor，支持语法高亮、等宽弹性多文件标签、`Ctrl+S` 保存和关闭。
- 编辑器空状态：标签栏提示、未打开路径和代码区说明使用主题文字令牌；旧版固定深蓝色不再覆盖深色主题。修复后 Electron typecheck、renderer build、Windows `pack:win` 与 `git diff --check` 已通过，并已启动成品复测。
- 编辑器字号：底部提供减小、增大和重置，范围 10–24px，使用 `localStorage` 保存用户上次字号。
- 编辑器文件管理：目录右键可新建文件/文件夹，文件和子目录可重命名或移到系统回收站，所有节点可刷新；新建、重命名和删除确认均使用软件内置对话框。主进程只允许操作工作台许可范围，禁止覆盖同名条目和修改资源管理器根目录。
- 仓库：显示硬件工程、参考代码和 Skills，不显示“Agent 生成”及“导入文件夹”。Skills 以独立目录进入编辑器资源管理器；左侧输入区支持在正文光标位置插入多个 `@skill-id`。

## 必读顺序

```bash
sed -n '1,220p' docs/HANDOFF.md
sed -n '1,220p' docs/INDEX.md
sed -n '1,220p' docs/LOG.md
sed -n '1,240p' docs/WINDOWS_0_1_TEST_REPORT.md
sed -n '1,220p' docs/WINDOWS_0_1_MIGRATION_CONSTRUCTION.md
```

如涉及硬件：

```bash
sed -n '1,240p' docs/HARDBOARD_CONSTRUCTION.md
sed -n '1,220p' runtime/hardboard/doc/README.md
```

## 开工检查

```powershell
cd E:\Agent\vibeide\vibeide
git status --short
git branch --show-current
git remote -v
git log --oneline -5
```

不要使用 `git reset --hard` 或 `git checkout --` 回滚文件，除非用户明确要求。

## SSH 注意事项

Windows 中文用户名（刘天凯）路径导致 Git Bash 中 ssh.exe 编码异常：

```bash
# ~/.ssh/config 已配置 IdentityFile，但需额外设置：
git config --global core.sshCommand 'ssh -i /d/ssh-home/.ssh/id_ed25519 -o UserKnownHostsFile=/d/ssh-home/.ssh/known_hosts'
```

## 验证命令

```bash
npm --prefix runtime run build
npm --prefix electron run typecheck
npm --prefix electron run build:main
npm --prefix electron run build:renderer
npm --prefix electron run pack:win
npm --prefix electron run stamp:win -- "dist-package/win-unpacked/Catnip Forge.exe"
```

如果改了 Agent session 或 hardboard context：

```bash
npm --prefix electron run verify:session
npm --prefix electron run verify:hardboard
```

## 打包版 runtime 验证

```cmd
cd /d E:\Agent\vibeide\vibeide\electron\dist-package\win-unpacked\resources\runtime
node dist\index.js hardboard:env
node dist\index.js hardboard:devices
node dist\index.js hardboard:build hardboard\projects\hello_world_esp32s3
node dist\index.js hardboard:flash hardboard\projects\hello_world_esp32s3 COM7
node dist\index.js hardboard:serial COM7 10 115200
```

注意：历史 0.1 包的 `hardboard:serial` 无应用输出只作为旧测试事实保留；当前版本报告串口成功仍必须附带具体端口、工程和实际捕获内容。

## 同步策略

当前接力以 `E:\Agent\vibeide\vibeide`（Windows 实机）为唯一编辑主场：

1. 本机改代码和文档。
2. 本机验证（typecheck / build / pack）。
3. 提交到 Git。
4. 推送当前施工分支到 remote `origin`（`git@github.com:NeilBaumanMax/Catnip-Forge.git`），查询远端并确认提交号；未经合并验收不直接推入 `main`。
5. `git config core.sshCommand` 已配置解决中文路径问题。

不要提交：

- `.local-secrets/`
- `node_modules/`
- `electron/dist/`
- `electron/dist-package/`
- `runtime/dist/`
- `runtime/chrome_profile/`
- `runtime/recordings/`
- `runtime/workflows/`
- `runtime/workbench-imports.json`
- `agent/logs/`
- `agent/screenshots/`
- `apikey.txt`
- `.env`

## 架构边界

```text
Electron UI -> Gateway -> Worker -> Agent -> Runtime MCP -> Electron Chromium / ESP-IDF hardboard
```

- Gateway 是唯一 IPC 入口。
- Runtime 不调 LLM，只负责 MCP tools、CDP、硬件命令、录制回放和存储。
- Agent 不直接碰 Playwright，不写脚本操作浏览器，浏览器操作必须走 MCP。
- hardboard 工具调用优先使用相对路径：`hardboard\projects\<project>`。
- 查 hardboard 工程文件不要扫 `build/**`，先读 `main/CMakeLists.txt` 的 `SRCS`。
- Skill 源结构统一为 `agent/skills/<skill-id>/SKILL.md`；脚本和参考文件跟随同一目录部署。聊天正文中的多个 `@skill-id` 属于显式必调项，不能退回单选或只调用第一个。

## 冻结兼容区

- 网页录制/回放、workflow、网页爬虫、平台搜索预处理、隐藏浏览器工作台和旧 Python `coddecat` scaffold 暂不继续开发。
- 上述早期能力全部保留，不删除源码、测试、配置、脚本或打包桥接；不要为了让全量 `pytest` 变绿而伪造或移除 `src/coddecat`。
- 这些遗留项不作为当前 Windows v1.0.0、Agent、编辑器或 Hardboard 主线的发布阻塞项。
- 详细施工边界见 [LEGACY_WEB_AUTOMATION_CONSTRUCTION](LEGACY_WEB_AUTOMATION_CONSTRUCTION.md)。

## 下一步建议

1. 对编辑器新建、重命名、回收站删除、字号持久化和打包版离线语法高亮执行一轮 Windows UI smoke，重点覆盖已打开标签的路径同步。
2. 根据启动和包体实测决定是否拆分 Monaco 语言资源；当前完整 Worker 已本地打包。
3. 有真实开发板后验证 Agent/UI 共享串口的收发、等待输出、断线恢复以及不同 ESP32 console/reset 策略。
4. 任务管理器 Windows packaged 事件持续订阅 smoke 已补齐；有真实设备后再覆盖 build/flash/serial 三个硬件入口，不能用事件注入替代。
5. 发布 `1.0.0-7201` Windows 包后，新建对应版本报告；旧版本报告继续保留为历史实测。
6. 在 ESP-IDF 真实编译测试通过后，补全 `WINDOWS_0_1_TEST_REPORT.md` 的中文路径修复验证项。
