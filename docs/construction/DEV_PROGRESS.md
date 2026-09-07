# 开发进度

更新时间：2026-09-07。探索 MVP 未完成。

- 当前 Phase：Phase 0 完成；Phase 1 官方源导入、官方 CLI 安装和安装后 status 完成；真实联调等待安全凭据配置。
- 已完成：15份产品/施工文档、现场审计、D001–D020、A1–A9、分层/测试基线；两阶段远程备份；官方15文件安全解包、工作区及 Git 内容与 ZIP 逐字节一致。
- 当前任务：记录用户明确授权的 CLI 安装结果和安全凭据边界。
- Blocker：LIVE_INTEGRATION_PENDING；安装授权门禁已解除，官方安装后 status 为 installed=true、compatible=true、auth.configured=false、next_action=request_access_secret。没有索取/配置 Secret 或执行真实搜索。
- 未完成：宿主多行描述/部署保真修复、support sync、@zhihu 集成、打包资源、真实调用；Phase 2–6 未开始。
- 测试：Phase 0 为13通过、2次 pytest 启动失败、3组未验证；Phase 1 为2通过、0失败、4组未验证；文档编码检查首次失败，修复后复测另记 TEST_METRICS。
- Secret：未索取、读取或配置；本次安装后的真实 CLI status 明确返回 auth.configured=false。
- 硬件：REAL_HARDWARE_VALIDATION_PENDING；未触板。

Git 已核对快照：branch idea_to_production；baseline f6e20e8e1d581a10fbd9c0e48d39bec5c4376112；Phase 0 local/remote bba40d575a641f22a5e4380490349c45ea583503；官方源核验 local/remote 36d93282ca8344028702dc0905488556ce775042，push成功、查询一致。backup/pre-phase-0-20260907 指向baseline，backup/pre-phase-1-20260907 指向Phase 0提交，均核对。源提交后工作区干净；当前只有本轮文档修复待提交。最终记录提交 HEAD 以 git rev-parse HEAD / ls-remote 为准，不伪造自包含 hash。

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

## 2026-09-07 Phase 1 离线实现提交

- 已完成：宿主 YAML block scalar 兼容、官方 `SKILL.md` 原字节部署、14 个 support 文件同步、`@zhihu` 引用/Worker 提示契约、builder 资源契约、release 包文件保真与 CLI 排除门禁。
- 已通过：6 项相关回归、3 项脚本语法检查、部署目录官方 status、vendor 对 ZIP 保真。
- 实现提交：`9d7efb3a2cb97aad3132da0c4396663b4ef7839e`；已 push，并与 `origin/idea_to_production` 远端 hash 核对一致；提交后工作区干净。
- 当前任务：等待安全配置用户 Access Secret，以及恢复 DeepSeek 模型余额后完成真实只读调用。
- Blocker：`LIVE_INTEGRATION_PENDING`、`AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE`。Phase 2 未开始；`REAL_HARDWARE_VALIDATION_PENDING` 保持。


## 2026-09-07 外部依赖状态

- 用户要求停止所有 DeepSeek 重试；`AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE` 保持。
- 官方 status 复核通过，但 `auth.configured=false`；`LIVE_INTEGRATION_PENDING` 保持。
- 本轮未执行知乎搜索、Agent 调用或硬件操作。


## 2026-09-07 Phase 2 第一小闭环

当前 Phase：Phase 2 进行中。已完成共享 Domain Contract、运行时校验、Main 本地知识 Store、preload/Main IPC 和专项测试。A3 已确认；A2 仍等待真实模型输出。下一项是审阅提交后继续最小 Handoff/知识选择契约，不开发视觉 UI。

软件验证：5 组通过、0 失败、2 个外部未验证（知乎真实搜索、真实 Agent Skill 调用）。硬件仍为 `REAL_HARDWARE_VALIDATION_PENDING`。


## 2026-09-07 Phase 2 完成

Phase 2 已完成并推送：`860badf7a21d3cb1b4fc7f434488ab5de379dd34`，本地/远端一致，提交后工作区干净。当前进入 Phase 3；先实现“探索”可见入口和两条产品入口，不制造假来源、不调用 DeepSeek。


## 2026-09-08 Phase 3 可见入口

Phase 3 进行中。已完成第五页签“探索”、仅含“找灵感 / 解问题”的首页、两条输入流程和可取消的排障 Context 选择。尚未接入真实检索和 Agent Handoff；当前不会产生假结果。

测试：3 项通过、0 失败；第一次 UI 契约断言失败已定位为测试正则并修复。下一小项：安全的官方 Skill 连接状态与 Explore 请求编排边界。


## 2026-09-08 Phase 3 连接状态

已完成官方 Skill status 的 Main 安全桥和 Explore 页面连接状态显示。当前真实状态：D 盘 CLI 已安装且兼容，需要连接知乎开放平台。Secret 不进入 Renderer。下一项仍是检索编排与结构化 Idea；真实调用保持 pending。

## 2026-09-08 Phase 3 请求准备边界

已完成 Explore Request 的 Main 校验与准备 IPC：找灵感自动带入可用工程/硬件约束，解问题只保留用户勾选的 Context；知识源策略明确为灵感“知乎必需、全网按需”，排障“知乎与全网均必需”。Renderer 不执行搜索、不调用 Agent，也不生成假 Idea。

软件验证 4 组通过、0 组最终失败。第一次 UI 契约因安全连接兜底文案被动态消息替换而失败，恢复固定安全兜底后通过。下一项是结构化检索结果契约和现有 Agent 的只分析执行门禁；DeepSeek 禁止重试，真实知乎搜索继续 `LIVE_INTEGRATION_PENDING`。
