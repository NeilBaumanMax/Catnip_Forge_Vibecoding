const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-explore-session-'));
  const projectsRoot = path.join(tempRoot, 'projects');
  const sessionsRoot = path.join(tempRoot, 'sessions');
  fs.mkdirSync(path.join(projectsRoot, 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(projectsRoot, 'beta'), { recursive: true });
  process.env.CATNIP_PROJECTS_ROOT = projectsRoot;
  process.env.CATNIP_PROJECT_SESSIONS_ROOT = sessionsRoot;
  await app.whenReady();

  try {
    const { activateProject, getProjectSessionStatus } = require('../dist/main/project-session.js');
    const {
      createExploreWorkSession,
      getExploreWorkSession,
      listExploreWorkSessions,
      saveExploreWorkSession,
      deleteExploreWorkSession,
    } = require('../dist/main/explore-session.js');
    const projects = getProjectSessionStatus().projects;
    const alpha = projects.find((item) => item.name === 'alpha');
    const beta = projects.find((item) => item.name === 'beta');
    if (!alpha || !beta) throw new Error('test projects missing');

    activateProject(alpha.id);
    const idea = createExploreWorkSession('idea');
    idea.title = '桌面陪伴设备';
    idea.status = 'analyzing';
    idea.snapshot.input = '做一个桌面陪伴设备';
    idea.snapshot.analysisTaskId = 'task-analysis-alpha';
    idea.snapshot.analysisRequestId = 'request-analysis-alpha';
    idea.snapshot.selectedContextIds = ['selected-context'];
    idea.snapshot.gatheredContext = {
      generatedAt: Date.now(), projectDir: alpha.projectDir, warnings: [],
      limits: { maxDepth: 4, maxSourceFiles: 6, maxSourceFileBytes: 16384, maxSourceTotalBytes: 32768, maxRuntimeEvents: 80, maxSerialEvents: 40 },
      items: [
        { id: 'selected-context', kind: 'project', label: 'selected', summary: 'kept', selected: true, available: true },
        { id: 'unselected-context', kind: 'source', label: 'unselected', summary: 'must not persist', selected: false, available: true },
      ],
    };
    idea.snapshot.secret = 'MUST_NOT_PERSIST_UNKNOWN_FIELDS';
    saveExploreWorkSession(idea);
    const interrupted = getExploreWorkSession('idea', idea.id);
    if (interrupted.status !== 'analyzing') throw new Error('live analysis status was changed while listing records');
    interrupted.status = 'interrupted';
    saveExploreWorkSession(interrupted);
    if (listExploreWorkSessions('idea')[0].title !== '桌面陪伴设备') throw new Error('idea history was not listed');
    const secondIdea = createExploreWorkSession('idea');
    secondIdea.title = '第二条独立灵感';
    secondIdea.snapshot.input = '保留多次使用记录';
    saveExploreWorkSession(secondIdea);
    if (listExploreWorkSessions('idea').length !== 2) throw new Error('multiple idea histories were overwritten');
    deleteExploreWorkSession('idea', secondIdea.id);
    if (listExploreWorkSessions('idea').length !== 1) throw new Error('deleting one history affected the remaining mode history');

    const expectedFile = path.join(sessionsRoot, alpha.id, 'explore', 'idea', idea.id, 'session.json');
    if (!fs.existsSync(expectedFile)) throw new Error('idea session directory was not created');
    const storedText = fs.readFileSync(expectedFile, 'utf8');
    if (storedText.includes('MUST_NOT_PERSIST_UNKNOWN_FIELDS') || storedText.includes('unselected-context')) {
      throw new Error('unknown fields or unselected Context were persisted');
    }
    if (interrupted.snapshot.analysisTaskId !== 'task-analysis-alpha' || interrupted.snapshot.gatheredContext.items.length !== 1) {
      throw new Error('request identity or selected Context did not survive persistence');
    }

    activateProject(beta.id);
    if (listExploreWorkSessions().length !== 0) throw new Error('explore histories leaked between projects');
    const diagnosis = createExploreWorkSession('diagnosis');
    diagnosis.snapshot.input = '屏幕黑屏';
    saveExploreWorkSession(diagnosis);
    if (deleteExploreWorkSession('diagnosis', diagnosis.id).length !== 0) throw new Error('single-session delete did not stay in current project');

    activateProject(alpha.id);
    const restored = getExploreWorkSession('idea', idea.id);
    if (restored.snapshot.input !== '做一个桌面陪伴设备' || listExploreWorkSessions().length !== 1) {
      throw new Error('alpha explore session did not restore after project switch');
    }
    console.log('explore session passed: directories, multiple histories, selected Context, request identity and project isolation');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
