const assert = require('node:assert/strict');
const { createDefaultModelConfig, normalizeModelConfig } = require('../dist/common/model-config.js');
const {
  buildClaudeCodeSettingsEnv,
  buildClaudeProviderPreview,
  claudeMessagesUrl,
} = require('../dist/main/claude-provider-switch.js');
const { testClaudeProviderConnection } = require('../dist/main/model-provider-test.js');

const defaults = createDefaultModelConfig();
assert.equal(defaults.schemaVersion, 3);
const deepseek = defaults.providers.find((item) => item.id === 'deepseek');
assert.equal(deepseek.websiteUrl, 'https://www.deepseek.com');
assert.equal(deepseek.claudeCode.apiFormat, 'anthropic');
assert.equal(deepseek.claudeCode.isFullUrl, false);
assert.equal(deepseek.claudeCode.fableModel, 'deepseek-v4-pro');
assert.equal(deepseek.claudeCode.subagentModel, 'deepseek-v4-flash');

const versionTwo = structuredClone(defaults);
versionTwo.schemaVersion = 2;
delete versionTwo.providers[0].websiteUrl;
delete versionTwo.providers[0].notes;
delete versionTwo.providers[0].claudeCode.apiFormat;
delete versionTwo.providers[0].claudeCode.isFullUrl;
delete versionTwo.providers[0].claudeCode.fableModel;
delete versionTwo.providers[0].claudeCode.subagentModel;
const migrated = normalizeModelConfig(versionTwo);
assert.equal(migrated.schemaVersion, 3);
assert.equal(migrated.providers[0].claudeCode.apiFormat, 'anthropic');
assert.equal(migrated.providers[0].claudeCode.isFullUrl, false);

const custom = {
  id: 'custom', name: 'Custom', websiteUrl: 'https://provider.example.com', notes: '团队账号',
  baseUrl: 'https://gateway.example.com/anthropic', protocols: ['anthropic-compatible'],
  enabled: true, builtIn: false, credentialId: 'custom',
  claudeCode: {
    apiFormat: 'anthropic', isFullUrl: false, authField: 'ANTHROPIC_AUTH_TOKEN',
    primaryModel: 'fallback-model', sonnetModel: 'sonnet-model', opusModel: 'opus-model',
    fableModel: 'fable-model', haikuModel: 'haiku-model', subagentModel: 'subagent-model',
    sonnetModelName: 'Sonnet 供应商显示名', modelsUrl: 'https://gateway.example.com/v1/models',
  },
};
assert.equal(claudeMessagesUrl(custom), 'https://gateway.example.com/anthropic/v1/messages');
const env = buildClaudeCodeSettingsEnv(custom);
assert.equal(env.ANTHROPIC_MODEL, 'fallback-model');
assert.equal(env.ANTHROPIC_DEFAULT_FABLE_MODEL, 'fable-model');
const preview = buildClaudeProviderPreview(custom);
assert.equal(preview.requestUrl, 'https://gateway.example.com/anthropic/v1/messages');
assert.equal(preview.modelsUrl, 'https://gateway.example.com/v1/models');
assert.equal(preview.settings.env.ANTHROPIC_AUTH_TOKEN, '<由 Windows 安全存储注入>');
assert(!JSON.stringify(preview).match(/sk-|secret/i));

const exact = structuredClone(custom);
exact.baseUrl = 'https://gateway.example.com/custom/messages';
exact.claudeCode.isFullUrl = true;
assert.equal(claudeMessagesUrl(exact), exact.baseUrl);
assert.throws(() => buildClaudeCodeSettingsEnv(exact), /完整 URL.*直连/);

const unsupported = structuredClone(custom);
unsupported.claudeCode.apiFormat = 'openai-chat';
assert.throws(() => normalizeModelConfig({ ...defaults, providers: [deepseek, unsupported] }), /apiFormat/);

async function verifyConnectionTest() {
  const secret = ['sk', 'provider', 'test', 'fixture'].join('-');
  let request;
  const result = await testClaudeProviderConnection(custom, secret, async (url, init) => {
    request = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ model: 'sonnet-model', content: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(request.url, 'https://gateway.example.com/anthropic/v1/messages');
  assert.equal(request.headers.Authorization, `Bearer ${secret}`);
  assert.equal(request.body.max_tokens, 1);
  assert.equal(result.ok, true);
  assert.equal(result.model, 'sonnet-model');
  assert(!JSON.stringify(result).includes(secret));
  await assert.rejects(() => testClaudeProviderConnection(custom, secret, async () => new Response('{}', { status: 401 })), /HTTP 401/);
  console.log('Claude provider parity verification passed.');
}

verifyConnectionTest().catch((error) => { console.error(error); process.exitCode = 1; });
