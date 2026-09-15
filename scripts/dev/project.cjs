const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const manifest = () => JSON.parse(read('electron/package.json'));
const projectMap = () => JSON.parse(read('.vibecoding/project-map.yaml'));

function relativeFile(value) {
  const normalized = value.replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)
    || normalized.split('/').some(p => p === '..' || p === '.' || !p)) {
    throw new Error(`Expected repository-relative path: ${value}`);
  }
  return normalized;
}

function matches(file, glob) {
  const expression = glob.split(/(\*\*|\*|\?)/).map(part =>
    part === '**' ? '.*' : part === '*' ? '[^/]*' : part === '?' ? '[^/]' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  return new RegExp(`^${expression}$`).test(file);
}

function git(args, root = ROOT) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function changedFiles(base, root = ROOT) {
  // --no-renames deliberately keeps both deletion and addition paths for routing.
  const split = value => value.split('\0').filter(Boolean);
  const work = split(git(['diff', '--name-only', '-z', '--no-renames', 'HEAD', '--'], root));
  const untracked = split(git(['ls-files', '--others', '--exclude-standard', '-z'], root));
  const revision = base ? git(['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`], root).trim() : null;
  const committed = revision ? split(git(['diff', '--name-only', '-z', '--no-renames', `${revision}...HEAD`, '--'], root)) : [];
  return [...new Set([...committed, ...work, ...untracked])].map(relativeFile).sort();
}

function route(files, map = projectMap()) {
  const found = new Set(), unknown = [];
  for (const input of files) {
    const file = relativeFile(input);
    const ids = Object.entries(map.modules).filter(([, m]) => m.paths.some(p => matches(file, p))).map(([id]) => id);
    if (!ids.length) unknown.push(file);
    ids.forEach(id => found.add(id));
  }
  return { modules: [...found].sort(), unknown };
}

function context(id, focus, map = projectMap()) {
  const module = map.modules[id];
  if (!module) throw new Error(`Unknown module: ${id}`);
  const selected = focus ? module.focus?.[focus] : null;
  if (focus && !selected) throw new Error(`Unknown focus ${focus} for ${id}`);
  return {
    module: id, focus: focus || null, frozen: module.status.frozen,
    docs: ['AGENTS.md', 'docs/PROJECT_INDEX.md', 'docs/state/CURRENT.md', 'docs/product/PRODUCT_REQUIREMENTS.md', module.docs.contract],
    source: selected?.source || module.code,
    read_only: selected?.read_only || [], find: selected?.find || [],
    tests: selected?.tests || [...new Set([...module.tests.fast, ...module.tests.module])],
    conditional_contracts: module.depends_on.map(d => map.modules[d].docs.contract),
    decisions: module.decisions,
    note: 'Read CURRENT active-task pointer. Load dependent contracts only for touched interfaces; no history by default.',
  };
}
module.exports = { ROOT, read, manifest, projectMap, relativeFile, matches, git, changedFiles, route, context };
