export interface SerialMonitorBridgeEvent {
  seq: number;
  text: string;
  hex?: string;
  timestamp: number;
  stream: 'stdout' | 'stderr';
  direction: 'rx' | 'tx' | 'system';
  actor: 'ui' | 'agent' | 'system';
}

export interface SerialMonitorBridgeSnapshot {
  running: boolean;
  opening: boolean;
  options: {
    port: string;
    baudRate: number;
    encoding: string;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'odd' | 'even';
  } | null;
  openedBy: 'ui' | 'agent' | 'system' | null;
  openedAt: number | null;
  lastSeq: number;
  oldestSeq: number;
  receivedBytes: number;
  sentBytes: number;
  lastError: string | null;
  events: SerialMonitorBridgeEvent[];
}

export function hasSerialMonitorBridge(): boolean {
  return Boolean(process.env.CATNIP_SERIAL_BRIDGE_URL && process.env.CATNIP_SERIAL_BRIDGE_TOKEN);
}

export async function callSerialMonitorBridge<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = process.env.CATNIP_SERIAL_BRIDGE_URL;
  const token = process.env.CATNIP_SERIAL_BRIDGE_TOKEN;
  if (!url || !token) throw new Error('串口监视器桥接服务不可用；请从 Catnip Forge 内启动 Agent');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(method === 'capture' ? 35_000 : 32_000),
  });
  const payload = await response.json() as { ok?: boolean; result?: T; error?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `串口桥接请求失败（HTTP ${response.status}）`);
  return payload.result as T;
}
