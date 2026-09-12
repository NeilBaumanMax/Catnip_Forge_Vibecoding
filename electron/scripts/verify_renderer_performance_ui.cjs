const assert = require('node:assert/strict');

const CDP_LIST = 'http://127.0.0.1:9230/json';

async function call(socket, id, method, params = {}) {
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

async function findMainTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(CDP_LIST).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page' && /localhost:5173|renderer\/index\.html/.test(entry.url));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Catnip Forge main Renderer CDP target not found');
}

async function main() {
  const target = await findMainTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  try {
    const evaluated = await call(socket, 1, 'Runtime.evaluate', {
      expression: `(async () => {
        const waitFor = async (selector, timeoutMs = 8000) => {
          const startedAt = performance.now();
          while (!document.querySelector(selector) && performance.now() - startedAt < timeoutMs) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return Boolean(document.querySelector(selector));
        };
        const readyMarks = performance.getEntriesByName('catnip-renderer-interactive').map((entry) => entry.startTime);
        const editorTab = document.querySelector('[data-tour-id="tab-editor"]');
        editorTab?.click();
        const editorLoaded = await waitFor('.editor-code-empty, .monaco-editor');
        const modelTab = document.querySelector('[data-tour-id="tab-models"]');
        modelTab?.click();
        const modelLoaded = await waitFor('.model-center');
        const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
        return {
          readyMarks,
          editorLoaded,
          modelLoaded,
          codeEditorChunkLoaded: resources.some((name) => name.includes('CodeEditor-') || name.includes('/components/CodeEditor.tsx')),
          modelPanelChunkLoaded: resources.some((name) => name.includes('ModelPanel-') || name.includes('/components/ModelPanel.tsx')),
          optimizedImages: resources.filter((name) => /(?:webp|jpg)(?:\\?|$)/.test(name)).length,
          legacyPngs: resources.filter((name) => /(?:catnip-agent-welcome-v2|catnip-app-icon|catnip-assistant|catnip-cosmic-shell|chat-history-night-v2|explore-academy-hero|explore-diagnosis-guagua|explore-diagnosis-workspace|explore-idea-guagua|explore-idea-workspace|guagua-avatar|task-manager-empty-guagua-v2).*\\.png(?:\\?|$)/.test(name)),
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluated.exceptionDetails) {
      throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text || 'renderer evaluation failed');
    }
    const result = evaluated.result?.value;
    assert.equal(result?.readyMarks?.length, 1, `renderer readiness mark must occur once: ${JSON.stringify(result)}`);
    assert.equal(result?.editorLoaded, true, `lazy Monaco editor did not load: ${JSON.stringify(result)}`);
    assert.equal(result?.modelLoaded, true, `lazy model center did not load: ${JSON.stringify(result)}`);
    assert.equal(result?.codeEditorChunkLoaded, true, `CodeEditor chunk was not loaded on demand: ${JSON.stringify(result)}`);
    assert.equal(result?.modelPanelChunkLoaded, true, `ModelPanel chunk was not loaded on demand: ${JSON.stringify(result)}`);
    assert.ok(result?.optimizedImages >= 4, `optimized first-screen images were not loaded: ${JSON.stringify(result)}`);
    assert.deepEqual(result?.legacyPngs, [], `legacy PNG resources were loaded: ${JSON.stringify(result)}`);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
