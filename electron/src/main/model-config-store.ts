import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getUserDataPath } from './paths';
import {
  cloneModelConfig,
  createDefaultModelConfig,
  normalizeModelConfig,
  type ModelConfigState,
} from '../common/model-config';

export class ModelConfigStore {
  constructor(private readonly filePath: string) {}

  read(): ModelConfigState {
    if (!fs.existsSync(this.filePath)) return cloneModelConfig(createDefaultModelConfig());
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Model config is unreadable; original file was preserved: ${String(error)}`);
    }
    try {
      return cloneModelConfig(normalizeModelConfig(parsed));
    } catch (error) {
      throw new Error(`Model config is invalid; original file was preserved: ${String(error)}`);
    }
  }

  replace(value: unknown, expectedRevision: number): ModelConfigState {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('expectedRevision is invalid');
    const current = this.read();
    if (current.revision !== expectedRevision) throw new Error('Model config changed; reload before saving');
    const input = normalizeModelConfig(value);
    const next = normalizeModelConfig({ ...input, revision: current.revision + 1 });
    this.write(next);
    return cloneModelConfig(next);
  }

  private write(state: ModelConfigState): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const backup = `${this.filePath}.bak`;
    let handle: number | null = null;
    let movedOriginal = false;
    try {
      handle = fs.openSync(temporary, 'wx');
      fs.writeFileSync(handle, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
      fs.fsyncSync(handle);
      fs.closeSync(handle);
      handle = null;
      if (fs.existsSync(this.filePath)) {
        if (fs.existsSync(backup)) fs.rmSync(backup, { force: true });
        fs.renameSync(this.filePath, backup);
        movedOriginal = true;
      }
      fs.renameSync(temporary, this.filePath);
    } catch (error) {
      if (handle != null) fs.closeSync(handle);
      try { fs.rmSync(temporary, { force: true }); } catch { /* exact temporary file only */ }
      if (movedOriginal && !fs.existsSync(this.filePath) && fs.existsSync(backup)) fs.renameSync(backup, this.filePath);
      throw error;
    }
  }
}

export function createModelConfigStore(): ModelConfigStore {
  return new ModelConfigStore(getUserDataPath('models', 'config.json'));
}
