import fs from 'node:fs';
import path from 'node:path';
import type { IpcMain } from 'electron';
import type { ExploreContextCandidate, ExploreContextGatherRequest, ExploreContextGatherResult } from '../common/explore';
import { getHardboardDir } from './paths';
import { readHardboardRuntimeEvents } from './hardboard';
import { readSharedSerialMonitor } from './serial-monitor-controller';
import { requireActiveProject } from './project-session';

const MAX_DEPTH = 5;
const MAX_SOURCE_FILES = 6;
const MAX_SOURCE_FILE_BYTES = 8 * 1024;
const MAX_SOURCE_TOTAL_BYTES = 32 * 1024;
const MAX_RUNTIME_EVENTS = 40;
const MAX_SERIAL_EVENTS = 40;
const MAX_SUMMARY_CHARS = 2_000;
const RUNTIME_WINDOW_MS = 24 * 60 * 60 * 1_000;
const EXCLUDED_DIRS = new Set(['.git', 'build', 'node_modules', 'managed_components', 'dist', 'dist-package']);
const SOURCE_FILE = /(?:^CMakeLists\.txt$|^sdkconfig(?:\.defaults)?$|\.(?:c|h|cpp|hpp|cc|hh|S|asm)$)/i;

interface RuntimeEventLike { time?: unknown; kind?: unknown; projectDir?: unknown; message?: unknown }
interface SerialEventLike { timestamp?: unknown; text?: unknown; direction?: unknown }

interface GatherDependencies {
  projectsRoot?: string;
  now?: () => number;
  readRuntimeEvents?: () => Promise<unknown>;
  readSerial?: () => unknown;
}

function text(value: unknown, max = MAX_SUMMARY_CHARS): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').replace(/\r/g, '').trim().slice(0, max);
}

function tailText(value: string, max = MAX_SUMMARY_CHARS): string {
  const normalized = value.replace(/\0/g, '').replace(/\r/g, '').trim();
  return normalized.slice(Math.max(0, normalized.length - max));
}

function readFilePrefix(filePath: string, maxBytes: number): string {
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const size = Math.min(maxBytes, fs.fstatSync(descriptor).size);
    const buffer = Buffer.alloc(size);
    const bytesRead = fs.readSync(descriptor, buffer, 0, size, 0);
    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    fs.closeSync(descriptor);
  }
}

function withinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function resolveExploreProjectDir(value: unknown, projectsRoot = getHardboardDir('projects')): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 1_024) throw new Error('当前工程引用无效');
  const trimmed = value.trim();
  if (!trimmed) return null;
  const root = path.resolve(projectsRoot);
  const normalized = path.normalize(trimmed);
  const parts = normalized.split(path.sep).filter(Boolean);
  const resolved = !path.isAbsolute(normalized)
    && parts.length === 3
    && parts[0].toLowerCase() === 'hardboard'
    && parts[1].toLowerCase() === 'projects'
    && parts[2] !== '..'
    ? path.resolve(root, parts[2])
    : path.resolve(normalized);
  if (!withinRoot(root, resolved)) throw new Error('当前工程不在 Hardboard projects 范围内');
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error('当前工程目录不存在');
  const realRoot = fs.realpathSync.native(root);
  const realProject = fs.realpathSync.native(resolved);
  if (!withinRoot(realRoot, realProject)) throw new Error('当前工程不在 Hardboard projects 范围内');
  if (!fs.existsSync(path.join(realProject, 'CMakeLists.txt'))) throw new Error('当前目录不是 ESP-IDF 工程');
  return realProject;
}

function listSourceFiles(projectDir: string): string[] {
  const files: string[] = [];
  const visit = (directory: string, depth: number) => {
    if (depth > MAX_DEPTH || files.length >= MAX_SOURCE_FILES) return;
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (files.length >= MAX_SOURCE_FILES) break;
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name.toLowerCase()) && !entry.name.toLowerCase().startsWith('dist-')) visit(fullPath, depth + 1);
      } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  visit(projectDir, 0);
  return files;
}

function sourceCandidates(projectDir: string): ExploreContextCandidate[] {
  const candidates: ExploreContextCandidate[] = [];
  let remaining = MAX_SOURCE_TOTAL_BYTES;
  for (const [index, filePath] of listSourceFiles(projectDir).entries()) {
    if (remaining <= 0) break;
    const bytes = Math.min(MAX_SOURCE_FILE_BYTES, remaining, fs.statSync(filePath).size);
    const excerpt = readFilePrefix(filePath, bytes);
    remaining -= bytes;
    const relative = path.relative(projectDir, filePath).replace(/\\/g, '/');
    candidates.push({
      id: `source-${index + 1}`,
      kind: 'source',
      label: `相关源码 · ${relative}`,
      summary: text(`${relative}\n${excerpt}`),
      selected: true,
      available: true,
    });
  }
  return candidates;
}

function targetCandidate(projectDir: string): ExploreContextCandidate | null {
  for (const name of ['sdkconfig', 'sdkconfig.defaults']) {
    const filePath = path.join(projectDir, name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
    const config = readFilePrefix(filePath, MAX_SOURCE_FILE_BYTES);
    const match = config.match(/^CONFIG_IDF_TARGET="([^"]+)"/m) || config.match(/^CONFIG_IDF_TARGET_([A-Z0-9_]+)=y/m);
    if (!match) continue;
    return {
      id: 'current-target', kind: 'target', label: '芯片 Target',
      summary: `${match[1].toLowerCase()} · 来自 ${name}`, selected: true, available: true,
    };
  }
  return null;
}

function extractRuntimeEvents(value: unknown): RuntimeEventLike[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const events = (value as { events?: unknown }).events;
  return Array.isArray(events) ? events.filter((event): event is RuntimeEventLike => Boolean(event) && typeof event === 'object') : [];
}

function normalizeEventProject(value: unknown, projectsRoot: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { return resolveExploreProjectDir(value, projectsRoot); } catch { return null; }
}

function runtimeCandidate(value: unknown, projectDir: string, projectsRoot: string, now: number): ExploreContextCandidate | null {
  const lines = extractRuntimeEvents(value)
    .filter((event) => typeof event.time === 'number' && event.time >= now - RUNTIME_WINDOW_MS)
    .filter((event) => {
      const eventProject = normalizeEventProject(event.projectDir, projectsRoot);
      return eventProject !== null && path.relative(projectDir, eventProject) === '';
    })
    .filter((event) => typeof event.kind === 'string' && /hardboard\.(?:build|flash)\./.test(event.kind))
    .slice(-MAX_RUNTIME_EVENTS)
    .map((event) => `${new Date(event.time as number).toISOString()} ${text(event.kind, 100)}${text(event.message, 300) ? ` · ${text(event.message, 300)}` : ''}`);
  if (!lines.length) return null;
  return {
    id: 'recent-runtime', kind: 'build', label: '最近 Build / Flash 记录',
    summary: tailText(lines.join('\n')), selected: true, available: true,
  };
}

function serialCandidate(value: unknown): ExploreContextCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as { options?: { port?: unknown } | null; events?: unknown };
  if (!Array.isArray(snapshot.events) || !snapshot.events.length) return null;
  const port = text(snapshot.options?.port, 120) || '未知端口';
  const lines = snapshot.events
    .filter((event): event is SerialEventLike => Boolean(event) && typeof event === 'object')
    .slice(-MAX_SERIAL_EVENTS)
    .map((event) => `${typeof event.timestamp === 'number' ? new Date(event.timestamp).toISOString() : '时间未知'} ${text(event.direction, 20)} · ${text(event.text, 500)}`);
  if (!lines.length) return null;
  const prefix = '当前共享串口数据，尚未证明属于所选工程。\n';
  return {
    id: 'recent-serial', kind: 'serial', label: `最近串口片段 · ${port}`,
    summary: prefix + tailText(lines.join('\n'), MAX_SUMMARY_CHARS - prefix.length), selected: true, available: true,
  };
}

export async function gatherExploreContext(value: unknown, dependencies: GatherDependencies = {}): Promise<ExploreContextGatherResult> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Context 收集请求无效');
  const request = value as ExploreContextGatherRequest;
  const projectsRoot = path.resolve(dependencies.projectsRoot || getHardboardDir('projects'));
  const projectDir = resolveExploreProjectDir(request.projectDir, projectsRoot);
  const generatedAt = (dependencies.now || Date.now)();
  const items: ExploreContextCandidate[] = [];
  const warnings: string[] = [];
  if (projectDir) {
    items.push({
      id: 'current-project', kind: 'project', label: '当前工程',
      summary: path.relative(projectsRoot, projectDir).replace(/\\/g, '/') || path.basename(projectDir),
      selected: true, available: true,
    });
    const target = targetCandidate(projectDir);
    if (target) items.push(target);
    items.push(...sourceCandidates(projectDir));
    try {
      const runtime = runtimeCandidate(
        await (dependencies.readRuntimeEvents || (() => readHardboardRuntimeEvents(0)))(),
        projectDir, projectsRoot, generatedAt,
      );
      if (runtime) items.push(runtime);
    } catch {
      warnings.push('最近 Build / Flash 记录读取失败');
    }
  }
  try {
    const serial = serialCandidate((dependencies.readSerial || (() => readSharedSerialMonitor(0, MAX_SERIAL_EVENTS)))());
    if (serial) items.push(serial);
  } catch {
    warnings.push('最近串口记录读取失败');
  }
  return {
    generatedAt, projectDir, items, warnings,
    limits: {
      maxDepth: MAX_DEPTH, maxSourceFiles: MAX_SOURCE_FILES,
      maxSourceFileBytes: MAX_SOURCE_FILE_BYTES, maxSourceTotalBytes: MAX_SOURCE_TOTAL_BYTES,
      maxRuntimeEvents: MAX_RUNTIME_EVENTS, maxSerialEvents: MAX_SERIAL_EVENTS,
    },
  };
}

export function registerExploreContextIpc(
  registrar: Pick<IpcMain, 'handle'>,
  requireProject = requireActiveProject,
): void {
  registrar.handle('explore:context:gather', async () => {
    const project = requireProject();
    return gatherExploreContext({ projectDir: project.projectDir });
  });
}
