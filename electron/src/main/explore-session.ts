import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import type {
  ExploreHandoffArtifact,
  ExploreWorkSessionRecord,
  ExploreWorkSessionSnapshot,
  ExploreWorkSessionSummary,
  ExploreWorkStatus,
} from '../common/project-session';
import { normalizeExploreAnalysisResult, normalizeHandoffContext, type HandoffContext } from '../common/explore';
import { getActiveProjectStatePath, getProjectSessionsRoot, requireActiveProject } from './project-session';

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
  const target = getActiveProjectStatePath('explore', mode);
  const legacy = path.join(getProjectSessionsRoot(), project.id, 'explore', mode);
  if (!fs.existsSync(target) && fs.existsSync(legacy)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(legacy, target, { recursive: true, errorOnExist: true, force: false });
  }
  return target;
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
    displayStage: 'describe',
    conversation: [],
    handoffArtifact: null,
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
    displayStage: input.displayStage === 'analyze' || input.displayStage === 'plan' || input.displayStage === 'execute' ? input.displayStage : 'describe',
    conversation: Array.isArray(input.conversation) ? input.conversation.slice(-200).flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return [];
      const message = raw as ExploreWorkSessionSnapshot['conversation'][number];
      const roles = new Set(['user', 'assistant', 'system']);
      const kinds = new Set(['request', 'status', 'result', 'plan', 'handoff', 'execution', 'error']);
      if (!roles.has(message.role) || !kinds.has(message.kind) || typeof message.text !== 'string') return [];
      return [{
        id: typeof message.id === 'string' && message.id ? message.id.slice(0, 160) : randomUUID(),
        role: message.role,
        kind: message.kind,
        text: message.text.slice(0, 8_000),
        createdAt: typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt)) ? message.createdAt : new Date().toISOString(),
        requestId: textOrNull(message.requestId) || undefined,
        taskId: textOrNull(message.taskId) || undefined,
      }];
    }) : [],
    handoffArtifact: normalizeArtifactMetadata(input.handoffArtifact),
  };
}

function normalizeArtifactMetadata(value: unknown): ExploreHandoffArtifact | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<ExploreHandoffArtifact>;
  if (input.version !== 1 || typeof input.projectId !== 'string' || typeof input.sessionId !== 'string'
    || (input.mode !== 'idea' && input.mode !== 'diagnosis') || typeof input.handoffId !== 'string'
    || typeof input.planRequestId !== 'string' || !/^[a-f0-9]{64}$/.test(String(input.digest || ''))) return null;
  return {
    version: 1,
    projectId: input.projectId,
    sessionId: input.sessionId,
    mode: input.mode,
    handoffId: input.handoffId,
    planRequestId: input.planRequestId,
    digest: input.digest as string,
    relativeDir: typeof input.relativeDir === 'string' ? input.relativeDir.slice(0, 300) : '',
    planMarkdown: typeof input.planMarkdown === 'string' ? input.planMarkdown.slice(0, 80_000) : '',
    handoffMarkdown: typeof input.handoffMarkdown === 'string' ? input.handoffMarkdown.slice(0, 80_000) : '',
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
  };
}

function writeText(file: string, value: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, value, { encoding: 'utf8', flag: 'wx' });
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
    } else fs.renameSync(temporary, file);
  } finally { fs.rmSync(temporary, { force: true }); }
}

function artifactDigest(handoff: HandoffContext, planResult: Extract<ReturnType<typeof normalizeExploreAnalysisResult>, { mode: 'plan' }>): string {
  return createHash('sha256').update(JSON.stringify({ handoff, planResult })).digest('hex');
}

function renderPlan(planResult: Extract<ReturnType<typeof normalizeExploreAnalysisResult>, { mode: 'plan' }>): string {
  const lines = ['# 执行计划', '', planResult.plan.summary, '', '## 步骤', ''];
  planResult.plan.steps.forEach((step, index) => lines.push(`${index + 1}. **${step.title}**`, `   ${step.detail}`));
  if (planResult.plan.risks.length) lines.push('', '## 风险与注意事项', '', ...planResult.plan.risks.map((risk) => `- ${risk}`));
  return lines.join('\n') + '\n';
}

function renderHandoff(handoff: HandoffContext, digest: string): string {
  const lines = [
    '# Explore → 工程 Agent 交接', '',
    `- Handoff ID: \`${handoff.id}\``,
    `- 类型: ${handoff.kind === 'idea' ? '灵感项目' : '问题调查'}`,
    `- 材料摘要: \`${digest}\``, '',
    '## 原始目标', '', handoff.originalGoal, '',
    '## 建议第一步', '', handoff.suggestedFirstStep, '',
    '## 已选择 Context', '',
    ...handoff.environment.map((item) => `- **${item.label}**：${item.summary}`), '',
    '## 来源', '',
    ...handoff.sources.map((source) => `- [${source.title}](${source.url})${source.author ? ` — ${source.author}` : ''}`),
  ];
  return lines.join('\n') + '\n';
}

export function createExploreHandoffArtifact(value: unknown): ExploreHandoffArtifact {
  if (!value || typeof value !== 'object') throw new Error('交接材料请求无效');
  const input = value as { sessionId?: unknown; handoff?: unknown; planResult?: unknown };
  const sessionId = assertSessionId(input.sessionId);
  const handoff = normalizeHandoffContext(input.handoff);
  const rawPlan = input.planResult as { requestId?: unknown };
  if (!rawPlan || typeof rawPlan.requestId !== 'string') throw new Error('执行计划请求 ID 无效');
  const planResult = normalizeExploreAnalysisResult(input.planResult, { requestId: rawPlan.requestId, mode: 'plan' });
  if (planResult.mode !== 'plan') throw new Error('交接材料需要执行计划');
  const project = requireActiveProject();
  const session = readRecord(handoff.kind === 'idea' ? 'idea' : 'diagnosis', sessionId);
  if (session.snapshot.planRequestId !== planResult.requestId || session.snapshot.planHandoff?.id !== handoff.id) throw new Error('交接材料与当前探索会话不匹配');
  const digest = artifactDigest(handoff, planResult);
  const directory = getActiveProjectStatePath('handoffs', sessionId);
  const artifact: ExploreHandoffArtifact = {
    version: 1, projectId: project.id, sessionId, mode: session.mode, handoffId: handoff.id,
    planRequestId: planResult.requestId, digest, relativeDir: `.catnip/handoffs/${sessionId}`,
    planMarkdown: renderPlan(planResult), handoffMarkdown: renderHandoff(handoff, digest), createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(directory, { recursive: true });
  writeJson(path.join(directory, 'handoff.json'), { version: 1, projectId: project.id, sessionId, mode: session.mode, handoff, planResult, digest, createdAt: artifact.createdAt });
  writeText(path.join(directory, 'PLAN.md'), artifact.planMarkdown);
  writeText(path.join(directory, 'HANDOFF.md'), artifact.handoffMarkdown);
  return artifact;
}

export function getExploreHandoffArtifact(sessionIdValue: unknown): ExploreHandoffArtifact {
  const sessionId = assertSessionId(sessionIdValue);
  const directory = getActiveProjectStatePath('handoffs', sessionId);
  const payload = JSON.parse(fs.readFileSync(path.join(directory, 'handoff.json'), 'utf8')) as { handoff: unknown; planResult: unknown; digest: unknown; createdAt?: unknown };
  const handoff = normalizeHandoffContext(payload.handoff);
  const rawPlan = payload.planResult as { requestId?: unknown };
  if (!rawPlan || typeof rawPlan.requestId !== 'string') throw new Error('工程内交接材料损坏');
  const planResult = normalizeExploreAnalysisResult(payload.planResult, { requestId: rawPlan.requestId, mode: 'plan' });
  if (planResult.mode !== 'plan' || payload.digest !== artifactDigest(handoff, planResult)) throw new Error('工程内交接材料已变化，请重新生成计划');
  const project = requireActiveProject();
  const session = readRecord(handoff.kind === 'idea' ? 'idea' : 'diagnosis', sessionId);
  if (session.projectId !== project.id || session.snapshot.planRequestId !== planResult.requestId || session.snapshot.planHandoff?.id !== handoff.id) throw new Error('工程内交接材料与当前探索会话不匹配');
  const planMarkdown = fs.readFileSync(path.join(directory, 'PLAN.md'), 'utf8');
  const handoffMarkdown = fs.readFileSync(path.join(directory, 'HANDOFF.md'), 'utf8');
  if (planMarkdown !== renderPlan(planResult) || handoffMarkdown !== renderHandoff(handoff, payload.digest as string)) {
    throw new Error('工程内交接材料已变化，请重新生成计划');
  }
  return {
    version: 1, projectId: project.id, sessionId, mode: session.mode, handoffId: handoff.id,
    planRequestId: planResult.requestId, digest: payload.digest as string, relativeDir: `.catnip/handoffs/${sessionId}`,
    planMarkdown,
    handoffMarkdown,
    createdAt: typeof payload.createdAt === 'string' && Number.isFinite(Date.parse(payload.createdAt)) ? payload.createdAt : new Date().toISOString(),
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
  registrar.handle('explore:handoff:artifact:create', async (_event, value: unknown) => createExploreHandoffArtifact(value));
  registrar.handle('explore:handoff:artifact:get', async (_event, sessionId: unknown) => getExploreHandoffArtifact(sessionId));
}
