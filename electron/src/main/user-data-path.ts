import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const CATNIP_USER_DATA_VENDOR = '@Catnip_Forge';
export const CATNIP_USER_DATA_APP = 'electron';
const LEGACY_USER_DATA_VENDOR = '@vibeide';
const MIGRATION_MARKER = '.catnip-user-data-migration.json';
const TRANSIENT_NAMES = new Set([
  'DevToolsActivePort',
  'SingletonCookie',
  'SingletonLock',
  'SingletonSocket',
]);

export interface UserDataPathResult {
  userDataPath: string;
  legacyUserDataPath: string;
  migrated: boolean;
  migrationError?: string;
}

/**
 * Must run before importing the regular main-process entry. Several modules
 * resolve logs/session paths at import time.
 */
export function configureCatnipUserDataPath(): UserDataPathResult {
  const appData = app.getPath('appData');
  const userDataPath = path.join(appData, CATNIP_USER_DATA_VENDOR, CATNIP_USER_DATA_APP);
  const legacyUserDataPath = path.join(appData, LEGACY_USER_DATA_VENDOR, CATNIP_USER_DATA_APP);
  let migrated = false;
  let migrationError: string | undefined;

  const markerPath = path.join(userDataPath, MIGRATION_MARKER);
  const alreadyMigrated = readMigrationStatus(markerPath) === 'completed';
  if (!alreadyMigrated && fs.existsSync(legacyUserDataPath)) {
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
      copyDirectoryContents(legacyUserDataPath, userDataPath);
      migrated = true;
      writeMigrationMarker(markerPath, {
        status: 'completed',
        source: legacyUserDataPath,
        migratedAt: new Date().toISOString(),
      });
    } catch (error) {
      migrationError = safeError(error);
      try {
        fs.mkdirSync(userDataPath, { recursive: true });
        writeMigrationMarker(markerPath, {
          status: 'failed',
          source: legacyUserDataPath,
          failedAt: new Date().toISOString(),
          error: migrationError,
        });
      } catch {
        // app.setPath below still points the process at the requested location.
      }
    }
  }

  fs.mkdirSync(userDataPath, { recursive: true });
  app.setPath('userData', userDataPath);
  return { userDataPath, legacyUserDataPath, migrated, migrationError };
}

function readMigrationStatus(markerPath: string): string {
  try {
    return String(JSON.parse(fs.readFileSync(markerPath, 'utf8'))?.status || '');
  } catch {
    return '';
  }
}

function writeMigrationMarker(markerPath: string, value: Record<string, unknown>): void {
  fs.writeFileSync(markerPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function copyDirectoryContents(sourceDirectory: string, targetDirectory: string): void {
  fs.mkdirSync(targetDirectory, { recursive: true });
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (TRANSIENT_NAMES.has(entry.name) || entry.isSymbolicLink()) continue;
    const source = path.join(sourceDirectory, entry.name);
    const target = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(source, target);
    } else if (entry.isFile() && !fs.existsSync(target)) {
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    }
  }
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1000);
}
