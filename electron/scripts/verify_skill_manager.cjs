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
  assert(before.skills.length >= 8, 'remaining bundled skills should be discoverable');
  for (const removedId of ['1688-source-finding', 'bilibili-search-workflow', 'douyin-product-rank', 'taobao-listing']) {
    assert(!before.skills.some((skill) => skill.id === removedId), `${removedId} should be removed from bundled skills`);
  }
  assert(before.skills.every((skill) => skill.sourceFormat === 'standard'), 'bundled skills must use one folder per skill');
  for (const skill of before.skills) {
    assert.equal(path.basename(skill.folderPath), skill.id, `${skill.id} folder must match its id`);
    assert.equal(path.basename(skill.sourcePath), 'SKILL.md', `${skill.id} must use SKILL.md`);
  }

  const synced = manager.syncManagedSkills();
  assert.equal(synced.status.deployedCount, synced.status.skillCount, 'all source skills should deploy');
  for (const removedId of ['1688-source-finding', 'bilibili-search-workflow', 'douyin-product-rank', 'taobao-listing']) {
    assert(!fs.existsSync(path.join(synced.status.deployDir, removedId)), `${removedId} stale deployment was not removed`);
  }
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
  const zhihuSkill = synced.skills.find((skill) => skill.id === 'zhihu');
  assert(zhihuSkill, 'official zhihu skill missing');
  assert.equal(zhihuSkill.sourceFormat, 'standard', 'official zhihu skill must use the standard directory format');
  assert.equal(zhihuSkill.supportFileCount, 14, 'official zhihu support tree must remain complete');
  assert.match(zhihuSkill.description, /使用知乎开放平台搜索知乎和全网内容/, 'folded YAML description was not parsed');
  assert.notEqual(zhihuSkill.description, '>-', 'folded YAML marker leaked into the displayed description');
  const zhihuSource = fs.readFileSync(zhihuSkill.sourcePath);
  const zhihuDeployed = fs.readFileSync(path.join(synced.status.deployDir, 'zhihu', 'SKILL.md'));
  assert.deepEqual(zhihuDeployed, zhihuSource, 'standard SKILL.md must deploy byte-for-byte without rewriting vendor content');
  for (const relativePath of [
    'manifest.json',
    'scripts/run.ps1',
    'scripts/run.sh',
    'scripts/setup.ps1',
    'scripts/setup.sh',
    'references/cli.md',
    'references/hackathon-content-api.md',
    'references/hackathon-oauth.md',
    'references/hackathon.md',
    'references/http-api.md',
    'references/mcp.md',
    'references/oauth.md',
    'references/open-platform.md',
    'references/user-api.md',
  ]) {
    const source = fs.readFileSync(path.join(zhihuSkill.folderPath, relativePath));
    const deployed = fs.readFileSync(path.join(synced.status.deployDir, 'zhihu', relativePath));
    assert.deepEqual(deployed, source, `official zhihu support file changed during deployment: ${relativePath}`);
  }

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
  const zhihuText = '请使用 @zhihu 搜索真实开发经验';
  const zhihuStart = zhihuText.indexOf('@zhihu');
  const zhihuNormalized = normalizeAgentTaskInput({
    text: zhihuText,
    skillRefs: [{ id: 'zhihu', name: 'zhihu', start: zhihuStart, end: zhihuStart + '@zhihu'.length }],
  });
  assert.deepEqual(zhihuNormalized.skillRefs.map((ref) => ref.id), ['zhihu'], '@zhihu structured reference must validate');
  const zhihuContext = buildContext(zhihuText, ['zhihu']);
  assert.deepEqual(zhihuContext.explicitSkills, ['zhihu'], '@zhihu must be an explicit skill');
  assert.match(zhihuContext.prompt, /\/zhihu/, 'agent prompt must require loading the official zhihu skill');
  console.log(`skill manager smoke ok (${synced.status.deployedCount} deployed)`);
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
