import { randomBytes, timingSafeEqual } from 'node:crypto';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import {
  clearSharedSerialMonitor,
  readSharedSerialMonitor,
  startSharedSerialMonitor,
  stopSharedSerialMonitor,
  waitForSharedSerialMonitor,
  writeSharedSerialMonitor,
  type SerialMonitorOptions,
} from './serial-monitor-controller';
import { listHardboardDevices } from './hardboard';

const MAX_BODY_BYTES = 64 * 1024;
let server: http.Server | null = null;
let bridgeUrl = '';
let bridgeToken = '';
let startPromise: Promise<void> | null = null;

export function startSerialMonitorBridge(): Promise<void> {
  if (server && bridgeUrl) return Promise.resolve();
  if (startPromise) return startPromise;

  bridgeToken = randomBytes(32).toString('hex');
  server = http.createServer((request, response) => {
    void handleRequest(request, response);
  });
  const pending = new Promise<void>((resolve, reject) => {
    const activeServer = server!;
    activeServer.once('error', reject);
    activeServer.listen(0, '127.0.0.1', () => {
      const address = activeServer.address();
      if (!address || typeof address === 'string') {
        reject(new Error('串口控制桥接服务未取得本地端口'));
        return;
      }
      bridgeUrl = `http://127.0.0.1:${address.port}/rpc`;
      resolve();
    });
  }).finally(() => {
    startPromise = null;
  });
  startPromise = pending;
  return pending;
}

export async function stopSerialMonitorBridge(): Promise<void> {
  const activeServer = server;
  server = null;
  bridgeUrl = '';
  bridgeToken = '';
  if (!activeServer) return;
  await new Promise<void>((resolve) => activeServer.close(() => resolve()));
}

export function getSerialMonitorBridgeEnv(): Record<string, string> {
  if (!bridgeUrl || !bridgeToken) return {};
  return {
    CATNIP_SERIAL_BRIDGE_URL: bridgeUrl,
    CATNIP_SERIAL_BRIDGE_TOKEN: bridgeToken,
  };
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.method !== 'POST' || request.url !== '/rpc') {
    send(response, 404, { ok: false, error: 'not found' });
    return;
  }
  if (!authorized(request)) {
    send(response, 401, { ok: false, error: 'unauthorized' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const result = await dispatch(String(body.method || ''), asRecord(body.params));
    send(response, 200, { ok: true, result });
  } catch (error) {
    send(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'devices':
      return { devices: await listHardboardDevices() };
    case 'status':
    case 'read':
      return readSharedSerialMonitor(numberParam(params.sinceSeq, 0), numberParam(params.limit, 200));
    case 'open':
      return startSharedSerialMonitor(parseOptions(params), 'agent');
    case 'close':
      return stopSharedSerialMonitor('agent');
    case 'write':
      return writeSharedSerialMonitor(
        stringParam(params.data),
        params.mode === 'hex' ? 'hex' : 'text',
        stringParam(params.encoding, 'utf-8'),
        'agent',
      );
    case 'clear':
      return clearSharedSerialMonitor('agent');
    case 'wait':
      return waitForSharedSerialMonitor({
        sinceSeq: numberParam(params.sinceSeq, 0),
        text: params.text === undefined ? undefined : stringParam(params.text),
        regex: params.regex === undefined ? undefined : stringParam(params.regex),
        timeoutMs: numberParam(params.timeoutMs, 5000),
      });
    case 'capture':
      return capture(params);
    default:
      throw new Error(`未知串口控制方法: ${method}`);
  }
}

async function capture(params: Record<string, unknown>): Promise<unknown> {
  const durationMs = Math.min(30_000, Math.max(100, numberParam(params.durationMs, 20_000)));
  const options = parseOptions(params);
  const before = readSharedSerialMonitor(0, 1);
  let temporary = false;
  if (!before.running) {
    const opened = await startSharedSerialMonitor(options, 'agent');
    if (!opened.ok) throw new Error(opened.error || `无法打开 ${options.port}`);
    temporary = true;
  } else if (
    before.options?.port.toLowerCase() !== options.port.toLowerCase()
    || before.options?.baudRate !== options.baudRate
  ) {
    throw new Error(`串口监视器正在使用 ${before.options?.port} @ ${before.options?.baudRate}，不能同时采集 ${options.port}`);
  }

  const sinceSeq = readSharedSerialMonitor(0, 1).lastSeq;
  await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
  const snapshot = readSharedSerialMonitor(sinceSeq, 1000);
  if (temporary) await stopSharedSerialMonitor('agent');
  return { temporarySession: temporary, ...snapshot };
}

function parseOptions(params: Record<string, unknown>): SerialMonitorOptions {
  return {
    port: stringParam(params.port).trim(),
    baudRate: numberParam(params.baudRate, 115200),
    encoding: stringParam(params.encoding, 'utf-8'),
    dataBits: numberParam(params.dataBits, 8),
    stopBits: numberParam(params.stopBits, 1),
    parity: params.parity === 'odd' || params.parity === 'even' ? params.parity : 'none',
  };
}

function authorized(request: IncomingMessage): boolean {
  const provided = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!provided || !bridgeToken || provided.length !== bridgeToken.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(bridgeToken));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const raw of request) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown;
  return asRecord(parsed);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringParam(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberParam(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
