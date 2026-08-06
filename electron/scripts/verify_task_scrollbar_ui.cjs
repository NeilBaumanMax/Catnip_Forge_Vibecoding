const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CDP_LIST = 'http://127.0.0.1:9230/json';
const packageRoot = path.resolve(process.env.CATNIP_PACKAGE_ROOT || path.join(__dirname, '..', 'dist-package', 'win-unpacked'));
const expectedUrl = pathToFileURL(path.join(packageRoot, 'resources', 'app.asar')).href.toLowerCase();

async function findTarget() {
  let discovered = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(CDP_LIST).then((response) => response.json());
      discovered = targets.filter((entry) => entry.type === 'page').map((entry) => entry.url);
      const target = targets.find((entry) => entry.type === 'page' && entry.url?.toLowerCase().startsWith(expectedUrl));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`未找到指定成品 ${packageRoot}；已发现 ${JSON.stringify(discovered)}`);
}

async function cdpCall(socket, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP ${method} 超时`)), 15_000);
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
  const target = await findTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  try {
    const expression = `(async () => {
      const taskTab = document.querySelector('[data-tour-id="tab-tasks"]');
      taskTab?.click();
      const deadline = Date.now() + 10_000;
      let table;
      while (Date.now() < deadline && !(table = document.querySelector('.task-history-table'))) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!table) return { ok: false, reason: 'missing task history table' };
      const style = getComputedStyle(table);
      const bar = getComputedStyle(table, '::-webkit-scrollbar');
      const track = getComputedStyle(table, '::-webkit-scrollbar-track');
      const thumb = getComputedStyle(table, '::-webkit-scrollbar-thumb');
      const corner = getComputedStyle(table, '::-webkit-scrollbar-corner');
      const button = getComputedStyle(table, '::-webkit-scrollbar-button');
      const result = {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollbarColor: style.scrollbarColor,
        width: bar.width,
        height: bar.height,
        trackBackground: track.backgroundColor,
        thumbBackground: thumb.backgroundColor,
        thumbBorder: thumb.borderWidth,
        thumbRadius: thumb.borderRadius,
        thumbBackgroundClip: thumb.backgroundClip,
        cornerBackground: corner.backgroundColor,
        buttonDisplay: button.display,
        horizontalOverflow: table.scrollWidth > table.clientWidth,
      };
      return {
        ...result,
        ok: result.overflowX === 'auto'
          && result.overflowY === 'scroll'
          && result.width === '8px'
          && result.height === '8px'
          && result.trackBackground === 'rgba(0, 0, 0, 0)'
          && result.cornerBackground === 'rgba(0, 0, 0, 0)'
          && result.thumbBorder === '2px'
          && result.thumbRadius === '999px'
          && result.thumbBackgroundClip === 'padding-box'
          && result.buttonDisplay === 'none'
          && result.horizontalOverflow,
      };
    })()`;
    const evaluated = await cdpCall(socket, 1, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text || 'Renderer evaluation failed');
    const report = { ...evaluated.result.value, packageRoot, targetUrl: target.url };
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
