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

## 本次目标与当前实现进度

探索 UI → gateway 最小请求/数据接口 → 同一个 Worker 的受限分析任务 → 官方 Skill 搜索 → 经校验的 Idea/Diagnosis + Sources。

用户选结果 → 结构化 Handoff → 同一队列计划模式 → 等待明确确认 → 同一硬件执行链 → 关联真实验证记录 → 用户收藏知识卡更新。

本地知识卡在 Main user-data store；相关候选先交 UI 选择，再形成 Context。相关源码从确定工程和 CMake 候选有限读取；Build/Serial 从既有记录取有限窗口并绑定任务/项目/时间，不复制日志系统。

截至 2026-09-09，探索软件链路已进入 Phase 6 最终验收：第五页签、找灵感/解问题、安全连接、固定知乎/全网搜索桥、共享 Domain、Main JSON 知识 Store、有界 Context、受限分析、结构化 Idea/Diagnosis、Handoff、无工具计划和一次性确认执行门禁均已实现。真实“找灵感”已取得 8 条知乎来源并由 DeepSeek 返回 3 个合法 Idea；真实双搜索排障和实机 Build/Flash/Serial 仍待验收。已验证的 Windows 候选包含官方 Skill，最新安全连接与受限输出修复仍需重新打包。

## 先验证再定型

- A1/A2：调查现有 CLI 的 schema 与权限能力，定义最小请求字段及结果验证。不得用自由文本正则长期解析业务对象；新接口须有无法复用的证据。
- A3：优先 user-data JSON 原子写，无新 DB 依赖；经重启/损坏测试后确认。
- A4/A5：候选文件索引不是全部自动注入许可；上下文有预算、来源、时间与用户选择。
- Explore 和 Plan 不得继承 unrestricted execution；先有运行时拒绝测试，再接 UI。
- 官方 auth/status/setup 在官方 Skill 层；Main 只做必要安全状态映射，不重写 API。不增加知乎 Runtime MCP server。


## 已实现增量

Explore 共享契约位于 `electron/src/common/explore.ts`，由 Main、preload 和 Renderer 类型共同引用。知识卡由 `electron/src/main/explore-knowledge.ts` 保存到 `userData/explore/knowledge.json`；Gateway 注册 IPC，preload 暴露窄方法。Renderer 无文件系统能力，Store 不调用 Agent、Skill 或 Runtime。

官方连接状态由 `electron/src/main/explore-zhihu-status.ts` 通过 vendor `scripts/run.ps1 status` 获取，子进程使用环境白名单；Renderer 不接触 Secret。请求准备位于 `electron/src/main/explore-request.ts`，复用连接状态和 Domain 校验，不直连知乎 API。

连接动作由 Renderer 发出零参数请求，Main 打开固定知乎个人中心并启动独立遮蔽输入窗口；Secret 仅经宿主进程 stdin 交给官方 CLI 并写入系统凭证库。搜索由 Main 的固定桥调用官方 `search zhihu` / `search global`，校验来源后再交给 Worker 的 `explore_analysis`；Renderer 只收到连接状态、结构化结论和来源，不收到 Secret。

Worker 仍复用原单队列。`explore_analysis` 只允许官方 Skill 检索和结构化结果提交，`explore_plan` 不开放工具；用户确认后，Main 只接受与已完成计划和 Handoff 绑定、30 分钟内有效且只能消费一次的执行许可，再提交回原有默认执行队列。知识卡必须由用户主动收藏，历史卡必须经用户选择才进入 Context。
