const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

function source(type, title, url) {
  return { type, title, author: 'tester', url, excerpt: `${title} excerpt` };
}

async function main() {
  await app.whenReady();
  const { buildExploreSearchCommand, normalizeExploreSearchResponse } = require('../dist/main/explore-zhihu-search.js');
  const { registerExploreAnalysisIpc } = require('../dist/main/explore-analysis.js');
  const { buildAgentLaunchArgs, buildAgentMcpConfig } = require('../dist/main/agent.js');
  const { Orchestrator, isExploreToolAllowed } = require('../dist/main/worker/orchestrator.js');
  const { normalizeExploreAnalysisResult } = require('../dist/common/explore.js');

  const zhihuCommand = buildExploreSearchCommand('zhihu', 'ESP32 Wi-Fi', 99);
  assert.deepEqual(zhihuCommand.args.slice(-6), ['search', 'zhihu', '--query', 'ESP32 Wi-Fi', '--count', '10']);
  const globalCommand = buildExploreSearchCommand('global', 'ESP32 Wi-Fi', 8);
  assert.deepEqual(globalCommand.args.slice(-8), ['search', 'global', '--query', 'ESP32 Wi-Fi', '--count', '8', '--search-db', 'all']);
  assert.throws(() => buildExploreSearchCommand('hot', 'x', 1), /不支持/);

  const parsed = normalizeExploreSearchResponse({ Data: { Items: [
    { Title: '<em>ESP32</em> 经验', ContentText: '真实 <em>运行</em> 记录', Url: 'https://www.zhihu.com/question/1', AuthorName: '用户' },
    { Title: '', ContentText: 'bad', Url: 'javascript:bad' },
  ] } }, 'zhihu');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].type, 'zhihu');
  assert.equal(parsed[0].title, 'ESP32 经验');

  const registrations = new Map();
  const calls = [];
  registerExploreAnalysisIpc(
    { handle: (channel, handler) => registrations.set(channel, handler) },
    {
      confirmExploreExecution: (confirmation) => {
        calls.push({ kind: 'execution', confirmation });
        return { disposition: 'queued', taskId: 'execution-task' };
      },
      submitExploreAnalysis: (request, requestId, _conversation, sources) => {
        calls.push({ kind: 'analysis', request, requestId, sources });
        return { disposition: 'started', taskId: 'analysis-task' };
      },
      submitExplorePlan: (handoff, requestId) => {
        calls.push({ kind: 'plan', handoff, requestId });
        return { disposition: 'started', taskId: 'plan-task' };
      },
    },
    async (value) => ({ request: value, sources: [source('zhihu', '社区', 'https://www.zhihu.com/question/1')] }),
    () => ({ id: 'project-test', projectDir: 'hardboard/projects/test' }),
  );
  const request = { mode: 'idea', goal: '桌面设备', context: { items: [] } };
  const started = await registrations.get('explore:analysis:start')({}, request);
  assert.equal(started.sourceCount, 1);
  assert.equal(calls[0].kind, 'analysis');

  const handoff = {
    id: 'handoff-1', kind: 'idea', status: 'planning', originalGoal: '桌面设备', environment: [],
    selectedIdea: { id: 'idea-1', title: '设备', value: '价值', implementationDirection: '先做原型', compatibility: 'ESP32', sources: [source('zhihu', '社区', 'https://www.zhihu.com/question/1')] },
    sources: [source('zhihu', '社区', 'https://www.zhihu.com/question/1')], suggestedFirstStep: '先做原型', createdAt: new Date().toISOString(),
  };
  await registrations.get('explore:handoff:plan')({}, handoff);
  assert.equal(calls[1].kind, 'plan');
  const ipcExecution = await registrations.get('explore:handoff:execute')({}, {
    planRequestId: 'ipc-plan', handoffId: 'handoff-1', confirmed: true,
  });
  assert.equal(ipcExecution.disposition, 'queued');
  assert.equal(calls[2].kind, 'execution');

  const planArgs = buildAgentLaunchArgs('explore_plan', 'empty.json', 'plan');
  assert(!planArgs.includes('--dangerously-skip-permissions'));
  assert.equal(planArgs[planArgs.indexOf('--tools') + 1], '');
  assert.deepEqual(buildAgentMcpConfig('explore_plan'), { mcpServers: {} });
  assert.equal(isExploreToolAllowed('explore_plan', 'Skill'), false);

  const submissions = [];
  const harness = Object.create(Orchestrator.prototype);
  Object.assign(harness, {
    getTaskStatus: () => ({ busy: false }),
    submitQueuedTask: (queued, mode) => {
      submissions.push({ queued, mode });
      return { ok: true, disposition: 'started', taskId: queued.id, activeTaskId: queued.id, queueLength: 0, guidanceCount: 0 };
    },
  });
  harness.submitExplorePlan(handoff, 'plan-request', 'conversation');
  assert.equal(submissions[0].queued.executionProfile, 'explore_plan');
  assert.deepEqual(submissions[0].queued.exploreExpectation, { requestId: 'plan-request', mode: 'plan' });

  const plan = normalizeExploreAnalysisResult({
    schemaVersion: 1, requestId: 'plan-request', mode: 'plan',
    plan: { summary: '先验证再实现', steps: [{ id: 's1', title: '核对工程', detail: '读取用户已交接的环境摘要' }], risks: ['需要真实开发板'] },
  }, { requestId: 'plan-request', mode: 'plan' });
  assert.equal(plan.mode, 'plan');
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'plan-request', handoffId: 'handoff-1', confirmed: true,
  }), /尚未完成/);
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'plan-request', handoffId: 'handoff-1', confirmed: false,
  }), /explicit confirmation/);
  harness.markExplorePlanReady(plan);
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'plan-request', handoffId: 'wrong-handoff', confirmed: true,
  }), /Handoff 不匹配/);
  const execution = harness.confirmExploreExecution({
    planRequestId: 'plan-request', handoffId: 'handoff-1', confirmed: true,
  });
  assert.equal(execution.disposition, 'started');
  assert.equal(submissions[1].queued.executionProfile, 'default');
  assert.equal(submissions[1].mode, 'auto');
  assert.match(submissions[1].queued.text, /用户已.*明确确认执行/);
  assert.match(submissions[1].queued.text, /REAL_HARDWARE_VALIDATION_PENDING/);
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'plan-request', handoffId: 'handoff-1', confirmed: true,
  }), /不存在|已经确认/);
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'forged-plan', handoffId: 'handoff-1', confirmed: true,
  }), /不存在/);
  harness.submitExplorePlan(handoff, 'expired-plan', 'conversation');
  const expiredPlan = normalizeExploreAnalysisResult({
    ...plan, requestId: 'expired-plan',
  }, { requestId: 'expired-plan', mode: 'plan' });
  harness.markExplorePlanReady(expiredPlan);
  harness.confirmableExplorePlans.get('expired-plan').completedAt = Date.now() - (31 * 60 * 1000);
  assert.throws(() => harness.confirmExploreExecution({
    planRequestId: 'expired-plan', handoffId: 'handoff-1', confirmed: true,
  }), /过期|不存在/);
  assert.throws(() => normalizeExploreAnalysisResult({ ...plan, plan: { ...plan.plan, steps: [] } }, { requestId: 'plan-request', mode: 'plan' }), /steps/);
  assert.throws(() => normalizeExploreAnalysisResult({
    schemaVersion: 1, requestId: 'idea-request', mode: 'idea', ideas: [{
      id: 'i', title: 't', value: 'v', implementationDirection: 'd', compatibility: 'c',
      sources: [source('zhihu', '伪造来源', 'https://www.zhihu.com/question/not-searched')],
    }],
  }, { requestId: 'idea-request', mode: 'idea', sourceUrls: ['https://www.zhihu.com/question/1'] }), /not provided by search/);

  const panel = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'ExplorePanel.tsx'), 'utf8');
  assert.match(panel, /startExploreAnalysis/);
  assert.match(panel, /startExplorePlan/);
  assert.match(panel, /data-tour-id="explore-confirm-execution"/);
  assert.match(panel, /confirmExploreExecution/);
  assert.match(panel, /确认前不会修改文件、Build、Flash 或操作串口/);
  console.log('explore search/handoff passed: fixed search, source mapping, tool-free plan, one-time confirmed execution gate');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
