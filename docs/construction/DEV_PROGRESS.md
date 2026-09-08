# 开发进度

更新时间：2026-09-08。探索 MVP 未完成。

- 当前 Phase：Phase 4 软件闭环已完成：4a 有界 Context、4b 诊断入口、4c 双搜索软件路径、4d 一次性确认执行门禁均已实现；真实知乎与实机验收仍暂缓/待完成。
- 已完成：安全连接入口、固定知乎/全网搜索桥、受限分析、Idea/Diagnosis UI、结构化 Handoff 与只计划档位；DeepSeek 真实计划输出已通过；当前工程、target、最多 6 个源码候选、24 小时内同工程 Build/Flash 事件和最多 40 条共享串口记录可见且可取消。
- 当前任务：Phase 5 进行中，5a 主动收藏与本地收藏预览已实现；下一项为 5b 相关知识发现与用户显式选择。
- 未完成：真实知乎/全网搜索验收、确认后真实施工与实机验证、相关知识选择和验证反馈 UI、真实 Windows 包。
- Blocker：`LIVE_INTEGRATION_PENDING`（Access Secret 未配置，用户要求暂不测试）与 `REAL_HARDWARE_VALIDATION_PENDING`。DeepSeek 余额阻塞已解除。
- 测试：Phase 4a 专项、typecheck、Main/Renderer build、Explore UI/Request、task queue 通过；首次错误断言与修复见 TEST_METRICS/LOG。
- Git：Phase 4 备份 `backup/pre-phase-4-20260908` 指向 `c0ca685f1460c7c5c539042d93bcc2d9ada1bfa0`；4a 独立基线提交 `cefd6331` 已推送。
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

## 2026-09-08 探索页面知乎能力与 Access Secret 口径修正

- 用户当前在探索页面实际使用的官方知乎能力只有连接状态检查。页面提交只准备请求并声明来源策略，没有调用知乎搜索或全网搜索。
- MVP 后续只接官方 `search zhihu` 和 `search global`。Skill 的热榜、直答、本人创作/关注/收藏、官方知识库、额度查询和 OAuth 不进入探索页面；本地知识卡不是知乎官方知识库。
- Access Secret 是每个用户自己的开放平台 API 凭证，用于鉴权和额度归属，不是知乎登录密码。当前 Explore 只有“重新检查”，没有安全配置入口，不能宣称用户已能在页面完成连接。
- 后续配置必须由宿主通过官方 CLI stdin 验证并保存到操作系统凭证库；完整 Secret 不得经过 Renderer IPC、产品 Chat、日志、URL、Agent 输出或仓库。此路径与窄搜索桥都要先有独立施工基线和程序门禁。
- 本次官方 status 复核：CLI installed/compatible=true，auth.configured=false；远端更新检查为 unavailable/network error，因此不能声称当前版本是最新版。没有执行搜索、凭证配置、DeepSeek 或硬件操作。

Phase 3b1 软件实现完成：探索页可发起零参数连接动作，Main 打开固定知乎个人中心并启动独立遮蔽输入窗口，宿主脚本只经 stdin 调官方鉴权入口；页面/IPC/Agent 不接触 Secret。typecheck、连接专项、Explore UI 通过；未输入真实 Secret，live 状态保持 pending。

Phase 3b2 已完成软件接线并进入 Phase 3c：Main 只开放官方知乎/全网搜索，校验来源后交给受限分析；页面展示 Idea/Diagnosis、原始来源并可交给 Catnip。3c 已实现结构化 Handoff 和无工具只计划档位，计划可展示；“确认并执行”保持禁用，留给后续执行闭环。真实搜索/模型仍待 Secret 与 DeepSeek 恢复。
