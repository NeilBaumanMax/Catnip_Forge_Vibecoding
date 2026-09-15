# Phase 21：Forge 电台完整移植

状态：`IN PROGRESS / 21b + 21d DEVELOPMENT SLICE RUNNING`

日期：2026-09-15（Asia/Shanghai）

施工分支：`liukanshan`

基线提交：`ea40e0111247d9d4e7b32b287a6fe02c12581bee`

本地恢复点：`backup/pre-phase-21-radio-20260915`

来源目录：`E:\Agent\vibeide\小智`（只读）

## 1. 用户确认的目标

在 Catnip Forge 顶部工作区增加“电台”标签页，把来源目录中的 Forge 电台完整迁入当前 Electron 软件。完整移植优先于旧文档中对电台的限制；用户明确允许独立电台进程直接调用知乎 HTTP API。

移植后的用户体验必须包括：

1. 3D 硬件测试台、模型装配、旋转/缩放、关节控制、动作与 GIF 屏幕。
2. 光驱弹出/收回动效，以及硬件测试台与 AI 社区电台的切换。
3. 知乎工作台：知乎搜索、全网搜索、热榜、直答、问题发现、回答摘要。
4. 本人数据：帖子列表、本人全文、评论、创作数据、关注、近期收藏、收藏夹与分页。
5. 人设：角色名称、角色说明、长期记忆、兴趣、语言/音色相关配置状态。
6. 小智：文字对话、知乎工具调用、结果同步、自动讲解、停止回复和 Edge TTS 音频播放。
7. 来源、作者、摘要/全文边界、错误、空结果和分页游标的真实呈现。

来源 README 已明确失效的旧 `/api/v1/sessions` 3D Agent broker 不作为可用功能宣称；如果保留相关源文件，默认路径必须不可触发，不能显示假连接成功。

## 2. 已完成的只读审计

### 2.1 来源组成

| 区域 | 现状 | 移植处理 |
| --- | --- | --- |
| `frontend/app/src` | TypeScript + Three.js 独立前端 | 完整复制到仓库内的电台模块，保持独立 Vite 构建，避免 React 重写造成视觉/交互漂移 |
| `frontend/public` | GLB/STL、GIF、场景图片、Skill/说明文件 | 按使用清单保真复制；构建产物只保留一份，禁止同时打包 source public 与旧 dist 重复资源 |
| `backend/app.py` | FastAPI、会话、查询、WebSocket 转发、静态资源 | 改为单 PID 组合入口，端口由 Electron 分配，保留 loopback 与请求限制 |
| `backend/zhihu.py` | 知乎 HTTP 只读工具 | 用户已授权在电台进程内继续使用；保留白名单、输入校验、单页分页和错误脱敏 |
| `backend/store.py` | SQLite + Fernet，相邻目录保存 key | 普通人设可迁移到用户数据；Secret 不沿用相邻 keyfile 方案，改由 Electron Main 系统安全存储注入 |
| `vendor/main/xiaozhi-server` | 上游小智 server，MIT，带 Forge 适配 | 保留 vendor 边界与许可证；只做单进程、端口、工具桥和安全注入所需适配 |
| `run.py` | `web` 与 `xiaozhi` 两个互斥入口 | 新增组合服务入口；一个 Python PID 同时运行 HTTP 与小智 WebSocket |

### 2.2 当前运行事实

- 来源 `run.py web`：监听 `127.0.0.1:8890`，只提供 WebUI/API/WebSocket 转发。
- 来源 `run.py xiaozhi`：另启 `127.0.0.1:8000/xiaozhi/v1/`，承担模型、工具和 TTS。
- 因此来源完整功能目前需要两个 PID；这不满足本次目标，必须组合进同一个 Python 进程的 asyncio 生命周期。
- 前端 `radio-api.ts` 使用同源 `/api`，`xiaozhi-link.ts` 使用同源 `/api/xiaozhi`；让电台前端由该 loopback 进程提供静态资源，可以最大程度原样复用会话、Cookie 和 WebSocket 逻辑。
- 来源 Python 要求 FastAPI、Uvicorn、HTTPX、WebSockets、Cryptography；完整小智还要求 NumPy、OpenAI、Edge TTS、MCP 等依赖。
- Catnip 当前随包 Python 为 3.12，已装 Cryptography，但未装 FastAPI、Uvicorn、HTTPX、WebSockets、NumPy 等电台依赖；来源 README 指定 Python 3.11。不能把开发机现成 venv 当成发布依赖。

### 2.3 许可证与资源

- `xiaozhi-esp32-server` 来源提交：`6afc54a17def47578a4b3efc4680873689d3168b`，MIT License。
- Otto 参考模型、GIF 与关节约定已有独立 MIT 第三方声明。
- 发布包必须携带许可证和 `THIRD_PARTY_NOTICES.md`；不得把来源 `.runtime`、测试凭据、数据库、虚拟环境或旧 `frontend/dist` 原样塞入包。

## 3. 目标架构

```text
Electron Renderer
  └─ 顶部“电台”标签页
      └─ 受限 iframe: http://127.0.0.1:<httpPort>/
          ├─ 3D/光驱/电台完整前端
          ├─ 同源 /api/*
          └─ 同源 /api/xiaozhi WebSocket

Electron Main（唯一生命周期所有者）
  ├─ RadioProcessManager
  ├─ 系统安全凭据存储 / 原生安全输入
  ├─ 分配并校验 loopback 端口
  └─ spawn 一个 Python 子进程
       ├─ FastAPI/Uvicorn HTTP + 静态前端
       ├─ 知乎 HTTP 只读调用
       └─ 原生 Xiaozhi WebSocket + LLM/工具/TTS
```

### 3.1 单 PID

- Python 组合入口在同一 asyncio loop 中启动 Uvicorn `Server.serve()` 和 `WebSocketServer.start()`。
- 一个 PID 可以监听两个 loopback 端口；“一个 PID”不要求把 HTTP 和 WebSocket 强行塞进同一端口。
- Main 通过随机启动 nonce 与结构化 ready 行确认本次进程，不把 Key、Token 或完整环境写入日志。
- 进程退出、超时或端口占用时，Renderer 显示“电台服务未就绪/已退出”，保留重试按钮，不出现无限加载。
- 应用关闭时先发送受控退出，再在超时后只回收记录的精确 PID 树。

### 3.2 前端嵌入

- “电台”放在“探索”与“模型”之间，使用独立图标、`role=tab`、`aria-selected` 和教学锚点。
- RadioPanel 懒加载；未进入标签页不初始化 Three.js，不抢首屏 GPU/内存。
- iframe 只允许本机随机 loopback URL；拒绝导航到其他源、新窗口、下载和权限请求。
- 电台隐藏/切页时保留进程和页面状态；应用退出或用户明确“重启电台”才重建。音频正在播放时切页应暂停或停止，不能后台持续讲话。
- 来源前端继续作为独立构建单元，但由 Electron 根构建脚本统一调用，发布时复制其最终 `dist`，不依赖来源盘符。

### 3.3 配置与 Secret

- 知乎 Access Secret：在电台设置中显示“未配置/已配置/需重启”，点击后打开 Main 原生 PasswordBox；Main 使用 safeStorage 保存，并在启动电台 PID 时通过环境注入。Renderer 和 iframe不得获得回填值。
- 小智模型：独立维护 OpenAI-compatible Base URL、模型名和 API Key；Base URL/模型名可进入普通配置，Key 只进 safeStorage。
- 小智连接 Token：如本机内部仍需，Main 生成随机值并注入，不要求用户复制；不得放入 URL。
- 人设、兴趣、长期记忆是普通本地数据，保存在 `app.getPath('userData')/radio/`；不放工程目录，也不自动注入 Catnip 工程 Agent。
- 配置变更后只重启电台 PID；当前工程、Agent、Explore 和串口任务不受影响。

### 3.4 知乎 HTTP 边界

- 电台允许直接请求 `backend/zhihu.py` 当前白名单中的只读接口。
- 保留 HTTPS 主机/路径白名单、URL 规范化、条数上限、游标上限、并发 2、70 秒前端超时、无自动重试和响应大小限制。
- 不增加发布、删除、关注变更、收藏变更或任意写接口。
- Explore 继续通过官方 `zhihu` Skill/CLI；电台 HTTP 与 Explore CLI 是两个明确隔离的调用面，不互相声称完成对方的验证。
- 真实 API 调用会消耗额度，只有用户主动点击/发送后执行；自动讲解只能使用刚取得的结果，不能二次搜索。

## 4. 计划中的仓库结构

```text
electron/
  radio/
    backend/
    frontend/
    vendor/xiaozhi-server/
    LICENSES/
    run_radio.py
  src/common/radio.ts
  src/main/radio-process.ts
  src/main/radio-credentials.ts
  src/main/radio-ipc.ts
  src/renderer/components/RadioPanel.tsx
  src/renderer/styles/radio.less
  scripts/verify_radio_*.cjs
```

最终目录名可在实现时因现有 TypeScript/build 约束微调，但职责不得漂移。来源代码复制必须使用精确清单，不复制 `.runtime`、`.venv`、`__pycache__`、旧 dist、测试数据库或凭据。

## 5. 施工阶段

### 21a 文档与来源清单

- 固化用户覆盖项、完整功能矩阵、许可证、文件哈希和排除清单。
- 建立恢复点并核对 `origin/liukanshan` 基线。
- 只提交文档，不修改业务源码。

### 21b 后端可移植性与单 PID

- 把后端、必要 vendor 和许可证复制进仓库。
- 先验证随包 Python 3.12 的依赖 wheel 与原生导入；若任一来源依赖不兼容，则使用随包隔离 Python 3.11 runtime，不能要求客户联网 pip install。
- 实现组合入口、动态端口、ready/health、结构化错误和优雅退出。
- 单测证明：一个 PID、两个 loopback listener、父进程退出可回收、端口冲突可恢复、无 Secret 输出。

### 21c Main 生命周期与安全配置

- 实现 `RadioProcessManager`、安全凭据和窄 IPC：状态、启动、停止、重启、配置状态、打开原生凭据窗口。
- 不向 Renderer 返回 Key、Bearer token、子进程完整环境或本地可写路径。
- 验证重复点击只产生一个 PID；崩溃后状态正确；关闭 Electron 后无孤儿 Python。

### 21d 完整前端与新标签页

- 复制完整前端源码与资产，接入 Electron 构建。
- 新增懒加载 RadioPanel 和受限 iframe；完成全部 3D/光驱/电台/人设/帖子/小智交互。
- 设置页改接 Main 安全配置，不能保留可回填的浏览器 Secret。
- 保留来源空结果、分页、来源链接与错误语义；外链由受限系统浏览器打开。

### 21e 模型、工具与 TTS 联调

- 配置一套明确的 OpenAI-compatible 模型；验证真实文本对话和工具调用。
- 验证知乎结果进入小智上下文、同一结果同步到电脑屏幕、Edge TTS 音频可播放/停止。
- 无模型或 TTS 网络失败时，知乎手动查询仍可用，不能把部分失败写成电台整体成功。

### 21f 回归与发布

- Electron typecheck、Main/Renderer build、电台前后端测试、UI 多视口、启动/退出/PID、隐私扫描和许可证检查。
- 更新学院刘看山知识库与教学演示，详细介绍电台、模型、知乎额度和安全边界。
- 完整 `pack:win` 后在隔离 userData 下验收冷启动；最终候选不运行第二次，确保包内无 `.runtime`、数据库、Key、日志或个人数据。

## 6. 验收矩阵

| 验收项 | 必要证据 |
| --- | --- |
| 新标签页 | 真实 Electron 中可访问、顺序正确、键盘/ARIA 可用 |
| 完整 3D UI | 模型加载、旋转/缩放、动作、关节、光驱切换截图与交互断言 |
| 单 PID | Main 状态 PID 与系统进程核对；HTTP/WS 同时可用；退出后 PID 不存在 |
| 知乎查询 | 用户授权后的真实 HTTP 响应；来源可追溯；额度/失败如实显示 |
| 本人数据 | 仅当前 Secret 所属账号；列表/全文/评论/统计按需读取 |
| 人设 | 重启后恢复；不进入工程 Agent Context |
| 小智模型 | 真实 OpenAI-compatible 响应，不拿 Mock 当联调 |
| 工具调用 | 小智真实调用电台知乎工具并讲解实际结果 |
| TTS | 浏览器实际收到音频、播放与停止均可观察 |
| 安全 | Renderer/URL/日志/包无 Secret；只监听 loopback；恶意 Origin/Host 拒绝 |
| 发布 | 新电脑或隔离环境无需 pip/npm 下载即可启动 |

## 7. 当前进展与 Pending

- `RADIO_SOURCE_MIGRATION_IN_PROGRESS`：后端、前端、必要 vendor、许可证与资源已复制到 `electron/radio/`；没有复制来源 `.runtime`、venv、数据库或凭据。功能清单仍需逐项真实联调。
- `RADIO_SINGLE_PID_IMPLEMENTED`：`run_radio.py` 在一个 Python 应用进程中组合 Uvicorn 与可选 Xiaozhi WebSocket；Electron Main 负责按需启动、状态、重启和精确 PID 树回收。开发态 Windows venv 的解释器重定向会显示一个 Python 启动器与其解释器子进程，发布态必须直接使用随包解释器，验收口径仍是一个后端应用进程而非两个服务命令。
- `RADIO_UI_IMPLEMENTED`：“电台”已位于“探索”和“模型”之间，独立前端通过 loopback iframe 完整加载；新增 Electron 嵌入式响应布局和明确的“进入电台工作台/返回硬件工作台”入口。八个顶部入口保持单行，Skill 小站不再换行。
- `RADIO_PYTHON_RUNTIME_PENDING`：开发态已用隔离 Python 3.11 venv 通过；随包 Python 3.12 尚缺完整依赖，最终 runtime 仍未验收。
- `RADIO_NATIVE_SECRET_BRIDGE_PENDING`：来源设置页仍需改接 Main 原生安全输入与 safeStorage；在此完成前不得输入真实知乎 Secret 或把当前实现作为客户发布候选。
- `RADIO_LIVE_MODEL_PENDING`：未配置/调用真实 OpenAI-compatible 模型。
- `RADIO_LIVE_TTS_PENDING`：未完成真实 Edge TTS 播放验证。
- `RADIO_LIVE_ZHIHU_PENDING`：本 Phase 尚未消费真实知乎额度。
- `RADIO_WINDOWS_PACKAGE_PENDING`：尚未生成包含电台的干净 Windows 包。

## 8. 已取得的开发证据（2026-09-15）

- `npm.cmd --prefix electron run typecheck`：通过。
- `npm.cmd --prefix electron run build:main`：通过。
- `npm.cmd --prefix electron/radio/frontend run build`：通过；Three.js 单 chunk 大小警告保留为性能待办。
- `python -m pytest electron/radio/backend/test_radio.py -q`：17 passed，1 条 Starlette 弃用警告。
- 真实 Electron：5173（Renderer）、9230（CDP）、8890（Radio HTTP）分别监听；电台首页返回 HTTP 200。
- UI 几何：仓库、监视器、任务管理器、编辑器、探索、电台、模型、Neil 的 Skill 小站八个入口 `top=18`，无换行；iframe 为 `http://127.0.0.1:8890/?embedded=1`。
- 实际点击“进入电台工作台”后，左侧电脑展示知乎结果区，右侧主机展示工作台/人设/我的帖子/设置；本轮没有填写 Secret、没有调用真实知乎、模型或 TTS。
- 关闭第一轮开发 IDE 后 5173/8890/9230 全部释放，再启动取得新的独立电台 PID，证明生命周期回收路径有效。

本次仍不暂存用户的 `docs/tutorials/`、工程 `.catnip/`、临时截图或开发 venv。
