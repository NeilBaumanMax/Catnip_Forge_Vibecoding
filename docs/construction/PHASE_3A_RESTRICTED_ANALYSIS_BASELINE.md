# Phase 3a：结构化结果通道与只分析门禁基线

状态：施工基线，先于业务实现独立提交。适用范围仅为 Phase 3a 的 Worker/Agent 内部受限档位和结构化结果返回；不开放 Explore 表单触发 Agent，不执行真实搜索，不创建 Handoff，不修改工程或触发硬件。

## 目标与不变量

1. 复用现有 `Orchestrator`、单队列、persistent Agent 生命周期和 `Skill` 加载能力；不新增 Agent、队列、任务管理器或 Runtime。
2. 队列项携带由调用边界显式给出的执行档位：现有 Chat 使用默认档位，Explore 使用 `explore_analysis`。不得根据自然语言猜测或由模型自行切换档位。
3. `explore_analysis` 必须在 Agent 启动参数层进入 `plan` 权限模式，移除 `--dangerously-skip-permissions`，启用严格 MCP 配置并只暴露本小项允许的只读工具。该档位不允许 Bash、文件写入工具、浏览器写操作、Runtime MCP、Build、Flash 或任何 Serial 工具。
4. 默认 Chat 行为不得被收紧或改写；不同档位不得复用一个已按另一档位启动的进程。档位切换时必须终止旧进程并按目标档位重建，避免权限泄漏。
5. Explore 最终返回使用版本化、按 mode 区分的 JSON envelope：

   - 灵感：`{ schemaVersion: 1, requestId, mode: "idea", ideas: IdeaResult[] }`，至少一个 Idea。
   - 排障：`{ schemaVersion: 1, requestId, mode: "diagnosis", diagnosis: DiagnosisResult }`。

   `requestId` 必须与当前任务绑定，`mode` 必须与提交请求一致；内部字段继续复用 `common/explore.ts` 的来源、Idea 和 Diagnosis 校验。
6. Worker 只从当前 turn 的最终 `result` 事件解析 envelope。普通文本、Markdown 代码块、工具输出、过期任务结果、错误结果、额外前后缀和 schema 不匹配都不得作为 Explore 结果进入 UI 通道。
7. 受限任务中的普通模型文本和原始非法 payload 不发送到 Renderer；只发送不含原文的安全进度/失败摘要。只有通过运行时校验的对象才允许进入内部 `explore:analysis:result` 通道。本小项不在 preload/Renderer 注册消费方。
8. 即使上游 CLI 配置漂移，Worker 观察到禁用工具调用也必须立即失败并终止当前 Agent；该观察层是纵深防护，不能替代启动参数门禁。

## 最小实现文件范围

允许修改以下文件，超出时先更新并独立提交新的施工基线：

| 文件 | 最小职责 |
| --- | --- |
| `electron/src/common/explore.ts` | 新增版本化 Explore 分析 envelope 类型与严格运行时校验；复用既有 `normalizeIdeaResult` / `normalizeDiagnosisResult`。 |
| `electron/src/main/agent.ts` | 增加显式 Agent 执行档位及可测试的启动参数构造；隔离默认进程和受限进程，受限档位去掉 skip-permissions、使用 plan/严格 MCP/只读工具集合。 |
| `electron/src/main/worker/orchestrator.ts` | 队列项绑定执行档位与 Explore request 元数据；受限文本抑制、禁用工具拒绝、最终结果校验及仅合法对象推送。 |
| `electron/src/main/worker/chat-buffer.ts` | 保留默认文本结果解析；显式读取 CLI JSON schema 模式返回的 `structured_output`，作为 Worker 严格校验的对象输入，不从 Markdown 猜测结构。 |
| `electron/scripts/verify_explore_analysis_gate.cjs` | 离线验证权限参数、档位隔离、拒绝副作用、结果 schema、过期结果和 UI 泄漏反例。 |
| `electron/package.json` | 仅新增上述专项验证脚本入口。 |

明确不修改：`ExplorePanel.tsx`、preload、gateway、`explore-request.ts`、Runtime/Hardboard、官方 `agent/skills/zhihu` vendor、知识 Store、打包配置。现有 Explore 按钮继续只调用 `explore:request:prepare`。

## 必须覆盖的拒绝用例

1. 受限启动参数出现 `--dangerously-skip-permissions`，或缺少 `--permission-mode plan` / `--strict-mcp-config` / 工具白名单时，专项测试失败。
2. `explore_analysis` 观察到 `Write`、`Edit`、`MultiEdit`、`NotebookEdit`、`Bash`、任意 Runtime MCP、`hardboard.idf_*` 或 `hardboard.serial_*` 工具调用时，任务失败、Agent 被终止，结果通道无输出。
3. 默认 Chat 与 Explore 任务在排队、追加要求或进程复用中发生档位混用时拒绝；Explore 追加要求不能降级为默认档位。
4. 空结果、非 JSON、代码围栏 JSON、未知 `schemaVersion`、错误 `requestId`、错误 `mode`、空 Idea 列表、缺少 Diagnosis 假设、非法 URL、未知字段伪装关键状态均拒绝。
5. 已停止任务、已切换任务或旧 Agent 的迟到结果不得写入新任务结果通道。
6. 非法结果的原始文本、工具参数和命令不得经 `chat:message` 或 `explore:analysis:result` 到达 Renderer；错误只包含固定安全代码/摘要。

## 验收命令与证据边界

实现提交前至少执行：

```powershell
npm.cmd --prefix electron run typecheck
npm.cmd --prefix electron run build:main
npm.cmd --prefix electron run verify:explore-analysis-gate
npm.cmd --prefix electron run verify:task-queue
npm.cmd --prefix electron run verify:explore-request
git diff --check
```

专项测试必须是离线测试，不调用 DeepSeek、知乎搜索、Access Secret 或硬件。测试可证明本地策略、参数和结果校验，不得表述为真实模型、官方搜索或实机验收。真实模型仍为 `AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE`，真实搜索仍为 `LIVE_INTEGRATION_PENDING`，硬件仍为 `REAL_HARDWARE_VALIDATION_PENDING`。

## 风险与后续边界

- Claude CLI 的权限参数是本机二进制的运行时能力；实现需对实际 `--help` 中的 `plan`、`--tools`、`--strict-mcp-config` 与 `--json-schema` 契约做离线断言，不能只在提示词写“不要修改”。
- 本小项为保证门禁完整，受限档位不开放通用 Bash，因此不会在此提交中执行官方 Skill 的 CLI 搜索。后续 live 搜索需要在不开放任意 shell 的前提下设计官方 CLI 的窄桥，并另立文档基线。
- 当前 Agent 是 persistent process；进程档位切换和迟到事件是首要竞态风险，测试必须先于 UI 接线覆盖。
- 结构化 schema 校验成功只代表对象可消费，不代表来源真实。没有真实官方搜索证据时不得展示为已验证 Idea/Diagnosis。

## 2026-09-08 范围修订

实现 Review 读取本机 Claude CLI 二进制协议字符串，确认 JSON schema 成功结果具有 `structured_output` 字段；现有 `ChatBuffer` 只读取 `result` 文本，无法可靠承接该对象。故在修改该文件前，将 `electron/src/main/worker/chat-buffer.ts` 加入最小范围，并要求默认 Chat 解析保持回归。该修订仍不开放 UI、搜索、Runtime 或硬件。
