const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

app.disableHardwareAcceleration();

async function main() {
  await app.whenReady();
  const { gatherExploreContext, registerExploreContextIpc, resolveExploreProjectDir } = require('../dist/main/explore-context.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-explore-context-'));
  try {
    const project = path.join(root, 'demo');
    const other = path.join(root, 'other');
    fs.mkdirSync(path.join(project, 'main'), { recursive: true });
    fs.mkdirSync(path.join(project, 'build'), { recursive: true });
    fs.mkdirSync(path.join(project, 'a', 'b', 'c', 'd', 'e', 'f'), { recursive: true });
    fs.mkdirSync(other, { recursive: true });
    fs.writeFileSync(path.join(project, 'CMakeLists.txt'), 'project(demo)\n');
    fs.writeFileSync(path.join(project, 'sdkconfig'), 'CONFIG_IDF_TARGET="esp32s3"\n');
    fs.writeFileSync(path.join(other, 'CMakeLists.txt'), 'project(other)\n');
    for (let index = 0; index < 9; index += 1) {
      fs.writeFileSync(path.join(project, 'main', `source_${index}.c`), `// source ${index}\n` + 'x'.repeat(9000));
    }
    fs.writeFileSync(path.join(project, 'build', 'excluded.c'), 'MUST_NOT_APPEAR');
    fs.writeFileSync(path.join(project, 'a', 'b', 'c', 'd', 'e', 'f', 'too_deep.c'), 'TOO_DEEP');

    assert.equal(resolveExploreProjectDir('hardboard/projects/demo', root), project);
    assert.throws(() => resolveExploreProjectDir(path.join(root, '..', 'escape'), root), /不在 Hardboard projects/);

    const now = Date.UTC(2026, 8, 8, 12, 0, 0);
    const serialEvents = Array.from({ length: 45 }, (_, index) => ({
      timestamp: now - (45 - index) * 1000,
      text: `serial-${index}`,
      direction: 'rx',
    }));
    const result = await gatherExploreContext(
      { projectDir: 'hardboard/projects/demo' },
      {
        projectsRoot: root,
        now: () => now,
        readRuntimeEvents: async () => ({ events: [
          { time: now - 25 * 60 * 60 * 1000, kind: 'hardboard.build.completed', projectDir: project, message: 'TOO_OLD' },
          { time: now - 1000, kind: 'hardboard.build.completed', projectDir: other, message: 'OTHER_PROJECT' },
          { time: now - 500, kind: 'hardboard.build.completed', projectDir: project, message: 'CURRENT_PROJECT_BUILD' },
        ] }),
        readSerial: () => ({ options: { port: 'COM7' }, events: serialEvents }),
      },
    );

    assert.equal(result.projectDir, project);
    assert.equal(result.limits.maxDepth, 5);
    assert.equal(result.limits.maxSourceFiles, 6);
    const sources = result.items.filter((item) => item.kind === 'source');
    assert(sources.length > 0 && sources.length <= 6);
    assert(sources.every((item) => item.summary.length <= 2000));
    assert(!sources.some((item) => /MUST_NOT_APPEAR|TOO_DEEP/.test(item.summary)));
    assert.match(result.items.find((item) => item.kind === 'target').summary, /esp32s3/);
    const runtime = result.items.find((item) => item.kind === 'build');
    assert.match(runtime.summary, /CURRENT_PROJECT_BUILD/);
    assert.doesNotMatch(runtime.summary, /TOO_OLD|OTHER_PROJECT/);
    const serial = result.items.find((item) => item.kind === 'serial');
    assert.match(serial.label, /COM7/);
    assert.match(serial.summary, /尚未证明属于所选工程/);
    assert.match(serial.summary, /serial-44/);
    assert.doesNotMatch(serial.summary, /serial-0/);
    assert(result.items.every((item) => item.selected && item.available));
    assert.deepEqual(result.warnings, []);

    const partial = await gatherExploreContext(
      { projectDir: 'hardboard/projects/demo' },
      {
        projectsRoot: root,
        now: () => now,
        readRuntimeEvents: async () => { throw new Error('runtime unavailable'); },
        readSerial: () => { throw new Error('serial unavailable'); },
      },
    );
    assert(partial.items.some((item) => item.kind === 'source'));
    assert.deepEqual(partial.warnings, ['最近 Build / Flash 记录读取失败', '最近串口记录读取失败']);

    const handlers = new Map();
    registerExploreContextIpc(
      { handle: (channel, handler) => handlers.set(channel, handler) },
      () => ({ id: 'project-test', projectDir }),
    );
    assert(handlers.has('explore:context:gather'));
    const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.ts'), 'utf8');
    const rendererTypes = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'types', 'index.ts'), 'utf8');
    const panel = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'ExplorePanel.tsx'), 'utf8');
    assert.match(preload, /gatherExploreContext/);
    assert.match(rendererTypes, /gatherExploreContext/);
    assert.match(panel, /gatherExploreContext/);
    assert.match(panel, /disabled=\{analysisPending \|\| \(!isIdea && contextLoading\)/);
    console.log('explore context passed: project boundary, bounded sources, scoped runtime, bounded serial, IPC and UI contract');
  } finally {
    const resolved = path.resolve(root);
    assert(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
