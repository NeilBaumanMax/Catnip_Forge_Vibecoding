# 新 Agent 接力入口

更新时间：2026-09-07。不要依赖聊天历史；用户已授权按 Phase 0–6 连续施工，无重大阻塞不形式确认。不得 worktree、另开产品方向或子 Agent。

## 先读

`AGENTS.md` → `docs/product/PRODUCT_REQUIREMENTS.md` → 本目录 `CODEX_MASTER_REQUIREMENTS.md`（A1–A9）、`DECISION_LOG.md`、`PROJECT_STATE_REPORT.md`、`CONSTRUCTION_PLAN.md`、`LAYER_CONTRACT.md`、`TOOL_POLICY.md`、`TEST_METRICS.md`。旧 docs/CLAUDE 只作历史证据，不覆盖本轮。

## 当前产品 / Phase

已有桌面 Agent/Skill/MCP/Hardboard、四个可见页签，无探索/个人知识库。Phase 0 现场和文档已建立，正在做文档校验与首次提交。Phase 1 尚未写业务代码；Phase 2–6 未开始。MVP 未完成。

关键决定：探索不是知乎页面；灵感优先、排障主 Demo；官方 Skill；个人 Secret；探索只分析、Handoff 先计划、确认后执行；真实硬件证明；知识主动收藏、相关发现经用户选择；不 OAuth/Web/第二套系统。

## 当前架构与关键缺口

BrowserPanel 四页签；preload → gateway chat:send → Worker submitTask 单队列 → Claude Code stream-json → Runtime MCP → Hardboard。标准 Skill 源在 agent/skills，部署在 Agent workspace/.claude/skills；support tree 已有。Main user-data/session JSON、EventBus、共享串口均可复用。

已定位：多行 `description: >-` 被宿主读成 `>-`；标准部署会重写 SKILL.md。旧 Agent 搜索规则偏 browser URL，须对官方 Skill 作最小边界修正。Agent 当前 skip-permissions，不能直接支持安全 Explore/Plan；尚无结构化业务 Result。未发现根本产品冲突，不能为了复用而绕过确认。

## 接下来 1–3 个任务

1. 完成 Phase 0 文件存在/链接/需求覆盖 Review，纯文档 commit/push 并核远端，追加准确 Git 记录。
2. 建 Phase 1 备份与最小施工测试基线；从用户 ZIP 原样导入官方 Skill。先运行其 `scripts/run.ps1 status`。若安装/升级需要许可，按官方规则停止并问一个具体问题，不绕开去做 Phase 2。
3. 无阻塞时先用失败测试证明标准 Skill 保真/多行元数据问题，再最小修宿主；验证支持树、@、实际打包 filter、无 Secret；真实 LLM 加载/搜索和 packaged app 未跑的单列，不能冒充通过。

## 官方输入与安全

ZIP：`E:\Agent\vibeide\zhihu-cli-skill-0.5.3-beta.20260904115023.zip`。
SHA-256：`f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7`。
15 个文件；不含 CLI；Windows 支持、最低版本及运行规则见原包 SKILL/manifest。CLI status、安装与 auth 尚未测。不得假造包；不得从 PATH 调未知 CLI；Secret 不能走现有会记录全文的 chat:send。真实 Secret 需要时再请求，不回显。

## 已知问题 / Blocker / Assumptions

A1–A9 见主约束；没有“理论上支持”被登记为 CONFIRMED。Python 系统和随包解释器均缺 pytest，结构测试未执行；不阻断后续 Skill 接入，但不得声称全绿。官方 CLI/Secret 未知，若 status 要求安装授权必须停。真实设备/故障未选，REAL_HARDWARE_VALIDATION_PENDING；当前只确认 IDF v5.4.3，不能外推硬件成功。包尚未重建，旧包不作本轮验收。

## 测试与 Git

基线 12 检查目标通过、2 次 pytest 启动失败、3 组待验证；完整命令/警告/范围见 TEST_METRICS。新文档校验待收口。当前未触业务源码。

- branch：idea_to_production（每次动态核对）。
- baseline / latest 已核对代码提交：f6e20e8e1d581a10fbd9c0e48d39bec5c4376112。
- origin：git@github.com:NeilBaumanMax/Catnip_Forge_Vibecoding.git；不推 upstream/main。
- backup：backup/pre-phase-0-20260907，local/remote 均 baseline，已核对。
- 施工分支 push：待首次文档提交；初始无 upstream。
- working tree：本轮新增 AGENTS 与 docs/product、docs/construction 文档，无用户改动，业务文件无 diff。后续提交后更新快照。

下一轮必须保留失败历史、准确记录 commit/push/hash。禁止 reset/clean/force/stash 取得干净工作区。

## 2026-09-07 ????

??????? Git baseline ???????????15 ??????/??/?????????? 13 ???????2 ? pytest ?????3 ????????????????????????? LOG??????????/?????? Phase 1?
