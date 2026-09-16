const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/task-manager/TaskControlsPanel.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
assert.doesNotMatch(code, /electronAPI|useState|useEffect|buildHardboard|flashHardboard|setSelectedDevicePort|setSerialPort/, 'task controls must not own IPC, state or execution authority');
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
const TaskControlsPanel = exportsObject.default;

const calls = { refreshProjects: 0, selectProject: 0, build: 0, refreshDevices: 0, ports: [], flash: 0 };
const runtime = (phase, status, progress) => ({
  generatedAt: 0, lastSeq: 0, lastHeartbeatAt: null, activeTaskId: null, activeToolName: null,
  activeProjectDir: null, activePid: null, phase, status, progress, currentFile: null,
  currentPort: null, files: [], recent: [], lastError: null,
});
const base = {
  buildLabel: 'Catnip Forge · test', runtimeState: null, activeProjectName: null,
  hasSelectedProject: false, devices: [], selectedPort: '',
  onRefreshProjects: () => { calls.refreshProjects++; },
  onSelectProject: () => { calls.selectProject++; },
  onBuild: () => { calls.build++; },
  onRefreshDevices: () => { calls.refreshDevices++; },
  onSelectPort: port => { calls.ports.push(port); },
  onFlash: () => { calls.flash++; },
};
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
const button = (tree, label) => nodes(tree, node => node.type === 'button' && node.props.children === label)[0];
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('missing project keeps both actions gated and preserves guidance', () => {
  const tree = TaskControlsPanel(base);
  const html = renderToStaticMarkup(tree);
  assert(button(tree, '编译').props.disabled); assert(button(tree, '烧录').props.disabled);
  assert(html.includes('选择工作工程')); assert.equal((html.match(/请先选择工作工程/g) || []).length, 2);
});

check('selected project enables Build while missing port still gates Flash', () => {
  const tree = TaskControlsPanel({ ...base, activeProjectName: 'demo', hasSelectedProject: true });
  const html = renderToStaticMarkup(tree);
  assert.equal(button(tree, '编译').props.disabled, false); assert(button(tree, '烧录').props.disabled);
  assert(html.includes('等待编译')); assert(html.includes('请选择串口'));
});

check('running phase preserves status and clamps progress presentation', () => {
  const buildHtml = renderToStaticMarkup(TaskControlsPanel({ ...base, activeProjectName: 'demo', hasSelectedProject: true, selectedPort: 'COM7', runtimeState: runtime('build', 'running', 140) }));
  assert(buildHtml.includes('running · 140%')); assert(buildHtml.includes('width:100%'));
  const flashHtml = renderToStaticMarkup(TaskControlsPanel({ ...base, activeProjectName: 'demo', hasSelectedProject: true, selectedPort: 'COM7', runtimeState: runtime('flash', 'running', -5) }));
  assert(flashHtml.includes('running · -5%')); assert(flashHtml.includes('width:0%'));
});

check('devices and callbacks preserve parent-owned actions and selected values', () => {
  const tree = TaskControlsPanel({ ...base, activeProjectName: 'demo', hasSelectedProject: true, selectedPort: 'COM7', devices: [{ port: 'COM7', label: 'ESP32-S3', source: 'serialport' }] });
  button(tree, '刷新工程').props.onClick(); button(tree, 'demo').props.onClick();
  button(tree, '编译').props.onClick(); button(tree, '刷新设备').props.onClick(); button(tree, '烧录').props.onClick();
  nodes(tree, node => node.type === 'select')[0].props.onChange({ target: { value: 'COM8' } });
  assert.deepEqual(calls, { refreshProjects: 1, selectProject: 1, build: 1, refreshDevices: 1, ports: ['COM8'], flash: 1 });
  const html = renderToStaticMarkup(tree); assert(html.includes('COM7 · ESP32-S3'));
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/BrowserPanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/BrowserPanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  const prefixEnd = 'interface Props';
  let restored = before.slice(0, before.indexOf(prefixEnd)) + after.slice(after.indexOf(prefixEnd));
  const derivedStart = '  const progressValue';
  const derivedEnd = '  const toggleRuntimeCard';
  restored = restored.replace(derivedEnd, before.slice(before.indexOf(derivedStart), before.indexOf(derivedEnd)) + derivedEnd);
  const viewEnd = '          <div className="task-manager-diagnostics">';
  const originalView = before.slice(before.indexOf('          <div className="task-manager-compile">'), before.indexOf(viewEnd));
  const extractedStart = restored.indexOf('          <TaskControlsPanel');
  const extractedEnd = restored.indexOf(viewEnd, extractedStart);
  assert(extractedStart >= 0 && extractedEnd > extractedStart);
  restored = restored.slice(0, extractedStart) + originalView + restored.slice(extractedEnd);
  assert.equal(restored, before, 'parent must change only task controls presentation/import resources');
  for (const expected of ['onBuild={handleManualBuild}', 'onFlash={handleManualFlash}', 'setSelectedDevicePort(port); setSerialPort(port);']) assert(after.includes(expected));
  console.log('PASS parent source is identical after restoring task controls/import resources; execution and port authority remain parent-owned');
}

console.log('Task controls panel passed: ' + passed + ' cases; strict component types; no Main build');
