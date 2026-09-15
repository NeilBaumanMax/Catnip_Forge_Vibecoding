# Current State
Lifecycle: ACTIVE · 唯一当前状态 · 2026-09-15

## Development line
- 当前用户指定 DWIDE；origin/DWIDE；实时 HEAD/工作区/跟踪状态用 Git 查询。
- 产品功能基线 f2449a19；维护进展以当前Task与Git为准。
- 当前版本从 [config/version.json](../../config/version.json) 读取：v2.0.0 / Build 7201。
- 里程碑：Maintenance Mode下的小步热点拆分；产品功能保持既有DWIDE行为。

## Active task
- 无。最近完成任务已归档；下一项工作先建立新的 Task Context。

## Recently completed
- Explore知乎连接状态卡提取为67行无状态组件，原组件1575→1535行；[TASK-EXPLORE-005](../tasks/archive/TASK-EXPLORE-005.md)已归档，connection-ui focus可直接定位，官方CLI/Secret/轮询与自动弹窗仍在原边界。
- Explore只读计划展示提取为67行无状态组件，原组件1613→1575行；[TASK-EXPLORE-004](../tasks/archive/TASK-EXPLORE-004.md)已归档，plan-ui focus可直接定位，artifact文件操作与执行确认仍在原边界。
- Explore灵感候选/诊断假设结果提取为108行无状态组件，原组件1676→1613行；[TASK-EXPLORE-003](../tasks/archive/TASK-EXPLORE-003.md)已归档，results-ui focus直接定位结果/来源展示。
- Explore知识预览/原对话/验证表单提取为106行受控组件，原组件1731→1676行；[TASK-EXPLORE-002](../tasks/archive/TASK-EXPLORE-002.md)已归档，knowledge-ui focus直接定位局部展示/测试。
- Explore历史列表展示提取为69行受控组件，原组件1761→1731行；[TASK-EXPLORE-001](../tasks/archive/TASK-EXPLORE-001.md)已归档，history-ui focus直接定位局部展示/测试。
- BrowserPanel事件合并/任务历史投影提取为49行独立模块，原组件1518→1471行；[TASK-DESKTOP-001](../tasks/archive/TASK-DESKTOP-001.md)已归档，后续局部Context使用desktop-shell的task-history focus。
- 首次可维护性治理：17模块导航/短契约、单一状态与任务历史、构建去重、保守changed计划、4项导入检查与热点增长警报。
- 文档漂移校正：分支、六工作区、固定深蓝主题、包目录、历史边界。
- 产品：工程隔离/独立探索历史/计划材料/确认门禁、双流程工作页、并发模式隔离、历史重命名。
- 最近产品修复：知乎原生安全窗口可见性、150% 缩放布局、Windows 交付目录更名。

## Known regressions / blockers
- 既有架构债务：App.tsx 的启动 DeepSeek/Qwen Key 输入经 preload 的 startup:save-apikey 传输，与 Layer 的 Renderer Secret 边界不一致；四项导入检查不覆盖该数据流，本轮不改业务。下一次安全边界任务单独处理。
- 既有验证债务：electron/tsconfig.json 排除 Renderer；Main/preload typecheck 与 Vite build 不能冒充 TSX 严格类型门禁。
- 历史 Workbench smoke 有 Windows Chromium GPU 退出失败；未在本轮复测，不能被另行 CDP 通过覆盖。
- 当前软件验证状态仅见 [CURRENT_TEST_STATUS](../testing/CURRENT_TEST_STATUS.md)；这里不复制 PASS 表。
- 当前施工无已知阻塞；依赖已安装，不机械 npm install。

## External validation pending
- LIVE_DIAGNOSIS_PENDING：真实知乎＋全网排障未完成验收。
- 新 Windows 用户 CLI 安装授权 → 安全 Secret 输入 → connected 的完整流程待验。
- Skill 小站到既有 Skill Manager 的安全下载安装桥待完成。
- 最新成品完整人工体验/分发验收及代码签名待完成。

## Real hardware validation pending
- REAL_HARDWARE_VALIDATION_PENDING：探索确认后的工程 Agent 修改 → Build → Flash → Serial → 运行/知识验证回写缺完整实机证据。
- 历史找灵感与窗口可见性不能替代上述验收；Serial mock 仅证明软件语义。

## Temporary constraints
- 无 worktree，无擅自委派，不改产品需求或 Runtime Agent 行为。
- 保留用户未跟踪 docs/tutorials/、electron/radio/、hello_world_esp32s3/.catnip/，不纳入提交。
- BrowserPanel纯计算与Explore历史/知识/结果展示提取已完成；后续状态/订阅/跨层与其他热点先另开Task，保持小步验证。
- 历史证据、旧包和已配置凭据不能推断为当前机器实时状态。

## Release status
- 当前定制输出：electron/dist-package/Catnip Forge。
- 最近已记录包：2026-09-12，4,502,227,001 字节；本轮不重打包或复验留存包。
- 发布与真实环境验收只在 RELEASE 任务执行。
