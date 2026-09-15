# Development Workflow
Lifecycle: ACTIVE · Canonical development procedure · supersedes prior global append-only workflow.

## Maintenance Mode（默认）
1. 用户任务 → PROJECT_INDEX / project-map → CURRENT → 目标Contract；P0–P4与预算遵循根AGENTS。
2. 建Task Context，明确读写范围、测试、风险及恢复点。普通小任务Context在实施前写好，可随首次实现提交；大型/跨模块任务先独立计划提交/push/核hash。
3. 重要阶段前建立远端备份并核对；用户修改绕开，不stash/reset/clean。
4. 小步实施 → Review → FAST/MODULE；公共接口/未知路由升级INTEGRATION。RELEASE只在明确发布任务。
5. 失败先判baseline与本次归因；根因局部且不越scope/invariant才Repair。扩散/不明确/需未授权架构变化则停下重新划任务或回滚该阶段。
6. 任务evidence保留命令、首次失败、stderr、根因、复测及Repair/Rollback决定；CURRENT_TEST_STATUS只保留当前摘要。
7. 精确暂存 → staged diff review → commit → push origin/DWIDE → ls-remote核hash；未经验收不推main。
8. 结束时同一Task文件从active归archive，更新CURRENT。勿复制维护第二份任务记录。
默认不install、不读完整历史、不生产构建、不更新全局LOG/DEV_PROGRESS；依赖确有变化才评估安装。

## Bootstrap Mode
仅新项目/大型新子系统：Idea → Product → Architecture → Knowledge → Construction，然后按Maintenance闭环实现。已有产品局部任务不重走全链。
产品真相变更仍需用户授权；Development infrastructure规则调整可按用户本轮授权实施。

## Lifecycle / safety
[ADR-0001](../decisions/ADR-0001-development-knowledge.md)定义唯一来源和旧文档生命周期。
[TOOL_POLICY](TOOL_POLICY.md)保留Git/路径/Secret/官方Skill/硬件安全细节；普通任务按需读。
本ACTIVE版本提交后旧“每项必须更新DEV_PROGRESS/LOG/HANDOFF/TEST_METRICS”的要求失效。
不把文档中的历史hash当实时Git，不在提交内容中伪造自身最终hash；最终回复提供动态远端核对结果。
