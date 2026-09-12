import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { getAgentDir, getUserDataPath } from './paths';
import { exploreZhihuEnvironment, systemPowerShell } from './explore-zhihu-status';

const READY_TIMEOUT_MS = 15_000;
const DIALOG_TIMEOUT_MS = 10 * 60_000;
const MAX_OUTPUT_BYTES = 64_000;

export type ModelCredentialPromptResult = { outcome: 'submitted'; secret: string } | { outcome: 'cancelled' };
export type StartupModelCredentialPromptResult = { outcome: 'submitted'; deepSeekSecret: string; qwenSecret: string } | { outcome: 'cancelled' };

interface PromptProcessResult { outcome: 'submitted' | 'cancelled'; output: Buffer }

async function runCredentialPrompt(scriptName: string, args: string[]): Promise<PromptProcessResult> {
  const hostScript = path.join(getAgentDir(), 'host-tools', scriptName);
  if (!fs.existsSync(hostScript)) throw new Error('模型安全输入组件不完整');
  const readyFile = getUserDataPath('runtime-data', 'model-dialog', `${randomUUID()}.ready`);
  fs.mkdirSync(path.dirname(readyFile), { recursive: true });
  fs.rmSync(readyFile, { force: true });

  return new Promise((resolve, reject) => {
    const child = spawn(systemPowerShell(), [
      '-NoProfile', '-Sta', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
      '-File', hostScript, ...args, '-ReadyFile', readyFile,
    ], { cwd: path.dirname(hostScript), env: exploreZhihuEnvironment(), windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = Buffer.alloc(0);
    let ready = false;
    let settled = false;
    const finish = (error?: Error, result?: PromptProcessResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimer);
      clearTimeout(dialogTimer);
      clearInterval(readyPoll);
      fs.rmSync(readyFile, { force: true });
      output.fill(0);
      if (error) reject(error);
      else resolve(result ?? { outcome: 'cancelled', output: Buffer.alloc(0) });
    };
    const readyTimer = setTimeout(() => { child.kill(); finish(new Error('模型安全输入窗口启动超时')); }, READY_TIMEOUT_MS);
    const dialogTimer = setTimeout(() => { child.kill(); finish(new Error('模型安全输入窗口等待超时')); }, DIALOG_TIMEOUT_MS);
    const readyPoll = setInterval(() => {
      if (fs.existsSync(readyFile)) { ready = true; clearTimeout(readyTimer); }
    }, 75);
    child.stdout.on('data', (chunk: Buffer) => {
      if (output.length + chunk.length > MAX_OUTPUT_BYTES) {
        child.kill();
        finish(new Error('模型凭据超过安全输入长度限制'));
        return;
      }
      output = Buffer.concat([output, chunk]);
    });
    child.once('error', () => finish(new Error('无法启动模型安全输入窗口')));
    child.once('close', (code) => {
      if (settled) return;
      if (!ready) return finish(new Error('模型安全输入窗口未显示，请确认 Windows PowerShell 与桌面组件可用'));
      if (code === 2) return finish(undefined, { outcome: 'cancelled', output: Buffer.alloc(0) });
      if (code !== 0 || output.length === 0) return finish(new Error('模型凭据未保存'));
      const submitted = Buffer.from(output);
      finish(undefined, { outcome: 'submitted', output: submitted });
    });
  });
}

export async function promptForModelCredential(providerName: string): Promise<ModelCredentialPromptResult> {
  const result = await runCredentialPrompt('configure-model-credential.ps1', ['-ProviderName', providerName]);
  if (result.outcome === 'cancelled') return { outcome: 'cancelled' };
  try { return { outcome: 'submitted', secret: result.output.toString('utf8').trim() }; }
  finally { result.output.fill(0); }
}

export async function promptForStartupModelCredentials(): Promise<StartupModelCredentialPromptResult> {
  const result = await runCredentialPrompt('configure-startup-model.ps1', []);
  if (result.outcome === 'cancelled') return { outcome: 'cancelled' };
  try {
    const parsed = JSON.parse(result.output.toString('utf8')) as { deepSeek?: unknown; qwen?: unknown };
    if (typeof parsed.deepSeek !== 'string' || typeof parsed.qwen !== 'string') throw new Error('invalid payload');
    return {
      outcome: 'submitted',
      deepSeekSecret: Buffer.from(parsed.deepSeek, 'base64').toString('utf8'),
      qwenSecret: Buffer.from(parsed.qwen, 'base64').toString('utf8'),
    };
  } catch { throw new Error('模型安全输入结果无效'); }
  finally { result.output.fill(0); }
}
