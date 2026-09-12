# Phase 17：Renderer 启动与资源性能

状态：2026-09-13 源码实现与相关自动化回归完成。用户确认评估可行后直接施工；本阶段只优化既有桌面界面的加载与显示，不改变产品功能、数据边界或硬件流程。

## 1. 现场结论

- 生产版 Renderer 已由 Vite 构建为带内容哈希的本地 JS/CSS，并由 Electron `loadFile` 读取；不存在每次联网获取 CSS/JS 的问题。开发版 `ELECTRON_DEV=1` 才连接本机 Vite 服务并实时编译/HMR。
- 当前生产构建主 JS 约 4.2 MB，Vite 已报告大 chunk；`BrowserPanel` 静态导入 Monaco 编辑器、Explore 和模型工作区，使未打开的模块也参与首屏解析。
- Renderer 图片约 16 MB，其中多张 1–1.8 MB PNG。RGB 场景图无需透明度，适合 JPEG；带透明边缘的学院呱呱和图标不能直接转 JPEG，适合 WebP 或保留 PNG。
- 既有启动动画期间，主窗口已在后台加载，但 `did-finish-load` / `ready-to-show` 不等于 React 首屏和关键图片已经完成解码，仍可能在显示后出现卡顿。

因此，不复制一套 JS/CSS 到 userData，也不建立自定义永久缓存。那会重复已有本地资源、增加失效与完整性风险，不能消除 JavaScript 解析或图片解码。实际施工采用“构建期本地分块 + 首屏受控预热 + 图片按内容压缩”。

## 2. 范围

### 17a 文档与基线

- 动态核对 `model-ccswitch` 与 `origin/model-ccswitch`。
- 建立并远端核对 `backup/pre-phase-17-20260913`。
- 记录压缩前图片字节、构建 chunk 和现有启动时序。

### 17b 构建期分块

- 使用 `React.lazy` / 动态 import 拆分非首屏工作区，至少隔离 Monaco 编辑器和模型中心。
- Explore 是正常启动默认页，保持首屏可用；其仅在后续步骤显示的工作区大图不应抢占首屏解码。
- 保持既有状态保存、工作区切换、测试模式与错误可见性，不新增第二套路由或状态系统。

### 17c 图片优化

- 无透明度的场景/背景图转换为 JPEG，使用视觉可接受的质量参数，并更新引用。
- 有透明度的角色/UI 图转换为 WebP；小图或打包图标在收益不足、打包契约要求 PNG 时保留 PNG。
- 不改变像素尺寸和构图；不把透明素材铺白底；构建后比较总字节并执行界面截图/布局回归。

### 17d 启动动画预热

- Main 在 Splash 可见期间继续隐藏加载主窗口。
- Renderer 在首个 React commit 后等待字体与明确列出的首屏图片 `decode()`；完成后通过窄、无参数 IPC 报告 `renderer:interactive`。
- Main 只在 Renderer 可交互信号和既有最短 Splash 时间同时满足后显示主窗口；保留有界超时兜底，防止图片或字体异常导致永久停在启动页。
- 不预加载所有工作区和所有图片，避免把非首屏成本集中到启动阶段。

## 3. 安全与边界

- IPC 不携带 Secret、路径、模型配置或用户内容，只表达当前 Renderer 已完成首屏准备。
- 不修改知乎 vendor、模型调用、Agent/Skill/任务系统、工程 `.catnip` 或硬件行为。
- 不使用 Service Worker、远程 CDN 或 userData 资源副本；发布资源继续来自打包目录和 Vite 内容哈希。
- 启动兜底必须可测试；不得因一张图片解码失败阻止进入软件。

## 4. 验收

| 门禁 | 通过条件 |
| --- | --- |
| 图片字节 | Renderer 大图总字节显著下降；透明/不透明格式选择符合 alpha 事实 |
| Renderer build | 构建通过；Monaco/模型等非首屏代码形成独立 chunk，入口主 chunk 小于基线 |
| 启动协议 | 首屏预热后发送一次 readiness；Main 有最短时长和超时兜底 |
| UI 回归 | Explore、模型、编辑器、Chat、150%/紧凑视口的既有专项通过 |
| 安全扫描 | 无 data URL 资源缓存、无 Secret/Key 进入新 IPC、日志或产物 |
| Git | 精确暂存；文档和实现分阶段 Commit/Push；远端提交核对一致 |

Windows 完整重新打包和用户肉眼流畅度属于阶段末证据；若本轮只完成源码构建，不得写成发布包或真实设备验收完成。

## 5. 实施结果

- 12 张主界面大图由 16,612,583 bytes 降为 2,093,673 bytes，减少 14,518,910 bytes（87.4%）。5 类 RGB 场景使用 JPEG；角色、应用图和任务空态使用带 alpha 的 WebP；构图与像素尺寸未改。
- 生产入口 JS 从基线约 4.2 MB 降为 347,441 bytes。Monaco `CodeEditor` 为 3,828,397 bytes，仅进入编辑器时加载；`ModelPanel` 10,158 bytes、`WorkspacePanel` 14,306 bytes 也成为独立 chunk。首屏 CSS 273,791 bytes，编辑器 CSS 146,488 bytes 按需加载。
- Splash 期间隐藏 Renderer 不受后台节流；首个 React commit 后等待字体、可见图片与 Explore 两张关键背景完成解码，最多等待 2.5 秒，再通过无参数 IPC 通知 Main。Main 另有 8 秒兜底，并继续满足既有 5 秒最短动画时长。
- Chromium 合成不再被所有用户全局关闭；现场新进程参数确认 Renderer 不含 `--disable-gpu-compositing`。驱动异常机器可用 `CATNIP_DISABLE_GPU=1` 显式回退。
- 完整 Windows 发布包未重新打包：`NOT VERIFIED`。本轮未调用模型、知乎、硬件或真实 Secret；`REAL_HARDWARE_VALIDATION_PENDING` 保持。
