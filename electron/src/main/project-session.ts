import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { getHardboardDir, getUserDataPath } from './paths';
import type { ProjectSessionStatus, ProjectSummary } from '../common/project-session';

interface ProjectRegistryEntry {
  id: string;
  projectDir: string;
  lastOpenedAt?: string;
}

interface ProjectRegistry {
  version: 1;
  lastProjectId: string | null;
  projects: ProjectRegistryEntry[];
}

const WINDOWS_RESERVED_NAMES = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
let activeProject: ProjectSummary | null = null;

function projectsRoot(): string {
  return path.resolve(process.env.CATNIP_PROJECTS_ROOT || getHardboardDir('projects'));
}

export function getProjectSessionsRoot(): string {
  return path.resolve(process.env.CATNIP_PROJECT_SESSIONS_ROOT || getUserDataPath('project-sessions'));
}

function registryFile(): string {
  return path.join(getProjectSessionsRoot(), 'index.json');
}

function canonicalExistingDirectory(input: string): string {
  const resolved = path.resolve(input);
  const stats = fs.statSync(resolved);
  if (!stats.isDirectory()) throw new Error('工程路径不是文件夹');
  return fs.realpathSync.native(resolved);
}

function normalizedPathKey(input: string): string {
  const normalized = path.normalize(input).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function projectIdFor(projectDir: string): string {
  return `project-${createHash('sha256').update(normalizedPathKey(projectDir)).digest('hex').slice(0, 32)}`;
}

function isDirectProject(projectDir: string): boolean {
  const root = canonicalExistingDirectory(projectsRoot());
  const parent = canonicalExistingDirectory(path.dirname(projectDir));
  return normalizedPathKey(parent) === normalizedPathKey(root);
}

function emptyRegistry(): ProjectRegistry {
  return { version: 1, lastProjectId: null, projects: [] };
}

function readRegistry(): ProjectRegistry {
  const file = registryFile();
  if (!fs.existsSync(file)) return emptyRegistry();
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`工程会话索引损坏，原文件已保留：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1 || !Array.isArray((parsed as { projects?: unknown }).projects)) {
    throw new Error('工程会话索引格式无效，原文件已保留');
  }
  const value = parsed as ProjectRegistry;
  return {
    version: 1,
    lastProjectId: typeof value.lastProjectId === 'string' ? value.lastProjectId : null,
    projects: value.projects.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.projectDir === 'string').slice(0, 200),
  };
}

function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' });
  try {
    if (fs.existsSync(file)) {
      const backup = `${file}.previous`;
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
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function scanProjects(registry: ProjectRegistry): ProjectSummary[] {
  const root = projectsRoot();
  fs.mkdirSync(root, { recursive: true });
  const byPath = new Map(registry.projects.map((entry) => [normalizedPathKey(entry.projectDir), entry]));
  const projects: ProjectSummary[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const lexical = path.join(root, entry.name);
    try {
      const real = canonicalExistingDirectory(lexical);
      if (!isDirectProject(real)) continue;
      const registered = byPath.get(normalizedPathKey(real));
      projects.push({
        id: registered?.id || projectIdFor(real),
        name: entry.name,
        projectDir: real,
        relativePath: `hardboard/projects/${entry.name}`,
        available: true,
        lastOpenedAt: registered?.lastOpenedAt,
      });
    } catch {
      // Broken or escaping entries are omitted and can never be activated.
    }
  }
  return projects.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

export function getProjectSessionStatus(): ProjectSessionStatus {
  const registry = readRegistry();
  const projects = scanProjects(registry);
  return {
    projectsRoot: projectsRoot(),
    activeProject: activeProject ? structuredClone(activeProject) : null,
    suggestedProjectId: projects.some((project) => project.id === registry.lastProjectId) ? registry.lastProjectId : null,
    projects,
  };
}

function persistActivation(project: ProjectSummary): void {
  const registry = readRegistry();
  const now = new Date().toISOString();
  const existing = registry.projects.find((entry) => entry.id === project.id);
  if (existing) {
    existing.projectDir = project.projectDir;
    existing.lastOpenedAt = now;
  } else {
    registry.projects.push({ id: project.id, projectDir: project.projectDir, lastOpenedAt: now });
  }
  registry.lastProjectId = project.id;
  registry.projects = registry.projects.slice(-200);
  writeJsonAtomic(registryFile(), registry);
  fs.mkdirSync(path.join(getProjectSessionsRoot(), project.id), { recursive: true });
}

export function activateProject(projectId: string): ProjectSessionStatus {
  if (!/^project-[a-f0-9]{32}$/.test(projectId)) throw new Error('工程 ID 无效');
  const status = getProjectSessionStatus();
  const project = status.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error('工程不存在、已移动或不在 hardboard/projects 下');
  persistActivation(project);
  activeProject = { ...project, lastOpenedAt: new Date().toISOString() };
  return getProjectSessionStatus();
}

function normalizeNewProjectName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('工程名称无效');
  const name = value.trim();
  if (!name || name.length > 64) throw new Error('工程名称长度必须为 1–64 个字符');
  if (name === '.' || name === '..') throw new Error('工程名称包含不安全字符或 Windows 保留名');
  if (WINDOWS_RESERVED_NAMES.test(name) || /[. ]$/.test(name)) throw new Error('工程名称包含不安全字符或 Windows 保留名');
  const forbiddenCodes = new Set([34, 42, 47, 58, 60, 62, 63, 92, 124]);
  if ([...name].some((character) => character.charCodeAt(0) < 32 || forbiddenCodes.has(character.charCodeAt(0)))) {
    throw new Error('工程名称包含不安全字符或 Windows 保留名');
  }
  return name;
}

function createProjectScaffold(target: string, name: string): void {
  fs.mkdirSync(path.join(target, 'main'));
  const cmakeName = name.replace(/[^A-Za-z0-9_]/g, '_') || 'catnip_project';
  const rootCmake = [
    'cmake_minimum_required(VERSION 3.16)',
    'include(' + String.fromCharCode(36) + 'ENV{IDF_PATH}/tools/cmake/project.cmake)',
    'project(' + cmakeName + ')',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(target, 'CMakeLists.txt'), rootCmake, { encoding: 'utf8', flag: 'wx' });
  writeProjectMainFiles(target);
}

function writeProjectMainFiles(target: string): void {
  const component = 'idf_component_register(SRCS main.c INCLUDE_DIRS .)\n';
  const mainSource = 'void app_main(void)\n{\n}\n';
  fs.writeFileSync(path.join(target, 'main', 'CMakeLists.txt'), component, { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(path.join(target, 'main', 'main.c'), mainSource, { encoding: 'utf8', flag: 'wx' });
}

export function createProject(nameValue: unknown): ProjectSessionStatus & { createdProject: ProjectSummary } {
  const name = normalizeNewProjectName(nameValue);
  const root = projectsRoot();
  fs.mkdirSync(root, { recursive: true });
  const target = path.resolve(root, name);
  if (path.dirname(target) !== root) throw new Error('新工程只能创建在 hardboard/projects 的直接子目录');
  if (fs.existsSync(target)) throw new Error('同名工程已经存在');
  fs.mkdirSync(target, { recursive: false });
  try {
    createProjectScaffold(target, name);
  } catch (error) {
    fs.rmSync(target, { recursive: true, force: true });
    throw error;
  }
  const real = canonicalExistingDirectory(target);
  const createdProject: ProjectSummary = {
    id: projectIdFor(real),
    name,
    projectDir: real,
    relativePath: `hardboard/projects/${name}`,
    available: true,
  };
  persistActivation(createdProject);
  activeProject = { ...createdProject, lastOpenedAt: new Date().toISOString() };
  return { ...getProjectSessionStatus(), createdProject: structuredClone(activeProject) };
}

export function getActiveProject(): ProjectSummary | null {
  return activeProject ? structuredClone(activeProject) : null;
}

export function requireActiveProject(): ProjectSummary {
  const project = getActiveProject();
  if (!project) throw new Error('请先选择当前工作工程');
  return project;
}

export function getActiveProjectStateRoot(): string {
  const project = requireActiveProject();
  const projectReal = fs.realpathSync.native(project.projectDir);
  const root = path.join(projectReal, '.catnip');
  if (fs.existsSync(root)) {
    const stat = fs.lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('工程 .catnip 状态目录无效');
    const real = fs.realpathSync.native(root);
    if (normalizedPathKey(path.dirname(real)) !== normalizedPathKey(projectReal)) throw new Error('工程 .catnip 状态目录越界');
  } else {
    fs.mkdirSync(root, { recursive: false });
  }
  const manifest = path.join(root, 'manifest.json');
  if (fs.existsSync(manifest)) {
    let stored: { version?: unknown; projectId?: unknown; projectDir?: unknown };
    try { stored = JSON.parse(fs.readFileSync(manifest, 'utf8')); }
    catch (error) { throw new Error(`工程 .catnip manifest 损坏，原文件已保留：${error instanceof Error ? error.message : String(error)}`); }
    if (stored.version !== 1 || stored.projectId !== project.id || normalizedPathKey(String(stored.projectDir || '')) !== normalizedPathKey(projectReal)) {
      throw new Error('工程 .catnip manifest 与当前工程不匹配');
    }
  } else {
    writeJsonAtomic(manifest, {
      version: 1,
      projectId: project.id,
      projectDir: projectReal,
      createdAt: new Date().toISOString(),
    });
  }
  const ignoreFile = path.join(root, '.gitignore');
  if (!fs.existsSync(ignoreFile)) fs.writeFileSync(ignoreFile, '*\n!.gitignore\n', { encoding: 'utf8', flag: 'wx' });
  return root;
}

export function getActiveProjectStatePath(...segments: string[]): string {
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || /[\\/]/.test(segment))) {
    throw new Error('工程状态路径无效');
  }
  const root = getActiveProjectStateRoot();
  let cursor = root;
  segments.forEach((segment, index) => {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) return;
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error('工程状态路径不能包含符号链接');
    if (index < segments.length - 1 && !stat.isDirectory()) throw new Error('工程状态路径结构无效');
  });
  const target = path.join(root, ...segments);
  const rootKey = normalizedPathKey(root);
  const targetKey = normalizedPathKey(target);
  if (!targetKey.startsWith(`${rootKey}${path.sep}`)) throw new Error('工程状态路径越界');
  return target;
}

export function assertPathInActiveProject(targetPath: string): string {
  const project = requireActiveProject();
  const resolved = path.resolve(targetPath);
  const canonical = fs.existsSync(resolved)
    ? fs.realpathSync.native(resolved)
    : path.join(fs.realpathSync.native(path.dirname(resolved)), path.basename(resolved));
  const rootKey = normalizedPathKey(fs.realpathSync.native(project.projectDir));
  const targetKey = normalizedPathKey(canonical);
  if (targetKey !== rootKey && !targetKey.startsWith(`${rootKey}${path.sep}`)) throw new Error('目标不属于当前工作工程');
  return canonical;
}

export function resetActiveProjectForTest(): void {
  activeProject = null;
}
