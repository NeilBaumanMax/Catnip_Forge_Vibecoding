const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { ROOT, projectMap, manifest, relativeFile, read, git, matches } = require('./project.cjs');

function checkKnowledge(map = projectMap()) {
  assert.equal(map.schema, 1, 'unsupported map schema');
  const scripts = manifest().scripts, ids = Object.keys(map.modules);
  assert(ids.length > 0, 'empty map');
  const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  let contracts = 0;
  for (const [id, module] of Object.entries(map.modules)) {
    assert(/^[a-z][a-z0-9-]+$/.test(id), 'invalid module id');
    for (const key of ['responsibility', 'code', 'paths', 'depends_on', 'forbidden_dependencies', 'decisions']) assert(Array.isArray(module[key]), `${id}.${key}`);
    assert(module.code.length && module.paths.length, `${id} needs code and routing paths`);
    for (const file of [...module.code, module.docs.contract, module.docs.state, ...module.decisions]) {
      relativeFile(file);
      assert(fs.existsSync(path.join(ROOT, file)), `${id}: missing ${file}`);
    }
    assert.equal(module.docs.state, 'docs/state/CURRENT.md', 'one canonical state');
    assert.equal(module.docs.contract, `docs/modules/${id}/CONTRACT.md`, 'contract location');
    for (const dep of [...module.depends_on, ...module.forbidden_dependencies]) assert(map.modules[dep], `${id}: unknown dependency ${dep}`);
    for (const level of ['fast', 'module', 'integration']) {
      assert(Array.isArray(module.tests[level]), `${id}: missing test level`);
      for (const test of module.tests[level]) assert(scripts[test], `${id}: missing npm script ${test}`);
    }
    for (const glob of module.paths) {
      relativeFile(glob);
      assert(files.some(f => matches(f, glob)), `${id}: routing pattern matches no file ${glob}`);
    }
    for (const selection of Object.values(module.focus || {})) {
      for (const file of [...selection.source, ...selection.read_only]) assert(fs.existsSync(path.join(ROOT, relativeFile(file))), `focus missing ${file}`);
      for (const test of selection.tests) assert(scripts[test], `focus missing script ${test}`);
    }
    assert.equal(typeof module.status.active, 'boolean');
    assert.equal(typeof module.status.frozen, 'boolean');
    const body = read(module.docs.contract);
    for (const heading of ['Owns', 'Does Not Own', 'Allowed Dependencies', 'Forbidden Dependencies', 'Public Interfaces', 'Invariants', 'Relevant Tests', 'Related ADRs']) assert(body.includes(`## ${heading}`), `${id}: missing ${heading}`);
    contracts++;
  }
  // Broad scan is explicit developer-infrastructure validation, never ordinary task reading.
  const sources = files.filter(f => /^(electron|runtime)\/src\/.*\.tsx?$/.test(f));
  const missing = sources.filter(f => !Object.values(map.modules).some(m => m.paths.some(p => matches(f, p))));
  assert.deepEqual(missing, [], 'unmapped product source; routing would escalate');
  const limits = { 'docs/PROJECT_INDEX.md': 80, 'docs/state/CURRENT.md': 200, 'docs/testing/CURRENT_TEST_STATUS.md': 80 };
  for (const [file, max] of Object.entries(limits)) assert(read(file).trimEnd().split(/\r?\n/).length <= max, `${file}: navigation size budget`);
  // Only links in active knowledge; legacy files remain historical references.
  const docs = [...new Set(['AGENTS.md', 'CLAUDE.md', 'docs/PROJECT_INDEX.md', 'docs/state/CURRENT.md', 'docs/testing/TEST_STRATEGY.md', 'docs/testing/CURRENT_TEST_STATUS.md', ...ids.map(id => map.modules[id].docs.contract), ...files.filter(f => /^docs\/(tasks|decisions|architecture|refactor)\/.*\.md$/.test(f) && fs.existsSync(path.join(ROOT, f)))])];
  for (const file of docs) {
    for (const [, link] of read(file).matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
      if (/^(?:https?:|#)/.test(link)) continue;
      assert(fs.existsSync(path.resolve(ROOT, path.dirname(file), link.split('#')[0])), `${file}: broken link ${link}`);
    }
  }
  return { status: 'PASS', modules: ids.length, contracts, mappedSourceFiles: sources.length };
}
if (require.main === module) {
  try { console.log(JSON.stringify(checkKnowledge())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkKnowledge };
