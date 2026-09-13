import type { ClaudeProviderTestResult, ProviderConfig } from '../common/model-config';
import { claudeMessagesUrl } from './claude-provider-switch';

const MAX_RESPONSE_BYTES = 1024 * 1024;

export async function testClaudeProviderConnection(provider: ProviderConfig, credential: string, fetchImpl: typeof fetch = fetch): Promise<ClaudeProviderTestResult> {
  if (!provider.claudeCode) throw new Error('当前供应商没有 Claude Code 配置');
  const endpoint = new URL(claudeMessagesUrl(provider));
  if (endpoint.protocol !== 'https:') throw new Error('模型请求地址必须使用 HTTPS');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json', 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01',
        ...(provider.claudeCode.authField === 'ANTHROPIC_AUTH_TOKEN' ? { Authorization: `Bearer ${credential}` } : { 'x-api-key': credential }),
      },
      body: JSON.stringify({ model: provider.claudeCode.primaryModel, max_tokens: 1, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
      redirect: 'error', signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('供应商连通性测试超时');
    throw new Error('无法连接供应商的 Claude Messages 接口');
  } finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error(`供应商测试请求失败（HTTP ${response.status}）`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error('供应商测试响应过大');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('供应商测试响应过大');
  let model = provider.claudeCode.primaryModel;
  if (text) {
    try {
      const payload = JSON.parse(text) as { model?: unknown };
      if (typeof payload.model === 'string' && payload.model.trim()) model = payload.model.trim().slice(0, 200);
    } catch { throw new Error('供应商测试响应不是有效 JSON'); }
  }
  return { providerId: provider.id, ok: true, status: response.status, latencyMs: Math.max(0, Date.now() - startedAt), model, message: '鉴权与 Claude Messages 接口可用' };
}
