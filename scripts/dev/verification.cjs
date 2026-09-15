const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { ROOT, manifest, projectMap, route } = require('./project.cjs');

// Explicitly reviewed offline tests only. Legacy commands remain untouched.
const SAFE = new Set([
  'verify:version', 'verify:explore-ui', 'verify:explore-entry',
  'verify:chat-presentation', 'verify:zhihu-skill-package', 'verify:onboarding',
  'verify:explore-request', 'verify:explore-analysis-gate', 'verify:explore-search-handoff',
  'verify:explore-session', 'verify:explore-knowledge', 'verify:explore-context',
  'verify:explore-zhihu-connection', 'verify:project-session', 'verify:data-paths',
  'verify:serial-monitor', 'verify:task-queue', 'verify:qwen-attachments', 'verify:hardboard',
  'verify:task-history', 'verify:explore-history', 'verify:explore-knowledge-preview', 'verify:explore-analysis-results', 'verify:explore-plan-view', 'verify:explore-connection-status', 'verify:explore-output-empty-state',
]);
const CORE = ['verify:explore-request', 'verify:explore-analysis-gate', 'verify:explore-search-handoff'];
const FAST_TESTS = ['verify:version', 'verify:explore-ui'];
const GROUPS = {
  'explore-core': CORE,
  explore: [...CORE, 'verify:explore-session', 'verify:explore-knowledge', 'verify:explore-context', 'verify:explore-zhihu-connection', 'verify:explore-ui', 'verify:explore-entry', 'verify:explore-history', 'verify:explore-knowledge-preview', 'verify:explore-analysis-results', 'verify:explore-plan-view', 'verify:explore-connection-status', 'verify:explore-output-empty-state'],
  project: ['verify:project-session', 'verify:data-paths'],
  serial: ['verify:serial-monitor'],
  skills: ['verify:zhihu-skill-package', 'verify:explore-zhihu-connection'],
  task: ['verify:task-queue', ...CORE],
  attachments: ['verify:qwen-attachments'],
  chat: ['verify:chat-presentation'],
};
const make = (id, args, cwd = 'electron') => ({ id, executable: 'node', args, cwd });
const MAIN = make('build:main', ['node_modules/typescript/lib/tsc.js']);
const TYPECHECKS = [make('electron:typecheck', ['node_modules/typescript/lib/tsc.js', '--noEmit']), make('runtime:typecheck', ['node_modules/typescript/lib/tsc.js', '--noEmit'], 'runtime')];
const DEV_CHECKS = [
  make('check:knowledge', ['scripts/dev/check-knowledge.cjs'], '.'),
  make('check:architecture', ['scripts/dev/check-architecture.cjs'], '.'),
  make('check:maintainability', ['scripts/dev/check-maintainability.cjs'], '.'),
  make('test:dev-tools', ['--test', 'scripts/dev/verification.test.cjs', 'scripts/dev/guardrails.test.cjs'], '.'),
];

function legacyStep(name, scripts = manifest().scripts) {
  if (!SAFE.has(name)) throw new Error(`Unreviewed or environment-dependent test: ${name}`);
  let cmd = scripts[name];
  if (typeof cmd !== 'string') throw new Error(`Missing legacy script: ${name}`);
  const prefix = 'npm run build:main && ';
  const needsMain = cmd.startsWith(prefix) || ['verify:task-queue', 'verify:hardboard', 'verify:chat-presentation'].includes(name);
  if (cmd.startsWith(prefix)) cmd = cmd.slice(prefix.length);
  // Fail closed if a legacy entry changes to a compound command; do not silently strip it.
  if (!/^node (?:node_modules\/electron\/cli\.js )?scripts\/[\w-]+\.cjs$/.test(cmd)) throw new Error(`Unsupported legacy command for ${name}: ${cmd}`);
  return { ...make(name, cmd.slice(5).split(' ')), needsMain };
}

function stepsFor(names, { fast = false } = {}) {
  const tests = [...new Set(names)].map(name => legacyStep(name));
  return [...(fast ? [...TYPECHECKS, ...DEV_CHECKS] : []), ...(tests.some(t => t.needsMain) ? [MAIN] : []), ...tests];
}

function profile(name) {
  const fast = FAST_TESTS;
  if (name === 'fast') return { level: 'FAST', steps: stepsFor(fast, { fast: true }), requirements: [] };
  if (name === 'integration') return { level: 'INTEGRATION', steps: stepsFor([...fast, ...Object.values(GROUPS).flat(), ...SAFE], { fast: true }), requirements: ['Real UI geometry, deployment, network and hardware are separate evidence; offline integration is not release acceptance.'] };
  if (!GROUPS[name]) throw new Error(`Unknown verification profile: ${name}`);
  return { level: 'MODULE', steps: stepsFor(GROUPS[name]), requirements: name === 'skills' ? ['verify:skills performs real deployment; run only in an explicitly prepared isolated environment.'] : [] };
}

function changedPlan(files, map = projectMap()) {
  const routed = route(files, map);
  const reasons = [], requirements = [];
  const layers = new Set(files.map(f => f.startsWith('electron/src/renderer/') ? 'renderer' : f.startsWith('electron/src/main/') ? 'main' : f.startsWith('runtime/') ? 'runtime' : null).filter(Boolean));
  const boundary = files.some(f => /^(electron\/src\/(common|preload|renderer\/types)\/|electron\/src\/main\/gateway\.ts)/.test(f));
  const infra = files.some(f => /^(scripts\/dev\/|\.vibecoding\/)|(^|\/)(package(-lock)?\.json|tsconfig[^/]*\.json)$/.test(f));
  const coverageGaps = routed.modules.filter(id => !map.modules[id].tests.module.some(t => SAFE.has(t)));
  const productChange = files.some(f => /^(electron|runtime)\/src\//.test(f));
  const integration = routed.unknown.length > 0 || layers.size > 1 || boundary || infra || routed.modules.length > 2 || (productChange && coverageGaps.length > 0);
  if (routed.unknown.length) reasons.push('Unknown paths: escalate to offline INTEGRATION; inspect coverage before accepting.');
  if (layers.size > 1 || boundary) reasons.push('Cross-layer or public interface change.');
  if (infra) reasons.push('Verification/build configuration changed.');
  if (productChange && coverageGaps.length) {
    reasons.push(`No reviewed module regression for ${coverageGaps.join(', ')}: escalate to INTEGRATION.`);
    requirements.push('Coverage gap remains: add targeted verification or explicitly review existing environment tests; broader offline PASS does not prove this behavior.');
  }
  if (routed.modules.length > 2) reasons.push('More than two modules: reassess task/change budget.');
  if (!files.length) reasons.push('No changes: retain FAST checks; not an empty success.');
  const release = routed.modules.includes('packaging-release') || files.some(f => /package(-lock)?\.json$/.test(f)) || routed.modules.includes('hardboard');
  if (release) requirements.push('RELEASE review required: production builds/package/first-run or hardware tests as applicable; never auto-run external effects.');
  const exploreVisual = routed.modules.includes('explore') && files.some(f => /^electron\/src\/renderer\/(styles\/|assets\/)/.test(f));
  if (exploreVisual) requirements.push('NOT RUN automatically: verify:explore-layout-ui; Explore style or image changes require isolated geometry evidence.');
  const names = [], frozen = [];
  for (const id of routed.modules) {
    const m = map.modules[id];
    if (m.status.frozen) frozen.push(id);
    for (const name of [...m.tests.fast, ...m.tests.module, ...(integration ? m.tests.integration : [])]) {
      if (DEV_CHECKS.some(step => step.id === name)) continue; // Already included in every changed plan.
      if (SAFE.has(name)) names.push(name);
      else requirements.push(`NOT RUN automatically: ${name}; inspect isolation/environment before invoking legacy command.`);
    }
  }
  if (frozen.length) requirements.push(`Frozen module changed: explicit scope review and targeted manual validation (${frozen.join(', ')}).`);
  const plan = integration ? profile('integration') : { level: names.length ? 'MODULE' : 'FAST', steps: stepsFor([...FAST_TESTS, ...names], { fast: true }), requirements: [] };
  return { plan_only: true, changed_files: files, ...routed, reasons, ...plan, requirements: [...new Set([...plan.requirements, ...requirements])] };
}

function summarizePlan(plan, full = false) {
  const { steps, ...summary } = plan;
  let truncated = false;
  for (const key of ['changed_files', 'unknown']) {
    if (!Array.isArray(summary[key])) continue;
    summary[`${key}_count`] = summary[key].length;
    if (!full && summary[key].length > 40) {
      summary[`${key}_omitted_from_display`] = summary[key].length - 40;
      summary[key] = summary[key].slice(0, 40);
      truncated = true;
    }
  }
  return { ...summary, selected_verification: steps.map(s => s.id), required_builds: steps.filter(s => s.id.startsWith('build:')).map(s => s.id), ...(truncated ? { display_note: 'All paths were routed; only display is limited to 40 entries per list. Use --full for the complete plan.' } : {}) };
}

function runSteps(steps, spawn = spawnSync, log = console.log) {
  const started = performance.now(), results = [];
  for (const step of steps) {
    log(`[verify] ${step.id}: node ${step.args.join(' ')} (cwd=${step.cwd})`);
    const at = performance.now();
    const result = spawn(process.execPath, step.args, { cwd: path.resolve(ROOT, step.cwd), stdio: 'inherit', windowsHide: true, timeout: 120_000 });
    const status = result.error || result.signal || result.status !== 0 ? 'FAIL' : 'PASS';
    results.push({ id: step.id, status, seconds: Number(((performance.now() - at) / 1000).toFixed(3)), exit: result.status, ...(result.error ? { error: result.error.message } : {}), ...(result.signal ? { signal: result.signal } : {}) });
    if (status === 'FAIL') break;
  }
  return { status: results.length === steps.length && results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL', seconds: Number(((performance.now() - started) / 1000).toFixed(3)), results, not_run: steps.slice(results.length).map(s => s.id) };
}
module.exports = { SAFE, GROUPS, CORE, MAIN, legacyStep, stepsFor, profile, changedPlan, summarizePlan, runSteps };
