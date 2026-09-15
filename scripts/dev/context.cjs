const { context } = require('./project.cjs');
try {
  const [id, flag, focus, ...extra] = process.argv.slice(2);
  if (!id || extra.length || (flag && flag !== '--focus') || (flag && !focus)) throw new Error('Usage: node scripts/dev/context.cjs <module-id> [--focus <name>]');
  console.log(JSON.stringify(context(id, focus), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
