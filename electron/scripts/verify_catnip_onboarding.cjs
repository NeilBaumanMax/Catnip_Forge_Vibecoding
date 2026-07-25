const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const onboarding = read('src/renderer/components/CatnipOnboarding.tsx');
const app = read('src/renderer/App.tsx');
const browser = read('src/renderer/components/BrowserPanel.tsx');
const chat = read('src/renderer/components/ChatPanel.tsx');
const workspace = read('src/renderer/components/WorkspacePanel.tsx');
const styles = read('src/renderer/styles/apple.less');
const rendererSources = `${app}\n${browser}\n${chat}\n${workspace}`;

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const targetIds = [...onboarding.matchAll(/data-tour-id="([^"]+)"/g)].map((match) => match[1]);
expect(targetIds.length >= 17, `expected at least 17 onboarding targets, found ${targetIds.length}`);
for (const targetId of targetIds) {
  expect(rendererSources.includes(`data-tour-id="${targetId}"`), `missing rendered target: ${targetId}`);
}

expect(onboarding.includes('不会修改工程、调用模型、编译、烧录或打开串口'), 'missing offline safety promise');
expect(onboarding.includes('advanceOnTargetClick: true'), 'missing direct target interaction steps');
expect(onboarding.includes("status: 'later'"), 'missing remind-later persistence');
expect(onboarding.includes("close('completed')"), 'missing completion persistence');
expect(onboarding.includes('跳过此步'), 'missing unavailable-target escape');
expect(app.includes('aria-label="打开新手教程"'), 'missing replay entry in Catnip assistant toolbar');
expect(onboarding.includes('const VERSION = 5;'), 'onboarding state version was not reset for the repaired guide');
expect(onboarding.includes("prepare: 'agent'"), 'missing automatic Agent panel restoration');
expect(onboarding.includes("prepare: 'assistant'"), 'missing automatic assistant restoration');
expect(onboarding.includes('window.requestAnimationFrame(track)'), 'spotlight does not continuously track moving targets');
expect(onboarding.includes('timestamp - lastPrepareAt >= 250'), 'managed tutorial surfaces are not continuously restored');
expect(app.includes('onEnsureAgentOpen={handleOnboardingEnsureAgentOpen}'), 'App does not restore the Agent panel for onboarding');
expect(app.includes('onEnsureAssistantOpen={handleOnboardingEnsureAssistantOpen}'), 'App does not restore the assistant for onboarding');
expect(styles.includes('grid-template-columns: 88px minmax(0, 1fr)'), 'onboarding guide image was not enlarged');
expect(styles.includes('font-size: 14px'), 'onboarding body text was not enlarged');
expect(onboarding.includes('刷新工程 → 选择工程 → 编译'), 'missing explicit build workflow');
expect(onboarding.includes('刷新设备 → 选择串口 → 烧录'), 'missing explicit flash workflow');
expect(onboarding.includes('One Prompt, Working Hardware'), 'missing product promise in completion step');
expect(app.includes('!window.electronAPI?.isWorkbenchSmokeTest'), 'workbench smoke must not be interrupted by onboarding');
expect(styles.includes('@media (prefers-reduced-motion: reduce)'), 'missing reduced-motion support');
expect(styles.includes('@media (prefers-reduced-transparency: reduce)'), 'missing reduced-transparency support');
expect(styles.includes('.catnip-onboarding-spotlight'), 'missing spotlight styling');

if (failures.length) {
  console.error(`Catnip onboarding verification failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Catnip onboarding verification passed: ${targetIds.length} stable targets, persistence, replay, safety and accessibility rules present.`);
