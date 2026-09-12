import { contextBridge, ipcRenderer } from 'electron';
import type { AddVerificationRecordInput, ExploreAnalysisResult, ExploreContextGatherRequest, ExploreExecutionConfirmRequest, ExploreRequest, HandoffContext, SaveKnowledgeCardInput } from '../common/explore';
import type { ExploreHandoffArtifact, ExploreWorkSessionRecord } from '../common/project-session';
import type { ModelConfigState, ModelSetupMode } from '../common/model-config';

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  notifyRendererInteractive: () => ipcRenderer.send('renderer:interactive'),
  getStartupStatus: () => ipcRenderer.invoke('startup:status'),
  configureStartupModel: () => ipcRenderer.invoke('startup:configure-model'),
  askSoftwareAssistant: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => ipcRenderer.invoke('software-assistant:ask', messages),
  listModels: () => ipcRenderer.invoke('models:list'),
  saveModels: (config: ModelConfigState, expectedRevision: number) => ipcRenderer.invoke('models:save', config, expectedRevision),
  configureModelCredential: (providerId: string) => ipcRenderer.invoke('models:credential:configure', providerId),
  deleteModelCredential: (providerId: string) => ipcRenderer.invoke('models:credential:delete', providerId),
  activateClaudeProvider: (providerId: string, expectedRevision: number, setupMode?: ModelSetupMode) => ipcRenderer.invoke('models:claude-provider:activate', providerId, expectedRevision, setupMode),
  getProjectSessionStatus: () => ipcRenderer.invoke('project:session:status'),
  activateProjectSession: (projectId: string) => ipcRenderer.invoke('project:session:activate', projectId),
  createProjectSession: (name: string) => ipcRenderer.invoke('project:session:create', name),
  sendMessage: (request: { text: string; skillRefs: Array<{ id: string; name: string; start: number; end: number }>; attachments?: Array<{ id: string; name: string; mimeType: string; size: number; kind: string; textAvailable: boolean; warning?: string }> }, mode?: 'auto' | 'guide' | 'queue', conversationId?: string, messageId?: string, timestamp?: number) => ipcRenderer.invoke('chat:send', request, mode, conversationId, messageId, timestamp),
  pickChatAttachments: (conversationId: string) => ipcRenderer.invoke('chat:attachments:pick', conversationId),
  onMessage: (cb: (msg: { id?: string; text: string; timestamp: number; kind?: 'conversation' | 'progress' | 'detail' | 'status'; toolName?: string; error?: boolean; taskId?: string | null; conversationId?: string }) => void) => {
    ipcRenderer.on('chat:message', (_event, msg) => cb(msg));
  },
  listChatConversations: () => ipcRenderer.invoke('chat:conversations:list'),
  getChatConversation: (id?: string) => ipcRenderer.invoke('chat:conversations:get', id),
  createChatConversation: () => ipcRenderer.invoke('chat:conversations:create'),
  activateChatConversation: (id: string) => ipcRenderer.invoke('chat:conversations:activate', id),
  deleteChatConversation: (id: string) => ipcRenderer.invoke('chat:conversations:delete', id),
  renameChatConversation: (id: string, title: string) => ipcRenderer.invoke('chat:conversations:rename', id, title),
  setChatConversationPinned: (id: string, pinned: boolean) => ipcRenderer.invoke('chat:conversations:pin', id, pinned),
  onTaskComplete: (cb: (result: { code: number | null; taskId?: string | null }) => void) => {
    ipcRenderer.on('task:complete', (_event, result) => cb(result));
  },
  onTaskProgress: (cb: (result: { steps: Array<{ id: string; label: string; done: boolean }>; taskId?: string | null }) => void) => {
    ipcRenderer.on('task:progress', (_event, result) => cb(result));
  },
  onTaskStatus: (cb: (result: { busy: boolean; paused: boolean; activeTaskId: string | null; activeTask: string | null; queueLength: number; guidanceCount: number }) => void) => {
    ipcRenderer.on('task:status', (_event, result) => cb(result));
  },
  getTaskStatus: () => ipcRenderer.invoke('task:status'),
  pauseTask: () => ipcRenderer.invoke('task:pause'),
  resumeTask: () => ipcRenderer.invoke('task:resume'),
  stopTask: () => ipcRenderer.invoke('task:stop'),
  navigateBrowser: (url: string) => ipcRenderer.invoke('browser:navigate', url),
  openExternalUrl: (url: string) => ipcRenderer.invoke('app:open-external', url),
  getBrowserState: () => ipcRenderer.invoke('browser:getState'),
  setBrowserBounds: (bounds: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('browser:setBounds', bounds),
  listBrowserTabs: () => ipcRenderer.invoke('browser:listTabs'),
  getWorkbenchOverview: () => ipcRenderer.invoke('workbench:getOverview'),
  openWorkbenchItem: (targetPath: string) => ipcRenderer.invoke('workbench:openItem', targetPath),
  openWorkbenchFolder: (targetPath: string) => ipcRenderer.invoke('workbench:openFolder', targetPath),
  readWorkbenchFile: (targetPath: string) => ipcRenderer.invoke('workbench:readFile', targetPath),
  listWorkbenchDirectory: (targetPath: string) => ipcRenderer.invoke('workbench:listDirectory', targetPath),
  writeWorkbenchFile: (targetPath: string, text: string) => ipcRenderer.invoke('workbench:writeFile', targetPath, text),
  createWorkbenchEntry: (parentPath: string, name: string, kind: 'file' | 'dir') => ipcRenderer.invoke('workbench:createEntry', parentPath, name, kind),
  renameWorkbenchEntry: (targetPath: string, nextName: string) => ipcRenderer.invoke('workbench:renameEntry', targetPath, nextName),
  deleteWorkbenchEntry: (targetPath: string) => ipcRenderer.invoke('workbench:deleteEntry', targetPath),
  listManagedSkills: () => ipcRenderer.invoke('skills:list'),
  getManagedSkill: (id: string) => ipcRenderer.invoke('skills:get', id),
  saveManagedSkill: (input: { id: string; name: string; description: string; body: string; originalId?: string }) => ipcRenderer.invoke('skills:save', input),
  deleteManagedSkill: (id: string) => ipcRenderer.invoke('skills:delete', id),
  syncManagedSkills: () => ipcRenderer.invoke('skills:sync'),
  listExploreKnowledge: () => ipcRenderer.invoke('explore:knowledge:list'),
  saveExploreKnowledge: (input: SaveKnowledgeCardInput) => ipcRenderer.invoke('explore:knowledge:save', input),
  deleteExploreKnowledge: (cardId: string) => ipcRenderer.invoke('explore:knowledge:delete', cardId),
  addExploreKnowledgeVerification: (input: AddVerificationRecordInput) => ipcRenderer.invoke('explore:knowledge:addVerification', input),
  findRelatedExploreKnowledge: (query: string, limit?: number) => ipcRenderer.invoke('explore:knowledge:findRelated', query, limit),
  selectExploreKnowledgeForContext: (selectedIds: string[]) => ipcRenderer.invoke('explore:knowledge:selectForContext', selectedIds),
  listExploreWorkSessions: (mode?: 'idea' | 'diagnosis') => ipcRenderer.invoke('explore:sessions:list', mode),
  createExploreWorkSession: (mode: 'idea' | 'diagnosis') => ipcRenderer.invoke('explore:sessions:create', mode),
  getExploreWorkSession: (mode: 'idea' | 'diagnosis', id: string) => ipcRenderer.invoke('explore:sessions:get', mode, id),
  saveExploreWorkSession: (session: ExploreWorkSessionRecord) => ipcRenderer.invoke('explore:sessions:save', session),
  deleteExploreWorkSession: (mode: 'idea' | 'diagnosis', id: string) => ipcRenderer.invoke('explore:sessions:delete', mode, id),
  getExploreZhihuStatus: () => ipcRenderer.invoke('explore:zhihu:status'),
  installExploreZhihuConnection: () => ipcRenderer.invoke('explore:zhihu:install'),
  beginExploreZhihuConnection: () => ipcRenderer.invoke('explore:zhihu:connect'),
  replaceExploreZhihuSecret: () => ipcRenderer.invoke('explore:zhihu:replace'),
  verifyExploreZhihuSecret: () => ipcRenderer.invoke('explore:zhihu:verify'),
  logoutExploreZhihu: () => ipcRenderer.invoke('explore:zhihu:logout'),
  gatherExploreContext: (request: ExploreContextGatherRequest) => ipcRenderer.invoke('explore:context:gather', request),
  prepareExploreRequest: (request: ExploreRequest) => ipcRenderer.invoke('explore:request:prepare', request),
  startExploreAnalysis: (request: ExploreRequest) => ipcRenderer.invoke('explore:analysis:start', request),
  onExploreAnalysisResult: (cb: (result: ExploreAnalysisResult) => void) => {
    ipcRenderer.on('explore:analysis:result', (_event, result) => cb(result));
  },
  onExploreAnalysisError: (cb: (result: { mode: 'analysis' | 'plan'; requestId?: string; message: string }) => void) => {
    ipcRenderer.on('explore:analysis:error', (_event, result) => cb(result));
  },
  onExploreConversationMessage: (cb: (message: { text: string; timestamp: number; kind?: string; error?: boolean; taskId?: string; requestId?: string; mode: 'analysis' | 'plan' }) => void) => {
    ipcRenderer.on('explore:conversation:message', (_event, message) => cb(message));
  },
  startExplorePlan: (handoff: HandoffContext) => ipcRenderer.invoke('explore:handoff:plan', handoff),
  createExploreHandoffArtifact: (value: { sessionId: string; handoff: HandoffContext; planResult: ExploreAnalysisResult }) => ipcRenderer.invoke('explore:handoff:artifact:create', value) as Promise<ExploreHandoffArtifact>,
  getExploreHandoffArtifact: (sessionId: string) => ipcRenderer.invoke('explore:handoff:artifact:get', sessionId) as Promise<ExploreHandoffArtifact>,
  confirmExploreExecution: (request: ExploreExecutionConfirmRequest) => ipcRenderer.invoke('explore:handoff:execute', request),
  isWorkbenchSmokeTest: process.env.VIBEIDE_SMOKE_WORKBENCH_OPEN === '1',
  finishWorkbenchSmokeTest: (result: unknown) => ipcRenderer.invoke('smoke:workbench:finish', result),
  activateBrowserTab: (id: string) => ipcRenderer.invoke('browser:activateTab', id),
  closeBrowserTab: (id: string) => ipcRenderer.invoke('browser:closeTab', id),
  startBrowserRecording: () => ipcRenderer.invoke('browser:startRecording'),
  stopBrowserRecording: (label?: string) => ipcRenderer.invoke('browser:stopRecording', label),
  replayLatestBrowserRecording: () => ipcRenderer.invoke('browser:replayLatestRecording'),
  replayBrowserRecording: (target?: string) => ipcRenderer.invoke('browser:replayRecording', target),
  listBrowserRecordings: () => ipcRenderer.invoke('browser:listRecordings'),
  listBrowserRecordingSummaries: () => ipcRenderer.invoke('browser:listRecordingSummaries'),
  listHardboardDevices: () => ipcRenderer.invoke('hardboard:listDevices'),
  getHardboardRuntimeEvents: (sinceSeq?: number) => ipcRenderer.invoke('hardboard:runtimeEvents', sinceSeq),
  clearHardboardRuntimeHistory: () => ipcRenderer.invoke('hardboard:runtimeHistoryClear'),
  startHardboardBuild: (options?: { projectDir?: string; cmakeFile?: string; configFile?: string; sourceFile?: string }) => ipcRenderer.invoke('hardboard:buildStart', options),
  startHardboardFlash: (options: { projectDir?: string; port: string; artifactFile?: string; configFile?: string }) => ipcRenderer.invoke('hardboard:flashStart', options),
  readHardboardSourceFile: (targetPath: string) => ipcRenderer.invoke('hardboard:readSource', targetPath),
  startSerialMonitor: (options: { port: string; baudRate: number; encoding: string; dataBits?: number; stopBits?: number; parity?: 'none' | 'odd' | 'even' }) => ipcRenderer.invoke('hardboard:serialStart', options),
  stopSerialMonitor: () => ipcRenderer.invoke('hardboard:serialStop'),
  writeSerialMonitor: (data: string, mode: 'text' | 'hex', encoding: string) => ipcRenderer.invoke('hardboard:serialWrite', data, mode, encoding),
  getSerialMonitorStatus: () => ipcRenderer.invoke('hardboard:serialStatus'),
  clearSerialMonitor: () => ipcRenderer.invoke('hardboard:serialClear'),
  onSerialData: (cb: (chunk: { seq: number; text: string; hex?: string; timestamp: number; stream: 'stdout' | 'stderr'; direction: 'rx' | 'tx' | 'system'; actor: 'ui' | 'agent' | 'system' }) => void) => {
    ipcRenderer.on('hardboard:serial-data', (_event, chunk) => cb(chunk));
  },
  onSerialState: (cb: (snapshot: unknown) => void) => {
    ipcRenderer.on('hardboard:serial-state', (_event, snapshot) => cb(snapshot));
  },
  onSerialClear: (cb: (event: { actor: 'ui' | 'agent' | 'system'; lastSeq: number }) => void) => {
    ipcRenderer.on('hardboard:serial-clear', (_event, result) => cb(result));
  },
  onSerialExit: (cb: (result: { code: number | null; signal: string | null }) => void) => {
    ipcRenderer.on('hardboard:serial-exit', (_event, result) => cb(result));
  },
  onBrowserTabs: (cb: (result: { tabs: Array<{ id: string; title: string; url: string; active: boolean }> }) => void) => {
    ipcRenderer.on('browser:tabs', (_event, result) => cb(result));
  },
});
