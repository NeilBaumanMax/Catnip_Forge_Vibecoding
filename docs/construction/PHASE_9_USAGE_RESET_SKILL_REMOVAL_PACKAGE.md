# Phase 9：使用记录清理、四个 Skill 移除与重新打包

日期：2026-09-10

状态：`COMPLETE`。用户已明确授权删除指定使用记录与四个 Skill，并要求完成 Windows 打包。本文件先定义精确删除边界、验证和恢复点，再执行破坏性操作。

施工前远端备份：`origin/backup/pre-phase-9-20260910` → `f976be8eaf8794f45da1e1ddd8612d16ab237010`，已通过 `git ls-remote` 核对。

## 删除范围

1. 所有已登记工程内 `.catnip/` 的 `agent/`、`explore/`、`handoffs/`：工程 Agent conversations、Explore Idea/Diagnosis 草稿与独立对话、handoff artifact。工程业务源码、`.catnip/manifest.json` 和 `.gitignore` 保留；下次打开工程时生成新的空记录。
2. 当前 Catnip userData 的 `explore/knowledge.json`、`project-sessions/<projectId>/agent|explore`、`project-sessions/unassigned/agent`，以及开发目录的旧 `runtime/claude-session/session.json`。这会删除收藏知识、旧工程会话副本和未归属 Agent 历史；工程注册表 `project-sessions/index.json`、API Key、浏览器资料、录屏、日志、Runtime 事件与硬件工程不在范围内。
3. 四个 Skill：`1688-source-finding`、`bilibili-search-workflow`、`douyin-product-rank`、`taobao-listing`。删除开发源 `agent/skills/<id>`、开发部署 `runtime/agent-workspace/.claude/skills/<id>`、当前 userData 部署副本，并移除源码中的快捷映射/残留引用。旧打包目录会在重新打包时由新产物覆盖。

## 安全与恢复

- 删除前停止本轮启动的开发进程，逐个解析并核对绝对路径；不得使用仓库根、用户目录或未解析变量作为递归删除目标。安全审查已拒绝过一次整删 `project-sessions`/`.catnip` 的过宽命令且该命令未执行，随后按上述叶子目录收窄。
- Git 跟踪的 Skill 源文件可从施工前备份分支恢复；被删除的用户会话、Explore 草稿/交接和收藏不建立副本，符合用户“删除使用记录”的意图，删除后不可从产品内恢复。
- 不读取或输出 API Key，不修改官方 `zhihu` vendor，不删除其他 Skill。

## 验收门禁

- 精确目标全部不存在；其他 Skill、工程业务文件和 Key 路径保持原状。
- 全仓库产品代码/Skill 中不再引用四个 ID；Skill Manager 专项、Runtime/Electron typecheck/build、相关 Explore/Project/Session 回归通过。
- `pack:win` 成功；新 `win-unpacked`/安装包不含四个 Skill，`verify:release`、`verify:version` 和 app.asar/资源检查通过。
- 不把清空后的用户数据或打包产物提交到 Git；只精确提交 Skill 源删除、引用修正与施工文档。

## 最终结果（2026-09-10）

- 聊天/Explore/收藏记录已按精确叶子目录删除；工程注册表、`.catnip/manifest.json`、工程源码、其他 Skill、API Key、浏览器资料、日志、录屏和 Runtime 事件保留。
- 四个 Skill 的源码、开发部署、当前 userData 部署和旧包副本均已清除；Skill Manager 当前部署 9 个 Skill。
- `pack:win` 成功生成 `electron/dist-package/win-unpacked/Catnip Forge.exe`，包体 4,464,671,335 字节；`verify:release`、`verify:version`、`verify:skills` 通过。包内四个 Skill、`.catnip` 和真实 Key 均不存在。
- 清理后的用户数据不可从产品内恢复；四个 Git 源 Skill 可从 `backup/pre-phase-9-20260910` 恢复。真实硬件验证仍不属于本轮。
