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
