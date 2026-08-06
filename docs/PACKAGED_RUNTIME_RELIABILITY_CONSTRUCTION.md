# 成品 Runtime 可靠性修复施工文档

## 背景

2026-08-07 在 `electron/dist-package/win-unpacked` 的真实使用中确认三个相互独立、但都影响成品可用性的缺陷：

1. 成品内虽然存在 Python，但 ESP-IDF 调用反复出现模块和环境错误；
2. 任务管理器开始能收到 `runtime/hardboard/events`，持续使用后编译、烧录事件和实时日志消失；
3. Agent 输入框的可见文字与原生 textarea 光标不重合，换行或长文本时偏移明显。

本轮按“施工文档 → 独立文档提交 → 编码 → 专项测试 → 回归 → 成品验收 → 文档收尾 → 推送并核对远端”的闭环执行。

## 已确认根因

### 1. Python 成品环境

- 成品根解释器 `resources/runtime/python/python.exe` 使用 `python312._pth` 隔离运行；它能加载随包 `site-packages`，但当前 `click` 目录只剩缓存和 `py.typed`，缺少源码，`import click.core` 必然失败。
- 打包配置额外把根解释器复制成 `runtime/python/Scripts/python.exe`。该副本旁边没有 `_pth`，会在开发机串用系统 Python 3.12 的标准库和包，因此现有发布校验出现假阳性。
- Electron 和 Runtime 都优先选择这个 `Scripts/python.exe`，并把其父目录误当成完整虚拟环境。
- 从 MSYS/Git Bash 启动应用时继承的 `MSYSTEM=MINGW64` 会干扰 ESP-IDF Windows 工具链。

### 2. Runtime EventBus

- 多个 Agent、Electron 和短命 Runtime 进程会共同追加 `events.jsonl`。
- 每个进程仅在模块加载时读取一次 `lastSeq`，后续独立递增，因而会产生重复或倒退序号，并可把 `state.json.lastSeq` 写回旧值。
- Renderer 把 `lastSeq` 当排他游标，只请求 `seq > runtimeSeq`；序号倒退后，新日志会被持续过滤。
- 轮询异常没有进入可见错误状态，用户只能看到空白。

### 3. Agent 输入框光标

- 输入框使用“透明 textarea 提供光标 + 可见高亮层提供文字”的双层渲染。
- 两层的 `box-sizing`、边框和滚动条占位不一致，导致实际可换行宽度不同；长文本换行后，原生光标与高亮文字逐行偏离。

## 施工范围

### Python

- 统一选择成品根解释器，不再依赖会串到系统安装的 `Scripts/python.exe`。
- 修正开发期准备和运行环境变量，明确 `PYTHONHOME`、`IDF_PYTHON_ENV_PATH`、`PATH`，并移除会污染 ESP-IDF 的 MSYS 环境变量。
- 发布校验必须用隔离根解释器验证 `serial`、`click.core` 和关键 ESP-IDF Python 入口；残缺依赖必须让打包失败。
- 修复本机 `_bundled/python` 的依赖内容后重建成品。

### EventBus

- 每次分配事件序号前重新与磁盘状态/日志尾部对齐，避免长期进程继续使用陈旧序号。
- 查询端允许 UI 周期性读取最近窗口，Renderer 依据稳定事件 `id` 去重，不再把跨进程 `seq` 当作唯一可靠增量游标。
- 轮询串行化，捕获并展示读取失败；下一次轮询仍可恢复。
- 增加多写入者序号回归和 Renderer 合并策略测试。

### 输入框

- 强制高亮层与 textarea 使用相同盒模型、边框、字体指标、换行宽度和滚动条槽位。
- 保留 Skill 高亮、输入法、选择和滚动同步能力。
- UI smoke 增加多行长文本的逐字符几何对齐检查。

## 风险与保护

- 不删除用户工程、历史会话、事件历史或日志。
- EventBus 修复必须兼容已有 JSONL；无效或半写入行继续忽略。
- Python 修复不得依赖开发机已安装的 Python、用户 site-packages 或全局 `PATH`。
- 输入层调整不得破坏中文输入法组合态和 `@Skill` 插入。

## 测试与验收

### 自动化门禁

- Runtime typecheck/build 与 EventBus 专项测试通过。
- Electron typecheck、main/renderer build、聊天 UI smoke、任务管理器 UI smoke 通过。
- `verify:release` 必须对隔离根 Python 做导入验证，并证明不会读取系统 site-packages。
- `git diff --check` 通过。

### 成品验收

- 重建 `win-unpacked`，从成品目录启动。
- 在清除或隔离系统 Python 的环境下，成品 Python 仍能导入 ESP-IDF 所需模块。
- 连续执行多轮编译/烧录或等价事件压力测试，任务管理器持续出现新事件和实时日志，重启窗口后仍可恢复。
- 输入中英文混排、`@Skill`、长行和多行文本，光标始终贴合对应字符；滚动后仍对齐。
- ESP/USB-UART 真机烧录、真实串口收发仍需连接设备完成，若本轮没有设备则明确保留为未验收边界，不得用模拟测试冒充。

## 提交边界

1. 本文档与索引先形成独立施工基线提交；
2. 实现与测试形成代码提交；
3. 成品验收和最终状态回写文档后形成收尾提交；
4. 推送当前施工分支并核对远端提交号，远端未确认前不称为已交付。

## 施工结果（2026-08-07）

- 施工基线提交：`77e67ba3`；代码提交：`259c27b3`。
- Python：应用改用带 `_pth` 的根解释器；ESP-IDF 所要求的 `Scripts/python.exe` 同时携带 `python312.dll` 和独立相对路径 `_pth`。运行环境禁止 user site，清除 `MSYSTEM`，打包前和成品校验均验证 `serial`、`click.core`、`idf_component_manager`、`esptool` 的真实模块路径位于包内。
- EventBus：写入采用跨进程排他锁，每次从磁盘状态和日志尾部重新对齐序号；半写入尾行可恢复。Renderer 每秒读取最近窗口并按事件 `id` 去重，轮询串行且失败可见。
- 输入框：高亮层与 textarea 统一为 `border-box`、1px 边框、相同字体/换行属性和稳定滚动条槽位；聊天 UI smoke 增加计算样式和内容宽度一致性断言。

### 已通过

- `tests/test_project.py`：4 项通过。
- Runtime typecheck/build 与 `verify:event-clear` 通过；专项测试包含 6 个并发写入进程、120 条事件、旧序号推进和半写入尾行恢复，最终序号连续且唯一。
- Electron typecheck、main build、renderer build 通过；`git diff --check` 通过。
- 并列重建 `electron/dist-package-fixed/win-unpacked` 成功；发布校验通过，包体 `4,464,199,142` 字节，包内 Node `v22.14.0`、隔离 pyserial `3.5`、ESP-IDF `v5.4.3`、Claude Code `2.1.167` 均可执行。

### 尚未完成的人工边界

- 原 `electron/dist-package/win-unpacked` 当时仍有用户实例运行。为避免强制结束进程造成未发送对话丢失，本轮没有覆盖该目录，修复成品保存在并列目录 `electron/dist-package-fixed/win-unpacked`。
- 因旧实例占用固定 CDP 端口，本轮未把新成品的聊天框和任务管理器标记为真实 UI 人工验收通过；相关 CSS 几何断言已加入 smoke，但仍需在关闭旧实例后从修复成品启动复核。
- ESP/USB-UART 真机烧录和真实串口收发仍需设备；本轮没有用模拟测试冒充真机验收。
