const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/renderer/components/explore/ExploreOutputEmptyState.tsx');
const code = fs.readFileSync(sourcePath, 'utf8');
assert.doesNotMatch(code, /electronAPI|useState|useEffect|onClick|onChange|confirmExecution/, 'empty output presentation must stay static');
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
const EmptyState = exportsObject.default;
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('idea mode preserves illustration, explanation and three result categories', () => {
  const html = renderToStaticMarkup(EmptyState({ mode: 'idea' }));
  assert(html.includes('explore-idea-empty-shell'));
  assert(html.includes('explore-idea-workspace.png'));
  for (const text of ['知乎灵感探索说明', '从真实的讨论中', '搜索相关话题与案例', '提炼有价值的观点', '转化为可执行的灵感', '相关话题', '观点提炼', '灵感建议']) assert(html.includes(text));
  assert(!html.includes('explore-diagnosis-empty-shell'));
});

check('diagnosis mode preserves illustration, evidence explanation and three report categories', () => {
  const html = renderToStaticMarkup(EmptyState({ mode: 'diagnosis' }));
  assert(html.includes('explore-diagnosis-empty-shell'));
  assert(html.includes('explore-diagnosis-workspace.png'));
  for (const text of ['工程问题分析说明', '把复杂问题拆解成', '读取工程上下文', '结合源码与日志', '定位可能根因', '生成排查建议', '问题线索', '原因判断', '排查建议']) assert(html.includes(text));
  assert(!html.includes('explore-idea-empty-shell'));
});

check('both modes keep informative image alternatives and no controls', () => {
  const html = renderToStaticMarkup([EmptyState({ mode: 'idea' }), EmptyState({ mode: 'diagnosis' })]);
  assert(html.includes('学院呱呱在深蓝研究工作室里使用电脑寻找灵感'));
  assert(html.includes('学院呱呱在深蓝工程工作室中使用放大镜分析代码和运行状态'));
  assert(!/<button|<input|<textarea/.test(html));
});

const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/ExplorePanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  const start = "          {displayStage === 'describe' && !analysisPending && !analysisResult ? (";
  const end = "          {displayStage === 'plan' ? planView : null}";
  function block(source) {
    const from = source.indexOf(start); const to = source.indexOf(end, from);
    assert(from >= 0 && to > from); return source.slice(from, to);
  }
  const beforePrefixEnd = before.indexOf('type ExploreView');
  const afterPrefixEnd = after.indexOf('type ExploreView');
  assert(beforePrefixEnd > 0 && afterPrefixEnd > 0);
  let restored = before.slice(0, beforePrefixEnd) + after.slice(afterPrefixEnd);
  restored = restored.replace(block(restored), block(before));
  assert.equal(restored, before, 'parent must change only empty-state/import resources');
  assert(after.includes("<ExploreOutputEmptyState mode={isIdea ? 'idea' : 'diagnosis'} />"));
  console.log('PASS parent source is identical after restoring empty-state/import resources; stage condition stays parent-owned');
}

console.log('Explore output empty state passed: ' + passed + ' cases; strict component types; no Main build');
