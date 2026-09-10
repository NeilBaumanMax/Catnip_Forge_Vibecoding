# Phase 12：学院呱呱与探索收藏体验修整

日期：2026-09-11  
分支：`catnip-GUAGUA`  
基线：`bd51b238`

## 目标

1. 修复学院呱呱聊天框输入区越界及发送按钮消失；重排头部，使用用户提供的方形兔子头像，并把带 GitHub 标识的作者入口提升为清晰按钮。
2. Explore 收藏知识时保存该来源所属探索记录的会话快照；收藏卡可展开查看原对话，并提供明确的单条删除功能。
3. 加强“找灵感 / 解问题”两张入口卡的色彩区分、边界和交互反馈，同时保留深浅主题、减少动态与高对比度适配。
4. 更新专项测试、施工证据并重新生成 v2.0.0 Windows 包。

## 数据与安全边界

- 收藏的对话快照仅来自当前 Explore Session 已保存的本地对话，限制条数和单条长度，不包含未知字段。
- 删除收藏必须由用户点击并二次确认，只删除目标知识卡，不级联删除探索历史。
- 删除探索历史继续不删除收藏；收藏内的会话快照因此仍可独立查看。
- GitHub 外链继续复用固定白名单 IPC，不扩大可打开地址范围。
- 本轮不修改工程业务源码、不执行 Build/Flash/Serial；`REAL_HARDWARE_VALIDATION_PENDING`。

## 施工结果与验证

- 学院呱呱头部已使用用户提供的 `guagua-avatar.png`，作者按钮包含用户提供的 GitHub 标识；按钮增大并与外观控制分行，仍走固定地址白名单。
- 输入区补齐 grid 子项的最小宽度与 border-box 约束；UI 测试确认 textarea 和 30px 发送按钮均在 composer 边界内。
- Knowledge Card 新增受限的来源会话快照；首页可展开“查看原对话”，也可经二次确认“删除收藏”。既有无快照收藏保持兼容。
- 找灵感使用紫色强调，解问题使用青色强调，均增加彩色边框、顶部光带、阴影与独立 hover 反馈。
- `typecheck`、`build:main`、`build:renderer`、`verify:explore-knowledge`、`verify:explore-session`、`verify:explore-ui`、`verify:explore-layout-ui`、`verify:onboarding`、`verify:software-assistant-guide`、`verify:software-assistant-ui`、`verify:version` 均通过。
- Electron 测试仍输出 Windows `os_crypt`/GPU 环境噪声；Explore layout 临时 profile 退出时仍有一次 `EPERM` 最佳努力清理提示，均未影响断言结果。
- `npm.cmd --prefix electron run pack:win`：通过；生成 `electron/dist-package/win-unpacked/Catnip Forge.exe`，文件版本 `2.0.0.7201`。
- `npm.cmd --prefix electron run verify:release`：通过；包体 4,465,483,163 字节，ESP-IDF v5.4.3、隔离 Python/pyserial 与 Claude Code 均在包内，DeepSeek/Qwen Secret 均未入包。
