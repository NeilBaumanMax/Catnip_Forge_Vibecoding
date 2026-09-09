# 测试度量与证据

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
