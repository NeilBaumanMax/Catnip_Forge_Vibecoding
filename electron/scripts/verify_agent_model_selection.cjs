const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-agent-model-'));
  app.setPath('userData', root);
  await app.whenReady();
  const { ModelConfigStore } = require('../dist/main/model-config-store.js');
  const { createDefaultModelConfig } = require('../dist/common/model-config.js');
  const { snapshotEngineeringAgentModel } = require('../dist/main/agent-model-selection.js');
  const { buildAgentEnv } = require('../dist/main/agent.js');

  try {
    const defaults = snapshotEngineeringAgentModel();
    assert.equal(defaults.profileId, 'deepseek');
    assert.equal(defaults.baseUrl, 'https://api.deepseek.com/anthropic');
    assert.equal(defaults.authField, 'ANTHROPIC_AUTH_TOKEN');
    assert.equal(defaults.haikuModel, 'deepseek-v4-flash');
    assert.equal('authToken' in defaults, false, 'queued model snapshot must contain no credential');

    const configStore = new ModelConfigStore(path.join(root, 'models', 'config.json'));
    const config = createDefaultModelConfig();
    config.providers.push({
      id: 'zhipu', name: '智谱清言', baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      protocols: ['anthropic-compatible'], enabled: true, builtIn: false, credentialId: 'zhipu',
      claudeCode: { apiFormat: 'anthropic', isFullUrl: false, authField: 'ANTHROPIC_API_KEY', primaryModel: 'glm-4.7', haikuModel: 'glm-4.5-air' },
    });
    config.activeClaudeProviderId = 'zhipu';
    config.setupMode = 'custom';
    configStore.replace(config, 0);
    const selected = snapshotEngineeringAgentModel();
    assert.equal(selected.upstreamModel, 'glm-4.7');
    assert.equal(selected.providerId, 'zhipu');
    assert.equal(selected.haikuModel, 'glm-4.5-air');
    assert.equal(selected.sonnetModel, 'glm-4.7');
    assert.equal(selected.fableModel, 'glm-4.7');
    assert.equal(selected.subagentModel, 'glm-4.5-air');
    assert.equal('authToken' in selected, false);

    const runtime = { ...selected, authToken: 'sk-agent-runtime-fixture', authSource: 'secure-storage' };
    const inherited = {
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    };
    process.env.ANTHROPIC_AUTH_TOKEN = 'parent-token-must-be-replaced';
    process.env.ANTHROPIC_API_KEY = 'parent-key-must-be-cleared';
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'parent-opus-must-be-cleared';
    const env = buildAgentEnv(runtime);
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined);
    assert.equal(env.ANTHROPIC_API_KEY, runtime.authToken);
    assert.equal(env.ANTHROPIC_BASE_URL, selected.baseUrl);
    assert.equal(env.ANTHROPIC_MODEL, selected.upstreamModel);
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, selected.haikuModel);
    assert.equal(env.ANTHROPIC_DEFAULT_SONNET_MODEL, selected.sonnetModel);
    assert.equal(env.ANTHROPIC_DEFAULT_OPUS_MODEL, selected.opusModel);
    assert.equal(env.ANTHROPIC_DEFAULT_FABLE_MODEL, selected.fableModel);
    assert.equal(env.CLAUDE_CODE_SUBAGENT_MODEL, selected.subagentModel);
    for (const [key, value] of Object.entries(inherited)) {
      if (value == null) delete process.env[key]; else process.env[key] = value;
    }

    const invalid = configStore.read();
    invalid.activeClaudeProviderId = 'qwen';
    assert.throws(() => configStore.replace(invalid, 1), /Claude Code compatible/);

    const agentSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'agent.ts'), 'utf8');
    assert.match(agentSource, /ANTHROPIC_DEFAULT_HAIKU_MODEL/);
    assert.match(agentSource, /env\[model\.authField\] = model\.authToken/);
    assert.match(agentSource, /agentModelKey/);
    assert.doesNotMatch(agentSource, /model\?\.authToken \?\? readDeepSeekApiKey/);
    assert.doesNotMatch(agentSource, /logger\.(?:info|warn|error)\([^\n]+authToken/);
    const orchestratorSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'worker', 'orchestrator.ts'), 'utf8');
    assert.doesNotMatch(orchestratorSource, /snapshotEngineeringAgentModel\([^)]*modelProfileId/);
    assert.doesNotMatch(orchestratorSource, /this\.ensurePersistentAgent\(\);/, 'Claude Code must not start before a configured task');
    console.log('Agent model selection verification passed.');
  } finally {
    app.quit();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
