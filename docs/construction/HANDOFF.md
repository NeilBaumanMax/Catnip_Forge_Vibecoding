# 新 Agent 接力入口

更新时间：2026-09-07。用户已明确授权并完成官方 CLI 安装。当前 Phase 1 真实调用停在安全凭据配置边界；未经凭据配置不能声称真实搜索通过，Phase 1 尚未完成。禁止 worktree、子 Agent、改变产品方向。

## 必读

AGENTS.md → docs/product/PRODUCT_REQUIREMENTS.md → CODEX_MASTER_REQUIREMENTS.md（A1–A9）→ DECISION_LOG.md → CONSTRUCTION_PLAN.md → PHASE_1_ZHIHU_SKILL.md → TOOL_POLICY.md / TEST_METRICS.md / LOG.md。历史 docs 只作证据。

## 产品与 Phase

当前仍是四个可见工作区的桌面 Agent IDE；探索、知识库、新 Handoff 均未实现。Phase 0 文档/Git/测试基线完成且已推送。Phase 1 已导入官方15文件、执行原 setup.ps1 安装并完成官方 status 检查，未改业务实现/vendor协议。Phase 2–6 未开始，MVP 未完成。

关键决定：探索（找灵感/解问题）；官方 Skill；每用户 Secret；分析/计划不施工、确认后执行；真实硬件证据；主动收藏与历史知识用户选择；无 OAuth/Web/云端/第二套系统。

## 架构与风险

BrowserPanel → preload → gateway chat:send → Worker单队列 → Claude Code stream-json → Runtime/Hardboard；Skill源agent/skills，部署Agent workspace/.claude/skills；复用Main JSON user-data、EventBus与共享串口。

Manager仍把多行description解析为 >- 并重写部署SKILL.md，尚未修复。旧浏览器搜索规则与官方CLI需最小区分；Agent skip-permissions尚无Explore/Plan门禁；业务结构化Result未实现。不能把源导入视为 @zhihu 集成、LLM加载或真实搜索已通过。A1–A9见主约束，A6已BLOCKED。

## 下一步1–3项

1. CLI 安装授权已由用户明确给出并完成。当前需按官方流程配置用户自己的 Access Secret；使用本机安全输入和官方 auth set --secret-stdin，不发送到产品 Chat、源码、日志或命令参数。尚未获取凭据，真实调用保持 LIVE_INTEGRATION_PENDING。
2. setup/status 已完成，不重复安装；使用返回的绝对 binary_path。当前路径为 D:/ZhihuCLI/current/zhihu-cli.exe，版本 0.5.0-beta.20260826061344；用户级ZHIHU_CLI_HOME已持久设置。用户目前仅授权安装，未授权初始化或本人数据，不执行 me contents。
3. 条件满足后先复现宿主description/部署保真失败，最小修复并验证support树、显式refs/Worker加载契约、打包过滤器；真实LLM/搜索/成品分别计证据，完成Phase 1再继续Phase 2。

## 输入与测试

官方ZIP：E:\Agent\vibeide\zhihu-cli-skill-0.5.3-beta.20260904115023.zip。
SHA-256：f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7。
源在agent/skills/zhihu，15文件工作区/暂存均与ZIP原字节一致。已执行原setup并完成兼容验证；未索取/读Secret、未调用搜索或本人API。

Phase 0：13通过、2次pytest启动失败、3组待验证；Phase 1：2通过、0失败、4组待验证。系统和随包Python都缺pytest，未修复。真实硬件REAL_HARDWARE_VALIDATION_PENDING；未重建包。另发现文档写入中文变问号，根因Windows PowerShell默认管道编码；已明确UTF-8重写文档，原失败记录保留LOG，复测见TEST_METRICS。

## Git快照

branch idea_to_production，跟踪origin/idea_to_production；origin为git@github.com:NeilBaumanMax/Catnip_Forge_Vibecoding.git。
baseline f6e20e8e1d581a10fbd9c0e48d39bec5c4376112。
Phase 0 local/remote bba40d575a641f22a5e4380490349c45ea583503。
最新已核对源核验 local/remote 36d93282ca8344028702dc0905488556ce775042；push成功，源提交后工作区干净。
backup/pre-phase-0-20260907指向baseline；backup/pre-phase-1-20260907指向Phase 0提交，远端均核对。
当前只收尾文档修复，最终记录提交本身用git rev-parse HEAD与ls-remote动态核对；不得将上一条hash当当前HEAD。下一轮重新检查工作区，保护用户修改。

## 2026-09-07 官方 CLI 安装实测

用户明确同意安装并要求告知位置。安装前已说明默认用户目录；未覆盖 ZHIHU_CLI_HOME，未修改 PATH。

- 原脚本：powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/setup.ps1。
- 安装目录：%LOCALAPPDATA%/ZhihuCLI；当前 binary：%LOCALAPPDATA%/ZhihuCLI/current/zhihu-cli.exe；版本副本：%LOCALAPPDATA%/ZhihuCLI/versions/0.5.0-beta.20260826061344/zhihu-cli.exe。真实绝对路径已向本机用户告知，公开施工记录不写操作系统用户名。
- setup exit0，installed=true，downloaded_cli_version=0.5.0-beta.20260826061344。下载/大小/散列/归档与版本校验全部由原官方脚本执行，没有修改vendor。
- 随后官方 scripts/run.ps1 status：installed=true、compatible=true、update_check.status=verified（HTTP200）、无CLI/Skill更新、auth.configured=false、request_access_secret。返回的官方Skill散列与用户ZIP相同。
- 两份exe实际各6,891,008字节。后续只使用setup/status返回的绝对binary_path，不使用PATH裸命令。
- 只读 auth set --help 证实 --secret-stdin 在线验证后写系统安全凭证库；未执行 auth set/verify 或 me contents，没有配置Secret，也没有执行真实搜索。
- 安装授权门禁解除；LIVE_INTEGRATION_PENDING。宿主兼容修复、@zhihu/support sync、成品/硬件仍未验收。

安装小项Git快照：branch idea_to_production；安装开始前HEAD为 4a3f7b86449b3bba994a2476c3f258f051455b7f，工作区干净。当前仅安装记录文档变更；本次文档提交后将push并动态核对origin，CLI二进制和任何凭据不入Git。

## 2026-09-07 安装位置变更：D盘（当前有效位置）

用户明确要求不放C盘。当前安装根为 D:\ZhihuCLI，binary_path为 D:\ZhihuCLI\current\zhihu-cli.exe；版本副本在 D:\ZhihuCLI\versions\0.5.0-beta.20260826061344\zhihu-cli.exe。旧 %LOCALAPPDATA%/ZhihuCLI 路径记录只作历史，已删除本次C盘安装目录。

采用官方支持的用户级 ZHIHU_CLI_HOME=D:\ZhihuCLI，已持久写入并回读验证，不修改PATH或vendor脚本。已运行宿主可能仍持有旧环境；重新启动后使用新环境，施工shell应显式从用户级变量读取后传入官方脚本，避免退回C盘。

迁移先确认D盘目标不存在、源目录无reparse点，复制3文件逐项SHA-256一致；用D盘环境运行原setup.ps1返回reused_cli=true/ok=true，再run.ps1 status返回installed=true/compatible=true且binary_path为D盘。setup的installed=false在此表示复用已有文件，不是未安装。

新位置验证后，再次核实两份exe散列和精确旧目录边界，删除旧安装树；Test-Path返回False。D盘binary version成功返回0.5.0-beta.20260826061344。未配置Secret、未调用搜索、未触板；LIVE_INTEGRATION_PENDING保持。

## 2026-09-07 Phase 1宿主集成进展

已完成离线宿主小闭环：13个Skill部署通过；官方zhihu多行描述正确，SKILL.md与14个support文件保真；@zhihu进入现有结构化引用和Worker加载约束；builder自动包含15文件且排除用户CLI；release门禁已增强。旧Skill、任务队列、Hardboard上下文回归通过。

当前Blocker：`LIVE_INTEGRATION_PENDING`（官方CLI auth.configured=false）和`AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE`（受限真实Agent调用在tool_use前HTTP 402）。不能称Phase 1完整通过，也不进入Phase 2。真实成品检查留Phase 6，REAL_HARDWARE_VALIDATION_PENDING保持。