const assert = require('node:assert/strict');
const { SerialMonitorSession } = require('../dist/main/serial-monitor-session.js');

async function main() {
  let handlers;
  let closed = false;
  const writes = [];
  const session = new SerialMonitorSession(async (_options, nextHandlers) => {
    handlers = nextHandlers;
    return {
      write(data, mode, encoding) {
        writes.push({ data, mode, encoding });
        queueMicrotask(() => handlers.onData({
          text: `ACK:${data}\n`,
          hex: Buffer.from(`ACK:${data}\n`).toString('hex').match(/../g).join(' ').toUpperCase(),
          stream: 'stdout',
        }));
      },
      async close() {
        closed = true;
      },
    };
  }, 20, 2000);

  assert.equal((await session.start({ port: '', baudRate: 115200, encoding: 'utf-8' }, 'agent')).ok, false);
  const opened = await session.start({ port: 'MOCK1', baudRate: 115200, encoding: 'utf-8' }, 'agent');
  assert.equal(opened.ok, true);
  assert.equal(session.read().running, true);
  assert.equal(session.read().openedBy, 'agent');
  assert.equal(session.read().options.port, 'MOCK1');

  assert.equal(session.write('ABC', 'text', 'utf-8', 'agent').ok, true);
  assert.equal(session.write('A', 'hex', 'utf-8', 'agent').ok, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, [{ data: 'ABC', mode: 'text', encoding: 'utf-8' }]);

  const snapshot = session.read();
  assert.equal(snapshot.events.some((event) => event.direction === 'tx' && event.actor === 'agent'), true);
  assert.equal(snapshot.events.some((event) => event.direction === 'rx' && event.text.includes('ACK:ABC')), true);
  assert.equal(snapshot.sentBytes, 3);
  assert.ok(snapshot.receivedBytes > 0);

  const waited = await session.waitFor({ sinceSeq: 0, text: 'ACK:ABC', timeoutMs: 100 });
  assert.equal(waited.matched, true);
  const timedOut = await session.waitFor({ sinceSeq: snapshot.lastSeq, text: 'NEVER', timeoutMs: 50 });
  assert.equal(timedOut.matched, false);

  session.clear('agent');
  assert.equal(session.read().events.length, 0);
  assert.equal(session.read().receivedBytes, 0);
  await session.stop('agent');
  assert.equal(closed, true);
  assert.equal(session.read().running, false);

  console.log('serial monitor shared-session mock verification passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
