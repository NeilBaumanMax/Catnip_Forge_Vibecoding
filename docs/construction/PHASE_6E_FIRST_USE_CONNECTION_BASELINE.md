# Phase 6e 首次使用连接向导施工基线

日期：2026-09-09。用户确认的产品行为：用户下载并启动压缩包后，进入“探索”时检测知乎开放平台连接；缺少 Access Secret 时弹出安全输入窗口供用户填写，而不是要求用户把 Secret 发到 Chat。

## 当前差距

- 当前 Renderer 进入探索会检查官方 `scripts/run.ps1 status`，但 `needs_secret` 仅显示按钮，必须再次点击才打开原生遮蔽窗口。
- 官方 Skill 与宿主安全输入窗口已经入包；Secret 经官方 CLI `auth set --secret-stdin` 写系统凭据库，不经过 Renderer、Chat、URL、日志或命令参数。
- 官方 Skill 明确不携带 CLI。全新用户若为 `needs_install`，当前探索页没有安装授权入口，因此无法从下载包内完成首次连接。

## 本小项范围

允许修改：

- `electron/src/common/explore.ts`
- `electron/src/main/explore-zhihu-status.ts`
- `electron/src/preload/index.ts`
- `electron/src/renderer/types/index.ts`
- `electron/src/renderer/components/ExplorePanel.tsx`
- `electron/scripts/verify_explore_zhihu_connection.cjs`
- `electron/scripts/verify_explore_ui.cjs`
- 必要的施工记录文档

实现：

1. 进入探索并检测到 `needs_secret` 后，每次进入最多自动打开一次既有原生遮蔽输入窗口；取消后不循环骚扰，用户仍可手动重开。
2. 检测到 CLI 未安装或不兼容时，显示明确的“安装连接组件”操作。只有用户点击后才调用官方 `scripts/setup.ps1`；点击视为本次安装/修复授权。
3. 安装成功后重新运行官方 status；若仍缺 Secret，立即打开既有安全输入窗口；若已经连接则直接刷新状态。
4. 安装和凭据均不使用 Renderer 文本输入，不输出 Secret，不把官方 CLI 打进安装包，也不修改 vendor Skill。

## 验收

- Main 程序门禁拒绝在非 `needs_install` 状态重复安装；只运行固定官方 setup 路径，限制输出大小和超时。
- UI 契约证明 `needs_secret` 自动触发仅一次、仍有手动入口；`needs_install` 必须经用户点击才安装。
- 原生窗口继续使用 `PasswordBox`、`SecureString`、stdin 和清零；preload 不接受 Secret 参数。
- Electron typecheck、Main/Renderer build、连接专项、Explore UI、Request/搜索 Handoff 回归与 `git diff --check` 通过。
- 本小项不执行真实安装、Secret 配置、搜索、模型或硬件；最新 Windows 候选在后续重打时做成品首次使用验收。

## 风险

- 自动弹窗若未做单次门禁会在取消或轮询时重复出现；用组件生命周期内一次性 ref 防重入。
- 安装需要联网且可能较慢；失败只返回安全摘要，不向 Renderer 透传官方 stdout/stderr。
- 安装/升级属于外部状态变更，必须保留用户点击这一明确授权动作，不能因进入探索而静默执行。
