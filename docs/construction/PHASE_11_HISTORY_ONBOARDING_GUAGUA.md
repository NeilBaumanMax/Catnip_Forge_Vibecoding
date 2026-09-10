# Phase 11：探索历史、新手引导与学院呱呱补全

日期：2026-09-11  
施工分支：`catnip-GUAGUA`  
施工基线：`15c54b1f`

## 本轮目标

1. 强化探索会话的工程内持久化：分析结果、对话、交接材料状态与确认执行状态均显式写入当前工程 `.catnip/explore/`，返回首页或重启后可继续查看。
2. 将“探索”和“Neil 的 skill 小站”纳入首次使用导览，说明探索的四步门禁、独立历史以及 Skill 小站与本地 Skill Manager 的职责边界。
3. 统一吉祥物与软件助手名称为“Neil·Bauman's 学院呱呱”，更新其内置使用手册知识。
4. 在学院呱呱聊天框顶部增加作者 Neil Bauman 的 GitHub 介绍；只允许通过 Main 进程白名单调用系统默认浏览器打开 `https://github.com/NeilBaumanMax`。

## 约束与验收门禁

- Explore 仍只负责分析和生成交接；确认前不得修改工程、Build、Flash 或操作串口。
- 不建立第二套 Agent、Skill 或任务系统；历史继续使用现有工程内 Explore Session Store。
- 外部链接不接受 Renderer 任意 URL，Main 进程仅放行固定作者地址。
- 专项验收覆盖：磁盘重读恢复完整对话与交接状态、导览真实点击流程、学院呱呱 UI/知识手册、TypeScript/Main 构建、版本与 Windows 包验证。
- 未进行真实硬件操作，保持 `REAL_HARDWARE_VALIDATION_PENDING`。

## 实施顺序

1. 先扩充持久化回归测试，再补显式保存时点。
2. 更新导览步骤及端到端 UI 流程。
3. 更新知识手册、助手名称与安全外链。
4. Review、专项测试、构建、打包，并记录首次失败和最终结果。

## 施工结果

- Explore 确认执行后的对话、状态、任务 ID 与提示已改为在返回前显式保存；磁盘重读测试覆盖“完整对话 + 交接材料元数据 + 阶段状态”。
- 新手旅程升级到版本 7，新增探索独立历史、四步门禁、Neil 的 skill 小站及本地管理边界，共 24 个稳定目标。
- 学院呱呱使用手册已统一名称和 v2.0.0 信息，并补充探索历史、Skill 小站与作者 GitHub 知识。
- 作者链接通过 `app:open-external` IPC 打开，Main 进程只允许固定 GitHub 地址。

## 验证记录

- `npm.cmd --prefix electron run typecheck`：通过。
- `npm.cmd --prefix electron run build:main`：通过。
- `npm.cmd --prefix electron run build:renderer`：通过；仅保留既有大 chunk 提示。
- `npm.cmd --prefix electron run verify:explore-session`：通过；Electron 输出 Windows `os_crypt`/GPU 环境噪声，不影响断言。
- `npm.cmd --prefix electron run verify:explore-ui`：通过。
- `npm.cmd --prefix electron run verify:explore-layout-ui`：通过；8 组尺寸及完整流程通过，临时 profile 在进程退出时出现一次 `EPERM` 清理提示。
- `npm.cmd --prefix electron run verify:onboarding`：首次因动态属性未被静态目标检查识别而失败；改为稳定字面目标后通过。
- `npm.cmd --prefix electron run verify:onboarding-ui`：首次因纯 Chromium 壳缺少 Explore IPC，真实挂载 Explore 后中止；测试改为只触发导览原生目标监听（产品真实点击未改变）后，24 步完整通过。
- `npm.cmd --prefix electron run verify:software-assistant-guide`、`verify:software-assistant-ui`、`verify:version`：通过；UI 断言确认作者入口可见，版本为 v2.0.0 / 7201。
- 真实硬件未参与本轮验证：`REAL_HARDWARE_VALIDATION_PENDING`。
