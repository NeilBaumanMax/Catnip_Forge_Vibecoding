# Phase 9：使用记录清理、四个 Skill 移除与重新打包

日期：2026-09-10

状态：用户已明确授权删除指定使用记录与四个 Skill，并要求完成 Windows 打包。本文件先定义精确删除边界、验证和恢复点，再执行破坏性操作。

施工前远端备份：`origin/backup/pre-phase-9-20260910` → `f976be8eaf8794f45da1e1ddd8612d16ab237010`，已通过 `git ls-remote` 核对。

## 删除范围

1. 所有已登记工程内的 `.catnip/`：工程 Agent conversations、Explore Idea/Diagnosis 草稿与独立对话、handoff artifact 及状态 manifest。工程业务源码不删除；下次打开工程时可生成新的空状态目录。
2. 当前 Catnip userData 的 `explore/knowledge.json` 与 `project-sessions/`，以及开发目录的旧 `runtime/claude-session/session.json`。这会删除收藏知识、旧工程会话副本、未归属 Agent 历史和最近工程记录；API Key、浏览器资料、录屏、日志、Runtime 事件与硬件工程不在范围内。
3. 四个 Skill：`1688-source-finding`、`bilibili-search-workflow`、`douyin-product-rank`、`taobao-listing`。删除开发源 `agent/skills/<id>`、开发部署 `runtime/agent-workspace/.claude/skills/<id>`、当前 userData 部署副本，并移除源码中的快捷映射/残留引用。旧打包目录会在重新打包时由新产物覆盖。

## 安全与恢复

- 删除前停止本轮启动的开发进程，逐个解析并核对绝对路径；不得使用仓库根、用户目录或未解析变量作为递归删除目标。
- Git 跟踪的 Skill 源文件可从施工前备份分支恢复；被删除的用户会话、Explore 草稿/交接和收藏不建立副本，符合用户“删除使用记录”的意图，删除后不可从产品内恢复。
- 不读取或输出 API Key，不修改官方 `zhihu` vendor，不删除其他 Skill。

## 验收门禁

- 精确目标全部不存在；其他 Skill、工程业务文件和 Key 路径保持原状。
- 全仓库产品代码/Skill 中不再引用四个 ID；Skill Manager 专项、Runtime/Electron typecheck/build、相关 Explore/Project/Session 回归通过。
- `pack:win` 成功；新 `win-unpacked`/安装包不含四个 Skill，`verify:release`、`verify:version` 和 app.asar/资源检查通过。
- 不把清空后的用户数据或打包产物提交到 Git；只精确提交 Skill 源删除、引用修正与施工文档。

