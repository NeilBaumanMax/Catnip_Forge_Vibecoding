# Phase 5c 验证反馈基线

日期：2026-09-09。起点：`idea_to_production` / `2ecfc0c5`。

- 用户从已收藏知识主动打开验证表单，明确选择“有效”或“无效”，并填写真实验证说明；系统不得根据分析或计划自动判定。
- 复用既有 `addExploreKnowledgeVerification` IPC/Store，记录当前工程与用户填写的证据引用；空说明、无状态或未知卡片拒绝。
- 更新后立即刷新卡片状态并保留历史验证记录；没有真机证据时 UI 不宣称完成硬件验证。
- 本小项只做软件闭环，不测试 Access Secret、知乎、DeepSeek、Build、Flash 或串口。
