import type { RuntimeEvent } from '../../types';

export interface TaskHistoryItem {
  taskId: string;
  kind: 'hardboard.build' | 'hardboard.flash';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  projectDir: string;
  port: string;
  startedAt: number;
  endedAt: number | null;
  exitCode: number | null;
}

export function mergeRuntimeEventWindow(current: RuntimeEvent[], incoming: RuntimeEvent[]): RuntimeEvent[] {
  const byId = new Map<string, RuntimeEvent>();
  for (const event of [...current, ...incoming]) byId.set(event.id, event);
  return [...byId.values()]
    .sort((left, right) => left.time - right.time || left.seq - right.seq)
    .slice(-500);
}

export function taskHistoryFromEvents(events: RuntimeEvent[]): TaskHistoryItem[] {
  const tasks = new Map<string, TaskHistoryItem>();
  for (const event of events) {
    const payloadTask = event.payload?.task;
    if (!payloadTask || typeof payloadTask !== 'object') continue;
    const task = payloadTask as Record<string, unknown>;
    const kind = task.kind;
    if (kind !== 'hardboard.build' && kind !== 'hardboard.flash') continue;
    const taskId = typeof task.taskId === 'string' ? task.taskId : event.taskId;
    if (!taskId) continue;
    const status = task.status;
    const normalizedStatus = status === 'running' || status === 'completed' || status === 'failed' || status === 'cancelled'
      ? status
      : 'pending';
    tasks.set(taskId, {
      taskId,
      kind,
      status: normalizedStatus,
      projectDir: typeof task.projectDir === 'string' ? task.projectDir : event.projectDir || '',
      port: typeof task.port === 'string' ? task.port : '',
      startedAt: typeof task.startedAt === 'number' ? task.startedAt : event.time,
      endedAt: typeof task.endedAt === 'number' ? task.endedAt : null,
      exitCode: typeof task.exitCode === 'number' ? task.exitCode : null,
    });
  }
  return [...tasks.values()]
    .sort((a, b) => (b.endedAt || b.startedAt) - (a.endedAt || a.startedAt));
}
