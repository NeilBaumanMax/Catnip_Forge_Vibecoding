# 旧网页自动化与 Python Scaffold 冻结施工基线

## 决策

自 2026-07-25 起，下列能力进入“保留但暂不施工”的冻结兼容区：

- Electron / Runtime 的网页操作录制、回放和 workflow。
- 网页搜索预处理、网页采集、爬虫及相关辅助脚本。
- 旧 Python `coddecat` scaffold 的配置、测试和包声明。
- 当前隐藏的浏览器工作台、`WebContentsView`、CDP、Playwright 及其既有桥接代码。

这些能力开发时间较早，可能仍被历史入口、打包资源或运行链路间接引用。冻结不等于废弃，也不授权清理或删除。

2026-07-25 后续明确要求所有 Skill 以独立目录呈现，因此网页类 Skill 的 Markdown 入口允许从顶层扁平文件迁移为 `<skill-id>/SKILL.md`。这是保留内容和 Git 历史的结构标准化，不代表网页自动化功能解冻；网页代码、脚本、运行链路和功能范围继续冻结。

## 保留边界

在用户重新明确启动这条功能线之前：

1. 不删除、移动或批量重命名上述源码、测试、配置、脚本和文档；唯一已授权例外是 Skill 主文档迁移为标准 `<skill-id>/SKILL.md` 目录。
2. 不主动重构录制/回放格式，不新增 crawler、workflow 或平台搜索能力。
3. 不为修复全量测试而伪造缺失的 `src/coddecat` 实现。
4. `tests/test_scaffold.py` 与 `pyproject.toml` 中的 `coddecat` 声明原样保留，作为早期设计和接口预期的证据。
5. 若主线改动触及共享模块，应优先保持旧接口可编译或可回退；确需破坏兼容时，必须先单独评估并取得用户确认。
6. 安全漏洞、密钥泄露、阻断应用启动或阻断打包的问题不受冻结限制，可以做最小必要修复，但不得借机扩展功能。

## 旧 `coddecat` 的已知边界

当前 Git 历史没有提交过 `src/coddecat` 的实际实现，只保留了外围预期：

- `coddecat.common`：`TaskRequest`、YAML 配置加载。
- `coddecat.gateway`：初始化 runtime、运行 demo task、列出任务和构建 package bundle。
- `coddecat.cli`：`coddecat` 命令行入口。
- 目标平台配置：抖音、TikTok、淘宝、1688。
- 预期任务产物：输入、任务状态、HTML、截图、原始快照、解析结果、提取数据、最终结果和 workspace manifest。

因此不能把遗留测试失败解释为当前 Electron / Agent / Hardboard 主线回归，也不能在缺少原始实现的情况下推断并重写整套 scaffold。

## 测试口径

- 当前主线健康度以 Runtime、Electron、Agent、Skills、Hardboard、Windows 打包和专项 smoke 为准。
- `pytest tests/test_project.py` 可作为仓库结构检查。
- `pytest tests/` 会在收集 `tests/test_scaffold.py` 时因缺少 `src/coddecat` 失败；该结果记录为“冻结兼容区缺失历史实现”，不作为 v1.0.0 发布阻塞项。
- 网页录制、回放、爬虫、搜索 workflow 和隐藏工作台的专项 smoke 暂不列入近期验收。

## 当前主线

近期施工只聚焦：

1. Windows v1.0.0 发布收口与成品验证。
2. ESP-IDF 编译、烧录、串口及任务管理器闭环。
3. Agent 任务、会话、Skills 和长时间运行稳定性。
4. Monaco 编辑器与工程文件管理。

## 解冻条件

只有用户明确要求恢复网页自动化、网页采集或旧 Python scaffold 开发时才解冻。解冻前先盘点实际引用、运行入口、打包依赖和历史数据格式，再决定恢复、迁移或替换；不得直接以删除重建作为默认方案。
