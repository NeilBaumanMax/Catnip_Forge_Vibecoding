# Git Baseline 与安全回滚

2026-09-07 baseline：`f6e20e8e1d581a10fbd9c0e48d39bec5c4376112`；分支 `idea_to_production`；初始工作区干净、无 upstream。origin 与 upstream remote 见现场报告；只推 origin。

| Phase | 备份分支 | local hash | remote hash | 状态 |
| --- | --- | --- | --- | --- |
| 0 | backup/pre-phase-0-20260907 | f6e20e8e1d581a10fbd9c0e48d39bec5c4376112 | f6e20e8e1d581a10fbd9c0e48d39bec5c4376112 | push 成功，ls-remote 已核对 |
| 1 | backup/pre-phase-1-20260907 | bba40d575a641f22a5e4380490349c45ea583503 | bba40d575a641f22a5e4380490349c45ea583503 | push 成功，ls-remote 已核对 |
| 2 | backup/pre-phase-2-20260907 | b3b32a4bdd3d65a175bb04d823644288c1a3b627 | b3b32a4bdd3d65a175bb04d823644288c1a3b627 | push 成功，ls-remote 已核对 |
| 3 | backup/pre-phase-3-20260907 | 42d74e560a0719ad598fb052db3f2a35519e61b1 | 42d74e560a0719ad598fb052db3f2a35519e61b1 | push 成功，ls-remote 已核对 |

重要 Phase 前创建同名规则备份，若已存在先比对，不能覆盖；同日重复用短序号。`git branch backup/... <已核对HEAD>` 不切换工作区；显式 push 该 ref。权限失败记 REMOTE_BACKUP_PENDING，继续不依赖推送的工作但不声称远端已备份。

禁止 reset --hard、clean -fd、push --force 和任何等价破坏/强制覆盖。禁止 worktree、擅自 stash、删除用户改动；不未经验收合入 main。

安全恢复：先记录当前状态及提交、保存用户工作（未经许可不自动处理），用 `git show <baseline>:<path>` 只读对比。需要撤回本轮已提交变更时审查明确提交并使用 `git revert <明确commit>` 形成新提交；逐个解决冲突并测试，不回写历史。备份 branch 是恢复参考而不是许可整树覆盖。只有确认工作区无重叠改动时才进行分支切换。

日志与 HANDOFF 记录阶段 commit、remote hash、push 状态；以最后一次实际查询为准。

## Phase 1备份与提交核验

backup/pre-phase-1-20260907的local/remote均为bba40d575a641f22a5e4380490349c45ea583503，push成功且ls-remote核对。官方源核验提交36d93282ca8344028702dc0905488556ce775042亦已push并核远端；源提交后工作区干净。
