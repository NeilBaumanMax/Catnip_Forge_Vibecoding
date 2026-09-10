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
