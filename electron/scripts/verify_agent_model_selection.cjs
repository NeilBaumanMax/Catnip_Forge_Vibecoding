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

  try {
    const defaults = snapshotEngineeringAgentModel();
    assert.equal(defaults.profileId, 'deepseek-v4-pro');
    assert.equal(defaults.baseUrl, 'https://api.deepseek.com/anthropic');
    assert.equal('authToken' in defaults, false, 'queued model snapshot must contain no credential');

    const configStore = new ModelConfigStore(path.join(root, 'models', 'config.json'));
    const config = createDefaultModelConfig();
    const selected = snapshotEngineeringAgentModel('deepseek-v4-flash-agent');
    assert.equal(selected.upstreamModel, 'deepseek-v4-flash');
    assert.equal(selected.providerId, 'deepseek');
    assert.equal('authToken' in selected, false);

    const invalid = configStore.read();
    invalid.models.push({
      id: 'openai-only-agent', providerId: 'deepseek', name: 'Invalid Agent', upstreamModel: 'openai-only',
      protocol: 'openai-compatible', capabilities: ['engineering-agent'], enabled: true, builtIn: false,
    });
    configStore.replace(invalid, 0);
    assert.throws(() => snapshotEngineeringAgentModel('openai-only-agent'), /协议适配/);
    assert.throws(() => snapshotEngineeringAgentModel('missing'), /不存在/);

    const agentSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'agent.ts'), 'utf8');
    assert.match(agentSource, /model\?\.upstreamModel/);
    assert.match(agentSource, /agentModelKey/);
    assert.doesNotMatch(agentSource, /logger\.(?:info|warn|error)\([^\n]+authToken/);
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
