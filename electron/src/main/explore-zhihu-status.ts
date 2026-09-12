import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { IpcMain } from 'electron';
import { shell } from 'electron';
import type { ExploreZhihuConnectionLaunchResult, ExploreZhihuConnectionStatus, ExploreZhihuSetupResult } from '../common/explore';
import { getAgentDir, getUserDataPath } from './paths';

interface OfficialStatusPayload {
  ok?: boolean;
  installed?: boolean;
  cli?: { compatible?: boolean };
  auth?: { configured?: boolean };
  next_action?: string;
}

const MAX_OUTPUT_BYTES = 64 * 1024;
const STATUS_TIMEOUT_MS = 30_000;
const SETUP_TIMEOUT_MS = 180_000;
const SECRET_DIALOG_TIMEOUT_MS = 15_000;
export const ZHIHU_PROFILE_URL = 'https://developer.zhihu.com/profile';

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
  if (!compatible) {
    return { state: 'needs_install', installed, compatible, authConfigured, message: '需要更新知乎开放平台连接组件' };
  }
  if (status.ok !== true) {
    return { state: 'error', installed, compatible, authConfigured, message: '知乎开放平台连接组件需要检查' };
  }
  if (!authConfigured) {
    return { state: 'needs_secret', installed, compatible, authConfigured, message: '连接知乎开放平台' };
  }
  return { state: 'connected', installed, compatible, authConfigured, message: '知乎开放平台已连接' };
}

export function buildExploreZhihuSetupLaunch(): {
  command: string;
  args: string[];
  options: Parameters<typeof spawn>[2];
} {
  const setupScript = path.join(getAgentDir(), 'skills', 'zhihu', 'scripts', 'setup.ps1');
  return {
    command: systemPowerShell(),
    args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', setupScript],
    options: {
      cwd: path.dirname(setupScript),
      env: exploreZhihuEnvironment(),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  };
}

async function runExploreZhihuSetup(): Promise<void> {
  const launch = buildExploreZhihuSetupLaunch();
  const setupScript = launch.args.at(-1);
  if (!setupScript || !fs.existsSync(setupScript)) throw new Error('知乎开放平台安装组件不完整');

  return new Promise((resolve, reject) => {
    const child = spawn(launch.command, launch.args, launch.options);
    let outputBytes = 0;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('安装知乎开放平台连接组件超时'));
    }, SETUP_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => { outputBytes += chunk.length; });
    child.stderr?.on('data', (chunk: Buffer) => { outputBytes += chunk.length; });
    child.once('error', () => finish(new Error('无法启动知乎开放平台连接组件安装')));
    child.once('close', (code) => {
      if (outputBytes > MAX_OUTPUT_BYTES) finish(new Error('知乎开放平台连接组件安装输出过大'));
      else if (code !== 0) finish(new Error('知乎开放平台连接组件安装失败'));
      else finish();
    });
  });
}

export async function evaluateExploreZhihuInstallation(
  readStatus: () => Promise<ExploreZhihuConnectionStatus>,
  runSetup: () => Promise<void>,
): Promise<ExploreZhihuSetupResult> {
  const before = await readStatus();
  if (before.state !== 'needs_install') {
    const alreadyReady = before.state === 'connected' || before.state === 'needs_secret';
    return {
      ok: alreadyReady,
      state: alreadyReady ? 'already_ready' : 'unavailable',
      message: alreadyReady ? '知乎开放平台连接组件已经可用' : before.message,
      connection: before,
    };
  }

  try {
    await runSetup();
  } catch (error) {
    return {
      ok: false,
      state: 'unavailable',
      message: error instanceof Error ? error.message : '知乎开放平台连接组件安装失败',
      connection: before,
    };
  }

  const connection = await readStatus();
  const ready = connection.state === 'connected' || connection.state === 'needs_secret';
  return {
    ok: ready,
    state: ready ? 'installed' : 'unavailable',
    message: ready ? '知乎开放平台连接组件已安装' : connection.message,
    connection,
  };
}

let setupInFlight: Promise<ExploreZhihuSetupResult> | null = null;

export function installExploreZhihuConnection(): Promise<ExploreZhihuSetupResult> {
  if (setupInFlight) return setupInFlight;
  setupInFlight = evaluateExploreZhihuInstallation(readExploreZhihuConnectionStatus, runExploreZhihuSetup)
    .finally(() => { setupInFlight = null; });
  return setupInFlight;
}

export function systemPowerShell(): string {
  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  return systemRoot
    ? path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';
}

export function exploreZhihuEnvironment(): NodeJS.ProcessEnv {
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
      env: exploreZhihuEnvironment(),
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

export function buildExploreZhihuConnectionLaunch(): {
  command: string;
  args: string[];
  options: Parameters<typeof spawn>[2];
} {
  const agentDir = getAgentDir();
  const hostScript = path.join(agentDir, 'host-tools', 'configure-zhihu-secret.ps1');
  const officialRunScript = path.join(agentDir, 'skills', 'zhihu', 'scripts', 'run.ps1');
  const readyFile = getUserDataPath('runtime-data', 'zhihu-dialog', `${randomUUID()}.ready`);
  return {
    command: systemPowerShell(),
    args: [
      '-NoProfile',
      '-Sta',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', hostScript,
      '-OfficialRunScript', officialRunScript,
      '-ReadyFile', readyFile,
    ],
    options: {
      cwd: path.dirname(hostScript),
      env: exploreZhihuEnvironment(),
      windowsHide: true,
      stdio: 'ignore',
    },
  };
}

export async function beginExploreZhihuConnection(): Promise<ExploreZhihuConnectionLaunchResult> {
  const status = await readExploreZhihuConnectionStatus();
  if (status.state === 'connected') {
    return { ok: true, state: 'already_connected', message: '知乎开放平台已连接' };
  }
  if (status.state !== 'needs_secret') {
    return { ok: false, state: 'unavailable', message: status.message };
  }

  const launch = buildExploreZhihuConnectionLaunch();
  const fileArgumentIndex = launch.args.indexOf('-File');
  const officialArgumentIndex = launch.args.indexOf('-OfficialRunScript');
  const readyFileArgumentIndex = launch.args.indexOf('-ReadyFile');
  const hostScript = fileArgumentIndex >= 0 ? launch.args[fileArgumentIndex + 1] : undefined;
  const officialRunScript = officialArgumentIndex >= 0 ? launch.args[officialArgumentIndex + 1] : undefined;
  const readyFile = readyFileArgumentIndex >= 0 ? launch.args[readyFileArgumentIndex + 1] : undefined;
  if (!hostScript || !officialRunScript || !readyFile || !fs.existsSync(hostScript) || !fs.existsSync(officialRunScript)) {
    return { ok: false, state: 'unavailable', message: '知乎开放平台安全连接组件不完整' };
  }

  try {
    await shell.openExternal(ZHIHU_PROFILE_URL);
    fs.mkdirSync(path.dirname(readyFile), { recursive: true });
    fs.rmSync(readyFile, { force: true });
    const child = spawn(launch.command, launch.args, launch.options);
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(readyPoll);
        fs.rmSync(readyFile, { force: true });
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => {
        child.kill();
        finish(new Error('知乎开放平台安全输入窗口启动超时'));
      }, SECRET_DIALOG_TIMEOUT_MS);
      const readyPoll = setInterval(() => {
        if (fs.existsSync(readyFile)) finish();
      }, 75);
      child.once('error', () => finish(new Error('无法启动知乎开放平台安全输入窗口')));
      child.once('close', (code) => {
        if (settled) return;
        if (fs.existsSync(readyFile)) finish();
        else finish(new Error(`知乎开放平台安全输入窗口未显示（退出码 ${code ?? 'unknown'}）`));
      });
    });
    return {
      ok: true,
      state: 'launched',
      message: '已打开知乎个人中心和安全输入窗口。配置完成后，本页面会自动确认连接。',
    };
  } catch (error) {
    return {
      ok: false,
      state: 'unavailable',
      message: error instanceof Error ? error.message : '无法启动知乎开放平台安全连接',
    };
  }
}

export function registerExploreZhihuStatusIpc(registrar: Pick<IpcMain, 'handle'>): void {
  registrar.handle('explore:zhihu:status', async () => readExploreZhihuConnectionStatus());
  registrar.handle('explore:zhihu:install', async () => installExploreZhihuConnection());
  registrar.handle('explore:zhihu:connect', async () => beginExploreZhihuConnection());
}
