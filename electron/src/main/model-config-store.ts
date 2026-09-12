import fs from 'node:fs';
import { getUserDataPath } from './paths';
import { writeUtf8Atomically } from './atomic-file';
import {
  cloneModelConfig,
  createDefaultModelConfig,
  normalizeModelConfig,
  upgradeModelConfig,
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
      return cloneModelConfig(upgradeModelConfig(normalizeModelConfig(parsed)));
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
    writeUtf8Atomically(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}

export function createModelConfigStore(): ModelConfigStore {
  return new ModelConfigStore(getUserDataPath('models', 'config.json'));
}
