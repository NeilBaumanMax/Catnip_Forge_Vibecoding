import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import { getUserDataPath } from './paths';
import {
  type AddVerificationRecordInput,
  type KnowledgeCard,
  type KnowledgeVerificationStatus,
  type SaveKnowledgeCardInput,
  type VerificationRecord,
  normalizeSaveKnowledgeCardInput,
  normalizeSourceEvidence,
  selectKnowledgeCardsForContext,
} from '../common/explore';

interface KnowledgeStoreState {
  version: 1;
  cards: KnowledgeCard[];
}

const MAX_CARDS = 2_000;
const MAX_RECORDS_PER_CARD = 100;

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const text = value.replace(/\r/g, '').trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return text;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function stringList(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} is invalid`);
  return value.map((item, index) => requiredText(item, `${label}[${index}]`, maxLength));
}

function isoDate(value: unknown, label: string): string {
  const text = requiredText(value, label, 40);
  if (!Number.isFinite(Date.parse(text))) throw new Error(`${label} is invalid`);
  return text;
}

function normalizeVerificationRecord(value: unknown, label: string): VerificationRecord {
  const record = objectValue(value, label);
  if (record.status !== 'verified_effective' && record.status !== 'verified_ineffective') throw new Error(`${label}.status is invalid`);
  return {
    id: requiredText(record.id, `${label}.id`, 120),
    status: record.status,
    projectId: record.projectId == null ? undefined : requiredText(record.projectId, `${label}.projectId`, 500),
    summary: requiredText(record.summary, `${label}.summary`, 2_000),
    evidenceRefs: stringList(record.evidenceRefs, `${label}.evidenceRefs`, 30, 500),
    createdAt: isoDate(record.createdAt, `${label}.createdAt`),
  };
}

function normalizeStoredCard(value: unknown, index: number): KnowledgeCard {
  const label = `cards[${index}]`;
  const card = objectValue(value, label);
  if (!['unverified', 'verified_effective', 'verified_ineffective'].includes(String(card.verificationStatus))) {
    throw new Error(`${label}.verificationStatus is invalid`);
  }
  if (!Array.isArray(card.verificationRecords) || card.verificationRecords.length > MAX_RECORDS_PER_CARD) {
    throw new Error(`${label}.verificationRecords is invalid`);
  }
  return {
    id: requiredText(card.id, `${label}.id`, 120),
    source: normalizeSourceEvidence(card.source),
    taskSummary: requiredText(card.taskSummary, `${label}.taskSummary`, 1_500),
    tags: stringList(card.tags, `${label}.tags`, 20, 60),
    note: card.note == null ? undefined : requiredText(card.note, `${label}.note`, 1_500),
    associatedProjects: stringList(card.associatedProjects, `${label}.associatedProjects`, 20, 500),
    savedAt: isoDate(card.savedAt, `${label}.savedAt`),
    updatedAt: isoDate(card.updatedAt, `${label}.updatedAt`),
    verificationStatus: card.verificationStatus as KnowledgeVerificationStatus,
    verificationRecords: card.verificationRecords.map((record, recordIndex) =>
      normalizeVerificationRecord(record, `${label}.verificationRecords[${recordIndex}]`)),
  };
}

export class ExploreKnowledgeStore {
  constructor(private readonly filePath: string) {}

  private readState(): KnowledgeStoreState {
    if (!fs.existsSync(this.filePath)) return { version: 1, cards: [] };
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Explore knowledge store is unreadable; original file was preserved: ${String(error)}`);
    }
    if (!parsed || typeof parsed !== 'object' || (parsed as KnowledgeStoreState).version !== 1 || !Array.isArray((parsed as KnowledgeStoreState).cards)) {
      throw new Error('Explore knowledge store has an unsupported structure; original file was preserved');
    }
    if ((parsed as KnowledgeStoreState).cards.length > MAX_CARDS) {
      throw new Error('Explore knowledge store exceeds the supported card limit; original file was preserved');
    }
    try {
      return { version: 1, cards: (parsed as KnowledgeStoreState).cards.map(normalizeStoredCard) };
    } catch (error) {
      throw new Error(`Explore knowledge store contains invalid card data; original file was preserved: ${String(error)}`);
    }
  }

  private writeState(state: KnowledgeStoreState): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    let handle: number | null = null;
    try {
      handle = fs.openSync(tempPath, 'wx');
      fs.writeFileSync(handle, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
      fs.fsyncSync(handle);
      fs.closeSync(handle);
      handle = null;
      fs.renameSync(tempPath, this.filePath);
    } catch (error) {
      if (handle != null) fs.closeSync(handle);
      try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort for isolated temp file */ }
      throw error;
    }
  }

  list(): KnowledgeCard[] {
    return clone(this.readState().cards);
  }

  save(value: unknown): KnowledgeCard {
    const input = normalizeSaveKnowledgeCardInput(value);
    const state = this.readState();
    if (state.cards.length >= MAX_CARDS) throw new Error(`Explore knowledge store limit reached (${MAX_CARDS})`);
    const now = new Date().toISOString();
    const card: KnowledgeCard = {
      id: `knowledge-${randomUUID()}`,
      source: input.source,
      taskSummary: input.taskSummary,
      tags: input.tags ?? [],
      note: input.note,
      associatedProjects: input.associatedProjects ?? [],
      savedAt: now,
      updatedAt: now,
      verificationStatus: 'unverified',
      verificationRecords: [],
    };
    state.cards.unshift(card);
    this.writeState(state);
    return clone(card);
  }

  addVerification(value: unknown): KnowledgeCard {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('verification input must be an object');
    const input = value as Partial<AddVerificationRecordInput>;
    const cardId = requiredText(input.cardId, 'verification.cardId', 120);
    const allowed = new Set<KnowledgeVerificationStatus>(['verified_effective', 'verified_ineffective']);
    if (!allowed.has(input.status as KnowledgeVerificationStatus)) throw new Error('verification.status is invalid');
    const state = this.readState();
    const card = state.cards.find((entry) => entry.id === cardId);
    if (!card) throw new Error('Knowledge card was not found');
    const evidenceRefs = input.evidenceRefs == null ? [] : input.evidenceRefs;
    if (!Array.isArray(evidenceRefs) || evidenceRefs.length > 30) throw new Error('verification.evidenceRefs is invalid');
    const record = {
      id: `verification-${randomUUID()}`,
      status: input.status as Exclude<KnowledgeVerificationStatus, 'unverified'>,
      projectId: input.projectId ? requiredText(input.projectId, 'verification.projectId', 500) : undefined,
      summary: requiredText(input.summary, 'verification.summary', 2_000),
      evidenceRefs: evidenceRefs.map((ref, index) => requiredText(ref, `verification.evidenceRefs[${index}]`, 500)),
      createdAt: new Date().toISOString(),
    };
    card.verificationRecords = [...card.verificationRecords, record].slice(-MAX_RECORDS_PER_CARD);
    card.verificationStatus = record.status;
    card.updatedAt = record.createdAt;
    this.writeState(state);
    return clone(card);
  }

  findRelated(query: unknown, limit: unknown = 10): KnowledgeCard[] {
    const text = requiredText(query, 'query', 1_000).toLocaleLowerCase();
    const tokens = [...new Set(text.split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2))].slice(0, 30);
    const max = typeof limit === 'number' && Number.isInteger(limit) ? Math.min(20, Math.max(1, limit)) : 10;
    return this.readState().cards
      .map((card) => {
        const title = card.source.title.toLocaleLowerCase();
        const summary = card.taskSummary.toLocaleLowerCase();
        const tags = card.tags.map((tag) => tag.toLocaleLowerCase());
        const projects = card.associatedProjects.map((item) => item.toLocaleLowerCase());
        const score = tokens.reduce((total, token) => total
          + (tags.some((tag) => tag === token) ? 5 : 0)
          + (title.includes(token) ? 3 : 0)
          + (summary.includes(token) ? 2 : 0)
          + (projects.some((project) => project.includes(token)) ? 1 : 0), 0);
        return { card, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || Date.parse(right.card.updatedAt) - Date.parse(left.card.updatedAt))
      .slice(0, max)
      .map((entry) => clone(entry.card));
  }

  selectForContext(selectedIds: unknown): KnowledgeCard[] {
    return selectKnowledgeCardsForContext(this.readState().cards, selectedIds);
  }
}

export interface ExploreKnowledgeHandlers {
  list(): KnowledgeCard[];
  save(input: SaveKnowledgeCardInput): KnowledgeCard;
  addVerification(input: AddVerificationRecordInput): KnowledgeCard;
  findRelated(query: string, limit?: number): KnowledgeCard[];
  selectForContext(selectedIds: string[]): KnowledgeCard[];
}

export function createExploreKnowledgeHandlers(store = new ExploreKnowledgeStore(getUserDataPath('explore', 'knowledge.json'))): ExploreKnowledgeHandlers {
  return {
    list: () => store.list(),
    save: (input) => store.save(input),
    addVerification: (input) => store.addVerification(input),
    findRelated: (query, limit) => store.findRelated(query, limit),
    selectForContext: (selectedIds) => store.selectForContext(selectedIds),
  };
}

export function registerExploreKnowledgeIpc(
  registrar: Pick<IpcMain, 'handle'>,
  handlers = createExploreKnowledgeHandlers(),
): void {
  registrar.handle('explore:knowledge:list', async () => handlers.list());
  registrar.handle('explore:knowledge:save', async (_event, input) => handlers.save(input));
  registrar.handle('explore:knowledge:addVerification', async (_event, input) => handlers.addVerification(input));
  registrar.handle('explore:knowledge:findRelated', async (_event, query: string, limit?: number) => handlers.findRelated(query, limit));
  registrar.handle('explore:knowledge:selectForContext', async (_event, selectedIds: string[]) => handlers.selectForContext(selectedIds));
}
