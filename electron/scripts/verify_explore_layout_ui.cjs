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
const entryScreenshotPath = path.join(outputDir, 'explore-entry-layout-ui.png');
const targetScreenshotPath = path.join(outputDir, 'explore-entry-target-1536x1024.png');
const shellScreenshotPath = path.join(outputDir, 'workspace-shell-target-2048x1152.png');
const skillHubScreenshotPath = path.join(outputDir, 'skill-hub-topline-2048x1152.png');
const exploreHomeScreenshotPath = path.join(outputDir, 'explore-home-target-2048x1105.png');
const tallTargetScreenshotPath = path.join(outputDir, 'explore-entry-target-1573x1276.png');
const ideaWorkspaceScreenshotPath = path.join(outputDir, 'explore-idea-workspace-target-1448x1086.png');
const diagnosisWorkspaceScreenshotPath = path.join(outputDir, 'explore-diagnosis-workspace-target-1448x1086.png');
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
    const entryArt = [...document.querySelectorAll('.explore-entry-card')].map((card) => {
      const art = card.querySelector('.explore-entry-illustration');
      const image = art?.querySelector('img');
      const title = card.querySelector('strong');
      const description = title?.nextElementSibling;
      const cardRect = card.getBoundingClientRect();
      const artRect = art?.getBoundingClientRect();
      const copyRight = Math.max(title?.getBoundingClientRect().right || 0, description?.getBoundingClientRect().right || 0);
      return {
        loaded: Boolean(image?.complete && image.naturalWidth >= 1200 && image.naturalHeight >= 1200),
        anchoredRight: Boolean(artRect && artRect.left >= cardRect.left + cardRect.width * 0.47 && artRect.right <= cardRect.right + cardRect.width * 0.08),
        copyClear: Boolean(artRect && copyRight <= artRect.left + 2),
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        descriptionFontSize: Number.parseFloat(getComputedStyle(description).fontSize),
        card: cardRect ? [cardRect.left, cardRect.right, cardRect.width, cardRect.height] : null,
        art: artRect ? [artRect.left, artRect.right, artRect.width] : null,
        copyRight,
      };
    });
    return {
      viewport: [${width}, ${height}],
      leftPercent: ${leftPercent},
      collapsed: ${collapsed},
      panelWidth,
      entryColumns,
      entryArt,
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
    window.__exploreSessions = sessions;
    const makeSession = (mode) => ({
      version: 1, id: 'explore-' + crypto.randomUUID(), projectId: 'project-ui-smoke', mode,
      title: mode === 'idea' ? '新灵感探索' : '新问题调查', status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      snapshot: { input: '', selectedContextIds: [], selectedKnowledgeIds: [], analysisRequest: null, analysisResult: null, planResult: null, planHandoff: null, selectedIdeaId: '', editingInput: true, gatheredContext: null, analysisTaskId: null, analysisRequestId: null, planTaskId: null, planRequestId: null, executionStarted: false, executionTaskId: null, executionDisposition: null, notice: '', displayStage: 'describe', conversation: [], handoffArtifact: null },
    });
    sessions.push(makeSession('diagnosis'), makeSession('idea'));
    window.electronAPI = {
      getStartupStatus: async () => ({ firstRun: false, playwrightReady: true }),
      getProjectSessionStatus: async () => ({ projectsRoot: 'hardboard/projects', activeProject: { id: 'project-ui-smoke', name: 'demo', projectDir: 'hardboard/projects/demo', relativePath: 'hardboard/projects/demo', available: true }, suggestedProjectId: null, projects: [] }),
      listExploreWorkSessions: async (mode) => sessions
        .filter((item) => !mode || item.mode === mode)
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .map(({ snapshot, version, ...item }) => item),
      createExploreWorkSession: async (mode) => { const item = makeSession(mode); sessions.unshift(item); return structuredClone(item); },
      getExploreWorkSession: async (mode, id) => structuredClone(sessions.find((item) => item.mode === mode && item.id === id)),
      saveExploreWorkSession: async (record) => { const saved = { ...structuredClone(record), updatedAt: new Date().toISOString() }; const index = sessions.findIndex((item) => item.id === record.id); if (index >= 0) sessions[index] = saved; return structuredClone(saved); },
      deleteExploreWorkSession: async (mode, id) => { const index = sessions.findIndex((item) => item.mode === mode && item.id === id); if (index >= 0) sessions.splice(index, 1); return sessions.map(({ snapshot, version, ...item }) => item); },
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
          ideas: request.mode === 'idea' ? [{
            id: 'idea-ui-smoke', title: '桌面语音陪伴机器人', value: '用现有 ESP32-S3 做一个可验证的最小陪伴交互。',
            implementationDirection: '先完成麦克风、扬声器和联网问答的单轮闭环。', compatibility: '复用当前工程与 ESP-IDF 组件。',
            sources: [source('zhihu', 'ESP32-S3 语音机器人实践', 'https://www.zhihu.com/question/ui-smoke-idea')],
          }] : undefined,
        }), window.__analysisDelay || 20);
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
      openExternalUrl: async (url) => { window.__openedExternalUrl = url; return { ok: true }; },
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

  const chatShell = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const quickActions = [...document.querySelectorAll('.chat-empty-actions button')];
    const composer = document.querySelector('.chat-composer-editor textarea');
    const submit = document.querySelector('.chat-input-actions button[type="submit"]');
    if (!quickActions.length || !composer || !submit) return { missing: true };
    quickActions[0].click();
    await wait(80);
    const panelRect = document.querySelector('.chat-panel').getBoundingClientRect();
    const composerRect = composer.getBoundingClientRect();
    const submitRect = submit.getBoundingClientRect();
    const navRect = document.querySelector('.workbench-mode-tabs').getBoundingClientRect();
    const brandRect = document.querySelector('.workspace-brand').getBoundingClientRect();
    const tabSurfaceRect = document.querySelector('.workspace-nav-tabs').getBoundingClientRect();
    const actionSurfaceRect = document.querySelector('.workspace-shell-actions').getBoundingClientRect();
    const firstTabRect = document.querySelector('[data-tour-id="tab-repo"]').getBoundingClientRect();
    const skillTabRect = document.querySelector('[data-tour-id="tab-skill-hub"]').getBoundingClientRect();
    const taskTabRect = document.querySelector('[data-tour-id="tab-tasks"]').getBoundingClientRect();
    const taskLabelRect = document.querySelector('[data-tour-id="tab-tasks"] span').getBoundingClientRect();
    const projectRect = document.querySelector('.active-project-switch').getBoundingClientRect();
    const settingsRect = document.querySelector('.workspace-settings').getBoundingClientRect();
    const controlsRect = document.querySelector('.workspace-window-controls').getBoundingClientRect();
    const shell = document.querySelector('.workspace-global-nav');
    const shellBoxes = [...document.querySelectorAll('.workspace-shell-box')];
    const shellStyle = getComputedStyle(shell);
    const brandStyle = getComputedStyle(document.querySelector('.workspace-brand'));
    const brandIconRect = document.querySelector('.workspace-brand img')?.getBoundingClientRect();
    const brandCaptionStyle = getComputedStyle(document.querySelector('.workspace-brand small'));
    const chatInputRect = document.querySelector('.chat-input')?.getBoundingClientRect();
    const composerActionsRect = document.querySelector('.chat-input-actions')?.getBoundingClientRect();
    const submitRectInComposer = document.querySelector('.chat-submit')?.getBoundingClientRect();
    const submitStyle = getComputedStyle(document.querySelector('.chat-submit'));
    const historyStyle = getComputedStyle(document.querySelector('.chat-history'));
    const historyMainStyle = getComputedStyle(document.querySelector('.chat-history-main'));
    const historyRailStyle = getComputedStyle(document.querySelector('.chat-history-rail'));
    const historyRailChannels = historyRailStyle.backgroundColor.match(/[0-9.]+/g)?.map(Number) || [];
    const historyRailAlpha = historyRailChannels.length === 4 ? historyRailChannels[3] : 1;
    const isBlueGlass = (element) => {
      const channels = getComputedStyle(element).backgroundColor.match(/[0-9.]+/g)?.map(Number) || [];
      if (channels.length === 4 && channels[3] > 1) channels[3] /= 100;
      return channels.length === 4 && channels[2] > channels[0] && channels[2] > channels[1]
        && channels[3] > 0.35 && channels[3] < 0.86;
    };
    const surfaceTopDelta = Math.max(
      Math.abs(brandRect.top - tabSurfaceRect.top),
      Math.abs(tabSurfaceRect.top - actionSurfaceRect.top),
    );
    document.querySelector('.appearance-settings-trigger')?.click();
    await wait(120);
    const assistantActionCount = document.querySelectorAll('.software-assistant-actions button').length;
    const assistantThemeControlCount = document.querySelectorAll('[aria-label="切换到浅色模式"], [aria-label="切换到深色模式"]').length;
    document.querySelector('.software-assistant-actions button:last-child')?.click();
    return {
      quickActionCount: quickActions.length,
      suggestionCount: document.querySelectorAll('.chat-empty-suggestions button').length,
      historyRailActionCount: document.querySelectorAll('.chat-history-rail button').length,
      promptInjected: composer.value,
      brand: document.querySelector('.workspace-brand strong')?.textContent || '',
      settingsVisible: (document.querySelector('.workspace-settings')?.getBoundingClientRect().width || 0) > 0,
      windowControlCount: document.querySelectorAll('.workspace-window-controls button').length,
      topRowAligned: surfaceTopDelta <= 1,
      surfacesSeparated: brandRect.right < tabSurfaceRect.left && tabSurfaceRect.right < actionSurfaceRect.left,
      taskLabelVisible: taskLabelRect.left >= taskTabRect.left && taskLabelRect.right <= taskTabRect.right,
      outerFrameRemoved: shellStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
        && shellStyle.borderTopWidth === '0px'
        && shellStyle.backdropFilter === 'none'
        && shellStyle.filter === 'none',
      blueGlassSurfaceCount: shellBoxes.filter((box) => isBlueGlass(box) && !box.classList.contains('is-dark')).length,
      brandUnboxed: brandStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
        && brandStyle.borderTopWidth === '0px'
        && brandStyle.boxShadow === 'none'
        && (brandIconRect?.width || 0) >= 40
        && Number.parseFloat(brandCaptionStyle.fontSize) >= 10,
      composerActionsInside: Boolean(chatInputRect && composerActionsRect
        && composerActionsRect.left >= chatInputRect.left
        && composerActionsRect.right <= chatInputRect.right
        && composerActionsRect.bottom <= chatInputRect.bottom),
      submitIsPaperPlane: Boolean(submitRectInComposer
        && Math.abs(submitRectInComposer.width - submitRectInComposer.height) <= 1
        && document.querySelector('.chat-submit svg')),
      submitKeepsBlueIdleState: submitStyle.backgroundImage.includes('linear-gradient')
        && Number.parseFloat(submitStyle.opacity) >= 0.7,
      submitStyleDetails: {
        backgroundImage: submitStyle.backgroundImage,
        backgroundColor: submitStyle.backgroundColor,
        opacity: submitStyle.opacity,
      },
      assistantActionCount,
      assistantThemeControlCount,
      historyArtworkFillsPanel: historyStyle.backgroundImage.includes('chat-history-night-v2.png')
        && historyStyle.backgroundSize.includes('112%')
        && historyMainStyle.backgroundImage === 'none'
        && historyRailAlpha < 0.8,
      historyRailSeamRemoved: historyRailStyle.borderRightWidth === '0px'
        && historyRailStyle.boxShadow === 'none'
        && historyRailStyle.backgroundImage.includes('linear-gradient'),
      historyArtworkDetails: {
        backgroundImage: historyStyle.backgroundImage,
        backgroundSize: historyStyle.backgroundSize,
        mainBackgroundImage: historyMainStyle.backgroundImage,
        railBackgroundColor: historyRailStyle.backgroundColor,
        railBackgroundImage: historyRailStyle.backgroundImage,
        railBorderRightWidth: historyRailStyle.borderRightWidth,
        railAlpha: historyRailAlpha,
      },
      shellMaterials: shellBoxes.map((box) => ({
        className: box.className,
        backgroundColor: getComputedStyle(box).backgroundColor,
      })),
      brandBeforeTabs: brandRect.right <= firstTabRect.left + 1,
      projectAfterTabs: skillTabRect.right <= projectRect.left + 1,
      settingsAfterProject: projectRect.right <= settingsRect.left + 1,
      controlsAfterSettings: settingsRect.right <= controlsRect.left + 1,
      controlsInsideViewport: controlsRect.right <= innerWidth - 8,
      navSpansViewport: navRect.left <= 10 && navRect.right >= innerWidth - 10,
      navGeometry: {
        brand: [brandRect.left, brandRect.right, brandRect.top],
        tabs: [tabSurfaceRect.left, tabSurfaceRect.right, tabSurfaceRect.top],
        actions: [actionSurfaceRect.left, actionSurfaceRect.right, actionSurfaceRect.top],
        firstTab: [firstTabRect.left, firstTabRect.right, firstTabRect.top],
        skillTab: [skillTabRect.left, skillTabRect.right, skillTabRect.top],
        project: [projectRect.left, projectRect.right, projectRect.top],
        settings: [settingsRect.left, settingsRect.right, settingsRect.top],
      },
      composerVisible: composerRect.width > 0 && composerRect.bottom <= panelRect.bottom + 1,
      submitVisible: submitRect.width > 0 && submitRect.right <= panelRect.right + 1 && submitRect.bottom <= panelRect.bottom + 1,
    };
  })()`);
  if (!chatShell.outerFrameRemoved || chatShell.blueGlassSurfaceCount !== 2 || !chatShell.brandUnboxed) {
    throw new Error(`top shell material mismatch: ${JSON.stringify(chatShell)}`);
  }
  if (chatShell.missing || chatShell.quickActionCount !== 4 || chatShell.suggestionCount !== 4
    || chatShell.historyRailActionCount !== 4 || !chatShell.promptInjected.includes('当前工程')
    || chatShell.brand !== 'Catnip Forge' || !chatShell.settingsVisible || chatShell.windowControlCount !== 3
    || !chatShell.topRowAligned || !chatShell.surfacesSeparated || !chatShell.taskLabelVisible
    || !chatShell.brandBeforeTabs || !chatShell.projectAfterTabs || !chatShell.settingsAfterProject
    || !chatShell.controlsAfterSettings || !chatShell.controlsInsideViewport || !chatShell.navSpansViewport
    || !chatShell.composerVisible || !chatShell.submitVisible || !chatShell.composerActionsInside
    || !chatShell.submitIsPaperPlane || !chatShell.submitKeepsBlueIdleState
    || chatShell.assistantActionCount !== 4 || chatShell.assistantThemeControlCount !== 0
    || !chatShell.historyArtworkFillsPanel || !chatShell.historyRailSeamRemoved) {
    throw new Error(`chat shell interaction mismatch: ${JSON.stringify(chatShell)}`);
  }

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
    if (scenario.entryArt.length !== 2 || scenario.entryArt.some((item) => !item.loaded || !item.anchoredRight || !item.copyClear || item.card[3] < 400 || item.titleFontSize < 31 || item.descriptionFontSize < 15)) {
      throw new Error(`entry illustration layout mismatch: ${JSON.stringify(scenario)}`);
    }
  }

  await measure(1920, 1080, 34, false);
  fs.mkdirSync(outputDir, { recursive: true });
  const entryScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(entryScreenshotPath, Buffer.from(entryScreenshot.data, 'base64'));

  await setViewport(1536, 1024);
  await evaluate(`(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
    document.querySelector('.app-body')?.style.setProperty('--left-panel-width', '37%');
  })()`);
  await wait(180);
  const targetNav = await evaluate(`(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value ? [value.left, value.right, value.top, value.bottom] : null;
    };
    return {
      viewport: [innerWidth, innerHeight],
      columns: getComputedStyle(document.querySelector('.workbench-mode-tabs')).gridTemplateColumns,
      nav: rect('.workbench-mode-tabs'),
      brand: rect('.workspace-brand'),
      tabSurface: rect('.workspace-nav-tabs'),
      actionSurface: rect('.workspace-shell-actions'),
      firstTab: rect('[data-tour-id="tab-repo"]'),
      skillTab: rect('[data-tour-id="tab-skill-hub"]'),
      project: rect('.active-project-switch'),
      settings: rect('.workspace-settings'),
      controls: rect('.workspace-window-controls'),
    };
  })()`);
  if (!targetNav.settings || !targetNav.controls || !targetNav.tabSurface || !targetNav.actionSurface
      || targetNav.controls[1] > targetNav.viewport[0] - 8
      || targetNav.settings[2] > targetNav.nav[2] + 10 || targetNav.controls[2] > targetNav.nav[2] + 10
      || targetNav.brand[1] >= targetNav.tabSurface[0] || targetNav.tabSurface[1] >= targetNav.actionSurface[0]) {
    throw new Error(`target navigation geometry mismatch: ${JSON.stringify(targetNav)}`);
  }
  const targetScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(targetScreenshotPath, Buffer.from(targetScreenshot.data, 'base64'));

  await setViewport(2048, 1152);
  await wait(120);
  const shellScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(shellScreenshotPath, Buffer.from(shellScreenshot.data, 'base64'));

  const skillHubTopline = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    document.querySelector('[data-tour-id="tab-skill-hub"]')?.click();
    await wait(160);
    const row = document.querySelector('.skill-hub-command-row');
    const rowRect = row?.getBoundingClientRect();
    const tabsRect = row?.querySelector('.browser-tabs')?.getBoundingClientRect();
    const formRect = row?.querySelector('form')?.getBoundingClientRect();
    const channels = row ? getComputedStyle(row).backgroundColor.match(/[0-9.]+/g)?.map(Number) || [] : [];
    return {
      exists: Boolean(row),
      height: rowRect?.height || 0,
      geometry: {
        row: rowRect ? [rowRect.left, rowRect.top, rowRect.right, rowRect.bottom] : null,
        tabs: tabsRect ? [tabsRect.left, tabsRect.top, tabsRect.right, tabsRect.bottom] : null,
        form: formRect ? [formRect.left, formRect.top, formRect.right, formRect.bottom] : null,
      },
      oneLine: Boolean(rowRect && tabsRect && formRect
        && Math.abs((tabsRect.top + tabsRect.bottom) / 2 - (formRect.top + formRect.bottom) / 2) <= 2
        && tabsRect.bottom <= rowRect.bottom
        && formRect.bottom <= rowRect.bottom),
      blueSurface: channels.length >= 3 && channels[2] > channels[0] && channels[2] > channels[1],
      redundantBarsRemoved: !document.querySelector('.browser-shell-header')
        && !document.querySelector('.browser-toolbar--skillHub')
        && !document.querySelector('.browser-current-url'),
    };
  })()`);
  if (!skillHubTopline.exists || skillHubTopline.height > 64 || !skillHubTopline.oneLine
      || !skillHubTopline.blueSurface || !skillHubTopline.redundantBarsRemoved) {
    throw new Error(`Skill Hub top line mismatch: ${JSON.stringify(skillHubTopline)}`);
  }
  const skillHubScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(skillHubScreenshotPath, Buffer.from(skillHubScreenshot.data, 'base64'));

  await setViewport(2048, 1105);
  await evaluate(`(() => {
    document.querySelector('[data-tour-id="tab-explore"]')?.click();
    const body = document.querySelector('.app-body');
    if (body?.classList.contains('app-body--left-collapsed')) document.querySelector('[data-tour-id="agent-panel-toggle"]')?.click();
    body?.style.setProperty('--left-panel-width', '30%');
  })()`);
  await wait(180);
  const dashboardScroll = await evaluate(`(() => {
    const inspect = (selector) => {
      let list = document.querySelector(selector);
      const section = document.querySelector(selector === '.explore-session-list'
        ? '.explore-session-history'
        : '.explore-knowledge-preview');
      const injectedForStyleCheck = !list && Boolean(section);
      if (injectedForStyleCheck) {
        list = document.createElement('ul');
        list.className = selector.slice(1);
        section.append(list);
      }
      const listRect = list?.getBoundingClientRect();
      const sectionRect = section?.getBoundingClientRect();
      const result = {
        overflowY: list ? getComputedStyle(list).overflowY : '',
        gutter: list ? getComputedStyle(list).scrollbarGutter : '',
        insideSection: Boolean(listRect && sectionRect
          && listRect.left >= sectionRect.left
          && listRect.right <= sectionRect.right
          && listRect.bottom <= sectionRect.bottom + 1),
      };
      if (injectedForStyleCheck) list.remove();
      return result;
    };
    const knowledgePath = document.querySelector('.explore-knowledge-main > small');
    return {
      history: inspect('.explore-session-list'),
      knowledge: inspect('.explore-knowledge-list'),
      knowledgePath: knowledgePath ? {
        overflow: getComputedStyle(knowledgePath).overflow,
        textOverflow: getComputedStyle(knowledgePath).textOverflow,
        whiteSpace: getComputedStyle(knowledgePath).whiteSpace,
        insideRow: knowledgePath.getBoundingClientRect().right
          <= knowledgePath.closest('.explore-knowledge-row').getBoundingClientRect().right + 1,
      } : null,
    };
  })()`);
  if (dashboardScroll.history.overflowY !== 'scroll'
      || dashboardScroll.knowledge.overflowY !== 'scroll'
      || !dashboardScroll.history.gutter.includes('stable')
      || !dashboardScroll.knowledge.gutter.includes('stable')
      || !dashboardScroll.history.insideSection
      || !dashboardScroll.knowledge.insideSection
      || dashboardScroll.knowledgePath?.textOverflow !== 'ellipsis'
      || dashboardScroll.knowledgePath?.whiteSpace !== 'nowrap'
      || !dashboardScroll.knowledgePath?.insideRow) {
    throw new Error(`Explore dashboard scroll containment mismatch: ${JSON.stringify(dashboardScroll)}`);
  }
  const exploreHomeScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(exploreHomeScreenshotPath, Buffer.from(exploreHomeScreenshot.data, 'base64'));

  await setViewport(1573, 1276);
  await evaluate(`(() => {
    const body = document.querySelector('.app-body');
    if (body && !body.classList.contains('app-body--left-collapsed')) document.querySelector('[data-tour-id="agent-panel-toggle"]')?.click();
  })()`);
  await wait(180);
  const tallTarget = await evaluate(`(() => {
    const entries = [...document.querySelectorAll('.explore-entry-card')].map((entry) => entry.getBoundingClientRect().height);
    const dashboard = document.querySelector('.explore-home-dashboard-grid')?.getBoundingClientRect();
    const panel = document.querySelector('.explore-panel')?.getBoundingClientRect();
    const header = document.querySelector('.explore-home-header')?.getBoundingClientRect();
    const connection = document.querySelector('.explore-home-status-row .explore-connection-status')?.getBoundingClientRect();
    const controls = document.querySelector('.workspace-window-controls')?.getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight],
      entries,
      dashboardHeight: dashboard?.height || 0,
      controlsRight: controls?.right || 0,
      connectionCompact: Boolean(connection && connection.width > 300 && connection.height >= 48 && connection.height <= 58),
      connectionInsideHero: Boolean(connection && header && connection.top >= header.top && connection.bottom <= header.bottom + 1),
      connectionIsLeftCard: Boolean(connection && panel && connection.left <= panel.left + 30 && connection.right <= panel.left + panel.width * 0.55),
    };
  })()`);
  if (tallTarget.entries.some((height) => height < 490) || tallTarget.dashboardHeight < 480 || tallTarget.controlsRight > 1565 || !tallTarget.connectionCompact || !tallTarget.connectionInsideHero || !tallTarget.connectionIsLeftCard) {
    throw new Error(`tall target layout mismatch: ${JSON.stringify(tallTarget)}`);
  }
  const tallTargetScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(tallTargetScreenshotPath, Buffer.from(tallTargetScreenshot.data, 'base64'));

  await setViewport(1448, 1086);
  await evaluate(`document.querySelector('[data-tour-id="explore-idea"]')?.click()`);
  await wait(180);
  const ideaWorkspace = await evaluate(`(() => {
    const panel = document.querySelector('[data-tour-id="panel-explore-idea"]');
    const form = panel?.querySelector('.explore-form');
    const input = panel?.querySelector('.explore-input-pane');
    const output = panel?.querySelector('.explore-output-pane');
    const conversation = panel?.querySelector('.explore-conversation');
    const artwork = panel?.querySelector('.explore-idea-visual img');
    const cta = panel?.querySelector('.explore-primary-cta');
    const header = panel?.querySelector('.explore-flow-header');
    const back = panel?.querySelector('.explore-back-button');
    const headerCopy = panel?.querySelector('.explore-flow-header > div');
    const draftStatus = panel?.querySelector('.explore-session-status.is-draft');
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const inside = (inner, outer) => {
      const innerRect = inner?.getBoundingClientRect();
      const outerRect = outer?.getBoundingClientRect();
      return Boolean(innerRect && outerRect && innerRect.left >= outerRect.left && innerRect.right <= outerRect.right && innerRect.top >= outerRect.top && innerRect.bottom <= outerRect.bottom + 1);
    };
    return {
      exists: Boolean(panel),
      columns: form ? getComputedStyle(form).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      conversationInsideInput: inside(conversation, input),
      artworkLoaded: Boolean(artwork?.complete && artwork.naturalWidth >= 1400 && artwork.naturalHeight >= 800),
      promptCount: panel?.querySelectorAll('.explore-idea-prompts button').length || 0,
      stageDescriptions: panel?.querySelectorAll('.explore-stage-copy small').length || 0,
      ctaHasIcons: cta?.querySelectorAll('svg').length === 2,
      backButtonVisible: Boolean(back && header
        && back.getBoundingClientRect().width >= 44
        && back.getBoundingClientRect().left >= header.getBoundingClientRect().left
        && back.getBoundingClientRect().right <= header.getBoundingClientRect().right
        && back.getBoundingClientRect().top >= header.getBoundingClientRect().top
        && back.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom),
      headerContainsCopy: Boolean(headerCopy && header
        && headerCopy.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom - 8),
      draftStatusHidden: !draftStatus || getComputedStyle(draftStatus).display === 'none',
      diagnosisHeaderGeometry: Boolean(header && back
        && Math.abs(header.getBoundingClientRect().height - 132) <= 2
        && Math.abs(back.getBoundingClientRect().width - 48) <= 1
        && Math.abs(back.getBoundingClientRect().height - 48) <= 1),
      outputTallerThanInput: Boolean(output && input && output.getBoundingClientRect().height >= input.getBoundingClientRect().height),
      darkCanvas: Boolean(panelStyle?.backgroundImage.includes('radial-gradient') && panelStyle.backgroundImage.includes('linear-gradient')),
    };
  })()`);
  if (!ideaWorkspace.exists || ideaWorkspace.columns !== 2 || !ideaWorkspace.conversationInsideInput || !ideaWorkspace.artworkLoaded
      || ideaWorkspace.promptCount !== 5 || ideaWorkspace.stageDescriptions !== 4 || !ideaWorkspace.ctaHasIcons
      || !ideaWorkspace.backButtonVisible || !ideaWorkspace.headerContainsCopy || !ideaWorkspace.draftStatusHidden
      || !ideaWorkspace.diagnosisHeaderGeometry
      || !ideaWorkspace.outputTallerThanInput || !ideaWorkspace.darkCanvas) {
    throw new Error(`idea workspace layout mismatch: ${JSON.stringify(ideaWorkspace)}`);
  }
  const ideaWorkspaceScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(ideaWorkspaceScreenshotPath, Buffer.from(ideaWorkspaceScreenshot.data, 'base64'));
  const sessionCountBeforeBlankReturn = await evaluate(`window.__exploreSessions.length`);
  await evaluate(`document.querySelector('.explore-back-button')?.click()`);
  await wait(120);
  const draftLifecycle = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const sessionCountAfterBlankReturn = window.__exploreSessions.length;
    const rename = document.querySelector('.explore-session-rename-action');
    rename?.click();
    await wait(30);
    const input = document.querySelector('.explore-session-rename input');
    const renameForm = document.querySelector('.explore-session-rename');
    const renameRow = renameForm?.closest('li');
    const formRect = renameForm?.getBoundingClientRect();
    const rowRect = renameRow?.getBoundingClientRect();
    const renameLayoutValid = Boolean(formRect && rowRect && input
      && formRect.left >= rowRect.left && formRect.right <= rowRect.right
      && input.getBoundingClientRect().width >= 120
      && renameForm.querySelectorAll('button').length === 2);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '我的桌面设备灵感');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.closest('form').requestSubmit();
    await wait(100);
    const renamed = window.__exploreSessions.find((item) => item.title === '我的桌面设备灵感');
    document.querySelector('[data-explore-session-id="' + renamed?.id + '"]')?.click();
    await wait(100);
    document.querySelector('.explore-back-button')?.click();
    await wait(100);
    return {
      sessionCountBeforeBlankReturn: ${sessionCountBeforeBlankReturn},
      sessionCountAfterBlankReturn,
      renamedTitle: renamed?.title || '',
      titleAfterReopen: window.__exploreSessions.find((item) => item.id === renamed?.id)?.title || '',
      renameLayoutValid,
      renameEditorClosed: !document.querySelector('.explore-session-rename'),
    };
  })()`);
  if (draftLifecycle.sessionCountAfterBlankReturn !== draftLifecycle.sessionCountBeforeBlankReturn - 1
      || draftLifecycle.renamedTitle !== '我的桌面设备灵感' || draftLifecycle.titleAfterReopen !== '我的桌面设备灵感'
      || !draftLifecycle.renameLayoutValid || !draftLifecycle.renameEditorClosed) {
    throw new Error(`Explore draft lifecycle/rename mismatch: ${JSON.stringify(draftLifecycle)}`);
  }

  await setViewport(1448, 1086);
  await evaluate(`document.querySelector('[data-tour-id="explore-diagnosis"]')?.click()`);
  await wait(180);
  const diagnosisWorkspace = await evaluate(`(() => {
    const panel = document.querySelector('[data-tour-id="panel-explore-diagnosis"]');
    const form = panel?.querySelector('.explore-form');
    const input = panel?.querySelector('.explore-input-pane');
    const output = panel?.querySelector('.explore-output-pane');
    const artwork = panel?.querySelector('.explore-diagnosis-visual img');
    const cta = panel?.querySelector('.explore-primary-cta');
    const question = panel?.querySelector('.explore-diagnosis-question');
    const header = panel?.querySelector('.explore-flow-header');
    const back = panel?.querySelector('.explore-back-button');
    const headerCopy = panel?.querySelector('.explore-flow-header > div');
    const draftStatus = panel?.querySelector('.explore-session-status.is-draft');
    const panelStyle = panel ? getComputedStyle(panel) : null;
    return {
      exists: Boolean(panel),
      columns: form ? getComputedStyle(form).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      questionCardVisible: Boolean(question && question.getBoundingClientRect().height >= 130),
      backButtonVisible: Boolean(back && header
        && back.getBoundingClientRect().width >= 44
        && back.getBoundingClientRect().left >= header.getBoundingClientRect().left
        && back.getBoundingClientRect().right <= header.getBoundingClientRect().right
        && back.getBoundingClientRect().top >= header.getBoundingClientRect().top
        && back.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom),
      headerContainsCopy: Boolean(headerCopy && header
        && headerCopy.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom - 8),
      draftStatusHidden: !draftStatus || getComputedStyle(draftStatus).display === 'none',
      contextCardCount: panel?.querySelectorAll('.explore-context-row').length || 0,
      artworkLoaded: Boolean(artwork?.complete && artwork.naturalWidth >= 1400 && artwork.naturalHeight >= 800),
      stageDescriptions: panel?.querySelectorAll('.explore-stage-copy small').length || 0,
      ctaHasIcons: cta?.querySelectorAll('svg').length === 2,
      outputTallerThanInput: Boolean(output && input && output.getBoundingClientRect().height >= input.getBoundingClientRect().height),
      darkCanvas: Boolean(panelStyle?.backgroundImage.includes('radial-gradient') && panelStyle.backgroundImage.includes('linear-gradient')),
    };
  })()`);
  if (!diagnosisWorkspace.exists || diagnosisWorkspace.columns !== 2 || !diagnosisWorkspace.questionCardVisible
      || !diagnosisWorkspace.backButtonVisible || !diagnosisWorkspace.headerContainsCopy
      || !diagnosisWorkspace.draftStatusHidden
      || diagnosisWorkspace.contextCardCount < 5 || !diagnosisWorkspace.artworkLoaded
      || diagnosisWorkspace.stageDescriptions !== 4 || !diagnosisWorkspace.ctaHasIcons
      || !diagnosisWorkspace.outputTallerThanInput || !diagnosisWorkspace.darkCanvas) {
    throw new Error(`diagnosis workspace layout mismatch: ${JSON.stringify(diagnosisWorkspace)}`);
  }
  const diagnosisWorkspaceScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(diagnosisWorkspaceScreenshotPath, Buffer.from(diagnosisWorkspaceScreenshot.data, 'base64'));
  await evaluate(`document.querySelector('.explore-back-button')?.click()`);
  await wait(120);

  await setViewport(2560, 1440);
  const flowResult = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const body = document.querySelector('.app-body');
    if (body.classList.contains('app-body--left-collapsed')) document.querySelector('[data-tour-id="agent-panel-toggle"]').click();
    body.style.setProperty('--left-panel-width', '34%');
    document.querySelector('[data-tour-id="explore-diagnosis"]').click();
    for (let attempt = 0; attempt < 40 && !document.querySelector('.explore-diagnosis-question textarea'); attempt += 1) await wait(50);
    const textarea = document.querySelector('.explore-diagnosis-question textarea');
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
    const executeButton = () => document.querySelector('.explore-stage-nav li:nth-child(4) button');
    for (let attempt = 0; attempt < 80 && executeButton()?.disabled; attempt += 1) await wait(50);
    if (!executeButton()?.disabled) executeButton().click();
    for (let attempt = 0; attempt < 40 && !document.querySelector('.explore-artifact-view'); attempt += 1) await wait(50);
    const confirm = document.querySelector('[data-tour-id="explore-confirm-execution"]');
    const executeStage = document.querySelector('.explore-stage-nav [aria-current="step"]')?.textContent || '';
    const artifactVisible = Boolean(document.querySelector('.explore-artifact-view pre'));
    const fixedTheme = {
      dataset: document.documentElement.dataset.theme,
      colorScheme: document.documentElement.style.colorScheme,
      legacyPreference: window.localStorage.getItem('vibeide.appearance.theme'),
      themeToggleCount: document.querySelectorAll('[aria-label="切换到浅色模式"], [aria-label="切换到深色模式"]').length,
    };
    document.querySelector('.explore-back-button').click();
    await wait(50);
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
      fixedTheme,
    };
  })()`);
  if (flowResult.panelWidth < 1200 || flowResult.formColumns !== 2) throw new Error(`wide flow did not use two columns: ${JSON.stringify(flowResult)}`);
  if (!flowResult.evidence.includes('80MHz') || !flowResult.conflicts.includes('官方时序') || !flowResult.sourceExcerpt.includes('来源摘要')) throw new Error(`diagnosis evidence UI incomplete: ${JSON.stringify(flowResult)}`);
  if (!flowResult.analysisStage.includes('查看结论') || !flowResult.planStage.includes('确认计划') || !flowResult.executeStage.includes('执行')) throw new Error(`stage navigation mismatch: ${JSON.stringify(flowResult)}`);
  if (flowResult.planSteps !== 2 || !flowResult.artifactVisible || !flowResult.confirmEnabled || !flowResult.priorResultCollapsed) throw new Error(`plan/artifact gate UI mismatch: ${JSON.stringify(flowResult)}`);
  if (!flowResult.sourceButtonHeights.length || flowResult.sourceButtonHeights.some((height) => height < 36)) throw new Error(`source actions are not prominent enough: ${JSON.stringify(flowResult.sourceButtonHeights)}`);
  if (!flowResult.returnPreserved || !flowResult.workspaceSwitchPreserved) throw new Error(`Explore work was lost during navigation: ${JSON.stringify(flowResult)}`);
  if (flowResult.fixedTheme.dataset !== 'dark' || flowResult.fixedTheme.colorScheme !== 'dark'
    || flowResult.fixedTheme.legacyPreference !== null || flowResult.fixedTheme.themeToggleCount !== 0) {
    throw new Error(`the product must expose only the fixed dark theme: ${JSON.stringify(flowResult.fixedTheme)}`);
  }

  const scaledDisplayLayouts = [];
  for (const [width, height, source] of [
    [1280, 720, '1920x1080 @ 150%'],
    [1707, 960, '2560x1440 @ 150%'],
    [1707, 1067, '2560x1600 @ 150%'],
  ]) {
    await setViewport(width, height);
    const layout = await evaluate(`(() => {
      const viewportWidth = window.innerWidth;
      const nav = document.querySelector('.workspace-global-nav');
      const boxes = [...document.querySelectorAll('.workspace-global-nav > .workspace-shell-box')];
      const body = document.querySelector('.app-body');
      const panel = document.querySelector('.explore-panel');
      const chatConversation = document.querySelector('.chat-conversation');
      const chatComposer = document.querySelector('.chat-input');
      const chatHistoryMain = document.querySelector('.chat-history-main');
      const flowHeader = document.querySelector('.explore-flow-header');
      const stageNav = document.querySelector('.explore-stage-nav');
      const windowButtons = [...document.querySelectorAll('.workspace-window-controls button')];
      const rect = (element) => element ? element.getBoundingClientRect() : null;
      const navRect = rect(nav);
      const bodyRect = rect(body);
      const panelRect = rect(panel);
      return {
        viewport: [window.innerWidth, window.innerHeight],
        documentFits: document.documentElement.scrollWidth <= viewportWidth + 1,
        navFits: Boolean(navRect && navRect.left >= -1 && navRect.right <= viewportWidth + 1),
        boxesFit: boxes.length === 3 && boxes.every((box) => {
          const boxRect = rect(box);
          return boxRect && boxRect.width > 0 && boxRect.left >= -1 && boxRect.right <= viewportWidth + 1;
        }),
        bodyFits: Boolean(bodyRect && bodyRect.left >= -1 && bodyRect.right <= viewportWidth + 1),
        panelFits: Boolean(panelRect && panelRect.width >= 420 && panelRect.right <= viewportWidth + 1),
        panelScrollsVertically: Boolean(panel && panel.scrollHeight >= panel.clientHeight),
        panelHasNoHorizontalClip: Boolean(panel && panel.scrollWidth <= panel.clientWidth + 2),
        controlsUsable: windowButtons.length === 3 && windowButtons.every((button) => rect(button).width >= 30),
        chatConversationUsable: Boolean(chatConversation && rect(chatConversation).width >= 260),
        chatComposerVisible: Boolean(chatComposer && rect(chatComposer).bottom <= window.innerHeight + 1),
        compactHistoryRail: getComputedStyle(chatHistoryMain).display === 'none',
        stageNavInsideHeader: Boolean(flowHeader && stageNav && rect(stageNav).bottom <= rect(flowHeader).bottom + 1),
      };
    })()`);
    const screenshotPath = path.join(outputDir, `scaled-${width}x${height}.png`);
    const screenshot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    scaledDisplayLayouts.push({ source, screenshotPath, ...layout });
  }
  if (scaledDisplayLayouts.some((layout) => !layout.documentFits || !layout.navFits || !layout.boxesFit
    || !layout.bodyFits || !layout.panelFits || !layout.panelHasNoHorizontalClip || !layout.controlsUsable
    || !layout.chatConversationUsable || !layout.chatComposerVisible || !layout.stageNavInsideHeader)) {
    throw new Error(`scaled display layout overflow: ${JSON.stringify(scaledDisplayLayouts)}`);
  }
  if (!scaledDisplayLayouts[0].compactHistoryRail) {
    throw new Error(`1280x720 must collapse chat history to its icon rail: ${JSON.stringify(scaledDisplayLayouts[0])}`);
  }
  await setViewport(2048, 1152);

  const concurrentModeSwitch = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    document.querySelector('.explore-back-button')?.click();
    await wait(100);
    document.querySelector('[data-tour-id="explore-idea"]')?.click();
    await wait(140);
    window.__analysisDelay = 700;
    const textarea = document.querySelector('[data-tour-id="panel-explore-idea"] textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, '我想做一个桌面语音陪伴机器人');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(30);
    textarea.closest('form').requestSubmit();
    await wait(90);
    const skillActivityWhilePending = document.querySelectorAll('[data-zhihu-skill-activity="true"]').length;
    document.querySelector('.explore-back-button')?.click();
    await wait(90);
    document.querySelector('[data-tour-id="explore-diagnosis"]')?.click();
    await wait(160);
    const switchedToDiagnosis = Boolean(document.querySelector('[data-tour-id="panel-explore-diagnosis"]'));
    const diagnosisTitleWhileIdeaRuns = document.querySelector('.explore-flow-header h2')?.textContent || '';
    await wait(850);
    const stayedOnDiagnosis = Boolean(document.querySelector('[data-tour-id="panel-explore-diagnosis"]'));
    const backgroundIdeaPersisted = window.__exploreSessions.some((item) => item.mode === 'idea' && item.status === 'result_ready' && item.snapshot.analysisResult?.mode === 'idea');
    document.querySelector('.explore-back-button')?.click();
    await wait(90);
    document.querySelector('[data-tour-id="explore-idea"]')?.click();
    await wait(140);
    window.__analysisDelay = 20;
    const nextTextarea = document.querySelector('[data-tour-id="panel-explore-idea"] textarea');
    if (nextTextarea) {
      setter.call(nextTextarea, '我想做一个桌面语音陪伴机器人');
      nextTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(30);
      nextTextarea.closest('form').requestSubmit();
      await wait(220);
    }
    const ideaCard = document.querySelector('.explore-idea-option');
    const ideaCardStyle = ideaCard ? getComputedStyle(ideaCard) : null;
    const reading = ideaCard?.querySelector('.explore-reading-copy');
    const readingStyle = reading ? getComputedStyle(reading) : null;
    document.querySelector('.explore-source-open')?.click();
    await wait(40);
    return {
      skillActivityWhilePending,
      switchedToDiagnosis,
      diagnosisTitleWhileIdeaRuns,
      stayedOnDiagnosis,
      backgroundIdeaPersisted,
      ideaResultRestored: Boolean(ideaCard),
      activePanel: document.querySelector('.explore-panel--flow')?.className || '',
      ideaSessions: window.__exploreSessions.filter((item) => item.mode === 'idea').map((item) => ({ id: item.id, status: item.status, resultMode: item.snapshot.analysisResult?.mode || '', stage: item.snapshot.displayStage })),
      ideaCardBackground: ideaCardStyle?.backgroundImage || '',
      ideaCardText: readingStyle?.color || '',
      openedExternalUrl: window.__openedExternalUrl || '',
    };
  })()`);
  if (concurrentModeSwitch.skillActivityWhilePending < 2 || !concurrentModeSwitch.switchedToDiagnosis
      || !concurrentModeSwitch.diagnosisTitleWhileIdeaRuns.includes('解问题') || !concurrentModeSwitch.stayedOnDiagnosis || !concurrentModeSwitch.backgroundIdeaPersisted
      || !concurrentModeSwitch.ideaResultRestored || !concurrentModeSwitch.ideaCardBackground.includes('linear-gradient')
      || concurrentModeSwitch.ideaCardText === 'rgb(255, 255, 255)'
      || concurrentModeSwitch.openedExternalUrl !== 'https://www.zhihu.com/question/ui-smoke-idea') {
    throw new Error(`concurrent Explore mode/source regression: ${JSON.stringify(concurrentModeSwitch)}`);
  }
  if (consoleErrors.length) throw new Error(`renderer errors: ${JSON.stringify(consoleErrors)}`);

  fs.mkdirSync(outputDir, { recursive: true });
  await setViewport(1565, 1304);
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ chatShell, targetNav, skillHubTopline, dashboardScroll, tallTarget, ideaWorkspace, draftLifecycle, diagnosisWorkspace, scenarios, flowResult, scaledDisplayLayouts, concurrentModeSwitch, entryScreenshotPath, targetScreenshotPath, shellScreenshotPath, skillHubScreenshotPath, exploreHomeScreenshotPath, tallTargetScreenshotPath, ideaWorkspaceScreenshotPath, diagnosisWorkspaceScreenshotPath, screenshotPath, consoleErrors }, null, 2));
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
