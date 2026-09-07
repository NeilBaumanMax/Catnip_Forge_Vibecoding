# 工具与安全边界

- Git：只当前工作区；只向 origin 当前施工/backup ref 推送；重要 Phase 先备份；精确暂存；禁止 worktree、reset --hard、clean -fd、force push、自动 stash/覆盖用户工作。
- 文件：优先 rg 精确范围，不扫描全部项目/build/串口历史。避免读取凭据文件。写入只在 Phase 授权范围；官方 ZIP 安全解包要检查路径穿越/符号链接/同名覆盖，保留原字节。递归删除前核绝对边界，不能以广泛清理获得干净环境。
- 网络：本轮已授权 origin backup/commit/push 和必要官方 Skill 检查；业务请求最小化，不为每次搜索预查额度，不读取本人数据/OAuth。不得新增云后端或绕过官方 CLI；安装遵循官方独立确认。
- Skill：用户给定官方 ZIP 为 vendor 输入。先读 SKILL.md，再用自身 scripts/run.* status；仅使用 status/setup 返回的绝对 binary path。不查 PATH 中未知 CLI；不为方便伪造 Skill。官方 package 缺失立即记 OFFICIAL_ZHIHU_SKILL_SOURCE_MISSING。
- CLI：installed=false 或不兼容时按上游规则先取得安装/升级授权。发布最新版声明必须有真实远端证据。测试不自动执行 setup。
- Secret：优先官方系统凭证存储，通过标准输入配置；不进入源码/config/.env、Renderer、Chat、日志、URL、命令参数、截图/视频或包。当前 Chat/Worker 会记录请求，不能作为配置 Secret 通道。需要用户 Secret 时再请求安全输入方式；不在工具输出/后续回复复述，不读出系统凭据。
- 硬件：Phase 0/1 不触板。Explore/Plan 不执行修改/Build/Flash。具体修复计划经用户确认并明确项目/target/端口后才调用既有 hardboard.*。不因“编译成功”假称运行正常；擦除/大范围删除另需具体授权。
- 测试：使用已有 scripts，先审副作用；模拟串口明确标 mock；不得联网消耗真实模型/知乎额度来验证可离线验证的契约。日志尽量只输出计数、错误码和安全摘要。
- 自动审批：当前默认 shell 沙箱因 Windows sandbox-bin 权限失败不能启动，使用已批准的具体 shell 升级执行。升级不是产品/硬件/安装授权；如自动审批拒绝，明确报告动作及拒绝理由，先做不受影响部分。
