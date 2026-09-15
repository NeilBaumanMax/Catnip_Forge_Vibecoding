import { execFile, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { IpcMain } from 'electron';
import { getResourcesDir, getUserDataPath, isDev } from './paths';
import { logger } from './worker/logger';

export interface RadioProcessSnapshot {
  state: 'stopped' | 'starting' | 'ready' | 'error';
  pid: number | null;
  url: string | null;
  message: string;
  xiaozhiEnabled: boolean;
}

let child: ChildProcess | null = null;
let snapshot: RadioProcessSnapshot = { state: 'stopped', pid: null, url: null, message: '电台尚未启动', xiaozhiEnabled: false };
let starting: Promise<RadioProcessSnapshot> | null = null;
let lifecycle = 0;
const intentionalStops = new WeakSet<ChildProcess>();

function radioRoot(): string {
  return isDev() ? getResourcesDir('electron', 'radio') : getResourcesDir('radio');
}

function pythonExecutable(): string {
  const override = process.env.CATNIP_RADIO_PYTHON;
  if (override && fs.existsSync(override)) return override;
  if (isDev()) {
    const preview = getResourcesDir('electron', '.tmp', 'xiaozhi-preview-venv', 'Scripts', 'python.exe');
    if (fs.existsSync(preview)) return preview;
    return 'python';
  }
  return getResourcesDir('runtime', 'python', 'python.exe');
}

function radioEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  for (const name of ['XIAOZHI_LLM_MODEL', 'XIAOZHI_LLM_BASE_URL', 'XIAOZHI_LLM_API_KEY']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return {
    ...env,
    FORGE_DATA_DIR: getUserDataPath('radio'),
    FORGE_HTTP_PORT: '8890',
    FORGE_XIAOZHI_PORT: '8000',
    PYTHONUTF8: '1',
    PYTHONUNBUFFERED: '1',
  };
}

function terminateProcessTree(proc: ChildProcess): Promise<void> {
  intentionalStops.add(proc);
  if (!proc.pid || proc.killed) return Promise.resolve();
  if (process.platform !== 'win32') {
    proc.kill('SIGTERM');
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    execFile('taskkill.exe', ['/PID', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => resolve());
  });
}

export function getRadioProcessSnapshot(): RadioProcessSnapshot {
  return { ...snapshot };
}

export function ensureRadioProcess(): Promise<RadioProcessSnapshot> {
  if (snapshot.state === 'ready' && child && !child.killed) return Promise.resolve(getRadioProcessSnapshot());
  if (starting) return starting;
  const operation = new Promise<RadioProcessSnapshot>((resolve) => {
    const launchId = ++lifecycle;
    const root = radioRoot();
    const entry = path.join(root, 'run_radio.py');
    if (!fs.existsSync(entry)) {
      snapshot = { state: 'error', pid: null, url: null, message: '电台运行文件缺失', xiaozhiEnabled: false };
      resolve(getRadioProcessSnapshot());
      return;
    }
    snapshot = { state: 'starting', pid: null, url: null, message: '正在启动电台服务…', xiaozhiEnabled: false };
    const proc = spawn(pythonExecutable(), [entry], { cwd: root, env: radioEnvironment(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child = proc;
    snapshot.pid = proc.pid ?? null;
    logger.info('radio:spawn', { pid: snapshot.pid });
    let stdout = '';
    let settled = false;
    const finish = (value: RadioProcessSnapshot, apply = launchId === lifecycle) => {
      if (apply) snapshot = value;
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(getRadioProcessSnapshot());
      }
    };
    const timer = setTimeout(() => {
      if (child === proc) void terminateProcessTree(proc);
      finish({ state: 'error', pid: proc.pid ?? null, url: null, message: '电台服务启动超时', xiaozhiEnabled: false });
    }, 25_000);
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString('utf8')).slice(-4096);
      const match = stdout.match(/FORGE_RADIO_READY:(\d+):([01])/);
      if (match) finish({ state: 'ready', pid: proc.pid ?? null, url: `http://127.0.0.1:${match[1]}/`, message: match[2] === '1' ? '电台与小智已就绪' : '电台已就绪；小智模型尚未配置', xiaozhiEnabled: match[2] === '1' });
    });
    proc.stderr?.on('data', (chunk: Buffer) => logger.warn('radio:stderr', { chars: chunk.length }));
    proc.once('error', () => finish({ state: 'error', pid: null, url: null, message: '无法启动电台 Python 服务', xiaozhiEnabled: false }));
    proc.once('close', (code) => {
      if (child === proc) child = null;
      const next: RadioProcessSnapshot = { state: code === 0 ? 'stopped' : 'error', pid: null, url: null, message: code === 0 ? '电台已停止' : '电台服务异常退出', xiaozhiEnabled: false };
      if (intentionalStops.has(proc)) {
        if (!settled) finish({ ...next, state: 'stopped', message: '电台已停止' }, false);
        return;
      }
      finish(next);
    });
  });
  const pending = operation.finally(() => { if (starting === pending) starting = null; });
  starting = pending;
  return starting;
}

export async function restartRadioProcess(): Promise<RadioProcessSnapshot> {
  await stopRadioProcess();
  return ensureRadioProcess();
}

export async function stopRadioProcess(): Promise<RadioProcessSnapshot> {
  lifecycle += 1;
  starting = null;
  const current = child;
  child = null;
  if (current && !current.killed) await terminateProcessTree(current);
  snapshot = { state: 'stopped', pid: null, url: null, message: '电台已停止', xiaozhiEnabled: false };
  return getRadioProcessSnapshot();
}

export function registerRadioIpc(ipcMain: IpcMain): void {
  ipcMain.handle('radio:status', () => getRadioProcessSnapshot());
  ipcMain.handle('radio:start', () => ensureRadioProcess());
  ipcMain.handle('radio:restart', () => restartRadioProcess());
  ipcMain.handle('radio:stop', () => stopRadioProcess());
}
