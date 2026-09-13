const assert = require('node:assert/strict');
const { discoverProviderModels } = require('../dist/main/model-discovery.js');

async function main() {
  const provider = {
    id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com',
    protocols: ['anthropic-compatible'], enabled: true, builtIn: true, credentialId: 'deepseek',
    claudeCode: { apiFormat: 'anthropic', isFullUrl: false, authField: 'ANTHROPIC_AUTH_TOKEN', primaryModel: 'deepseek-v4-pro' },
  };
  const secret = ['sk', 'discovery', 'fixture'].join('-');
  let requested;
  const result = await discoverProviderModels(provider, secret, 7, async (url, init) => {
    requested = { url: String(url), authorization: init.headers.Authorization };
    return new Response(JSON.stringify({ object: 'list', data: [
      { id: 'deepseek-v4-pro', owned_by: 'deepseek' },
      { id: 'deepseek-v4-flash', owned_by: 'deepseek' },
      { id: 'deepseek-v4-flash', owned_by: 'duplicate' },
      { id: '<invalid>' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(requested.url, 'https://api.deepseek.com/v1/models');
  assert.equal(requested.authorization, `Bearer ${secret}`);
  assert.deepEqual(result.models.map((item) => item.id), ['deepseek-v4-flash', 'deepseek-v4-pro']);
  assert.equal(result.activeModel, 'deepseek-v4-pro');
  assert(!JSON.stringify(result).includes(secret));
  await assert.rejects(() => discoverProviderModels(provider, secret, 7, async () => new Response('{}', { status: 401 })), /HTTP 401/);
  await assert.rejects(() => discoverProviderModels(provider, secret, 7, async () => new Response('{bad', { status: 200 })), /有效 JSON/);
  console.log('Model discovery verification passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
