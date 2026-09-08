# Phase 4a 有界 Context 收集基线

日期：2026-09-08。起点：`idea_to_production` / `c0ca685f1460c7c5c539042d93bcc2d9ada1bfa0`。Phase 4 备份 `backup/pre-phase-4-20260908` 已创建并推送到同一提交。

## 目标

为“解问题”从当前已选 Hardboard 工程生成可见、可取消的最小 Context 候选：工程、target、相关源码、最近 Build/Flash 事件、当前共享串口片段。找灵感继续只自动携带工程与硬件约束。

## 程序边界

- Main 只接受一个工程引用；相对引用必须是 `hardboard/projects/<name>`，绝对路径必须位于官方 Hardboard projects 根内。拒绝越界、缺失、非目录和无顶层 `CMakeLists.txt`。
- 排除 `.git`、`build`、`node_modules`、`managed_components`、`dist*`；目录深度不超过 5，源码候选不超过 6 个，单文件读取不超过 8 KiB，总源码正文不超过 32 KiB。
- Runtime 只读取既有最近事件接口，再按规范化 projectDir 和最近 24 小时过滤；最多 40 条、摘要最多 12 KiB。串口只读取共享会话最近 40 条，摘要最多 8 KiB，并明确端口和时间，不能冒充属于当前工程。
- Renderer 只收到摘要候选并显示勾选项；Main 在 prepare 时仍剔除 `selected=false`。不返回任意文件读取能力，不新增第二套状态或任务系统。
- 本闭环不调用知乎、DeepSeek，不配置 Secret，不修改文件，不执行 Build、Flash、Serial 写入或硬件动作。真实知乎验收继续记 `LIVE_INTEGRATION_PENDING`，实机继续记 `REAL_HARDWARE_VALIDATION_PENDING`。

## 最小修改范围

- `electron/src/common/explore.ts`
- `electron/src/main/explore-context.ts`、`gateway.ts`
- `electron/src/preload/index.ts`、`electron/src/renderer/types/index.ts`
- `electron/src/renderer/components/ExplorePanel.tsx`
- `electron/scripts/verify_explore_context.cjs`、`electron/package.json`

## 验收

专项测试覆盖合法工程、路径越界、排除目录、深度/文件数/字节上限、项目与时间过滤、串口上限、Renderer 取消后不进入 Request；随后运行 Electron typecheck、Main/Renderer build、Explore Request/UI 与 task queue 回归、`git diff --check`。mock 只证明软件边界，不冒充真实事件、串口或硬件。
