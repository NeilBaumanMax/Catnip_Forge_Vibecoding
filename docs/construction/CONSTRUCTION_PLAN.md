# Phase 施工计划

顺序固定，Phase 内小闭环。无重大阻塞不形式询问；出现用户列明停工条件时停止。每项范围、证据、测试先明确再编码。不得 worktree 或开其他产品分支。

| Phase | 小闭环与最小修改范围 | 验收门禁 |
| --- | --- | --- |
| 0 | 现场/Git/旧文档、Product Truth、Decision/Assumption、分层/测试/Git 基线；只 AGENTS 与新文档 | 要求文件齐备、测试执行且失败记录、远端备份真实、无业务修改、文档先提交推送 |
| 1 | 1a 官方 ZIP 来源/完整性及状态；1b 宿主标准 Skill 兼容、support sync、显式 @zhihu；1c 官方 CLI 授权边界与 packaged resource 检查 | 真实包存在；无 vendor 改写；反例测试→修根因；开发发现/部署/显式加载契约；真实 status；过滤器包含全树；无 Secret；实际 LLM 调用和新成品未测时单列 |
| 2 | 2a 验证 A1/A2 并定最小 domain 对象；2b Main user-data store 与 IPC；2c 相关发现和用户选择 | Explore Request/Context/Source/Idea/Diagnosis/Handoff/Knowledge/Verification 最小字段可校验；原子保存/重启/坏文件/选择拒绝测试；无 UI 扩展/新 DB 服务 |
| 3 | 3a 复用 Worker 的受限分析/计划能力；3b 探索入口和灵感流程；3c Handoff 与确认前保护 | 模糊目标自动检索，Idea 为主且真实引用；Context 匹配；交现有 Agent 只出计划；未确认文件不变、硬件不动；无 Secret 记 live pending |
| 4 | 4a Context gatherer 有界读取和勾选；4b 监视器/任务最小分析入口；4c 双搜索 Diagnosis；4d 同队列确认执行与实机验证 | 软件：真实来源、项目/时间归属、源冲突保留、Handoff 状态和确认门禁；硬件：确认后真实修改/Build/Flash/Serial，缺失单列 REAL_HARDWARE_VALIDATION_PENDING |
| 5 | 5a 主动收藏与重启；5b 历史相关卡发现经用户选择；5c 真实验证回写 | A 收藏→重启→发现→拒绝不入 Context；B 真实有效→项目验证记录；C 失败→明确无效/失败记录；不做 OAuth |
| 6 | 回归、安全、Windows 包、冷启动、Skill 入包、两 Demo、文档/Git 收尾 | 软件全通过；真实搜索/设备/包有证据；无 Secret；baseline/backup/commit/远端一致；不扩功能 |

## Phase 1 已定位的最小工程范围

- 新增 `agent/skills/zhihu`，按用户 ZIP 原字节导入，不创建假 Skill。
- `skill-manager.ts`：标准目录 SKILL.md 部署保真，展示所需 multiline description 正确解析；旧扁平兼容保持。先回归证明当前 `>-` 和部署改写问题。
- `context.ts` / 产品 Agent 规则仅在确有冲突时最小区分官方 Skill 搜索与旧 browser 搜索；不改旧平台业务实现。
- 集成测试：真实目录、manifest/support hash、显式位置校验、Worker 加载指令、打包过滤器；不拿构造的 tool event 冒充真实 LLM 加载。
- 第一条实际官方调用必须是 `scripts/run.ps1 status`。若需 CLI 安装/升级则按官方明确授权规则停，不继续 Phase 2 绕开。

## Review / 第一性原理（2026-09-07）

没有第二套 Agent/IPC 执行系统，没有数据库预设或新云端。最可能导致“看起来成功”的错误是未确认修改、自由文本结果解析、来源伪造、mock 当硬件；将它们前置为可验证门禁。最大复用风险是旧 Chat 无权限隔离，因此不能先接 UI 再补安全。当前最简单可靠路线是官方 Skill → 可校验数据/受限执行契约 → 两条 UI 闭环 → 知识反馈 → 成品。
