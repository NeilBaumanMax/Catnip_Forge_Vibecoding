const CDP_LIST = 'http://127.0.0.1:9230/json';

async function call(socket, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 30_000);
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
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
    const evaluated = await call(socket, 1, 'Runtime.evaluate', {
      expression: `(async () => {
        const projectOverlay = document.querySelector('.project-picker-backdrop');
        if (projectOverlay instanceof HTMLElement) projectOverlay.style.display = 'none';
        document.querySelector('[data-tour-id="tab-models"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const center = document.querySelector('.model-center');
        const grid = document.querySelector('.model-center-grid');
        const editor = document.querySelector('.model-editor');
        const centerRect = center?.getBoundingClientRect();
        const gridRect = grid?.getBoundingClientRect();
        const editorRect = editor?.getBoundingClientRect();
        const tabs = Array.from(document.querySelectorAll('.workspace-nav-tabs [role="tab"]'));
        const select = document.querySelector('.chat-model-select select');
        return {
          viewport: { width: innerWidth, height: innerHeight },
          tabs: tabs.map((item) => ({ text: item.textContent?.trim(), visible: item.getBoundingClientRect().width > 0 })),
          selectedModelTab: document.querySelector('[data-tour-id="tab-models"]')?.getAttribute('aria-selected'),
          centerRect: centerRect ? { left: centerRect.left, top: centerRect.top, right: centerRect.right, bottom: centerRect.bottom } : null,
          gridRect: gridRect ? { width: gridRect.width, height: gridRect.height } : null,
          editorRect: editorRect ? { width: editorRect.width, height: editorRect.height } : null,
          providers: document.querySelectorAll('.model-provider-list > button').length,
          models: document.querySelectorAll('.model-card-list > button').length,
          credentialCard: Boolean(document.querySelector('.model-credential-card')),
          status: document.querySelector('.model-center-status')?.textContent,
          chatModelOptions: select instanceof HTMLSelectElement ? select.options.length : 0,
          bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = evaluated.result?.value;
    const inside = value?.centerRect && value.centerRect.left >= 0 && value.centerRect.top >= 0
      && value.centerRect.right <= value.viewport.width && value.centerRect.bottom <= value.viewport.height;
    if (value?.tabs?.length !== 7 || value.tabs.some((item) => !item.visible) || value?.selectedModelTab !== 'true'
      || !inside || value?.gridRect?.width < 800 || value?.gridRect?.height < 300 || value?.editorRect?.width < 250
      || value?.providers < 2 || value?.models < 2 || !value?.credentialCard || !value?.status?.includes('模型配置已同步')
      || value?.chatModelOptions < 2 || value?.bodyOverflowX > 1) {
      throw new Error(`model center UI verification failed: ${JSON.stringify(value)}`);
    }
    console.log(JSON.stringify({ ok: true, ...value }, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
