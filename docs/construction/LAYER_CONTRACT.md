# Layer Contract

依据当前源码核实后确定责任。知识 Store、官方 status 和 Request 准备 IPC 已实现；受限分析与结构化结果通道仍待 A1/A2 原型，不虚构为已有能力。

| 层 | 责任与复用入口 | 禁止 |
| --- | --- | --- |
| Renderer | 探索两个入口、目标/问题输入、Context 勾选、Idea/Diagnosis/来源展示、收藏、确认操作；复用 BrowserPanel/ChatPanel 设计 | Secret、知乎 HTTP、任意 shell/文件、直接 Hardboard、独立 Agent |
| Preload / Gateway | 现有显式 IPC 白名单与 Main 注册；校验输入、ID、来源、选择、确认归属 | 暴露任意命令执行、路径读取或 Secret IPC |
| Main | 用户数据、状态映射、受控 Context、必要编排、桥接；paths/workbench/serial controller | 重写官方 CLI auth、把计划提示当程序授权 |
| Worker / Agent | 目标理解、动态检索策略、官方 Skill 调用、证据综合、结构化返回、现有 taskId/queue 的计划及执行 | 第二套队列/Agent、未确认写文件、来源伪造、自由文本猜测关键状态 |
| Skill Manager | 标准 Skill discovery、完整 support tree、部署、@引用；源官方字节保留 | 修改 vendor 协议；在发现目录存同名备份 |
| Official zhihu | search zhihu/global；官方脚本 status/setup、CLI 生命周期与系统凭证 | 宿主自写等价 API；默认引入其他官方能力 |
| Runtime MCP | 既有 ESP-IDF、Build、Flash、Serial、snapshot、EventBus/任务进程 | 知乎搜索、LLM 判断、将 build 当 runtime success |
| Local Knowledge Store | 主动收藏、摘要/引用、项目关联、验证记录、最小相关发现 | 全文镜像、OAuth、自动注入、无证据有效标记 |

## 跨层不变量（必须测试）

1. 无效输入在 Main/Worker 拒绝，不能只靠 UI disabled。
2. Explore/Plan 写文件及硬件副作用拒绝；确认与具体 Handoff/计划版本、任务绑定，取消/过期不得重用。
3. Result 来源保留 URL/标题/作者/片段；无法校验的 Result 不直接进入执行。
4. Context 候选与已选择集合分离；用户取消的源码/日志/知识卡不得进入 Agent 输入。
5. 真实工具结果按 task/project/time 关联；完成消息不能替代 Build/Flash/Serial 证据。
6. 本地知识写入不覆盖未知损坏数据；只保存任务摘要和验证记录。
7. CLI stdout/stderr、提示词、日志无 Secret；连接凭证走官方系统存储，不能经现有会记录全文的 chat:send 输入。


## 2026-09-07 知识底座程序边界

- Renderer 只能经 preload 请求 list/save/addVerification/findRelated/selectForContext。
- Main 对 IPC 输入执行运行时校验；整篇正文和未知字段不会写入知识卡。
- findRelated 只发现候选；selectForContext 必须收到用户明确选择的 card ID。
- 磁盘 JSON 语法或卡片结构损坏时保留原文件并报错，不自动覆盖。

## 2026-09-08 Request 准备程序边界

- Renderer 经 preload 提交共享 `ExploreRequest`；Main 必须再次运行时校验。
- Main 只保留 `selected=true` 的 Context；取消项不得返回给后续分析输入。
- 找灵感声明知乎必需、全网按需；解问题声明知乎与全网均必需。
- `explore:request:prepare` 不执行搜索、Agent、文件写入、Build、Flash 或 Serial。准备成功不等于已产生 Idea/Diagnosis。
