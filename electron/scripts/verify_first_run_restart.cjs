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
        startupDialog: Boolean(document.querySelector('.startup-key-dialog')),
        passwordInputs: document.querySelectorAll('.startup-key-dialog input[type="password"]').length,
        secureButton: Array.from(document.querySelectorAll('.startup-key-dialog button')).some((button) => button.textContent.includes('DeepSeek / 千问')),
        secureButtonDisabled: Array.from(document.querySelectorAll('.startup-key-dialog button')).find((button) => button.textContent.includes('DeepSeek / 千问'))?.disabled,
        customButton: Array.from(document.querySelectorAll('.startup-key-dialog button')).some((button) => button.textContent.includes('其他模型供应商')),
        falsePackageError: document.querySelector('.startup-key-error')?.textContent.includes('发布包缺少浏览器运行资源') === true,
        customSetupVisible: document.querySelector('.model-center-status')?.textContent.includes('供应商地址和模型名称') === true
      }))()`,
      returnByValue: true,
    });
    const value = evaluated.result?.value;
    const firstRunRouteVisible = value?.startupDialog ? value.secureButton && !value.secureButtonDisabled && value.customButton && !value.falsePackageError : value?.customSetupVisible;
    if (value?.configureType !== 'function' || value?.plaintextType !== 'undefined' || value?.passwordInputs !== 0 || !firstRunRouteVisible) {
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
