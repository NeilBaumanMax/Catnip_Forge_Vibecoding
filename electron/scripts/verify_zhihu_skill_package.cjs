const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { minimatch } = require('minimatch');

const electronRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(electronRoot, '..');
const sourceRoot = path.join(projectRoot, 'agent', 'skills', 'zhihu');
const config = yaml.load(fs.readFileSync(path.join(electronRoot, 'electron-builder.yml'), 'utf-8'));
const agentResource = config.extraResources.find((entry) => entry.from === '../agent' && entry.to === 'agent');
assert(agentResource, 'electron-builder must copy the agent resource tree');
assert(Array.isArray(agentResource.filter) && agentResource.filter.includes('**/*'), 'agent resource must include its complete tree');

const sourceFiles = listFiles(sourceRoot).map((file) => path.relative(path.join(projectRoot, 'agent'), file).split(path.sep).join('/'));
assert.equal(sourceFiles.length, 15, 'official zhihu source tree changed unexpectedly');
for (const relative of sourceFiles) {
  assert(matchesFilter(relative, agentResource.filter), `electron-builder filters exclude official Skill file: ${relative}`);
}
assert(!sourceFiles.some((relative) => /(?:^|\/)(?:\.env|zhihu-cli\.exe)$/i.test(relative)), 'official Skill source contains a credential or CLI binary');

const packageRoot = process.env.CATNIP_PACKAGE_ROOT ? path.resolve(process.env.CATNIP_PACKAGE_ROOT) : null;
if (packageRoot) {
  const packagedRoot = path.join(packageRoot, 'resources', 'agent', 'skills', 'zhihu');
  for (const relativeFromAgent of sourceFiles) {
    const relative = relativeFromAgent.replace(/^skills\/zhihu\//, '');
    assert.deepEqual(
      fs.readFileSync(path.join(packagedRoot, relative)),
      fs.readFileSync(path.join(sourceRoot, relative)),
      `packaged official Skill file changed: ${relative}`,
    );
  }
  assert(!fs.existsSync(path.join(packagedRoot, 'zhihu-cli.exe')), 'package must not contain the user-installed CLI');
}

console.log(`official zhihu package contract ok (${sourceFiles.length} files${packageRoot ? ', packaged bytes verified' : ', builder filters verified'})`);

function matchesFilter(relative, patterns) {
  let included = false;
  for (const pattern of patterns) {
    const excluded = pattern.startsWith('!');
    const glob = excluded ? pattern.slice(1) : pattern;
    if (minimatch(relative, glob, { dot: true })) included = !excluded;
  }
  return included;
}

function listFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(target));
    else if (entry.isFile()) files.push(target);
  }
  return files.sort();
}