# GitHub 同步和接力流程

## 目标

把 GitHub remote `origin` 作为远端源码真相源，以 Windows 当前工作区 `E:\Agent\vibeide\vibeide` 为本地施工目录，避免旧迁移镜像继续分叉。

## 当前拓扑

```text
Windows 当前工作区
  E:\Agent\vibeide\vibeide
      ↑↓ git（SSH）
GitHub
  remote origin（SSH）
```

历史迁移曾使用 Linux 工作区、Windows `C:\vibeide`、`E:\vibeide` 和 `E:\vibeide-0.1-win-unpacked`。这些路径只用于理解旧日志和测试报告，不再作为当前开工、启动或打包目录。

## 已完成

- GitHub SSH 访问已验证。
- 当前开发仓库为 `Catnip_Forge_Vibecoding`，主分支为 `main`，对外发布标签为 `v1.5.0`，内部应用包版本为 `1.0.0-7201`。`qwen_vision_attachments` 已于 2026-08-08 完成验收并合入主线。提交号和远端跟踪状态属于动态事实，必须以本地 `git log -1`、`git branch -vv` 和 `git remote -v` 为准，不再把历史 HEAD 写成当前值。
- 2026-07-25 的“只维护本地 Git”是当次任务级例外，现已结束。当前完成验证和验收后应推送施工分支并查询远端确认；不得把施工分支默认推入 `main`。
- `electron_fix_neil` 早期推送曾因 GitHub HTTPS 连接重置失败；远端分支事实不能根据本地分支存在与否推断，必须以成功的 `git push` 或远端查询结果为准。
- Windows SSH 已连通。
- `C:\vibeide`、`E:\vibeide` 与 `E:\vibeide-0.1-win-unpacked` 是历史同步目标；当前唯一施工目录为 `E:\Agent\vibeide\vibeide`，不得再将旧目录描述为当前同步状态。
- 本机连接与身份信息不得写入项目文档或版本库。

## 推荐长期流程

1. 本机从 GitHub 拉取：

```bash
git pull --ff-only origin main
```

2. 本机修改、验证、提交：

```bash
git status --short
git add <明确文件>
git commit -m "docs: refresh vibeide handoff and development docs"
git push -u origin <当前分支>
```

3. 新 Windows 工作区从 GitHub clone/pull：

```powershell
cd E:\Agent\vibeide
git clone <repository-ssh-url> vibeide
cd E:\Agent\vibeide\vibeide
npm --prefix runtime install
npm --prefix electron install
npm --prefix agent install
```

4. 日常只在 `E:\Agent\vibeide\vibeide` 修改、验证和提交。不要再把旧 C/E 盘镜像当作并行真相源。

## 历史：从 Windows 裸目录重新同步源码

以下命令只保留为 0.1 阶段的迁移记录，不用于当前 `E:\Agent\vibeide\vibeide` 工作区。当前应直接使用 Git 分支同步。

主源码包：

```bash
ssh <windows-user>@<windows-host> "tar -a -cf C:\Users\<windows-user>\AppData\Local\Temp\vibeide-source.zip --exclude=./electron/node_modules --exclude=./electron/dist-package --exclude=./electron/dist-package.zip --exclude=./agent/node_modules --exclude=./agent/logs --exclude=./agent/screenshots --exclude=./agent/recordings --exclude=./_bundled --exclude=./apikey.txt -C E:\vibeide ."
scp <windows-user>@<windows-host>:/C:/Users/<windows-user>/AppData/Local/Temp/vibeide-source.zip ../vibeide-source.zip
unzip -o ../vibeide-source.zip
```

Runtime 源码包：

```bash
ssh <windows-user>@<windows-host> "tar -a -cf C:\Users\<windows-user>\AppData\Local\Temp\vibeide-runtime-source.zip --exclude=./node_modules --exclude=./dist --exclude=./chrome_profile --exclude=./recordings --exclude=./workflows -C E:\vibeide\runtime ."
scp <windows-user>@<windows-host>:/C:/Users/<windows-user>/AppData/Local/Temp/vibeide-runtime-source.zip ../vibeide-runtime-source.zip
mkdir -p runtime
unzip -o ../vibeide-runtime-source.zip -d runtime
```

## 推送前排除清单

必须确认这些不进 Git：

```text
.claude/
agent/.claude/
apikey.txt
.env
node_modules/
electron/dist/
electron/dist-package/
electron/dist-package.zip
runtime/dist/
runtime/chrome_profile/
runtime/recordings/
runtime/workflows/
runtime/logs/
agent/logs/
agent/screenshots/
workplaces/
```

检查命令：

```bash
git status --short --ignored
git check-ignore -v .claude/settings.local.json agent/.claude/settings.json electron/dist/main/index.js || true
```

## 初次入库建议

首次入库已完成。后续提交仍建议只提交：

- 源码：`electron/src/`、`runtime/src/`、`agent/skills/`、`agent/tools/`
- 配置：`config/`、`electron/package.json`、`runtime/package.json`、`agent/package.json`
- 启动脚本：`scripts/`
- 文档：`README.md`、`CLAUDE.md`、`docs/`
- 测试：`tests/test_project.py`

不要提交：

- `electron/dist/`
- `.claude/`
- `agent/.claude/`
