import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ExploreRequest, SourceEvidence } from '../common/explore';
import { normalizeExploreRequest, normalizeSourceEvidence } from '../common/explore';
import { getAgentDir } from './paths';
import { exploreZhihuEnvironment, readExploreZhihuConnectionStatus, systemPowerShell } from './explore-zhihu-status';

export type ExploreSearchKind = 'zhihu' | 'global';
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const SEARCH_TIMEOUT_MS = 45_000;

export function buildExploreSearchCommand(kind: ExploreSearchKind, query: string, count: number) {
  if (kind !== 'zhihu' && kind !== 'global') throw new Error('不支持的探索搜索来源');
  const normalizedQuery = query.replace(/\r/g, '').trim();
  if (!normalizedQuery || normalizedQuery.length > 4_000) throw new Error('探索搜索内容无效');
  const boundedCount = Math.max(1, Math.min(kind === 'zhihu' ? 10 : 20, Math.trunc(count)));
  const runScript = path.join(getAgentDir(), 'skills', 'zhihu', 'scripts', 'run.ps1');
  if (!fs.existsSync(runScript)) throw new Error('官方知乎 Skill 不完整');
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', runScript, 'search', kind, '--query', normalizedQuery, '--count', String(boundedCount)];
  if (kind === 'global') args.push('--search-db', 'all');
  return { command: systemPowerShell(), args, cwd: path.dirname(runScript) };
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

export function normalizeExploreSearchResponse(value: unknown, kind: ExploreSearchKind): SourceEvidence[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('知乎搜索返回格式无效');
  const root = value as Record<string, unknown>;
  const data = root.Data && typeof root.Data === 'object' && !Array.isArray(root.Data) ? root.Data as Record<string, unknown> : null;
  if (!data || !Array.isArray(data.Items)) throw new Error('知乎搜索返回格式无效');
  const sources: SourceEvidence[] = [];
  for (const raw of data.Items.slice(0, 20)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const title = cleanText(item.Title);
    const excerpt = cleanText(item.ContentText || item.Summary);
    const author = cleanText(item.AuthorName);
    const url = typeof item.Url === 'string' ? item.Url : '';
    if (!title || !excerpt || !url) continue;
    try {
      sources.push(normalizeSourceEvidence({ type: kind === 'zhihu' ? 'zhihu' : 'web', title, author: author || undefined, url, excerpt: excerpt.slice(0, 800) }));
    } catch {
      // Ignore malformed individual rows returned alongside valid official rows.
    }
  }
  return sources;
}

export async function runExploreOfficialSearch(kind: ExploreSearchKind, query: string, count: number): Promise<SourceEvidence[]> {
  const launch = buildExploreSearchCommand(kind, query, count);
  return new Promise((resolve, reject) => {
    const child = spawn(launch.command, launch.args, { cwd: launch.cwd, env: exploreZhihuEnvironment(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let bytes = 0;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else {
        try { resolve(normalizeExploreSearchResponse(JSON.parse(stdout), kind)); }
        catch { reject(new Error('无法读取知乎搜索结果')); }
      }
    };
    const timer = setTimeout(() => { child.kill(); finish(new Error('知乎搜索超时')); }, SEARCH_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes <= MAX_OUTPUT_BYTES) stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { bytes += chunk.length; });
    child.once('error', () => finish(new Error('无法启动知乎搜索')));
    child.once('close', (code) => {
      if (bytes > MAX_OUTPUT_BYTES) finish(new Error('知乎搜索结果过大'));
      else if (code !== 0) finish(new Error('知乎搜索暂时不可用'));
      else finish();
    });
  });
}

export async function searchForExplore(value: unknown): Promise<{ request: ExploreRequest; sources: SourceEvidence[] }> {
  const request = normalizeExploreRequest(value);
  const status = await readExploreZhihuConnectionStatus();
  if (status.state !== 'connected') throw new Error('请先连接知乎开放平台');
  const zhihu = await runExploreOfficialSearch('zhihu', request.goal, 8);
  const global = request.mode === 'diagnosis' || zhihu.length < 3 ? await runExploreOfficialSearch('global', request.goal, 8) : [];
  if (!zhihu.length) throw new Error('没有找到可用的知乎来源，请调整描述后重试');
  if (request.mode === 'diagnosis' && !global.length) throw new Error('没有找到可用的外部来源，请调整描述后重试');
  return { request, sources: [...zhihu, ...global] };
}
