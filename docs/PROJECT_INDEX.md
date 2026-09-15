# Project Index
Lifecycle: ACTIVE · Development Agent 导航（不是产品运行配置）

## 默认入口与唯一来源

| 信息 | Canonical source |
| --- | --- |
| 用户意图/施工安全 | 用户当前指令、[AGENTS](../AGENTS.md) |
| 产品要求 | [Product Truth](product/PRODUCT_REQUIREMENTS.md)，只读相关章节；冷启动一次读全篇 |
| 现在/当前任务指针 | [CURRENT](state/CURRENT.md) |
| 架构/全局不变量 | [原 Layer Contract](construction/LAYER_CONTRACT.md) |
| 普通施工循环 | [WORKFLOW](construction/WORKFLOW.md)，AGENTS 已给日常摘要 |
| 模块定位 | [project-map](../.vibecoding/project-map.yaml)，按 module id 读取条目 |
| 局部上下文 | [Task 模板](tasks/TASK_TEMPLATE.md)、[active](tasks/active/README.md) / [archive](tasks/archive/README.md) |
| 决策与生命周期 | [ADR-0001](decisions/ADR-0001-development-knowledge.md) |
| 验证选择/当前结果 | [Test Strategy](testing/TEST_STRATEGY.md) / [Test Status](testing/CURRENT_TEST_STATUS.md) |
| 历史证据（P3） | [任务 evidence](testing/evidence/README.md)、旧 TEST_METRICS/LOG/施工报告 |
| Frozen / Reference（P4） | browser-workbench contract、[旧文档索引](INDEX.md)；无相关任务不读 |

## 模块导航

- [Desktop Shell](modules/desktop-shell/CONTRACT.md) — `desktop-shell`
- [Project Session](modules/project-session/CONTRACT.md) — `project-session`
- [IPC Boundary](modules/ipc/CONTRACT.md) — `ipc`
- [Chat](modules/chat/CONTRACT.md) — `chat`
- [Explore](modules/explore/CONTRACT.md) — `explore`
- [Browser Workbench (frozen)](modules/browser-workbench/CONTRACT.md) — `browser-workbench`
- [Task Engine](modules/task-engine/CONTRACT.md) — `task-engine`
- [Runtime Agent Integration](modules/runtime-agent/CONTRACT.md) — `runtime-agent`
- [Skill System](modules/skills/CONTRACT.md) — `skills`
- [Runtime MCP & Events](modules/runtime-mcp/CONTRACT.md) — `runtime-mcp`
- [Hardboard](modules/hardboard/CONTRACT.md) — `hardboard`
- [Serial Session](modules/serial/CONTRACT.md) — `serial`
- [Workspace / Editor](modules/workspace-editor/CONTRACT.md) — `workspace-editor`
- [Attachments / Vision](modules/attachments-vision/CONTRACT.md) — `attachments-vision`
- [Onboarding / Software Assistant](modules/onboarding-assistant/CONTRACT.md) — `onboarding-assistant`
- [Packaging / Release](modules/packaging-release/CONTRACT.md) — `packaging-release`
- [Development Infrastructure](modules/dev-infrastructure/CONTRACT.md) — `dev-infrastructure`

优先匹配任务目标；跨层变更才加载依赖 Contract。地图的 code 是入口，不要求把列表里的文件全部读完。
使用 `node scripts/dev/context.cjs explore --focus history-ui` 或 `node scripts/dev/context.cjs serial --focus session` 输出局部 Context；无需通读整份 project-map。
