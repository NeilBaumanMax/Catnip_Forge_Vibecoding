const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const onboarding = read('src/renderer/components/CatnipOnboarding.tsx');
const app = read('src/renderer/App.tsx');
const browser = read('src/renderer/components/BrowserPanel.tsx');
const chat = read('src/renderer/components/ChatPanel.tsx');
const workspace = read('src/renderer/components/WorkspacePanel.tsx');
const modelPanel = read('src/renderer/components/ModelPanel.tsx');
const explorePanel = read('src/renderer/components/ExplorePanel.tsx');
const styles = read('src/renderer/styles/apple.less');
const rendererSources = `${app}\n${browser}\n${chat}\n${workspace}\n${modelPanel}\n${explorePanel}`;

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const targetIds = [...onboarding.matchAll(/data-tour-id="([^"]+)"/g)].map((match) => match[1]);
expect(targetIds.length >= 24, `expected at least 24 onboarding targets, found ${targetIds.length}`);
for (const targetId of targetIds) {
  expect(rendererSources.includes(`data-tour-id="${targetId}"`), `missing rendered target: ${targetId}`);
}

expect(onboarding.includes('教程只讲解，不会调用模型、连接知乎、修改工程、编译、烧录或打开串口'), 'missing offline safety promise');
expect(onboarding.includes('advanceOnTargetClick: true'), 'missing direct target interaction steps');
expect(onboarding.includes("status: 'later'"), 'missing remind-later persistence');
expect(onboarding.includes("close('completed')"), 'missing completion persistence');
expect(onboarding.includes('跳过此步'), 'missing unavailable-target escape');
expect(app.includes('aria-label="打开新手教程"'), 'missing replay entry in Catnip assistant toolbar');
expect(onboarding.includes('const VERSION = 8;'), 'onboarding state version was not bumped for the updated guide');
expect(onboarding.includes("id: 'welcome'") && onboarding.includes('第一步 · 先认识整个项目') && onboarding.includes('所有区域围绕你启动时选择的同一个工程协作'), 'first tutorial step does not introduce the whole Catnip Forge project');
expect(onboarding.includes("id: 'models-tab'") && onboarding.includes("id: 'models-provider'") && onboarding.includes("id: 'models-mapping'"), 'missing detailed model onboarding steps');
expect(onboarding.indexOf("id: 'models-tab'") < onboarding.indexOf("id: 'agent'"), 'model configuration must be taught before Agent and other feature steps');
expect(onboarding.includes('Sonnet、Opus、Fable、Haiku、Subagent') && onboarding.includes('测试 Messages 接口') && onboarding.includes('运行中和已排队任务不会中途换模型'), 'model onboarding does not explain mapping, testing and task snapshot behavior');
expect(onboarding.includes("id: 'explore-tab'") && onboarding.includes("id: 'explore-flow'"), 'missing Explore onboarding steps');
expect(onboarding.includes("id: 'explore-connection'") && onboarding.includes("id: 'explore-modes'") && onboarding.includes("id: 'explore-history'") && onboarding.includes("id: 'explore-knowledge'"), 'Explore onboarding lacks connection, modes, history or knowledge steps');
expect(onboarding.includes('替换 Secret、在线验证或退出本机登录') && onboarding.includes('标记有效或无效'), 'Explore onboarding lacks credential maintenance or knowledge verification detail');
expect(onboarding.includes("id: 'skill-hub-tab'") && onboarding.includes("id: 'skill-hub-boundary'"), 'missing Neil Skill Hub onboarding steps');
expect(onboarding.includes('描述、查看结论、确认计划、执行'), 'missing Explore four-step gate explanation');
expect(onboarding.includes('.catnip/explore/') && onboarding.includes('返回首页、切标签或重启后可继续'), 'missing project-local Explore history explanation');
expect(onboarding.includes('网页内容不会自动加入工程 Context'), 'missing Skill Hub and local Context boundary');
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
