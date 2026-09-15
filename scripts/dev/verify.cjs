const { changedFiles, relativeFile } = require('./project.cjs');
const { profile, changedPlan, summarizePlan, runSteps } = require('./verification.cjs');
try {
  const [mode, ...args] = process.argv.slice(2);
  let base, files, planOnly = false, full = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan') planOnly = true;
    else if (args[i] === '--full') full = true;
    else if (args[i] === '--base' && args[i + 1] && !args[i + 1].startsWith('--')) base = args[++i];
    else if (args[i] === '--files') { files = args.slice(i + 1).map(relativeFile); if (!files.length || files.some(f => f.startsWith('--'))) throw new Error('--files needs paths and must be last'); break; }
    else throw new Error(`Unknown/incomplete argument: ${args[i]}`);
  }
  if (mode !== 'changed' && (base || files)) throw new Error('--base/--files apply only to changed');
  if (full && mode !== 'changed' && !planOnly) throw new Error('--full applies only to plan output');
  const plan = mode === 'changed' ? changedPlan(files || changedFiles(base)) : profile(mode);
  if (mode === 'changed' || planOnly) {
    console.log(JSON.stringify(summarizePlan(plan, full), null, 2));
  }
  else {
    const result = runSteps(plan.steps);
    console.log(JSON.stringify({ profile: mode, ...result, requirements: plan.requirements }, null, 2));
    if (result.status !== 'PASS') process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
