# 测试度量与证据

## 2026-09-12 — 固定主题 / 150% 缩放矩阵

| 检查 | 结果 |
| --- | --- |
| Electron TypeScript `typecheck` | PASS |
| Explore 静态 UI 契约 | PASS |
| Renderer production build | PASS — 2,824 modules；仅既有大 chunk 警告 |
| Explore live layout UI | PASS；零 Renderer console error |
| 1920x1080 @ 150%（`1280x720`） | PASS — 三段顶栏、Agent 紧凑历史轨道、输入框和 Explore 均无横向裁切 |
| 2560x1440 @ 150%（`1707x960`） | PASS — shell/body/Explore/窗口控制均在视口内 |
| 2560x1600 @ 150%（`1707x1067`） | PASS — shell/body/Explore/窗口控制均在视口内 |

首次失败证据保留：浏览器夹具在 Explore 默认挂载后才注入 `listExploreKnowledge`；修复夹具边界后发现通用深色按钮覆盖禁用态纸飞机；新增几何断言又发现 `1280x720` 阶段导航向标题框外伸出约 10px；最终静态门禁仍匹配旧单行默认页表达式。前三项修复布局根因，最后一项同步为“真实桌面默认探索、浏览器夹具延迟挂载”的明确断言，完整矩阵复测通过。

## 2026-09-11 — Clean Windows package gate

| Command | Result | Evidence |
| --- | --- | --- |
| Clean `npm.cmd --prefix electron run pack:win` | PASS | Deleted the previous `dist-package` directory, then rebuilt Runtime, Main, Renderer, and `win-unpacked` from scratch. |
| `npm.cmd --prefix electron run verify:release` | PASS | v2.0.0 / Build 7201; Node v22.14.0, isolated Python/pyserial 3.5, ESP-IDF v5.4.3, Claude Code 2.1.167; no real DeepSeek/Qwen key. |
| Isolated packaged first run | PASS | Fresh temporary APPDATA reports `firstRun=true`, no API key, startup dialog and Playwright ready; temporary APPDATA and packaged processes were removed afterward. |
| Full packaged-state filename scan | PASS | 41,927 files / 4,502,224,578 bytes; zero `.catnip`, knowledge/favorite/history/session/conversation JSON, logs, events, recordings, or browser-profile matches. |

Artifact: `electron/dist-package/win-unpacked/Catnip Forge.exe`; SHA-256 `F62CAD60A7E94BAD05D4D6CF209F912670C8A652A4DDB35EA5FF611E9A01E226`.

Failure history: the first packaged-first-run attempt found the correct fresh state but failed its legacy `.chat-history-brand img` assertion because normal startup now opens Explore. The gate now accepts the visible 42px workspace brand (while retaining the 26px chat fallback), and the rerun passed. This was a test expectation drift, not a product/package failure.


## 2026-09-11 — Repository workspace gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | PASS | Workbench section and renderer action contracts compile. |
| `npm.cmd --prefix electron run build:main` | PASS | Main workbench directory enumeration compiles. |
| `npm.cmd --prefix electron run build:renderer` | PASS | Production Renderer build succeeds; existing large-chunk warning remains visible. |
| Live desktop CDP at 1124 × 912 | PASS | 2 resources expanded, folder-only rows, `hello_world_esp32s3` present, 2 sync actions, 2 exact `打开目录` labels, 4 Skill filters, refresh click preserves directory data. |
| `npm.cmd --prefix electron run smoke:workbench` | FAIL (environment) | First attempt met an occupied 9230 port while the review app was open; the isolated retry then failed before assertions because Chromium's GPU process exited with `2147483651`, despite `--disable-gpu`. |

Visual evidence: `electron/.tmp/phase15-pass18-repository-comparison.png`, reference and implementation at 1124 × 912 without scaling. No hardware Build/Flash/Serial was requested; `REAL_HARDWARE_VALIDATION_PENDING` remains unchanged.

## 2026-09-11 — Explore draft lifecycle/rename gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | PASS | New title and return lifecycle state is type-safe. |
| `npm.cmd --prefix electron run verify:explore-ui` | PASS | Static contract requires pristine-draft cleanup, rename UI, and title-preserving autosave. |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | PASS | Untouched entry/back reduces mock sessions from 3 to 2; renamed title survives save, reopen, and return; previous flow and concurrent-mode gates pass; console errors 0. |
| `npm.cmd --prefix electron run build:renderer` | PASS | Production Renderer build succeeds; existing large-chunk warning remains visible. |

## 2026-09-11 — Explore concurrent mode/source gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | PASS | Renderer/Main TypeScript contracts pass after session routing and external URL bridge changes. |
| `npm.cmd --prefix electron run verify:explore-ui` | PASS | Static contract covers request/session routing, highlighted Zhihu Skill activity, deep result tokens, and safe external opening. |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | PASS | Idea remains bound to its background session while Diagnosis stays active; result restores as deep blue; the clicked source URL is exactly `https://www.zhihu.com/question/ui-smoke-idea`; console errors 0. |
| `npm.cmd --prefix electron run build:main` | PASS | Main-process gateway build succeeds. |
| `npm.cmd --prefix electron run build:renderer` | PASS | Production Renderer build succeeds; the existing >500 kB chunk warning remains visible. |
| `git diff --check` | PASS | No whitespace errors; Git reports only the repository's LF→CRLF checkout warning. |

Visual evidence: `electron/.tmp/phase15-pass16-results-comparison.png` at the user's 1565 × 1304 capture size. The layout smoke may emit a best-effort Windows Chromium-profile `EPERM` cleanup warning after passing; exit status remains 0.

## 2026-09-11 — Explore header parity gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | PASS | Idea and Diagnosis render at 1448 × 1086; both return controls and header copy remain contained; draft badges hidden; shared 132px/48px geometry; responsive matrix and handoff flow pass; console errors 0. |
| Same-viewport visual QA | PASS | `electron/.tmp/phase15-pass15-flow-header-parity.png`; Idea above, Diagnosis below, no scaling. |

The transient Chromium profile cleanup can still report a best-effort Windows `EPERM` message after exit; the verification command exits successfully and product checks pass.

统计单位：命令目标，不把 smoke 内 assert 数伪报为测试用例数量。失败尝试保留；未执行不算通过。日期 2026-09-07；基线 f6e20e8e。

## Phase 0

| 命令（仓库根目录，Windows） | 通过 | 失败 | 未验证 | 说明 |
| --- | ---: | ---: | ---: | --- |
| npm.cmd --prefix runtime run typecheck | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix runtime run build | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run typecheck | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run build:main | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run build:renderer | 1 | 0 | 0 | exit 0，55.82s；chunk >500KB 提示，未改配置掩盖 |
| npm.cmd --prefix electron run verify:skills | 1 | 0 | 0 | 12 deployed；包括支持树及显式 refs 契约 |
| npm.cmd --prefix electron run verify:hardboard | 1 | 0 | 0 | 上下文规则，不是真编译 |
| npm.cmd --prefix electron run verify:task-queue | 1 | 0 | 0 | 离线单队列回归 |
| npm.cmd --prefix electron run verify:chat-presentation | 1 | 0 | 0 | 聊天事件解析 |
| npm.cmd --prefix electron run verify:serial-monitor | 1 | 0 | 0 | 共享会话 mock，不触板；内部再次 build:main 不重复计目标 |
| $env:PYTHONUTF8='1'; python -m pytest tests/test_project.py -q | 0 | 1 | 0 | 第一次启动失败：系统 Python 无 pytest |
| $env:PYTHONUTF8='1'; & .\_bundled\python\python.exe -m pytest tests/test_project.py -q | 0 | 1 | 0 | 第二次换已有随包解释器，仍无 pytest；未安装依赖、未跑到4个断言 |
| git diff --check | 1 | 0 | 0 | 基线无改动；文档提交前再查 |
| IDF 环境/版本探针（见下） | 1 | 0 | 0 | v5.4.3；缺 IDF 自身 .git，回读 source version |
| 官方 CLI status/真实搜索 | 0 | 0 | 1 | Phase 1 执行 status；无 Secret 证据 |
| 真实 ESP Build / Flash / Serial | 0 | 0 | 1 | REAL_HARDWARE_VALIDATION_PENDING |
| 本轮 Windows 重打包/冷启动 | 0 | 0 | 1 | Phase 6；旧包不当本轮证据 |

合计：12 个检查目标通过、2 次测试启动失败、3 组待验证。Python 结构测试仍未通过；这属于缺失测试依赖，不能写“全测试通过”。旧 `tests/test_scaffold.py` 未执行，不修复/删除冻结区。

IDF 探针命令：

```powershell
@'
import {getHardboardEnvStatus,buildIdfEnv} from './runtime/dist/hardboard/env.js';
import {execFileSync} from 'node:child_process';
const e=getHardboardEnvStatus();
if(!e.python || !e.idfPy || !e.idfPath) process.exit(1);
console.log(execFileSync(e.python,[e.idfPy,'--version'],{env:buildIdfEnv(e.idfPath,e.idfVersion,undefined,e.python),encoding:'utf8',timeout:30000,windowsHide:true}).trim());
'@ | node --input-type=module -
```

## 后续测试策略

- Phase 1：真实 vendor 文件 hash、标准支持树、@ refs/Worker 指令、旧 skills 回归、官方 status、实际打包 filter。真实 Agent tool invocation 单列，不以 mock 冒充。
- Phase 2：domain 合法/非法对象、持久化/重启/坏文件、IPC 校验、知识拒绝不注入。
- Phase 3：官方搜索/来源、受限分析、结构化失败拒绝、Handoff 计划和确认前零改动；UI 沿用 CDP。
- Phase 4：有限 Context、跨项目/过期记录、取消、双来源冲突、确认/取消/队列竞态、真实硬件证据。
- Phase 5：收藏重启、相关发现选择、有效/无效验证记录关联。
- Phase 6：全部相关回归、无 Secret、Windows package 资源与冷启动、两 Demo。

新增/修复失败历史只追加到本文件或 LOG；修复后不得删除第一次失败。

## Phase 0恢复校验（修复编码后的完整记录）

15文档存在/非空、本地链接、D001–D020、A1–A9、业务无diff：1个检查目标通过。Phase 0累计13通过、2次pytest启动失败、3组待验证。此前该命令因审批服务额度耗尽未执行；用户继续后首次实际执行通过。同一源码baseline未机械重跑npm检查。

## Phase 1源核验

| 命令/检查 | 通过 | 失败 | 未验证 | 说明 |
| --- | ---: | ---: | ---: | --- |
| Python zipfile/hashlib安全解包、工作区与git show :path逐文件bytes对比 | 1 | 0 | 0 | 15文件与原ZIP一致 |
| powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status | 1 | 0 | 0 | exit0，installed=false/request_install_consent；仅无鉴权边界 |
| CLI安装/实际加载与真实搜索 | 0 | 0 | 1 | 等安装授权，真实搜索另需安全凭据 |
| 宿主兼容/support sync/@zhihu | 0 | 0 | 1 | 未实施 |
| 新Skill实际打包/成品运行 | 0 | 0 | 1 | 未执行 |
| 真实硬件闭环 | 0 | 0 | 1 | REAL_HARDWARE_VALIDATION_PENDING |

Phase 1核心检查2通过、0失败、4组未验证。不把CLI未就绪检查通过称为接入完成。

## 文档编码失败历史

第一次文档写入：Python通过PowerShell默认OutputEncoding管道接收中文，出现问号替换。此前文件存在/链接检查未覆盖文字完整性；Get-Content -Encoding UTF8检查DEV_PROGRESS和PHASE_1_ZHIHU_SKILL实际发现失败。根因不是文件读取编码，而是stdin已丢失字符。
修复：显式设置 $OutputEncoding = [System.Text.UTF8Encoding]::new($false)，从已确认事实重写受影响进度/接力/专项文档，按完整证据重建本测试补充记录；LOG原失败条目保留，追加可读纠正。新增检查拒绝连续问号并检查中文正文；完整命令/结果在LOG追加。此项1次失败另记，不混入核心功能2项通过。

2026-09-07 修复复测：当前6份施工文档中文/连续问号/本地链接检查通过；官方15文件工作区与已提交Git对象再次对比ZIP通过。文档编码项累计1次失败、1次修复通过，失败历史保留。

## 2026-09-07 安装小项

| 命令/检查 | 通过 | 失败 | 未验证 | 结果 |
| --- | ---: | ---: | ---: | --- |
| powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/setup.ps1 | 1 | 0 | 0 | installed=true，官方校验下载后安装 |
| powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status | 1 | 0 | 0 | installed=true / compatible=true / update_check verified |
| 对返回binary_path运行 auth set --help；Get-Item核对current和versions文件 | 1 | 0 | 0 | 支持secret-stdin；两exe各6,891,008 bytes；只读 |
| 凭据配置和真实知乎搜索 | 0 | 0 | 1 | 未执行，auth.configured=false |

安装小项3通过、0失败、1组未验证；不覆盖前述首次未就绪、pytest缺失或文档编码失败历史。核心集成、打包和真实硬件仍为原先未验证项目。

## D盘迁移小项

4组通过、0失败、1组未验证：
1. Copy-Item前边界/重解析点检查及复制后3文件Get-FileHash SHA256比对，通过。
2. ZHIHU_CLI_HOME=D:\ZhihuCLI 下原setup.ps1、run.ps1 status通过；复用已有CLI、路径D盘、版本兼容。
3. [Environment]::SetEnvironmentVariable用户级变量写入/回读通过；精确旧目录删除后Test-Path=False。
4. D:\ZhihuCLI\current\zhihu-cli.exe version通过。
未验证：真实凭据与搜索仍待配置；宿主重启后的实际集成不由此推断通过。无业务源码修改。

## Phase 1宿主兼容小闭环

核心最终检查9项通过、2项失败历史、2组外部待验证：

| 检查 | 最终结果 | 边界 |
| --- | --- | --- |
| electron typecheck / build:main | 2通过 | 无Renderer/Runtime改动 |
| verify:skills | 1通过 | 13 deployed；zhihu描述、15文件部署、@引用 |
| verify:zhihu-skill-package | 1通过 | builder过滤器，尚非真实成品 |
| verify:task-queue / verify:hardboard | 2通过 | 旧队列和硬件上下文回归 |
| 3个修改/新增CJS `node --check` | 3通过 | skills/package/release语法 |
| 部署目录官方status与ZIP bytes | 2通过（辅助，不计核心9项） | D盘CLI；无业务请求 |
| 第一次verify:skills | 失败：断言description，进程错误返回0 | 同时定位测试假绿；已修catch |
| 第二次verify:skills | 失败：旧目录Skill缺frontmatter，exit1 | 修复条件过宽；已按原生frontmatter区分 |
| 真实Agent Skill调用 | 2次调用均失败：DeepSeek 402 | init发现zhihu，但未发生tool_use；AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE |
| 真实知乎搜索 | 未验证 | auth.configured=false；LIVE_INTEGRATION_PENDING |

工程过程另有：1次实现锚点失败、1次兼容锚点失败、3次打包文本锚点失败，均在写目标前停止；1次误重试插入重复打包块，Review后精确去重，最终syntax/config/diff检查通过。不得删除这些失败历史。实际Windows包字节验证和冷启动仍未执行。

## 2026-09-07 Phase 2 Domain / Knowledge 第一小闭环

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm --prefix electron run typecheck` | 通过 | Main/preload/common 严格类型 |
| `npm --prefix electron run verify:explore-knowledge` | 通过 | build:main；Domain、5 IPC handlers、保存/重启、发现/选择、验证状态、语法/结构坏文件保护 |
| `npm --prefix electron run build:renderer` | 通过 | 1261 modules；既有 >500KB chunk warning |
| `npm --prefix electron run verify:data-paths` | 通过 | userData 路径回归 |
| `npm --prefix electron run verify:task-queue` | 通过 | 现有 Agent 队列未破坏 |
| `git diff --check` / 新脚本 `node --check` | 通过 | 无 whitespace 错误；脚本语法通过 |

最终统计：5 个功能/回归目标通过，0 失败；真实知乎搜索和真实 Agent Skill 调用 2 项未验证。第一次并行 Renderer 构建仅返回 `transforming...`、没有退出码，不计通过或失败；单独重跑 exit 0。Review 发现的合法 JSON 坏卡片缺口已补测试并修复。


## 2026-09-08 Phase 3 探索入口

| 命令 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm --prefix electron run verify:explore-ui` | 通过 | 五页签、两个入口、Context 取消、安全连接与无副作用文案 |
| `npm --prefix electron run typecheck` | 通过 | ExplorePanel/BrowserPanel 类型 |
| `npm --prefix electron run build:renderer` | 通过 | 1262 modules；既有大 chunk warning |

第一次 UI 契约测试失败 1 次：正则被 JSX `=>` 干扰；修复测试边界后通过。最终统计：3 通过、0 失败；真实搜索、Agent Handoff 和硬件均未验证。


## 2026-09-08 官方连接状态桥

最终 4 项通过、0 失败：typecheck、verify:explore-ui、verify:explore-zhihu-status、build:renderer。首次状态测试因 Electron GPU 崩溃未到脚本；禁用 GPU 后通过。环境白名单首次过窄误报 needs_install，补齐标准 Windows 变量后真实返回 needs_secret、installed=true、compatible=true。

## 2026-09-08 Explore Request 准备边界

| 命令 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm --prefix electron run verify:explore-request` | 通过 | build:main；运行时校验、Context 排除、模式来源策略、IPC 注册 |
| `npm --prefix electron run verify:explore-ui` | 通过 | Main 请求边界与安全连接兜底 |
| `npm --prefix electron run typecheck` | 通过 | common/Main/preload/Renderer 类型 |
| `npm --prefix electron run build:renderer` | 通过 | 1262 modules；既有大 chunk warning |
| `git diff --check` | 通过 | 无 whitespace 错误 |

第一次 `verify:explore-ui` 失败 1 次：动态连接状态替换了固定“需要先连接知乎开放平台”兜底；恢复安全兜底后通过。最终统计：4 组通过、0 组最终失败；真实搜索、Agent 结构化结果与硬件仍未验证。Electron 专项测试的 Windows `os_crypt` 行为是既有警告，进程 exit 0。

## 2026-09-08 施工规范自检与文档漂移修正

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| 必需文档、UTF-8、本地链接与当前状态断言 | 通过 | 13 个必需文件、13 个本地链接；Phase 3/五工作区/架构状态一致 |
| `git diff --check` | 通过 | 无 whitespace 错误；CRLF 提示为仓库行尾转换提醒 |
| 变更范围与 Phase 备份引用 | 通过 | 仅 AGENTS/施工文档；本地 Phase 0–3 备份 hash 与记录一致 |

最终统计：3 个检查目标通过、0 失败。没有业务代码变更，因此未机械重复 Electron/Runtime 构建；DeepSeek、知乎搜索和硬件均未调用。流程审计发现的小闭环文档先行证据缺失属于施工规范偏差，已在 LOG/WORKFLOW/HANDOFF 中保留并加固。

失败历史：用户继续后的第一次复测工具编排因 JavaScript 参数语法错误在任何 shell 命令启动前失败；修正参数后实际执行的 3 个检查目标全部通过。该次记为 1 次测试启动编排失败，不计为产品断言失败。

## 2026-09-08 Phase 3a 结构化结果与只分析门禁

| 命令 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run verify:explore-analysis-gate` | 通过 | 内含 build:main；实际 CLI help 与 structured_output 契约、bare/plan/空 MCP/仅 Skill 白名单、档位隔离、Context 排除、文件读写/Bash/Runtime/硬件拒绝、Idea/Diagnosis/来源 schema、非法/停止后/档位重置后迟到结果 UI 抑制；默认 result 文本回归 |
| `npm.cmd --prefix electron run typecheck` | 通过 | common、Agent、Worker 严格类型 |
| `npm.cmd --prefix electron run build:main` | 通过 | 主进程编译；专项和 request 回归内亦执行，不重复计数 |
| `npm.cmd --prefix electron run verify:task-queue` | 通过 | 默认 Chat 追加/排队/取消竞态回归 |
| `npm.cmd --prefix electron run verify:explore-request` | 通过 | Request 运行时校验、取消 Context 和准备 IPC 回归 |
| `npm.cmd --prefix electron run verify:chat-presentation` | 通过 | ChatBuffer 默认文本/工具事件展示回归，structured_output 扩展未改变旧语义 |
| `node --check electron/scripts/verify_explore_analysis_gate.cjs` / `git diff --check` | 通过 | 辅助语法和 whitespace 检查，不计入核心 6 项 |

最终统计：6 个核心检查目标通过、0 最终失败。首轮专项即通过；Review 在最终复测前发现 requestId 换行注入风险、项目设置/插件隔离不足、结果来源可为空、受限 stderr 直达 Renderer、受限内容进入日志及任意 Read 绕过取消 Context，分别以严格 ID、`--bare`、来源门禁、固定安全摘要、日志抑制和仅 Skill 白名单修复并补反例。Electron 命令仍有既有 Windows `os_crypt`/GPU 退出警告，进程 exit 0。未调用 DeepSeek、知乎搜索、Access Secret 或硬件；真实模型、来源和硬件继续分别标记 pending。

## 2026-09-08 探索知乎能力与 Access Secret 文档修正

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| 当前施工文档 UTF-8 与关键口径断言 | 通过 | HANDOFF/主约束/计划/分层/进度均明确 status-only、搜索未接、无安全凭证入口；LOG 只检查本次新增节 |
| 变更范围 | 通过 | 仅 `docs/construction/*`，未修改 Product Truth、业务源码或 vendor |
| `git diff --check` | 通过 | 仅有仓库既有 LF→CRLF 提示，无 whitespace error |

第一次检查失败：对只追加 `LOG.md` 整文件使用连续问号断言，命中了历史保留的旧编码事故证据。根因是测试范围过宽；收窄为当前状态文档全文及本次日志标题/关键内容后通过。最终 3 个文档检查目标通过、0 最终失败；本轮无业务代码，因此未重复应用构建。未配置 Secret，未调用知乎搜索、DeepSeek 或硬件。

Phase 3b1：`typecheck`、`verify:explore-zhihu-connection`、`verify:explore-ui` 共 3 项通过，0 最终失败。未执行真实凭证配置或业务 API。

Phase 3b2/3c：`verify:explore-search-handoff`、`verify:explore-analysis-gate`、typecheck、build:main、build:renderer、Explore UI、task-queue 最终通过。task-queue 首次暴露未声明档位被误判为受限并已修复；一次用普通 Node 启动 Electron 专项失败属于测试启动命令错误，改用 npm 专项后通过。真实搜索与模型未验证。

## 2026-09-08 DeepSeek 余额恢复复测

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run build:main` | 通过 | 当前主进程源码编译通过 |
| 产品 `explore_plan` 受限档位真实调用 | 通过 | `deepseek-v4-pro`；空工具、空 MCP；合法结构化计划；exit 0；未出现 HTTP 402 |

首次两次试验未形成有效 API 结论：第一次把内联 MCP JSON 当成路径，CLI 在请求前拒绝；第二次烟测输出与产品 plan schema 冲突并超时。纠正为真实 plan schema 后通过。`AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE` 解除；知乎搜索仍为 `LIVE_INTEGRATION_PENDING`，硬件仍为 `REAL_HARDWARE_VALIDATION_PENDING`。
## 2026-09-08 Phase 4a 有界 Context 收集

| 命令 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run verify:explore-context` | 通过 | project/realpath 越界、排除目录、深度/文件/真实读取字节上限、target、同项目 24h Runtime、最新 40 条串口、部分降级、IPC/UI 门禁 |
| `npm.cmd --prefix electron run typecheck` / `build:main` | 通过 | 共享类型、Main、preload |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 1262 modules；保留既有大 chunk warning |
| `verify:explore-ui` / `verify:explore-request` / `verify:task-queue` | 通过 | 取消 Context、请求清洗、旧队列回归 |
| `git diff --check` | 通过 | 无 whitespace error |

首次专项失败：测试把“最多 6 个源码候选”写成“必须正好 6 个”，实际 32 KiB 总上限先触发并正确返回 5 个；修正错误断言后通过。首次 typecheck 启动前另有一次 package.json 字面换行导致 EJSONPARSE，修复编辑错误后 JSON 与 typecheck 通过。未调用知乎、DeepSeek 或硬件。
## 2026-09-08 Phase 4b 监视器/失败任务诊断入口

verify:explore-entry、Electron typecheck、Renderer build、Explore UI 回归和 git diff --check 均通过。Renderer 共转换 1262 modules，只有既有大 chunk warning。Review 修复了手动重开探索时重复载入旧诊断的问题；入口只预填可编辑元数据，原始串口文本不直接塞入问题描述，详细证据仍由可取消 Context 控制。未调用知乎、DeepSeek 或硬件。
## 2026-09-08 Phase 4d 一次性确认执行门禁

verify:explore-search-handoff、Electron typecheck、Main/Renderer build、task queue、Explore analysis gate、Explore UI 和 git diff --check 均通过。专项覆盖显式 confirmed=true、Main 已签发且完成的计划、Handoff 绑定、30 分钟过期、伪造/未完成/错配/重复确认拒绝，以及确认后进入原有 default 队列。未执行真实工程修改、知乎或硬件；实机仍为 REAL_HARDWARE_VALIDATION_PENDING。
## 2026-09-08 Phase 5a 主动收藏

Explore UI 契约、知识 Store 持久化专项、Electron typecheck、Main/Renderer build 和 git diff --check 通过。来源旁收藏必须由用户点击；重复 URL 在当前 UI 显示已收藏；探索首页从既有 Store 展示最近收藏，且明确不会自动加入 Context。未调用知乎、DeepSeek 或硬件。
## 2026-09-09 Phase 5b 相关历史显式选择

用户明确授权：仅在其勾选并点击分析时，可把所选本地收藏的摘要、来源 URL 和验证状态发送给当前 DeepSeek；未选内容和 Access Secret 不发送。Explore UI 契约、知识 Store、Request 清洗、typecheck、Main/Renderer build 和 git diff --check 通过。问题变化会清空旧选择，提交前还会把 ID 限制为当前相关候选并经 Main Store 选择校验。未执行真实 DeepSeek、知乎或硬件调用。

## 2026-09-09 Phase 5c 验证反馈

Explore UI、知识 Store（含空摘要/未知卡片反例）、Electron typecheck、Main/Renderer build 和 git diff --check 均通过。验证必须由用户主动打开表单并选择有效或无效，摘要必填，可保留证据引用；无实机证据时不声称硬件验证完成。未调用 DeepSeek、知乎、Access Secret 或硬件。

## 2026-09-09 Phase 6a Windows 发布候选

首次 `npm.cmd --prefix electron run pack:win` 在 GitHub 下载 Electron 33.4.11 时连接超时；改为复用已安装的同版本 Electron 后，施工执行环境又在大资源并发复制约 60 秒时以状态 -1 回收子进程，旧脚本随后错误尝试给半成品盖章并报 `Invalid binary format`。已修为本地 Electron 优先、builder 非零立即失败，并由自有盖章脚本同时写版本和产品图标；临时 EXE 盖章探针通过。

当前候选用已通过的 Runtime/Main/Renderer 构建、electron-builder 基础包和按原 filter 分组复制完成。`verify:release` 通过：4,453,446,595 字节，Node v22.14.0、隔离 Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；官方知乎 Skill 15 文件逐字节一致，用户 CLI 和真实 DeepSeek/Qwen Key 未入包。发布门禁新增 app.asar 内探索功能标记检查。`verify:first-run`、`verify:version`、`verify:explore-ui` 通过；首启未填写真实 Key，临时 userData 和成品进程已清理。完整单命令 `pack:win` 仍需在无 60 秒子进程限制的终端复核。未调用知乎、DeepSeek 或硬件。

## 2026-09-09 Phase 6b 软件回归

直接复用已完成的 Main 构建运行 8 项回归，全部通过：Explore Request、只分析门禁、搜索/Handoff/一次性确认、有限 Context、知识 Store、原 Agent 队列、Skill Manager（13 deployed）和共享串口会话 mock。mock 只证明软件会话语义，不作为真机证据。未调用知乎、DeepSeek、Access Secret 或硬件；真实知乎来源 Demo 与真实施工/Build/Flash/Serial Demo 继续分别标记 `LIVE_INTEGRATION_PENDING` 和 `REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-09 Phase 6c 真实找灵感

官方 `auth status --verify` 与 `me contents --type all --limit 1` 成功。探索页真实请求连续取得 8 条知乎来源；最终 DeepSeek 返回 3 个合法 Idea，页面显示完成并保留 5 个可点击知乎原始 URL。未调用全网搜索或硬件。

首次失败为内部 `StructuredOutput` 被误判为越权工具；加入仅用于结果提交的白名单后，文件/命令/硬件工具仍保持拒绝。第二次失败为下发 Schema 没有定义 IdeaResult 字段；补齐完整 Schema 后，第三次因模型尝试输出 8 个含长摘要的 Idea 命中 32,002 output token 上限。最终限制为 3 个 Idea、每项 1–2 条来源、摘要 800 字后真实通过。专项 `verify:explore-analysis-gate`、`verify:explore-search-handoff`、typecheck 与 diff check 通过；曾误调用不存在的 `verify:explore-search`，随后改用真实脚本名补跑成功。

## 2026-09-09 Phase 6d 文档漂移与交接检查

对 `ARCHITECTURE.md`、`LAYER_CONTRACT.md`、`CODEX_MASTER_REQUIREMENTS.md`、`CONSTRUCTION_PLAN.md`、`HANDOFF.md`、`DEV_PROGRESS.md` 执行严格 UTF-8 解码、本地 Markdown 链接存在性和当前态过时短语检查，结果 `docs_utf8_links_current_state=PASS`；`git diff --check` 通过。早期未配置 Secret、未接搜索和失败尝试保留为带日期历史证据，不改写成当前事实。本次仅修改施工文档，因此未重复业务构建。

## 2026-09-10 Phase 6e 首次使用连接向导

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 共享类型、Main、preload、Renderer 严格类型 |
| `npm.cmd --prefix electron run build:main` | 通过 | 首轮独立构建及多个专项内复跑均 exit 0 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 1262 modules；保留既有大 chunk warning |
| `verify:explore-zhihu-connection` | 通过 | 固定官方 setup、非 needs_install 不执行、成功转 needs_secret、Main 并发去重、原生 PasswordBox/stdin；注入假状态，不联网安装 |
| `verify:explore-zhihu-status` | 通过 | 真实无副作用 status：connected/installed/compatible；不读取 Secret 内容 |
| `verify:explore-ui` / `verify:explore-request` / `verify:explore-search-handoff` | 通过 | 自动弹窗单次 ref、安装点击授权、请求清洗、固定搜索与一次性确认门禁回归 |
| `git diff --check` | 通过 | 无 whitespace error；LF→CRLF 为仓库行尾提示 |

最终 7 组目标通过、0 最终失败。Review 在首轮通过后补充 Main 单一 in-flight Promise，避免绕过 Renderer disabled 并发启动多个 setup；安装说明改为复用已有步骤样式。未执行真实 setup、凭据配置、搜索、DeepSeek 或硬件。源码完成不替代最新 Windows 包的全新用户安装→Secret→status 实测。

## 2026-09-10 Phase 6f 最新 Windows 候选

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run pack:win` | 通过 | 完整单命令完成 Runtime/Main/Renderer build、electron-builder 与盖章；复用本地 Electron 33.4.11 |
| `npm.cmd --prefix electron run verify:release` | 通过 | 4,464,576,308 字节；Node v22.14.0、Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；DeepSeek/Qwen Key 未入包 |
| `npm.cmd --prefix electron run verify:version` | 通过 | Catnip Forge `1.0.0.7201`，public v1.5.0/build 7201 |
| app.asar Phase 6e 标记检查 | 通过 | Main 含安装 IPC、固定 setup、in-flight 锁；preload 含零参数 IPC；Renderer 含安装按钮、自动状态门禁和不改 PATH 文案 |
| 隔离 APPDATA 启动 + `npm.cmd --prefix electron run verify:first-run` | 通过 | 主窗口、品牌、首启弹层、Skills、Playwright、占位 Key 拒绝均通过；临时进程与目录已清理 |

失败历史：第一次直接运行 `verify:first-run` 未先启动成品，15 秒后报 `packaged main renderer CDP target not found`；根因是该脚本只连接已运行实例，不负责启动。按隔离 APPDATA 启动候选后复测通过。第一次 app.asar 检查错误使用正斜杠内部路径，报目标不存在；先只读列出归档真实反斜杠路径后复测通过。两项均为验收命令错误，不是产品断言失败，历史保留。

最终 5 组候选目标通过、0 最终产品失败、2 次验收命令失败后纠正。未点击安装按钮、未修改或读取现有 Access Secret、未调用搜索/DeepSeek/硬件；因此全新 Windows 用户真实安装→Secret→status 仍待人工验收。

## 2026-09-10 Explore UI Refactor

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix runtime run typecheck` / `build` | 通过 | Runtime 无改动，基线回归 exit 0 |
| `npm.cmd --prefix electron run typecheck` / `build:main` / `build:renderer` | 通过 | 1265 modules；保留既有大 chunk warning |
| `verify:explore-ui` / `verify:explore-entry` | 通过 | 五页签、两入口、功能保留、Evidence/Conflict/Source/Stage/Container/Theme 契约 |
| `verify:explore-context` / `verify:explore-request` | 通过 | 有界收集、可取消、Knowledge 显式选择与 Request 清洗 |
| `verify:explore-knowledge` | 通过 | 持久化、默认不注入、损坏保护、验证记录 |
| `verify:explore-analysis-gate` / `verify:explore-search-handoff` | 通过 | 只分析、只读计划、一次性显式确认与来源约束 |
| `verify:explore-zhihu-status` / `verify:explore-zhihu-connection` | 通过 | connected status；安装授权、原生遮蔽窗口、stdin-only 与 Renderer 隔离 |
| `verify:explore-layout-ui` | 通过 | Headless Renderer DOM：1920/2560/3840、Chat 24/34/45/52%/折叠、Compact/Normal/Wide、Diagnosis/Plan、light/dark、console error 0 |
| `smoke:workbench` | 通过 | 既有工作台 Electron smoke；打开真实仓库文件，不触硬件 |
| `git diff --check` | 通过 | 无 whitespace error；LF→CRLF 仅为工作树提示 |

首次 `verify:explore-layout-ui` 失败于测试 stub 缺 `setBrowserBounds`，导致 Explore 未挂载；补齐 BrowserPanel 所需的无副作用方法后复测通过。最终统计：上述 10 组目标通过、0 最终失败；1 次 smoke 基础设施失败后纠正。未验证真实知乎＋全网 Diagnosis、真实模型/Agent 执行、真实 Build/Flash/Serial、实体 27 寸人工观感或新 Windows 包。

## 2026-09-10 Explore UI 合并验收

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix runtime run typecheck` / `build` | 通过 | 合并后 Runtime 回归 exit 0 |
| `npm.cmd --prefix electron run typecheck` / `build:main` / `build:renderer` | 通过 | Renderer 1265 modules；保留既有 4.1MB chunk warning |
| Explore 10 项专项 | 通过 | Context、Request、Knowledge、Analysis Gate、Search/Handoff、UI、Entry、Zhihu Status/Connection、Layout UI |
| `verify:explore-layout-ui` | 通过 | 8 个视口/分栏场景、三档 Container Query、light/dark、Diagnosis/Plan、console error 0 |
| `smoke:workbench` | 通过 | 打开真实仓库 CMake 文件；未触发硬件 |
| `git diff --check` | 通过 | 合并后无 whitespace error |

合并验收 5 组目标全部通过、0 最终失败。没有执行真实知乎＋全网 Diagnosis、真实 Agent 执行、Windows 重新打包或真实 Build/Flash/Serial；`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 不变。

## 2026-09-10 Explore UI 合并后 Windows 包

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run pack:win` | 通过 | 从 `idea_to_production@8f28ca3d` 完整构建；包 4,464,604,893 字节，EXE 188,969,472 字节 |
| `verify:release` / `verify:version` | 通过 | Node v22.14.0、Python/pyserial 3.5、ESP-IDF v5.4.3、Claude Code 2.1.167；版本 `1.0.0.7201`，真实 Key 未入包 |
| 隔离 APPDATA `verify:first-run` | 通过 | 实际 packaged app 冷启动门禁；测试进程与临时目录已清理 |
| `smoke:chat-ui:packaged` | 通过 | 连接实际 app.asar Renderer，不使用 dev server |
| app.asar Explore/连接标记 | 通过 | Container Query、Diagnosis conflict、Idea plan、安装 IPC 与 Main in-flight 锁存在 |

首次 packaged UI smoke 误连正在运行的开发版 Renderer，因此不能作为包证据；停止 dev server、隔离启动 packaged app 后复测通过。app.asar 检查先后修正模块解析目录、归档内反斜杠路径和根元素 class 假设后通过。未执行代码签名、真实新用户安装、真实搜索或硬件。

## 2026-09-10 Phase 7 工程会话与 Explore 工作保存

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Runtime `typecheck` / `build` | 通过 | Runtime 契约未被工程会话改造破坏 |
| Electron `typecheck` / `build:main` / `build:renderer` | 通过 | Renderer 1265 modules；保留既有约 4.1 MB chunk warning |
| `verify:project-session` / `verify:explore-session` | 通过 | 冷启动 null、显式激活、安全创建、路径逃逸、A/B 隔离、多历史、interrupted 与 Secret 排除 |
| Agent session / task queue 回归 | 通过 | 按工程会话、未归属只读迁移、任务归属与确认门禁 |
| Explore 全专项与布局 smoke | 通过 | 返回首页和切工作区保持；wide/normal/compact、light/dark、console error 0 |
| `smoke:workbench` | 通过 | sandbox 内 GPU/AppData 首次失败；改为隔离 userData 并在允许的 Electron 环境运行后通过 |
| `pack:win` | 通过 | 首次 electron-builder 在复制 4.4 GB extraResources 时被外部回收；脚本改为 builder 生成骨架、Node 分组复制、无 Key 门禁后再 stamp，最终成功 |
| `verify:first-run` | 通过 | 实际打包程序、隔离 userData、无密钥安全窗口；占位 Key 被拒绝 |
| `verify:project-session-ui` | 通过 | `activeProject === null`，3 个候选，用户显式进入 `hello_world_esp32s3` 后显示当前工程 |
| `smoke:chat-ui:packaged` | 通过 | 工程激活后的真实 app.asar Renderer；历史/编辑器交互未被门禁阻断 |
| `verify:release` / `verify:version` | 通过 | 4,464,648,810 字节；`1.0.0.7201`；DeepSeek/Qwen Key 均未入包 |
| `git diff --check` | 通过 | 仅 LF→CRLF 提示，无 whitespace error |

首次打包产物因子进程被回收而不完整，`verify:release` 正确拒绝了包含 NUL 的指南和遗留 `resources/apikey.txt`；该失败产物已被完整重建覆盖，不能作为发布证据。首次打包版首启测试误带 Workbench smoke 环境变量，应用按设计写出结果并主动退出；移除该变量后真实首次启动验收通过。另有两次布局测试误连固定端口残留进程，清理精确 PID 后通过。以上失败均保留为过程证据。

`NOT VERIFIED`：用户在真实成品上的返回/重启/切工程人工复测；真实知乎＋全网 Diagnosis；真实 Agent 改码；真实 Build/Flash/Serial；全新 Windows 用户安装与代码签名。

## 2026-09-10 Phase 8 施工基线

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| Git 动态状态与远端备份 | 通过 | `idea_to_production` local/origin 为 `050ae64d`；`backup/pre-phase-8-20260910` 已推送并由 `ls-remote` 核对同 hash |
| 代码根因审计 | 通过 | 确认 Agent/Explore 仍写 userData、Explore 复用左侧 conversation/chat 通道、stepper 不可切换、无工程内 artifact、来源按钮仅 28px/10px |
| 文档先行范围 | 通过 | Product Truth、D027–D031、主约束、分层、计划、Handoff、测试与独立 Phase 8 基线；无业务源码修改 |

本基线不运行真实搜索、模型、Build、Flash、Serial 或打包。实现专项必须覆盖工程内目录/迁移、Explore 不污染 Agent、四阶段回看、artifact 生成与篡改拒绝、按钮至少 36px 和布局矩阵。

## 2026-09-10 Phase 8 实现与自动回归

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Runtime `typecheck` / `build` | 通过 | Runtime 未因工程内状态与交接改造回归 |
| Electron `typecheck` / `build:main` / `build:renderer` | 通过 | Renderer 1265 modules；保留既有大 chunk warning |
| `verify:project-session` / `verify:session` | 通过 | `.catnip` manifest/路径门禁、A/B 工程对话隔离、切回恢复、旧源保留与原子写入 |
| `verify:task-queue` / Explore 8 项专项 | 通过 | 独立 Explore 消息、请求/Context/Knowledge、受限分析、交接确认与一次性执行门禁 |
| `verify:explore-session` | 通过 | 工程内多历史、独立 conversation、三份 artifact、摘要重读与篡改拒绝 |
| `verify:hardboard` / `verify:serial-monitor` | 通过 | 既有硬件 Context 和共享串口 mock 未回归；不算真机 |
| `verify:explore-layout-ui` | 通过 | 8 个视口/分栏场景；四阶段、artifact 预览、36px 来源按钮、light/dark、console error 0 |
| `git diff --check` | 通过 | 无 whitespace error；仅 LF→CRLF 工作树提示 |

首次失败与修复：TypeScript 首次因对 `unknown` 展开失败，增加对象守卫后通过；Explore session 首次仍断言旧路径，改为验证真实工程 `.catnip`；布局脚本先后缺新 preload stub、模板换行转义和旧第三步确认断言，补齐新契约后通过。`smoke:workbench` 两次因固定 9230 端口被现有进程占用并伴随 Electron GPU 子进程退出，在产品断言前失败；未终止用户进程，保留为环境失败。上表列明的构建与专项最终均通过，Workbench smoke 仍为环境阻塞；未运行真实搜索、真实模型/Agent 改码、真机或重新打包。

## 2026-09-10 Phase 9 清理与 Windows 打包

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| 精确使用记录/Skill 目标复核 | 通过 | 工程记录叶子目录、收藏、旧 session 与四个 Skill 部署副本均不存在；工程注册表和 manifest 保留 |
| Runtime/Electron typecheck/build | 通过 | Runtime 构建、Electron Main/Renderer 构建通过；Renderer 保留既有大 chunk warning |
| `verify:skills` | 通过 | 当前仅 9 个 Skill，四个指定 ID 不存在，旧部署不会复生 |
| `pack:win` | 通过 | 生成 Windows `win-unpacked`，总计 4,464,671,335 字节 |
| `verify:release` / `verify:version` | 通过 | `v1.5.0`、Build 7201、PE `1.0.0.7201`；无 DeepSeek/Qwen Key、四个 Skill 或 `.catnip` 使用状态 |
| `git diff --check` | 通过 | 无 whitespace error；仅 LF→CRLF 工作树提示 |

清理后的聊天、Explore 草稿/交接和收藏不建立备份，符合用户删除授权；四个 Git Skill 源可从 `backup/pre-phase-9-20260910` 恢复。未运行真实搜索、真实 Agent 改码、Build/Flash/Serial 或代码签名。

## 2026-09-10 Phase 7 文档漂移修正与交接

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Git 动态状态 | 通过 | 开工时分支为 `idea_to_production`，local/remote 均为 `c4adf87990840638c89072d6afd4d81ec67a16ae`，工作区干净 |
| 当前态断言 | 通过 | README、INDEX、ARCHITECTURE、DEV_PROGRESS、HANDOFF、PROJECT_STATE_REPORT 均指向 Phase 7 已实现状态 |
| 变更范围 | 通过 | 仅 README 与 Markdown 文档；无 TypeScript、CJS、配置或产品资源修改 |
| 严格 UTF-8 与本地链接 | 通过 | 所有本轮变更文档无 replacement character，本地 Markdown 链接均存在 |
| `git diff --check` | 通过 | 无 whitespace error；仅 Git 的 LF→CRLF 工作树提示 |

首次文档验证额外检查了用户已经运行和配置过的本地 `win-unpacked`，因检测到 `resources/apikey.txt` 而停止。用户随后确认该文件是本人主动配置的本机 API Key，并要求本轮忽略打包、专注文档/开发交接；因此不读取、不删除、不提交该文件，也不把用户配置后的可变目录作为本轮发布包检查对象。该文件位于 Git ignored 的 `electron/dist-package/` 下。

本轮未重复应用构建、真实搜索、Agent 调用或硬件动作；Phase 7 代码和打包验证沿用已记录的 `c4adf879` 证据。`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 不变。

## 2026-09-11 Phase 10–13 v2.0.0 增量

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Runtime/Electron typecheck、Main/Renderer build | 通过 | Phase 13 最终代码；Renderer 仅保留既有大 chunk warning |
| Explore UI / session / knowledge / layout | 通过 | 独立历史、确认后持久化、收藏来源对话快照/删除、可编辑 Handoff 和两入口插画 |
| Onboarding / software assistant 专项 | 通过 | 新手旅程 v7、Skill 小站、学院呱呱知识、输入区与 GitHub 白名单入口 |
| `verify:explore-layout-ui` | 通过 | 8 组场景，Explore 宽度 534–1802px；入口图加载、右侧锚定、文字不遮挡、console error 0 |
| `pack:win` / `verify:release` / `verify:version` | 通过 | v2.0.0 / Build 7201 / PE 2.0.0.7201；4,468,679,868 字节；无 DeepSeek/Qwen Key |

本组未执行真实 Diagnosis、真实 Agent 改码或硬件；继续保留 `LIVE_DIAGNOSIS_PENDING`、`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 Phase 14 文档漂移与交接

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Git / 远端恢复点 | 通过 | 开工时 local/remote `catnip-GUAGUA` 为 `881121f8`；Phase 14 备份 tag 已推送并核对 |
| 严格 UTF-8 / replacement character | 通过 | 17 份本轮文档均以 fatal UTF-8 解码，未发现 U+FFFD |
| 本地 Markdown 链接 | 通过 | 17 份文档中的本地目标均存在 |
| 当前真相断言 | 通过 | `config/version.json` 为 v2.0.0 / 7201，BrowserPanel 为 6 个可见 tab，HANDOFF 含分支、版本、两项 pending 和 Skill Hub 缺口 |
| `git diff --check` | 通过 | 无 whitespace error；仅 LF → CRLF 提示 |

首次联合 Node 检查因 PowerShell 引号解析失败，Node 未运行；改写匹配表达式后通过。仅修改 Markdown，未重复构建或打包。

## 2026-09-11 Phase 15 视觉壳与 Explore 首页

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Electron / Runtime typecheck | 通过 | 当前 Phase 15 源码 |
| Runtime build / Electron Main / Renderer build | 通过 | 图标接入后 Renderer 2819 modules；仅既有大 chunk warning |
| Explore UI / layout / entry | 通过 | 8 场景、1536 × 1024 截图、双入口与四阶段门禁 |
| Chat shell 定向门禁 | 通过 | 4 个快捷项可写入 composer，发送按钮可见 |
| Onboarding UI | 通过 | 24 步旅程与工作区聚焦未回归 |
| `smoke:chat-ui` | 环境阻塞 | 用户打开的旧成品占用 CDP 9230，首次在 `skill-options-ready` 超时；未终止用户进程 |
| `smoke:composer-geometry` / `verify:project-session-ui` | 未重试 | 同样依赖被占用的固定 CDP 9230；由当前 Renderer 定向门禁覆盖本轮变更 |
| 同视口视觉 QA | 通过 | 并排修复 Hero 占高与下方布局后 `design-qa.md` 为 `passed` |
| `git diff --check` | 通过 | 无 whitespace error，仅 LF → CRLF 提示 |

首次视觉评审发现 Hero 占高和当前工程落到首屏以下，修复后重新生成同视口对照图。Headless Chromium 仍有 Windows 临时 profile `EPERM` 清理提示，退出码为 0。未运行真实搜索、新包或硬件验收；`REAL_HARDWARE_VALIDATION_PENDING`不变。

图标接入后 `verify:explore-ui` 首次因旧 DOM 正则不接受按钮中新增的图标和 `<span>` 而失败；产品语义与交互未失效。更新为同时验证 `Compass` 与“探索”文案后复测通过。

## 2026-09-11 Phase 15 第二轮高保真收敛

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | Portal 顶部栏、Chat/Explore DOM 与图标类型正确 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 两张 v2 位图进入构建；仅既有大 chunk warning |
| `verify:explore-ui` | 通过 | 双入口与四阶段静态契约未回归 |
| `verify:explore-layout-ui` | 通过 | 4 个快捷卡/建议、全局导航几何、8 组入口布局与流程，console error 0 |
| 同视口视觉 QA | 通过 | `phase15-v2-comparison.png`；P0/P1/P2 清零 |

首次失败依次为全局品牌测试定位过时、入口插画误中正文选择器、49% 前约 5px 文图重叠，以及新增导航门禁发现设置按钮换行；均修正根因并复测。临时 Chromium profile 仍可能提示 `EPERM`，退出码 0。

## 2026-09-11 Phase 15 第三轮无边框窗口与 16:9 收敛

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| Electron typecheck / Main build | 通过 | 无边框 BrowserWindow、三个最小窗口 IPC 与 Preload 类型正确 |
| Electron Renderer build | 通过 | 顶栏 12 列最终锁、增高入口与摘要卡片样式进入构建 |
| `verify:explore-ui` / `verify:explore-entry` / `verify:onboarding-ui` | 通过 | Explore 产品边界、双入口和新手旅程未回归 |
| `verify:explore-layout-ui` | 通过 | 1536 标签组约 48% 宽、3 个窗口按钮可见；1573 × 1276 入口 438px、摘要区 558px；8 组响应式与四阶段流程通过，console error 0 |
| 同视口视觉 QA | 通过 | `phase15-v3-final-comparison.png`；P0/P1/P2 清零 |
| `git diff --check` | 通过 | 无 whitespace error，仅 LF → CRLF 工作树提示 |

首次布局失败是目标导航顶部阈值比实际 6.5px 严 0.5px，按 8px 壳层真实边界修正；随后用户截图暴露旧九列 cascade lock 把第 12 列窗口控制挤出视口，追加最终 12 列锁并复测通过。未执行真实搜索、新包或硬件动作，`REAL_HARDWARE_VALIDATION_PENDING`。

## 2026-09-11 Phase 15 第四轮三段式顶栏

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 三容器 DOM、图标导入和助手文案类型正确 |
| `npm.cmd --prefix electron run build:main` | 通过 | Main 保持无边框窗口与图标路径 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅保留既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 新增品牌图标、三容器结构和完整任务管理器静态契约 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 三框分离、任务文字完整、窗口控制可见；1536/1573/2048 截图、8 组响应式、四阶段流程、console error 0 |
| `npm.cmd --prefix electron run verify:onboarding-ui` | 通过 | 24 步旅程和六工作区交互未回归 |
| `npm.cmd --prefix electron run verify:software-assistant-ui` | 通过 | 真实 Electron CDP；链接为 `Neil Bauman · GitHub` 且不含“作者” |
| ICO 解码检查 | 通过 | `electron/assets/icon.ico` 可由 System.Drawing 解码为 256 × 256 |
| 同宽视觉 QA | 通过 | `phase15-v4-shell-comparison.png`；2048px 顶栏源图与实现聚焦比较，P0/P1/P2 清零 |

首次布局复测暴露旧 Pass 3 十二列规则仍在文件末尾覆盖三容器网格，导致中部框被压到 117px、右侧内容错位；将三列 lock 移至最终层后修复。旧门禁随后以内部按钮顶部比较三个独立框，产生 9px 伪失败；更新为框表面顶边和间距检查。首次助手 CDP 检查因真实 Electron 尚未启动而找不到 9230，启动后复测通过。一次 Renderer 构建命令因输入错误返回 npm unknown command，使用文档规定命令立即通过，不属于源码失败。真实桌面启动时已有 Renderer 占用 5173，新 Main 仍成功连接现有开发服务并开放 9230；未终止用户已有进程。

## 2026-09-11 Phase 15 第五轮顶栏材质纠偏

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 三容器类名与材质回归脚本类型未回归 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | Explore 双入口与四阶段产品契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 外层透明且无 border/filter/backdrop-filter；3 个蓝色半透明子表面；响应式、四阶段流程与 console error 0 |
| 同宽视觉 QA | 通过 | `phase15-v6-shell-comparison.png`；旧全宽暗条已消失，框间星空壁纸可见 |
| `git diff --check` | 通过 | 无 whitespace error，仅工作树 LF → CRLF 提示 |

首次新增材质门禁因 RGBA alpha 已是 0–1 小数却被再次除以 100，误报三个蓝色表面为 0；修正检测逻辑后复测为 3。该失败属于测试实现错误，计算样式证据为三个 `rgba(9, 39, 98, 0.76)` 表面。

## 2026-09-11 Phase 15 第六轮 Explore 可读性

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 独立连接区 DOM 与现有连接状态类型正确 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 知乎安全边界、双入口和四阶段流程静态契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 连接卡位于左半区；入口桌面 500px/窄屏 410px；标题 ≥31px、说明 ≥15px；8 组响应式和 console error 0 |
| 归一化视觉 QA | 通过 | `phase15-v7-explore-comparison.png`；源图 2559 × 1381 归一化为 2048 × 1105 后与实现并排 |

本轮专项首次即通过；未执行真实知乎请求、Build/Flash/Serial 或实机验证。

## 2026-09-11 Phase 15 第七/八轮启动与工作区细节

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | Browser/Chat/Explore DOM、Lucide Paperclip/Send 与样式类型正确 |
| `npm.cmd --prefix electron run build:main` | 通过 | 启动页仍由既有 Main 启动时间线加载 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅既有大 chunk warning |
| `npm.cmd --prefix electron run verify:chat-presentation` | 通过 | Agent 消息/工具展示契约未回归 |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 双入口、知乎安全边界和四阶段门禁未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 品牌、Composer、历史图、双滚动槽、长路径、Skill 单行和 8 组响应式通过；console error 0 |
| `npm.cmd --prefix electron run verify:splash-ui` | 通过 | 760 × 470；新图标和学院呱呱加载，13px 蓝色进度轨，进度 63%，无 overflow |
| `git diff --check` | 通过 | 无 whitespace error，仅 LF → CRLF 提示 |

布局专项首次新增双滚动断言时 fixture 的历史列表为空，改用临时样式节点验证真实计算样式；Skill 单行首次以顶边判断不同高度控件而误报，改为视觉中心线对齐。两次均为测试实现问题。未执行真实搜索、Windows 打包或真机动作，`REAL_HARDWARE_VALIDATION_PENDING` 保留。

## 2026-09-11 Phase 15 第九轮历史插画满幅纠偏

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 样式与布局门禁改动未引入类型错误 |
| `npm.cmd --prefix electron run build:main` | 通过 | Main 无回归 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅既有大 chunk warning |
| `npm.cmd --prefix electron run verify:chat-presentation` | 通过 | Agent 文本与工具块展示契约未回归 |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 既有 Explore 入口、证据、阶段与主题契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 背景挂载于整个历史面板、主列不重复挂图、112% 等比覆盖、功能轨透图；8 组响应式、四阶段流程、console error 0 |
| 聚焦视觉 QA | 通过 | `phase15-pass9-chat-comparison.png`；功能轨空带消失，角色比例从首轮 128% 收敛到 112% |

首次并行启动布局专项后，后续两次重试因测试 Vite 未监听 5174 超时；单独启动同一临时 Vite 后继续。新增计算样式断言首次把正则写入模板字符串，转义后在浏览器侧成为非法正则；改为解析完整 RGBA 数组。第二次因门禁在设置主题前运行，仅 dark 选择器未命中；将历史背景契约应用于组件本身后通过。这些均为验证环境/测试实现问题，不是产品交互失败。

## 2026-09-11 Phase 15 第十轮历史接缝消除

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | CSS 与门禁脚本改动未引入类型错误 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅既有大 chunk warning |
| `npm.cmd --prefix electron run verify:chat-presentation` | 通过 | Chat 展示契约未回归 |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | Explore 静态产品契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 功能轨右边框 0、无阴影、横向渐隐存在；历史满幅、8 组响应式、四阶段流程和 console error 0 |
| 聚焦视觉 QA | 通过 | `phase15-pass10-chat-seam-comparison.png`；源图中的贯穿硬线已消除，插画连续且导航仍可读 |

本轮专项首次通过；未修改 Agent、Explore 数据或硬件路径，未执行真实搜索、Windows 打包或实机动作。

## 2026-09-11 Phase 15 第十一轮知乎状态紧凑化

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 样式与布局门禁改动未引入类型错误 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2820 modules；仅保留既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 知乎安全连接与 Explore 四阶段产品契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 已连接卡高度 48–58px、完全位于 Hero 内；8 组响应式、双滚动槽、四阶段流程和 console error 0 |
| 聚焦视觉 QA | 通过 | `phase15-pass11-zhihu-status-comparison.png`；状态、按钮与下边界均完整可见 |

本轮未执行真实知乎请求、Windows 打包、Build/Flash/Serial 或实机动作；`REAL_HARDWARE_VALIDATION_PENDING` 保留。

## 2026-09-11 Phase 15 第十三轮解问题工作页

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | Context 图标映射、问题示例和 Diagnosis 空态类型正确 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2822 modules；仅保留既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 双入口、来源、四阶段与确认门禁静态契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | Diagnosis 30/70 双列、问题卡、6 条 Context、真实插画、4 个阶段副说明、双图标 CTA 和深色画布；8 组响应式、完整 Diagnosis/handoff、console error 0 |
| 同尺寸视觉 QA | 通过 | `phase15-pass13-diagnosis-comparison.png`；源图与实现均为 1448 × 1086，P0/P1/P2 清零 |

首轮视觉对照发现标题块被 Grid 自动排到第二行并与问题卡重叠，显式固定标题与阶段导航在第一行后修复。第二轮发现 Hero 标题末字形成第三行，将 copy 区扩至 48%、标题上限降至 40px 后恢复两行。两项均经重新截图与同尺寸组合图复核。

本轮未执行真实知乎/全网搜索、Windows 打包、Build/Flash/Serial 或实机动作；`LIVE_DIAGNOSIS_PENDING` 与 `REAL_HARDWARE_VALIDATION_PENDING` 保留。

### 第十三轮头部纠偏复测

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 返回键完整位于头部、标题说明距底边 ≥8px、草稿态隐藏；8 组响应式、Diagnosis/handoff 与 console error 0 |
| 1448 × 1086 视觉复核 | 通过 | 返回键恢复，头部文字和状态均不再越界 |

## 2026-09-11 Phase 15 第十二轮找灵感工作页

| 命令/检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | 通过 | 新 DOM、Lucide 图标、提示回填和阶段副说明类型正确 |
| `npm.cmd --prefix electron run build:renderer` | 通过 | 2821 modules；仅保留既有大 chunk warning |
| `npm.cmd --prefix electron run verify:explore-ui` | 通过 | 知乎安全边界、双入口与四阶段产品契约未回归 |
| `npm.cmd --prefix electron run verify:explore-layout-ui` | 通过 | 30/70 两列、对话归属、真实插画、5 个提示按钮、4 个阶段副说明、CTA 图标和深色画布；8 组响应式、Diagnosis/handoff、console error 0 |
| `git diff --check` | 通过 | 无 whitespace error，仅工作树 LF → CRLF 提示 |
| 同尺寸视觉 QA | 通过 | `phase15-pass12-idea-comparison.png`；目标与实现均为 1421 × 1105，P0/P1/P2 清零 |

布局专项首次失败因旧规则的浅色 `!important` 覆盖新深色画布，提升最终规则优先级后修复。第二次失败因“确认计划”的副说明包含“可执行”，旧测试按文本误点第三阶段；改为按第四个阶段按钮定位后通过。两次均完成根因修复，未绕过产品门禁。

本轮未执行真实知乎请求、Windows 打包、Build/Flash/Serial 或实机动作；`REAL_HARDWARE_VALIDATION_PENDING` 保留。
# 测试度量与证据

## 2026-09-11 — Task Manager / Monitor visual gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd --prefix electron run typecheck` | PASS | Task log state, new empty-state asset, and startup defaults compile. |
| `npm.cmd --prefix electron run verify:explore-ui` | PASS | Normal startup must select Explore; duplicate full-log entry is forbidden; task-scoped log state remains. |
| `npm.cmd --prefix electron run build:renderer` | PASS | Production Renderer build succeeds; existing large-chunk warning remains visible. |
| Live desktop CDP at 1389 × 1132 | PASS | Explore is initially selected; `完整日志` count is 0; real-time log and event-card toggles open; script returns to Explore. |

Visual evidence: `electron/.tmp/phase15-pass19-task-manager-comparison.png`, reference and implementation at 1389 × 1132 without scaling. This is UI verification only; no Build/Flash/Serial or hardware action was performed, so `REAL_HARDWARE_VALIDATION_PENDING` remains unchanged.

## 2026-09-12 — Zhihu Access Secret native-dialog reliability

| Command / check | Result | Evidence |
| --- | --- | --- |
| Official `agent/skills/zhihu/scripts/run.ps1 status` | PASS | CLI `0.5.0-beta.20260826061344` is compatible; status requested a Secret. No Secret was read or printed. |
| `npm.cmd --prefix electron run typecheck` | PASS | Main/Renderer connection-state changes compile. |
| `npm.cmd --prefix electron run build:main` | PASS | Native prompt launch and readiness handshake compile. |
| `npm.cmd --prefix electron run build:renderer` | PASS | 2824 modules; only the existing large-chunk warning remains. |
| `npm.cmd --prefix electron run verify:explore-zhihu-connection` | PASS | Attached native prompt, render-ready marker, timeout/early-exit errors, stdin-only Secret handling, and Renderer isolation pass. |
| `npm.cmd --prefix electron run verify:explore-ui` | PASS | Existing Explore flow, evidence, stages, and safety gates remain intact. |
| User visual check | PASS | The masked Access Secret window visibly opened during the no-Secret diagnostic launch. |
| Isolated packaged launch + `npm.cmd --prefix electron run verify:first-run` | PASS | With `VIBEIDE_SMOKE_APP_DATA` only, the original splash completed normally and Main exposed the first-run modal, branding, Skills, Playwright readiness, and placeholder-Key rejection. Test processes and data were removed. |

Root cause: the old implementation detached/unreferenced PowerShell after its process spawned, so a fresh machine could open the Zhihu profile page without keeping the WPF prompt alive long enough to render. Main now waits for a user-data readiness marker written from `ContentRendered`; early exit and 15-second timeout are reported in Explore. CLI download/verification and native-window waiting are explicit UI states. No real Secret or Zhihu request was used.

First-run verification initially misused `VIBEIDE_SMOKE_WORKBENCH_OPEN=1` only to redirect userData. That mode intentionally completes a repository smoke check and closes Main, producing an artificial splash-only 27% state. All temporary processes were terminated at bounded checkpoints. Production splash changes were reverted; user-data isolation now honors `VIBEIDE_SMOKE_APP_DATA` independently, and the corrected isolated packaged first-run passed without activating workbench auto-close behavior.

Final clean package: `v2.0.0` build `7201`, 4,502,226,610 bytes. `Catnip Forge.exe` SHA-256 is `80490D0441CF9ACBDCA8E3495442046AA70CCDD4B7A40C931D7F3360ED96D368`. Release/version gates pass; source and packaged Zhihu host script hashes both equal `5F0E9F8325480E3DE0D577187A3F8A0A49583538EB52F0B291F4286126658EEF`. The targeted clean scan found no project `.catnip`, Explore history, knowledge/favorites, conversation/session state, non-empty `apikey.txt`, or real DeepSeek/Qwen key.
