# TASK-DEV-MAINT-001 Evidence
Lifecycle: ACTIVE（任务结束后 ARCHIVED）
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
