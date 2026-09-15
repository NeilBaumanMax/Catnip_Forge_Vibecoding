const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../../runtime/node_modules/playwright');
const less = require('less');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');

const root = path.resolve(__dirname, '..');
const panelMode = process.argv.includes('--panel');
const panelRef = process.argv.find(arg => arg.startsWith('--panel-ref='))?.slice(12);
const sourcePath = panelMode ? path.join(root, 'src/renderer/components/ExplorePanel.tsx') : path.resolve(process.argv[2] || path.join(root, 'src/renderer/components/explore/ExploreKnowledgePreview.tsx'));
const label = process.argv.find(arg => arg.startsWith('--label='))?.slice(8) || 'current';
assert.match(label, /^[a-z0-9-]+$/);
const output = path.join(root, '.tmp', 'explore-knowledge-' + label);

function componentSource() {
  const raw = panelRef
    ? execFileSync('git', ['show', `${panelRef}:electron/src/renderer/components/ExplorePanel.tsx`], { cwd: path.join(root, '..'), encoding: 'utf8' })
    : fs.readFileSync(sourcePath, 'utf8');
  if (!panelMode) return raw;
  const ast = ts.createSourceFile(sourcePath, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let section;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(property => property.name?.text === 'className' && property.initializer?.text === 'explore-knowledge-preview')) section = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert(section, 'original knowledge preview missing');
  return `import React from 'react';
import { BookMarked, Star } from 'lucide-react';
export default function Preview(props) {
  const { knowledgeCards, expandedKnowledgeId, verificationCardId, verificationSummary,
    verificationEvidence, verificationSaving, verificationLabel, openSource,
    setExpandedKnowledgeId, beginVerification, deleteKnowledgeCard,
    setVerificationSummary, setVerificationEvidence, saveVerification, setVerificationCardId } = props;
  return (${section.getText(ast)});
}`;
}

const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Preview from 'virtual:knowledge-preview';
const root = createRoot(document.getElementById('root'));
let generation = 0;
const message = (id, role, text) => ({ id, role, kind: 'chat', text, createdAt: '2026-09-15T01:02:03Z' });
const makeCard = i => ({
  id: 'card-' + i, source: { title: i === 0 ? '中文来源 <安全文本> 与很长标题用于检查布局' : '来源 ' + i, url: 'https://example.invalid/' + i, sourceType: 'web', snippet: '' },
  taskSummary: '任务摘要 ' + i, tags: [], associatedProjects: i % 2 ? [] : ['工程A', '工程B'], savedAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z',
  verificationStatus: i % 3 === 0 ? 'verified_effective' : i % 3 === 1 ? 'verified_ineffective' : 'unverified',
  verificationRecords: i === 0 ? [{ id: 'v0', status: 'verified_effective', summary: '已在设备验证', evidenceRefs: ['TASK-1', '串口 10:20'], createdAt: '2026-09-15T02:00:00Z' }] : [],
  ...(i < 2 ? { origin: { sessionId: 's' + i, mode: i ? 'diagnosis' : 'idea', title: '原对话 ' + i, conversation: i ? [] : [message('m1', 'user', '问题'), message('m2', 'assistant', '回答')] } } : {}),
});
function Fixture({ saving, empty }) {
  const [cards] = useState(empty ? [] : Array.from({ length: 8 }, (_, i) => makeCard(i)));
  const [expanded, setExpanded] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [summary, setSummary] = useState('');
  const [evidence, setEvidence] = useState('');
  return <div className="explore-panel explore-home"><div className="explore-home-dashboard-grid">
    <section className="explore-session-history">相邻历史占位（隔离测试）</section>
    <Preview knowledgeCards={cards} expandedKnowledgeId={expanded} verificationCardId={verificationId}
      verificationSummary={summary} verificationEvidence={evidence} verificationSaving={saving}
      verificationLabel={status => ({ verified_effective: '已验证有效', verified_ineffective: '已验证无效', unverified: '尚未验证' })[status]}
      openSource={async url => window.calls.push(['open', url])} setExpandedKnowledgeId={setExpanded}
      beginVerification={id => { window.calls.push(['begin', id]); setVerificationId(id); setSummary(''); setEvidence(''); }}
      deleteKnowledgeCard={async card => window.calls.push(['delete', card.id])}
      setVerificationSummary={setSummary} setVerificationEvidence={setEvidence}
      saveVerification={async status => { window.calls.push(['save', verificationId, status, summary, evidence]); setVerificationId(''); }}
      setVerificationCardId={setVerificationId} />
  </div></div>;
}
window.mountKnowledge = (saving = false, empty = false) => { window.calls = []; root.render(<Fixture key={++generation} saving={saving} empty={empty} />); };
window.mountKnowledge();
`;

(async () => {
  const bundle = await build({
    stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'knowledge-preview', setup(builder) {
      builder.onResolve({ filter: /^virtual:knowledge-preview$/ }, () => ({ path: 'knowledge-preview', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: componentSource(), loader: 'tsx', resolveDir: path.dirname(path.join(root, 'src/renderer/components/explore/ExploreKnowledgePreview.tsx')) }));
    } }],
  });
  const css = await less.render(['global.less', 'apple.less', 'explore.less'].map(name => fs.readFileSync(path.join(root, 'src/renderer/styles', name), 'utf8')).join('\n'));
  const browser = await chromium.launch({ headless: true, ...(process.env.CATNIP_TEST_CHROMIUM ? { executablePath: process.env.CATNIP_TEST_CHROMIUM } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html data-theme="dark"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>');
    await page.addStyleTag({ content: css.css + '\n*,*::before,*::after { animation: none !important; transition: none !important; }' });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.locator('.explore-knowledge-row').first().waitFor();
    assert.equal(await page.locator('.explore-knowledge-row').count(), 6);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    for (const width of [1280, 720]) {
      await page.setViewportSize({ width, height: 960 });
      await page.screenshot({ path: output + '-' + width + '.png', fullPage: true });
    }
    await page.locator('.explore-knowledge-link').first().click();
    assert.deepEqual(await page.evaluate(() => window.calls), [['open', 'https://example.invalid/0']]);
    await page.getByRole('button', { name: '查看原对话', exact: true }).first().click();
    await page.getByRole('region', { name: '收藏来源对话：中文来源 <安全文本> 与很长标题用于检查布局' }).waitFor();
    await page.getByRole('button', { name: '收起原对话', exact: true }).click();
    await page.getByRole('button', { name: '记录验证', exact: true }).first().click();
    const summary = page.getByLabel('验证说明'), evidence = page.getByLabel('验证证据引用');
    assert.equal(await page.getByRole('button', { name: '验证有效', exact: true }).isDisabled(), true);
    await summary.fill('真实设备已通过'); await evidence.fill('TASK-1, 串口 10:20');
    assert.equal(await page.getByRole('button', { name: '验证有效', exact: true }).isEnabled(), true);
    await page.screenshot({ path: output + '-verification.png', fullPage: true });
    await page.getByRole('button', { name: '验证有效', exact: true }).click();
    assert.deepEqual((await page.evaluate(() => window.calls)).at(-1), ['save', 'card-0', 'verified_effective', '真实设备已通过', 'TASK-1, 串口 10:20']);
    await page.getByRole('button', { name: '删除收藏', exact: true }).first().click();
    assert.deepEqual((await page.evaluate(() => window.calls)).at(-1), ['delete', 'card-0']);
    await page.evaluate(() => window.mountKnowledge(true));
    await page.getByRole('button', { name: '记录验证', exact: true }).first().click();
    await summary.fill('已有结论');
    for (const name of ['验证有效', '验证无效', '取消']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true);
    await page.evaluate(() => window.mountKnowledge(false, true));
    await page.getByText('这里还没有内容', { exact: true }).waitFor();
    assert.equal(await page.locator('.explore-knowledge-row').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS isolated Chromium knowledge preview: widths, expand/collapse, source/delete, controlled verification and empty state; screenshots: ' + output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
