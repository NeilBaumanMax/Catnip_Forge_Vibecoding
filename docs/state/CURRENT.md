# Current State
Lifecycle: ACTIVE · 唯一当前状态 · 2026-09-15

## Development line
- 当前用户指定 DWIDE；origin/DWIDE；实时 HEAD/工作区/跟踪状态用 Git 查询。
- 产品业务基线 f2449a19；文档校正 71d63d5d；本轮施工基线 bf0192da。
- 当前版本从 [config/version.json](../../config/version.json) 读取：v2.0.0 / Build 7201。
- 里程碑：Development Agent 可维护性首次治理，产品功能保持既有 DWIDE 行为。

## Active task
- [TASK-DEV-MAINT-001](../tasks/active/TASK-DEV-MAINT-001.md)。
- 知识导航、分层验证已提交；架构导入检查/增长警报已落地，正在最终核验与归档。

## Recently completed
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
- 四个热点当前不大拆；本轮只建设开发基础设施。
- 历史证据、旧包和已配置凭据不能推断为当前机器实时状态。

## Release status
- 当前定制输出：electron/dist-package/Catnip Forge。
- 最近已记录包：2026-09-12，4,502,227,001 字节；本轮不重打包或复验留存包。
- 发布与真实环境验收只在 RELEASE 任务执行。
