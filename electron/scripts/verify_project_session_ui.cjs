const CDP_LIST = 'http://127.0.0.1:9230/json';

async function cdpCall(socket, id, expression) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('project session UI evaluation timed out')), 20_000);
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}

async function main() {
  let target;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(CDP_LIST).then((response) => response.json());
      target = targets.find((entry) => entry.type === 'page' && entry.title?.includes('Catnip Forge ·'));
      if (target?.webSocketDebuggerUrl) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('packaged project session renderer target not found');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  try {
    const result = await cdpCall(socket, 1, `(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let attempt = 0; attempt < 80 && !document.querySelector('.project-picker-dialog'); attempt += 1) await wait(100);
      const before = await window.electronAPI.getProjectSessionStatus();
      const dialog = document.querySelector('.project-picker-dialog');
      const select = dialog?.querySelector('select');
      const first = before.projects[0];
      const coldGate = Boolean(dialog) && before.activeProject === null && Boolean(first);
      if (!coldGate) return { ok: false, coldGate, activeBefore: before.activeProject, projectCount: before.projects.length };
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, first.id);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(50);
      [...dialog.querySelectorAll('button')].find((button) => button.textContent?.includes('进入这个工程'))?.click();
      for (let attempt = 0; attempt < 80 && document.querySelector('.project-picker-dialog'); attempt += 1) await wait(100);
      const after = await window.electronAPI.getProjectSessionStatus();
      const switchButton = document.querySelector('.active-project-switch');
      return {
        ok: after.activeProject?.id === first.id && !document.querySelector('.project-picker-dialog') && Boolean(switchButton),
        coldGate,
        projectCount: before.projects.length,
        activatedProject: after.activeProject?.name,
        switchLabel: switchButton?.textContent?.trim(),
      };
    })()`);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    const value = result.result?.value;
    if (!value?.ok) throw new Error(`project session UI verification failed: ${JSON.stringify(value)}`);
    console.log(JSON.stringify(value, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
