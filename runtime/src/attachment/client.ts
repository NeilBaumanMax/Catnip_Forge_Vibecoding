export async function callAttachmentBridge<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.CATNIP_ATTACHMENT_BRIDGE_URL;
  const token = process.env.CATNIP_ATTACHMENT_BRIDGE_TOKEN;
  if (!url || !token) throw new Error('附件桥接服务不可用；请从 Catnip Forge 内启动 Agent');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(method === 'analyze' ? 50_000 : 10_000),
  });
  const payload = await response.json() as { ok?: boolean; result?: T; error?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `附件桥接请求失败（HTTP ${response.status}）`);
  return payload.result as T;
}
