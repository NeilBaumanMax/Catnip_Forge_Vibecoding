# Windows v1.0.0 便携版发布检查

## 版本口径

- 产品名：`Catnip Forge`
- 中文全称：`Catnip 硬件智能开发平台`
- 英文定位：`Autonomous Hardware Development Agent`
- 对外发布版本：`v1.0.0`
- 内部构建号：`7201`
- npm/应用包版本：`1.0.0-7201`
- Windows PE 文件版本：`1.0.0.7201`
- 成品目录：`electron/dist-package/win-unpacked`
- 可执行文件：`Catnip Forge.exe`

构建号用于区分 v1.0.0 的内部迭代，不改变对外发布主版本。

## 分发方式

可以压缩并分发整个 `win-unpacked` 文件夹。接收方必须完整解压，不能只复制 exe，也不能直接在压缩软件预览窗口中运行。

建议解压到路径较短的普通用户可写目录，例如 `D:\CatnipForge`。如果放进 `Program Files` 等受保护目录，首次保存 API Key、编辑随包 Skills 时可能因权限不足失败；当前最长随包相对路径约 221 字符，避免再套入很深的下载目录。

发布目录根部包含 `README-FIRST.txt`，接收方按其中步骤操作。

## 首次启动与 API Key

发布包必须满足：

- 不包含 `resources/apikey.txt`，避免泄露发布者密钥。
- 包含 `resources/apikey.txt.example`，内容只有占位符。
- 无 Key 首次启动时显示应用内配置窗口。
- 用户粘贴 DeepSeek API Key 后写入当前解压目录的 `resources/apikey.txt`，界面显示正在重启，软件自动重新打开。
- 自动重启后的 Agent 从新进程读取 Key，用户不需要再手工关闭一次软件。
- Agent 启动时从该文件设置 `ANTHROPIC_AUTH_TOKEN`、`https://api.deepseek.com/anthropic` 和 `deepseek-v4-pro`。

DeepSeek 的 Anthropic 兼容地址和 `deepseek-v4-pro` 模型以官方文档为准。

## 必须随包的运行资源

- Electron 主程序、locales、pak、V8 snapshot、D3D/EGL/GLES/Vulkan DLL。
- Catnip Forge 的 Windows ICO、应用 PNG 和前端左上角品牌图。
- `resources/app.asar` 及 Skill 管理、对话 UI。
- `resources/agent`、Claude Code CLI 和 12 个内置 Skills。
- `resources/runtime/nodejs`、Runtime 编译产物和 node_modules。
- `resources/runtime/python`、pyserial 及 `Scripts/python.exe`。
- Playwright Chromium。
- ESP-IDF 5.4.3、工具链、CMake、Ninja、ccache 和示例工程。

## 自动验证

```powershell
npm.cmd --prefix electron run verify:version
npm.cmd --prefix electron run typecheck
npm.cmd --prefix electron run verify:skills
npm.cmd --prefix electron run verify:hardboard
npm.cmd --prefix electron run pack:win
npm.cmd --prefix electron run verify:release
npm.cmd --prefix electron run verify:first-run
npm.cmd --prefix electron run verify:first-run-restart
git diff --check
```

`verify:release` 会检查版本元数据、关键目录、真实 Key 缺失、Key 模板、app.asar、便携 Node/Python/Claude Code、Runtime health、开发机绝对路径和发布目录总体积。

2026-07-21 Catnip Forge 最终成品实测：目录共 `4,463,705,939` 字节；Node `v22.14.0`、Python 3.12/pyserial `3.5`、Claude Code `2.1.167` 和 Runtime health 均通过。成品实际启动后，窗口标题、左上角 26px 品牌图、首次配置窗口、英文定位、Playwright 资源和 Skills 按钮均通过 CDP 校验，占位 Key 被拒绝。首次保存一次性测试 Key 后应用自动拉起新进程，新进程实测 `apiKeyReady=true`、`firstRun=false` 且配置窗口消失；测试 Key 随后已清除。

2026-07-25 从 `main` 重新全量生成最终成品：目录共 36,985 个文件、`4,382,268,512` 字节，入口 `Catnip Forge.exe` 的 PE 版本为 `1.0.0.7201`。`verify:version`、`verify:release`、`verify:first-run` 和 `verify:first-run-restart` 均通过；Node `v22.14.0`、Python 3.12.9/pyserial `3.5`、Claude Code `2.1.167`、Playwright 与 12 个目录型 Skills 完整，无真实 API Key。首启及保存一次性测试 Key 后自动重启闭环通过，测试 Key 和全部成品测试进程已清理。打包入口同时增加 `_bundled` 前置校验，缺少 Node、Python、pyserial 或 Playwright 时会在清理旧成品前失败；仓库页后续更新为 Skills 优先、硬件工程与参考代码默认折叠并同步开合，已重新打入同一成品目录。

2026-07-25 从 `qwen_vision_attachments` 再次完整重建当前成品：目录共 36,991 个文件、`4,382,346,009` 字节，PE 版本仍为 `1.0.0.7201`。`verify:version` 与扩展后的 `verify:release` 通过，DeepSeek/Qwen 真实 Key 均未入包，Qwen 附件桥接、Runtime MCP、Electron bootstrap 和 Catnip user-data path 文件均已随包。隐藏启动确认 Electron 使用 `%APPDATA%\@Catnip_Forge\electron`；自动打包与发布门禁未使用真实 Qwen Key，测试进程和临时目录均已清理。随后用户在当前界面自行配置真实服务，以两张 PNG 图片完成 `qwen-vl-plus` 联网识别，工具事件、结构化视觉证据和 Agent 主回答引用均正常，图片视觉主闭环通过人工验收；真实 Key 仍只保存在用户本地且不属于发布包。

2026-07-25 猫薄荷新手旅程 v2 与顶部“？”重播入口落地后再次全量重建当前成品：共 36,989 个文件，`verify:release` 记录总大小为 `4,382,362,210` 字节，PE 版本仍为 `1.0.0.7201`；`verify:version`、发布资源校验、10 个稳定引导目标专项断言和隔离 Chromium 完整 UI 流程均通过。成品包含首次邀请、12 步离线导览、完成持久化和顶部功能栏重播，不包含 DeepSeek/Qwen 真实 Key。

2026-07-25 按真实界面反馈将旅程升级为 v3 详细版并再次全量重建：当前成品共 36,989 个文件，`verify:release` 记录总大小为 `4,382,366,713` 字节，PE 版本仍为 `1.0.0.7201`。20 个稳定聚光目标、23 步完整 UI 流程、完成持久化、顶部“？”重播与 “One Prompt, Working Hardware” 完成页均通过；成品不包含 DeepSeek/Qwen 真实 Key。

2026-07-25 全屏人工测试反馈修复后升级为 v4 并再次全量重建：当前成品共 36,989 个文件，`verify:release` 记录总大小为 `4,382,367,369` 字节，PE 版本仍为 `1.0.0.7201`。隔离 Chromium 流程真实收起 Agent 后确认聚光框跟随新坐标，后续步骤自动恢复 Agent 与猫薄荷面板且不显示黄色跳过提示；教程正文、标题和猫薄荷形象已放大。成品不包含 DeepSeek/Qwen 真实 Key。

2026-07-25 第 22 步助手被再次关闭导致恢复停滞的问题修复后升级为 v5，并在同步用户手册后完成最终全量重建：当前成品共 36,991 个文件，`verify:release` 记录总大小为 `4,382,367,589` 字节，PE 版本仍为 `1.0.0.7201`。受管理教程目标现会在步骤停留期间持续恢复；隔离 Chromium 流程主动关闭猫薄荷助手后确认面板、高亮和教程操作均自动恢复。成品不包含 DeepSeek/Qwen 真实 Key。

## 使用边界

- 目标系统为 Windows 10/11 x64。
- Agent 需要可访问 DeepSeek API 的网络和用户自己的有效 Key。
- 串口需要对应 USB-UART 驱动，且端口不能被其他程序占用。
- 包未配置商业代码签名证书，其他电脑可能出现 Windows SmartScreen 提示；这不等于运行资源缺失。
- 实际硬件编译/烧录仍受开发板、串口驱动和工程本身影响。
