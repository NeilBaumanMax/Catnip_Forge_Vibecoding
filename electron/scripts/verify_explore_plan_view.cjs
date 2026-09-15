const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/explore/ExplorePlanView.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
assert.doesNotMatch(code, /electronAPI|confirmExecution|writeWorkbench|openWorkbench/, 'read-only plan view must not own I/O or execution confirmation');
const options = {
  strict: true, noEmit: true, skipLibCheck: true, types: [], esModuleInterop: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.React,
};
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([sourcePath], options));
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const compiled = ts.transpileModule(code, { compilerOptions: options });
const exportsObject = {};
new Function('require', 'exports', compiled.outputText)(require, exportsObject);
const PlanView = exportsObject.default;

const planResult = risks => ({ schemaVersion: 1, requestId: 'plan-1', mode: 'plan', plan: {
  summary: '分阶段完成修改',
  steps: [{ id: 'one', title: '检查工程', detail: '确认配置' }, { id: 'two', title: '实施修改', detail: '运行验证' }],
  risks,
} });
const artifact = { sessionId: 's1', relativeDir: '.catnip/handoffs/s1', handoffMarkdown: '# Handoff', planMarkdown: '# Plan', digest: 'digest', updatedAt: '2026-09-15T00:00:00Z' };
const base = { planPending: false, planResult: planResult(['需要实机']), planHandoff: null, requestText: '原始请求', handoffArtifact: null, onViewHandoff: async () => {} };
function nodes(tree, predicate) {
  const result = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (predicate(node)) result.push(node);
    visit(node.props.children);
  }
  visit(tree); return result;
}
const byClass = (tree, name) => nodes(tree, node => node.props.className === name);
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('selection title keeps idea, diagnosis and request fallback order', () => {
  const handoff = { selectedIdea: { title: '灵感标题' }, diagnosis: { problem: '诊断问题' } };
  const ideaHtml = renderToStaticMarkup(PlanView({ ...base, planHandoff: handoff }));
  const diagnosisHtml = renderToStaticMarkup(PlanView({ ...base, planHandoff: { diagnosis: { problem: '诊断问题' } } }));
  const requestHtml = renderToStaticMarkup(PlanView(base));
  assert(ideaHtml.includes('灵感标题') && !ideaHtml.includes('诊断问题'));
  assert(diagnosisHtml.includes('诊断问题'));
  assert(requestHtml.includes('原始请求'));
});

check('pending branch retains read-only safety copy and progress ordering', () => {
  const tree = PlanView({ ...base, planPending: true, planResult: null });
  const html = renderToStaticMarkup(tree);
  assert.equal(byClass(tree, 'explore-plan-progress').length, 1);
  assert.equal(byClass(tree, 'explore-plan-steps').length, 0);
  for (const text of ['确认前只读', '只生成计划，不会修改工程或操作硬件', '整理目标', '核对约束', '生成计划']) assert(html.includes(text));
});

check('completed plan preserves step/risk order and blocks missing artifact', () => {
  let calls = 0;
  const tree = PlanView({ ...base, onViewHandoff: async () => { calls++; } });
  assert.deepEqual(byClass(tree, 'explore-plan-steps')[0].props.children.map(item => item.key), ['one', 'two']);
  const html = renderToStaticMarkup(tree);
  for (const text of ['01', '检查工程', '确认配置', '02', '实施修改', '运行验证', '风险与注意事项', '需要实机', '计划完成后会在当前工程中生成分层交接材料']) assert(html.includes(text));
  const button = byClass(tree, 'explore-confirm-action')[0];
  assert.equal(button.props.disabled, true); button.props.onClick(); assert.equal(calls, 1, 'callback wiring remains present even though disabled DOM prevents user activation');
});

check('artifact enables view callback and empty risks render no risk section', () => {
  let calls = 0;
  const tree = PlanView({ ...base, planResult: planResult([]), handoffArtifact: artifact, onViewHandoff: async () => { calls++; } });
  const button = byClass(tree, 'explore-confirm-action')[0];
  assert.equal(button.props.disabled, false); button.props.onClick(); assert.equal(calls, 1);
  const html = renderToStaticMarkup(tree);
  assert(html.includes('已写入 .catnip/handoffs/s1'));
  assert(!html.includes('风险与注意事项'));
  assert(html.includes('这里只生成和保存材料，不会修改业务源码或操作硬件'));
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/ExplorePanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  function statement(source) {
    const ast = ts.createSourceFile(parentPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let found;
    function visit(node) {
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === 'planView')) found = node.getText(ast);
      ts.forEachChild(node, visit);
    }
    visit(ast); return found;
  }
  const original = statement(before), current = statement(after);
  assert(original && current);
  const restored = after.replace(current, original).replace("import ExplorePlanView from './explore/ExplorePlanView';\n", '');
  assert.equal(restored, before, 'parent must change only planView and import');
  for (const expected of ['planPending={planPending}', 'planResult={planResult}', 'planHandoff={planHandoff}', 'requestText={requestText}', 'handoffArtifact={handoffArtifact}', "onViewHandoff={() => selectStage('execute')}"]) assert(after.includes(expected));
  console.log('PASS parent source is identical after reversing planView/import; stage callback remains explicit');
}

console.log('Explore plan view passed: ' + passed + ' cases; strict component types; no Main build');
