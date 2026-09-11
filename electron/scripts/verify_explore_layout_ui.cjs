const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const port = 5174;
const cdpPort = 9332;
const cdpList = `http://127.0.0.1:${cdpPort}/json`;
const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-explore-layout-'));
const outputDir = path.join(root, '.tmp');
const screenshotPath = path.join(outputDir, 'explore-layout-ui.png');
let vite;
let chrome;
let socket;
let callId = 0;
const consoleErrors = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findExecutable(directory, executableName) {
  if (!fs.existsSync(directory)) return '';
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findExecutable(fullPath, executableName);
      if (found) return found;
    } else if (entry.name.toLowerCase() === executableName) {
      return fullPath;
    }
  }
  return '';
}

async function waitForJson(url, predicate, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await fetch(url).then((response) => response.json());
      if (!predicate || predicate(value)) return value;
    } catch {}
    await wait(200);
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function waitForHttp(url, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error(`timed out waiting for ${url}`);
}

function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', timeout: 5_000 });
  } else {
    try { child.kill('SIGTERM'); } catch {}
  }
}

async function call(method, params = {}) {
  const id = ++callId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 15_000);
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'renderer evaluation failed');
  return result.result?.value;
}

async function setViewport(width, height) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await wait(120);
}

async function measure(width, height, leftPercent, collapsed = false) {
  await setViewport(width, height);
  return evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const body = document.querySelector('.app-body');
    const toggle = document.querySelector('[data-tour-id="agent-panel-toggle"]');
    if (!body || !toggle) throw new Error('workspace split controls missing');
    const isCollapsed = body.classList.contains('app-body--left-collapsed');
    if (isCollapsed !== ${collapsed}) toggle.click();
    body.style.setProperty('--left-panel-width', '${leftPercent}%');
    await wait(160);
    const panel = document.querySelector('.explore-panel');
    const entries = document.querySelector('.explore-entry-grid');
    if (!panel || !entries) return { missing: true, text: document.body.innerText.slice(0, 600), panelClass: panel?.className || '' };
    const panelWidth = panel.getBoundingClientRect().width;
    const entryColumns = getComputedStyle(entries).gridTemplateColumns.split(' ').filter(Boolean).length;
    return {
      viewport: [${width}, ${height}],
      leftPercent: ${leftPercent},
      collapsed: ${collapsed},
      panelWidth,
      entryColumns,
      expectedTier: panelWidth < 700 ? 'compact' : panelWidth < 1200 ? 'normal' : 'wide',
      panelUsesWorkspace: panelWidth / document.querySelector('.right-panel').getBoundingClientRect().width > 0.94,
    };
  })()`);
}

async function main() {
  const chromePath = findExecutable(path.join(root, 'dist-package', 'win-unpacked', 'resources', 'runtime', 'playwright'), 'chrome-headless-shell.exe');
  if (!chromePath) throw new Error('packaged Playwright Chromium was not found; run pack:win first');

  vite = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${port}`);
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--window-size=1920,1080',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${tempProfile}`,
    `http://127.0.0.1:${port}/`,
  ], { stdio: 'ignore' });

  const targets = await waitForJson(cdpList, (items) => items.some((item) => item.type === 'page'));
  const target = targets.find((item) => item.type === 'page' && item.url.includes('127.0.0.1')) || targets.find((item) => item.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'renderer exception');
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') consoleErrors.push(message.params.entry.text);
  });
  await call('Runtime.enable');
  await call('Log.enable');
  await wait(3_000);

  const setup = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const source = (type, title, url) => ({ type, title, author: type === 'zhihu' ? '硬件开发者' : '官方文档', url, excerpt: '这是用于界面验证的来源摘要，包含可追溯结论与验证线索。' });
    const knowledge = {
      id: 'knowledge-ui-smoke',
      source: source('zhihu', 'AMOLED 黑屏排查经验', 'https://www.zhihu.com/question/ui-smoke'),
      taskSummary: 'SPI 屏幕初始化与复位时序',
      tags: ['display'],
      associatedProjects: ['hardboard/projects/demo'],
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationStatus: 'verified_effective',
      verificationRecords: [{ id: 'verification-ui-smoke', status: 'verified_effective', projectId: 'hardboard/projects/demo', summary: '降低 SPI 时钟后实机显示恢复。', evidenceRefs: ['serial:42', 'build:7'], createdAt: new Date().toISOString() }],
    };
    const sessions = [];
    const makeSession = (mode) => ({
      version: 1, id: 'explore-' + crypto.randomUUID(), projectId: 'project-ui-smoke', mode,
      title: mode === 'idea' ? '新灵感探索' : '新问题调查', status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      snapshot: { input: '', selectedContextIds: [], selectedKnowledgeIds: [], analysisRequest: null, analysisResult: null, planResult: null, planHandoff: null, selectedIdeaId: '', editingInput: true, gatheredContext: null, analysisTaskId: null, analysisRequestId: null, planTaskId: null, planRequestId: null, executionStarted: false, executionTaskId: null, executionDisposition: null, notice: '', displayStage: 'describe', conversation: [], handoffArtifact: null },
    });
    window.electronAPI = {
      getStartupStatus: async () => ({ firstRun: false, playwrightReady: true }),
      getProjectSessionStatus: async () => ({ projectsRoot: 'hardboard/projects', activeProject: { id: 'project-ui-smoke', name: 'demo', projectDir: 'hardboard/projects/demo', relativePath: 'hardboard/projects/demo', available: true }, suggestedProjectId: null, projects: [] }),
      listExploreWorkSessions: async (mode) => sessions.filter((item) => !mode || item.mode === mode).map(({ snapshot, version, ...item }) => item),
      createExploreWorkSession: async (mode) => { const item = makeSession(mode); sessions.unshift(item); return structuredClone(item); },
      getExploreWorkSession: async (mode, id) => structuredClone(sessions.find((item) => item.mode === mode && item.id === id)),
      saveExploreWorkSession: async (record) => { const index = sessions.findIndex((item) => item.id === record.id); if (index >= 0) sessions[index] = structuredClone(record); return structuredClone(record); },
      listExploreKnowledge: async () => [knowledge],
      findRelatedExploreKnowledge: async () => [knowledge],
      selectExploreKnowledgeForContext: async () => [knowledge],
      saveExploreKnowledge: async () => knowledge,
      addExploreKnowledgeVerification: async () => knowledge,
      getExploreZhihuStatus: async () => ({ state: 'connected', installed: true, compatible: true, authConfigured: true, message: '知乎已连接' }),
      installExploreZhihuConnection: async () => ({ ok: true, state: 'already_ready', message: '已连接', connection: { state: 'connected', installed: true, compatible: true, authConfigured: true, message: '知乎已连接' } }),
      beginExploreZhihuConnection: async () => ({ ok: true, state: 'already_connected', message: '知乎已连接' }),
      gatherExploreContext: async () => ({ generatedAt: Date.now(), projectDir: 'hardboard/projects/demo', warnings: [], limits: {}, items: [
        { id: 'current-project', kind: 'project', label: '当前工程', summary: 'hardboard/projects/demo', selected: true, available: true },
        { id: 'target', kind: 'target', label: 'ESP-IDF Target', summary: 'esp32s3', selected: true, available: true },
        { id: 'source-main', kind: 'source', label: 'main/main.c', summary: '当前程序入口', selected: true, available: true },
        { id: 'build', kind: 'build', label: '最近 Build', summary: '23:41 · failed', selected: true, available: true },
        { id: 'serial', kind: 'serial', label: '最近串口片段', summary: '40 条记录', selected: true, available: true },
      ] }),
      prepareExploreRequest: async (request) => ({ request, selectedContext: request.context.items.filter((item) => item.selected), sourceStrategy: { zhihu: 'required', web: 'required' }, state: 'ready', message: 'ready' }),
      onExploreAnalysisResult: (callback) => { window.__exploreResult = callback; },
      onExploreAnalysisError: () => {},
      onExploreConversationMessage: () => {},
      startExploreAnalysis: async (request) => {
        setTimeout(() => window.__exploreResult({
          schemaVersion: 1, requestId: 'analysis-ui-smoke', mode: request.mode,
          diagnosis: request.mode === 'diagnosis' ? {
            problem: request.goal,
            sourceConflicts: ['社区经验建议提高时钟，官方时序约束要求降低时钟。'],
            hypotheses: [{
              id: 'hypothesis-ui-smoke', statement: 'SPI 时钟过高导致面板初始化不稳定', priorityReason: '串口错误与当前配置共同指向总线时序。',
              projectEvidence: ['main/display.c 将 SPI clock 配置为 80MHz', '最近串口出现 panel init timeout'],
              communitySources: [source('zhihu', 'ESP32-S3 屏幕初始化经验', 'https://www.zhihu.com/question/ui-smoke-source')],
              externalSources: [source('web', 'ESP-IDF SPI Master Driver', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/spi_master.html')],
              nextValidation: '把 SPI 时钟降到 40MHz，重新 Build、Flash，并观察串口与屏幕。',
            }],
          } : undefined,
          ideas: request.mode === 'idea' ? [] : undefined,
        }), 20);
        return { ok: true, taskId: 'analysis-task', requestId: 'analysis-ui-smoke', disposition: 'started', sourceCount: 2 };
      },
      startExplorePlan: async () => {
        setTimeout(() => window.__exploreResult({ schemaVersion: 1, requestId: 'plan-ui-smoke', mode: 'plan', plan: {
          summary: '先核对证据，再以最小改动验证 SPI 时序假设。',
          steps: [{ id: 'step-1', title: '检查当前配置', detail: '确认 SPI 时钟、复位引脚和工程 target。' }, { id: 'step-2', title: '执行受控验证', detail: '用户确认后才修改、Build、Flash 并读取 Serial。' }],
          risks: ['降低时钟可能影响刷新率，需要记录对比结果。'],
        } }), 20);
        return { ok: true, taskId: 'plan-task', requestId: 'plan-ui-smoke', disposition: 'started' };
      },
      createExploreHandoffArtifact: async ({ sessionId, handoff, planResult }) => ({ version: 1, projectId: 'project-ui-smoke', sessionId, mode: handoff.kind === 'idea' ? 'idea' : 'diagnosis', handoffId: handoff.id, planRequestId: planResult.requestId, digest: 'a'.repeat(64), relativeDir: '.catnip/handoffs/' + sessionId, planMarkdown: '# 执行计划\\n\\n界面验证计划', handoffMarkdown: '# Explore → 工程 Agent 交接\\n\\n界面验证交接', createdAt: new Date().toISOString() }),
      getExploreHandoffArtifact: async (sessionId) => ({ version: 1, projectId: 'project-ui-smoke', sessionId, mode: 'diagnosis', handoffId: 'handoff-ui-smoke', planRequestId: 'plan-ui-smoke', digest: 'a'.repeat(64), relativeDir: '.catnip/handoffs/' + sessionId, planMarkdown: '# 执行计划\\n\\n界面验证计划', handoffMarkdown: '# Explore → 工程 Agent 交接\\n\\n界面验证交接', createdAt: new Date().toISOString() }),
      confirmExploreExecution: async () => ({ ok: true, taskId: 'execution-task', disposition: 'queued' }),
      navigateBrowser: async () => ({ ok: true }),
      setBrowserBounds: async () => ({ ok: true }),
    };
    const exploreTab = document.querySelector('[data-tour-id="tab-explore"]');
    if (!exploreTab) return { mounted: false, reason: 'Explore tab missing', url: location.href, readyState: document.readyState, text: document.body.innerText.slice(0, 400), html: document.documentElement.outerHTML.slice(0, 800) };
    exploreTab.click();
    for (let attempt = 0; attempt < 40 && !document.querySelector('.explore-panel'); attempt += 1) await wait(50);
    return {
      mounted: Boolean(document.querySelector('.explore-panel')),
      modeClass: document.querySelector('.browser-panel')?.className || '',
      text: document.body.innerText.slice(0, 400),
    };
  })()`);
  if (!setup?.mounted) throw new Error(`Explore panel did not mount: ${JSON.stringify({ setup, consoleErrors })}`);

  const scenarios = [];
  for (const leftPercent of [24, 34, 45, 52]) scenarios.push(await measure(1920, 1080, leftPercent, false));
  scenarios.push(await measure(1920, 1080, 34, true));
  scenarios.push(await measure(2560, 1440, 45, false));
  scenarios.push(await measure(3840, 2160, 52, false));
  scenarios.push(await measure(1200, 900, 52, false));
  for (const scenario of scenarios) {
    if (scenario.missing) throw new Error(`Explore home geometry missing: ${JSON.stringify(scenario)}`);
    const expectedEntries = scenario.expectedTier === 'compact' ? 1 : 2;
    if (scenario.entryColumns !== expectedEntries || !scenario.panelUsesWorkspace) {
      throw new Error(`home layout mismatch: ${JSON.stringify(scenario)}`);
    }
  }

  await setViewport(2560, 1440);
  const flowResult = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const body = document.querySelector('.app-body');
    if (body.classList.contains('app-body--left-collapsed')) document.querySelector('[data-tour-id="agent-panel-toggle"]').click();
    body.style.setProperty('--left-panel-width', '34%');
    document.querySelector('[data-tour-id="explore-diagnosis"]').click();
    for (let attempt = 0; attempt < 40 && !document.querySelector('.explore-field textarea'); attempt += 1) await wait(50);
    const textarea = document.querySelector('.explore-field textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, '固件可以 Build 和 Flash，但 AMOLED 屏幕保持黑屏。');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(500);
    document.querySelector('.explore-primary-cta').click();
    for (let attempt = 0; attempt < 80 && !document.querySelector('.explore-diagnosis-report'); attempt += 1) await wait(50);
    const panelWidth = document.querySelector('.explore-panel').getBoundingClientRect().width;
    const formColumns = getComputedStyle(document.querySelector('.explore-form')).gridTemplateColumns.split(' ').filter(Boolean).length;
    const evidence = document.querySelector('.explore-project-evidence')?.textContent || '';
    const conflicts = document.querySelector('.explore-conflict-notice')?.textContent || '';
    const sourceExcerpt = document.querySelector('.explore-source-row > p')?.textContent || '';
    const sourceButtonHeights = [...document.querySelectorAll('.explore-source-actions button')].map((button) => button.getBoundingClientRect().height);
    const analysisStage = document.querySelector('.explore-stage-nav [aria-current="step"]')?.textContent || '';
    document.querySelector('.explore-diagnosis-report > .explore-generate-plan').click();
    for (let attempt = 0; attempt < 80 && !document.querySelector('.explore-plan-steps'); attempt += 1) await wait(50);
    const planStage = document.querySelector('.explore-stage-nav [aria-current="step"]')?.textContent || '';
    const planSteps = document.querySelectorAll('.explore-plan-steps li').length;
    for (let attempt = 0; attempt < 80 && ![...document.querySelectorAll('.explore-stage-nav button')].find((button) => button.textContent.includes('执行') && !button.disabled); attempt += 1) await wait(50);
    [...document.querySelectorAll('.explore-stage-nav button')].find((button) => button.textContent.includes('执行') && !button.disabled)?.click();
    for (let attempt = 0; attempt < 40 && !document.querySelector('.explore-artifact-view'); attempt += 1) await wait(50);
    const confirm = document.querySelector('[data-tour-id="explore-confirm-execution"]');
    const executeStage = document.querySelector('.explore-stage-nav [aria-current="step"]')?.textContent || '';
    const artifactVisible = Boolean(document.querySelector('.explore-artifact-view pre'));
    const themes = {};
    for (const theme of ['light', 'dark', 'aurora']) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
      await wait(30);
      const style = getComputedStyle(document.querySelector('.explore-panel'));
      themes[theme] = { primary: style.getPropertyValue('--explore-primary').trim(), color: style.color, background: style.backgroundColor };
    }
    document.documentElement.dataset.theme = 'aurora';
    document.documentElement.style.colorScheme = 'dark';
    document.querySelector('.explore-back-button').click();
    await wait(50);
    const illustrations = [...document.querySelectorAll('.explore-entry-illustration')].map((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      alt: image.getAttribute('alt'),
    }));
    document.querySelector('[data-tour-id="explore-diagnosis"]').click();
    await wait(100);
    const returnPreserved = Boolean(document.querySelector('.explore-artifact-view'));
    document.querySelector('[data-tour-id="tab-editor"]').click();
    await wait(50);
    document.querySelector('[data-tour-id="tab-explore"]').click();
    await wait(100);
    const workspaceSwitchPreserved = Boolean(document.querySelector('.explore-artifact-view'));
    return {
      panelWidth, formColumns, evidence, conflicts, sourceExcerpt, sourceButtonHeights, analysisStage, planStage, executeStage,
      planSteps, artifactVisible,
      confirmEnabled: confirm && !confirm.disabled,
      priorResultCollapsed: !document.querySelector('.explore-prior-result')?.open,
      returnPreserved,
      workspaceSwitchPreserved,
      themes,
      illustrations,
    };
  })()`);
  if (flowResult.panelWidth < 1200 || flowResult.formColumns !== 2) throw new Error(`wide flow did not use two columns: ${JSON.stringify(flowResult)}`);
  if (!flowResult.evidence.includes('80MHz') || !flowResult.conflicts.includes('官方时序') || !flowResult.sourceExcerpt.includes('来源摘要')) throw new Error(`diagnosis evidence UI incomplete: ${JSON.stringify(flowResult)}`);
  if (!flowResult.analysisStage.includes('查看结论') || !flowResult.planStage.includes('确认计划') || !flowResult.executeStage.includes('执行')) throw new Error(`stage navigation mismatch: ${JSON.stringify(flowResult)}`);
  if (flowResult.planSteps !== 2 || !flowResult.artifactVisible || !flowResult.confirmEnabled || !flowResult.priorResultCollapsed) throw new Error(`plan/artifact gate UI mismatch: ${JSON.stringify(flowResult)}`);
  if (!flowResult.sourceButtonHeights.length || flowResult.sourceButtonHeights.some((height) => height < 36)) throw new Error(`source actions are not prominent enough: ${JSON.stringify(flowResult.sourceButtonHeights)}`);
  if (!flowResult.returnPreserved || !flowResult.workspaceSwitchPreserved) throw new Error(`Explore work was lost during navigation: ${JSON.stringify(flowResult)}`);
  if (!flowResult.themes.light.primary || flowResult.themes.light.primary === flowResult.themes.dark.primary) throw new Error(`theme tokens did not change: ${JSON.stringify(flowResult.themes)}`);
  if (!flowResult.themes.aurora.primary || flowResult.themes.aurora.primary === flowResult.themes.dark.primary) throw new Error(`aurora theme tokens are missing: ${JSON.stringify(flowResult.themes)}`);
  if (flowResult.illustrations.length !== 2 || flowResult.illustrations.some((item) => !item.complete || item.naturalWidth < 512 || item.alt !== '')) throw new Error(`entry illustrations did not load as decorative local assets: ${JSON.stringify(flowResult.illustrations)}`);
  if (consoleErrors.length) throw new Error(`renderer errors: ${JSON.stringify(consoleErrors)}`);

  await evaluate(`document.querySelector('.explore-back-button')?.click()`);
  await wait(120);
  await setViewport(1536, 1024);
  const homeGeometry = await evaluate(`(() => {
    const panel = document.querySelector('.explore-panel');
    const hero = document.querySelector('.explore-home-header');
    const eyebrow = document.querySelector('.explore-eyebrow');
    const panelRect = panel?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    const eyebrowRect = eyebrow?.getBoundingClientRect();
    return {
      scrollTop: panel?.scrollTop,
      panelTop: panelRect?.top,
      heroTop: heroRect?.top,
      heroBottom: heroRect?.bottom,
      eyebrowTop: eyebrowRect?.top,
      eyebrowBottom: eyebrowRect?.bottom,
    };
  })()`);
  if (homeGeometry.scrollTop !== 0 || homeGeometry.eyebrowTop < homeGeometry.heroTop + 8) throw new Error(`Explore hero is clipped: ${JSON.stringify(homeGeometry)}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ scenarios, flowResult, homeGeometry, screenshotPath, consoleErrors }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}).finally(() => {
  try { socket?.close(); } catch {}
  killTree(chrome);
  killTree(vite);
  try { chrome?.unref(); } catch {}
  try { vite?.unref(); } catch {}
  const resolved = path.resolve(tempProfile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    try { fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); }
    catch (error) { console.warn('temporary layout profile cleanup pending:', error.message); }
  }
});
