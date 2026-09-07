import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { IpcMain } from 'electron';
import type { ExploreZhihuConnectionStatus } from '../common/explore';
import { getAgentDir } from './paths';

interface OfficialStatusPayload {
  ok?: boolean;
  installed?: boolean;
  cli?: { compatible?: boolean };
  auth?: { configured?: boolean };
  next_action?: string;
}

const MAX_OUTPUT_BYTES = 64 * 1024;
const STATUS_TIMEOUT_MS = 30_000;

export function mapOfficialZhihuStatus(payload: unknown): ExploreZhihuConnectionStatus {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { state: 'error', installed: false, compatible: false, authConfigured: false, message: '无法读取知乎开放平台连接状态' };
  }
  const status = payload as OfficialStatusPayload;
  const installed = status.installed === true;
  const compatible = status.cli?.compatible === true;
  const authConfigured = status.auth?.configured === true;
  if (!installed) {
    return { state: 'needs_install', installed, compatible, authConfigured, message: '需要安装知乎开放平台连接组件' };
  }
  if (!compatible || status.ok !== true) {
    return { state: 'error', installed, compatible, authConfigured, message: '知乎开放平台连接组件需要检查' };
  }
  if (!authConfigured) {
    return { state: 'needs_secret', installed, compatible, authConfigured, message: '连接知乎开放平台' };
  }
  return { state: 'connected', installed, compatible, authConfigured, message: '知乎开放平台已连接' };
}

function systemPowerShell(): string {
  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  return systemRoot
    ? path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';
}

function statusEnvironment(): NodeJS.ProcessEnv {
  const allowed = [
    'SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT',
    'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
    'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'CommonProgramFiles',
    'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS', 'OS', 'ZHIHU_CLI_HOME',
  ];
  return Object.fromEntries(allowed
    .map((key) => [key, process.env[key]])
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
}

export async function readExploreZhihuConnectionStatus(): Promise<ExploreZhihuConnectionStatus> {
  const scriptPath = path.join(getAgentDir(), 'skills', 'zhihu', 'scripts', 'run.ps1');
  if (!fs.existsSync(scriptPath)) {
    return { state: 'error', installed: false, compatible: false, authConfigured: false, message: '官方知乎 Skill 不完整' };
  }

  return new Promise((resolve) => {
    const child = spawn(systemPowerShell(), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, 'status'], {
      cwd: path.dirname(scriptPath),
      env: statusEnvironment(),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let outputBytes = 0;
    let settled = false;
    const finish = (result: ExploreZhihuConnectionStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ state: 'error', installed: false, compatible: false, authConfigured: false, message: '检查知乎开放平台连接状态超时' });
    }, STATUS_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes <= MAX_OUTPUT_BYTES) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
    });
    child.on('error', () => {
      finish({ state: 'error', installed: false, compatible: false, authConfigured: false, message: '无法启动知乎开放平台连接检查' });
    });
    child.on('close', (code) => {
      if (settled) return;
      if (code !== 0 || outputBytes > MAX_OUTPUT_BYTES) {
        finish({ state: 'error', installed: false, compatible: false, authConfigured: false, message: '知乎开放平台连接检查失败' });
        return;
      }
      try {
        const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
        finish(mapOfficialZhihuStatus(line ? JSON.parse(line) : null));
      } catch {
        finish({ state: 'error', installed: false, compatible: false, authConfigured: false, message: '知乎开放平台连接状态格式无效' });
      }
    });
  });
}

export function registerExploreZhihuStatusIpc(registrar: Pick<IpcMain, 'handle'>): void {
  registrar.handle('explore:zhihu:status', async () => readExploreZhihuConnectionStatus());
}
