# Catnip Forge — Development Agent
Lifecycle: ACTIVE · Maintenance Mode 默认 · 工作区 E:\Agent\vibeide\vibeide，用户指定 DWIDE。
你维护整个产品；产品内 Runtime Agent / agent/CLAUDE.md 不限制已授权的开发源码任务。

## Always Read（冷启动）
1. 用户当前指令与本文件。
2. [Product Truth](docs/product/PRODUCT_REQUIREMENTS.md)（首次读全篇；续接任务按相关章节）。
3. [PROJECT_INDEX](docs/PROJECT_INDEX.md)、[CURRENT](docs/state/CURRENT.md)。
4. CURRENT 指定的 Active Task（若有）；无任务则从[模板](docs/tasks/TASK_TEMPLATE.md)建立短 Context，再实施。
根据 [.vibecoding/project-map.yaml](.vibecoding/project-map.yaml) 路由目标模块，按需加载 Contract / ADR / 源码 / tests；不要默认读全部地图或历史证据。

## Context budget
- P0：Current Task、Product Truth相关章节、目标Contract、Current State。
- P1：触及接口的直接依赖Contract、相关ADR/tests。
- P2：直接相关源码，优先按符号定位和局部读。
- P3：只有调查才读已完成任务/evidence/Git历史。
- P4：无关模块、frozen模块、历史LOG、无关发布史默认不读；确有依赖时在Task记录升级原因。
默认 <=2目标模块、<=1跨层边界、<=8源码文件、0新依赖；4+模块/15+源码文件或贯穿Renderer/Main/Worker/Runtime时先拆Task或记录已授权例外。

## 不变量
原 [Layer Contract](docs/construction/LAYER_CONTRACT.md) 是唯一全局架构契约，按任务加载相关编号。产品要求不变：
Explore只分析、交接先计划、用户明确确认后才允许工程修改/Build/Flash/Serial；程序门禁不可只靠提示词。
复用现有Agent/Skill/任务/Runtime/Hardboard，禁止另建系统/云后端/Web版或改vendor协议。
官方zhihu首次调用先scripts/run.* status；CLI安装升级需官方要求的授权。Secret不进源码、Renderer、Chat、日志、URL、截图、Agent输出或包。
历史知识仅自动发现，经用户选择才加入Context；源码/Build/Flash/运行分别凭真实证据；无实机标REAL_HARDWARE_VALIDATION_PENDING。
Frozen不是可删除；不擅自委派子Agent。

## 日常施工/Git
动态执行git status、branch、HEAD、remote及跟踪检查；仅当前工作区DWIDE，不建worktree，保护用户修改，不stash/reset/clean/force push。
重要阶段前建backup/pre-phase-X-YYYYMMDD、push origin并核hash；失败记REMOTE_BACKUP_PENDING。精确暂存，禁止git add -A；staged review → commit → push DWIDE → ls-remote核hash，未经合并验收不推main。
先Task Context；大型/跨模块任务先独立提交并推送计划再实现。普通小任务可在首次实现提交中携带事先写好的Context，避免纯流程提交膨胀。
按[Test Strategy](docs/testing/TEST_STRATEGY.md)选择FAST/MODULE/INTEGRATION；生产构建/打包/首启/实机属RELEASE，不作为普通小改默认门禁。记录完整命令/首次失败/根因/复测；仅在依赖缺失、manifest/lock变化或明确repair时评估install。
根因明确、局部、不越scope/不变量才Repair；扩大到无关模块或假设错误时重新评估/回滚局部提交，禁止机械patch。
当前状态只改CURRENT，测试摘要只改CURRENT_TEST_STATUS；过程写当前Task及一份evidence，完成归archive。不再要求追加LOG/DEV_PROGRESS/HANDOFF/TEST_METRICS。
完整例外和Bootstrap流程见[WORKFLOW](docs/construction/WORKFLOW.md)；旧施工文件除明确ACTIVE外为REFERENCE或历史，不覆盖本规则。
