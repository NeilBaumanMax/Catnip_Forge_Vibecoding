const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = require('../../runtime/node_modules/playwright');
const less = require('less');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');

// Isolated React fixture: no installed-app CDP, Electron API, network or user data.
// Use an existing browser via CATNIP_TEST_CHROMIUM; never download one here.
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(root, 'src/renderer/components/explore/ExploreSessionHistory.tsx'));
const label = process.argv[3] || 'current';
assert.match(label, /^[a-z0-9-]+$/);
const output = path.join(root, '.tmp', 'explore-history-' + label);
const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import History from ${JSON.stringify(source.replace(/\\/g, '/'))};
const root = createRoot(document.getElementById('root'));
let generation = 0;
function Fixture({ saving, empty }) {
  const [workSessions, setSessions] = useState(empty ? [] : Array.from({ length: 14 }, (_, i) => ({
    id: 'session-' + i, projectId: 'fixture', mode: i % 2 ? 'diagnosis' : 'idea',
    title: i === 0 ? '中文历史记录 <安全文本> 与很长的标题用于检查列表布局' : '记录 ' + i,
    status: 'draft', createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T01:02:03Z',
  })));
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  return <div className="explore-panel explore-home"><div className="explore-home-dashboard-grid">
    <History workSessions={workSessions} renamingSessionId={renamingSessionId} renameDraft={renameDraft}
      renameSaving={saving} setRenamingSessionId={setRenamingSessionId} setRenameDraft={setRenameDraft}
      workStatusLabel={() => '草稿'}
      openWorkSession={async (...args) => { window.calls.push(['open', ...args]); }}
      deleteWorkSession={async session => { window.calls.push(['delete', session.id]); }}
      renameWorkSession={async (event, session) => {
        event.preventDefault(); window.calls.push(['rename', session.id, renameDraft]);
        setSessions(rows => rows.map(row => row.id === session.id ? { ...row, title: renameDraft } : row));
        setRenamingSessionId(''); setRenameDraft('');
      }} />
    <section className="explore-knowledge-preview">相邻区域占位（隔离测试）</section>
  </div></div>;
}
window.mountHistory = (saving = false, empty = false) => {
  window.calls = []; root.render(<Fixture key={++generation} saving={saving} empty={empty} />);
};
window.mountHistory();
`;

(async () => {
  const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' } });
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
    await page.locator('.explore-session-open').first().waitFor();
    assert.equal(await page.locator('.explore-session-list > li').count(), 12);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    for (const width of [1280, 720]) {
      await page.setViewportSize({ width, height: 960 });
      await page.screenshot({ path: output + '-' + width + '.png', fullPage: true });
    }
    await page.locator('.explore-session-open').nth(1).click();
    assert.deepEqual(await page.evaluate(() => window.calls), [['open', 'diagnosis', 'session-1']]);
    await page.locator('.explore-session-rename-action').nth(1).click();
    const input = page.getByLabel('记录名称');
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    assert.equal(await input.inputValue(), '记录 1');
    await input.fill('重命名后的记录');
    await input.press('Enter');
    await page.getByRole('button', { name: '重命名探索记录：重命名后的记录', exact: true }).waitFor();
    assert.deepEqual((await page.evaluate(() => window.calls)).at(-1), ['rename', 'session-1', '重命名后的记录']);
    await page.locator('.explore-session-rename-action').nth(1).click();
    await input.fill('不保存');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('button', { name: '删除探索记录：重命名后的记录', exact: true }).click();
    assert.deepEqual((await page.evaluate(() => window.calls)).at(-1), ['delete', 'session-1']);
    await page.evaluate(() => window.mountHistory(true));
    await page.locator('.explore-session-rename-action').nth(1).click();
    assert.equal(await page.getByRole('button', { name: '保存', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '取消', exact: true }).isDisabled(), true);
    await page.screenshot({ path: output + '-saving.png', fullPage: true });
    await page.evaluate(() => window.mountHistory(false, true));
    await page.locator('.explore-history-empty').waitFor();
    await page.getByRole('button', { name: '新建灵感', exact: true }).click();
    await page.getByRole('button', { name: '新建调查', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.calls), [['open', 'idea', undefined, true], ['open', 'diagnosis', undefined, true]]);
    assert.deepEqual(errors, []);
    console.log('PASS isolated Chromium: two widths, autofocus, input/Enter, cancel/delete, disabled buttons, empty/new actions; screenshots: ' + output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
