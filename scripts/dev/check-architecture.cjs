const path = require('node:path');
const fs = require('node:fs');
const { builtinModules } = require('node:module');
const { ROOT, read, git } = require('./project.cjs');
const ts = require(path.join(ROOT, 'electron/node_modules/typescript'));
const BUILTINS = new Set(builtinModules.map(m => m.replace(/^node:/, '')));
const RULES = {
  'ARCH-001': 'Renderer imports only browser packages, renderer and common; no privileged Node/Electron or opaque module loading.',
  'ARCH-002': 'Common stays platform-neutral; no privileged packages or dependencies on implementation layers.',
  'ARCH-003': 'Runtime does not import Electron, product Agent or known LLM SDKs.',
  'ARCH-004': 'Product source must not import Development Agent configuration or tooling.',
};
const slash = p => p.replace(/\\/g, '/');
const productFiles = () => [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0'))]
  .filter(f => /^(electron|runtime)\/src\/.*\.tsx?$/.test(f) && fs.existsSync(path.join(ROOT, f)));
const optionsCache = new Map();
function compilerOptions(file) {
  const pkg = file.startsWith('runtime/') ? 'runtime' : 'electron';
  if (!optionsCache.has(pkg)) {
    const configPath = path.join(ROOT, pkg, 'tsconfig.json');
    const result = ts.readConfigFile(configPath, ts.sys.readFile);
    if (result.error) throw new Error(ts.flattenDiagnosticMessageText(result.error.messageText, '\n'));
    const converted = ts.parseJsonConfigFileContent(result.config, ts.sys, path.dirname(configPath));
    if (converted.errors.length) throw new Error('Cannot resolve architecture imports: invalid tsconfig');
    optionsCache.set(pkg, converted.options);
  }
  return optionsCache.get(pkg);
}
function checkSource(file, text, resolve = () => undefined) {
  const renderer = file.startsWith('electron/src/renderer/'), common = file.startsWith('electron/src/common/');
  const runtime = file.startsWith('runtime/src/');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const issues = [];
  const report = (rule, node, detail) => issues.push({ rule, file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, detail });
  for (const error of source.parseDiagnostics) report('PARSE', source, ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  function dependency(node, arg) {
    if (!arg || !(ts.isStringLiteralLike(arg))) {
      if (renderer || common) report(renderer ? 'ARCH-001' : 'ARCH-002', node, 'Nonliteral module loading needs an explicit architecture review');
      return;
    }
    const spec = arg.text.replace(/\\/g, '/');
    const resolved = resolve(spec);
    const target = resolved || (spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)) : spec);
    const privileged = spec === 'electron' || spec.startsWith('electron/') || spec.startsWith('node:') || BUILTINS.has(spec.split('/')[0]);
    const relative = spec.startsWith('.') || !!resolved;
    if (renderer && (privileged || (relative && !/^(electron\/src\/(renderer|common)\/|.*\/node_modules\/)/.test(target)))) report('ARCH-001', node, spec);
    if (common && (privileged || (relative && !target.startsWith('electron/src/common/')))) report('ARCH-002', node, spec);
    if (runtime && (/^electron(?:\/|$)/.test(spec) || /^(electron\/|agent\/)/.test(target) || /^(?:openai|anthropic|@anthropic-ai\/|@openai\/|@langchain\/|langchain(?:\/|$)|@google\/generative-ai|@google\/genai|@ai-sdk\/|ai$)/.test(spec))) report('ARCH-003', node, spec);
    if (/(^|\/)(\.vibecoding|scripts\/dev)(\/|$)/.test(target)) report('ARCH-004', node, spec);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) dependency(node, node.moduleSpecifier);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) dependency(node, node.moduleReference.expression);
    else if (ts.isImportTypeNode(node)) dependency(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : node.argument);
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) dependency(node, node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return issues;
}
function checkArchitecture() {
  const files = productFiles(), issues = [];
  for (const file of files) {
    const resolve = spec => {
      const resolved = ts.resolveModuleName(spec, path.join(ROOT, file), compilerOptions(file), ts.sys).resolvedModule?.resolvedFileName;
      return resolved && slash(path.relative(ROOT, resolved));
    };
    issues.push(...checkSource(file, read(file), resolve));
  }
  return { status: issues.length ? 'FAIL' : 'PASS', rules: Object.keys(RULES).length, scannedFiles: files.length, issues };
}
if (require.main === module) {
  try { const result = checkArchitecture(); console.log(JSON.stringify(result, null, 2)); if (result.status !== 'PASS') process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { RULES, checkSource, checkArchitecture, productFiles };
