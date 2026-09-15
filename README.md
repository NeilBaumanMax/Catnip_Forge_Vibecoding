# Catnip Forge

**中文全称：Catnip 硬件智能开发平台**

**英文定位：Autonomous Hardware Development Agent**

Catnip Forge 是一个面向硬件 vibecoding 的本地桌面 IDE。它把 Electron、Claude Code Agent、Runtime MCP 工具、ESP-IDF hardboard 工具链和可复用 Skill 放在同一个桌面应用里，用来完成 ESP32/ESP32-S3 工程编写、编译、烧录、串口监视、文档查看和网页辅助检索。

当前 GitHub 开发仓库名为 `Catnip_Forge_Vibecoding`；内部 npm 包名和运行态兼容键仍沿用 `vibeide` 作为工程代号，用户可见正式产品名统一为 `Catnip Forge`。

当前主线不是旧的纯 Python scaffold，而是：

```text
Electron UI -> Gateway -> Worker -> Agent -> Runtime MCP -> Electron Chromium / ESP-IDF hardboard
```

## 当前状态

当前开发线、里程碑、活动任务、外部/硬件验收和发布状态统一在 [CURRENT](docs/state/CURRENT.md)。版本元数据以 [config/version.json](config/version.json) 为准。
Development Agent 从 [PROJECT_INDEX](docs/PROJECT_INDEX.md) 按模块定位；普通任务不再默认读全局施工/测试历史。

## 能力边界

- 应用启动时显示 Catnip Forge 品牌启动页；工作区、开发环境和 Renderer 的真实加载节点驱动阶段文字、百分比与进度条，工作台可显示后自动切换主窗口。
- Electron 桌面窗口提供六个可见工作区：仓库、监视器、任务管理器、编辑器、探索、Neil 的 skill 小站。Skill 小站当前在内置浏览器打开固定站点；仓库页既有 Skill Manager 仍是本地管理入口，尚无已验证的站点到本地一键安装桥。探索包含找灵感、解问题、独立多历史、可取消工程 Context、来源、知识收藏、四阶段计划/交接与明确确认门禁，并按自身宽度切换 Compact/Normal/Wide。冷启动必须显式选择或新建工程；Agent、编辑器、Build/Flash/Serial 和 Explore 历史按当前工程切换。
- 右下角“Neil·Bauman's 学院呱呱”是独立软件使用助手，复用本地 DeepSeek API Key 并读取随包使用手册；它不占左侧硬件 Agent 队列。助手含作者 GitHub 固定白名单入口，新手引导覆盖探索、Skill 小站和学院呱呱。
- Worker 负责快捷任务、搜索预处理、任务上下文构造和 Agent 生命周期；同一时间只运行一个活动任务，执行中消息默认追加到当前任务，显式“排队”才建立独立后续任务。
- Agent 负责推理和任务执行规划，但所有浏览器操作必须通过 MCP 工具完成。
- Runtime 通过 CDP 连接 Electron Chromium，提供 `browser.*`、`storage.*` 和 `hardboard.*` MCP tools。
- 任务管理器的日志“清除”会立即清空历史视图，并真实删除 EventBus 历史和 Hardboard `.log` 文件；残留 PID/运行状态不再阻止清除，后续新事件仍继续显示。
- 监视器是内置双向串口助手：支持端口、波特率、数据位、停止位、校验位、文本/HEX 收发、GBK/UTF-8/ASCII/Latin1 和行尾控制。Agent 通过 Runtime MCP 控制 Electron 主进程持有的同一个串口会话，可查询、打开、关闭、发送、增量读取、等待输出和清空缓冲；Windows 设备枚举优先使用 CIM，失败时回退到随包 `pyserial`。数值趋势图已删除。
- Windows 安装包只使用 `resources/runtime/python/Scripts/python.exe` 及同一目录内的依赖，不再打包或回退到绑定开发机器路径的 ESP-IDF Python venv。
- `runtime/hardboard` 保存 ESP-IDF 工具、ESP32-S3 示例、施工文档、本地工程和固件产物。
- 录制、回放和 workflow 保留，用于把网页/调试流程沉淀为可复用辅助任务。

## 快速开始

### Windows

```powershell
cd E:\Agent\vibeide\vibeide
powershell -ExecutionPolicy Bypass -File scripts\start_electron_desktop.ps1
```

或：

```cmd
cd /d E:\Agent\vibeide\vibeide
scripts\start_electron_desktop.cmd
```

发布给其他用户时，应压缩并分发完整的 `electron\dist-package\Catnip Forge` 文件夹。接收方完整解压到普通可写目录后运行 `Catnip Forge.exe`；首次启动窗口先引导在本机保存 DeepSeek API Key，自动重启后要求用户显式选择现有工程或在随包 `resources\runtime\hardboard\projects` 下新建工程。不能只发送 exe，也不要把包含真实 `resources\apikey.txt` 的目录重新分发。最近一次已记录的 v2.0.0 包验收为 2026-09-12，见 [测试记录](docs/construction/TEST_METRICS.md#2026-09-12--catnip-forge-windows-解压包)；该历史验收不代表切换分支后本机留存包已经重新核验。`win-unpacked` 仅为当前定制打包脚本的中间目录，Phase 13 和 v1.5.0 报告保留为历史证据。

### Linux / macOS

```bash
cd /path/to/vibeide
bash scripts/start_electron_desktop.sh
```

### 直接用 npm

```bash
cd runtime && npm install && npm run dev
cd ../electron && npm install && npm run desktop
```

## 目录结构

```text
electron/                  Electron 桌面端
electron/src/main/          主进程、Gateway、Worker、BrowserView
electron/src/renderer/      React UI
runtime/                   Runtime MCP 与 CDP 控制层
runtime/src/mcp/            MCP tools 注册
runtime/hardboard/          ESP-IDF hardboard 工具、示例、工程、施工文档
agent/                     Claude Code Agent 工作区
agent/skills/              平台知识与操作规则
agent/tools/               跨平台辅助脚本
config/                    YAML 配置
docs/                      新文档体系和接力材料
scripts/                   启动、报告和辅助脚本
tests/                     当前结构测试与旧 scaffold 测试
```

## 开发检查

```bash
git status --short

# Runtime
cd runtime
npm install
npm run typecheck

# Electron
cd ../electron
npm install
npm run typecheck
npm run build:main
npm run build:renderer

# Python 结构测试
cd ..
pytest tests/test_project.py
```

说明：`tests/test_scaffold.py` 保留了旧 Python scaffold 预期，当前可能和 Electron 主线不一致。重构时需要决定保留、迁移或删除这条旧线。

## 文档入口

- [文档索引](docs/INDEX.md)
- [架构说明](docs/ARCHITECTURE.md)
- [开发流程](docs/DEVELOPMENT.md)
- [GitHub 同步和接力](docs/GITHUB_SYNC.md)
- [重构计划](docs/REFACTOR_PLAN.md)
- [安全和账号规则](docs/SECURITY.md)
- [当前施工接力文档](docs/construction/HANDOFF.md)
- [Hardboard 施工文档](docs/HARDBOARD_CONSTRUCTION.md)
- [Electron Apple 风格界面施工文档](docs/ELECTRON_APPLE_UI_CONSTRUCTION.md)
- [Qwen 视觉与聊天附件施工文档](docs/QWEN_VISION_ATTACHMENT_CONSTRUCTION.md)
- [猫薄荷新手旅程施工文档](docs/CATNIP_ONBOARDING_CONSTRUCTION.md)
- [开发进度](docs/DEV_PROGRESS.md)
- [施工日志](docs/LOG.md)
- [Windows 0.1 测试报告](docs/WINDOWS_0_1_TEST_REPORT.md)
- [Hardboard Agent 运行文档](runtime/hardboard/doc/README.md)

## Git 策略

不要把 Windows 当前整目录直接提交。必须排除：

- `node_modules/`
- `electron/dist/`
- `electron/dist-package/`
- `runtime/dist/`
- `runtime/chrome_profile/`
- `runtime/recordings/`
- `runtime/workflows/`
- `agent/logs/`
- `agent/screenshots/`
- `apikey.txt`
- `.env`

账号、密码、API Key 和 SSH 信息只保存在本机，不写入项目文档或版本库。

## 下一步

1. 人工复测 `electron/dist-package/Catnip Forge`，先核对包来源与版本：冷启动工程选择/新建、返回或切页后 Explore 保留、重启恢复、工程 A/B 的 Agent 历史/编辑器/烧录目标隔离。
2. 经用户明确授权后执行真实“解问题”知乎＋全网双搜索验收；不把既有找灵感结果或软件门禁当作 Diagnosis 证据。
3. 在全新 Windows 用户环境验收 Access Secret 安全连接；有真实开发板时完成用户确认后的 Build/Flash/Serial 闭环，缺实机证据继续标记 `REAL_HARDWARE_VALIDATION_PENDING`。
4. 完成 Skill 小站到既有 Skill Manager 的安全下载安装闭环；完整待办与验收边界见 [当前状态](docs/state/CURRENT.md)。
