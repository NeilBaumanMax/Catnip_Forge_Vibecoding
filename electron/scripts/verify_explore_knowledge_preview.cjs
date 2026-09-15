const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const defaultSource = path.join(root, 'src/renderer/components/explore/ExploreKnowledgePreview.tsx');
const sourceArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const inputPath = path.resolve(process.argv.includes('--panel') ? path.join(root, 'src/renderer/components/ExplorePanel.tsx') : (sourceArg || defaultSource));
const outputArg = process.argv.find(arg => arg.startsWith('--output='));
const parentRef = process.argv.find(arg => arg.startsWith('--parent-ref='))?.slice(13);

function originalPanelComponent(panelCode) {
  const ast = ts.createSourceFile(inputPath, panelCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let section;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(property => property.name?.text === 'className' && property.initializer?.text === 'explore-knowledge-preview')) section = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert(section, 'Explore knowledge preview section is missing from the original panel');
  return `import React from 'react';
import { BookMarked, Star } from 'lucide-react';
import type { KnowledgeCard } from '../../../common/explore';
${propsSource()}
${section.getText(ast)}
  );
}
`;
}

function propsSource() {
  return `interface Props {
  knowledgeCards: KnowledgeCard[];
  expandedKnowledgeId: string;
  verificationCardId: string;
  verificationSummary: string;
  verificationEvidence: string;
  verificationSaving: boolean;
  verificationLabel: (status: KnowledgeCard['verificationStatus']) => string;
  openSource: (url: string) => Promise<void>;
  setExpandedKnowledgeId: React.Dispatch<React.SetStateAction<string>>;
  beginVerification: (cardId: string) => void;
  deleteKnowledgeCard: (card: KnowledgeCard) => Promise<void>;
  setVerificationSummary: (summary: string) => void;
  setVerificationEvidence: (evidence: string) => void;
  saveVerification: (status: 'verified_effective' | 'verified_ineffective') => Promise<void>;
  setVerificationCardId: (cardId: string) => void;
}

export default function ExploreKnowledgePreview({
  knowledgeCards, expandedKnowledgeId, verificationCardId,
  verificationSummary, verificationEvidence, verificationSaving,
  verificationLabel, openSource, setExpandedKnowledgeId,
  beginVerification, deleteKnowledgeCard, setVerificationSummary,
  setVerificationEvidence, saveVerification, setVerificationCardId,
}: Props) {
  return (
`;
}

const raw = fs.readFileSync(inputPath, 'utf8');
const code = process.argv.includes('--panel') ? originalPanelComponent(raw) : raw;
const virtualPath = process.argv.includes('--panel') ? path.join(root, 'src/renderer/components/explore/__KnowledgeBaseline.tsx') : inputPath;
const options = {
  strict: true, noEmit: true, skipLibCheck: true, types: [], esModuleInterop: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.React,
};
const host = ts.createCompilerHost(options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => path.resolve(fileName) === path.resolve(virtualPath)
  ? ts.createSourceFile(fileName, code, languageVersion, true, ts.ScriptKind.TSX)
  : getSourceFile(fileName, languageVersion, onError, shouldCreate);
host.fileExists = fileName => path.resolve(fileName) === path.resolve(virtualPath) || ts.sys.fileExists(fileName);
host.readFile = fileName => path.resolve(fileName) === path.resolve(virtualPath) ? code : ts.sys.readFile(fileName);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([virtualPath], options, host));
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const compiled = ts.transpileModule(code, { compilerOptions: options });
const exportsObject = {};
new Function('require', 'exports', compiled.outputText)(require, exportsObject);
const Preview = exportsObject.default;

const message = (id, role, text) => ({ id, role, kind: 'chat', text, createdAt: '2026-09-15T01:02:03Z' });
const card = (i, extra = {}) => Object.freeze({
  id: 'card-' + i,
  source: { title: i === 0 ? '<来源 & 标题>' : '来源 ' + i, url: 'https://example.invalid/' + i, sourceType: 'web', snippet: '' },
  taskSummary: '任务摘要 ' + i, tags: [], associatedProjects: i % 2 ? [] : ['工程A', '工程B'],
  savedAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z',
  verificationStatus: i % 3 === 0 ? 'verified_effective' : i % 3 === 1 ? 'verified_ineffective' : 'unverified',
  verificationRecords: i === 0 ? [{ id: 'verify-0', status: 'verified_effective', summary: '真实有效', evidenceRefs: ['TASK-1', '串口 10:20'], createdAt: '2026-09-15T02:00:00Z' }] : [],
  ...(i < 2 ? { origin: { sessionId: 'session-' + i, mode: i ? 'diagnosis' : 'idea', title: '原对话 ' + i, conversation: i ? [] : [message('m1', 'user', '问题'), message('m2', 'assistant', '回答'), message('m3', 'system', '系统记录')] } } : {}),
  ...extra,
});
const cards = Object.freeze(Array.from({ length: 8 }, (_, i) => card(i)));
function fixture(extra = {}) {
  const calls = [];
  const capture = name => (...args) => { calls.push([name, ...args]); };
  return { calls, props: {
    knowledgeCards: cards, expandedKnowledgeId: '', verificationCardId: '', verificationSummary: '', verificationEvidence: '', verificationSaving: false,
    verificationLabel: status => 'label:' + status,
    openSource: capture('open'), setExpandedKnowledgeId: capture('expand'), beginVerification: capture('begin'),
    deleteKnowledgeCard: capture('delete'), setVerificationSummary: capture('summary'), setVerificationEvidence: capture('evidence'),
    saveVerification: capture('save'), setVerificationCardId: capture('verificationId'), ...extra,
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
const byClass = (tree, name) => nodes(tree, node => node.props.className === name);
const byType = (tree, type) => nodes(tree, node => node.type === type);
const snapshots = {};
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }

check('empty knowledge state keeps count, promise and collection guidance', () => {
  const { props } = fixture({ knowledgeCards: [] });
  const tree = Preview(props), html = renderToStaticMarkup(tree);
  assert.equal(byClass(tree, 'explore-knowledge-row').length, 0);
  assert.equal(byClass(tree, 'explore-empty-state').length, 1);
  assert(html.includes('0 条 · 只在你选择后使用'));
  assert(html.includes('完成一次分析后，可在可信来源旁点击“收藏”'));
  snapshots.empty = html;
});

check('cards retain order, six-row cap, verification/project summaries and escaped text', () => {
  const { props, calls } = fixture();
  const tree = Preview(props), rows = byClass(tree, 'explore-knowledge-row');
  assert.deepEqual(rows.map(row => row.key), cards.slice(0, 6).map(item => item.id));
  const html = renderToStaticMarkup(tree);
  assert(html.includes('&lt;来源 &amp; 标题&gt;'));
  assert(html.includes('关联工程：工程A、工程B') && html.includes('未关联工程'));
  assert(html.includes('最近验证') && html.includes('真实有效') && html.includes('证据：TASK-1 · 串口 10:20'));
  for (const status of ['verified_effective', 'verified_ineffective', 'unverified']) assert(html.includes('label:' + status));
  byClass(tree, 'explore-knowledge-link')[0].props.onClick();
  assert.deepEqual(calls, [['open', cards[0].source.url]]);
  snapshots.cards = html;
});

check('origin expansion preserves roles, messages, time and empty-conversation fallback', () => {
  const first = Preview(fixture({ expandedKnowledgeId: 'card-0' }).props);
  const firstHtml = renderToStaticMarkup(first);
  assert(firstHtml.includes('找灵感 · 原对话 0') && firstHtml.includes('3 条对话'));
  assert(firstHtml.includes('你') && firstHtml.includes('探索 AI') && firstHtml.includes('系统'));
  assert(firstHtml.includes('问题') && firstHtml.includes('回答') && firstHtml.includes('系统记录'));
  assert(firstHtml.includes(new Date('2026-09-15T01:02:03Z').toLocaleTimeString()));
  const secondHtml = renderToStaticMarkup(Preview(fixture({ expandedKnowledgeId: 'card-1' }).props));
  assert(secondHtml.includes('解问题 · 原对话 1') && secondHtml.includes('收藏时还没有产生对话内容'));
  snapshots.expanded = firstHtml;
});

check('row actions preserve functional toggle and original card identifiers', () => {
  const { props, calls } = fixture();
  const tree = Preview(props);
  byClass(tree, 'explore-row-action')[0].props.onClick();
  const updater = calls[0][1];
  assert.equal(typeof updater, 'function'); assert.equal(updater(''), 'card-0'); assert.equal(updater('card-0'), '');
  byClass(tree, 'explore-row-action')[1].props.onClick();
  byClass(tree, 'explore-row-action is-danger')[0].props.onClick();
  assert.deepEqual(calls.slice(1), [['begin', 'card-0'], ['delete', cards[0]]]);
  assert.strictEqual(calls.at(-1)[1], cards[0]);
});

check('verification form is controlled and enforces required summary/saving disable rules', () => {
  const { props, calls } = fixture({ verificationCardId: 'card-0', verificationSummary: '  ', verificationEvidence: 'TASK-1' });
  const tree = Preview(props), [form] = byClass(tree, 'explore-verification-form');
  const textarea = byType(form, 'textarea')[0], input = byType(form, 'input')[0], buttons = byType(form, 'button');
  assert.equal(textarea.props.value, '  '); assert.equal(input.props.value, 'TASK-1');
  assert.equal(textarea.props.maxLength, 2000); assert.equal(input.props.maxLength, 4000);
  assert.equal(buttons[0].props.disabled, true); assert.equal(buttons[1].props.disabled, true); assert.equal(buttons[2].props.disabled, false);
  textarea.props.onChange({ target: { value: '真实结论' } }); input.props.onChange({ target: { value: '证据' } });
  buttons[0].props.onClick(); buttons[1].props.onClick(); buttons[2].props.onClick();
  assert.deepEqual(calls, [['summary', '真实结论'], ['evidence', '证据'], ['save', 'verified_effective'], ['save', 'verified_ineffective'], ['verificationId', '']]);
  const saving = Preview(fixture({ verificationCardId: 'card-0', verificationSummary: '有结论', verificationSaving: true }).props);
  assert(byType(byClass(saving, 'explore-verification-form')[0], 'button').every(button => button.props.disabled === true));
  snapshots.verification = renderToStaticMarkup(tree);
});

if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice('--output='.length)), JSON.stringify(snapshots, null, 2) + '\n');
if (parentRef) {
  const parentPath = path.join(root, 'src/renderer/components/ExplorePanel.tsx');
  const before = execFileSync('git', ['show', `${parentRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = fs.readFileSync(parentPath, 'utf8').replace(/\r\n/g, '\n');
  const beforeAst = ts.createSourceFile(parentPath, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const afterAst = ts.createSourceFile(parentPath, after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let originalSection, componentCall;
  function find(node, mode) {
    if (mode === 'before' && ts.isJsxElement(node) && node.openingElement.attributes.properties.some(property => property.name?.text === 'className' && property.initializer?.text === 'explore-knowledge-preview')) originalSection = node;
    if (mode === 'after' && ts.isJsxSelfClosingElement(node) && node.tagName.getText(afterAst) === 'ExploreKnowledgePreview') componentCall = node;
    ts.forEachChild(node, child => find(child, mode));
  }
  find(beforeAst, 'before'); find(afterAst, 'after');
  assert(originalSection && componentCall, 'parent equivalence nodes missing');
  for (const property of componentCall.attributes.properties) assert.equal(property.name.text, property.initializer.expression.getText(afterAst));
  const restored = after
    .replace(componentCall.getText(afterAst), originalSection.getText(beforeAst))
    .replace("import ExploreKnowledgePreview from './explore/ExploreKnowledgePreview';\n", '')
    .replace('SearchCheck, Sparkles, Target', 'SearchCheck, Sparkles, Star, Target');
  assert.equal(restored, before, 'parent must change only the knowledge section and imports');
  console.log('PASS full parent source is identical after reversing knowledge section/import extraction; all props forwarded directly');
}
console.log('Explore knowledge preview passed: ' + passed + ' cases; strict component types; no Main build');
