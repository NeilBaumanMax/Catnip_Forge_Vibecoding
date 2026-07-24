import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callAttachmentBridge } from '../attachment/client.js';

export function registerAttachmentTools(server: McpServer): void {
  server.registerTool('attachment.status', {
    description: '查看聊天附件桥接和 Qwen 视觉服务是否已配置，不返回任何 API Key。',
  }, async () => textResult(await callAttachmentBridge('status')));

  server.registerTool('attachment.inspect', {
    description: '查看一个聊天附件的类型、大小、本地文字可用性和短预览。',
    inputSchema: {
      conversationId: z.string().describe('任务提示中给出的 conversationId'),
      attachmentId: z.string().describe('任务提示中给出的 attachmentId'),
    },
  }, async (input) => textResult(await callAttachmentBridge('inspect', input)));

  server.registerTool('attachment.read_text', {
    description: '读取 PDF、DOCX、PPTX、TXT、Markdown 或 JSON 附件在本地提取的文字；支持分段读取。',
    inputSchema: {
      conversationId: z.string(),
      attachmentId: z.string(),
      offset: z.number().optional().describe('字符偏移，默认 0'),
      limit: z.number().optional().describe('返回字符数，默认 12000，最大 30000'),
    },
  }, async (input) => textResult(await callAttachmentBridge('read_text', input)));

  server.registerTool('attachment.search', {
    description: '在附件本地提取文字中搜索关键词，返回最多 20 个带偏移的上下文。',
    inputSchema: {
      conversationId: z.string(),
      attachmentId: z.string(),
      query: z.string().describe('搜索词'),
    },
  }, async (input) => textResult(await callAttachmentBridge('search', input)));

  server.registerTool('vision.qwen_analyze', {
    description: '调用 Qwen 视觉分析当前对话中的图片附件。Qwen 只返回视觉证据，最终推理和开发仍由 DeepSeek 主 Agent 完成。',
    inputSchema: {
      conversationId: z.string(),
      attachmentId: z.string(),
      prompt: z.string().optional().describe('要从图片中确认的具体问题；应要求标注不确定项'),
    },
  }, async (input) => textResult(await callAttachmentBridge('analyze', input)));
}

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}
