const CDP_LIST = 'http://127.0.0.1:9230/json';

async function cdpCall(socket, id, method, params = {}) {
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
    const evaluated = await cdpCall(socket, 1, 'Runtime.evaluate', {
      expression: `(() => ({
        configureType: typeof window.electronAPI.configureStartupModel,
        plaintextType: typeof window.electronAPI.saveStartupApiKey,
        passwordInputs: document.querySelectorAll('.startup-key-dialog input[type="password"]').length,
        secureButton: Array.from(document.querySelectorAll('.startup-key-dialog button')).some((button) => button.textContent.includes('安全窗口'))
      }))()`,
      returnByValue: true,
    });
    const value = evaluated.result?.value;
    if (value?.configureType !== 'function' || value?.plaintextType !== 'undefined' || value?.passwordInputs !== 0 || !value?.secureButton) {
      throw new Error(`secure first-run bridge failed: ${JSON.stringify(value)}`);
    }
    console.log(JSON.stringify({ ok: true, nativePromptRequiredForRestart: true, ...value }, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
