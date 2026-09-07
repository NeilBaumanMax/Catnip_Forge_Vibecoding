# Phase 1：官方 Skill 源与状态核验

日期：2026-09-07；状态：CLI安装小项完成；LIVE_INTEGRATION_PENDING。源核验与安装均不代表Phase 1整体验收。

## 实际证据

- Phase 0提交与远端一致：bba40d575a641f22a5e4380490349c45ea583503；Phase 1远程backup指向该提交。
- 用户ZIP SHA-256：f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7。解包先拒绝绝对路径/..、反斜杠、盘符、符号链接、大小写重复、已有目标覆盖。
- 导入agent/skills/zhihu共15文件；工作区与暂存对象分别逐字节对比ZIP，均相同；不改vendor协议或鉴权。
- 首次官方调用：powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status；exit 0，installed=false，next_action=request_install_consent，update_check.status=not_applicable，auth.configured=false。
- 仅证明未找到满足最低版本的可用CLI；脚本此分支不独立查询系统凭据，不据此声称Secret不存在。未调用搜索/本人API，未运行setup。
- 源提交36d93282ca8344028702dc0905488556ce775042已push并核对。

## 安装授权门禁（历史，已由本次明确授权解除）

官方SKILL.md首次检查与初始化第1条要求：“询问用户是否现在安装。未得到明确同意时停止。”普通继续施工不代替明确安装授权。安装到用户目录，不需管理员、不改PATH；下载/校验交原setup.ps1，宿主不重写。

## 未完成

宿主description/部署保真失败测试及修复；support tree/@zhihu/Worker加载契约；真实模型调用；打包过滤与成品CLI验证；连接状态与安全Secret路径。此前安装门禁已解除，尚有凭据配置和宿主兼容验证待完成；未进入Phase 2。

## 2026-09-07 官方 CLI 安装实测

用户明确同意安装并要求告知位置。安装前已说明默认用户目录；未覆盖 ZHIHU_CLI_HOME，未修改 PATH。

- 原脚本：powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/setup.ps1。
- 安装目录：%LOCALAPPDATA%/ZhihuCLI；当前 binary：%LOCALAPPDATA%/ZhihuCLI/current/zhihu-cli.exe；版本副本：%LOCALAPPDATA%/ZhihuCLI/versions/0.5.0-beta.20260826061344/zhihu-cli.exe。真实绝对路径已向本机用户告知，公开施工记录不写操作系统用户名。
- setup exit0，installed=true，downloaded_cli_version=0.5.0-beta.20260826061344。下载/大小/散列/归档与版本校验全部由原官方脚本执行，没有修改vendor。
- 随后官方 scripts/run.ps1 status：installed=true、compatible=true、update_check.status=verified（HTTP200）、无CLI/Skill更新、auth.configured=false、request_access_secret。返回的官方Skill散列与用户ZIP相同。
- 两份exe实际各6,891,008字节。后续只使用setup/status返回的绝对binary_path，不使用PATH裸命令。
- 只读 auth set --help 证实 --secret-stdin 在线验证后写系统安全凭证库；未执行 auth set/verify 或 me contents，没有配置Secret，也没有执行真实搜索。
- 安装授权门禁解除；LIVE_INTEGRATION_PENDING。宿主兼容修复、@zhihu/support sync、成品/硬件仍未验收。

## 2026-09-07 安装位置变更：D盘（当前有效位置）

用户明确要求不放C盘。当前安装根为 D:\ZhihuCLI，binary_path为 D:\ZhihuCLI\current\zhihu-cli.exe；版本副本在 D:\ZhihuCLI\versions\0.5.0-beta.20260826061344\zhihu-cli.exe。旧 %LOCALAPPDATA%/ZhihuCLI 路径记录只作历史，已删除本次C盘安装目录。

采用官方支持的用户级 ZHIHU_CLI_HOME=D:\ZhihuCLI，已持久写入并回读验证，不修改PATH或vendor脚本。已运行宿主可能仍持有旧环境；重新启动后使用新环境，施工shell应显式从用户级变量读取后传入官方脚本，避免退回C盘。

迁移先确认D盘目标不存在、源目录无reparse点，复制3文件逐项SHA-256一致；用D盘环境运行原setup.ps1返回reused_cli=true/ok=true，再run.ps1 status返回installed=true/compatible=true且binary_path为D盘。setup的installed=false在此表示复用已有文件，不是未安装。

新位置验证后，再次核实两份exe散列和精确旧目录边界，删除旧安装树；Test-Path返回False。D盘binary version成功返回0.5.0-beta.20260826061344。未配置Secret、未调用搜索、未触板；LIVE_INTEGRATION_PENDING保持。
