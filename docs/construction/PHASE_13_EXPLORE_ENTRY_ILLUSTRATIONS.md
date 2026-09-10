# Phase 13：探索入口学院呱呱插画

日期：2026-09-11
分支：`catnip-GUAGUA`
基线：`2a7ae185`

## 目标与设计

- 将“找灵感 / 解问题”从纯色块升级为同系列学院呱呱插画入口。
- “找灵感”使用紫色、金色的创意草图与灯泡意象；“解问题”参考用户提供的读书思考、问题气泡、流程图、放大镜与解决灯泡构图。
- 卡片上的中文标题、说明和操作文字继续由 HTML 渲染，图片不烘焙文字，保证清晰度、可访问性和响应式布局。
- 两张最终 PNG 均须具有真实 Alpha 通道；插画作为装饰图，按钮仍保留完整可访问名称与键盘焦点。

## 验收

- 宽布局左右分区不遮挡文字；窄布局插画降低尺寸和透明度，不溢出卡片。
- 深色、浅色、高对比度和减少动态模式保持可用。
- Renderer 构建、Explore UI/布局专项、版本和 Windows 发布包通过。

## 实施记录

- `explore-idea-guagua.png`：学院呱呱伏案画创意草图，使用紫色、长春花蓝与金色光点；第一张用户参考图在本机临时目录已失效，因此按现有吉祥物资产和用户文字意图统一创作。
- `explore-diagnosis-guagua.png`：按可读取的“解问题”参考图提炼读书、放大镜、清单、流程图、问号和灯泡元素，不复制图内标题。
- 两张图均为 `1254 × 1254` RGBA PNG；静态门禁直接检查 PNG color type 为 `6`，避免把棋盘格误当透明背景。
- 卡片为左侧 HTML 信息、右侧装饰插画；焦点、点击语义和既有“找灵感 / 解问题”流程不变。
- 布局门禁覆盖 `534px` 至 `1802px` 的 Explore 面板宽度，检查图片完成加载、右侧锚定和标题/说明不与图片区域相交，并产出 `electron/.tmp/explore-entry-layout-ui.png` 供人工复核。

## 测试记录

- `npm.cmd --prefix electron run verify:explore-ui`：通过。
- `npm.cmd --prefix electron run typecheck`：通过。
- `npm.cmd --prefix electron run build:renderer`：通过；Vite 仅保留既有大 chunk 提示。
- `npm.cmd --prefix electron run verify:explore-layout-ui`：通过；8 组响应式场景、完整诊断流程和主题切换均通过，无 Renderer error。Windows 偶发报告临时 Chromium profile `EPERM` 清理提示，但脚本最终退出码为 `0`。
- `npm.cmd --prefix runtime run typecheck`：通过。
- `npm.cmd --prefix electron run build:main`：通过。
- `npm.cmd --prefix electron run pack:win`：通过；生成 `electron/dist-package/win-unpacked/Catnip Forge.exe`。
- `npm.cmd --prefix electron run verify:release`：通过；公开版本 `v2.0.0`、Build `7201`、完整资源 `4,468,679,868` bytes，未打包 DeepSeek/Qwen API Key。
- `npm.cmd --prefix electron run verify:version`：通过；Windows 文件版本 `2.0.0.7201`。
- `git diff --check`：通过；仅保留 Git 对 Windows 后续 CRLF 转换的提示。
