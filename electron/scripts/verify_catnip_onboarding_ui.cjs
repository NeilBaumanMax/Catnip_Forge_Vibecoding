const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const cdpList = 'http://127.0.0.1:9331/json';
const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-onboarding-ui-'));
const outputDir = path.join(root, '.tmp');
const outputPath = path.join(outputDir, 'catnip-onboarding-ui.png');
let vite;
let chrome;
let socket;
let callId = 0;

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

async function waitForJson(url, predicate, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await fetch(url).then((response) => response.json());
      if (!predicate || predicate(value)) return value;
    } catch {}
    await wait(250);
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function waitForHttp(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(250);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'renderer evaluation failed');
  return result.result?.value;
}

async function main() {
  const chromePath = findExecutable(
    path.join(root, 'dist-package', 'win-unpacked', 'resources', 'runtime', 'playwright'),
    'chrome-headless-shell.exe',
  );
  if (!chromePath) throw new Error('packaged Playwright Chromium was not found; run pack:win first');

  vite = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForHttp('http://127.0.0.1:5173');

  chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    '--remote-debugging-port=9331',
    `--user-data-dir=${tempProfile}`,
    'http://127.0.0.1:5173/?onboardingSmoke=1',
  ], { stdio: 'ignore' });

  const targets = await waitForJson(cdpList, (items) => items.some((item) => item.type === 'page'));
  const target = targets.find((item) => item.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  await call('Page.navigate', { url: 'http://127.0.0.1:5173/?onboardingSmoke=1' });
  await wait(2_200);

  const result = await evaluate(`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const click = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error('missing ' + selector);
      element.click();
    };
    const title = () => document.querySelector('.catnip-onboarding-card h2')?.textContent || '';
    const targetReady = () => {
      const spotlight = document.querySelector('.catnip-onboarding-spotlight');
      const rect = spotlight?.getBoundingClientRect();
      return Boolean(rect && rect.width > 20 && rect.height > 20);
    };

    for (let attempt = 0; attempt < 30 && !document.querySelector('.catnip-onboarding-invitation'); attempt += 1) {
      await wait(100);
    }
    const invitation = document.querySelector('.catnip-onboarding-invitation');
    if (!invitation) {
      throw new Error('invitation unavailable: ' + document.body.innerText.slice(0, 500) + ' / api=' + typeof window.electronAPI);
    }
    const invitationText = invitation?.textContent || '';
    click('.catnip-onboarding-invitation .is-primary');
    await wait(120);
    const welcome = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const agent = title();
    const agentTargetReady = targetReady();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const repositoryPrompt = title();
    click('[data-tour-id="tab-repo"]');
    await wait(160);
    const repositorySkills = title();
    let repositoryTargetReady = targetReady();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(200);
    const repositoryResources = title();
    repositoryTargetReady = repositoryTargetReady || targetReady();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    click('[data-tour-id="tab-monitor"]');
    await wait(150);
    const monitor = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    click('[data-tour-id="tab-tasks"]');
    await wait(150);
    const tasksBuild = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const tasksFlash = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const tasksResults = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    click('[data-tour-id="tab-editor"]');
    await wait(150);
    const editor = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const editorCollapse = title();
    click('[data-tour-id="agent-panel-toggle"]');
    await wait(420);
    const collapsedToggle = document.querySelector('[data-tour-id="agent-panel-toggle"]')?.getBoundingClientRect();
    const collapsedSpotlight = document.querySelector('.catnip-onboarding-spotlight')?.getBoundingClientRect();
    const spotlightFollowsCollapsedToggle = Boolean(collapsedToggle && collapsedSpotlight
      && Math.abs((collapsedToggle.left + collapsedToggle.width / 2) - (collapsedSpotlight.left + collapsedSpotlight.width / 2)) < 10
      && Math.abs((collapsedToggle.top + collapsedToggle.height / 2) - (collapsedSpotlight.top + collapsedSpotlight.height / 2)) < 10);
    const collapsedTracking = {
      toggle: collapsedToggle ? { left: collapsedToggle.left, top: collapsedToggle.top, width: collapsedToggle.width, height: collapsedToggle.height } : null,
      spotlight: collapsedSpotlight ? { left: collapsedSpotlight.left, top: collapsedSpotlight.top, width: collapsedSpotlight.width, height: collapsedSpotlight.height } : null,
    };
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const editorFont = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(300);
    const history = title();
    const agentRestored = Boolean(
      document.querySelector('[data-tour-id="agent-workspace"]')
      && document.querySelector('[data-tour-id="chat-history"]')
      && document.querySelector('[data-tour-id="agent-panel-toggle"][aria-label="收起对话区"]')
      && !document.querySelector('.catnip-onboarding-hint.is-warning')
    );
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const professional = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(100);
    const composer = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const attachments = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const skills = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(80);
    const assistantPrompt = title();
    click('[data-tour-id="assistant-trigger"]');
    await wait(160);
    const assistant = title();
    const assistantInitiallyRestored = Boolean(
      document.querySelector('.software-assistant-popover')
      && !document.querySelector('.catnip-onboarding-hint.is-warning')
    );
    click('.software-assistant-actions [aria-label="关闭助手"]');
    await wait(600);
    const assistantRestoredAfterClose = Boolean(
      document.querySelector('.software-assistant-popover')
      && !document.querySelector('.catnip-onboarding-hint.is-warning')
      && !document.querySelector('.catnip-onboarding-hint:not(.is-warning)')
    );
    const assistantRestored = assistantInitiallyRestored && assistantRestoredAfterClose;
    click('.catnip-onboarding-card footer .is-primary');
    await wait(100);
    const complete = title();
    click('.catnip-onboarding-card footer .is-primary');
    await wait(100);
    const stored = JSON.parse(localStorage.getItem('vibeide.onboarding.catnipJourney') || 'null');
    const closedAfterCompletion = !document.querySelector('.catnip-onboarding-card');

    if (!document.querySelector('.software-assistant-popover')) {
      click('.appearance-settings-trigger');
      await wait(120);
    }
    click('.software-assistant-actions [aria-label="打开新手教程"]');
    await wait(120);
    const replay = title();

    return {
      invitationText,
      welcome,
      agent,
      agentTargetReady,
      repositoryPrompt,
      repositorySkills,
      repositoryResources,
      repositoryTargetReady,
      monitor,
      tasksBuild,
      tasksFlash,
      tasksResults,
      editor,
      editorCollapse,
      spotlightFollowsCollapsedToggle,
      collapsedTracking,
      editorFont,
      history,
      agentRestored,
      professional,
      composer,
      attachments,
      skills,
      assistantPrompt,
      assistant,
      assistantRestored,
      assistantRestoredAfterClose,
      complete,
      stored,
      closedAfterCompletion,
      replay
    };
  })()`);

  const checks = [
    result.invitationText.includes('全程离线'),
    result.welcome.includes('认识工作区'),
    result.agent.includes('把目标告诉 Agent'),
    result.agentTargetReady,
    result.repositoryPrompt.includes('点击“仓库”'),
    result.repositorySkills.includes('专业能力'),
    result.repositoryResources.includes('硬件工程与参考代码'),
    result.monitor.includes('收发与配置'),
    result.tasksBuild.includes('刷新工程'),
    result.tasksFlash.includes('选择串口'),
    result.tasksResults.includes('执行情况'),
    result.editor.includes('左侧选文件'),
    result.editorCollapse.includes('收起 Agent'),
    result.spotlightFollowsCollapsedToggle,
    result.editorFont.includes('字体'),
    result.history.includes('自动保存'),
    result.agentRestored,
    result.professional.includes('专业视图'),
    result.composer.includes('完整目标'),
    result.attachments.includes('附件'),
    result.skills.includes('Skills'),
    result.assistantPrompt.includes('猫薄荷'),
    result.assistant.includes('问猫薄荷'),
    result.assistantRestored,
    result.complete.includes('One Prompt'),
    result.stored?.status === 'completed',
    result.closedAfterCompletion,
    result.replay.includes('认识工作区'),
  ];
  if (checks.some((value) => !value)) {
    throw new Error(`onboarding UI flow failed: ${JSON.stringify(result)}`);
  }

  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ ok: true, screenshot: outputPath, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}).finally(() => {
  try { socket?.close(); } catch {}
  killTree(chrome);
  killTree(vite);
  try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
  setTimeout(() => process.exit(process.exitCode || 0), 50);
});
