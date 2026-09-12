import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { safeStorage } from 'electron';
import { getUserDataPath } from './paths';
import { writeUtf8Atomically } from './atomic-file';

interface CredentialRecord {
  credentialId: string;
  ciphertext: string;
  updatedAt: string;
}

interface CredentialState {
  version: 1;
  records: CredentialRecord[];
}

export interface CredentialCipher {
  available(): boolean;
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
}

export interface CredentialStatus {
  credentialId: string;
  configured: boolean;
  updatedAt?: string;
}

const CREDENTIAL_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_SECRET_CHARS = 32_000;
const MAX_RECORDS = 100;

function credentialId(value: unknown): string {
  if (typeof value !== 'string' || !CREDENTIAL_ID.test(value)) throw new Error('credentialId is invalid');
  return value;
}

function secretValue(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Credential must be text');
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_SECRET_CHARS) throw new Error('Credential length is invalid');
  return normalized;
}

function normalizeState(value: unknown): CredentialState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Credential store structure is invalid');
  const input = value as Partial<CredentialState>;
  if (input.version !== 1 || !Array.isArray(input.records) || input.records.length > MAX_RECORDS) {
    throw new Error('Credential store structure is invalid');
  }
  const records = input.records.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Credential record ${index} is invalid`);
    const item = raw as Partial<CredentialRecord>;
    const id = credentialId(item.credentialId);
    if (typeof item.ciphertext !== 'string' || item.ciphertext.length < 4 || item.ciphertext.length > 100_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(item.ciphertext)) {
      throw new Error(`Credential record ${index} ciphertext is invalid`);
    }
    if (typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error(`Credential record ${index} date is invalid`);
    return { credentialId: id, ciphertext: item.ciphertext, updatedAt: item.updatedAt };
  });
  if (new Set(records.map((item) => item.credentialId)).size !== records.length) throw new Error('Credential ids must be unique');
  return { version: 1, records };
}

export class ElectronSafeStorageCipher implements CredentialCipher {
  available(): boolean { return safeStorage.isEncryptionAvailable(); }
  encrypt(value: string): Buffer { return safeStorage.encryptString(value); }
  decrypt(value: Buffer): string { return safeStorage.decryptString(value); }
}

export class ModelCredentialStore {
  constructor(
    private readonly filePath: string,
    private readonly cipher: CredentialCipher = new ElectronSafeStorageCipher(),
  ) {}

  status(ids: string[]): CredentialStatus[] {
    const state = this.readState();
    return ids.map((rawId) => {
      const id = credentialId(rawId);
      const found = state.records.find((item) => item.credentialId === id);
      return { credentialId: id, configured: Boolean(found), updatedAt: found?.updatedAt };
    });
  }

  get(idValue: string): string | null {
    const id = credentialId(idValue);
    const found = this.readState().records.find((item) => item.credentialId === id);
    if (!found) return null;
    if (!this.cipher.available()) throw new Error('Secure credential storage is unavailable');
    try {
      return secretValue(this.cipher.decrypt(Buffer.from(found.ciphertext, 'base64')));
    } catch {
      throw new Error('Stored credential could not be decrypted');
    }
  }

  set(idValue: string, secretInput: string): CredentialStatus {
    const id = credentialId(idValue);
    const secret = secretValue(secretInput);
    if (!this.cipher.available()) throw new Error('Secure credential storage is unavailable');
    let encrypted: Buffer;
    try {
      encrypted = this.cipher.encrypt(secret);
      const roundTrip = this.cipher.decrypt(encrypted);
      const left = Buffer.from(roundTrip);
      const right = Buffer.from(secret);
      if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error('round-trip mismatch');
    } catch {
      throw new Error('Credential encryption verification failed');
    }
    const state = this.readState();
    const now = new Date().toISOString();
    const next: CredentialRecord = { credentialId: id, ciphertext: encrypted.toString('base64'), updatedAt: now };
    state.records = [next, ...state.records.filter((item) => item.credentialId !== id)];
    if (state.records.length > MAX_RECORDS) throw new Error('Credential store limit reached');
    this.writeState(state);
    return { credentialId: id, configured: true, updatedAt: now };
  }

  delete(idValue: string): CredentialStatus {
    const id = credentialId(idValue);
    const state = this.readState();
    const next = state.records.filter((item) => item.credentialId !== id);
    if (next.length !== state.records.length) this.writeState({ version: 1, records: next });
    return { credentialId: id, configured: false };
  }

  private readState(): CredentialState {
    if (!fs.existsSync(this.filePath)) return { version: 1, records: [] };
    try {
      return normalizeState(JSON.parse(fs.readFileSync(this.filePath, 'utf8')));
    } catch {
      throw new Error('Credential store is invalid; original file was preserved');
    }
  }

  private writeState(state: CredentialState): void {
    writeUtf8Atomically(this.filePath, `${JSON.stringify(normalizeState(state), null, 2)}\n`);
  }
}

export interface LegacyCredentialSource {
  credentialId: string;
  environmentName: string;
  filePath: string;
}

export interface LegacyCredentialMigrationResult {
  credentialId: string;
  outcome: 'not_found' | 'already_secure' | 'migrated' | 'conflict' | 'cleanup_pending' | 'failed';
  message?: string;
}

function readLegacySecret(source: LegacyCredentialSource): { secret: string; lineIndex: number } | null {
  if (!fs.existsSync(source.filePath)) return null;
  const lines = fs.readFileSync(source.filePath, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    const named = line.match(new RegExp(`^${source.environmentName}\\s*=\\s*(.+)$`, 'i'));
    const candidate = (named?.[1] ?? (!line.includes('=') ? line : '')).trim();
    if (candidate.length > 12 && !/your-key-here/i.test(candidate)) return { secret: candidate, lineIndex: index };
  }
  return null;
}

function removeLegacyLine(source: LegacyCredentialSource, lineIndex: number): void {
  const lines = fs.readFileSync(source.filePath, 'utf8').split(/\r?\n/);
  lines.splice(lineIndex, 1);
  const remaining = lines.join('\n').replace(/^\n+|\n+$/g, '');
  const content = remaining ? `${remaining}\n` : '';
  let handle: number | null = null;
  try {
    handle = fs.openSync(source.filePath, 'r+');
    fs.writeSync(handle, content, 0, 'utf8');
    fs.ftruncateSync(handle, Buffer.byteLength(content));
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = null;
  } catch (error) {
    if (handle != null) fs.closeSync(handle);
    throw error;
  }
}

export function migrateLegacyCredentials(
  store: ModelCredentialStore,
  sources: LegacyCredentialSource[],
): LegacyCredentialMigrationResult[] {
  return sources.map((source) => {
    try {
      const legacy = readLegacySecret(source);
      if (!legacy) return { credentialId: source.credentialId, outcome: 'not_found' };
      const existing = store.get(source.credentialId);
      if (existing && existing !== legacy.secret) {
        return { credentialId: source.credentialId, outcome: 'conflict', message: 'Secure and legacy credentials differ; the legacy file was preserved' };
      }
      if (!existing) store.set(source.credentialId, legacy.secret);
      const secured = store.get(source.credentialId);
      if (!secured) throw new Error('secure verification failed');
      try {
        removeLegacyLine(source, legacy.lineIndex);
      } catch {
        return { credentialId: source.credentialId, outcome: 'cleanup_pending', message: 'Secure copy verified, but the legacy file could not be cleaned' };
      }
      return { credentialId: source.credentialId, outcome: existing ? 'already_secure' : 'migrated' };
    } catch {
      return { credentialId: source.credentialId, outcome: 'failed', message: 'Legacy credential migration failed; the source file was preserved' };
    }
  });
}

export function createModelCredentialStore(): ModelCredentialStore {
  return new ModelCredentialStore(getUserDataPath('models', 'credentials.json'));
}
