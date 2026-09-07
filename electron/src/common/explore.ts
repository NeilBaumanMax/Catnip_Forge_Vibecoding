export type ExploreMode = 'idea' | 'diagnosis';

export type ExploreContextKind = 'project' | 'target' | 'hardware' | 'source' | 'build' | 'serial' | 'knowledge';

export interface ExploreContextItem {
  id: string;
  kind: ExploreContextKind;
  label: string;
  summary: string;
  selected: boolean;
}

export interface ExploreContext {
  items: ExploreContextItem[];
}

export interface ExploreRequest {
  mode: ExploreMode;
  goal: string;
  context: ExploreContext;
}

export type SourceEvidenceType = 'zhihu' | 'web' | 'local';

export interface SourceEvidence {
  type: SourceEvidenceType;
  title: string;
  author?: string;
  url: string;
  excerpt: string;
}

export interface IdeaResult {
  id: string;
  title: string;
  value: string;
  implementationDirection: string;
  compatibility: string;
  sources: SourceEvidence[];
}

export interface DiagnosisHypothesis {
  id: string;
  statement: string;
  priorityReason: string;
  projectEvidence: string[];
  communitySources: SourceEvidence[];
  externalSources: SourceEvidence[];
  nextValidation: string;
}

export interface DiagnosisResult {
  problem: string;
  hypotheses: DiagnosisHypothesis[];
  sourceConflicts: string[];
}

export type ExploreHandoffStatus = 'imported' | 'planning' | 'awaiting_confirmation' | 'executing' | 'verifying' | 'resolved' | 'unresolved';

export interface HandoffContext {
  id: string;
  kind: 'idea' | 'investigation';
  status: ExploreHandoffStatus;
  originalGoal: string;
  environment: ExploreContextItem[];
  selectedIdea?: IdeaResult;
  diagnosis?: DiagnosisResult;
  sources: SourceEvidence[];
  suggestedFirstStep: string;
  createdAt: string;
}

export type KnowledgeVerificationStatus = 'unverified' | 'verified_effective' | 'verified_ineffective';

export interface VerificationRecord {
  id: string;
  status: Exclude<KnowledgeVerificationStatus, 'unverified'>;
  projectId?: string;
  summary: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface KnowledgeCard {
  id: string;
  source: SourceEvidence;
  taskSummary: string;
  tags: string[];
  note?: string;
  associatedProjects: string[];
  savedAt: string;
  updatedAt: string;
  verificationStatus: KnowledgeVerificationStatus;
  verificationRecords: VerificationRecord[];
}

export interface SaveKnowledgeCardInput {
  source: SourceEvidence;
  taskSummary: string;
  tags?: string[];
  note?: string;
  associatedProjects?: string[];
}

export interface AddVerificationRecordInput {
  cardId: string;
  status: Exclude<KnowledgeVerificationStatus, 'unverified'>;
  projectId?: string;
  summary: string;
  evidenceRefs?: string[];
}

export interface ExploreZhihuConnectionStatus {
  state: 'connected' | 'needs_secret' | 'needs_install' | 'error';
  installed: boolean;
  compatible: boolean;
  authConfigured: boolean;
  message: string;
}

export interface ExploreSourceStrategy {
  zhihu: 'required';
  web: 'conditional' | 'required';
}

export interface ExploreRequestPreparation {
  request: ExploreRequest;
  selectedContext: ExploreContextItem[];
  sourceStrategy: ExploreSourceStrategy;
  state: 'ready' | 'needs_connection';
  message: string;
}

export interface ExploreIdeaAnalysisResult {
  schemaVersion: 1;
  requestId: string;
  mode: 'idea';
  ideas: IdeaResult[];
}

export interface ExploreDiagnosisAnalysisResult {
  schemaVersion: 1;
  requestId: string;
  mode: 'diagnosis';
  diagnosis: DiagnosisResult;
}

export type ExploreAnalysisResult = ExploreIdeaAnalysisResult | ExploreDiagnosisAnalysisResult;

export interface ExploreAnalysisExpectation {
  requestId: string;
  mode: ExploreMode;
}

export const EXPLORE_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  oneOf: [
    {
      additionalProperties: false,
      required: ['schemaVersion', 'requestId', 'mode', 'ideas'],
      properties: {
        schemaVersion: { const: 1 },
        requestId: { type: 'string', minLength: 1, maxLength: 120 },
        mode: { const: 'idea' },
        ideas: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object' } },
      },
    },
    {
      additionalProperties: false,
      required: ['schemaVersion', 'requestId', 'mode', 'diagnosis'],
      properties: {
        schemaVersion: { const: 1 },
        requestId: { type: 'string', minLength: 1, maxLength: 120 },
        mode: { const: 'diagnosis' },
        diagnosis: { type: 'object' },
      },
    },
  ],
} as const;

const CONTEXT_KINDS = new Set<ExploreContextKind>(['project', 'target', 'hardware', 'source', 'build', 'serial', 'knowledge']);
const SOURCE_TYPES = new Set<SourceEvidenceType>(['zhihu', 'web', 'local']);

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireExactKeys(input: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(input).filter((key) => !allowedKeys.has(key));
  if (unknown.length) throw new Error(`${label} contains unknown fields: ${unknown.join(', ')}`);
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const normalized = value.replace(/\r/g, '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return normalized;
}

function optionalText(value: unknown, label: string, max: number): string | undefined {
  if (value == null || value === '') return undefined;
  return requiredText(value, label, max);
}

function stringList(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  const items = value.map((item, index) => requiredText(item, `${label}[${index}]`, maxLength));
  return [...new Set(items)].slice(0, maxItems);
}

export function normalizeSourceEvidence(value: unknown): SourceEvidence {
  const input = objectValue(value, 'source');
  if (!SOURCE_TYPES.has(input.type as SourceEvidenceType)) throw new Error('source.type is invalid');
  const url = requiredText(input.url, 'source.url', 2048);
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('source.url must be a valid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('source.url must use http or https');
  return {
    type: input.type as SourceEvidenceType,
    title: requiredText(input.title, 'source.title', 300),
    author: optionalText(input.author, 'source.author', 160),
    url: parsed.toString(),
    excerpt: requiredText(input.excerpt, 'source.excerpt', 2_000),
  };
}

function normalizeContextItems(value: unknown, label: string): ExploreContextItem[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error(`${label} is invalid`);
  const ids = new Set<string>();
  return value.map((raw, index) => {
    const item = objectValue(raw, `${label}[${index}]`);
    const id = requiredText(item.id, `${label}[${index}].id`, 120);
    if (ids.has(id)) throw new Error(`duplicate context id: ${id}`);
    ids.add(id);
    if (!CONTEXT_KINDS.has(item.kind as ExploreContextKind)) throw new Error(`${label}[${index}].kind is invalid`);
    return {
      id,
      kind: item.kind as ExploreContextKind,
      label: requiredText(item.label, `${label}[${index}].label`, 160),
      summary: requiredText(item.summary, `${label}[${index}].summary`, 2_000),
      selected: item.selected !== false,
    };
  });
}

export function normalizeExploreRequest(value: unknown): ExploreRequest {
  const input = objectValue(value, 'request');
  if (input.mode !== 'idea' && input.mode !== 'diagnosis') throw new Error('request.mode is invalid');
  const context = objectValue(input.context, 'request.context');
  return {
    mode: input.mode,
    goal: requiredText(input.goal, 'request.goal', 4_000),
    context: { items: normalizeContextItems(context.items, 'request.context.items') },
  };
}

function sourceList(value: unknown, label: string): SourceEvidence[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error(`${label} is invalid`);
  return value.map((source, index) => normalizeSourceEvidenceWithLabel(source, `${label}[${index}]`));
}

function normalizeSourceEvidenceWithLabel(value: unknown, label: string): SourceEvidence {
  try { return normalizeSourceEvidence(value); } catch (error) { throw new Error(`${label}: ${String(error)}`); }
}

export function normalizeIdeaResult(value: unknown): IdeaResult {
  const input = objectValue(value, 'idea');
  return {
    id: requiredText(input.id, 'idea.id', 120),
    title: requiredText(input.title, 'idea.title', 240),
    value: requiredText(input.value, 'idea.value', 2_000),
    implementationDirection: requiredText(input.implementationDirection, 'idea.implementationDirection', 3_000),
    compatibility: requiredText(input.compatibility, 'idea.compatibility', 2_000),
    sources: sourceList(input.sources, 'idea.sources'),
  };
}

export function normalizeDiagnosisResult(value: unknown): DiagnosisResult {
  const input = objectValue(value, 'diagnosis');
  if (!Array.isArray(input.hypotheses) || input.hypotheses.length === 0 || input.hypotheses.length > 20) {
    throw new Error('diagnosis.hypotheses is invalid');
  }
  return {
    problem: requiredText(input.problem, 'diagnosis.problem', 3_000),
    hypotheses: input.hypotheses.map((raw, index) => {
      const label = `diagnosis.hypotheses[${index}]`;
      const hypothesis = objectValue(raw, label);
      return {
        id: requiredText(hypothesis.id, `${label}.id`, 120),
        statement: requiredText(hypothesis.statement, `${label}.statement`, 2_000),
        priorityReason: requiredText(hypothesis.priorityReason, `${label}.priorityReason`, 2_000),
        projectEvidence: stringList(hypothesis.projectEvidence, `${label}.projectEvidence`, 30, 2_000),
        communitySources: sourceList(hypothesis.communitySources, `${label}.communitySources`),
        externalSources: sourceList(hypothesis.externalSources, `${label}.externalSources`),
        nextValidation: requiredText(hypothesis.nextValidation, `${label}.nextValidation`, 2_000),
      };
    }),
    sourceConflicts: stringList(input.sourceConflicts, 'diagnosis.sourceConflicts', 30, 2_000),
  };
}

export function normalizeExploreAnalysisResult(
  value: unknown,
  expectation: ExploreAnalysisExpectation,
): ExploreAnalysisResult {
  const input = objectValue(value, 'explore analysis result');
  if (input.schemaVersion !== 1) throw new Error('explore analysis result.schemaVersion is invalid');
  const requestId = requiredText(input.requestId, 'explore analysis result.requestId', 120);
  if (requestId !== expectation.requestId) throw new Error('explore analysis result.requestId does not match the active request');
  if (input.mode !== expectation.mode) throw new Error('explore analysis result.mode does not match the active request');

  if (input.mode === 'idea') {
    requireExactKeys(input, ['schemaVersion', 'requestId', 'mode', 'ideas'], 'explore analysis result');
    if (!Array.isArray(input.ideas) || input.ideas.length === 0 || input.ideas.length > 8) {
      throw new Error('explore analysis result.ideas is invalid');
    }
    const ideas = input.ideas.map((idea) => normalizeIdeaResult(idea));
    if (ideas.some((idea) => !idea.sources.some((source) => source.type === 'zhihu'))) {
      throw new Error('each idea requires at least one zhihu source');
    }
    return {
      schemaVersion: 1,
      requestId,
      mode: 'idea',
      ideas,
    };
  }

  if (input.mode === 'diagnosis') {
    requireExactKeys(input, ['schemaVersion', 'requestId', 'mode', 'diagnosis'], 'explore analysis result');
    const diagnosis = normalizeDiagnosisResult(input.diagnosis);
    if (diagnosis.hypotheses.some((hypothesis) => (
      !hypothesis.communitySources.some((source) => source.type === 'zhihu')
      || !hypothesis.externalSources.some((source) => source.type === 'web')
    ))) {
      throw new Error('each diagnosis hypothesis requires zhihu and web sources');
    }
    return {
      schemaVersion: 1,
      requestId,
      mode: 'diagnosis',
      diagnosis,
    };
  }

  throw new Error('explore analysis result.mode is invalid');
}

export function normalizeHandoffContext(value: unknown): HandoffContext {
  const input = objectValue(value, 'handoff');
  const statuses = new Set<ExploreHandoffStatus>(['imported', 'planning', 'awaiting_confirmation', 'executing', 'verifying', 'resolved', 'unresolved']);
  if (input.kind !== 'idea' && input.kind !== 'investigation') throw new Error('handoff.kind is invalid');
  if (!statuses.has(input.status as ExploreHandoffStatus)) throw new Error('handoff.status is invalid');
  const selectedIdea = input.selectedIdea == null ? undefined : normalizeIdeaResult(input.selectedIdea);
  const diagnosis = input.diagnosis == null ? undefined : normalizeDiagnosisResult(input.diagnosis);
  if (input.kind === 'idea' && !selectedIdea) throw new Error('idea handoff requires selectedIdea');
  if (input.kind === 'investigation' && !diagnosis) throw new Error('investigation handoff requires diagnosis');
  const createdAt = requiredText(input.createdAt, 'handoff.createdAt', 40);
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('handoff.createdAt is invalid');
  return {
    id: requiredText(input.id, 'handoff.id', 120),
    kind: input.kind,
    status: input.status as ExploreHandoffStatus,
    originalGoal: requiredText(input.originalGoal, 'handoff.originalGoal', 4_000),
    environment: normalizeContextItems(input.environment, 'handoff.environment'),
    selectedIdea,
    diagnosis,
    sources: sourceList(input.sources, 'handoff.sources'),
    suggestedFirstStep: requiredText(input.suggestedFirstStep, 'handoff.suggestedFirstStep', 2_000),
    createdAt,
  };
}

export function normalizeSaveKnowledgeCardInput(value: unknown): SaveKnowledgeCardInput {
  const input = objectValue(value, 'knowledge card');
  return {
    source: normalizeSourceEvidence(input.source),
    taskSummary: requiredText(input.taskSummary, 'knowledge card.taskSummary', 1_500),
    tags: stringList(input.tags, 'knowledge card.tags', 20, 60),
    note: optionalText(input.note, 'knowledge card.note', 1_500),
    associatedProjects: stringList(input.associatedProjects, 'knowledge card.associatedProjects', 20, 500),
  };
}

export function selectKnowledgeCardsForContext(cards: KnowledgeCard[], selectedIds: unknown): KnowledgeCard[] {
  if (!Array.isArray(selectedIds)) throw new Error('selected knowledge ids must be a list');
  const selected = new Set(selectedIds.map((id, index) => requiredText(id, `selectedIds[${index}]`, 120)));
  return cards.filter((card) => selected.has(card.id)).map((card) => structuredClone(card));
}
