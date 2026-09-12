import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeUtf8Atomically(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const backup = `${filePath}.bak`;
  let handle: number | null = null;
  let movedOriginal = false;
  try {
    handle = fs.openSync(temporary, 'wx');
    fs.writeFileSync(handle, content, 'utf8');
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = null;
    if (fs.existsSync(filePath)) {
      if (fs.existsSync(backup)) fs.rmSync(backup, { force: true });
      fs.renameSync(filePath, backup);
      movedOriginal = true;
    }
    fs.renameSync(temporary, filePath);
  } catch (error) {
    if (handle != null) fs.closeSync(handle);
    try { fs.rmSync(temporary, { force: true }); } catch { /* exact temporary file only */ }
    if (movedOriginal && !fs.existsSync(filePath) && fs.existsSync(backup)) fs.renameSync(backup, filePath);
    throw error;
  }
}
