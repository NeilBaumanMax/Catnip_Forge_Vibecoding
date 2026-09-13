import type { ClaudeModelDiscoverySnapshot, ProviderConfig } from '../common/model-config';

const MAX_RESPONSE_BYTES = 1024 * 1024;
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

export async function discoverProviderModels(
  provider: ProviderConfig,
  credential: string,
  revision: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ClaudeModelDiscoverySnapshot> {
  if (!provider.claudeCode) throw new Error('当前供应商没有 Claude Code 配置');
  const endpoint = new URL(`${provider.baseUrl.replace(/\/+$/, '')}/models`);
  if (endpoint.protocol !== 'https:') throw new Error('模型列表接口必须使用 HTTPS');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${credential}`,
        ...(provider.claudeCode.authField === 'ANTHROPIC_API_KEY' ? { 'x-api-key': credential } : {}),
      },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.name === 'AbortError' ? '获取可用模型超时' : '无法连接供应商的模型列表接口');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`供应商拒绝模型列表请求（HTTP ${response.status}）`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error('供应商模型列表响应过大');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('供应商模型列表响应过大');
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { throw new Error('供应商模型列表不是有效 JSON'); }
  const data = payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
    ? (payload as { data: unknown[] }).data
    : null;
  if (!data) throw new Error('供应商模型列表格式不受支持');
  const seen = new Set<string>();
  const models = data.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const id = String((item as { id?: unknown }).id || '').trim();
    if (!MODEL_ID_PATTERN.test(id) || seen.has(id)) return [];
    seen.add(id);
    const ownedBy = String((item as { owned_by?: unknown }).owned_by || '').trim();
    return [{ id, ...(ownedBy ? { ownedBy: ownedBy.slice(0, 100) } : {}) }];
  }).sort((left, right) => left.id.localeCompare(right.id));
  if (!models.length) throw new Error('当前 Key 没有返回可用模型');
  return { providerId: provider.id, providerName: provider.name, revision, activeModel: provider.claudeCode.primaryModel, models };
}
