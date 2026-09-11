# 星光工坊 UI v2：Phase 0 现场核验与施工基线

日期：2026-09-11（Asia/Shanghai）
范围：`UI_CORE`；不实施独立 GPU 工作流，不改业务协议、模型接入、Agent/Skill/任务/Hardboard。

## 1. Git、规则与工作树

- 实际工作区：`E:\Agent\vibeide\vibeide`。
- 实际施工分支/基线：`idea_to_production` / `d419a00930c9c5534547521187cc5b5a15da83a4`。
- `origin/idea_to_production` 已以 `git ls-remote` 核对为同一提交。
- 改造前恢复点：`backup/pre-phase-ui-v2-20260911`，指向上述提交；已推送，实施前还需再次只读核对 tag。
- 用户现场未跟踪内容：`docs/design/` 与 `runtime/hardboard/projects/hello_world_esp32s3/.catnip/`。本轮不覆盖、删除、清理、暂存后者；设计包只读作为施工依据。
- 真相顺序采用根 `AGENTS.md`、Product Truth、当前施工接力/主约束、真实代码与本交接包。效果图只提供视觉，不授权新增功能。

## 2. 真实交互、数据和回调映射

判定只使用 `VERIFIED_EXISTING`、`VISUAL_ONLY`、`OUT_OF_SCOPE`、`NEEDS_USER_DECISION`。

| 控件/模块 | 实际源码/状态来源 | 现有回调、门禁与效果 | 本次视觉变化 | 判定 |
| --- | --- | --- | --- | --- |
| 六个工作区导航 | `BrowserPanel.tsx` 的本地 `PanelMode` / `mode`；仓库、监视器、任务、编辑器、探索、Skill 小站 | 各 tab 继续调用同一 `setMode`/现有打开逻辑；Explore host 常驻且 `[hidden]` 必须继续真正隐藏 | 深蓝横向工坊导航、统一图标/选中态，不复制 mode | VERIFIED_EXISTING |
| 当前工程入口 | `BrowserPanel` 的 `activeProject`，由 `App` 的 Project Session 提供 | `onRequestProjectChange` 打开真实工程选择；无工程保持“请选择”；Build/Flash/Explore 仍由工程门禁限制 | 紧凑胶囊与真实项目名 | VERIFIED_EXISTING |
| Agent 历史 | `ChatPanel` 的 `conversations`/`activeConversationId` | 新建、选择、重命名、置顶、删除、忙碌/只读约束均保留 | 深蓝侧栏、轻量行、当前项高亮 | VERIFIED_EXISTING |
| Agent 专业视图 | `ChatPanel` 的 `professionalView` 和 `vibeide.chat.professionalView` | 只控制技术过程展开，不是模型选择器 | 保留语义，仅换胶囊样式 | VERIFIED_EXISTING |
| 模型标签/下拉 | 工程 Agent 主进程读取 DeepSeek；Chat 工具栏不存在模型选择器 | 不新增标签、下拉、连接绿灯；不改 provider/model/endpoint/Secret/执行器 | 无 | OUT_OF_SCOPE |
| 输入与任务动作 | `ChatPanel` 的草稿、附件、Skill refs、`onSend`、`onStop`、queue/guide | 中文 IME、Enter/Shift+Enter、附件上限、只读/忙碌/排队门禁保持 | 抬升输入面、SVG/DOM 图标化、可见 focus | VERIFIED_EXISTING |
| Explore 两入口 | `ExplorePanel` 的 `view`、`enter('idea'|'diagnosis')` | 原回调、当前工程、连接与只分析门禁不变；单一全卡 button | 紫色/青色入口、独立学院呱呱动作、轻玻璃 | VERIFIED_EXISTING |
| Explore 记录与收藏 | 工程 `.catnip/explore` 会话 IPC、本地 Knowledge Store | 恢复/删除、来源打开、收藏、验证、显式选择保持 | 浅色内容区与轻量分隔行 | VERIFIED_EXISTING |
| Context/来源/分析 | `ExplorePanel` 的 gathered/context/selected IDs 与 `ExploreSourceList` | 未选 Context 不进入请求；来源可追溯；结构化分析门禁不变 | 表单、来源、冲突和加载态统一视觉 | VERIFIED_EXISTING |
| 计划/交接/确认 | `startExplorePlan`、工程内 artifact IPC、`confirmExploreExecution` | 第三步只生成计划和交接；第四步重读磁盘；一次性明确确认后才进既有 Agent 队列 | 四阶段导航、材料预览与确认区换皮 | VERIFIED_EXISTING |
| 仓库/Skills/文件 | `WorkspacePanel` 与 `BrowserPanel` 文件树/编辑器 | 刷新、同步、打开、编辑、创建、重命名、回收站、保存等现有回调不变 | 区域内轻量行、减少厚卡片 | VERIFIED_EXISTING |
| 监视器/任务/编辑器 | `BrowserPanel` 的串口、Runtime、任务和 editor state/IPC | Build/Flash/Serial、任务证据、分析入口、保存与未保存状态保持 | 深蓝壳层；日志/Monaco 保持安静深色 | VERIFIED_EXISTING |
| 外观/软件助手/引导 | `App.tsx` 的 light/dark localStorage、可拖动/缩放助手、`CatnipOnboarding` | 助手会话与工程 Agent 分离；原拖动、缩放、教程和 DeepSeek 帮助回调保留 | 新增纯视觉 `aurora` 预设；旧 light/dark 值继续有效；学院呱呱欢迎态 | VERIFIED_EXISTING |
| 概念图额外栏、历史搜索/分组/快捷键、欢迎快捷问题、知识分类/新建、Explore 文件预览、假状态栏 | 当前源码无对应真实状态/IPC/回调 | 不渲染，不造 fixture 或空 `onClick` | 合法内容重排填充空间 | OUT_OF_SCOPE |

## 3. DeepSeek 与安全保真

- 用户确认的主提供方为 DeepSeek；当前 `App.tsx` 首次配置和软件助手明确使用 DeepSeek，主进程 `agent.ts` 从既有安全路径读取 Key。
- `Claude` 名称只出现在执行器/兼容层符号、历史说明或 fallback 文案中，不做全局替换。
- 本轮不读取用户 Key，不修改 provider、model ID、base URL、endpoint、SDK、请求格式、系统提示词、工具协议、执行器或权限。
- 最终以业务源码 diff 和现有安全/Explore 门禁专项复核这一约束。

## 4. 素材核验

| 用途 | 现场结果 | 决定 | 状态 |
| --- | --- | --- | --- |
| 现有品牌/助手 | `catnip-forge.png`、`catnip-assistant.png` | 保留真实入口；允许调整显示方式 | AVAILABLE |
| 找灵感/解问题动作 | 当前分支工作树未部署；本地 `catnip-GUAGUA` Git 对象存在 `explore-idea-guagua.png` / `explore-diagnosis-guagua.png`，原运行截图也显示同角色动作 | 仅复用两张独立无 UI 文本动作图，部署后做实际透明/布局检查 | AVAILABLE_LOCAL_BRANCH |
| 中性角色 | 设计包含 `guagua-neutral.webp`，但设计包整体为用户未跟踪输入 | 不直接从未跟踪包加入首个基线提交；实现阶段优先复用当前合法助手素材 | AVAILABLE_INPUT |
| 侧栏工坊背景 | 当前生产资产无独立成品 | 使用静态 CSS 渐变和低干扰星光，不裁参考整图 | ASSET_PENDING |
| Explore 横幅背景 | 当前生产资产无独立成品 | 使用静态 CSS 工坊光晕/窗景抽象，不裁参考整图 | ASSET_PENDING |

`reference/` 全部禁止进入生产资源。两张入口动作图不包含按钮、标题、模型名或状态，文字继续使用 DOM。

## 5. 技术现状与基线

- React 18.3 / Electron 33 / TypeScript 5.6 / Vite 6 / Less 4；以锁文件安装结果为准。
- 样式链为 `global.less` → `apple.less` → `explore.less`，已有多轮覆盖；本轮新增集中语义令牌并只清理触及范围，不无限追加 `!important`。
- `electron/tsconfig.json` 明确排除 Renderer，且没有 `tsconfig.renderer.json`/`typecheck:renderer`。Phase 4 必须补真实 TSX 类型检查。
- 现有分栏依据容器事件与保存宽度；Explore 使用 container query，必须保留 `min-width: 0`、常驻隐藏规则与局部滚动。
- 主进程存在既有 `disableHardwareAcceleration` / `disable-gpu-compositing`。本轮没有 GPU 独立授权，结论为 `GPU_NOT_IN_CURRENT_EXECUTION_SCOPE`，不修改也不回滚。

改造前命令（均 exit 0）：

1. `npm.cmd --prefix runtime run typecheck`
2. `npm.cmd --prefix electron run typecheck`（只覆盖 Main/Preload）
3. `npm.cmd --prefix electron run build:renderer`（1265 modules；保留既有大 chunk warning）
4. `npm.cmd --prefix electron run verify:explore-ui`

## 6. 已批准施工范围与阶段

- Phase 1：在现有外观入口增加 `aurora`，建立深浅 surface、全局壳层、导航、Agent、分栏、输入和滚动视觉；保留旧 light/dark。
- Phase 2：改造 Explore 横幅、紫青入口、入口动作素材、记录/知识轻列表和完整流程样式。
- Phase 3：统一仓库、监视器、任务、编辑器、工程/首次运行/助手/引导弹层；不改 IPC 与业务数据结构。
- Phase 4：补 Renderer 类型检查，执行专项、Runtime/Electron 构建、布局/桌面 smoke、diff 与资源检查；打包和硬件按项目发布/实机边界单列。

首轮预计修改：`App.tsx`、`ChatPanel.tsx`、`ExplorePanel.tsx`、`BrowserPanel.tsx`、`WorkspacePanel.tsx`、三份 Less、Renderer 类型配置/脚本、两张入口动作资源和相关验证脚本。普通表现拆分按最小必要实施。

真正需要用户另行决定的事项只有 GPU 独立工作流或新增产品行为；当前均不阻塞 UI_CORE。
