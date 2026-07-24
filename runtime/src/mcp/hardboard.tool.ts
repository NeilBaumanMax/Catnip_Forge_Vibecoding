import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createHardboardSnapshot,
  getHardboardEnvStatus,
  type HardboardCommandResult,
  listHardboardDevices,
  runIdfBuild,
  runIdfClean,
  runIdfEraseFlash,
  runIdfFlash,
  runIdfSetTarget,
  runSerialCapture,
} from '../hardboard.js';
import { publishRuntimeEvent } from '../eventbus/index.js';
import { RUNTIME_DIRS } from '../paths.js';
import {
  callSerialMonitorBridge,
  type SerialMonitorBridgeSnapshot,
} from '../hardboard/serial-monitor-client.js';

const OUTPUT_TAIL_CHARS = 6000;

export function registerHardboardTools(server: McpServer) {
  server.registerTool('hardboard.env_status', {
    description: '查看硬件 vibecoding 的 ESP-IDF、示例、项目、文档目录状态',
    inputSchema: {
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4'),
    },
  }, async ({ version }) => {
    return withToolEvent('hardboard.env_status', async () => {
      return { content: [{ type: 'text', text: JSON.stringify(getHardboardEnvStatus(version), null, 2) }] };
    });
  });

  server.registerTool('hardboard.devices_list', {
    description: '列出当前连接的串口设备，用于选择 ESP32/ESP32-S3 烧录端口',
  }, async () => {
    return withToolEvent('hardboard.devices_list', async () => {
      const devices = await listHardboardDevices();
      return { content: [{ type: 'text', text: devices.length ? JSON.stringify(devices, null, 2) : '(未发现串口设备)' }] };
    });
  });

  server.registerTool('hardboard.idf_build', {
    description: '使用随包 ESP-IDF 编译一个 ESP-IDF 项目',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4'),
    },
  }, async ({ projectDir, version }) => {
    const result = await runIdfBuild(projectDir || RUNTIME_DIRS.hardboardProjects, version);
    return { content: [{ type: 'text', text: JSON.stringify(compactCommandResult(result), null, 2) }] };
  });

  server.registerTool('hardboard.idf_set_target', {
    description: '在 ESP-IDF 工程中执行 idf.py set-target，标准新工程流程中应先设置芯片目标',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      target: z.string().optional().describe('目标芯片，例如 esp32s3、esp32c3、esp32；默认 esp32s3'),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4.3'),
    },
  }, async ({ projectDir, target, version }) => {
    const result = await runIdfSetTarget(projectDir || RUNTIME_DIRS.hardboardProjects, target || 'esp32s3', version);
    return { content: [{ type: 'text', text: JSON.stringify(compactCommandResult(result), null, 2) }] };
  });

  server.registerTool('hardboard.idf_flash', {
    description: '使用随包 ESP-IDF 编译/烧录一个 ESP-IDF 项目到指定串口设备',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      port: z.string().describe('串口端口，例如 COM3、COM8、/dev/ttyUSB0'),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4'),
    },
  }, async ({ projectDir, port, version }) => {
    const result = await runIdfFlash(projectDir || RUNTIME_DIRS.hardboardProjects, port, version);
    return { content: [{ type: 'text', text: JSON.stringify(compactCommandResult(result), null, 2) }] };
  });

  server.registerTool('hardboard.idf_clean', {
    description: '对 ESP-IDF 工程执行 idf.py fullclean，清理 build 产物',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4.3'),
    },
  }, async ({ projectDir, version }) => {
    const result = await runIdfClean(projectDir || RUNTIME_DIRS.hardboardProjects, version);
    return { content: [{ type: 'text', text: JSON.stringify(compactCommandResult(result), null, 2) }] };
  });

  server.registerTool('hardboard.idf_erase_flash', {
    description: '对指定串口连接的 ESP32 设备执行 idf.py erase-flash',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      port: z.string().describe('串口端口，例如 COM3、COM8、/dev/ttyUSB0'),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4.3'),
    },
  }, async ({ projectDir, port, version }) => {
    const result = await runIdfEraseFlash(projectDir || RUNTIME_DIRS.hardboardProjects, port, version);
    return { content: [{ type: 'text', text: JSON.stringify(compactCommandResult(result), null, 2) }] };
  });

  server.registerTool('hardboard.serial_status', {
    description: '查看共享串口监视器的打开状态、端口配置、收发字节数和最近事件。',
  }, async () => withSerialToolEvent('hardboard.serial_status', 'status'));

  server.registerTool('hardboard.serial_open', {
    description: '打开共享串口监视器。界面与 Agent 使用同一个串口会话，不会重复占用 COM 口。',
    inputSchema: {
      port: z.string().describe('串口端口，例如 COM3 或 /dev/ttyUSB0'),
      baudRate: z.number().optional().describe('波特率，默认 115200'),
      encoding: z.string().optional().describe('文本编码，默认 utf-8'),
      dataBits: z.number().optional().describe('数据位，默认 8'),
      stopBits: z.number().optional().describe('停止位，默认 1'),
      parity: z.enum(['none', 'odd', 'even']).optional().describe('校验位，默认 none'),
    },
  }, async (input) => withSerialToolEvent('hardboard.serial_open', 'open', input));

  server.registerTool('hardboard.serial_close', {
    description: '关闭共享串口监视器。',
  }, async () => withSerialToolEvent('hardboard.serial_close', 'close'));

  server.registerTool('hardboard.serial_write', {
    description: '向当前共享串口发送文本或 HEX 数据；发送记录会同步显示在串口监视器界面。',
    inputSchema: {
      data: z.string().describe('要发送的文本，或 HEX 字节，例如 48 65 6C 6C 6F'),
      mode: z.enum(['text', 'hex']).optional().describe('发送模式，默认 text'),
      encoding: z.string().optional().describe('文本编码，默认 utf-8'),
    },
  }, async (input) => withSerialToolEvent('hardboard.serial_write', 'write', input));

  server.registerTool('hardboard.serial_read', {
    description: '读取共享串口缓冲区；使用 sinceSeq 可只取某个序号之后的新事件。',
    inputSchema: {
      sinceSeq: z.number().optional().describe('只返回该序号之后的事件，默认 0'),
      limit: z.number().optional().describe('最多返回事件数，默认 200，最大 1000'),
    },
  }, async (input) => withSerialToolEvent('hardboard.serial_read', 'read', input));

  server.registerTool('hardboard.serial_wait', {
    description: '等待串口收到指定文本或正则匹配内容，适合等待启动日志、READY 或测试响应。',
    inputSchema: {
      sinceSeq: z.number().optional().describe('只匹配该序号之后的新接收事件'),
      text: z.string().optional().describe('要等待的普通文本'),
      regex: z.string().optional().describe('要等待的 JavaScript 正则表达式，最长 256 字符'),
      timeoutMs: z.number().optional().describe('等待毫秒数，默认 5000，最大 30000'),
    },
  }, async (input) => withSerialToolEvent('hardboard.serial_wait', 'wait', input));

  server.registerTool('hardboard.serial_clear', {
    description: '清空共享串口监视器的收发缓冲和统计；界面接收区会同步清空。',
  }, async () => withSerialToolEvent('hardboard.serial_clear', 'clear'));

  server.registerTool('hardboard.serial_capture', {
    description: '非交互读取串口日志，用于验证 ESP32 程序实际运行状态；适合 SSH/Agent 场景替代 idf.py monitor',
    inputSchema: {
      port: z.string().describe('串口端口，例如 COM3、COM8、/dev/ttyUSB0'),
      durationSeconds: z.number().optional().describe('抓取秒数，默认 20'),
      baudRate: z.number().optional().describe('串口波特率，默认 115200'),
      version: z.string().optional().describe('ESP-IDF 版本，默认 5.4.3'),
    },
  }, async ({ port, durationSeconds, baudRate, version }) => {
    const result = await runSerialCapture(port, durationSeconds || 20, baudRate || 115200, version);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.registerTool('hardboard.snapshot_create', {
    description: '复制 ESP-IDF 工程源码到 runtime/hardboard/git-snapshots，排除 build/.git 等产物，便于本地回滚',
    inputSchema: {
      projectDir: z.string().optional().describe(`ESP-IDF 项目目录；默认 ${RUNTIME_DIRS.hardboardProjects}`),
      label: z.string().optional().describe('快照标签，例如 before-led-change'),
    },
  }, async ({ projectDir, label }) => {
    return withToolEvent('hardboard.snapshot_create', async () => {
      const result = createHardboardSnapshot(projectDir || RUNTIME_DIRS.hardboardProjects, label || '');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }, projectDir || RUNTIME_DIRS.hardboardProjects);
  });
}

async function withSerialToolEvent(
  toolName: string,
  method: string,
  params: Record<string, unknown> = {},
) {
  return withToolEvent(toolName, async () => {
    const result = await callSerialMonitorBridge<SerialMonitorBridgeSnapshot | Record<string, unknown>>(method, params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  });
}

async function withToolEvent<T>(toolName: string, fn: () => Promise<T>, projectDir?: string): Promise<T> {
  const taskId = `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  publishRuntimeEvent({
    source: 'mcp',
    kind: 'tool.started',
    taskId,
    toolName,
    projectDir,
  });
  try {
    const result = await fn();
    publishRuntimeEvent({
      source: 'mcp',
      kind: 'tool.completed',
      taskId,
      toolName,
      projectDir,
      payload: { exitCode: 0, ok: true },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publishRuntimeEvent({
      source: 'mcp',
      kind: 'tool.failed',
      taskId,
      toolName,
      projectDir,
      message,
      payload: { exitCode: 1, ok: false },
    });
    throw error;
  }
}

function compactCommandResult(result: HardboardCommandResult) {
  return {
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    ok: result.exitCode === 0,
    logPath: result.logPath,
    stdoutLogPath: result.stdoutLogPath,
    stderrLogPath: result.stderrLogPath,
    stdoutBytes: Buffer.byteLength(result.stdout || '', 'utf-8'),
    stderrBytes: Buffer.byteLength(result.stderr || '', 'utf-8'),
    stdoutTail: tailText(result.stdout || ''),
    stderrTail: tailText(result.stderr || ''),
  };
}

function tailText(value: string): string {
  if (value.length <= OUTPUT_TAIL_CHARS) return value;
  return `[truncated: showing last ${OUTPUT_TAIL_CHARS} chars of ${value.length}]\n${value.slice(-OUTPUT_TAIL_CHARS)}`;
}
