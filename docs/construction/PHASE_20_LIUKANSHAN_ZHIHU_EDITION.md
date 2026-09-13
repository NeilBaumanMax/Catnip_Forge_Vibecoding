# Phase 20：知乎刘看山特供版前端

## 用户目标

在 `model-ccswitch@0c7f3fbd` 的完整产品能力上创建独立 `liukanshan` 分支，制作知乎特供版前端。Catnip Forge、Agent、模型、探索、知乎 Skill、Skill Hub、任务与硬件运行逻辑保持不变；所有面向用户的“学院呱呱”吉祥物形象和名称统一替换为知乎吉祥物“刘看山”。

## 视觉真相

- 刘看山是知乎的白色北极狐吉祥物。形象保持简洁的白色北极狐、尖耳、黑色鼻子和克制表情，不画成长耳兔，也不保留学院呱呱的圆眼镜、星星眼、红斗篷和黄橙围巾。
- 允许沿用既有素材的动作、道具、构图、留白和深蓝科技氛围；角色身份必须改为刘看山。
- UI 中的产品名仍为 Catnip Forge；只替换吉祥物、软件使用助手名称、无障碍文字和教学文案，不伪造知乎官方授权、Logo 或认证声明。
- 新素材使用独立 `liukanshan-*` 文件名，不覆盖基础分支的学院呱呱源图，便于审查、回滚和分支比较。

## 素材范围

1. 软件助手方形头像与右下角透明角色。
2. Agent 欢迎空态、任务管理器空态。
3. 探索首页“找灵感 / 解问题”两张透明角色场景。
4. 找灵感和解问题工作页两张横向研究室场景。
5. Agent 历史侧栏纵向夜景。
6. 启动画面透明角色。
7. Renderer 内的蓝色方形吉祥物应用图。

不含角色的星空背景、探索学院背景与 Catnip 猫薄荷产品标记保持不变。

## 代码与文案范围

- 更新 Renderer、Splash、预加载和 CSS 的素材引用及 alt 文本。
- 软件助手系统角色、标题、欢迎语、按钮 aria-label、教学演示和用户手册统一称“刘看山”。
- 教学、模型、探索、知乎连接、知识库和 Skill Hub 的功能内容不删减；只做特供版身份与视觉替换。
- 更新相关静态/UI/性能/启动页测试，使其验证刘看山素材和名称，同时保留所有既有功能门禁。

## 验收

- 全仓库当前前端与助手知识中不再出现面向用户的“学院呱呱”；旧 Phase 文档可作为历史证据保留。
- 所有新素材逐张人工检查：角色是白色北极狐、构图适配原槽位、无错误文字、无水印；透明素材保持透明通道。
- `verify:software-assistant-guide`、`verify:software-assistant-ui`、`verify:onboarding`、`verify:onboarding-ui`、`verify:explore-ui`、`verify:explore-layout-ui`、`verify:splash-ui`、`verify:renderer-performance`、typecheck、Main/Renderer build 通过。
- 本阶段不调用真实 Key、知乎搜索、付费模型或硬件；不把用户历史、凭据或 `.catnip` 纳入源码和发布包。

## Git

- 分支：`liukanshan`，基线：`0c7f3fbd`。
- 本地恢复点：`backup/pre-phase-20-liukanshan-20260913`。
- 先提交本文档和 Product Truth，再生成素材、接线、测试、视觉复核和实现提交。未获得明确指令不推送远端。
