const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const isolatedUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-guide-user-data-'));
app.setPath('userData', isolatedUserData);
app.once('quit', () => {
  fs.rmSync(isolatedUserData, { recursive: true, force: true });
});

async function main() {
  await app.whenReady();
  const productGuide = fs.readFileSync(path.join(__dirname, '..', 'CATNIP_FORGE_USER_GUIDE.md'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'App.tsx'), 'utf8');
  const gatewaySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'gateway.ts'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.ts'), 'utf8');
  assert(productGuide.includes("Neil·Bauman's 学院呱呱"), 'guide does not identify the current mascot assistant');
  assert(productGuide.includes('当前发布版为 v2.0.0'), 'guide has stale release version');
  assert(productGuide.includes('Windows 安全存储') && productGuide.includes('不要粘贴进学院呱呱或 Agent 聊天框'), 'guide does not explain the current secure credential boundary');
  assert(!productGuide.includes('Key 写入 `resources\\apikey.txt`'), 'guide still describes the obsolete plaintext Key flow');
  assert(['Sonnet：', 'Opus：', 'Fable：', 'Haiku：', 'Subagent：'].every((label) => productGuide.includes(label)) && productGuide.includes('测试配置') && productGuide.includes('配置预览'), 'guide does not explain detailed provider mapping and validation');
  assert(productGuide.indexOf('## 2. 模型配置与更换') < productGuide.indexOf('## 4. Agent 对话'), 'model guidance must precede feature guidance');
  assert(productGuide.includes('四类状态') && productGuide.includes('替换 Secret') && productGuide.includes('退出本机登录'), 'guide does not explain the Zhihu connection lifecycle');
  assert(productGuide.includes('## 6. 找灵感') && productGuide.includes('## 7. 解问题'), 'guide does not separately explain both Explore modes');
  assert(productGuide.includes('.catnip/explore/<模式>/<会话 ID>/session.json') && productGuide.includes('返回探索首页、切换标签页、Renderer 重载或软件重启不会自动清空记录'), 'guide does not explain durable Explore dialogue history');
  assert(productGuide.includes('查看原对话') && productGuide.includes('删除收藏') && productGuide.includes('不删除原探索历史'), 'guide does not explain saved-conversation and knowledge deletion behavior');
  assert(productGuide.includes('验证有效') && productGuide.includes('验证无效') && productGuide.includes('必须再次勾选'), 'guide does not explain local knowledge verification and opt-in context');
  assert(productGuide.includes('Neil 的 skill 小站') && productGuide.includes('网页内容不会自动成为 Agent Context'), 'guide does not explain the Skill Hub boundary');
  assert(appSource.includes('software-assistant-author-link') && appSource.includes('https://github.com/NeilBaumanMax'), 'assistant author link is missing');
  assert(preloadSource.includes("ipcRenderer.invoke('app:open-external', url)"), 'author link IPC is not exposed through preload');
  assert(gatewaySource.includes("!['https:', 'http:'].includes(target.protocol)") && gatewaySource.includes('target.username || target.password') && gatewaySource.includes('shell.openExternal(target.toString())'), 'external link IPC must allow only credential-free HTTP/HTTPS URLs');
  const { buildSoftwareAssistantSystemPrompt } = require('../dist/main/software-assistant');
  const assistantSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'software-assistant.ts'), 'utf8');
  assert(assistantSource.includes('完整的编号步骤') && assistantSource.includes('max_tokens: 1400'), 'assistant runtime still truncates detailed model or Explore guidance');
  const tempRoot = fs.mkdtempSync(path.join(app.getPath('temp'), 'catnip-guide-'));
  const guidePath = path.join(tempRoot, 'CATNIP_FORGE_USER_GUIDE.md');

  try {
    fs.writeFileSync(guidePath, '# 测试手册\n\n动态版本标记 A', 'utf-8');
    const first = await buildSoftwareAssistantSystemPrompt(guidePath);
    assert(first.includes('动态版本标记 A'), 'first guide version missing from prompt');

    fs.writeFileSync(guidePath, '# 测试手册\n\n动态版本标记 B', 'utf-8');
    const second = await buildSoftwareAssistantSystemPrompt(guidePath);
    assert(second.includes('动态版本标记 B'), 'updated guide version missing from prompt');
    assert(!second.includes('动态版本标记 A'), 'guide content was cached instead of re-read');
    assert(second.includes('软件使用手册开始') && second.includes('软件使用手册结束'), 'guide delimiters missing');

    fs.writeFileSync(guidePath, '', 'utf-8');
    const empty = await buildSoftwareAssistantSystemPrompt(guidePath);
    assert(empty.includes('软件使用手册当前不可用'), 'empty guide must use safe fallback');

    fs.unlinkSync(guidePath);
    const missing = await buildSoftwareAssistantSystemPrompt(guidePath);
    assert(missing.includes('软件使用手册当前不可用'), 'missing guide must use safe fallback');

    console.log('software assistant guide smoke ok (dynamic reload + fallback)');
  } finally {
    if (fs.existsSync(guidePath)) fs.unlinkSync(guidePath);
    fs.rmdirSync(tempRoot);
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
