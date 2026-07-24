# 重构计划

## 目标

把当前从 Windows 裸目录接出的项目整理成可持续开发的 GitHub 仓库，并为下一步功能重构建立清晰边界。

## 阶段 0：入库前整理

状态：进行中。

目标：

- README 保持为 Catnip Forge 当前真实主线。
- 新建统一 docs 体系。
- 排除敏感信息、依赖、构建产物、运行态。
- 把 GitHub 作为源码真相源。

验收：

- `README.md` 不再以旧 `coddecat` 纯 Python scaffold 为主。
- `docs/INDEX.md` 存在并能串起核心文档。
- `.local-secrets/`、`.claude/`、`agent/.claude/`、`electron/dist/` 被 ignore。
- `git status --short --ignored` 可解释。

## 阶段 1：命名统一

状态：

- 用户可见正式名：Catnip Forge；中文全称：Catnip 硬件智能开发平台；英文定位：Autonomous Hardware Development Agent。
- GitHub 仓库和内部工程代号：`vibeide`。
- Electron package/runtime/agent npm 包名仍为 `@vibeide/*`，这是当前兼容策略。
- 旧 `coffecat/coddecat` 只应出现在历史记录、legacy 测试或迁移说明中。

后续建议：

1. 不要把用户可见名称改回 `vibeide`。
2. 如需把内部包名和 `vibeide` 兼容键也改成 catnip-forge，必须先设计 appData、API key、Chrome profile、日志目录和安装包升级兼容。
3. 历史 `coffecat/coddecat` 只保留在明确标注为 legacy 的文档或测试里。

验收：

- `grep -R "coffecat\\|coddecat" README.md docs electron runtime agent package*.json pyproject.toml` 只剩兼容说明或迁移注释。
- Electron 启动后 UI 显示 `Catnip Forge`。

## 阶段 2：旧 Python scaffold 决策

状态：冻结保留，暂不施工。

2026-07-25 决策：

- `tests/test_scaffold.py`、`pyproject.toml`、YAML 配置和相关辅助脚本全部保留，不删除、不移动、不重写。
- 当前 Git 历史没有 `src/coddecat` 实现，不能凭遗留测试反向伪造整套实现。
- 全量 `pytest` 的收集失败不作为 Electron / Agent / Hardboard 主线回归或发布阻塞。
- 只有用户明确要求恢复旧 Python scaffold 时，才重新盘点其来源、接口和迁移方案。

验收：

- 旧文件保持原样可追溯。
- 主线文档和测试报告明确区分冻结兼容区与当前产品回归。
- 详细规则见 [LEGACY_WEB_AUTOMATION_CONSTRUCTION](LEGACY_WEB_AUTOMATION_CONSTRUCTION.md)。

## 阶段 3：录制/回放边界统一

状态：冻结保留，暂不施工。

- Electron 与 Runtime 两套既有录制/回放实现都保留，当前不统一格式、不补转换层、不扩展复杂跨页流程。
- 隐藏工作台、`WebContentsView`、CDP、Playwright 和相关桥接不得因“当前不用”而删除。
- 主线改动触及共享模块时只做保持兼容所需的最小调整。

## 阶段 4：Runtime 工作流产品化

状态：冻结保留，暂不施工。

- 暂不增加 workflow 版本、selector 校验、示例流程、爬虫或平台搜索脚本。
- 既有 workflow 数据格式和入口保留，等待用户明确解冻后再制定产品化方案。

## 阶段 5：Windows 开发体验

目标：

- Windows 端直接 `git pull` 后能启动。
- 不依赖手工复制大目录。
- 不把运行态带进仓库。

建议：

- 补 `scripts/bootstrap_windows.ps1`。
- 检查 Node、npm、Git、OpenSSH。
- 安装 `runtime/electron/agent` 依赖。
- 创建 `apikey.txt` 模板提醒，不写真实 key。

验收：

- 新 Windows 机器按 README 可以从 clone 到启动。
- 旧 `C:\vibecodingide` 可被 `C:\vibeide` Git 目录替代。
