# Agent Skill 目录、正文引用与多调用施工文档

## 当前基线

Catnip Forge Skill 只有一个用户可维护源仓库：

- 开发版：`agent/skills`
- Windows 成品：`win-unpacked/resources/agent/skills`

每个 Skill 必须以独立文件夹呈现，入口固定为 `<skill-id>/SKILL.md`。脚本、参考资料和素材与入口放在同一目录树中。Claude Code 原生部署目录为 Agent 工作区的 `.claude/skills/<skill-id>`。

```text
agent/skills/<skill-id>/
├── SKILL.md
├── scripts/       可选；Skill 专用脚本
├── references/    可选；补充规范和资料
└── assets/        可选；模板、图片等资源
```

2026-07-25 已将 12 个内置 Skill 从顶层扁平 Markdown 迁移为标准目录。迁移保留原文件内容和 Git 历史，不删除早期能力。

## 数据流

```text
resources/agent/skills/<id>/            用户可编辑源目录
        ↓ skill-manager 整目录校验、树哈希和同步
runtime-data/agent-workspace/.claude/skills/<id>/
        ↓ Claude Code 原生发现
聊天正文任意位置 @skill-id
        ↓ text + skillRefs[{ id, name, start, end }]
Gateway / Orchestrator
        ↓ 显式 Skill 按正文首次出现顺序全部加载
Agent Skill tool
        ↓ requested / invoked 校验
对话“执行过程”中的技能条目
```

开发模式对应 `agent/skills` → `runtime/agent-workspace/.claude/skills`。

## 目录与同步规则

1. Skill ID 只允许小写字母、数字和连字符，最长 64 字符；文件夹名必须与 ID 一致。
2. `SKILL.md` 的 YAML frontmatter 至少包含 `name` 和 `description`，正文不能为空且不超过 100KB。
3. 同步复制除顶层隐藏文件和符号链接外的整个 Skill 目录；支持文件不限于 Markdown，可以包含 `.py`、`.mjs`、`.ts`、`.ps1`、`.cmd`、`.sh`、JSON、YAML 和素材。
4. 同步清单版本为 v2，哈希覆盖标准化后的 `SKILL.md` 和所有支持文件的相对路径及内容。脚本或参考资料变化必须反映为新的树哈希。
5. 支持文件只会复制和编辑，不会在扫描、同步或预览时执行。脚本只能在 Agent 已调用对应 Skill 后，通过可见工具调用执行。
6. 同名非 Catnip Forge 管理目标不得覆盖；删除源 Skill 时进入系统回收站，并只撤销清单中由 Catnip Forge 管理的部署项。
7. 旧扁平 `*.md` 解析能力继续保留为兼容入口，但内置 Skill 和新建 Skill 均使用标准目录；同 ID 标准目录优先。

## 文件资源管理器

- 编辑器的 Skills 根节点直接展示 `<skill-id>` 文件夹，按需展开 `SKILL.md`、`scripts/`、`references/` 和 `assets/`。
- Monaco 可直接维护 Markdown、JSON/YAML、JavaScript/TypeScript、Python、Shell、PowerShell 和 CMD 等文本脚本。
- Skill 管理器负责名称、描述、主指令、新建、回收站删除、同步和打开单个 Skill 目录；复杂脚本继续使用统一工程编辑器，不建立第二套代码编辑器。
- Skill 列表显示支持文件数量，修改任一支持文件后下一次同步和 Agent 启动都会部署最新目录树。

## 聊天正文内引用

聊天框不再维护单一 `selectedSkill`，也不再把一个 `/skill-id` 强制拼在句首。用户可在正文任意位置输入或插入多个引用：

```text
请先检查工程 @espidf-hardboard，再整理结果 @data-extract。
```

交互规则：

1. 输入 `@` 会打开完整 Skill 搜索列表；底部 `Skills` 按钮也会从当前光标位置打开同一列表。每次选择只插入一个 Skill，随后弹层立即关闭、输入框恢复焦点，用户可继续写正文或再次打开列表插入下一个。
2. 一条消息最多显式引用 8 个 Skill；不同 Skill 可以同时出现。
3. 发送消息时保留原始正文，并额外传输 `skillRefs`，记录每个引用的 ID、名称和 `start/end` 位置。
4. 对话历史继续显示原文位置，已识别引用以安全的内联标签呈现；重启恢复时位置不丢失。
5. 未部署、已删除或位置与正文不一致的引用由主进程拒绝，不能静默降级。
6. 同一 Skill 多次出现时保留正文，但实际加载一次；加载顺序取首次出现顺序。
7. 旧 `/skill-id` 文本仍可作为普通 Agent 命令使用，但新 UI 的正式协议是结构化 `@skill-id`。
8. 输入框使用与原生 textarea 同步的只读高亮层，将已识别的 `@skill-id` 呈现为圆角荧光笔色块；颜色由 Skill ID 稳定散列到调色板，同一 Skill 保持同色，不同 Skill 尽量区分。输入区标记必须继承 textarea 的字体、字号、字重和行高，并保持零水平 padding/margin，确保高亮层与真实文字层逐字同宽、不挤压相邻正文。
9. 已识别的 Skill 引用在编辑时视为原子单元：光标位于引用内部、紧邻引用之后，或位于自动插入的尾部空格之后时，按一次退格键删除整个 `@skill-id`，并把光标放回原引用起点。
10. 输入区顶部提供整宽纵向拖拽热区，向上拖增高、向下拖减小，范围为 64–320px；高亮层和 textarea 必须保持同高。分隔条支持键盘上下方向键每次调整 16px，并将最终高度保存在本机 `localStorage`。

## 显式调用与自动推荐

- 用户正文中的 `@skill-id` 是显式要求，必须全部调用，优先级高于自动推荐。
- 自动路由仍可按任务语义推荐多个 Skill，但会单独显示“自动建议”，不能覆盖或替代显式引用。
- Orchestrator 分别记录显式请求和实际 `Skill` 工具调用。Agent 首轮结束时若仍有显式 Skill 未调用，会自动补一次纠正 turn。
- 纠正后仍未调用的 Skill 会以用户可见错误显示，任务使用退出码 `3`，不能标记为成功。
- 追加要求和排队任务各自携带结构化 Skill 引用；追加到当前任务的新 Skill 会合并进当前必调集合，队列任务保持自己的引用顺序。

## 安全边界

- Renderer 只负责生成可见引用，Gateway 和 Orchestrator 必须重新校验部署状态、数量与正文位置。
- Skill 引用不能携带路径，不能绕过合法 ID 规则，也不能直接触发脚本。
- 用户消息持久化保存引用元数据；Agent 工具日志不写入用户消息正文。
- 同步目标冲突、目录不可写或支持文件复制失败必须明确报错，不得改写到其他隐藏目录。

## 验证

```powershell
npm.cmd --prefix electron run typecheck
npm.cmd --prefix electron run build:main
npm.cmd --prefix electron run build:renderer
npm.cmd --prefix electron run verify:skills
npm.cmd --prefix electron run verify:task-queue
npm.cmd --prefix electron run verify:session
npm.cmd --prefix electron run verify:hardboard
npm.cmd --prefix electron run smoke:chat-ui
git diff --check
```

`verify:skills` 覆盖 12 个目录型 Skill、frontmatter、支持文件整树部署、显式多 Skill 顺序、正文位置校验、自动 Hardboard 推荐和普通前端编译不误触发 Hardboard。

`smoke:chat-ui` 在真实 Renderer 中先拖动输入区顶部将编辑框增高并恢复，确认 textarea 与高亮层同步；随后两次打开完整 Skill 列表、分别插入不同的 `@skill-id`，确认每次选择后弹层关闭且焦点回到输入框，并校验不同荧光颜色、无排版重叠及一次退格完整删除。
