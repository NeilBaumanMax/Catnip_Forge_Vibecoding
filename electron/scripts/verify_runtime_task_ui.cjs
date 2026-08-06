const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CDP_LIST = 'http://127.0.0.1:9230/json';
const packageRoot = path.resolve(process.env.CATNIP_PACKAGE_ROOT || path.join(__dirname, '..', 'dist-package', 'win-unpacked'));
const runtimeRoot = path.join(packageRoot, 'resources', 'runtime');

async function findRendererTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(CDP_LIST).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page' && entry.title?.includes('Catnip Forge'));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('未找到 Catnip Forge 主界面 Renderer CDP target；请先启动待验收的 win-unpacked 应用');
}

async function cdpCall(socket, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      reject(new Error(`CDP ${method} 超时`));
    }, 30_000);
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

async function evaluate(socket, id, expression) {
  const result = await cdpCall(socket, id, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Renderer evaluation failed');
  return result.result.value;
}

async function main() {
  process.env.RUNTIME_ROOT = runtimeRoot;
  const eventStoreUrl = pathToFileURL(path.join(runtimeRoot, 'dist', 'eventbus', 'event-store.js')).href;
  const { appendRuntimeEvent } = await import(eventStoreUrl);
  const stamp = Date.now();
  const taskId = `packaged-ui-acceptance-${stamp}`;
  const projectDir = path.join(runtimeRoot, 'hardboard', 'projects', `ui-event-acceptance-${stamp}`);
  const firstMarker = `PACKAGED_EVENT_FIRST_${stamp}`;
  const secondMarker = `PACKAGED_EVENT_LATE_${stamp}`;
  const startedTask = {
    taskId,
    source: 'manual',
    kind: 'hardboard.build',
    status: 'running',
    projectDir,
    port: null,
    toolName: 'acceptance.packaged_event_stream',
    createdAt: stamp,
    startedAt: stamp,
    endedAt: null,
    pid: null,
    exitCode: null,
    error: null,
  };

  appendRuntimeEvent({
    source: 'manual',
    kind: 'task.started',
    taskId,
    projectDir,
    message: firstMarker,
    payload: { task: startedTask, acceptance: true },
  });

  appendRuntimeEvent({
    source: 'hardboard',
    kind: 'hardboard.build.started',
    taskId,
    projectDir,
    message: firstMarker,
    payload: { progress: 0, acceptance: true },
  });
  appendRuntimeEvent({
    source: 'hardboard',
    kind: 'hardboard.build.progress',
    taskId,
    projectDir,
    message: firstMarker,
    payload: { progress: 35, acceptance: true },
  });

  const target = await findRendererTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  try {
    const initial = await evaluate(socket, 1, `(async () => {
      const waitFor = async (check, label) => {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          const value = check();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('等待超时: ' + label);
      };
      await waitFor(() => document.readyState === 'complete', 'document ready');
      const taskTab = await waitFor(() => document.querySelector('[data-tour-id="tab-tasks"]'), 'task tab');
      taskTab.click();
      await waitFor(() => document.querySelector('[data-tour-id="panel-tasks"]'), 'task panel');
      let liveLog = document.querySelector('.runtime-live-log');
      if (!liveLog) {
        const liveButton = await waitFor(() => document.querySelector('.diagnostic-toolbar button'), 'live log button');
        liveButton.click();
        liveLog = await waitFor(() => document.querySelector('.runtime-live-log'), 'live log');
      }
      await waitFor(() => liveLog.textContent.includes(${JSON.stringify(firstMarker)}), 'first event marker');
      const historyRow = await waitFor(
        () => [...document.querySelectorAll('.task-history-row')].find((row) => row.textContent.includes(${JSON.stringify(`ui-event-acceptance-${stamp}`)})),
        'task history row'
      );
      return {
        firstMarkerVisible: liveLog.textContent.includes(${JSON.stringify(firstMarker)}),
        taskHistoryVisible: Boolean(historyRow),
        runtimeMessage: document.querySelector('.runtime-message')?.textContent || '',
      };
    })()`);

    appendRuntimeEvent({
      source: 'hardboard',
      kind: 'hardboard.build.progress',
      taskId,
      projectDir,
      message: secondMarker,
      payload: { progress: 90, acceptance: true },
    });
    appendRuntimeEvent({
      source: 'hardboard',
      kind: 'hardboard.build.completed',
      taskId,
      projectDir,
      message: `${secondMarker} completed`,
      payload: { progress: 100, ok: true, exitCode: 0, acceptance: true },
    });
    appendRuntimeEvent({
      source: 'manual',
      kind: 'task.completed',
      taskId,
      projectDir,
      message: `${secondMarker} task completed`,
      payload: {
        task: { ...startedTask, status: 'completed', endedAt: Date.now(), exitCode: 0 },
        exitCode: 0,
        acceptance: true,
      },
    });

    const sustained = await evaluate(socket, 2, `(async () => {
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        const liveLog = document.querySelector('.runtime-live-log');
        const row = [...document.querySelectorAll('.task-history-row')].find((item) => item.textContent.includes(${JSON.stringify(`ui-event-acceptance-${stamp}`)}));
        if (liveLog?.textContent.includes(${JSON.stringify(secondMarker)}) && row?.classList.contains('task-history-row--completed')) {
          return {
            lateMarkerVisible: true,
            taskCompleted: true,
            eventCardCount: document.querySelectorAll('.task-event-card').length,
            runtimeMessage: document.querySelector('.runtime-message')?.textContent || '',
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return {
        lateMarkerVisible: document.querySelector('.runtime-live-log')?.textContent.includes(${JSON.stringify(secondMarker)}) || false,
        taskCompleted: false,
        runtimeMessage: document.querySelector('.runtime-message')?.textContent || '',
      };
    })()`);

    const ok = initial.firstMarkerVisible
      && initial.taskHistoryVisible
      && sustained.lateMarkerVisible
      && sustained.taskCompleted
      && !/失败|failed/i.test(`${initial.runtimeMessage} ${sustained.runtimeMessage}`);
    const report = { ok, packageRoot, taskId, initial, sustained };
    console.log(JSON.stringify(report, null, 2));
    if (!ok) process.exitCode = 1;
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
