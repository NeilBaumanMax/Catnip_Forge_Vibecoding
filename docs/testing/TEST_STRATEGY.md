# Test Strategy
Lifecycle: ACTIVE · Development verification，产品硬件 Build 单独记证据。

| Level | 触发 | 范围 |
| --- | --- | --- |
| FAST | 每个 patch | 相关类型/静态契约、导航、架构、开发工具快速测试；不生成生产包 |
| MODULE | 目标模块行为变化 | 相关已有专项；Main-dependent 测试共享一次 Main 编译 |
| INTEGRATION | IPC/跨模块/公共类型变化、未知路径 | 更广离线组合；单次聚合按构建依赖去重 |
| RELEASE | 明确准备发布 | Runtime/Renderer生产构建、打包、packaged首启/restart、真实环境/硬件验收 |

旧 verify:* 命令保留用户语义。聚合入口在本轮 Phase 2 提供；实现前继续按原命令运行，不假称已有命令。
地图 tests 使用 electron/package.json 已存在的脚本名；fast/module/integration 是建议，不证明真实环境成功。
UNKNOWN 必须扩至 INTEGRATION；发布/实机检查列为显式 requirements，不由 changed 自动执行。
无变更时也运行 FAST；不识别不能返回空验证成功。
测试可能写临时目录，先审副作用；共享夹具串行，失败保留完整 stderr/根因/复测。
不机械 npm install：仅 node_modules 缺失、manifest/lock变化或明确 dependency repair 时评估安装必要性。
CURRENT_TEST_STATUS 只更新各项当前结论/证据目标；详细命令进入 evidence/TASK-XXXX.md。
本轮开发基础设施回归需要最终类型/Main/Renderer/Runtime构建；以后普通 UI patch 不默认做 production build。
