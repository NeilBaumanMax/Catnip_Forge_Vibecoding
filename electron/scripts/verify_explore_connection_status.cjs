const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/explore/ExploreConnectionStatus.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
assert.doesNotMatch(code, /electronAPI|beginExploreZhihu|installExploreZhihu|autoConnectionPrompted|<input|<textarea/, 'connection presentation must not own IPC, automatic prompting or Secret input');
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
const ConnectionStatus = exportsObject.default;

const status = (state, message = `${state} message`) => ({
  state, message, installed: state !== 'needs_install', compatible: state !== 'needs_install', authConfigured: state === 'connected',
});
const calls = { install: 0, connect: 0, refresh: 0 };
const base = {
  connection: status('connected'), checking: false, installing: false, starting: false,
  onInstall: () => { calls.install++; }, onConnect: () => { calls.connect++; }, onRefresh: () => { calls.refresh++; },
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
const buttons = tree => nodes(tree, node => node.type === 'button');
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('checking fallback keeps progress copy and disables refresh', () => {
  const tree = ConnectionStatus({ ...base, connection: null, checking: true });
  const html = renderToStaticMarkup(tree);
  assert(html.includes('正在检查连接…'));
  assert(html.includes('explore-connection-status--checking'));
  assert.equal(buttons(tree).length, 1);
  assert.equal(buttons(tree)[0].props.disabled, true);
});

check('connected state has no action warning or setup steps', () => {
  const html = renderToStaticMarkup(ConnectionStatus(base));
  assert(html.includes('connected message'));
  assert(!html.includes('is-actionable'));
  assert(!html.includes('Access Secret 只交给'));
  assert(!html.includes('连接步骤') && !html.includes('安装步骤'));
});

check('install state preserves authorization steps, disabled state and callback', () => {
  const tree = ConnectionStatus({ ...base, connection: status('needs_install'), installing: true });
  const html = renderToStaticMarkup(tree);
  assert(html.includes('正在从知乎官方下载并校验 CLI…'));
  for (const text of ['点击安装即授权', '不需要管理员权限', '不会修改 PATH', '自动弹出 Access Secret 安全窗口']) assert(html.includes(text));
  const actions = buttons(tree); assert.equal(actions.length, 2); assert.equal(actions[0].props.disabled, true);
  actions[0].props.onClick(); assert.equal(calls.install, 1);
});

check('Secret state preserves safe-window copy, setup steps and callback', () => {
  const tree = ConnectionStatus({ ...base, connection: status('needs_secret'), starting: true });
  const html = renderToStaticMarkup(tree);
  assert(html.includes('正在等待 Access Secret 安全窗口显示…'));
  for (const text of ['Access Secret 只交给知乎官方连接工具', '在知乎个人中心生成新的 Secret', '粘贴到弹出的安全窗口', '页面会自动确认']) assert(html.includes(text));
  const actions = buttons(tree); assert.equal(actions.length, 2); assert.equal(actions[0].props.disabled, true);
  actions[0].props.onClick(); assert.equal(calls.connect, 1);
});

check('error state remains actionable and refresh callback stays available', () => {
  const tree = ConnectionStatus({ ...base, connection: status('error', '连接失败') });
  const html = renderToStaticMarkup(tree);
  assert(html.includes('is-actionable') && html.includes('连接失败') && html.includes('Access Secret 只交给'));
  assert.equal(buttons(tree).length, 1); buttons(tree)[0].props.onClick(); assert.equal(calls.refresh, 1);
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/ExplorePanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  function statement(source, name) {
    const ast = ts.createSourceFile(parentPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let found;
    function visit(node) {
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === name)) found = node.getText(ast);
      ts.forEachChild(node, visit);
    }
    visit(ast); return found;
  }
  const originalState = statement(before, 'connectionState');
  const originalNeedsAction = statement(before, 'connectionNeedsAction');
  const original = statement(before, 'connectionBadge');
  const current = statement(after, 'connectionBadge');
  assert(originalState && originalNeedsAction && original && current);
  const restoredBlock = `${originalState}\n  ${originalNeedsAction}\n  ${original}`;
  const restored = after.replace(current, restoredBlock).replace("import ExploreConnectionStatus from './explore/ExploreConnectionStatus';\n", '');
  assert.equal(restored, before, 'parent must change only connection derivation/badge and import');
  for (const expected of ['connection={connection}', 'checking={checkingConnection}', 'installing={installingConnection}', 'starting={startingConnection}', 'onInstall={installConnection}', 'onConnect={beginConnection}', 'onRefresh={refreshConnection}']) assert(after.includes(expected));
  console.log('PASS parent source is identical after reversing connection derivation/badge/import; security actions remain explicit callbacks');
}

console.log('Explore connection status passed: ' + passed + ' cases; strict component types; no Main build');
