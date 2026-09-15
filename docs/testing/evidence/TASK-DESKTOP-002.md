# TASK-DESKTOP-002 Evidence
Lifecycle: ARCHIVED · Task evidence · 2026-09-15

## Preflight / scope
- DWIDE；HEAD/origin/DWIDE=`6c14830fbf56ee55bef4009db9a4730980a9625f`；tracking origin/DWIDE。
- 工作区仅用户未跟踪docs/tutorials/、electron/radio/、hello_world_esp32s3/.catnip/；绕开且不暂存。
- backup/pre-phase-task-history-view-20260915已推origin并核hash一致。
- 只提取任务历史表格展示；事件订阅/清理、日志定位、失败分析、Build/Flash均留在父组件。依赖/lock不变，不install。

## Validation
- `verify:task-history-panel` PASS：4组空态、行字段/顺序、failed-only分析、清理反馈/回调用例；严格TSX通过；父文件按`6c14830f...`反向还原完全一致；零Main构建。
- `verify:task-history` PASS：5组Runtime事件窗口、投影、归一化、排序特征用例。
- `context desktop-shell --focus task-history-ui` PASS：5份入口文档；只路由新组件/样式、父组合层/投影只读依赖和2个专项测试。
- Knowledge / architecture / maintainability PASS：17模块、17契约、102个映射产品源文件、4项架构规则；BrowserPanel 1438行且相对本Task基线增长0。
- Dev tooling PASS：21/21，含task-history-ui的changed/context保守路由。
- 首次INTEGRATION FAIL（17.072s）：`verify:explore-entry`只在父组件查找已迁移的`task-analyze-problem`。根因是静态测试定位漂移；改为父组件检查`onAnalyzeFailure`接线、子组件检查failed按钮后专项PASS。
- 第二次INTEGRATION FAIL（28.496s）：`verify:onboarding`的渲染目标集合未包含新组件，因而报告缺`task-results`。把实际渲染的TaskHistoryPanel加入目标源集合后专项PASS；未修改产品行为。
- 最终INTEGRATION PASS：34/34，28.088s；Electron/Runtime typecheck、Main单次构建、Explore、Project Session、Serial、Task Queue、Hardboard、Onboarding、task history projection/panel全部通过。
- Electron专项仍输出既有`os_crypt`/GPU stderr，断言与退出码通过。
- `verify:project-session-ui` NOT RUN：该命令要求已运行的成品CDP页面，验证的是工程冷启动门禁，不是本次任务历史展示；组件严格SSR/投影/完整INTEGRATION作为本轮证据。
- Renderer/Runtime production build、packaging、packaged first run NOT RUN；真实网络/硬件 PENDING。

## Result
- 新增64行纯展示组件；BrowserPanel 1471→1438行（-33，2.2%），相对首次热点基线1518→1438（累计-80，5.3%）。
- 子组件无IPC、状态、事件订阅或清理；父组件继续拥有Runtime事件、清理、日志定位、失败分析/Explore跳转和Build/Flash。
- 无产品需求、Runtime Agent、CSS、依赖或lockfile变化。
