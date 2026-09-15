const { read, projectMap } = require('./project.cjs');
const { lineCount, measure } = require('./check-maintainability.cjs');
const { RULES } = require('./check-architecture.cjs');
const always = ['AGENTS.md', 'docs/product/PRODUCT_REQUIREMENTS.md', 'docs/PROJECT_INDEX.md', 'docs/state/CURRENT.md'];
const reading = files => ({ files: files.length, lines: files.reduce((n, f) => n + lineCount(read(f)), 0), paths: files });
const map = projectMap();
console.log(JSON.stringify({
  before: { ref: '71d63d5d', files: 10, lines: 1301, evidence: 'docs/construction/DEV_AGENT_MAINTAINABILITY_REFACTOR.md' },
  always: reading(always),
  taskTemplate: reading(['docs/tasks/TASK_TEMPLATE.md']),
  exampleColdTask: reading([...always, 'docs/tasks/TASK_TEMPLATE.md', map.modules.explore.docs.contract]),
  modules: Object.keys(map.modules).length,
  contracts: new Set(Object.values(map.modules).map(m => m.docs.contract)).size,
  architectureRules: Object.keys(RULES).length,
  top: measure().top,
}, null, 2));
