# Phase 3b1：知乎开放平台安全连接施工基线

日期：2026-09-08。前置文档修正提交 `afc22fc8078b274886f5fb838668d30c18a3794f` 已推送并与 `origin/idea_to_production` 核对一致。本文必须独立提交、推送并核对远端后，才允许修改业务源码。

## 用户结果

探索页在“需要连接”时提供两个明确动作：

1. 打开知乎开放平台个人中心，让用户登录并申请自己的 Access Secret。
2. 启动由 Catnip 宿主拥有的 Windows 安全输入窗口。用户在该窗口粘贴 Access Secret，输入被遮蔽；完成后回到探索页点击“重新检查”。

当前小闭环只完成连接配置入口，不执行知乎/全网搜索，不调用 DeepSeek，不修改工程，不 Build/Flash/Serial。

## 安全与分层设计

- Renderer 只能发送无参数的“开始安全配置”动作；不得出现 Secret 文本框，不得把完整值放入 IPC、React state、URL、Chat 或 Agent prompt。
- Main 只定位官方 `agent/skills/zhihu/scripts/run.ps1`，打开固定官方个人中心 URL，并启动宿主脚本；不接收 Secret，不读取配置进程 stdout/stderr，不记录用户输入。
- 宿主脚本位于 `agent/host-tools/`，不修改官方 `agent/skills/zhihu` vendor。脚本用 `Read-Host -AsSecureString` 接收遮蔽输入，在内存中最短时间转为明文，只通过子进程 stdin 调用官方 `run.ps1 auth set --secret-stdin`，finally 中清理非托管内存和变量。
- 启动命令行只包含脚本路径，不包含 Secret；配置窗口必须可见、由用户主动操作。应用不自动验证本人数据，不自动重试。
- 页面只获得 launched/already_connected/unavailable 等安全结果和固定文案。真正是否连接仍以用户点击“重新检查”后官方 status 为准。
- 固定个人中心 URL 为 `https://developer.zhihu.com/profile`；Renderer 不直接打开任意 URL。

## 最小修改范围

- 新增 `agent/host-tools/configure-zhihu-secret.ps1`。
- 扩展 `electron/src/common/explore.ts`：无敏感字段的连接启动结果。
- 扩展 `electron/src/main/explore-zhihu-status.ts`：固定 URL 打开、可见安全窗口启动、IPC 注册；保留既有 status 行为。
- 扩展 `electron/src/preload/index.ts`、`electron/src/renderer/types/index.ts`、`electron/src/renderer/components/ExplorePanel.tsx`。
- 新增 `electron/scripts/verify_explore_zhihu_connection.cjs` 并在 `electron/package.json` 注册专项。
- 同步本轮施工进度、分层、测试和只追加日志。不得修改官方 `agent/skills/zhihu/**`、Worker/Agent、Runtime/Hardboard 或搜索实现。

## 程序门禁与反例

专项至少证明：

- Renderer/preload API 为零参数，不存在 secret/accessSecret 字段或携密 IPC。
- Main 只允许固定官方 URL 和固定宿主脚本；spawn 参数不含凭证值，`windowsHide=false`。
- 宿主脚本使用遮蔽输入与 `--secret-stdin`，不把 Secret 写文件、环境变量、命令参数或输出。
- 未安装、组件不兼容、已连接、重复点击等状态返回固定安全结果；不会启动错误流程。
- 既有 status、request、Explore UI、Skill 包保真、typecheck、Main/Renderer build 回归通过。

离线测试使用假 spawn/openExternal 注入或静态契约，不输入真实 Secret，不调用官方业务 API。真实配置仍标记 `LIVE_INTEGRATION_PENDING`，直到用户亲自完成并允许验收。

## 停止条件

- 若 Windows 可见遮蔽输入无法在不经过 Renderer/Chat 的情况下实现，停止并报告，不降级为页面文本框。
- 若必须修改官方 vendor 脚本、把 Secret 放入命令行/环境变量/日志，停止并重新设计。
- 若成品无法包含宿主脚本，保留开发态结果但不得称成品可连接。
