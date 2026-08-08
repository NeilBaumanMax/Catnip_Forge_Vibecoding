# Qwen 视觉与聊天附件施工文档

更新日期：2026-07-25  
施工分支：`qwen_vision_attachments`
合并状态：2026-08-08 已合入 `main`

## 1. 目标与不变项

本次施工为 Catnip Forge 增加图片、PDF、Word、PPT 等聊天附件能力，并在确实需要视觉理解时调用阿里云百炼 Qwen 多模态 API。

以下边界不可改变：

- DeepSeek 继续作为唯一主开发 Agent，负责推理、代码修改、工具调度、编译、烧录、串口和最终回答。
- Qwen 不是第二个 Agent，不接管对话，也不直接修改工程；它只作为 DeepSeek 可调用的视觉/附件解析工具。
- 没有配置 Qwen API Key 时，普通 Agent、编译、烧录、串口和可本地提取文字的附件仍可使用。
- Qwen 结果属于辅助证据。低置信度、模糊引脚、接线和元件信息必须保留警告，不能被当作已经人工确认的硬件事实。
- 网页录制/回放、网页爬虫和旧 Python `coddecat` scaffold 继续冻结保留，不进入本次施工。

## 2. 用户体验

### 2.1 首次启动

首次启动配置窗口同时呈现：

1. DeepSeek API Key：必填，沿用当前校验和保存逻辑。
2. Qwen API Key：选填，明确标注“用于图片、扫描件和文档视觉解析，可稍后配置”。
3. Qwen 地域/Base URL：提供默认值和说明；地域与 Key 必须匹配。
4. Qwen 视觉模型：使用可配置默认值，不把模型名永久写死在业务逻辑中。

用户可以不填 Qwen Key 并完成首次启动。若后来添加需要视觉的附件，界面应提示配置视觉服务，而不是阻断 DeepSeek 主 Agent。

Qwen Key 必须和 DeepSeek Key 一样：

- 只由 Electron 主进程读取和保存。
- 不进入 Renderer 状态、Agent 提示词、聊天历史、日志、Git 或错误详情。
- Preload/IPC 只返回 `configured: boolean` 等脱敏状态。

### 2.2 聊天框附件

聊天输入区新增：

- 回形针/“添加附件”按钮。
- 图片和文件多选。
- 拖放文件到输入框。
- 发送前附件卡片：文件名、类型、大小、处理状态、删除按钮。
- 支持类型：PNG、JPG/JPEG、WEBP、PDF、DOCX、PPTX；纯文本、Markdown、JSON 可走本地文本读取。
- 单文件、单消息总大小和附件数量限制。

附件和文本属于同一条用户消息。历史会话中保留附件元数据和本地引用；文件不存在时显示“附件已丢失”，不能让整个会话加载失败。

### 2.3 执行过程

现有 Agent“执行过程”必须展示附件和 Qwen 阶段，例如：

- 正在接收附件
- 正在提取 PDF/Word/PPT 文字
- 正在生成页面或图片预览
- 正在调用 Qwen 视觉
- Qwen 视觉解析完成
- Qwen 未配置，已跳过视觉解析
- 视觉解析失败，DeepSeek 将继续使用可用文字

过程卡片只显示阶段、文件名、页码/幻灯片号、耗时和脱敏错误，不显示 API Key、完整 Base64、整份识别正文或内部请求体。

## 3. 总体架构

```text
聊天附件
   ↓
Renderer 附件卡片
   ↓ IPC
Electron Attachment Store
   ├─ 原文件与 manifest
   ├─ 本地文字提取
   ├─ 图片/页面预览
   └─ 内容哈希与会话关联
          ↓
Agent / DeepSeek 主模型
          ↓ MCP（按需）
Attachment Tools
   ├─ attachment.list
   ├─ attachment.inspect
   ├─ attachment.read_text
   ├─ attachment.search
   ├─ attachment.render_pages
   └─ vision.qwen_analyze
                 ↓
        Electron 本机鉴权桥接
                 ↓
          Qwen 多模态 API
                 ↓
       结构化证据返回 DeepSeek
```

Qwen 调用沿用共享串口桥接的安全思想：Runtime MCP 不读取安装目录中的明文 Key，而是请求 Electron 主进程的本机鉴权服务。Electron 主进程负责 Qwen Key、地域、模型、超时、重试、尺寸限制和脱敏错误。

## 4. 附件存储

附件放入用户数据目录，而不是仓库、安装目录或 Agent 工作区：

```text
runtime-data/
└─ attachments/
   └─ <conversation-id>/
      └─ <attachment-id>/
         ├─ original/
         ├─ extracted/
         ├─ previews/
         └─ manifest.json
```

`manifest.json` 至少包含：

- `attachmentId`
- `conversationId`
- 原文件名和 MIME
- 字节数、SHA-256
- 创建时间
- 提取状态
- 页数/幻灯片数
- 可用文字分块
- 预览文件列表
- 视觉结果缓存索引
- 警告和失败原因

路径必须由主进程生成；Renderer 和 Agent 不能传入任意目标路径。文件名只用于展示，不能参与目录拼接。

## 5. 文件路由

### 5.1 图片

- 本地读取尺寸和 MIME。
- 超大图片先缩放，保留原图。
- 需要识图时调用 Qwen。
- Qwen 返回摘要、OCR、对象、元件、连接关系、置信度和警告。

### 5.2 PDF

- 优先本地提取每页文字。
- 文本页直接供 DeepSeek 搜索和读取。
- 扫描页或包含重要图表的页渲染成图片后，按页调用 Qwen OCR/视觉。
- 大 PDF 不允许默认全量识图；先搜索和定位相关页。

### 5.3 Word

- 本地提取标题、段落和表格。
- 提取内嵌图片，按需交给 Qwen。
- 复杂版式需要时转成页面预览，不能仅凭 XML 顺序声称理解布局。

### 5.4 PPT

- 本地提取每页文字、备注、表格和媒体关系。
- 幻灯片预览按需调用 Qwen，补充布局、图表和示意图信息。
- 视觉结果必须保留幻灯片编号。

## 6. Qwen 返回协议

Qwen 工具返回结构化 JSON，不把自由文本直接当成硬件事实：

```json
{
  "summary": "ESP32-S3 与显示屏接线图",
  "ocrText": ["GPIO12", "SDA", "SCL"],
  "components": [
    { "name": "ESP32-S3", "confidence": 0.96 }
  ],
  "connections": [
    {
      "from": "ESP32-S3 GPIO12",
      "to": "Display SDA",
      "confidence": 0.82
    }
  ],
  "warnings": ["SCL 标签模糊，需要人工确认"],
  "sources": [
    { "attachmentId": "att_xxx", "page": 3 }
  ]
}
```

Runtime 对响应做大小限制和 schema 归一化。模型返回非 JSON 时保留为受限摘要并增加解析警告。

## 7. Agent 调用规则

- 用户显式要求“看图、识别截图、读取扫描件、分析原理图”时调用 Qwen 工具。
- 普通 DOCX/PPTX/PDF 先读取本地提取文字，不因为存在附件就必然调用 Qwen。
- 只有相关页、相关图片或文字不足的部分才上传。
- Qwen 未配置或调用失败时，DeepSeek 继续处理本地文字并准确报告缺失能力。
- DeepSeek 的最终回答引用附件名和页码/幻灯片号。
- 不把附件全文、Base64 或 Qwen 原始长响应永久注入系统提示词。

## 8. 安全与限制

- Qwen Base URL 使用允许列表或严格的 HTTPS 校验，阻止 Key 被发送到任意地址。
- 地域与 API Key 配套，配置页明确提示北京、新加坡等地域不能混用。
- 默认本地优先；只上传相关图片或页面。
- 首次云端视觉调用显示非阻塞提示，说明相关内容将发送到配置的 Qwen 服务。
- 拒绝可执行文件、压缩包、宏文档和超出限制的文件。
- SVG 默认按不可信文本处理，不直接在 Renderer 执行。
- 所有附件展示使用安全文件名和受控本地协议，不使用任意 `file://`。
- Qwen 请求和响应进入过程事件时必须脱敏和截断。

## 9. 分阶段施工

### 阶段 A：基础闭环

- 双 Key 首启配置，Qwen 选填。
- 图片附件选择、拖放、卡片和本地保存。
- Qwen 视觉主进程服务。
- Agent 可调用视觉 MCP。
- Qwen 调用进入“执行过程”。

### 阶段 B：文档附件

- PDF、DOCX、PPTX 和文本附件。
- 本地文字提取、分块和搜索。
- PDF 页面、Word 图片、PPT 幻灯片预览的选择性视觉分析。
- 历史会话附件恢复。

### 阶段 C：增强

- OCR 与表格结构化优化。
- 大文档索引。
- 视觉结果缓存和费用/耗时统计。
- 附件清理、会话删除联动和存储管理界面。

## 10. 测试策略

所有自动化测试不得依赖真实 DeepSeek/Qwen Key，也不得向云端发送文件。

必须覆盖：

- 首启 DeepSeek 必填、Qwen 可空。
- Qwen Key 保存后 Renderer 只能看到脱敏状态。
- 文件名穿越、非法 MIME、超限文件拒绝。
- 图片附件添加、删除、发送和历史恢复。
- PDF/DOCX/PPTX 的本地 fixture 提取。
- Qwen mock 请求格式、结构化响应、超时、401、429、5xx 和非 JSON 降级。
- Qwen 未配置时 DeepSeek 主链路不受影响。
- Qwen 调用开始/完成/失败进入任务执行过程。
- 附件 MCP 只能访问当前会话授权的附件。
- `git diff --check`、Runtime/Electron typecheck、main/renderer build 和专项 mock 测试。

真实 API 验收必须由用户提供测试 Key 并明确允许网络调用后执行；自动测试结果不能冒充真实 Qwen 识图已通过。

## 11. 完成标准

- 主开发模型仍为 DeepSeek。
- Qwen Key 可选且能在首次启动填写。
- 用户可以在聊天框添加图片和文档。
- DeepSeek 可以按需调用 Qwen 获取结构化视觉证据。
- Qwen 阶段在现有“执行过程”中可见。
- 没有 Qwen Key、没有网络或视觉失败时，普通开发能力不受影响。
- 施工文档、架构、开发进度、用户手册和发布检查口径同步。
- 无 Key mock 测试通过；真实图片 API 验收结果与真实复杂文档的未验收边界清楚记录。

## 12. 2026-07-25 本轮落地结果

本轮已完成第一阶段可用闭环：

- 首启窗口同屏填写 DeepSeek（必填）和 Qwen（选填）Key；Qwen 留空或保存失败不会阻断 DeepSeek 主链路。两份 Key 只由 Electron 主进程读写。
- 聊天框支持通过附件按钮多选 PNG、JPG/JPEG、WEBP、PDF、DOCX、PPTX、TXT、Markdown 和 JSON；发送前可查看卡片并删除，发送后附件元数据随会话恢复。
- 附件由主进程复制到受控会话目录，以随机附件 ID 访问；单文件上限 25 MB、单消息最多 6 个，拒绝任意路径、未知扩展名和跨会话引用。
- TXT/Markdown/JSON、DOCX、PPTX 和简单文本型 PDF 支持本地文字提取、读取和搜索。
- Runtime MCP 已增加 `attachment.status`、`attachment.inspect`、`attachment.read_text`、`attachment.search`、`vision.qwen_analyze`。
- `vision.qwen_analyze` 经随机令牌保护的 `127.0.0.1` Electron 桥接调用 Qwen，Runtime 和 Renderer 均拿不到 Qwen Key。
- Qwen 工具开始、完成或失败沿用 Agent 工具事件进入现有“执行过程”，并显示“正在调用千问视觉”等可读标签。

本轮明确未宣称完成的能力：

- 当前 Qwen 视觉只接受图片附件；PDF 页面渲染、扫描 PDF、Word 内嵌图片和 PPT 幻灯片视觉化留待下一阶段。
- 当前通过文件选择器添加附件，拖放交互尚未实现。
- PDF 本地提取是轻量、尽力而为的文本解析，不替代完整排版引擎；复杂、加密或扫描 PDF 可能没有可用文字。
- 尚未实现视觉结果缓存、附件随会话删除、存储管理界面以及生产配置页中的地域/Base URL 切换。
- 自动化测试和打包门禁只通过本地 Qwen mock 验证请求与结构化响应，不使用真实 API Key、不会向云端上传文件；功能提交后已按用户要求重建 Windows `win-unpacked`。

随后在 2026-07-25，用户明确使用真实 Qwen 服务完成了图片视觉人工验收：

- 在当前界面一次任务中添加两张 PNG 图片，两个附件均触发“正在调用千问视觉”工具事件。
- 返回记录中的模型为 `qwen-vl-plus`，结构化证据正确识别出智能手表/BANGBOO 线索以及 Espressif、ESP32、VS Code 开发环境。
- 两次视觉结果均进入现有 Agent“执行过程”，Agent 主回答能够引用识别结果继续询问搜索关键词并执行 ESP-IDF 环境检查。
- 因此“图片附件 → 真实 Qwen 云端识别 → 结构化结果回传 → Agent 使用证据”的主闭环记为实测通过。
- 本次人工验收不等同于复杂文档页面视觉或异常覆盖；扫描 PDF、Word 内嵌图片、PPT 幻灯片视觉化，以及真实服务的 401、429、超时和断网降级仍待专项验收。

本轮验证通过：

```powershell
npm.cmd --prefix runtime run typecheck
npm.cmd --prefix electron run typecheck
npm.cmd --prefix electron run verify:qwen-attachments
npm.cmd --prefix electron run verify:session
npm.cmd --prefix electron run verify:task-queue
npm.cmd --prefix electron run verify:skills
npm.cmd --prefix electron run build:renderer
npm.cmd --prefix electron run pack:win
npm.cmd --prefix electron run verify:version
npm.cmd --prefix electron run verify:release
git diff --check
```
