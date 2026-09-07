# 新 Agent 接力入口

更新时间：2026-09-07。停在 Phase 1 官方 CLI 安装授权门禁。用户授权分阶段施工/提交/推送，但未明确授权本次官方 CLI 安装；不能绕开进入 Phase 2。禁止 worktree、子 Agent、改变产品方向。

## 必读

AGENTS.md → docs/product/PRODUCT_REQUIREMENTS.md → CODEX_MASTER_REQUIREMENTS.md（A1–A9）→ DECISION_LOG.md → CONSTRUCTION_PLAN.md → PHASE_1_ZHIHU_SKILL.md → TOOL_POLICY.md / TEST_METRICS.md / LOG.md。历史 docs 只作证据。

## 产品与 Phase

当前仍是四个可见工作区的桌面 Agent IDE；探索、知识库、新 Handoff 均未实现。Phase 0 文档/Git/测试基线完成且已推送。Phase 1 只导入官方15文件并执行 status，未改业务实现/vendor协议。Phase 2–6 未开始，MVP 未完成。

关键决定：探索（找灵感/解问题）；官方 Skill；每用户 Secret；分析/计划不施工、确认后执行；真实硬件证据；主动收藏与历史知识用户选择；无 OAuth/Web/云端/第二套系统。

## 架构与风险

BrowserPanel → preload → gateway chat:send → Worker单队列 → Claude Code stream-json → Runtime/Hardboard；Skill源agent/skills，部署Agent workspace/.claude/skills；复用Main JSON user-data、EventBus与共享串口。

Manager仍把多行description解析为 >- 并重写部署SKILL.md，尚未修复。旧浏览器搜索规则与官方CLI需最小区分；Agent skip-permissions尚无Explore/Plan门禁；业务结构化Result未实现。不能把源导入视为 @zhihu 集成、LLM加载或真实搜索已通过。A1–A9见主约束，A6已BLOCKED。

## 下一步1–3项

1. 取得用户明确安装授权。官方agent/skills/zhihu/SKILL.md首次检查第1条要求未得到明确同意时停止。status返回installed=false / request_install_consent（也可能是不兼容版本，不自行断言完全没安装）。
2. 获准后用原scripts/setup.ps1，保存返回的绝对binary_path，再status；不从PATH调用未知CLI。未授权初始化或本人数据，不执行me contents。真实Secret需要时另请求安全方式，不进入Renderer/产品Chat/日志。
3. 条件满足后先复现宿主description/部署保真失败，最小修复并验证support树、显式refs/Worker加载契约、打包过滤器；真实LLM/搜索/成品分别计证据，完成Phase 1再继续Phase 2。

## 输入与测试

官方ZIP：E:\Agent\vibeide\zhihu-cli-skill-0.5.3-beta.20260904115023.zip。
SHA-256：f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7。
源在agent/skills/zhihu，15文件工作区/暂存均与ZIP原字节一致。未执行setup、未索取/读Secret、未调用搜索或本人API。

Phase 0：13通过、2次pytest启动失败、3组待验证；Phase 1：2通过、0失败、4组待验证。系统和随包Python都缺pytest，未修复。真实硬件REAL_HARDWARE_VALIDATION_PENDING；未重建包。另发现文档写入中文变问号，根因Windows PowerShell默认管道编码；已明确UTF-8重写文档，原失败记录保留LOG，复测见TEST_METRICS。

## Git快照

branch idea_to_production，跟踪origin/idea_to_production；origin为git@github.com:NeilBaumanMax/Catnip_Forge_Vibecoding.git。
baseline f6e20e8e1d581a10fbd9c0e48d39bec5c4376112。
Phase 0 local/remote bba40d575a641f22a5e4380490349c45ea583503。
最新已核对源核验 local/remote 36d93282ca8344028702dc0905488556ce775042；push成功，源提交后工作区干净。
backup/pre-phase-0-20260907指向baseline；backup/pre-phase-1-20260907指向Phase 0提交，远端均核对。
当前只收尾文档修复，最终记录提交本身用git rev-parse HEAD与ls-remote动态核对；不得将上一条hash当当前HEAD。下一轮重新检查工作区，保护用户修改。
