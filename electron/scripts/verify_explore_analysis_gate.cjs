const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { app } = require('electron');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `missing ${flag}`);
  return args[index + 1];
}

function source(type = 'zhihu') {
  return {
    type,
    title: 'ESP32-S3 实践记录',
    author: 'Maker',
    url: 'https://example.com/esp32-s3',
    excerpt: '可追溯的原始摘要',
  };
}

function ideaEnvelope(requestId = 'request-idea') {
  return {
    schemaVersion: 1,
    requestId,
    mode: 'idea',
    ideas: [{
      id: 'idea-1',
      title: '桌面陪伴设备',
      value: '通过灯光与触摸反馈提供陪伴感',
      implementationDirection: 'ESP32-S3、触摸输入和灯光输出',
      compatibility: '与当前 ESP32-S3 匹配',
      sources: [source()],
    }],
  };
}

function diagnosisEnvelope(requestId = 'request-diagnosis') {
  return {
    schemaVersion: 1,
    requestId,
    mode: 'diagnosis',
    diagnosis: {
      problem: 'Wi-Fi 运行时反复断开',
      hypotheses: [{
        id: 'hypothesis-1',
        statement: '供电波动可能导致射频工作异常',
        priorityReason: '串口观察与社区经验均指向高负载时异常',
        projectEvidence: ['最近日志在发射阶段中断'],
        communitySources: [source('zhihu')],
        externalSources: [source('web')],
        nextValidation: '先只读核对电源与复位日志',
      }],
      sourceConflicts: [],
    },
  };
}

async function main() {
  await app.whenReady();
  const {
    buildAgentLaunchArgs,
    buildAgentMcpConfig,
  } = require('../dist/main/agent.js');
  const {
    Orchestrator,
    agentStderrForUI,
    agentTextForLog,
    canAppendTaskGuidance,
    isExploreAnalysisToolAllowed,
    parseExploreAnalysisResultText,
  } = require('../dist/main/worker/orchestrator.js');
  const { ChatBuffer } = require('../dist/main/worker/chat-buffer.js');

  const normalArgs = buildAgentLaunchArgs('default', 'normal-mcp.json', 'normal prompt');
  assert(normalArgs.includes('--dangerously-skip-permissions'));
  assert(!normalArgs.includes('--permission-mode'));

  const restrictedArgs = buildAgentLaunchArgs('explore_analysis', 'restricted-mcp.json', 'restricted prompt');
  assert(!restrictedArgs.includes('--dangerously-skip-permissions'));
  assert(restrictedArgs.includes('--bare'));
  assert.equal(valueAfter(restrictedArgs, '--permission-mode'), 'plan');
  assert.equal(valueAfter(restrictedArgs, '--tools'), 'Skill');
  assert(restrictedArgs.includes('--strict-mcp-config'));
  assert.doesNotThrow(() => JSON.parse(valueAfter(restrictedArgs, '--json-schema')));
  assert.deepEqual(buildAgentMcpConfig('explore_analysis'), { mcpServers: {} });
  const claudeBin = path.join(__dirname, '..', '..', 'agent', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  const cliHelp = execFileSync(claudeBin, ['--help'], { encoding: 'utf8', windowsHide: true });
  for (const flag of ['--bare', '--permission-mode', '--strict-mcp-config', '--tools', '--json-schema']) {
    assert(cliHelp.includes(flag), `installed Claude CLI must support ${flag}`);
  }

  assert.equal(isExploreAnalysisToolAllowed('Skill'), true);
  for (const tool of ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash', 'mcp__vibeide-runtime__hardboard_idf_build', 'hardboard.serial_read']) {
    assert.equal(isExploreAnalysisToolAllowed(tool), false, `${tool} must be forbidden`);
  }
  assert.equal(canAppendTaskGuidance('default', 'default'), true);
  assert.equal(canAppendTaskGuidance('default', 'explore_analysis'), false);
  assert.equal(canAppendTaskGuidance('explore_analysis', 'default'), false);
  assert.equal(canAppendTaskGuidance('explore_analysis', 'explore_analysis'), false);
  assert.equal(agentStderrForUI('default', 'raw stderr'), 'raw stderr');
  assert.doesNotMatch(agentStderrForUI('explore_analysis', 'SECRET_RAW_STDERR'), /SECRET_RAW_STDERR/);
  assert.equal(agentTextForLog('default', 'normal log text'), 'normal log text');
  assert.doesNotMatch(agentTextForLog('explore_analysis', 'SECRET_RAW_LOG'), /SECRET_RAW_LOG/);

  const submissions = [];
  const submissionHarness = Object.create(Orchestrator.prototype);
  Object.assign(submissionHarness, {
    getTaskStatus: () => ({ busy: false }),
    submitQueuedTask: (request, mode) => {
      submissions.push({ request, mode });
      return { ok: true, disposition: 'started', taskId: request.id, activeTaskId: request.id, queueLength: 0, guidanceCount: 0 };
    },
  });
  const submission = submissionHarness.submitExploreAnalysis({
    mode: 'idea',
    goal: '桌面设备',
    context: { items: [
      { id: 'keep', kind: 'project', label: '当前工程', summary: 'selected-context', selected: true },
      { id: 'drop', kind: 'serial', label: '串口', summary: 'CANCELLED_CONTEXT_MUST_NOT_APPEAR', selected: false },
    ] },
  }, 'request-safe', 'conversation-test');
  assert.equal(submission.requestId, 'request-safe');
  assert.equal(submissions[0].request.executionProfile, 'explore_analysis');
  assert.deepEqual(submissions[0].request.exploreExpectation, { requestId: 'request-safe', mode: 'idea' });
  assert.match(submissions[0].request.text, /selected-context/);
  assert.doesNotMatch(submissions[0].request.text, /CANCELLED_CONTEXT_MUST_NOT_APPEAR/);
  assert.throws(() => submissionHarness.submitExploreAnalysis({ mode: 'idea', goal: 'x', context: { items: [] } }, 'request\ninjection', 'conversation-test'), /request id/);

  const idea = parseExploreAnalysisResultText(
    JSON.stringify(ideaEnvelope()),
    { requestId: 'request-idea', mode: 'idea' },
  );
  assert.equal(idea.mode, 'idea');
  assert.equal(idea.ideas.length, 1);
  const diagnosis = parseExploreAnalysisResultText(
    JSON.stringify(diagnosisEnvelope()),
    { requestId: 'request-diagnosis', mode: 'diagnosis' },
  );
  assert.equal(diagnosis.mode, 'diagnosis');
  const buffer = new ChatBuffer();
  const structuredChunks = buffer.feed(`${JSON.stringify({
    type: 'result',
    subtype: 'success',
    result: 'Structured output provided successfully',
    structured_output: ideaEnvelope(),
    is_error: false,
  })}\n`);
  assert.equal(structuredChunks.length, 1);
  assert.deepEqual(structuredChunks[0].structuredOutput, ideaEnvelope());
  const defaultResultChunks = buffer.feed(`${JSON.stringify({ type: 'result', subtype: 'success', result: 'normal chat result', is_error: false })}\n`);
  assert.equal(defaultResultChunks[0].content, 'normal chat result');
  assert.equal(defaultResultChunks[0].structuredOutput, undefined);

  assert.throws(() => parseExploreAnalysisResultText('not json', { requestId: 'request-idea', mode: 'idea' }), /valid JSON/);
  assert.throws(() => parseExploreAnalysisResultText(`\`\`\`json\n${JSON.stringify(ideaEnvelope())}\n\`\`\``, { requestId: 'request-idea', mode: 'idea' }), /plain JSON/);
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify({ ...ideaEnvelope(), schemaVersion: 2 }), { requestId: 'request-idea', mode: 'idea' }), /schemaVersion/);
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(ideaEnvelope('stale-request')), { requestId: 'request-idea', mode: 'idea' }), /active request/);
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(ideaEnvelope()), { requestId: 'request-idea', mode: 'diagnosis' }), /mode/);
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify({ ...ideaEnvelope(), status: 'executing' }), { requestId: 'request-idea', mode: 'idea' }), /unknown fields/);
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify({ ...ideaEnvelope(), ideas: [] }), { requestId: 'request-idea', mode: 'idea' }), /ideas/);
  const badUrl = ideaEnvelope();
  badUrl.ideas[0].sources[0].url = 'file:///secret';
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(badUrl), { requestId: 'request-idea', mode: 'idea' }), /http or https/);
  const noZhihu = ideaEnvelope();
  noZhihu.ideas[0].sources = [source('web')];
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(noZhihu), { requestId: 'request-idea', mode: 'idea' }), /zhihu source/);
  const noHypotheses = diagnosisEnvelope();
  noHypotheses.diagnosis.hypotheses = [];
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(noHypotheses), { requestId: 'request-diagnosis', mode: 'diagnosis' }), /hypotheses/);
  const noExternal = diagnosisEnvelope();
  noExternal.diagnosis.hypotheses[0].externalSources = [];
  assert.throws(() => parseExploreAnalysisResultText(JSON.stringify(noExternal), { requestId: 'request-diagnosis', mode: 'diagnosis' }), /zhihu and web sources/);

  const events = [];
  const failures = [];
  const orchestrator = Object.create(Orchestrator.prototype);
  Object.assign(orchestrator, {
    pushUI: (channel, data) => events.push({ channel, data }),
    currentExecutionProfile: 'explore_analysis',
    currentExploreExpectation: { requestId: 'request-idea', mode: 'idea' },
    currentExploreResult: null,
    currentTask: 'restricted prompt',
    currentTaskId: 'task-1',
    handleAgentTurnComplete: async () => {},
    failExploreAnalysis: (code) => failures.push(code),
  });

  orchestrator.handleParsedChunk({ type: 'text', content: 'raw model text must stay hidden' });
  orchestrator.handleParsedChunk({ type: 'tool_result', content: 'raw tool result must stay hidden' });
  assert.deepEqual(events, []);
  orchestrator.currentExecutionProfile = 'default';
  orchestrator.handleParsedChunk({ type: 'text', content: 'late restricted text must stay hidden' }, 'explore_analysis');
  assert.deepEqual(events, []);
  orchestrator.currentExecutionProfile = 'explore_analysis';
  orchestrator.handleParsedChunk({ type: 'tool_call', toolName: 'Write', content: 'write secret.txt' });
  assert.deepEqual(failures, ['EXPLORE_FORBIDDEN_TOOL']);
  assert.deepEqual(events, []);

  orchestrator.handleParsedChunk({ type: 'result', content: 'Structured output provided successfully', structuredOutput: ideaEnvelope() });
  assert.equal(events.length, 1);
  assert.equal(events[0].channel, 'explore:analysis:result');
  assert.equal(events[0].data.requestId, 'request-idea');
  assert(!events.some((event) => event.channel === 'chat:message'));

  events.length = 0;
  orchestrator.currentExploreResult = null;
  orchestrator.currentTask = null;
  orchestrator.currentTaskId = null;
  orchestrator.handleParsedChunk({ type: 'result', content: JSON.stringify(ideaEnvelope()) });
  assert.deepEqual(events, [], 'stale result must not reach the UI channel');

  orchestrator.currentTask = 'restricted prompt';
  orchestrator.currentTaskId = 'task-2';
  orchestrator.currentExploreExpectation = { requestId: 'request-idea', mode: 'idea' };
  orchestrator.handleParsedChunk({ type: 'result', content: '{"schemaVersion":1}' });
  assert(failures.includes('EXPLORE_RESULT_INVALID'));
  assert.deepEqual(events, [], 'invalid result must not reach the UI channel');

  console.log('explore analysis gate passed: launch policy, profile isolation, side-effect rejection, schema, UI suppression');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
