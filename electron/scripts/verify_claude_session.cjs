const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catnip-project-chat-'));
  const projectsRoot = path.join(tempRoot, 'projects');
  const sessionsRoot = path.join(tempRoot, 'sessions');
  const legacySessionFile = path.join(tempRoot, 'legacy', 'session.json');
  fs.mkdirSync(path.join(projectsRoot, 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(projectsRoot, 'beta'), { recursive: true });
  fs.mkdirSync(path.dirname(legacySessionFile), { recursive: true });
  const legacyConversationId = 'conversation-legacy-unassigned';
  const legacyTimestamp = new Date(0).toISOString();
  fs.writeFileSync(legacySessionFile, JSON.stringify({
    version: 2,
    activeConversationId: legacyConversationId,
    conversations: [{
      id: legacyConversationId,
      title: 'Legacy unassigned history',
      pinned: true,
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
      turnCount: 0,
      turns: [],
      messages: [{ id: 'legacy-message', text: 'legacy data remains readable', role: 'user', timestamp: 0 }],
    }],
  }), 'utf8');
  process.env.CATNIP_PROJECTS_ROOT = projectsRoot;
  process.env.CATNIP_PROJECT_SESSIONS_ROOT = sessionsRoot;
  process.env.CATNIP_LEGACY_SESSION_FILE = legacySessionFile;
  await app.whenReady();

  const {
    appendClaudeSessionTurn,
    appendChatMessage,
    buildClaudeSessionContext,
    createChatConversation,
    deleteChatConversation,
    getChatConversation,
    getClaudeSessionFile,
    listChatConversations,
    loadClaudeSession,
    renameChatConversation,
    setChatConversationPinned,
    activateChatConversation,
  } = require('../dist/main/worker/session-store.js');
  const { activateProject, getProjectSessionStatus } = require('../dist/main/project-session.js');

  const projects = getProjectSessionStatus().projects;
  const alpha = projects.find((project) => project.name === 'alpha');
  const beta = projects.find((project) => project.name === 'beta');
  if (!alpha || !beta) throw new Error('isolated projects were not discovered');
  activateProject(alpha.id);
  const sessionFile = getClaudeSessionFile();
  if (sessionFile !== path.join(alpha.projectDir, '.catnip', 'agent', 'conversations.json')) {
    throw new Error('project Agent conversation is not stored inside the project .catnip directory');
  }
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });

  try {
    fs.rmSync(sessionFile, { force: true });
    const first = loadClaudeSession();
    appendClaudeSessionTurn({
      user: 'memory-smoke-user-1',
      assistant: 'memory-smoke-agent-1',
      status: 'completed',
    });
    const second = appendClaudeSessionTurn({
      user: 'memory-smoke-user-2',
      assistant: 'memory-smoke-agent-2',
      status: 'completed',
    });
    const context = buildClaudeSessionContext();

    if (first.turnCount !== 0) throw new Error('new session did not start empty');
    if (second.turnCount !== 2) throw new Error(`expected turnCount=2, got ${second.turnCount}`);
    if (!context.text.includes('memory-smoke-user-1') || !context.text.includes('memory-smoke-agent-2')) {
      throw new Error('session context did not include previous turns');
    }

    appendChatMessage(first.id, {
      id: 'message-user-1',
      text: '历史工程 A @espidf-hardboard',
      role: 'user',
      timestamp: Date.now(),
      skillRefs: [{ id: 'espidf-hardboard', name: 'ESP-IDF Hardboard Vibecoding', start: 7, end: 24 }],
    });
    const restoredMessage = getChatConversation(first.id).messages.find((message) => message.id === 'message-user-1');
    if (restoredMessage?.skillRefs?.[0]?.id !== 'espidf-hardboard' || restoredMessage.skillRefs[0].start !== 7) {
      throw new Error('skill reference positions did not survive session persistence');
    }
    const another = createChatConversation();
    appendChatMessage(another.id, {
      id: 'message-user-2',
      text: '历史工程 B',
      role: 'user',
      timestamp: Date.now() + 1,
    });
    appendClaudeSessionTurn({
      user: 'conversation-b-user',
      assistant: 'conversation-b-agent',
      status: 'completed',
    }, another.id);
    activateChatConversation(first.id);
    const list = listChatConversations();
    const writableList = list.conversations.filter((conversation) => !conversation.readOnly);
    if (writableList.length !== 2 || list.activeConversationId !== first.id) {
      throw new Error('multi-conversation list or activation failed');
    }
    if (list.conversations.some((conversation) => conversation.id === legacyConversationId || conversation.readOnly)) {
      throw new Error('legacy unassigned history must not be exposed in the Agent conversation list');
    }
    if (buildClaudeSessionContext(first.id).text.includes('conversation-b-user')) {
      throw new Error('conversation contexts leaked into each other');
    }
    renameChatConversation(first.id, '置顶工程');
    setChatConversationPinned(first.id, true);
    const afterEdit = listChatConversations();
    if (afterEdit.conversations[0].id !== first.id || afterEdit.conversations[0].title !== '置顶工程' || !afterEdit.conversations[0].pinned) {
      throw new Error('conversation rename or pin failed');
    }
    const afterDelete = deleteChatConversation(another.id);
    if (afterDelete.conversations.filter((conversation) => !conversation.readOnly).length !== 1 || afterDelete.activeConversationId !== first.id) {
      throw new Error('conversation deletion failed');
    }

    const betaLegacyId = 'conversation-beta-legacy';
    const betaLegacyFile = path.join(sessionsRoot, beta.id, 'agent', 'conversations.json');
    fs.mkdirSync(path.dirname(betaLegacyFile), { recursive: true });
    fs.writeFileSync(betaLegacyFile, JSON.stringify({
      version: 2, activeConversationId: betaLegacyId, conversations: [{
        id: betaLegacyId, title: 'beta migrated', pinned: false, createdAt: legacyTimestamp, updatedAt: legacyTimestamp,
        turnCount: 0, turns: [], messages: [{ id: 'beta-migrated-message', text: 'beta migrated', role: 'user', timestamp: 1 }],
      }],
    }), 'utf8');
    activateProject(beta.id);
    const betaList = listChatConversations();
    const betaConversation = getChatConversation(betaList.activeConversationId);
    if (betaList.conversations.filter((conversation) => !conversation.readOnly).length !== 1 || betaConversation.messages[0]?.id !== 'beta-migrated-message') {
      throw new Error('project chat migration failed or histories leaked from alpha into beta');
    }
    if (!fs.existsSync(path.join(beta.projectDir, '.catnip', 'agent', 'conversations.json')) || !fs.existsSync(betaLegacyFile)) throw new Error('project chat migration did not preserve both target and legacy source');
    appendChatMessage(betaList.activeConversationId, {
      id: 'beta-only',
      text: 'beta only',
      role: 'user',
      timestamp: Date.now(),
    });
    activateProject(alpha.id);
    if (!getChatConversation(first.id).messages.some((message) => message.id === 'message-user-1')) {
      throw new Error('alpha history was not restored after project switch');
    }
    if (!fs.existsSync(legacySessionFile) || !fs.readFileSync(legacySessionFile, 'utf8').includes('legacy data remains readable')) {
      throw new Error('legacy source history was modified or removed');
    }

    console.log(`session smoke ok: scoped alpha/beta, ${second.id} turns=${second.turnCount}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
