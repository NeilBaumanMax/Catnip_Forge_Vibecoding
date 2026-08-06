const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CDP_LIST = 'http://127.0.0.1:9230/json';
const packageRoot = path.resolve(process.env.CATNIP_PACKAGE_ROOT || path.join(__dirname, '..', 'dist-package', 'win-unpacked'));
const expectedAppUrlPrefix = pathToFileURL(path.join(packageRoot, 'resources', 'app.asar')).href.toLowerCase();

async function findTarget() {
  let discovered = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(CDP_LIST).then((response) => response.json());
      discovered = targets.filter((entry) => entry.type === 'page').map((entry) => entry.url);
      const target = targets.find((entry) => entry.type === 'page' && entry.url?.toLowerCase().startsWith(expectedAppUrlPrefix));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`未找到指定成品 ${packageRoot}；已发现 ${JSON.stringify(discovered)}`);
}

async function call(socket, id, method, params = {}) {
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

  const testText = '你真觉得这个不bug修复好了吗，现在是越来越奇怪你看你这光标能对吗';
  const expression = `(async () => {
    const textarea = document.querySelector('.chat-input textarea');
    const highlight = document.querySelector('.chat-input-highlight');
    if (!textarea || !highlight) return { ok: false, reason: 'missing composer layers' };
    const original = { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd };
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    try {
      setter.call(textarea, ${JSON.stringify(testText)});
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const textareaStyle = getComputedStyle(textarea);
      const highlightStyle = getComputedStyle(highlight);
      const metricKeys = [
        'font', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform',
        'fontKerning', 'fontFeatureSettings', 'fontVariationSettings', 'fontVariantLigatures',
        'textRendering', 'whiteSpace', 'overflowWrap', 'tabSize',
      ];
      const mismatches = metricKeys
        .filter((key) => textareaStyle[key] !== highlightStyle[key])
        .map((key) => ({ key, textarea: textareaStyle[key], highlight: highlightStyle[key] }));

      const range = document.createRange();
      range.selectNodeContents(highlight);
      const visibleRight = range.getBoundingClientRect().right;
      const mirror = document.createElement('div');
      mirror.setAttribute('aria-hidden', 'true');
      Object.assign(mirror.style, {
        position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden',
        boxSizing: textareaStyle.boxSizing, width: textarea.getBoundingClientRect().width + 'px',
        minHeight: textareaStyle.minHeight, padding: textareaStyle.padding,
        border: textareaStyle.border, whiteSpace: textareaStyle.whiteSpace,
        overflowWrap: textareaStyle.overflowWrap, fontFamily: textareaStyle.fontFamily,
        fontSize: textareaStyle.fontSize, fontWeight: textareaStyle.fontWeight,
        fontStyle: textareaStyle.fontStyle, fontStretch: textareaStyle.fontStretch,
        lineHeight: textareaStyle.lineHeight,
        letterSpacing: textareaStyle.letterSpacing, wordSpacing: textareaStyle.wordSpacing,
        textIndent: textareaStyle.textIndent, textTransform: textareaStyle.textTransform,
        fontKerning: textareaStyle.fontKerning, fontFeatureSettings: textareaStyle.fontFeatureSettings,
        fontVariationSettings: textareaStyle.fontVariationSettings,
        fontVariantLigatures: textareaStyle.fontVariantLigatures, textRendering: textareaStyle.textRendering,
      });
      mirror.append(document.createTextNode(textarea.value));
      const caret = document.createElement('span');
      caret.textContent = '\\u200b';
      mirror.append(caret);
      document.body.append(mirror);
      const mirrorRect = mirror.getBoundingClientRect();
      const expectedRelativeRight = caret.getBoundingClientRect().left - mirrorRect.left;
      const highlightRelativeRight = visibleRight - highlight.getBoundingClientRect().left;
      mirror.remove();
      const endpointDelta = Math.abs(expectedRelativeRight - highlightRelativeRight);
      return {
        ok: mismatches.length === 0 && endpointDelta < 0.75 && textarea.value === highlight.textContent,
        valueLength: textarea.value.length,
        selectionStart: textarea.selectionStart,
        mismatches,
        endpointDelta,
        expectedRelativeRight,
        highlightRelativeRight,
        textareaFont: textareaStyle.font,
        highlightFont: highlightStyle.font,
      };
    } finally {
      setter.call(textarea, original.value);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      textarea.setSelectionRange(original.start, original.end);
    }
  })()`;

  try {
    const evaluated = await call(socket, 1, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
