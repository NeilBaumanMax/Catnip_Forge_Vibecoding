import { EventEmitter } from 'node:events';

export type SerialMonitorActor = 'ui' | 'agent' | 'system';
export type SerialMonitorDirection = 'rx' | 'tx' | 'system';

export interface SerialMonitorOptions {
  port: string;
  baudRate: number;
  encoding: string;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'odd' | 'even';
}

export interface SerialTransportHandlers {
  onData: (data: { text: string; hex?: string; stream: 'stdout' | 'stderr' }) => void;
  onExit: (result: { code: number | null; signal: NodeJS.Signals | null }) => void;
  onError: (error: Error) => void;
}

export interface SerialTransport {
  write(data: string, mode: 'text' | 'hex', encoding: string): void;
  close(): Promise<void>;
}

export type SerialTransportFactory = (
  options: SerialMonitorOptions,
  handlers: SerialTransportHandlers,
) => Promise<SerialTransport>;

export interface SerialMonitorEvent {
  seq: number;
  text: string;
  hex?: string;
  timestamp: number;
  stream: 'stdout' | 'stderr';
  direction: SerialMonitorDirection;
  actor: SerialMonitorActor;
}

export interface SerialMonitorSnapshot {
  running: boolean;
  opening: boolean;
  options: SerialMonitorOptions | null;
  openedBy: SerialMonitorActor | null;
  openedAt: number | null;
  lastSeq: number;
  oldestSeq: number;
  receivedBytes: number;
  sentBytes: number;
  lastError: string | null;
  events: SerialMonitorEvent[];
}

interface ReadOptions {
  sinceSeq?: number;
  limit?: number;
}

interface WaitOptions {
  sinceSeq?: number;
  text?: string;
  regex?: string;
  timeoutMs?: number;
}

const MAX_WRITE_CHARS = 8192;

export class SerialMonitorSession {
  private readonly emitter = new EventEmitter();
  private transport: SerialTransport | null = null;
  private opening = false;
  private options: SerialMonitorOptions | null = null;
  private openedBy: SerialMonitorActor | null = null;
  private openedAt: number | null = null;
  private lastError: string | null = null;
  private receivedBytes = 0;
  private sentBytes = 0;
  private seq = 0;
  private events: SerialMonitorEvent[] = [];
  private eventChars = 0;
  private generation = 0;

  constructor(
    private readonly factory: SerialTransportFactory,
    private readonly maxEvents = 1000,
    private readonly maxEventChars = 1_000_000,
  ) {}

  isRunning(): boolean {
    return Boolean(this.transport);
  }

  async start(options: SerialMonitorOptions, actor: SerialMonitorActor = 'ui'): Promise<{ ok: boolean; error?: string }> {
    const normalized = normalizeOptions(options);
    if (!normalized.port) return { ok: false, error: '缺少串口端口' };
    await this.stop('system');

    const generation = ++this.generation;
    this.opening = true;
    this.options = normalized;
    this.openedBy = actor;
    this.openedAt = null;
    this.lastError = null;
    this.emitState();

    try {
      const transport = await this.factory(normalized, {
        onData: (data) => {
          if (generation !== this.generation) return;
          if (data.stream === 'stderr') this.lastError = data.text.trim() || this.lastError;
          this.appendEvent({
            text: data.text,
            hex: data.hex,
            stream: data.stream,
            direction: data.stream === 'stdout' ? 'rx' : 'system',
            actor: 'system',
          });
        },
        onExit: (result) => {
          if (generation !== this.generation) return;
          this.transport = null;
          this.opening = false;
          if (result.code && result.code !== 0) this.lastError ||= `串口进程退出（${result.code}）`;
          this.emitState();
        },
        onError: (error) => {
          if (generation !== this.generation) return;
          this.lastError = error.message;
          this.appendEvent({
            text: `[串口] 启动失败: ${error.message}\n`,
            stream: 'stderr',
            direction: 'system',
            actor: 'system',
          });
          this.emitState();
        },
      });
      if (generation !== this.generation) {
        await transport.close();
        return { ok: false, error: '串口打开操作已取消' };
      }
      this.transport = transport;
      this.opening = false;
      this.openedAt = Date.now();
      this.emitState();
      return { ok: true };
    } catch (error) {
      if (generation === this.generation) {
        this.transport = null;
        this.opening = false;
        this.lastError = error instanceof Error ? error.message : String(error);
        this.emitState();
      }
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async stop(actor: SerialMonitorActor = 'ui'): Promise<{ ok: boolean }> {
    const transport = this.transport;
    this.transport = null;
    this.opening = false;
    this.generation++;
    if (transport) await transport.close();
    if (this.options && transport) {
      this.appendEvent({
        text: `[${actor === 'agent' ? 'Agent' : '界面'}] 已关闭串口 ${this.options.port}\n`,
        stream: 'stderr',
        direction: 'system',
        actor,
      });
    }
    this.emitState();
    return { ok: true };
  }

  write(data: string, mode: 'text' | 'hex', encoding: string, actor: SerialMonitorActor = 'ui'): { ok: boolean; error?: string } {
    if (!this.transport) return { ok: false, error: '串口尚未打开' };
    if (data.length > MAX_WRITE_CHARS) return { ok: false, error: `单次发送不能超过 ${MAX_WRITE_CHARS} 个字符` };
    if (mode === 'hex') {
      const cleaned = data.replace(/[\s,:-]/g, '');
      if (!cleaned || !/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) {
        return { ok: false, error: 'HEX 数据必须是完整字节，例如 48 65 6C 6C 6F' };
      }
    }
    try {
      this.transport.write(data, mode, encoding);
      const byteLength = mode === 'hex'
        ? data.replace(/[\s,:-]/g, '').length / 2
        : Buffer.byteLength(data, normalizeEncoding(encoding));
      this.sentBytes += byteLength;
      this.appendEvent({
        text: data,
        hex: mode === 'hex' ? data.trim() : undefined,
        stream: 'stdout',
        direction: 'tx',
        actor,
      });
      return { ok: true };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.emitState();
      return { ok: false, error: this.lastError };
    }
  }

  read(options: ReadOptions = {}): SerialMonitorSnapshot {
    const sinceSeq = Math.max(0, Number(options.sinceSeq) || 0);
    const limit = Math.min(1000, Math.max(1, Number(options.limit) || 200));
    const events = this.events.filter((event) => event.seq > sinceSeq).slice(-limit);
    return {
      running: this.isRunning(),
      opening: this.opening,
      options: this.options ? { ...this.options } : null,
      openedBy: this.openedBy,
      openedAt: this.openedAt,
      lastSeq: this.seq,
      oldestSeq: this.events[0]?.seq ?? this.seq,
      receivedBytes: this.receivedBytes,
      sentBytes: this.sentBytes,
      lastError: this.lastError,
      events,
    };
  }

  clear(actor: SerialMonitorActor = 'ui'): SerialMonitorSnapshot {
    this.events = [];
    this.eventChars = 0;
    this.receivedBytes = 0;
    this.sentBytes = 0;
    this.emitter.emit('clear', { actor, lastSeq: this.seq });
    this.emitState();
    return this.read();
  }

  async waitFor(options: WaitOptions): Promise<{ matched: boolean; event?: SerialMonitorEvent; snapshot: SerialMonitorSnapshot }> {
    const sinceSeq = Math.max(0, Number(options.sinceSeq) || 0);
    const timeoutMs = Math.min(30_000, Math.max(50, Number(options.timeoutMs) || 5_000));
    const matcher = createMatcher(options);
    const existing = this.events.find((event) => event.seq > sinceSeq && event.direction === 'rx' && matcher(event));
    if (existing) return { matched: true, event: existing, snapshot: this.read({ sinceSeq }) };

    return new Promise((resolve) => {
      const onEvent = (event: SerialMonitorEvent) => {
        if (event.seq <= sinceSeq || event.direction !== 'rx' || !matcher(event)) return;
        cleanup();
        resolve({ matched: true, event, snapshot: this.read({ sinceSeq }) });
      };
      const timer = setTimeout(() => {
        cleanup();
        resolve({ matched: false, snapshot: this.read({ sinceSeq }) });
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        this.emitter.off('event', onEvent);
      };
      this.emitter.on('event', onEvent);
    });
  }

  subscribeEvent(listener: (event: SerialMonitorEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  subscribeState(listener: (snapshot: SerialMonitorSnapshot) => void): () => void {
    this.emitter.on('state', listener);
    return () => this.emitter.off('state', listener);
  }

  subscribeClear(listener: (event: { actor: SerialMonitorActor; lastSeq: number }) => void): () => void {
    this.emitter.on('clear', listener);
    return () => this.emitter.off('clear', listener);
  }

  private appendEvent(input: Omit<SerialMonitorEvent, 'seq' | 'timestamp'>): void {
    const event: SerialMonitorEvent = { ...input, seq: ++this.seq, timestamp: Date.now() };
    this.events.push(event);
    this.eventChars += event.text.length + (event.hex?.length || 0);
    if (event.direction === 'rx') this.receivedBytes += event.hex ? Math.ceil(event.hex.length / 3) : Buffer.byteLength(event.text);
    while (this.events.length > this.maxEvents || this.eventChars > this.maxEventChars) {
      const removed = this.events.shift();
      if (!removed) break;
      this.eventChars -= removed.text.length + (removed.hex?.length || 0);
    }
    this.emitter.emit('event', event);
  }

  private emitState(): void {
    this.emitter.emit('state', this.read());
  }
}

function normalizeOptions(options: SerialMonitorOptions): SerialMonitorOptions {
  return {
    port: String(options.port || '').trim(),
    baudRate: Math.min(4_000_000, Math.max(1, Number(options.baudRate) || 115200)),
    encoding: String(options.encoding || 'utf-8').toLowerCase(),
    dataBits: [5, 6, 7, 8].includes(Number(options.dataBits)) ? Number(options.dataBits) : 8,
    stopBits: Number(options.stopBits) === 2 ? 2 : 1,
    parity: ['odd', 'even'].includes(String(options.parity)) ? options.parity : 'none',
  };
}

function normalizeEncoding(encoding: string): BufferEncoding {
  const value = encoding.toLowerCase();
  if (value === 'ascii' || value === 'latin1' || value === 'utf8' || value === 'utf-8') {
    return value === 'utf-8' ? 'utf8' : value;
  }
  return 'utf8';
}

function createMatcher(options: WaitOptions): (event: SerialMonitorEvent) => boolean {
  if (options.regex) {
    if (options.regex.length > 256) throw new Error('regex 最长 256 个字符');
    const expression = new RegExp(options.regex);
    return (event) => expression.test(event.text);
  }
  const text = String(options.text || '');
  return text ? (event) => event.text.includes(text) : () => true;
}
