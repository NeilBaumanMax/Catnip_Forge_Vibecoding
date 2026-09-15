const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile only this pure Renderer module and typecheck its directly imported types.
// No emitted dist, Electron process, installed app or network is required.
const sourcePath = path.resolve(__dirname, '../src/renderer/components/task-manager/task-history.ts');
const code = fs.readFileSync(sourcePath, 'utf8');
const program = ts.createProgram([sourcePath], {
  strict: true, noEmit: true, skipLibCheck: true, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
const projection = {};
new Function('exports', compiled.outputText)(projection);
const { mergeRuntimeEventWindow, taskHistoryFromEvents } = projection;
const event = (id, time, seq, extra = {}) => ({ id, time, seq, source: 'test', kind: 'task.updated', ...extra });
const snapshot = (id, time, task, extra = {}) => event(id, time, time, { payload: { task }, ...extra });
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
};
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('event windows replace duplicate IDs, sort by time then sequence, and preserve input', () => {
  const first = event('same', 10, 10), replacement = event('same', 20, 2, { message: 'new' });
  const current = freeze([event('later', 30, 1), first]);
  const incoming = freeze([event('tie', 20, 1), replacement]);
  const actual = mergeRuntimeEventWindow(current, incoming);
  assert.deepEqual(actual.map(e => e.id), ['tie', 'same', 'later']);
  assert.strictEqual(actual[1], replacement);
  assert.deepEqual(current.map(e => e.id), ['later', 'same']);
  assert.deepEqual(incoming.map(e => e.id), ['tie', 'same']);
  assert.deepEqual(mergeRuntimeEventWindow([], []), []);
});

check('event retention keeps the latest 500 after deduplication and accepts regressed sequences', () => {
  const input = freeze(Array.from({ length: 510 }, (_, i) => event(String(i), i, 1000 - i)));
  const result = mergeRuntimeEventWindow(input, [event('509', 600, 1)]);
  assert.equal(result.length, 500);
  assert.equal(result[0].id, '10');
  assert.equal(result.at(-1).time, 600);
  assert.equal(result.at(-1).seq, 1);
  assert.equal(input.length, 510);
});

check('task projection ignores unsupported/missing payloads and requires a task ID', () => {
  const input = [event('none', 1, 1), event('null', 2, 2, { payload: { task: null } }),
    snapshot('primitive', 3, 'bad'), snapshot('array', 4, []),
    snapshot('other', 5, { kind: 'serial.capture', taskId: 'skip' }),
    snapshot('missing-id', 6, { kind: 'hardboard.build' })];
  assert.deepEqual(taskHistoryFromEvents(freeze(input)), []);
});

check('task fields normalize statuses and fall back only when their types do not match', () => {
  const input = freeze([
    snapshot('fallback', 123, { kind: 'hardboard.build', taskId: 7, status: 'future', projectDir: null, port: 42, startedAt: '3', endedAt: '4', exitCode: '0' }, { taskId: 'outer', projectDir: 'project-a' }),
    snapshot('empty-id', 456, { kind: 'hardboard.flash', taskId: '' }, { taskId: 'not-a-fallback' }),
  ]);
  assert.deepEqual(taskHistoryFromEvents(input), [{ taskId: 'outer', kind: 'hardboard.build', status: 'pending', projectDir: 'project-a', port: '', startedAt: 123, endedAt: null, exitCode: null }]);
  for (const status of ['running', 'completed', 'failed', 'cancelled', 'pending']) {
    const [item] = taskHistoryFromEvents([snapshot('valid', 10, { kind: 'hardboard.flash', taskId: 'inner', status, projectDir: '', port: 'COM7', startedAt: 0, endedAt: 0, exitCode: 0 }, { taskId: 'outer', projectDir: 'ignored' })]);
    assert.deepEqual(item, { taskId: 'inner', kind: 'hardboard.flash', status, projectDir: '', port: 'COM7', startedAt: 0, endedAt: 0, exitCode: 0 });
  }
});

check('last encountered task snapshot wins; completion/start ordering and stable ties are preserved', () => {
  const input = freeze([
    snapshot('newer', 1000, { kind: 'hardboard.build', taskId: 'same', status: 'completed', startedAt: 10, endedAt: 1000 }),
    snapshot('second', 200, { kind: 'hardboard.flash', taskId: 'second', status: 'failed', startedAt: 20, endedAt: 200 }),
    snapshot('tie', 200, { kind: 'hardboard.build', taskId: 'tie', startedAt: 200 }),
    snapshot('older-but-last', 100, { kind: 'hardboard.build', taskId: 'same', status: 'running', startedAt: 100 }),
  ]);
  const result = taskHistoryFromEvents(input);
  assert.deepEqual(result.map(t => t.taskId), ['second', 'tie', 'same']);
  assert.equal(result[2].status, 'running');
  assert.equal(result[2].endedAt, null);
  assert.deepEqual(taskHistoryFromEvents([]), []);
});

console.log('task history characterization passed: ' + passed + ' cases; no Main build or external effects');
