# 当前架构与探索目标架构

核实基线和证据见 [现场报告](PROJECT_STATE_REPORT.md)。本文件明确区分已有与目标；目标不等于已实现。

## 已有

```text
React App / ChatPanel / BrowserPanel
  → preload 白名单 API
  → gateway IPC
  → Worker Orchestrator（单队列、taskId、session context）
  → 现有 Claude Code Agent（stream-json、动态 MCP）
  → Runtime MCP / Hardboard runner
  → ESP-IDF / 共享串口 / EventBus
```

Main 另有 Workbench 受控文件、Skill Manager、会话 JSON、用户目录、共享串口；Skill 源与部署树分开；Runtime 不做 LLM 判断。现有隐藏 browser/workbench/recording 保留但不新增入口。

## 本次目标（尚未实现）

探索 UI → gateway 最小请求/数据接口 → 同一个 Worker 的受限分析任务 → 官方 Skill 搜索 → 经校验的 Idea/Diagnosis + Sources。

用户选结果 → 结构化 Handoff → 同一队列计划模式 → 等待明确确认 → 同一硬件执行链 → 关联真实验证记录 → 用户收藏知识卡更新。

本地知识卡在 Main user-data store；相关候选先交 UI 选择，再形成 Context。相关源码从确定工程和 CMake 候选有限读取；Build/Serial 从既有记录取有限窗口并绑定任务/项目/时间，不复制日志系统。

## 先验证再定型

- A1/A2：调查现有 CLI 的 schema 与权限能力，定义最小请求字段及结果验证。不得用自由文本正则长期解析业务对象；新接口须有无法复用的证据。
- A3：优先 user-data JSON 原子写，无新 DB 依赖；经重启/损坏测试后确认。
- A4/A5：候选文件索引不是全部自动注入许可；上下文有预算、来源、时间与用户选择。
- Explore 和 Plan 不得继承 unrestricted execution；先有运行时拒绝测试，再接 UI。
- 官方 auth/status/setup 在官方 Skill 层；Main 只做必要安全状态映射，不重写 API。不增加知乎 Runtime MCP server。
