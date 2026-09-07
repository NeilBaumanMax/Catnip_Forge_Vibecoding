# 探索 / 官方 Zhihu Skill MVP 施工主约束

Product Truth：[已确认需求](../product/PRODUCT_REQUIREMENTS.md)。决定索引：[D001–D020](DECISION_LOG.md)。现场证据：[当前状态报告](PROJECT_STATE_REPORT.md)。用户需求优先于旧规则；历史文档不能授权额外功能。

## 范围与完成定义

按 Phase 0–6 增量完成官方 Skill、最小 domain/store、找灵感、排障、知识反馈、桌面交付。每个 Phase 小闭环先文档再业务代码；Phase 0 只文档/AGENTS.md。不 worktree，不大规模重构，不重写既有 Agent/Runtime/Skill/Hardboard。全部不做内容以 Product Truth §8 为准。

最终完成必须满足 Product Truth §9；软件成功不能替代 live 搜索、实机或成品验收。真实 API 缺失记 `LIVE_INTEGRATION_PENDING`；实机缺失记 `REAL_HARDWARE_VALIDATION_PENDING`；推送备份失败记 `REMOTE_BACKUP_PENDING`。不得编造来源和已验证状态。

## 必须停止的情况

官方 Skill 缺失；产品与代码根本冲突；必须覆盖大量用户工作；未提交修改高度冲突；需要真实 Secret；官方 CLI 安装/升级或授权需用户确认；无权限的实机操作；两方案产生明显不同产品行为；核心 API 实测无法满足需求。报告事实、冲突、影响和一个具体决定，不开始其他分支工作。

当前缺口（权限门禁、结构化输出、多行 Skill 描述）是拟实现/验证范围，不是改变产品方向的理由。未证明不可实现；若运行验证证明根本不可行，再停止。

## Assumption Register

状态仅限 UNVERIFIED / TESTING / CONFIRMED / REJECTED / BLOCKED。以下按 2026-09-07 Phase 0 证据登记。

| ID | 假设内容 | 为什么仍是假设 | 错误时影响 | 验证方式 | 状态 | 验证证据 | 模块 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 复用 chat/worker/skillRefs/queue 可支撑 Explore | 已有文本请求与单队列，未有 Explore 受限模式 | Handoff 安全与返回通道受阻 | 原型验证任务 ID、取消、模式隔离及确认门禁；必要时记录最小接口理由 | TESTING | gateway chat:send、orchestrator submitTask；agent.ts skip-permissions | Main/Worker/Agent |
| A2 | 现有 CLI 能可靠输出结构化 Idea/Diagnosis | stream-json 只是传输事件，不是业务 schema；尚无 schema 输出验证 | UI 无法稳定消费判断 | 本地 CLI help/能力检查，真实模型 schema 返回与非法响应拒绝测试 | UNVERIFIED | agent.ts stream-json、chat-buffer.ts；未发现 Explore Result | Agent/domain |
| A3 | 原子 JSON user-data 足以存知识卡 | 现有 session-store JSON，但知识存储/恢复尚未实现 | 跨重启丢失、损坏或混入安装目录 | 原子替换、重启、损坏处理和项目关联测试 | TESTING | paths.ts getRuntimeDataDir；session-store.ts writeFileSync | Local Store/Main |
| A4 | 可从当前工程和 main/CMakeLists 收集最小相关源码 | 已有受控读取/文件索引；相关性与限额尚未定 | 过量读取或漏掉关键证据 | 单工程白名单、路径越界、截断、用户取消测试 | TESTING | workbench readWorkbenchFile、hardboard/project-files.ts；不能直接把全部候选注入 | Main/Context |
| A5 | EventBus 和共享串口能稳定提供最新 Context | 已有最近 500 事件与串口增量读取；项目关联/过期需验证 | 误用其他工程或旧运行数据 | taskId/projectDir/timestamp 筛选、无数据/过期/清空场景 | TESTING | event-store getRecentRuntimeEvents、SerialMonitorSession.read/wait | Runtime/Main |
| A6 | 官方CLI在Windows开发和打包版可运行 | ZIP已导入，status显示未就绪，安装/成品未验证 | Phase 1与真实搜索阻塞 | 用户授权后原setup，再status/包验证 | BLOCKED | run.ps1 status: installed=false / request_install_consent；见PHASE_1_ZHIHU_SKILL | Official Skill/Packaging |
| A7 | 用户已配置可用 Access Secret | 未读取/索取/验证凭证 | 只能做无鉴权边界测试 | 官方 status；必要时经安全通道配置并最小搜索 | UNVERIFIED | 本轮未执行鉴权请求 | CLI/Main |
| A8 | 有可复现运行异常的真实板/工程可做 Demo | 发现三个工程，未连接或选择故障 | 排障不能称完整闭环 | 用户确认项目/端口后实测 Build/Flash/Serial | UNVERIFIED | hello_world_esp32s3、touch_hello、wifi_connect_fmai；无板证据 | Hardboard/Demo |
| A9 | 延续现有 UI 能容纳探索 | 页签与设计文件存在，尚无探索视觉验收 | 布局和交互需调整 | 后续功能 UI + 现有 CDP smoke；视觉不自行定稿扩展 | UNVERIFIED | BrowserPanel 四页签、apple.less/global.less | Renderer |

## 风险与 Review 结论

1. 标准 Skill 多行 description 当前会变成 `>-`，部署重写文件；属于宿主兼容 Bug。
2. `agent/CLAUDE.md` 和自动建议的 browser/search Skills 有旧“所有搜索先平台 URL”规则。官方 Skill 搜索必须通过最小显式能力路由解除不适用约束，保留旧浏览器功能。
3. 现有 Agent `--dangerously-skip-permissions`、系统提示“先创建骨架”不适用于 Explore/Plan。需要执行层拒绝，而非自由文本 heuristic。
4. 本地 JSON 现状不是对写入可靠性的保证；新 store 必须原子写与损坏显式报错。
5. EventBus 最近事件虽有限，但当前实现读取日志文件再截尾；Explore 不得放大为全历史读取，需测性能和界限。

第一性原理：最短路径是把知识搜集和证据交接加入现有能力边界，不把新页面当新执行系统；先验证官方 Skill 和受限结构化任务，再加用户界面。当前计划未引入新依赖服务或未确认产品功能。
