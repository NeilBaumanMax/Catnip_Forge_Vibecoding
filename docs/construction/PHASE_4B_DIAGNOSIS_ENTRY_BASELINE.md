# Phase 4b 诊断入口基线

日期：2026-09-08。起点：`idea_to_production` / `759c57de2660b84de1ed98cb377331c2f043697b`。

## 目标与边界

- 监视器提供“分析串口问题”，失败的 Build / Flash 任务提供“分析这个问题”。
- 点击后只切换到既有“探索 → 解问题”，预填可编辑的问题描述，并沿用 Phase 4a 有界 Context 收集；不新建 Agent、任务系统或数据通道。
- 串口入口只说明端口、运行状态和用户当前可见片段，不声称片段属于所选工程；失败任务入口只携带任务类型、工程、端口、退出码和对应事件摘要。
- 本闭环不调用知乎、不配置或测试 Access Secret，不修改工程文件，也不执行 Build、Flash、串口写入或其他硬件动作。

## 最小修改与验收

- 修改 `BrowserPanel.tsx`、`ExplorePanel.tsx` 和必要样式；增加一个只检查入口、预填与只分析边界的专项脚本。
- 运行专项检查、Electron typecheck、Renderer build、Explore UI 回归和 `git diff --check`。真实知乎与实机验收分别继续记 `LIVE_INTEGRATION_PENDING`、`REAL_HARDWARE_VALIDATION_PENDING`。
