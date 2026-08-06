# 开发流程

## 环境

推荐环境：

- Node.js 22+
- npm
- Python 3.11+
- Git 可访问 `git@github.com:NeilBaumanMax/Catnip-Forge.git`
- Windows 实机用于最终运行验证

## 开工检查

```powershell
cd E:\Agent\vibeide\vibeide
git branch --show-current
git status --short
git remote -v
git branch -vv
git rev-list --left-right --count origin/main...HEAD
```

读文档：

```bash
sed -n '1,220p' README.md
sed -n '1,220p' docs/HANDOFF.md
sed -n '1,260p' docs/ARCHITECTURE.md
sed -n '1,260p' docs/REFACTOR_PLAN.md
sed -n '1,260p' docs/DEVELOPMENT_WORKFLOW_CONSTRUCTION.md
```

## 强制开发闭环

结构性功能、跨模块修改、发布变更和高风险修复必须按以下顺序执行：

1. 检查分支、工作区、远端、用户已有改动和当前文档基线。
2. 编码前新建或更新相关 `*_CONSTRUCTION.md`，写清范围、风险、测试和验收标准。
3. 先提交纯文档施工基线，再进入代码施工；紧急修复例外必须留下原因。
4. 编码后先跑专项测试；失败时修复并重新执行失败项。
5. 执行 Runtime/Electron 类型检查、构建、`git diff --check` 和受影响功能的完整回归。
6. 完成不能由自动测试替代的 UI、真实 API、真实硬件或成品人工验收；无法执行的项目明确标记未验收。
7. 更新专项施工文档、`HANDOFF.md`、`DEV_PROGRESS.md`、`LOG.md` 和相关发布检查表。
8. 精确暂存、复核 staged diff、提交并推送当前施工分支。
9. 查询远端并核对提交号；远端未确认前不得称为已交付。

完整门禁和例外规则见 [DEVELOPMENT_WORKFLOW_CONSTRUCTION](DEVELOPMENT_WORKFLOW_CONSTRUCTION.md)。

## 安装依赖

Runtime：

```bash
cd runtime
npm install
```

Electron：

```bash
cd electron
npm install
```

Agent：

```bash
cd agent
npm install
```

## 启动

Linux / macOS：

```bash
bash scripts/start_electron_desktop.sh
```

Windows PowerShell：

```powershell
cd E:\Agent\vibeide\vibeide
powershell -ExecutionPolicy Bypass -File scripts\start_electron_desktop.ps1
```

Windows CMD：

```cmd
cd /d E:\Agent\vibeide\vibeide
scripts\start_electron_desktop.cmd
```

## 验证

最小结构测试：

```bash
pytest tests/test_project.py
```

Runtime：

```bash
cd runtime
npm run dev
npm run typecheck
```

Electron：

```bash
cd electron
npm run typecheck
npm run build:main
npm run build:renderer
```

搜索 URL 工具：

```bash
node agent/tools/build_platform_search_url.mjs bilibili "何同学"
node agent/tools/build_platform_search_url.mjs taobao "猫粮"
node agent/tools/build_platform_search_url.mjs google "electron windows build"
```

## 测试说明

- `tests/test_project.py`：当前结构测试，应该作为短期 CI 基线。
- `tests/test_scaffold.py`：旧 Python scaffold 测试，当前与主线不一致。重构时需要明确保留、迁移或删除。
- `pytest tests/` 当前不一定代表 Electron 主线健康，因为会包含旧 scaffold 测试。

## 提交规则

不要使用 `git add -A`。

推荐精确添加：

```bash
git add README.md CLAUDE.md .gitignore
git add docs/INDEX.md docs/ARCHITECTURE.md docs/DEVELOPMENT.md docs/GITHUB_SYNC.md docs/REFACTOR_PLAN.md docs/SECURITY.md docs/HANDOFF.md
git add electron/src runtime/src agent/skills agent/tools config scripts tests
```

提交前检查：

```bash
git status --short --ignored
git check-ignore -v .local-secrets/HANDOFF_PRIVATE.md .claude/settings.local.json agent/.claude/settings.json electron/dist/main/index.js || true
git diff --cached --check
```

提交后推送当前施工分支并核对远端：

```bash
git push -u origin <当前分支>
git ls-remote --heads origin <当前分支>
git rev-parse HEAD
```

不得未经合并验收直接推送到 `main`。用户明确要求暂不推送时，应把它记录为本次任务例外，不得默认延续到后续施工。

## 文档收尾

每次结构性改动结束时，至少检查：

- `README.md`
- `docs/INDEX.md`
- `docs/HANDOFF.md`
- `docs/DEV_PROGRESS.md`
- `docs/LOG.md`

如果改动影响架构或边界，同时更新：

- `docs/ARCHITECTURE.md`
- `docs/REFACTOR_PLAN.md`
