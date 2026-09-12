# Phase 16：模型中心、对话模型选择与知乎凭证维护

日期：2026-09-12（Asia/Shanghai）

施工分支：`model-ccswitch`

基线：`catnip-GUAGUA` 最新远端提交 `f2449a199b1a92fb644276403a75da116c6fb586`

远端恢复点：`backup/pre-model-ccswitch-20260912`，已核对指向同一提交。

## 1. 用户问题与目标

当前产品把不同模型用途分散写死：工程 Agent 默认使用 DeepSeek endpoint 和 `deepseek-v4-pro`，软件助手使用 `deepseek-v4-flash`，附件桥另有 Qwen 配置。用户无法集中维护供应商，也无法在 Agent 对话中选择已配置模型。知乎连接则在首次配置成功后只显示“已连接”，缺少替换、验证和退出入口。

本 Phase 交付三个可见结果：

1. 新增类似 CC Switch 的“模型”工作区，集中管理供应商、模型档案、默认用途和可用状态。
2. Agent 聊天框可以选择一个已启用且兼容工程 Agent 的模型；选择按当前工程和会话保存，新任务创建时冻结模型快照。
3. 探索中的知乎连接卡在已连接后仍提供维护入口：查看安全状态、替换 Access Secret、在线验证和退出登录。

模型中心只管理现有 Agent/助手的配置，不新增第二套 Agent、Skill、任务系统或云服务。

## 2. 当前代码证据

- `electron/src/main/agent.ts` 固定 DeepSeek base URL 与 `deepseek-v4-pro`，并在启动 Agent 子进程时注入模型环境。
- `electron/src/main/software-assistant.ts` 固定 DeepSeek endpoint 与 `deepseek-v4-flash`。
- `electron/src/main/attachment-bridge.ts` 使用独立 Qwen 模型配置，尚未纳入统一目录。
- `electron/src/main/first-run.ts` 只处理首次 DeepSeek/Qwen Key 文件，没有日常模型维护界面。
- `electron/src/main/explore-zhihu-status.ts` 在 `already_connected` 状态提前返回；`ExplorePanel.tsx` 只在缺 Secret 时展示配置动作。
- 官方 `agent/skills/zhihu` 已提供 `auth set --secret-stdin`、`auth status --verify` 和 `auth logout`；本 Phase 复用这些 vendor 命令，不修改官方协议。

## 3. 产品与数据契约

### 3.1 模型供应商

Main 进程维护版本化的 `ProviderConfig`：

- `id`、`name`、`protocol`、`baseUrl`、启用状态；
- Secret 只保存为系统凭据引用，返回 Renderer 的永远是 `configured: boolean` 等元数据；
- 预置 DeepSeek，允许用户新增受支持协议的供应商；预置项可恢复默认但不得把 Key 写回普通文件；
- 删除或停用前检查默认用途和会话引用，要求先改绑，禁止静默 fallback 到另一个付费模型。

协议支持必须真实区分：工程 Agent 当前可直接使用其宿主真正支持的协议；软件助手可使用 OpenAI-compatible chat completions。不能仅替换 base URL 就宣称任意协议支持。若工程 Agent 要支持 OpenAI-compatible 供应商，必须增加本地适配器和专项协议测试后再开放。

### 3.2 模型档案

`ModelProfile` 至少包含：

- `id`、显示名、供应商、上游模型名、用途；
- 能力标记：工程 Agent、软件助手、附件/视觉；
- 启用状态、可选上下文参数和非敏感请求参数；
- 最近一次连通性检查只保存时间、结果类别和安全摘要，不保存请求正文或响应正文。

首批迁移现有默认行为，确保升级后未主动修改配置的用户仍可工作：工程 Agent → `deepseek-v4-pro`，软件助手 → `deepseek-v4-flash`，附件模型保留现状。

### 3.3 选择与快照

- 应用级默认用途配置保存在 Electron `userData`。
- Agent 对话选择保存在 `<project>/.catnip/agent/`，与工程、会话隔离。
- Renderer 传递 `modelProfileId`，Main 校验其存在、启用、用途兼容后才创建任务。
- 任务创建时写入不含 Secret 的模型快照；运行中的任务不因用户随后切换默认模型而改变。
- 历史若引用已删除模型，显示“模型已不可用”，不得偷偷改用默认模型。

## 4. Secret 与权限边界

- API Key、知乎 Access Secret 不进入源码、Renderer state、IPC 返回值、Chat、日志、URL、截图、任务快照或发布包。
- Renderer 只发起“配置/替换”请求并接收状态；真实 Secret 通过 Main 控制的原生遮罩窗口或等价的宿主安全输入进入标准输入。
- 模型 Key 写入系统凭据存储。读取只发生在 Main 启动受信任请求或 Agent 进程的最小边界内。
- 现有 `resources/apikey.txt` 和 Qwen Key 采用非破坏迁移：先成功写入安全存储并验证可读取元数据，再删除旧文件；失败时保留旧行为并明确提示，不能造成用户 Key 丢失。
- 知乎替换调用官方 `auth set --secret-stdin`；验证调用 `auth status --verify`；退出调用 `auth logout`。界面须说明退出只清除本机凭据，不等于远端吊销。

## 5. 分层与 IPC

- Renderer：模型列表、表单、用途默认值、Agent 选择器、知乎维护按钮；不接触 Secret 明文。
- Preload：只暴露窄类型接口，不允许任意命令、任意环境变量或任意凭据名。
- Main：schema 校验、原子存储、凭据生命周期、兼容性校验、任务模型快照、vendor Zhihu 命令编排。
- Worker/Agent：只消费 Main 解析出的单次运行配置，不读取 Renderer 或通用配置文件。

新增 IPC 必须覆盖非法 provider/model id、跨用途选择、损坏配置、并发写、取消安全输入和进程重启恢复。

## 6. UI 结构

顶栏新增第七个可见工作区“模型”，位置靠近 Agent 使用场景，保留其余六个工作区行为。模型页包括：

- 左侧供应商列表和新增入口；
- 中间模型档案及用途/默认标识；
- 右侧当前项编辑、配置/替换 Key、连通性检查、停用或删除；
- 所有 Secret 字段只触发安全窗口，普通表单不显示或回填 Secret。

Agent Composer 的模型选择器只列出启用且标记为“工程 Agent”的档案，明确显示供应商与模型名。知乎连接卡无论连接状态如何都保留“管理连接”；已连接状态可重新检查、替换 Secret、退出登录。

## 7. 小闭环施工顺序

| 小项 | 修改范围 | 验收门禁 |
| --- | --- | --- |
| 16a 文档基线 | Product Truth、Decision、契约、计划、测试、本文 | 独立 Commit/Push 早于源码；远端 hash 一致 |
| 16b Domain/Store | common types、Main store、路径与迁移 | schema、原子写、损坏恢复、并发、升级兼容测试 |
| 16c 安全凭据 | Main credential adapter、安全输入、Preload 窄接口 | Renderer/日志/URL/快照无 Secret；取消/失败不丢旧 Key |
| 16d 模型工作区 | BrowserPanel/App/ModelPanel/styles | 七工作区、增删改停用、默认用途、键盘与 150% 布局 |
| 16e Agent 选择 | ChatPanel、任务创建、Agent 启动和会话持久化 | 工程/会话隔离、兼容性拒绝、任务快照、无静默 fallback |
| 16f 知乎维护 | status bridge、ExplorePanel、安全窗口复用 | status-first、替换、verify、logout；不修改 vendor |
| 16g 回归交付 | 文档、专项、typecheck/build、安全扫描 | 软件证据齐全；真实付费调用和硬件状态单列 |

每个小项继续执行“先写该小项范围与测试 → 独立文档提交 → 实现 → Review → 专项测试 → 精确提交并推送”。

## 8. 测试矩阵

- Store：首次创建、旧格式迁移、坏 JSON、原子写失败、并发更新、重启恢复。
- Secret：IPC 序列化扫描、Renderer bundle 扫描、日志脱敏、取消替换保留旧值、错误不回显上游正文。
- Model：默认迁移、协议能力过滤、停用/删除引用保护、工程切换、会话切换、任务运行中切换。
- Zhihu：未安装、需升级、缺 Secret、已连接、替换取消/成功、在线验证失败、退出、重启恢复。
- UI：键盘操作、焦点、错误提示、`1280x720` / `1707x960` / `1707x1067` 和 150% 缩放。
- 基线：Runtime/Electron typecheck、Main/Renderer build、相关 verify 脚本、`git diff --check`。

离线契约测试不得消耗真实模型或知乎额度。只有用户明确授权后才做真实连通性调用；本 Phase 不涉及硬件执行，继续保留 `REAL_HARDWARE_VALIDATION_PENDING`。

## 9. 停工条件与非目标

出现以下情况停止扩展并记录：需要修改官方 Zhihu 协议；需要把 Secret 送入 Renderer/Chat；工程 Agent 的目标协议没有可靠适配路径；迁移会覆盖或丢失用户配置；实现会复制 Agent/Skill/任务系统。

本 Phase 不做模型市场、账号云同步、费用结算、自动抓取模型列表、OAuth 画像、Web 版或新的后端服务，也不承诺未经真实协议验证的“兼容所有模型”。

## 10. 16b 实施记录

状态：`COMPLETE`。

- 新增共享模型配置契约，内置迁移精确保留 DeepSeek V4 Pro、DeepSeek V4 Flash 和 Qwen VL Plus 的当前用途。
- 新增 Main `ModelConfigStore`：仅保存非敏感元数据，使用 schemaVersion、revision 乐观并发门禁和临时文件/备份原子替换。
- 校验覆盖 HTTPS、URL 凭据/查询拒绝、协议兼容、用途默认值、唯一 ID、Secret 字段拒绝和数量/长度上限。
- 专项覆盖默认迁移不落盘、clone 隔离、重启恢复、旧 revision 拒绝、Secret 不持久化、协议/默认值反例、上一有效 revision 备份、坏 JSON 原样保留与临时文件清理。
- `npm.cmd --prefix electron run verify:model-config`、Electron typecheck 和 `git diff --check` 通过。Electron 进程打印 Windows `os_crypt` 与 GPU 环境警告，但退出码及专项断言为通过；本小项未调用真实凭据或远端模型。
