const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/task-manager/TaskHistoryPanel.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
assert.doesNotMatch(code, /electronAPI|useState|useEffect|runtimeEvents|clearRuntimeHistory|openExploreDiagnosis/, 'task history view must not own events, cleanup or analysis orchestration');
const options = {
  strict: true, noEmit: true, skipLibCheck: true, types: [], esModuleInterop: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.React,
};
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([sourcePath, path.join(root, 'node_modules/vite/client.d.ts')], options));
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const compiled = ts.transpileModule(code, { compilerOptions: options });
const exportsObject = {};
const localRequire = request => request.endsWith('.png') ? request : require(request);
new Function('require', 'exports', compiled.outputText)(localRequire, exportsObject);
const TaskHistoryPanel = exportsObject.default;

const calls = { clear: 0, show: [], analyze: [] };
const base = {
  tasks: [], clearing: false, clearFeedback: '',
  statusLabel: status => `status:${status}`,
  projectLabel: project => `project:${project}`,
  durationLabel: task => `duration:${task.taskId}`,
  onClear: () => { calls.clear++; },
  onShowLog: task => { calls.show.push(task.taskId); },
  onAnalyzeFailure: task => { calls.analyze.push(task.taskId); },
};
const task = (taskId, status, kind = 'hardboard.build') => ({ taskId, status, kind, projectDir: `C:/projects/${taskId}`, port: '', startedAt: 1_700_000_000_000, endedAt: 1_700_000_001_000, exitCode: status === 'failed' ? 1 : 0 });
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
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('empty history preserves illustration, guidance and three steps', () => {
  const html = renderToStaticMarkup(TaskHistoryPanel(base));
  assert(html.includes('task-manager-empty-guagua-v2.png'));
  for (const text of ['暂无编译或烧录记录', '选择工程并执行 Build / Flash', '1 选择工程', '2 配置与编译', '3 选择串口并烧录']) assert(html.includes(text));
});

check('rows preserve order, labels, operation and fallback fields', () => {
  const tasks = [task('build-1', 'completed'), task('flash-1', 'running', 'hardboard.flash')];
  const html = renderToStaticMarkup(TaskHistoryPanel({ ...base, tasks }));
  assert(html.indexOf('build-1') < html.indexOf('flash-1'));
  for (const text of ['status:completed', 'status:running', 'Build', 'Flash', 'project:C:/projects/build-1', 'duration:flash-1', '—']) assert(html.includes(text));
});

check('only failed rows expose analysis and callbacks keep original tasks', () => {
  const tasks = [task('failed-1', 'failed'), task('ok-1', 'completed')];
  const tree = TaskHistoryPanel({ ...base, tasks });
  const analyzeButtons = nodes(tree, node => node.type === 'button' && node.props.children === '分析');
  const viewButtons = nodes(tree, node => node.type === 'button' && node.props.children === '查看');
  assert.equal(analyzeButtons.length, 1); assert.equal(viewButtons.length, 2);
  analyzeButtons[0].props.onClick(); viewButtons[1].props.onClick();
  assert.deepEqual(calls.analyze, ['failed-1']); assert.deepEqual(calls.show, ['ok-1']);
});

check('clear feedback and pending state preserve callback wiring', () => {
  const tree = TaskHistoryPanel({ ...base, clearing: true, clearFeedback: '已清除记录' });
  const clear = nodes(tree, node => node.type === 'button' && node.props.className?.includes('clear-history-button'))[0];
  const html = renderToStaticMarkup(tree);
  assert(clear.props.disabled); assert(html.includes('正在清除本地记录…') && html.includes('清除中...'));
  clear.props.onClick(); assert.equal(calls.clear, 1);
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/BrowserPanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/BrowserPanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  const end = '          </div>\n          <div className={`runtime-message';
  function block(source, marker) {
    const from = source.indexOf(marker); const to = source.indexOf(end, from);
    assert(from >= 0 && to > from); return source.slice(from, to);
  }
  const original = block(before, '            <section className="task-history-panel');
  const beforePrefixEnd = before.indexOf('interface Props');
  const afterPrefixEnd = after.indexOf('interface Props');
  let restored = before.slice(0, beforePrefixEnd) + after.slice(afterPrefixEnd);
  restored = restored.replace(block(restored, '            <TaskHistoryPanel'), original);
  assert.equal(restored, before, 'parent must change only task history view/import resources');
  for (const expected of ['tasks={taskHistory}', 'onClear={clearTaskHistory}', 'onShowLog={showTaskLog}', 'onAnalyzeFailure={analyzeFailedTask}']) assert(after.includes(expected));
  console.log('PASS parent source is identical after restoring task history/import resources; behavior callbacks remain parent-owned');
}

console.log('Task history panel passed: ' + passed + ' cases; strict component types; no Main build');
