const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  await app.whenReady();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-explore-knowledge-'));
  const file = path.join(root, 'explore', 'knowledge.json');
  const { ExploreKnowledgeStore, createExploreKnowledgeHandlers, registerExploreKnowledgeIpc } = require('../dist/main/explore-knowledge.js');
  const { normalizeExploreRequest, normalizeIdeaResult, normalizeDiagnosisResult, normalizeHandoffContext } = require('../dist/common/explore.js');
  const source = {
    type: 'zhihu',
    title: 'ESP32 Wi-Fi 断线重连经验',
    author: '示例作者',
    url: 'https://www.zhihu.com/question/example',
    excerpt: '在真实开发板上观察重连日志并限制重试节奏。',
  };

  try {
    const first = createExploreKnowledgeHandlers(new ExploreKnowledgeStore(file));
    const routes = new Map();
    registerExploreKnowledgeIpc({ handle: (channel, handler) => routes.set(channel, handler) }, first);
    assert.deepEqual([...routes.keys()].sort(), [
      'explore:knowledge:addVerification',
      'explore:knowledge:findRelated',
      'explore:knowledge:list',
      'explore:knowledge:save',
      'explore:knowledge:selectForContext',
    ]);
    const card = await routes.get('explore:knowledge:save')(null, {
      source,
      taskSummary: '排查 ESP32-S3 Wi-Fi 反复断开',
      tags: ['ESP32-S3', 'Wi-Fi'],
      associatedProjects: ['desk-companion'],
      fullArticleBody: 'MUST_NOT_PERSIST',
    });
    assert.equal(card.verificationStatus, 'unverified');
    assert.equal((await routes.get('explore:knowledge:list')(null)).length, 1);
    assert(!fs.readFileSync(file, 'utf8').includes('MUST_NOT_PERSIST'), 'unknown full article body must not persist');

    const restarted = createExploreKnowledgeHandlers(new ExploreKnowledgeStore(file));
    assert.equal(restarted.list()[0].id, card.id, 'knowledge card must survive store restart');
    assert.equal((await routes.get('explore:knowledge:findRelated')(null, 'ESP32-S3 Wi-Fi')).length, 1, 'related card should be discoverable through IPC');
    assert.deepEqual(await routes.get('explore:knowledge:selectForContext')(null, []), [], 'discovery must not inject an unselected card');
    assert.equal(restarted.selectForContext([card.id])[0].id, card.id, 'explicitly selected card should enter context');

    const verified = restarted.addVerification({
      cardId: card.id,
      status: 'verified_effective',
      projectId: 'desk-companion',
      summary: 'Build、Flash 与 Serial 证据均由后续硬件任务提供。',
      evidenceRefs: ['task:future-hardware-validation'],
    });
    assert.equal(verified.verificationStatus, 'verified_effective');
    assert.equal(verified.verificationRecords.length, 1);

    const request = normalizeExploreRequest({
      mode: 'diagnosis',
      goal: 'Wi-Fi 烧录后反复断开',
      context: { items: [
        { id: 'serial-latest', kind: 'serial', label: '最近串口', summary: '断线日志', selected: true },
        { id: 'build-latest', kind: 'build', label: '最近构建', summary: '构建成功', selected: false },
      ] },
    });
    assert.equal(request.context.items[1].selected, false, 'user context exclusion must survive validation');

    const idea = normalizeIdeaResult({
      id: 'idea-1',
      title: '桌面陪伴设备',
      value: '提供轻量环境反馈与陪伴感',
      implementationDirection: 'ESP32-S3 配合灯光和传感器',
      compatibility: '匹配当前 ESP32-S3 target',
      sources: [source],
    });
    const diagnosis = normalizeDiagnosisResult({
      problem: '烧录成功后 Wi-Fi 反复断开',
      hypotheses: [{
        id: 'hypothesis-1',
        statement: '重连节奏可能触发持续退避',
        priorityReason: '串口日志显示重复断开',
        projectEvidence: ['build succeeded', 'serial disconnect loop'],
        communitySources: [source],
        externalSources: [{ ...source, type: 'web', url: 'https://docs.espressif.com/projects/esp-idf/' }],
        nextValidation: '记录断开 reason code 并限制重试',
      }],
      sourceConflicts: [],
    });
    const handoff = normalizeHandoffContext({
      id: 'handoff-1',
      kind: 'investigation',
      status: 'imported',
      originalGoal: request.goal,
      environment: request.context.items,
      diagnosis,
      sources: [source],
      suggestedFirstStep: '先生成验证计划，不修改项目',
      createdAt: new Date().toISOString(),
    });
    assert.equal(handoff.status, 'imported');
    assert.throws(() => normalizeHandoffContext({ ...handoff, kind: 'idea', selectedIdea: undefined }), /requires selectedIdea/);

    const corrupt = '{"version":1,"cards":';
    fs.writeFileSync(file, corrupt, 'utf8');
    assert.throws(() => restarted.list(), /original file was preserved/);
    assert.equal(fs.readFileSync(file, 'utf8'), corrupt, 'corrupt knowledge data must not be overwritten');

    const invalidStructure = '{"version":1,"cards":[{}]}';
    fs.writeFileSync(file, invalidStructure, 'utf8');
    assert.throws(() => restarted.save({ source, taskSummary: 'must fail safely' }), /original file was preserved/);
    assert.equal(fs.readFileSync(file, 'utf8'), invalidStructure, 'invalid card structure must not be overwritten');

    console.log('explore knowledge store verification passed: 1 persisted, selection gated, corruption preserved');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
