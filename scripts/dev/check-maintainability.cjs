const { read } = require('./project.cjs');
const { productFiles } = require('./check-architecture.cjs');
const lineCount = body => body.trimEnd().split(/\r?\n/).length;
function classify(file, lines) {
  const ui = file.endsWith('.tsx');
  if (ui && lines > 1200) return 'NO_NEW_MAJOR_BUSINESS_LOGIC';
  if (lines > 800) return 'EXTRACTION_PREFERRED';
  if (lines >= (ui ? 400 : 500)) return 'REVIEW';
  return 'NORMAL';
}
function measure() {
  const baseline = JSON.parse(read('.vibecoding/maintainability.json'));
  if (baseline.schema !== 1) throw new Error('Unsupported maintainability schema');
  const rows = productFiles().map(file => {
    const lines = lineCount(read(file)), previous = baseline.hotspots[file];
    return { file, lines, warning: classify(file, lines), ...(previous === undefined ? {} : { baseline: previous, growth: lines - previous, zone: 'NO_NEW_MAJOR_BUSINESS_LOGIC' }) };
  }).sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));
  for (const file of Object.keys(baseline.hotspots)) if (!rows.some(r => r.file === file)) throw new Error('Hotspot moved/deleted: reconcile baseline and map explicitly: ' + file);
  return { status: 'PASS', policy: baseline.policy, note: 'Warnings are review triggers, not permission to delete code or a behavior test.', warnings: rows.filter(r => r.warning !== 'NORMAL' || r.zone), top: rows.slice(0, 15) };
}
if (require.main === module) {
  try { const result = measure(); console.log(JSON.stringify({ ...result, top: undefined }, null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { lineCount, classify, measure };
