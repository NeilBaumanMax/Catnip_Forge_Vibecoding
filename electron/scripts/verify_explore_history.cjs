const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Optional source is used to characterize the original JSX before extraction.
// No Main build, browser, IPC, network or user data is needed for this test.
const sourcePath = path.resolve(process.argv[2] || path.join(__dirname, '../src/renderer/components/explore/ExploreSessionHistory.tsx'));
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
const History = exportsObject.default;
const statuses = ['draft', 'analyzing', 'result_ready', 'planning', 'awaiting_confirmation', 'execution_queued', 'interrupted', 'error'];
const sessions = Object.freeze(Array.from({ length: 14 }, (_, i) => Object.freeze({
  id: 'session-' + i, projectId: 'project-a', mode: i % 2 ? 'diagnosis' : 'idea',
  title: i === 0 ? '<记录 & 标题>' : '记录 ' + i, status: statuses[i % statuses.length],
  createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T01:02:03Z',
})));
function fixture(extra = {}) {
  const calls = [];
  const capture = name => (...args) => { calls.push([name, ...args]); };
  return { calls, props: {
    workSessions: sessions, renamingSessionId: '', renameDraft: '', renameSaving: false,
    workStatusLabel: status => 'status:' + status,
    openWorkSession: capture('open'), deleteWorkSession: capture('delete'), renameWorkSession: capture('rename'),
    setRenamingSessionId: capture('renameId'), setRenameDraft: capture('draft'), ...extra,
  } };
}
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
const byClass = (tree, className) => nodes(tree, n => n.props.className === className);
const byType = (tree, type) => nodes(tree, n => n.type === type);
const snapshots = {};
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('empty state retains both explicit new-session actions', () => {
  const { props, calls } = fixture({ workSessions: [] });
  const tree = History(props);
  assert.equal(byType(tree, 'li').length, 0);
  assert.equal(byClass(tree, 'explore-history-empty').length, 1);
  byType(tree, 'button').forEach(n => n.props.onClick());
  assert.deepEqual(calls, [['open', 'idea', undefined, true], ['open', 'diagnosis', undefined, true]]);
  snapshots.empty = renderToStaticMarkup(tree);
});

check('history preserves supplied order, 12-row cap, modes, status/date and escaped titles', () => {
  const { props, calls } = fixture();
  const tree = History(props);
  assert.deepEqual(byType(tree, 'li').map(n => n.key), sessions.slice(0, 12).map(s => s.id));
  const opens = byClass(tree, 'explore-session-open');
  assert.deepEqual(opens.map(n => n.props['data-explore-session-id']), sessions.slice(0, 12).map(s => s.id));
  for (const i of [0, 1]) opens[i].props.onClick();
  assert.deepEqual(calls, [['open', 'idea', 'session-0'], ['open', 'diagnosis', 'session-1']]);
  const html = renderToStaticMarkup(tree);
  assert(html.includes('&lt;记录 &amp; 标题&gt;'));
  for (const status of statuses) assert(html.includes('status:' + status));
  assert(html.includes(new Date(sessions[0].updatedAt).toLocaleString()));
  assert(html.includes('is-idea') && html.includes('is-diagnosis'));
  snapshots.history = html;
});

check('rename/delete target the original session and preserve accessible labels', () => {
  const { props, calls } = fixture();
  const tree = History(props), session = sessions[1];
  const rename = byClass(tree, 'explore-session-rename-action')[1];
  const remove = byClass(tree, 'explore-session-delete')[1];
  assert.equal(rename.props['aria-label'], '重命名探索记录：' + session.title);
  assert.equal(remove.props['aria-label'], '删除探索记录：' + session.title);
  rename.props.onClick(); remove.props.onClick();
  assert.deepEqual(calls, [['renameId', session.id], ['draft', session.title], ['delete', session]]);
  assert.strictEqual(calls.at(-1)[1], session);
});

check('controlled rename forwards input/event/session and cancel clears parent fields', () => {
  const { props, calls } = fixture({ renamingSessionId: 'session-1', renameDraft: '新的名称' });
  const tree = History(props), [form] = byType(tree, 'form'), [input] = byType(form, 'input');
  assert.equal(byClass(tree, 'explore-session-open').length, 11);
  assert.equal(input.props.value, '新的名称');
  assert.equal(input.props.maxLength, 80); assert.equal(input.props.autoFocus, true);
  assert.equal(byType(form, 'label')[0].props.htmlFor, input.props.id);
  input.props.onChange({ target: { value: '修改后' } });
  const event = { preventDefault() {} };
  form.props.onSubmit(event);
  byType(form, 'button')[1].props.onClick();
  assert.deepEqual(calls, [['draft', '修改后'], ['rename', event, sessions[1]], ['renameId', ''], ['draft', '']]);
  assert.strictEqual(calls[1][1], event);
  assert.strictEqual(calls[1][2], sessions[1]);
  assert.equal(input.props.value, '新的名称', 'child must not own a second draft state');
  snapshots.rename = renderToStaticMarkup(tree);
});

check('saving disables save/cancel and a parent rerender supplies the next state', () => {
  const { props } = fixture({ renamingSessionId: 'session-1', renameSaving: true });
  const tree = History(props);
  assert(byType(byType(tree, 'form')[0], 'button').every(n => n.props.disabled === true));
  snapshots.saving = renderToStaticMarkup(tree);
  const next = History({ ...props, renamingSessionId: '', renameSaving: false, workSessions: [] });
  assert.equal(byType(next, 'form').length, 0);
  assert.equal(byClass(next, 'explore-history-empty').length, 1);
});

if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), JSON.stringify(snapshots, null, 2) + '\n');
console.log('Explore history passed: ' + passed + ' cases; strict component types; no Main build');
