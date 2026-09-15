# TASK-DEV-MAINT-001 Evidence
Lifecycle: ARCHIVED · 2026-09-15 · TASK-DEV-MAINT-001
完整命令中的前缀均在仓库根目录运行；脚本子步骤的 node 命令及 cwd 由 runner 逐项输出，旧别名原文快照在 scripts/dev/fixtures/legacy-scripts.json。
## Baseline
- 71d63d5d，DWIDE / origin/DWIDE一致；独立计划 bf0192da 已推送。
- 10必读/1301行；31个verify中12个重复build:main；Explore核心组三次build。
- 预检完整命令和恢复点见施工基线。新知识目录尚不存在产生rg路径提示；随后逐项建立。PowerShell glob调用改为rg -g，不是产品回归。
## Phase 1
- PASS：17个模块、17份短Contract；Node内置JSON解析YAML兼容子集，逐项检查code/docs/decisions路径、模块依赖和所有test别名均存在。
- PASS：8份旧全局文档移除新增生命周期提示后与bf0192da原文逐字比较（统一CRLF/LF），历史正文完整保留。
- PASS：`git -c core.safecrlf=false diff --check`。本阶段仅知识/规则文件，无产品源码或依赖变化；未重复构建同一产品基线。
- 规则转换：本阶段提交后按新ACTIVE AGENTS/WORKFLOW执行，不再向旧全局日志复制本记录。

## Phase 2 — Verification
- PASS `npm.cmd --prefix electron run verify:integration`：最后阶段版本 18.318s，全部 24 个步骤通过（含 19 个原专项、两项 typecheck、地图、工具反例、一次 Main build）。补充 Review 使 INTEGRATION 覆盖全部已审离线测试；无 module 专项的产品改动会升级并显式列 coverage gap。
- Review 补充：Chat presentation 旧别名虽无 build 前缀，但 require dist/main；已纳入显式 Main 依赖并退出 FAST，新增反例断言。地图的 CDP/Chat 分类同步修正，避免依赖旧产物。第二次 FAST 5.204s PASS 属中间版本，最终计时以下续验收为准。
- PASS `npm.cmd --prefix electron run test:dev-tools`：初版7项，补充旧脚本兼容检查后8项。含真实临时Git staged/unstaged/delete/rename/untracked/base/空diff、未知路径升级、失败/超时停止、地图损坏反例和两例局部Context。没有删改既有测试。
- PASS 原命令顺序执行：`npm.cmd --prefix electron run verify:explore-request` → `npm.cmd --prefix electron run verify:explore-analysis-gate` → `npm.cmd --prefix electron run verify:explore-search-handoff`，PowerShell Stopwatch测得12.512s，3次Main build。
- PASS `npm.cmd --prefix electron run verify:explore-core`：1次Main build，相同3项测试；runner 3.894s，含npm/shell的工具wall time 5.118s。单次开发机测量，未作统计性能承诺；两种计时边界单列。
- PASS `npm.cmd --prefix electron run verify:serial`：1次Main build+共享session mock，runner 1.617s；不是真机。
- `npm.cmd --prefix electron run verify:fast` 实测结果将在最终状态汇总，包含两个typecheck与离线静态/工具检查，不做production build。
- PASS `node scripts/dev/context.cjs explore --focus history-ui`、`node scripts/dev/context.cjs serial --focus session`；仅返回对应Contract/source/tests，条件依赖按需读。
- PASS `npm.cmd --prefix electron run verify:changed -- --plan --files unknown/new.ts`：unknown非空，升级INTEGRATION、有实际选中专项，不执行命令。默认diff同时覆盖暂存/未暂存/未跟踪，--base还检查提交历史。
- 环境stderr（旧与新均出现，专项exit 0）：`os_crypt_win.cc Failed to decrypt (0x8009000B)`，analysis-gate结束时偶发`GPU process exited unexpectedly: exit_code=-1073741515`。这些不被隐藏，也不当真实UI通过；不为消除环境日志改产品代码。
- Review：verify:skills会真实部署，不能进入自动safe清单；CLI status、CDP、packaged/live均显式列为requirements。Electron typecheck实际只检查Main/preload，新文档明确Renderer类型检查缺口。
- Repair decision：无需业务Repair；本阶段只改开发runner/config。依赖manifest仅新增scripts，依赖/lock未变，未执行npm install。
- FAIL 首次 `npm.cmd --prefix electron run verify:fast`：26.170s，其中project-session-ui等目标20.692s后报`Error: packaged project session renderer target not found`，chat-presentation未运行。根因是开发聚合错误把CDP成品测试分类为静态；脚本需9230端口与已打开成品。Repair局限于safe清单/组/测试策略，原测试及产品不变；新增反例确保该命令始终列为环境requirement。

## Phase 3/4 — Guardrails
- PASS `node scripts/dev/check-architecture.cjs`：94 个产品 TS/TSX、4 条导入边界、0 条违规；不是完整架构/安全证明。
- PASS `node --test scripts/dev/guardrails.test.cjs`：4 组，含静态/动态/type/require/re-export/alias越层、合法bridge和注释正例、尺寸阈值。
- PASS `npm.cmd --prefix electron run verify:fast`：加入架构/尺寸检查后 runner 6.004s，命令工具 wall time 7.253s；8 个步骤，开发工具共12组通过，0 build。
- `check:maintainability` 明确报告8个尺寸警报；5个已知热点growth=0，不通过删代码“消警报”。
- 基线债务审查：App.tsx:152/194 与 preload/index.ts:10 的启动 Key 数据流不符合 Renderer Secret 边界；未提取凭据值，未调用保存接口。当前债务只在 CURRENT 维护，检查仅限直接导入规则。
- Review后contract不再复制 tests 分类，直接调用context从地图取唯一推荐；新规则/AST依赖仅用于开发，产品源码/lock/vendor不变。
- 工具执行细节：一次生成patch的JavaScript模板语法错误在执行前退出，未改文件；随后改正模板并成功生成。定位不存在的 startup.ts / verify_task_queue.cjs 时rg报路径不存在，已改用真实 App/preload 与 package 中 verify_agent_task_queue.cjs，不是产品测试失败。

## Final validation / reconciliation
| Command（仓库根） | Status | Result |
| --- | --- | --- |
| npm.cmd --prefix electron run verify:integration | PASS | 26步骤；19个原专项，Main仅1次，runner wall 17.563s；无失败/未执行子步骤 |
| npm.cmd --prefix electron run verify:explore | PASS | 9专项、1次Main，runner wall 10.875s；本次与Renderer构建部分重叠，非隔离性能基准 |
| npm.cmd --prefix runtime run verify:event-clear | PASS | 原命令内含Runtime build；清理隔离临时事件与6进程并发序列回归 |
| npm.cmd --prefix electron run build:renderer | PASS | Vite 2824模块，1m23s；既有>500kB chunk提示，未调整阈值掩盖 |
| npm.cmd --prefix electron run verify:fast | PASS | 最终13组工具测试，8步骤，runner wall 6.266s；含npm/shell工具wall 7.469s；零build |
| npm.cmd --prefix electron run test:dev-tools | PASS | 输出裁剪与全量路由保持相同验证集合的负例加入后13组通过 |
| npm.cmd --prefix electron run verify:changed -- --plan --base 71d63d5d | PASS | 预提交实测4464路径、4393未知，全部参与路由并升级INTEGRATION；用户目录不排除、不写入 |
| node scripts/dev/check-knowledge.cjs | PASS | Task归档后链接、94源码定位、17模块/契约与脚本有效 |
| node scripts/dev/metrics.cjs | PASS | 下表指标可复现；不需要日常读取原历史文件 |
| git -c core.safecrlf=false diff --check | PASS | 空白/补丁检查 |
| git diff 71d63d5d --name-only -- electron/src runtime/src agent config/version.json electron/package-lock.json runtime/package-lock.json | PASS | 空输出，产品源码/vendor/版本/lock无变化 |
| Packaging / packaged first run / restart / manual UI | NOT RUN | 本轮未发布，不借用旧包充当新验收 |
| Renderer strict typecheck | NOT RUN | 既有范围缺口，不能用Vite成功替代 |
| Real network / hardware | PENDING | 原有LIVE_DIAGNOSIS_PENDING / REAL_HARDWARE_VALIDATION_PENDING |

最终输出裁剪的Repair：首次真实--base计划exit 0但打印8912行（用户未跟踪radio目录含大量依赖）。根因是将完整changed/unknown列表直接展示两次。
改为先全量路由，后分别显示最多40项及总数/省略数；--full保留全量。新增反例证明只改变显示、不减测试。未编辑.gitignore、未删除或忽略用户文件。
Task归档后，链接扫描过滤Git索引里尚未暂存删除的旧Task路径，同时检查新archive文件，避免正常归档误报读取不存在文件。
最后核对发现根CLAUDE仍有旧默认流程，原文完整迁入docs/reference/CLAUDE_LEGACY.md，根入口6行只指AGENTS；docs/ARCHITECTURE标REFERENCE。
原根CLAUDE原文与git show 71d63d5d:CLAUDE.md按CRLF/LF统一后逐字相等；一次“同补丁删除并添加同文件”被apply_patch拒绝且未执行，改为普通Update后通过。
除已记录首轮FAST分类失败外，无产品回归Repair；所有后续修改局限于开发工具/知识/记录。

## Before / after measurements
| 指标 | Before | After |
| --- | --- | --- |
| Always Read（冷启动） | 10文件 / 1301行 | 4文件 / 229行；历史0默认读取 |
| 加新Task模板与1个目标Contract的示例预算 | 原必读之外仍需自行定位 | 6文件 / 303行，较原1301行约少76.7%；真实Task长度按任务决定 |
| PROJECT_INDEX / CURRENT | 不存在 | 42 / 46行；地图由CLI按模块读取，不计入默认全文 |
| 历史全局LOG/DEV_PROGRESS/TEST_METRICS | 普通施工重复追加/默认读 | SUPERSEDED；同一Task归archive、同一evidence保存完整结果 |
| Explore核心三项Main构建 | 3 | 1；旧命令12.512s，聚合runner3.894s（计时边界见Phase2） |
| FAST / 完整Explore模块 | 无对应聚合入口 | 6.266s / 10.875s runner wall；非多次统计benchmark |
| 普通小任务production build | 全量基线包含 | 移到RELEASE；本轮治理仅最终一次Renderer/Runtime build |
| Project Map / Module Contracts / AST规则 | 0 / 0 / 0 | 17 / 17 / 4；覆盖94个产品TS/TSX |
| 五个热点 | 1761 /1518 /1255 /1093 /879行 | 完全相同；5个growth guardrails，未拆源码 |
| 新依赖 / 产品源文件变更 | — | 0 / 0 |

行数按基线同口径；6文件包含53行模板+21行目标Contract，最终4份入口合计229行。不是把相关源代码阅读成本算成零。

## Context simulation A — 修改 Explore 历史列表 UI
- PASS `node scripts/dev/context.cjs explore --focus history-ui`；唯一目标explore。Always Read是AGENTS、Product Truth、PROJECT_INDEX、CURRENT；再建Task Context并读docs/modules/explore/CONTRACT.md。
- 本例Product Truth相关部分：探索入口/历史/工程隔离；无架构变更无需读ADR，接口变更才按地图加载project-session/ipc契约。
- 写范围只选electron/src/renderer/components/ExplorePanel.tsx的history展示与electron/src/renderer/styles/explore.less。定位sessionTitle、workSessions、renameWorkSession、returnToExploreHome。
- 类型只读electron/src/common/project-session.ts；持久化问题才局部读electron/src/main/explore-session.ts。无需读Serial、Hardboard、Skill vendor、Worker生命周期或历史测试日志。
- 推荐命令：`npm.cmd --prefix electron run verify:fast`、`npm.cmd --prefix electron run verify:explore-session`（旧单项自build一次）；触及分析/确认流则`npm.cmd --prefix electron run verify:explore`。补实际列表渲染/重命名视觉验收，静态测试不能证明布局。
- 验收与不变量：历史入口/模式隔离/已有重命名行为保留，不改变Main存储、Context或执行门禁；超过2个源文件先重划Task。

## Context simulation B — 修改 Serial session 行为
- PASS `node scripts/dev/context.cjs serial --focus session`；同4份短入口+Task，目标换为docs/modules/serial/CONTRACT.md，无需Explore契约或历史。
- 本例Product Truth相关部分：硬件执行确认/项目绑定/真实证据；接口变更才读project-session/ipc契约，ADR按实际改变选择。
- 写范围：electron/src/main/serial-monitor-session.ts。只读依赖：serial-monitor-controller.ts、serial-monitor-bridge.ts、runtime/src/hardboard/serial-monitor-client.ts，均在地图列出。
- 定位class SerialMonitorSession、read/wait/clear；推荐`npm.cmd --prefix electron run verify:fast`和`npm.cmd --prefix electron run verify:serial`，主编译一次+共享会话mock。
- 若修改bridge/client协议或工程切换，则升级`npm.cmd --prefix electron run verify:integration`并加对应项目回归；真实串口改变另外做实机，mock不能代替。
- 验收与不变量：共享session所有权、读取/等待/清空语义、事件归属与错误结果保留；不得把本Task扩散为硬件/Explore重写。

两例都通过地图获得独立source/tests范围。大型源码仍需按符号读取；真正降低源码内部认知半径的下一步见HOTSPOTS，未假装本轮已完成大文件解耦。

## Git closure
恢复点均已push origin并ls-remote核hash：
- backup/pre-phase-dev-maintainability-20260915 → 71d63d5d
- backup/pre-phase-knowledge-routing-20260915 → bf0192da
- backup/pre-phase-verification-20260915 → a081f875
- backup/pre-phase-guardrails-20260915 → f287b2a3
- backup/pre-phase-final-reconciliation-20260915 → d6d5857e

已完成并核对的独立提交：bf0192da（先独立基线）、a081f875（知识路由）、f287b2a3（验证去重）、d6d5857e（架构/增长约束）。
最终reconciliation提交包含此归档与有界计划输出修正；其hash不写入自身，按git rev-parse HEAD与git ls-remote --heads origin DWIDE动态核对。
各阶段完整Git命令格式：`git -c core.safecrlf=false add -- <当次已逐项审查文件>` → `git diff --cached --check` → `git diff --cached --stat`/实际diff Review → `git commit -m <阶段说明>` → `git push origin DWIDE` → `git rev-parse HEAD` → `git ls-remote --heads origin DWIDE`。
未stage docs/tutorials、electron/radio、hello_world_esp32s3/.catnip；不worktree/stash/reset/clean/force-push，不推main，不重新安装依赖。
