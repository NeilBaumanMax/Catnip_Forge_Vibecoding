# 开发进度

更新时间：2026-09-08。探索 MVP 未完成。

- 当前 Phase：Phase 3 进行中。Phase 0 已完成；Phase 1 离线宿主集成完成、真实调用待外部条件；Phase 2 Domain 与本地知识底座完成。
- 已完成：官方 `zhihu` Skill 15 文件导入与保真部署、D 盘 CLI 安装/status、安全打包过滤；Explore Domain/JSON Store/知识 IPC；第五工作区“探索”、找灵感/解问题入口、官方连接状态桥、Main Request 准备与 Context 排除；Worker/Agent 只分析档位和内部结构化结果门禁。
- 当前任务：修正“官方 Skill 完整能力、探索页面实际使用能力、Access Secret 用户流程”施工口径。下一业务小闭环必须先做独立文档基线，再设计安全凭证配置路径和官方 CLI 窄搜索桥。
- 未完成：真实知乎/全网搜索、结构化 Idea/Diagnosis UI、现有 Agent Handoff、用户确认执行门禁、Phase 4–6、真实包和真机闭环。
- Blocker：`LIVE_INTEGRATION_PENDING`（官方 status 为 `auth.configured=false`，且 Explore 尚无安全配置 Access Secret 的产品入口）；`AGENT_LIVE_LOAD_PENDING_DEEPSEEK_BALANCE`（用户明确禁止重试）；`REAL_HARDWARE_VALIDATION_PENDING`。这些外部项不阻止独立文档和软件门禁施工。
- 测试：最新三个 Phase 3 小闭环分别为 3、4、4 组最终通过，0 组最终失败；首次失败和全部基线见 TEST_METRICS/LOG。Python pytest 仍因依赖缺失未启动到断言。
- Git 审计起点：`idea_to_production`，local/remote `bff953900d1af98aa9e69f50308ed137c4b0b373`，工作区干净；baseline `f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`。Phase 0–3 远端备份均已有核对记录。

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
