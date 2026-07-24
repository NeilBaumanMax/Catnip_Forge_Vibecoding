const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-qwen-attachments-'));
process.env.CATNIP_ATTACHMENT_ROOT = path.join(tempRoot, 'attachments');
process.env.CATNIP_QWEN_API_KEY_PATH = path.join(tempRoot, 'qwen-apikey.txt');
process.env.CATNIP_DEEPSEEK_API_KEY_PATH = path.join(tempRoot, 'deepseek-apikey.txt');

async function main() {
  const mock = await startQwenMock();
  process.env.CATNIP_QWEN_BASE_URL = mock.baseUrl;

  const firstRun = require('../dist/main/first-run.js');
  const store = require('../dist/main/attachment-store.js');
  const bridge = require('../dist/main/attachment-bridge.js');

  const invalidOptional = firstRun.saveStartupApiKeys('sk-test-deepseek-key-not-real', 'short');
  assert.equal(invalidOptional.ok, false);
  assert.equal(fs.existsSync(process.env.CATNIP_DEEPSEEK_API_KEY_PATH), false);

  const requiredOnly = firstRun.saveStartupApiKeys('sk-test-deepseek-key-not-real', '');
  assert.deepEqual(requiredOnly, { ok: true, qwenSaved: false });
  assert.equal(firstRun.readQwenApiKey(), null);

  const dualKeys = firstRun.saveStartupApiKeys('sk-test-deepseek-key-not-real', 'sk-test-qwen-key-not-real');
  assert.deepEqual(dualKeys, { ok: true, qwenSaved: true });
  assert.equal(firstRun.readQwenApiKey(), 'sk-test-qwen-key-not-real');

  const conversationId = 'conversation-11111111-2222-4333-8444-555555555555';
  const fixtures = createFixtures(tempRoot);
  const imported = store.importAttachmentPaths(conversationId, fixtures);
  assert.equal(imported.attachments.length, 5);

  const byName = new Map(imported.attachments.map((item) => [item.name, item]));
  assert.match(store.readAttachmentText(conversationId, byName.get('notes.txt').id), /local attachment text/);
  assert.match(store.readAttachmentText(conversationId, byName.get('manual.pdf').id), /Hello PDF/);
  assert.match(store.readAttachmentText(conversationId, byName.get('guide.docx').id), /Word fixture/);
  assert.match(store.readAttachmentText(conversationId, byName.get('slides.pptx').id), /PPT fixture/);
  assert.throws(() => store.readAttachmentText('conversation-bad', byName.get('notes.txt').id), /对话 ID/);
  assert.throws(() => store.validateAttachmentReferences(conversationId, [{ id: 'att_bad' }]), /附件 ID/);

  await bridge.startAttachmentBridge();
  const env = bridge.getAttachmentBridgeEnv();
  const unauthorized = await fetch(env.CATNIP_ATTACHMENT_BRIDGE_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'status', params: {} }),
  });
  assert.equal(unauthorized.status, 401);

  const status = await rpc(env, 'status', {});
  assert.equal(status.qwenConfigured, true);
  const analyzed = await rpc(env, 'analyze', {
    conversationId,
    attachmentId: byName.get('board.png').id,
    prompt: '识别开发板',
  });
  assert.equal(analyzed.model, 'qwen-vl-plus');
  assert.equal(analyzed.evidence.summary, 'mock board');
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].model, 'qwen-vl-plus');
  assert.match(JSON.stringify(mock.calls[0]), /data:image\/png;base64/);
  assert.doesNotMatch(JSON.stringify(analyzed), /sk-test-qwen/);

  await bridge.stopAttachmentBridge();
  await mock.close();
  console.log('qwen attachment mock verification passed');
}

async function rpc(env, method, params) {
  const response = await fetch(env.CATNIP_ATTACHMENT_BRIDGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CATNIP_ATTACHMENT_BRIDGE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, params }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error);
  return payload.result;
}

async function startQwenMock() {
  const calls = [];
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    calls.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        summary: 'mock board',
        ocrText: ['GPIO12'],
        components: [],
        connections: [],
        warnings: [],
        confidence: 0.99,
      }) } }],
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    calls,
    baseUrl: `http://127.0.0.1:${address.port}/compatible-mode/v1`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function createFixtures(directory) {
  const text = path.join(directory, 'notes.txt');
  const pdf = path.join(directory, 'manual.pdf');
  const docx = path.join(directory, 'guide.docx');
  const pptx = path.join(directory, 'slides.pptx');
  const png = path.join(directory, 'board.png');
  fs.writeFileSync(text, 'local attachment text');
  fs.writeFileSync(pdf, '%PDF-1.4\nBT (Hello PDF) Tj ET\n%%EOF', 'latin1');
  fs.writeFileSync(docx, makeStoredZip({
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Word fixture</w:t></w:r></w:p></w:body></w:document>',
  }));
  fs.writeFileSync(pptx, makeStoredZip({
    'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>PPT fixture</a:t></a:r></a:p></p:sld>',
  }));
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n5sAAAAASUVORK5CYII=', 'base64'));
  return [text, pdf, docx, pptx, png];
}

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, raw] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBuffer, end]);
}

app.whenReady()
  .then(main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (path.resolve(tempRoot).startsWith(path.resolve(os.tmpdir()))) fs.rmSync(tempRoot, { recursive: true, force: true });
    app.quit();
  });
