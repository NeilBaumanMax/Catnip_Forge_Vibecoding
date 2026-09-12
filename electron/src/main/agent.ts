import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger } from './worker/logger';
import {
  getAgentDir,
  getAgentWorkspaceDir,
  getClaudeBin,
  getApiKeyPath,
  getRuntimeDir,
  getResourcesDir,
  getRuntimeDevServerEntry,
  getRuntimeServerEntry,
  getRuntimeDataDir,
  isDev,
  isPackaged,
} from './paths';
import { buildAgentSystemPrompt } from './worker/context';
import { ensureManagedSkillsDeployed } from './skill-manager';
import { getSerialMonitorBridgeEnv } from './serial-monitor-bridge';
import { getAttachmentBridgeEnv } from './attachment-bridge';
import { EXPLORE_ANALYSIS_JSON_SCHEMA } from '../common/explore';
import type { EngineeringAgentRuntimeModel } from './agent-model-selection';

const AGENT_DIR = getAgentDir();
const AGENT_WORKSPACE_DIR = getAgentWorkspaceDir();
const CLAUDE_BIN = getClaudeBin();
const API_KEY_FILE = getApiKeyPath();

let agentProcess: ChildProcess | null = null;
let agentSeq = 0;
let agentMcpConfigPath: string | null = null;
let agentExecutionProfile: AgentExecutionProfile | null = null;
let agentModelKey: string | null = null;

export type AgentExecutionProfile = 'default' | 'explore_analysis' | 'explore_plan';

export function ensureAgentProcess(profile: AgentExecutionProfile = 'default', model?: EngineeringAgentRuntimeModel): ChildProcess {
  const requestedModelKey = model ? `${model.profileId}\u0000${model.baseUrl}\u0000${model.upstreamModel}` : 'legacy-default';
  if (agentProcess && !agentProcess.killed && agentProcess.exitCode == null && agentExecutionProfile === profile && agentModelKey === requestedModelKey) {
    return agentProcess;
  }
  if (agentProcess && !agentProcess.killed && agentProcess.exitCode == null) killAgent();

  const seq = ++agentSeq;

  // 动态生成 MCP 配置（不依赖静态文件）
  fs.mkdirSync(AGENT_WORKSPACE_DIR, { recursive: true });
  const skillSnapshot = ensureManagedSkillsDeployed();
  logger.info('agent:skills-deployed', {
    sourceDir: skillSnapshot.status.sourceDir,
    deployDir: skillSnapshot.status.deployDir,
    skillCount: skillSnapshot.status.skillCount,
    deployedCount: skillSnapshot.status.deployedCount,
    error: skillSnapshot.status.error,
  });
  const mcpConfig = buildAgentMcpConfig(profile);
  let mcpConfigPath = path.join(AGENT_WORKSPACE_DIR, `.mcp-config-${seq}.json`);
  try {
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
  } catch (err) {
    logger.error('agent:mcp-config-write-failed', { error: String(err), path: mcpConfigPath });
    // 降级：尝试写入系统临时目录
    const tmpPath = path.join(require('os').tmpdir(), `.vibeide-mcp-${seq}.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
    mcpConfigPath = tmpPath;
  }

  const systemPrompt = profile === 'explore_analysis'
    ? `${buildAgentSystemPrompt()}\n\n当前任务是 Explore 只分析档位。只能依据已提供的请求和来源形成结构化判断；不得修改文件、执行命令、操作浏览器、调用 Runtime/Hardboard、Build、Flash 或 Serial。`
    : profile === 'explore_plan'
      ? `${buildAgentSystemPrompt()}\n\n当前任务是 Explore 只计划档位。只能依据已提供的 Handoff 生成结构化执行计划；不得调用任何工具、修改文件、执行命令、操作浏览器、调用 Runtime/Hardboard、Build、Flash 或 Serial。`
      : buildAgentSystemPrompt();
  const args = buildAgentLaunchArgs(profile, mcpConfigPath, systemPrompt);

  logger.info('agent:spawn', {
    bin: CLAUDE_BIN,
    profile,
    args: args.map((arg, index) => {
      if (index > 0 && args[index - 1] === '--mcp-config') return '<dynamic>';
      if (index > 0 && args[index - 1] === '--append-system-prompt') return `(${systemPrompt.length} chars)`;
      if (index > 0 && args[index - 1] === '--json-schema') return '<explore-analysis-schema>';
      return arg;
    }),
    cwd: AGENT_WORKSPACE_DIR,
    mcpConfigPath,
    seq,
  });

  const env = buildAgentEnv(model);

  agentProcess = spawn(CLAUDE_BIN, args, {
    cwd: AGENT_WORKSPACE_DIR,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  agentExecutionProfile = profile;
  agentModelKey = requestedModelKey;
  agentMcpConfigPath = mcpConfigPath;

  // 进程退出后清理临时 MCP 配置文件
  const cleanup = () => {
    try { fs.unlinkSync(mcpConfigPath); } catch { /* ignore */ }
  };
  agentProcess.on('exit', cleanup);
  agentProcess.on('error', cleanup);

  const proc = agentProcess;
  proc.on('close', () => {
    if (agentProcess === proc) {
      agentProcess = null;
      agentMcpConfigPath = null;
      agentExecutionProfile = null;
      agentModelKey = null;
    }
  });

  logger.info('agent:spawn', { pid: agentProcess.pid, seq, spawned: !!agentProcess.pid });

  return agentProcess;
}

export function sendAgentMessage(prompt: string, profile: AgentExecutionProfile = 'default', model?: EngineeringAgentRuntimeModel): void {
  const proc = ensureAgentProcess(profile, model);
  if (!proc.stdin || proc.stdin.destroyed) {
    throw new Error('Agent stdin is not writable');
  }
  const payload = {
    type: 'user',
    message: {
      role: 'user',
      content: prompt,
    },
  };
  proc.stdin.write(`${JSON.stringify(payload)}\n`);
  logger.info('agent:stdin', { pid: proc.pid, chars: prompt.length });
}

export function killAgent(): void {
  if (agentProcess) {
    logger.info('agent:kill', { pid: agentProcess.pid, seq: agentSeq });
    const old = agentProcess;
    old.stdout?.removeAllListeners();
    old.stderr?.removeAllListeners();
    old.removeAllListeners();
    old.kill('SIGKILL');
    agentProcess = null;
    agentExecutionProfile = null;
    agentModelKey = null;
    agentSeq++;
  }
  if (agentMcpConfigPath) {
    try { fs.unlinkSync(agentMcpConfigPath); } catch { /* ignore */ }
    agentMcpConfigPath = null;
  }
}

export function getAgentProcess(): ChildProcess | null {
  return agentProcess;
}

export function getAgentSeq(): number {
  return agentSeq;
}

export function getAgentExecutionProfile(): AgentExecutionProfile | null {
  return agentExecutionProfile;
}

export function buildAgentLaunchArgs(
  profile: AgentExecutionProfile,
  mcpConfigPath: string,
  systemPrompt: string,
): string[] {
  const args = [
    '-p',
    '--mcp-config', mcpConfigPath,
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--append-system-prompt', systemPrompt,
    '--verbose',
    '--replay-user-messages',
  ];
  if (profile === 'default') {
    args.splice(3, 0, '--dangerously-skip-permissions');
    return args;
  }
  args.splice(3, 0,
    '--bare',
    '--permission-mode', 'plan',
    '--strict-mcp-config',
    '--tools', profile === 'explore_analysis' ? 'Skill' : '',
    '--json-schema', JSON.stringify(EXPLORE_ANALYSIS_JSON_SCHEMA),
  );
  return args;
}

function buildAgentEnv(model?: EngineeringAgentRuntimeModel): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  // Avoid inheriting mismatched upstream settings from the parent shell.
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_BASE_URL;
  delete env.ANTHROPIC_MODEL;

  env.CDP_PORT = '9230';
  env.DISPLAY = process.env.DISPLAY || ':0';
  env.CLAUDE_CONFIG_DIR = getRuntimeDataDir('claude-config');

  const apiKey = model?.authToken ?? readDeepSeekApiKey();
  if (apiKey) {
    env.ANTHROPIC_AUTH_TOKEN = apiKey;
    env.ANTHROPIC_BASE_URL = model?.baseUrl ?? 'https://api.deepseek.com/anthropic';
    env.ANTHROPIC_MODEL = model?.upstreamModel ?? process.env.ANTHROPIC_MODEL ?? 'deepseek-v4-pro';
    logger.info('agent:spawn', {
      authMode: model?.authSource ?? 'legacy-file',
      profileId: model?.profileId ?? 'deepseek-v4-pro',
      providerId: model?.providerId ?? 'deepseek',
      baseUrl: env.ANTHROPIC_BASE_URL,
      model: env.ANTHROPIC_MODEL,
      claudeConfigDir: env.CLAUDE_CONFIG_DIR,
    });
  } else {
    logger.warn('agent:spawn', {
      authMode: 'not-configured',
      claudeConfigDir: env.CLAUDE_CONFIG_DIR,
      msg: 'DeepSeek API key not found; agent may require interactive Claude login',
    });
  }

  return env;
}

/**
 * 动态构建 MCP 配置，不依赖静态 mcp-config.json 文件。
 *
 * 开发模式：tsx 直接跑 .ts 源码
 * 生产模式：portable node + --experimental-specifier-resolution=node 跑编译后的 JS
 *           （该 flag 让 Node.js 在 ESM 模式不要求 .js 后缀）
 */
export function buildAgentMcpConfig(profile: AgentExecutionProfile): { mcpServers: Record<string, unknown> } {
  if (profile !== 'default') return { mcpServers: {} };
  const runtimeDir = getRuntimeDir();
  const tsxCli = path.join(runtimeDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const devServerEntry = getRuntimeDevServerEntry();
  const prodServerEntry = getRuntimeServerEntry();

  // 所有模式都传入 RUNTIME_ROOT + PLAYWRIGHT 环境变量
  const playwrightDir = path.join(getResourcesDir(), 'playwright');
  const baseEnv: Record<string, string> = {
    CDP_PORT: '9230',
    RUNTIME_ROOT: runtimeDir,
    PLAYWRIGHT_BROWSERS_PATH: playwrightDir,
    ...getSerialMonitorBridgeEnv(),
    ...getAttachmentBridgeEnv(),
  };

  // 开发模式：tsx 直接跑 .ts
  if (isDev()) {
    return {
      mcpServers: {
        'vibeide-runtime': {
          command: process.execPath,
          args: [tsxCli, devServerEntry, 'mcp'],
          env: {
            ...baseEnv,
            // process.execPath is electron.exe in development. Make it behave
            // like Node when Claude Code launches the stdio MCP subprocess.
            ELECTRON_RUN_AS_NODE: '1',
          },
        },
      },
    };
  }

  // 生产模式：portable node + tsx 跑编译后的 JS（tsx 处理 ESM 后缀问题）
  const nodeBin = path.join(runtimeDir, 'nodejs', 'node.exe');
  if (fs.existsSync(nodeBin) && fs.existsSync(tsxCli)) {
    return {
      mcpServers: {
        'vibeide-runtime': {
          command: nodeBin,
          args: [tsxCli, prodServerEntry, 'mcp'],
          env: baseEnv,
        },
      },
    };
  }

  // 最终降级：系统 PATH 中的 node + tsx
  return {
    mcpServers: {
      'vibeide-runtime': {
        command: 'node',
        args: [tsxCli, prodServerEntry, 'mcp'],
        env: baseEnv,
      },
    },
  };
}

export function readDeepSeekApiKey(): string | null {
  try {
    const text = fs.readFileSync(API_KEY_FILE, 'utf-8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^DEEPSEEK_API_KEY\s*=\s*(.+)$/);
      if (match?.[1]) return match[1].trim();
      return line;
    }
  } catch {
    // Missing key file is handled by caller.
  }
  return null;
}
