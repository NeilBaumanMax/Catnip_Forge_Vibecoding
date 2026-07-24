const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  await app.whenReady();
  const manager = require('../dist/main/skill-manager');
  const { buildContext } = require('../dist/main/worker/context');
  const before = manager.listManagedSkills();
  assert(before.status.sourceDir.endsWith(path.join('agent', 'skills')), 'source path must remain agent/skills');
  assert(before.skills.length >= 12, 'bundled skills should be discoverable');
  assert(before.skills.every((skill) => skill.sourceFormat === 'standard'), 'bundled skills must use one folder per skill');
  for (const skill of before.skills) {
    assert.equal(path.basename(skill.folderPath), skill.id, `${skill.id} folder must match its id`);
    assert.equal(path.basename(skill.sourcePath), 'SKILL.md', `${skill.id} must use SKILL.md`);
  }

  const synced = manager.syncManagedSkills();
  assert.equal(synced.status.deployedCount, synced.status.skillCount, 'all source skills should deploy');
  for (const skill of synced.skills) {
    const deployed = path.join(synced.status.deployDir, skill.id, 'SKILL.md');
    const text = fs.readFileSync(deployed, 'utf-8');
    assert.match(text, /^---\nname: /, `${skill.id} missing native frontmatter`);
    assert.match(text, /\ndescription: /, `${skill.id} missing description`);
  }
  const hardboardSkill = synced.skills.find((skill) => skill.id === 'espidf-hardboard');
  assert(hardboardSkill, 'espidf-hardboard skill missing');
  assert(hardboardSkill.supportFileCount >= 2, 'hardboard support folders should be visible');
  assert(fs.existsSync(path.join(synced.status.deployDir, 'espidf-hardboard', 'scripts', 'README.md')), 'skill scripts tree did not deploy');
  assert(fs.existsSync(path.join(synced.status.deployDir, 'espidf-hardboard', 'references', 'README.md')), 'skill references tree did not deploy');

  assert(!buildContext('编译 Electron TypeScript 前端').skillsFound.includes('espidf-hardboard'), 'generic compilation must not trigger hardboard');
  const hardboard = buildContext('编译 ESP32-S3 固件并烧录');
  assert(hardboard.skillsFound.includes('espidf-hardboard'), 'ESP32 task should recommend hardboard skill');
  assert(hardboard.prompt.includes('/espidf-hardboard'), 'prompt should reference the native skill command');
  const explicitText = '请先检查工程 @espidf-hardboard，再整理结果 @data-extract';
  const explicit = buildContext(explicitText, ['espidf-hardboard', 'data-extract']);
  assert.deepEqual(explicit.explicitSkills, ['espidf-hardboard', 'data-extract'], 'multiple explicit skills must preserve order');
  assert.match(explicit.prompt, /不能只调用第一个/, 'explicit multi-skill prompt must require every skill');
  assert(explicit.prompt.indexOf('@espidf-hardboard') < explicit.prompt.indexOf('@data-extract'), 'explicit skill positions must preserve request order');

  const { normalizeAgentTaskInput } = require('../dist/main/worker/orchestrator');
  const refs = ['espidf-hardboard', 'data-extract'].map((id) => {
    const start = explicitText.indexOf(`@${id}`);
    return { id, name: id, start, end: start + id.length + 1 };
  });
  const normalized = normalizeAgentTaskInput({ text: explicitText, skillRefs: refs });
  assert.deepEqual(normalized.skillRefs.map((ref) => ref.id), ['espidf-hardboard', 'data-extract'], 'structured skill references must validate');
  console.log(`skill manager smoke ok (${synced.status.deployedCount} deployed)`);
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
