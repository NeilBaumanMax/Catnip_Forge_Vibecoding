# TASK-XXXX
Lifecycle: ACTIVE
Status: planned
Owner: Development Agent
Mode: Maintenance

## Intent
一句话说明用户目标。

## Target Modules
从 project-map 选择，默认 <=2。

## Allowed Write Scope
精确文件/目录；预计源码文件 <=8，跨层边界 <=1，新依赖默认0。

## Read-only Dependencies
只读的直接依赖；不是把全仓列进来。

## Forbidden Scope
未授权业务、用户数据、无关/冻结模块。

## Relevant Product Truth
原产品需求的章节/链接，不复制第二套要求。

## Relevant Contracts
目标模块 P0；触及接口的直接依赖 P1。

## Relevant ADRs
只引用相关决策。

## Relevant Source Files
P2 按符号/范围读；列预期入口与搜索词。

## Relevant Tests
FAST / MODULE / INTEGRATION / RELEASE；明确 mock、真实服务/硬件边界。

## Invariants
引用 Layer Contract 编号及局部规则。

## Acceptance Criteria
可验证的行为或工程结果。

## Validation Commands
完整命令；结果只记任务 evidence，当前摘要指向它。

## Rollback Point
Git 恢复点及适用提交；保护用户修改。

## Risks
触发扩大任务/停修/回滚的条件。

## Explicit Exclusions
明确未授权/本轮不验证的范围。
