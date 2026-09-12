const fs = require('node:fs');
const path = require('node:path');
const CDP_LIST = 'http://127.0.0.1:9230/json';

async function call(socket, id, method, params = {}, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    };
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      reject(new Error(`${method} timed out`));
    }, timeoutMs);
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function capturePage(socket, allocateId) {
  try {
    return await call(socket, allocateId(), 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 5_000);
  } catch (captureError) {
    let frameSessionId = null;
    let onFrame;
    const frame = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.removeEventListener('message', onFrame);
        reject(new Error(`Page.startScreencast timed out after capture failure: ${captureError.message}`));
      }, 5_000);
      onFrame = (event) => {
        const message = JSON.parse(String(event.data));
        if (message.method !== 'Page.screencastFrame') return;
        clearTimeout(timer);
        socket.removeEventListener('message', onFrame);
        frameSessionId = message.params.sessionId;
        resolve({ data: message.params.data });
      };
      socket.addEventListener('message', onFrame);
    });
    try {
      await call(socket, allocateId(), 'Page.startScreencast', { format: 'png', everyNthFrame: 1 }, 5_000);
      const result = await frame;
      if (frameSessionId != null) {
        await call(socket, allocateId(), 'Page.screencastFrameAck', { sessionId: frameSessionId }, 5_000);
      }
      return result;
    } finally {
      socket.removeEventListener('message', onFrame);
      await call(socket, allocateId(), 'Page.stopScreencast', {}, 5_000).catch(() => {});
    }
  }
}

async function main() {
  const targets = await fetch(CDP_LIST).then((response) => response.json());
  const target = targets.find((entry) => entry.title?.includes('Catnip Forge'));
  if (!target?.webSocketDebuggerUrl) throw new Error('Catnip Forge renderer CDP target not found');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  try {
    await call(socket, 1, 'Page.enable');
    const evaluated = await call(socket, 2, 'Runtime.evaluate', {
      expression: `(async () => {
        const initialSelectedModelTab = document.querySelector('[data-tour-id="tab-models"]')?.getAttribute('aria-selected');
        const projectOverlay = document.querySelector('.project-picker-backdrop');
        if (projectOverlay instanceof HTMLElement) projectOverlay.style.display = 'none';
        const startupOverlay = document.querySelector('.startup-key-backdrop');
        const customSetupButton = Array.from(document.querySelectorAll('.startup-key-dialog button')).find((button) => button.textContent.includes('其他模型供应商'));
        if (customSetupButton instanceof HTMLElement) customSetupButton.click();
        else document.querySelector('[data-tour-id="tab-models"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const center = document.querySelector('.model-center');
        const grid = document.querySelector('.model-provider-workspace');
        const editor = document.querySelector('.model-provider-editor');
        const centerRect = center?.getBoundingClientRect();
        const gridRect = grid?.getBoundingClientRect();
        const editorRect = editor?.getBoundingClientRect();
        const tabs = Array.from(document.querySelectorAll('.workspace-nav-tabs [role="tab"]'));
        const providerIndicator = document.querySelector('.chat-model-select [aria-label="当前 Claude Code 供应商"]');
        return {
          viewport: { width: innerWidth, height: innerHeight },
          tabs: tabs.map((item) => ({ text: item.textContent?.trim(), visible: item.getBoundingClientRect().width > 0 })),
          selectedModelTab: document.querySelector('[data-tour-id="tab-models"]')?.getAttribute('aria-selected'),
          initialSelectedModelTab,
          startupAlternativeUsed: Boolean(startupOverlay),
          centerRect: centerRect ? { left: centerRect.left, top: centerRect.top, right: centerRect.right, bottom: centerRect.bottom } : null,
          gridRect: gridRect ? { width: gridRect.width, height: gridRect.height } : null,
          editorRect: editorRect ? { width: editorRect.width, height: editorRect.height } : null,
          providers: document.querySelectorAll('.model-provider-list > button').length,
          setupChoices: document.querySelectorAll('.model-setup-choice').length,
          activeProvider: document.querySelector('.model-active-provider')?.textContent,
          credentialCard: Boolean(document.querySelector('.model-credential-card')),
          status: document.querySelector('.model-center-status')?.textContent,
          hasLegacyModelSelect: Boolean(document.querySelector('.chat-model-select select')),
          providerIndicator: providerIndicator?.textContent,
          bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = evaluated.result?.value;
    const inside = value?.centerRect && value.centerRect.left >= 0 && value.centerRect.top >= 0
      && value.centerRect.right <= value.viewport.width && value.centerRect.bottom <= value.viewport.height;
    const maintenanceReady = value?.gridRect?.width >= 700 && value?.gridRect?.height >= 260 && value?.editorRect?.width >= 350
      && value?.providers >= 1 && value?.credentialCard && value?.activeProvider;
    const onboardingReady = value?.setupChoices === 2;
    if (value?.tabs?.length !== 7 || value.tabs.some((item) => !item.visible) || value?.selectedModelTab !== 'true'
      || !inside || (!maintenanceReady && !onboardingReady) || value?.hasLegacyModelSelect || value?.bodyOverflowX > 1) {
      throw new Error(`model center UI verification failed: ${JSON.stringify(value)}`);
    }
    if (value?.startupAlternativeUsed && value?.initialSelectedModelTab === 'true') {
      throw new Error(`first-run startup must not flash the Model workspace before the user chooses it: ${JSON.stringify(value)}`);
    }
    const responsive = [];
    let screenshotCaptured = false;
    let screenshotPath = null;
    let callId = 3;
    for (const [width, height] of [[1280, 720], [1600, 1000], [1707, 1067]]) {
      await call(socket, callId++, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await new Promise((resolve) => setTimeout(resolve, 120));
      const measured = await call(socket, callId++, 'Runtime.evaluate', {
        expression: `(() => {
          const center = document.querySelector('.model-center')?.getBoundingClientRect();
          const editor = document.querySelector('.model-provider-editor')?.getBoundingClientRect();
          return {
            bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            centerInside: Boolean(center && center.left >= 0 && center.top >= 0 && center.right <= innerWidth && center.bottom <= innerHeight),
            editorWidth: editor?.width || 0,
            legacySelect: Boolean(document.querySelector('.chat-model-select select')),
          };
        })()`,
        returnByValue: true,
      });
      const metrics = measured.result?.value;
      if (metrics?.bodyOverflowX > 1 || !metrics?.centerInside || metrics?.legacySelect || (maintenanceReady && metrics?.editorWidth < 320)) {
        throw new Error(`model center responsive verification failed at ${width}x${height}: ${JSON.stringify(metrics)}`);
      }
      responsive.push({ width, height, ...metrics });
      if (width === 1600) {
        try {
          const screenshot = await capturePage(socket, () => callId++);
          const target = path.join(
            __dirname,
            '..',
            '.tmp',
            onboardingReady ? 'phase18-claude-provider-onboarding.png' : 'phase18-claude-provider-center.png',
          );
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, Buffer.from(screenshot.data, 'base64'));
          screenshotCaptured = true;
          screenshotPath = target;
        } catch (error) {
          console.warn(`model center screenshot skipped: ${error.message}`);
        }
      }
    }
    console.log(JSON.stringify({ ok: true, ...value, responsive, screenshotCaptured, screenshotPath }, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
