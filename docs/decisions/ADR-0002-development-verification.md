# ADR-0002 — Targeted verification and bounded guardrails
Lifecycle: ACTIVE · Accepted 2026-09-15 · Development infrastructure only

## Decision
保留所有原 npm 命令字符串。新离线聚合显式声明构建依赖，单轮去重 Main build，串行执行并保留退出码；不跨轮缓存。
FAST 不生成构建产物；MODULE 用现有专项；INTEGRATION 包含全部已审离线专项。RELEASE 必须明确准备环境，不能推断为日常必跑。
verify:changed 第一轮仅生成计划：同时考虑 HEAD 工作区与 untracked，可另加 merge-base 历史；未知/缺专项/跨层/配置变更扩大验证，不自动执行外部副作用。
地图以已有命令导航，开发 runner 的 SAFE 是副作用审查白名单；未审命令显式要求人工准备环境，不能静默省略。

## Why / tradeoffs
不改原单项 wrapper，保护既有调用者；不运行共享成品CDP或自动部署测试，避免“离线验证”改变用户正在使用的产品状态。
静态架构检查只证明直接导入规则，实际授权/项目隔离仍靠已有程序测试。行数提供增长警报，不设为了绿灯拆文件的硬指标。
不引入新包/测试框架，不建立产品 Runtime 对 .vibecoding 的依赖。
Runtime 原两项构建脚本分别服务 event-clear 与实际 Hardboard smoke；本轮不合并真机/生产构建进 FAST。
后续增加跨 Runtime 的离线组需先审查其产物与临时目录边界，再加入显式构建图。

## Sources
[唯一验证策略](../testing/TEST_STRATEGY.md)、[唯一维护规则](../architecture/MAINTAINABILITY.md)、[本轮证据](../testing/evidence/TASK-DEV-MAINT-001.md)。
