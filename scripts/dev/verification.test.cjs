const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { changedFiles, route, context, relativeFile, projectMap } = require('./project.cjs');
const { profile, changedPlan, summarizePlan, stepsFor, legacyStep, runSteps, CORE, SAFE } = require('./verification.cjs');
const { checkKnowledge } = require('./check-knowledge.cjs');

test('Main is built once before all dependent tests; standalone wrappers preserved', () => {
  const plan = stepsFor([...CORE, ...CORE]);
  assert.equal(plan.filter(s => s.id === 'build:main').length, 1);
  assert.equal(plan[0].id, 'build:main');
  assert.deepEqual(plan.slice(1).map(s => s.id), CORE);
  assert.equal(profile('integration').steps.filter(s => s.id === 'build:main').length, 1);
  for (const name of SAFE) assert(profile('integration').steps.some(s => s.id === name), `integration must retain ${name}`);
  assert.equal(profile('fast').steps.some(s => s.id.includes('build')), false);
  // Legacy aliases without a build prefix can still import dist/main.
  for (const name of ['verify:chat-presentation', 'verify:task-queue', 'verify:hardboard']) {
    assert.equal(stepsFor([name])[0].id, 'build:main');
  }
});

test('fail closed for unsupported/unreviewed commands and invalid profiles', () => {
  assert.throws(() => legacyStep('verify:skills'), /Unreviewed/);
  assert.throws(() => legacyStep('verify:project-session-ui'), /Unreviewed/);
  assert(changedPlan(['electron/src/main/project-session.ts']).requirements.some(r => r.includes('verify:project-session-ui')));
  assert.throws(() => legacyStep('verify:explore-request', { 'verify:explore-request': 'node script.cjs && echo ok' }), /Unsupported/);
  assert.throws(() => profile('missing'), /Unknown/);
  for (const file of ['../secret', 'C:\\secret', '/etc/config', 'a/../b']) assert.throws(() => relativeFile(file));
});

test('unknown/deleted/frozen/boundary/config paths escalate instead of skipping', () => {
  for (const files of [['new/unknown.ts'], ['electron/src/preload/index.ts'], ['electron/package-lock.json'], ['electron/src/main/project-session.ts', 'runtime/src/paths.ts']]) {
    const plan = changedPlan(files);
    assert.equal(plan.level, 'INTEGRATION');
    assert(plan.steps.length > 5);
  }
  const deleted = changedPlan(['electron/src/main/explore-deleted.ts']);
  assert(deleted.modules.includes('explore'));
  assert(deleted.steps.some(s => s.id === CORE[0]));
  const frozen = changedPlan(['runtime/src/replay.ts']);
  assert.equal(frozen.level, 'INTEGRATION');
  const runtime = changedPlan(['runtime/src/mcp/server.ts']);
  assert.equal(runtime.level, 'INTEGRATION');
  assert(runtime.requirements.some(r => r.includes('Coverage gap')));
  assert(frozen.requirements.some(r => r.includes('Frozen')));
  assert(changedPlan(['electron/electron-builder.yml']).requirements.some(r => r.includes('RELEASE')));
  assert(changedPlan([]).steps.length > 0);
  assert.deepEqual(changedPlan([]).steps, profile('fast').steps);
  assert.equal(changedPlan([]).plan_only, true);
});

test('context routing keeps history UI and serial session separate', () => {
  const a = context('explore', 'history-ui'), b = context('serial', 'session');
  assert(a.source.includes('electron/src/renderer/components/explore/ExploreSessionHistory.tsx'));
  assert(!a.source.includes('electron/src/renderer/components/ExplorePanel.tsx'));
  assert(a.read_only.includes('electron/src/renderer/components/ExplorePanel.tsx'));
  assert.deepEqual(b.source, ['electron/src/main/serial-monitor-session.ts']);
  assert(!a.docs.some(d => /evidence|TEST_METRICS|LOG\.md/.test(d)));
  assert(!b.source.some(d => /ExplorePanel/.test(d)));
  assert.throws(() => context('explore', 'typo'));
});

test('task history projection routes to its offline module test without a Main build', () => {
  const selected = context('desktop-shell', 'task-history');
  assert.deepEqual(selected.tests, ['verify:task-history']);
  assert.deepEqual(route(selected.source).modules, ['desktop-shell']);
  assert.equal(stepsFor(selected.tests).some(s => s.id === 'build:main'), false);
  assert(changedPlan(selected.source).steps.some(s => s.id === 'verify:task-history'));
});

test('history UI routes to its component regression without building Main or launching a browser', () => {
  const selected = context('explore', 'history-ui');
  assert.deepEqual(selected.tests, ['verify:explore-history', 'verify:explore-ui']);
  assert.deepEqual(route([selected.source[0]]).modules, ['explore']);
  // Shared renderer styles also belong to the shell; keep this conservative routing.
  assert.deepEqual(route(selected.source).modules, ['desktop-shell', 'explore']);
  assert.equal(stepsFor(selected.tests).some(s => s.id === 'build:main'), false);
  assert.equal(SAFE.has('verify:explore-history-browser'), false);
  assert(profile('explore').steps.some(s => s.id === 'verify:explore-history'));
  const plan = changedPlan([...selected.source, 'scripts/dev/verification.cjs']);
  assert(plan.steps.some(s => s.id === 'verify:explore-history'));
  assert(plan.requirements.some(r => r.includes('verify:explore-history-browser')));
});

test('knowledge UI routes to its controlled component regression and keeps browser evidence explicit', () => {
  const selected = context('explore', 'knowledge-ui');
  assert.deepEqual(selected.tests, ['verify:explore-knowledge-preview', 'verify:explore-ui']);
  assert.deepEqual(route([selected.source[0]]).modules, ['explore']);
  assert.deepEqual(route(selected.source).modules, ['desktop-shell', 'explore']);
  assert.equal(stepsFor(selected.tests).some(step => step.id === 'build:main'), false);
  assert.equal(SAFE.has('verify:explore-knowledge-preview-browser'), false);
  assert(profile('explore').steps.some(step => step.id === 'verify:explore-knowledge-preview'));
  const plan = changedPlan([...selected.source, 'scripts/dev/verification.cjs']);
  assert(plan.steps.some(step => step.id === 'verify:explore-knowledge-preview'));
  assert(plan.requirements.some(requirement => requirement.includes('verify:explore-knowledge-preview-browser')));
});

test('changed files include staged/unstaged/rename/delete/untracked, base history and spaces', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-routing-'));
  t.after(() => {
    const actual = fs.realpathSync(root), temp = fs.realpathSync(os.tmpdir());
    const relative = path.relative(temp, actual);
    assert(relative.startsWith('catnip-routing-') && !relative.includes(path.sep), 'cleanup stays inside exact temp fixture');
    fs.rmSync(actual, { recursive: true, force: true });
  });
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  git(['init', '--quiet']);
  git(['config', 'user.email', 'test@example.invalid']); git(['config', 'user.name', 'Routing Test']);
  for (const file of ['delete.ts', 'rename.ts', 'staged.ts', 'unstaged.ts']) fs.writeFileSync(path.join(root, file), 'before');
  git(['add', '--', 'delete.ts', 'rename.ts', 'staged.ts', 'unstaged.ts']); git(['commit', '-qm', 'base']);
  const base = git(['rev-parse', 'HEAD']).trim();
  assert.deepEqual(changedFiles(undefined, root), []);
  fs.writeFileSync(path.join(root, 'committed.ts'), 'new'); git(['add', '--', 'committed.ts']); git(['commit', '-qm', 'next']);
  fs.unlinkSync(path.join(root, 'delete.ts')); fs.renameSync(path.join(root, 'rename.ts'), path.join(root, 'renamed space.ts'));
  fs.writeFileSync(path.join(root, 'staged.ts'), 'after'); git(['add', '--', 'staged.ts']);
  fs.writeFileSync(path.join(root, 'unstaged.ts'), 'after'); fs.writeFileSync(path.join(root, 'untracked space.ts'), 'new');
  assert.deepEqual(changedFiles(base, root), ['committed.ts', 'delete.ts', 'rename.ts', 'renamed space.ts', 'staged.ts', 'unstaged.ts', 'untracked space.ts']);
  assert.throws(() => changedFiles('no-such-ref', root));
});

test('runner stops on failure/timeout and reports remaining checks NOT RUN', () => {
  const steps = stepsFor(CORE);
  for (const failure of [{ status: 9 }, { status: null, error: new Error('ETIMEDOUT'), signal: 'SIGTERM' }]) {
    let calls = 0;
    const result = runSteps(steps, () => { calls++; return failure; }, () => {});
    assert.equal(calls, 1); assert.equal(result.status, 'FAIL');
    assert.equal(result.not_run.length, steps.length - 1);
  }
});

test('map validator rejects missing paths, stale aliases and missing modules', () => {
  assert.equal(checkKnowledge().status, 'PASS');
  for (const mutate of [m => m.modules.explore.code.push('missing/path.ts'), m => m.modules.explore.tests.fast.push('verify:missing'), m => m.modules.explore.depends_on.push('missing-module')]) {
    const m = projectMap(); mutate(m); assert.throws(() => checkKnowledge(m));
  }
  assert.deepEqual(route(['totally/new/path']).unknown, ['totally/new/path']);
});

test('all original npm commands remain byte-for-byte compatible', () => {
  const { manifest } = require('./project.cjs');
  // Snapshot captured from 71d63d5d; checks also work in a shallow clone.
  const before = require('./fixtures/legacy-scripts.json');
  for (const [name, command] of Object.entries(before)) assert.equal(manifest().scripts[name], command, name);
});

test('large untracked trees have bounded output without dropping verification coverage', () => {
  const plan = changedPlan(Array.from({ length: 300 }, (_, i) => `untracked/path-${i}.ts`));
  const summary = summarizePlan(plan), full = summarizePlan(plan, true);
  assert.equal(summary.level, 'INTEGRATION');
  assert.equal(summary.changed_files.length, 40);
  assert.equal(summary.unknown_count, 300);
  assert.equal(summary.unknown_omitted_from_display, 260);
  assert.equal(full.changed_files.length, 300);
  assert.deepEqual(summary.selected_verification, full.selected_verification);
  assert.equal(plan.changed_files.length, 300);
});
