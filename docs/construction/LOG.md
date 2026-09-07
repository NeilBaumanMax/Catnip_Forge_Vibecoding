# 探索施工日志（只追加）

## 2026-09-07 / Phase 0 / 现场与基线

- 先查 Git：idea_to_production，HEAD f6e20e8e1d581a10fbd9c0e48d39bec5c4376112，工作区干净，无 upstream。两个 remote，主施工目标 origin，main 远端核对等于 baseline。
- 审读旧文档并对真实 UI/IPC/Worker/Skill/Runtime/EventBus/串口/user-data/package 代码核查。没有用 README 或历史包作为本轮运行事实。
- 用户 ZIP 确实存在且完整列出 15 文件，SHA-256 见现场报告。发现宿主 description 多行解析不支持、标准部署重写文档；官方协议未修改。现有 Agent skip-permissions 是后续确认门禁待解决的真实缺口。
- 执行 10 个 npm 基线目标，全通过。首次 `python -m pytest tests/test_project.py -q` 失败：系统无 pytest；随后尝试已有 `_bundled/python/python.exe -m pytest tests/test_project.py -q` 仍失败：也无 pytest。根因是测试依赖缺失，未装新依赖，未改业务或测试来规避，4 项结构断言仍未执行。
- 实测 IDF 版本返回 v5.4.3；先出现 IDF 内 `.git` 无效提示，进程回读 source version 并 exit 0。不声称固件 Build/Flash/Serial 已测。Renderer 构建首次成功，有 >500KB chunk warning。
- `git diff --check` 通过；完整命令和边界见 TEST_METRICS。
- 建立 `backup/pre-phase-0-20260907`，push 成功；`git ls-remote --heads origin backup/pre-phase-0-20260907` 返回 baseline，未切换工作区。
- 按用户要求新增 Product Truth 与施工文档/AGENTS；旧文档未覆盖。Review：最小路线复用既有系统，结构化结果与权限门禁须先验证，避免 UI 先行后补安全。
- Phase 0 文档 commit/push：待文档校验后执行，执行结果后续追加。无业务源码改动。

## 2026-09-07 / Phase 0 / ??????? Review

- ?????????????????????????????????????????????????? Phase 1?
- ????????????? branch/HEAD/status??? idea_to_production?baseline ????????????????????? shell ??? apply_patch ?? Windows sandbox-bin ??????????????? shell ???????
- ?????????????15 ???????????????D001?D020?A1?A9 ??????????? diff?git diff --check ???Phase 0 backup ???????? baseline?
- Review/?????????????? Skill ? ????????? ? ???? ? ???????????????????????????????????

## 2026-09-07 / Phase 0 ??? Phase 1 ??????

- Phase 0 commit?bba40d575a641f22a5e4380490349c45ea583503?push -u origin idea_to_production ???ls-remote hash??????????????
- Phase 1 backup/pre-phase-1-20260907 ??????local/remote? bba40d575a641f22a5e4380490349c45ea583503?
- ?? ZIP ????15?????/????/??/????????????????vendor????????????????
- ???? powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status?exit0?installed=false?request_install_consent????????????????CLI?????auth.configured=false????????????????
- ???? SKILL.md ??????ZHIHU_CLI_INSTALL_CONSENT_REQUIRED???? setup????Secret??????/??API???Phase 2???????????????????????
- ?????2???0???4??????????????????? fallback?
- ?????/push???????Phase 1???BLOCKED?

## 2026-09-07 / 可读记录纠正与文档编码根因

上方此前经Windows管道写入的部分记录含问号；原条目保留不删除。以下是其完整可读事实，不能把问号段作为当前状态。
- Phase 0校验最初被自动审批以额度耗尽拒绝，未执行。用户要求继续后默认沙箱仍Windows权限失败，apply_patch也失败；具体授权shell审批恢复。
- 15文档/链接/D001–D020/A1–A9/无业务diff校验首次实际执行成功。Phase 0共13目标通过、2次pytest启动失败、3组未验证。Review确认复用现有系统、先契约和执行门禁再UI。
- Phase 0纯文档提交bba40d575a641f22a5e4380490349c45ea583503已push，local/remote一致；backup/pre-phase-1-20260907同hash已核对。
- 官方15文件安全导入，工作区/暂存分别逐字节等于ZIP。run.ps1 status首次exit0，但installed=false/request_install_consent；遵循官方规则停在安装授权门禁，不进行setup/业务API/Secret请求/Phase 2。
- 源核验提交36d93282ca8344028702dc0905488556ce775042已push并通过ls-remote核对，提交后工作区干净；源文件未受文档编码问题影响。
- 收尾Review发现新文档中文变问号，第一次编码检查失败；此前只检查链接/存在，遗漏正文检查。根因为PowerShell默认管道OutputEncoding损失中文，不是UTF8文件解码。
- 修复：显式UTF8管道，从上述真实事实重写当前接力/进度/专项记录，修正A6和Phase 1备份表；本LOG只追加保留原失败；新增中文/连续问号检查。
- 当前仅文档修复，无应用业务改动，仍等用户CLI安装授权。修复验证与提交结果随后记录。

2026-09-07 修复复测：当前6份施工文档中文/连续问号/本地链接检查通过；官方15文件工作区与已提交Git对象再次对比ZIP通过。文档编码项累计1次失败、1次修复通过，失败历史保留。

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
