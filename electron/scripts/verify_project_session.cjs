const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-project-session-'));
  const projectsRoot = path.join(root, 'hardboard', 'projects');
  const sessionsRoot = path.join(root, 'user-data', 'project-sessions');
  fs.mkdirSync(path.join(projectsRoot, 'alpha', 'main'), { recursive: true });
  fs.writeFileSync(path.join(projectsRoot, 'alpha', 'CMakeLists.txt'), 'project(alpha)\n');
  process.env.CATNIP_PROJECTS_ROOT = projectsRoot;
  process.env.CATNIP_PROJECT_SESSIONS_ROOT = sessionsRoot;
  await app.whenReady();

  const service = require('../dist/main/project-session.js');
  try {
    const cold = service.getProjectSessionStatus();
    if (cold.activeProject !== null) throw new Error('cold start silently activated a project');
    if (cold.projects.length !== 1 || cold.suggestedProjectId !== null) throw new Error('initial project scan is invalid');
    service.activateProject(cold.projects[0].id);
    const active = service.requireActiveProject();
    if (active.name !== 'alpha') throw new Error('explicit activation did not select alpha');
    service.resetActiveProjectForTest();
    const restarted = service.getProjectSessionStatus();
    if (restarted.activeProject !== null || restarted.suggestedProjectId !== active.id) {
      throw new Error('last project must be suggestion-only after cold start');
    }

    const created = service.createProject('beta');
    if (created.createdProject.name !== 'beta' || created.activeProject.id !== created.createdProject.id) {
      throw new Error('created project was not explicitly activated');
    }
    const expectedFiles = ['CMakeLists.txt', path.join('main', 'CMakeLists.txt'), path.join('main', 'main.c')];
    for (const relative of expectedFiles) {
      if (!fs.existsSync(path.join(projectsRoot, 'beta', relative))) throw new Error('missing scaffold file: ' + relative);
    }
    const invalidNames = ['..', '../escape', 'CON', 'bad/name', 'bad:name', 'trailing.'];
    for (const invalid of invalidNames) {
      let rejected = false;
      try { service.createProject(invalid); } catch { rejected = true; }
      if (!rejected) throw new Error('unsafe project name accepted: ' + invalid);
    }
    let escaped = false;
    try { service.assertPathInActiveProject(path.join(projectsRoot, 'alpha', 'main', 'main.c')); } catch { escaped = true; }
    if (!escaped) throw new Error('cross-project path was accepted');
    service.assertPathInActiveProject(path.join(projectsRoot, 'beta', 'main', 'main.c'));
    const statePath = service.getActiveProjectStatePath('agent', 'conversations.json');
    const stateRoot = path.join(created.createdProject.projectDir, '.catnip');
    if (statePath !== path.join(stateRoot, 'agent', 'conversations.json')) throw new Error('project state path is not rooted in .catnip');
    const manifest = JSON.parse(fs.readFileSync(path.join(stateRoot, 'manifest.json'), 'utf8'));
    if (manifest.version !== 1 || manifest.projectId !== created.createdProject.id || manifest.projectDir !== created.createdProject.projectDir) {
      throw new Error('project state manifest binding is invalid');
    }
    if (fs.readFileSync(path.join(stateRoot, '.gitignore'), 'utf8') !== '*\n!.gitignore\n') throw new Error('project state ignore policy is invalid');
    let invalidStatePath = false;
    try { service.getActiveProjectStatePath('..', 'escape.json'); } catch { invalidStatePath = true; }
    if (!invalidStatePath) throw new Error('project state traversal was accepted');
    const secondActivation = service.activateProject(created.createdProject.id);
    if (secondActivation.activeProject.id !== created.createdProject.id) throw new Error('registry atomic replacement failed on repeat activation');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(outside);
    const link = path.join(projectsRoot, 'beta', 'linked-outside');
    try {
      fs.symlinkSync(outside, link, 'junction');
      let symlinkEscaped = false;
      try { service.assertPathInActiveProject(link); } catch { symlinkEscaped = true; }
      if (!symlinkEscaped) throw new Error('symlink escape was accepted');
    } catch (error) {
      if (error?.code !== 'EPERM') throw error;
    }
    console.log('project session passed: cold gate, suggestion, create scaffold, .catnip manifest, path and cross-project rejection');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
