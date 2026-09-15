# Hotspots — first extraction plan
Lifecycle: REFERENCE · 首次分析快照：2026-09-15 / 71d63d5d；下表为当时尺寸，实时拆分进展只在CURRENT及当前Task。
尺寸口径与实时输出：`node scripts/dev/check-maintainability.cjs`。规则只在 [MAINTAINABILITY](../architecture/MAINTAINABILITY.md)。

## Largest source files
| 文件（均在对应 package/src） | 行数 | 当前职责 |
| --- | ---: | --- |
| renderer/components/ExplorePanel.tsx | 1761 | 工作会话/历史、连接、Context、知识、分析、计划/交接、展示 |
| renderer/components/BrowserPanel.tsx | 1518 | 六工作区组合、导航、文件树/编辑页签、Serial、Runtime事件与任务投影 |
| main/worker/orchestrator.ts | 1255 | 队列、CLI生命周期、流事件、Explore策略、确认与项目绑定 |
| renderer/App.tsx | 1093 | 全局布局、工程选择、Chat事件、启动配置、小助手、导航回调 |
| renderer/components/ChatPanel.tsx | 879 | 输入、会话历史、任务状态、附件、消息展示 |
| common/explore.ts | 644 | 公共Domain与验证类型；类型体积不等于业务责任过大 |
| renderer/components/CatnipOnboarding.tsx | 524 | 引导步骤、定位、持久化与可访问性 |
| main/hardboard.ts | 504 | Runtime桥接和硬件上下文 |
| runtime: hardboard/runner.ts | 474 | Build/Flash/Serial执行封装 |
| main/worker/session-store.ts | 470 | 工程对话持久化 |

## ExplorePanel
真实接缝：applyWorkSession/openWorkSession/queueBackgroundSessionUpdate、contextOptions、prepareRequest、beginPlan/confirmExecution、renameWorkSession/returnToExploreHome。
难点是大量 React state/ref 共同表达 session/request/mode 身份；异步结果必须回到原会话，提取 hook 时闭包与订阅时序容易变化。
推荐未来在现有 components/explore 下按需要逐个增加（**下面是计划路径，并非已实现**）：
- components/：先抽历史列表/标题编辑/结果卡纯展示，props 显式传值与操作。
- history/：列表过滤、排序、标题投影；不拥有持久化。
- session/：恢复、创建、删除和后台写入串行化；Main/explore-session 仍是存储边界。
- context/、knowledge/：候选与已选集合、收藏与验证记录；不能自动注入。
- analysis/：请求关联、stage 展示与结果消费。
- handoff/：计划材料编辑与确认 UI；执行授权仍在 Main/Worker。
保护：verify:explore + 新增迟到结果/快速切换/取消/重命名的展示特征测试；受影响 UI 需实际渲染验收。
现有静态测试绑定文件中的字符串；提取时应改为检查真实入口/行为，不能删除断言让它变绿。

## Worker orchestrator
真实接缝：submitQueuedTask/startTask/finishCurrentTask、ensurePersistentAgent/handleParsedChunk、confirmExploreExecution/cleanupConfirmableExplorePlans，以及顶层纯策略函数。
建议未来 worker/task/（队列/任务生命周期）、agent/（进程与流适配）、explore/（结构化结果/计划）、context/（输入装配）、policy/（工具/输出限制）。
顺序：纯策略函数 → 输入归一化 → 进程适配 → 任务状态。前两步也必须保持旧导出与依赖方向。
state、queue、confirmableExplorePlans 的权威持有者先保持唯一；禁止因为抽文件而新增第二个 task manager。
保护：verify:task-queue、verify:explore-core、verify:hardboard、verify:qwen-attachments；先补取消/重试/退出/迟到事件的状态转换测试，再动生命周期。

## BrowserPanel
真实接缝：formatSerialEvent、mergeRuntimeEventWindow/taskHistoryFromEvents、EditorExplorerNodes、各工作区 JSX、导航动作。
推荐先抽纯事件投影和文件树展示，再分 workspace composition / navigation / serial panel / editor panel；不搬 Runtime 状态权威。
Runtime clear 的 generation/seq 与 projectPathMatches 必须一起保护；避免提取后旧轮询回填新工程。
保护：Serial mock、Project Session、Runtime event-clear；另补事件过滤/清空竞态和未保存编辑切换测试。
真实 UI 的六入口、Explore保持挂载、BrowserView bounds、编辑器未保存提示要做可重复渲染验证；现有离线专项不足以证明这些。

## App
真实接缝：clamp/read/store外观工具、工程选择展示、Chat conversation操作/事件订阅、小助手窗口。
先抽无副作用格式化与布局展示；再为 Chat/Project Session hooks 明确 subscribe/unsubscribe 与晚到消息契约。
全局组合保留在App；不要将同一状态复制到多个provider。启动凭证处理的既有债务另开安全边界 Task，不能用普通提取掩盖。
保护：Chat presentation、Project Session、Onboarding；增加项目切换/对话删除/挂载卸载事件测试，再碰生命周期。

## Recommended order / readiness
1. 下一轮**可以开始小范围拆分**：Explore 历史列表展示，或 BrowserPanel 纯事件投影，二选一 Task。
2. 随后处理 App 无副作用布局/工具；业务状态提取前补 Renderer 测试基础与类型门禁。
3. orchestrator 仅先做纯策略/归一化；状态机与进程生命周期的大拆分目前证据不足。
4. 一次只动一个接缝，旧接口可保留薄转发；专项通过后再推进。四文件同时重写不具备验收条件。
