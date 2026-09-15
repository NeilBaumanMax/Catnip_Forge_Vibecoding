const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/explore/ExploreAnalysisResults.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
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
const { ExploreIdeaResults, ExploreDiagnosisResults } = exportsObject;

const source = id => ({ type: 'web', title: '来源 ' + id, url: 'https://example.invalid/' + id, excerpt: '摘录 ' + id });
const idea = id => ({ id, title: '方向 ' + id, value: '价值 ' + id, implementationDirection: '实现 ' + id, compatibility: '匹配 ' + id, sources: [source(id)] });
const sourceCalls = [];
const sourceList = (sources, label) => { sourceCalls.push([sources, label]); return React.createElement('section', { 'data-source-label': label }, sources[0]?.title); };
function nodes(tree, predicate) {
  const result = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (predicate(node)) result.push(node);
    visit(node.props.children);
  }
  visit(tree);
  return result;
}
const byClass = (tree, name) => nodes(tree, node => node.props.className === name);
const byType = (tree, type) => nodes(tree, node => node.type === type);
let passed = 0;
function check(name, run) { sourceCalls.length = 0; run(); passed++; console.log('PASS ' + name); }

check('idea cards preserve order, numbering, selection/dimming, facts and source composition', () => {
  const result = { schemaVersion: 1, requestId: 'request-1', mode: 'idea', ideas: [idea('a'), idea('b'), idea('c')] };
  const tree = ExploreIdeaResults({ result, selectedIdeaId: 'b', planPending: false, sourceList, onBeginPlan: async () => {} });
  assert.deepEqual(nodes(tree, node => typeof node.props.className === 'string' && node.props.className.startsWith('explore-idea-option')).map(node => node.key), ['a', 'b', 'c']);
  assert.deepEqual(byClass(tree, 'explore-idea-number').map(node => node.props.children), ['01', '02', '03']);
  assert.equal(byClass(tree, 'explore-idea-option is-selected').length, 1);
  assert.equal(byClass(tree, 'explore-idea-option is-dimmed').length, 2);
  assert.deepEqual(sourceCalls.map(call => call[1]), ['依据来源', '依据来源', '依据来源']);
  const html = renderToStaticMarkup(tree);
  for (const text of ['方向 a', '价值 a', '实现 a', '匹配 a', '当前选择', '3 个候选 · 选择后只生成计划']) assert(html.includes(text));
});

check('idea plan buttons preserve selected object and pending labels', () => {
  const result = { schemaVersion: 1, requestId: 'request-1', mode: 'idea', ideas: [idea('a'), idea('b')] };
  const calls = [], tree = ExploreIdeaResults({ result, selectedIdeaId: 'b', planPending: true, sourceList, onBeginPlan: async selected => calls.push(selected) });
  const buttons = byClass(tree, 'explore-generate-plan');
  assert(buttons.every(button => button.props.disabled === true));
  assert.equal(buttons[0].props.children, '用这个方向生成计划');
  assert.equal(buttons[1].props.children, '正在生成计划…');
  buttons[1].props.onClick();
  assert.strictEqual(calls[0], result.ideas[1]);
});

check('diagnosis preserves conflicts, evidence/empty fallback and both source groups', () => {
  const hypothesis = (id, evidence) => ({ id, statement: '假设 ' + id, priorityReason: '理由 ' + id, projectEvidence: evidence, communitySources: [source('community-' + id)], externalSources: [source('external-' + id)], nextValidation: '验证 ' + id });
  const result = { schemaVersion: 1, requestId: 'request-2', mode: 'diagnosis', diagnosis: { problem: '设备不工作', sourceConflicts: ['资料A与资料B冲突'], hypotheses: [hypothesis('a', ['串口错误']), hypothesis('b', [])] } };
  const tree = ExploreDiagnosisResults({ result, planPending: false, sourceList, onBeginPlan: async () => {} });
  assert.deepEqual(byClass(tree, 'explore-hypothesis').map(node => node.key), ['a', 'b']);
  assert.deepEqual(byClass(tree, 'explore-hypothesis-index').map(node => node.props.children), ['01', '02']);
  assert.deepEqual(sourceCalls.map(call => call[1]), ['社区经验', '外部资料', '社区经验', '外部资料']);
  const html = renderToStaticMarkup(tree);
  for (const text of ['设备不工作', '资料A与资料B冲突', '串口错误', '当前结果没有引用可确认的工程证据', '下一步验证', '验证 b']) assert(html.includes(text));
});

check('diagnosis plan preserves no-argument callback and pending state', () => {
  const result = { schemaVersion: 1, requestId: 'request-2', mode: 'diagnosis', diagnosis: { problem: '问题', sourceConflicts: [], hypotheses: [] } };
  const calls = [], ready = ExploreDiagnosisResults({ result, planPending: false, sourceList, onBeginPlan: async (...args) => calls.push(args) });
  const readyButton = byClass(ready, 'explore-generate-plan')[0];
  assert.equal(readyButton.props.children, '为这份调查生成计划'); readyButton.props.onClick();
  assert.deepEqual(calls, [[]]);
  const pending = ExploreDiagnosisResults({ result, planPending: true, sourceList, onBeginPlan: async () => {} });
  const pendingButton = byClass(pending, 'explore-generate-plan')[0];
  assert.equal(pendingButton.props.disabled, true); assert.equal(pendingButton.props.children, '正在生成计划…');
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/ExplorePanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  function statements(source) {
    const ast = ts.createSourceFile(parentPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = {};
    function visit(node) {
      if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) {
        const name = declaration.name.getText(ast);
        if (name === 'ideaResults' || name === 'diagnosisResults') found[name] = node.getText(ast);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast); return found;
  }
  const original = statements(before), current = statements(after);
  assert(original.ideaResults && original.diagnosisResults && current.ideaResults && current.diagnosisResults);
  const restored = after
    .replace(current.ideaResults, original.ideaResults)
    .replace(current.diagnosisResults, original.diagnosisResults)
    .replace("import { ExploreDiagnosisResults, ExploreIdeaResults } from './explore/ExploreAnalysisResults';\n", '');
  assert.equal(restored, before, 'parent must change only result declarations and import');
  for (const expected of ['result={analysisResult}', 'selectedIdeaId={selectedIdeaId}', 'planPending={planPending}', 'sourceList={sourceList}', 'onBeginPlan={beginPlan}']) assert(after.includes(expected));
  console.log('PASS parent source is identical after reversing both result declarations/import; props remain direct');
}

console.log('Explore analysis results passed: ' + passed + ' cases; strict component types; no Main build');
