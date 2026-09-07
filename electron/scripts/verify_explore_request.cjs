const assert = require('node:assert/strict');
const { app } = require('electron');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

async function main() {
  await app.whenReady();
  const { prepareExploreRequest, registerExploreRequestIpc } = require('../dist/main/explore-request.js');
  const base = {
    goal: '做一个桌面陪伴设备',
    context: {
      items: [
        { id: 'project', kind: 'project', label: '当前工程', summary: 'demo', selected: true },
        { id: 'serial', kind: 'serial', label: '串口', summary: 'not relevant', selected: false },
      ],
    },
  };
  const connected = { state: 'connected', installed: true, compatible: true, authConfigured: true, message: '已连接知乎开放平台' };
  const idea = prepareExploreRequest({ ...base, mode: 'idea' }, connected);
  assert.equal(idea.state, 'ready');
  assert.equal(idea.sourceStrategy.web, 'conditional');
  assert.deepEqual(idea.request.context.items.map((item) => item.id), ['project']);
  assert.deepEqual(idea.selectedContext.map((item) => item.id), ['project']);

  const blocked = prepareExploreRequest({ ...base, mode: 'diagnosis' }, { ...connected, state: 'needs_secret', authConfigured: false, message: '需要连接知乎开放平台' });
  assert.equal(blocked.state, 'needs_connection');
  assert.equal(blocked.sourceStrategy.web, 'required');
  assert.match(blocked.message, /连接知乎开放平台/);

  assert.throws(() => prepareExploreRequest({ ...base, mode: 'idea', goal: ' ' }, connected), /required/);

  const registrations = new Map();
  registerExploreRequestIpc({ handle: (channel, handler) => registrations.set(channel, handler) }, async () => connected);
  assert(registrations.has('explore:request:prepare'));
  const ipcResult = await registrations.get('explore:request:prepare')({}, { ...base, mode: 'idea' });
  assert.equal(ipcResult.state, 'ready');

  console.log('explore request preparation passed: validation, context exclusion, source strategy, IPC');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
