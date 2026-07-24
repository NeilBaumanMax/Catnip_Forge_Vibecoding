import {
  startSerialMonitor as startLegacySerialMonitor,
  stopSerialMonitor as stopLegacySerialMonitor,
  writeSerialMonitor as writeLegacySerialMonitor,
} from './hardboard';
import {
  SerialMonitorSession,
  type SerialMonitorActor,
  type SerialMonitorEvent,
  type SerialMonitorOptions,
  type SerialMonitorSnapshot,
  type SerialTransport,
} from './serial-monitor-session';

export type {
  SerialMonitorActor,
  SerialMonitorEvent,
  SerialMonitorOptions,
  SerialMonitorSnapshot,
} from './serial-monitor-session';

const session = new SerialMonitorSession(async (options, handlers): Promise<SerialTransport> => {
  const result = await startLegacySerialMonitor(
    options,
    (chunk) => handlers.onData({ text: chunk.text, hex: chunk.hex, stream: chunk.stream }),
    handlers.onExit,
  );
  if (!result.ok) throw new Error(result.error || '无法打开串口');

  return {
    write(data, mode, encoding) {
      const writeResult = writeLegacySerialMonitor(data, mode, encoding);
      if (!writeResult.ok) throw new Error(writeResult.error || '串口发送失败');
    },
    async close() {
      await stopLegacySerialMonitor();
    },
  };
});

export function isSharedSerialMonitorRunning(): boolean {
  return session.isRunning();
}

export function startSharedSerialMonitor(options: SerialMonitorOptions, actor: SerialMonitorActor = 'ui') {
  return session.start(options, actor);
}

export function stopSharedSerialMonitor(actor: SerialMonitorActor = 'ui') {
  return session.stop(actor);
}

export function writeSharedSerialMonitor(
  data: string,
  mode: 'text' | 'hex',
  encoding: string,
  actor: SerialMonitorActor = 'ui',
) {
  return session.write(data, mode, encoding, actor);
}

export function readSharedSerialMonitor(sinceSeq = 0, limit = 200): SerialMonitorSnapshot {
  return session.read({ sinceSeq, limit });
}

export function clearSharedSerialMonitor(actor: SerialMonitorActor = 'ui'): SerialMonitorSnapshot {
  return session.clear(actor);
}

export function waitForSharedSerialMonitor(options: {
  sinceSeq?: number;
  text?: string;
  regex?: string;
  timeoutMs?: number;
}) {
  return session.waitFor(options);
}

export function subscribeSharedSerialEvents(listener: (event: SerialMonitorEvent) => void): () => void {
  return session.subscribeEvent(listener);
}

export function subscribeSharedSerialState(listener: (snapshot: SerialMonitorSnapshot) => void): () => void {
  return session.subscribeState(listener);
}

export function subscribeSharedSerialClear(
  listener: (event: { actor: SerialMonitorActor; lastSeq: number }) => void,
): () => void {
  return session.subscribeClear(listener);
}
