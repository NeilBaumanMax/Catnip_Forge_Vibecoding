# 施工循环

1. 读 Product Truth、HANDOFF、当前 Phase，动态查 branch/status/remote/HEAD/upstream/tags；保护用户修改。
2. 找最小范围，登记 Assumption/风险/验收；重要 Phase 建立 origin 备份并核 hash。
3. 先提交施工文档基线，再写业务代码；Phase 0 不写业务实现。
4. 小步修改 → Review 查 Bug → 第一性原理核对 → 专项测试。
5. 失败记录第一次命令/错误/根因，修根因再测；禁止更改正确测试迎合 Bug。
6. 检查重复代码、临时补丁、掩盖问题的 fallback、heuristic 状态猜测、自由文本脆弱解析、破坏现有功能、范围扩张、Product Truth、Renderer 越权、复制 Agent/Runtime、不必要依赖、是否有更简单方案。
7. 临时方案必须记 TEMPORARY_SOLUTION：原因、风险、移除条件。成功不能覆盖失败。
8. 相关 typecheck/build/regression + diff check。当前数据/源码测试与硬件测试分开；真正需要才执行硬件和打包，不能机械跑所有脚本。
9. 更新 DEV_PROGRESS、LOG（只追加）、HANDOFF、TEST_METRICS、相关契约/Assumption。
10. 精确暂存、review staged diff、Commit、Push 当前分支、ls-remote 核 hash，再下一个小项。

每个 Phase 后接力文档必须让没看聊天的 Agent 可继续。远端确认记录采用“已核对提交快照”，不能用一个提交的正文虚称包含它自身 hash；最终记录提交的 HEAD 用 Git 动态查询。

用户报告仅给通过/失败/未验证数量、关键问题；完整命令和首次失败留文档。不以“测试通过”等价已交付。重大停工条件见主约束；普通实现选择自主推进。
