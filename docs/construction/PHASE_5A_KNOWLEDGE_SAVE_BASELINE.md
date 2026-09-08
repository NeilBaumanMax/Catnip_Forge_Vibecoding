# Phase 5a 主动收藏基线

日期：2026-09-08。起点：`idea_to_production` / `e2abdadf`。备份 `backup/pre-phase-5-20260908` 已推送。

## 目标与边界

- 用户可在 Idea / Diagnosis 的真实来源旁主动点击收藏，并在探索页查看已收藏知识；不自动收藏、不抓取文章镜像。
- 复用现有 Main 本地 Knowledge Store 与 IPC；Renderer 只提交已展示的结构化来源、当前问题摘要和所选工程标识，不接触 Access Secret。
- 收藏成功、重复收藏或失败必须可见；重启持久性由既有 Store 专项保障，本小项补 UI 契约和回归。
- 不自动把收藏内容加入 Context；相关发现与显式选择留 5b。不调用知乎、DeepSeek 或硬件。

验收：专项 UI/IPC 契约、typecheck、Renderer build、知识 Store 与 Explore UI 回归、diff 检查。
