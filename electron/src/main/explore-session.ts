import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import type {
  ExploreWorkSessionRecord,
  ExploreWorkSessionSnapshot,
  ExploreWorkSessionSummary,
  ExploreWorkStatus,
} from '../common/project-session';
import { getProjectSessionsRoot, requireActiveProject } from './project-session';

type ExploreSessionMode = 'idea' | 'diagnosis';

const SESSION_ID = /^explore-[a-f0-9-]{36}$/;
const VALID_STATUS = new Set<ExploreWorkStatus>([
  'draft', 'analyzing', 'result_ready', 'planning', 'awaiting_confirmation',
  'execution_queued', 'interrupted', 'error',
]);

function assertMode(value: unknown): ExploreSessionMode {
  if (value !== 'idea' && value !== 'diagnosis') throw new Error('探索会话类型无效');
  return value;
}

function assertSessionId(value: unknown): string {
  if (typeof value !== 'string' || !SESSION_ID.test(value)) throw new Error('探索会话 ID 无效');
  return value;
}

function modeRoot(mode: ExploreSessionMode): string {
  const project = requireActiveProject();
  return path.join(getProjectSessionsRoot(), project.id, 'explore', mode);
}

function sessionFile(mode: ExploreSessionMode, id: string): string {
  return path.join(modeRoot(mode), assertSessionId(id), 'session.json');
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' });
  try {
    if (fs.existsSync(file)) {
      const backup = file + '.previous';
      fs.rmSync(backup, { force: true });
      fs.renameSync(file, backup);
      try {
        fs.renameSync(temporary, file);
        fs.rmSync(backup, { force: true });
      } catch (error) {
        if (!fs.existsSync(file) && fs.existsSync(backup)) fs.renameSync(backup, file);
        throw error;
      }
    } else {
      fs.renameSync(temporary, file);
    }
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function defaultSnapshot(): ExploreWorkSessionSnapshot {
  return {
    input: '',
    selectedContextIds: [],
    selectedKnowledgeIds: [],
    analysisRequest: null,
    analysisResult: null,
    planResult: null,
    planHandoff: null,
    selectedIdeaId: '',
    editingInput: true,
    gatheredContext: null,
    analysisTaskId: null,
    analysisRequestId: null,
    planTaskId: null,
    planRequestId: null,
    executionStarted: false,
    executionTaskId: null,
    executionDisposition: null,
    notice: '',
  };
}

function textOrNull(value: unknown, maxLength = 160): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 160)))].slice(0, 100);
}

function normalizeSnapshot(value: unknown): ExploreWorkSessionSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultSnapshot();
  const input = value as Partial<ExploreWorkSessionSnapshot>;
  const serialized = JSON.stringify(input);
  if (serialized.length > 2 * 1024 * 1024) throw new Error('探索会话数据超过 2MB 上限');
  const selectedContextIds = stringIds(input.selectedContextIds);
  const selectedContextSet = new Set(selectedContextIds);
  const gathered = input.gatheredContext && typeof input.gatheredContext === 'object'
    ? structuredClone(input.gatheredContext)
    : null;
  if (gathered) {
    gathered.items = Array.isArray(gathered.items)
      ? gathered.items.filter((item) => item && typeof item.id === 'string' && selectedContextSet.has(item.id)).slice(0, 30)
      : [];
    gathered.warnings = Array.isArray(gathered.warnings) ? gathered.warnings.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
  }
  return {
    input: typeof input.input === 'string' ? input.input.slice(0, 4_000) : '',
    selectedContextIds,
    selectedKnowledgeIds: stringIds(input.selectedKnowledgeIds),
    analysisRequest: input.analysisRequest && typeof input.analysisRequest === 'object' ? structuredClone(input.analysisRequest) : null,
    analysisResult: input.analysisResult && typeof input.analysisResult === 'object' ? structuredClone(input.analysisResult) : null,
    planResult: input.planResult && typeof input.planResult === 'object' ? structuredClone(input.planResult) : null,
    planHandoff: input.planHandoff && typeof input.planHandoff === 'object' ? structuredClone(input.planHandoff) : null,
    selectedIdeaId: typeof input.selectedIdeaId === 'string' ? input.selectedIdeaId.slice(0, 160) : '',
    editingInput: input.editingInput !== false,
    gatheredContext: gathered,
    analysisTaskId: textOrNull(input.analysisTaskId),
    analysisRequestId: textOrNull(input.analysisRequestId),
    planTaskId: textOrNull(input.planTaskId),
    planRequestId: textOrNull(input.planRequestId),
    executionStarted: input.executionStarted === true,
    executionTaskId: textOrNull(input.executionTaskId),
    executionDisposition: input.executionDisposition === 'started' || input.executionDisposition === 'queued' ? input.executionDisposition : null,
    notice: typeof input.notice === 'string' ? input.notice.slice(0, 2_000) : '',
  };
}

function normalizeRecord(value: unknown, mode: ExploreSessionMode, id: string): ExploreWorkSessionRecord {
  if (!value || typeof value !== 'object') throw new Error('探索会话文件格式无效');
  const input = value as Partial<ExploreWorkSessionRecord>;
  const project = requireActiveProject();
  if (input.projectId !== project.id || input.mode !== mode || input.id !== id) throw new Error('探索会话不属于当前工程');
  const status = VALID_STATUS.has(input.status as ExploreWorkStatus) ? input.status as ExploreWorkStatus : 'error';
  return {
    version: 1,
    id,
    projectId: project.id,
    mode,
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 80) : '未命名探索',
    status,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    snapshot: normalizeSnapshot(input.snapshot),
  };
}

function readRecord(mode: ExploreSessionMode, id: string): ExploreWorkSessionRecord {
  const file = sessionFile(mode, id);
  if (!fs.existsSync(file)) throw new Error('探索会话不存在或已被删除');
  const record = normalizeRecord(JSON.parse(fs.readFileSync(file, 'utf8')), mode, id);
  return record;
}

function summary(record: ExploreWorkSessionRecord): ExploreWorkSessionSummary {
  const { snapshot: _snapshot, version: _version, ...value } = record;
  return value;
}

export function listExploreWorkSessions(modeValue?: unknown): ExploreWorkSessionSummary[] {
  const modes: ExploreSessionMode[] = modeValue == null ? ['idea', 'diagnosis'] : [assertMode(modeValue)];
  const result: ExploreWorkSessionSummary[] = [];
  for (const mode of modes) {
    const root = modeRoot(mode);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !SESSION_ID.test(entry.name)) continue;
      try {
        result.push(summary(readRecord(mode, entry.name)));
      } catch {
        // Invalid records stay on disk for diagnosis but are not exposed as usable sessions.
      }
    }
  }
  return result.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function createExploreWorkSession(modeValue: unknown): ExploreWorkSessionRecord {
  const mode = assertMode(modeValue);
  const project = requireActiveProject();
  const now = new Date().toISOString();
  const record: ExploreWorkSessionRecord = {
    version: 1,
    id: 'explore-' + randomUUID(),
    projectId: project.id,
    mode,
    title: mode === 'idea' ? '新灵感探索' : '新问题调查',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    snapshot: defaultSnapshot(),
  };
  writeJson(sessionFile(mode, record.id), record);
  return structuredClone(record);
}

export function getExploreWorkSession(modeValue: unknown, idValue: unknown): ExploreWorkSessionRecord {
  return structuredClone(readRecord(assertMode(modeValue), assertSessionId(idValue)));
}

export function saveExploreWorkSession(value: unknown): ExploreWorkSessionRecord {
  if (!value || typeof value !== 'object') throw new Error('探索会话更新无效');
  const input = value as Partial<ExploreWorkSessionRecord>;
  const mode = assertMode(input.mode);
  const id = assertSessionId(input.id);
  const current = readRecord(mode, id);
  const status = VALID_STATUS.has(input.status as ExploreWorkStatus) ? input.status as ExploreWorkStatus : current.status;
  const snapshot = input.snapshot && typeof input.snapshot === 'object'
    ? normalizeSnapshot(input.snapshot)
    : current.snapshot;
  const next: ExploreWorkSessionRecord = {
    ...current,
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 80) : current.title,
    status,
    updatedAt: new Date().toISOString(),
    snapshot,
  };
  writeJson(sessionFile(mode, id), next);
  return structuredClone(next);
}

export function deleteExploreWorkSession(modeValue: unknown, idValue: unknown): ExploreWorkSessionSummary[] {
  const mode = assertMode(modeValue);
  const id = assertSessionId(idValue);
  const directory = path.dirname(sessionFile(mode, id));
  if (!fs.existsSync(directory)) throw new Error('探索会话不存在或已被删除');
  fs.rmSync(directory, { recursive: true, force: false });
  return listExploreWorkSessions();
}

export function registerExploreSessionIpc(registrar: Pick<IpcMain, 'handle'>): void {
  registrar.handle('explore:sessions:list', async (_event, mode?: unknown) => listExploreWorkSessions(mode));
  registrar.handle('explore:sessions:create', async (_event, mode: unknown) => createExploreWorkSession(mode));
  registrar.handle('explore:sessions:get', async (_event, mode: unknown, id: unknown) => getExploreWorkSession(mode, id));
  registrar.handle('explore:sessions:save', async (_event, value: unknown) => saveExploreWorkSession(value));
  registrar.handle('explore:sessions:delete', async (_event, mode: unknown, id: unknown) => deleteExploreWorkSession(mode, id));
}
