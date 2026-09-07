# Phase 1：官方 Skill 源与状态核验

日期：2026-09-07；状态BLOCKED / ZHIHU_CLI_INSTALL_CONSENT_REQUIRED。源核验小项完成，不代表Phase 1整体验收。

## 实际证据

- Phase 0提交与远端一致：bba40d575a641f22a5e4380490349c45ea583503；Phase 1远程backup指向该提交。
- 用户ZIP SHA-256：f7b1de244c875749feec7fae5b134e2de5f26332198e6c73861140b2d72c4dd7。解包先拒绝绝对路径/..、反斜杠、盘符、符号链接、大小写重复、已有目标覆盖。
- 导入agent/skills/zhihu共15文件；工作区与暂存对象分别逐字节对比ZIP，均相同；不改vendor协议或鉴权。
- 首次官方调用：powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status；exit 0，installed=false，next_action=request_install_consent，update_check.status=not_applicable，auth.configured=false。
- 仅证明未找到满足最低版本的可用CLI；脚本此分支不独立查询系统凭据，不据此声称Secret不存在。未调用搜索/本人API，未运行setup。
- 源提交36d93282ca8344028702dc0905488556ce775042已push并核对。

## 安装授权门禁

官方SKILL.md首次检查与初始化第1条要求：“询问用户是否现在安装。未得到明确同意时停止。”普通继续施工不代替明确安装授权。安装到用户目录，不需管理员、不改PATH；下载/校验交原setup.ps1，宿主不重写。

## 未完成

宿主description/部署保真失败测试及修复；support tree/@zhihu/Worker加载契约；真实模型调用；打包过滤与成品CLI验证；连接状态与安全Secret路径。无授权前不继续这些实现，不进入Phase 2；只提交源核验和接力记录。
