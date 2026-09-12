import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BrainCircuit, Clock3, Code2, FolderClock, Lightbulb, List, MessageCircleMore, Paperclip, Pin, Search, Send, Sparkles, Wrench } from 'lucide-react';
import type { AgentTaskInput, AgentTaskStatus, AttachmentReference, ChatConversationSummary, ChatMessage, ManagedSkillSummary, SkillReference, TaskStep, TaskSubmitMode } from '../types';
import type { ModelProfile, ProviderConfig } from '../../common/model-config';
import MarkdownContent from './MarkdownContent';
import TaskProgress from './TaskProgress';
import catnipAgentWelcomeImage from '../assets/catnip-agent-welcome-v2.webp';

interface Props {
  messages: ChatMessage[];
  steps: TaskStep[];
  conversations: ChatConversationSummary[];
  activeConversationId: string;
  historyError: string;
  taskStatus: AgentTaskStatus;
  onSend: (task: AgentTaskInput, mode: TaskSubmitMode) => void;
  onStop: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onToggleConversationPinned: (id: string, pinned: boolean) => void;
  onSetConversationModel: (id: string, modelProfileId: string) => void;
}

interface ExecutionGroup {
  key: string;
  messages: ChatMessage[];
}

const PROFESSIONAL_VIEW_KEY = 'vibeide.chat.professionalView';
const HISTORY_COLLAPSED_KEY = 'vibeide.chat.historyCollapsed';
const COMPOSER_HEIGHT_KEY = 'vibeide.chat.composerHeight';
const COMPOSER_MIN_HEIGHT = 64;
const COMPOSER_MAX_HEIGHT = 320;
const CHAT_ACTIONS = [
  { label: '分析代码问题', prompt: '帮我分析当前工程里最值得先解决的问题', icon: Code2, tone: 'blue' },
  { label: '实现新功能', prompt: '帮我找一个能落地的新功能方向', icon: Sparkles, tone: 'purple' },
  { label: '解释技术概念', prompt: '解释一下这个工程的核心结构', icon: BrainCircuit, tone: 'violet' },
  { label: '制定开发计划', prompt: '为当前工程制定下一步开发计划', icon: List, tone: 'cyan' },
] as const;
const CHAT_SUGGESTIONS = [
  '如何用 ESP32-S3 做一个触摸屏项目？',
  '帮我分析一下这个报错信息',
  '给我一些 UI 设计的灵感',
  '帮我制定一个项目开发计划',
] as const;
const SKILL_MARKER_COLORS = [
  { fill: 'rgba(255, 214, 64, 0.58)', strong: 'rgba(255, 196, 0, 0.78)' },
  { fill: 'rgba(93, 224, 171, 0.48)', strong: 'rgba(38, 190, 132, 0.72)' },
  { fill: 'rgba(255, 139, 112, 0.50)', strong: 'rgba(246, 92, 70, 0.72)' },
  { fill: 'rgba(91, 185, 255, 0.48)', strong: 'rgba(44, 139, 232, 0.72)' },
  { fill: 'rgba(190, 137, 255, 0.48)', strong: 'rgba(144, 88, 230, 0.72)' },
  { fill: 'rgba(255, 126, 190, 0.48)', strong: 'rgba(230, 72, 151, 0.72)' },
] as const;

function skillMarkerStyle(id: string): React.CSSProperties {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const color = SKILL_MARKER_COLORS[(hash >>> 0) % SKILL_MARKER_COLORS.length];
  return {
    '--skill-marker-fill': color.fill,
    '--skill-marker-strong': color.strong,
  } as React.CSSProperties;
}

function readProfessionalView(): boolean {
  try {
    return window.localStorage.getItem(PROFESSIONAL_VIEW_KEY) === 'true';
  } catch {
    return false;
  }
}

function readHistoryCollapsed(): boolean {
  try {
    return window.localStorage.getItem(HISTORY_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function conversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function executionKey(message: ChatMessage): string {
  return message.taskId ? `task:${message.taskId}` : 'task:general';
}

function formatDuration(messages: ChatMessage[]): string {
  if (messages.length < 2) return '';
  const duration = Math.max(0, messages[messages.length - 1].timestamp - messages[0].timestamp);
  if (duration < 1000) return '';
  const seconds = Math.round(duration / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

function compactExecutionLabel(message: ChatMessage): string {
  return message.text
    .replace(/^\[(?:Agent|Worker)\]\s*/, '')
    .replace(/^•\s*/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function detailLabel(message: ChatMessage): string {
  if (message.error) return '错误';
  if (message.kind === 'status') return '状态';
  if (message.kind === 'progress') return '过程';
  if (message.toolName === 'Skill') return '技能';
  if (message.toolName) return '工具';
  return '详情';
}

function clampComposerHeight(value: number): number {
  return Math.min(COMPOSER_MAX_HEIGHT, Math.max(COMPOSER_MIN_HEIGHT, Math.round(value)));
}

function readComposerHeight(): number {
  try {
    const stored = Number(window.localStorage.getItem(COMPOSER_HEIGHT_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampComposerHeight(stored) : COMPOSER_MIN_HEIGHT;
  } catch {
    return COMPOSER_MIN_HEIGHT;
  }
}

function skillTokensFromText(text: string, skills: ManagedSkillSummary[]): SkillReference[] {
  const available = new Map(skills.filter((skill) => skill.deployed).map((skill) => [skill.id, skill]));
  const references: SkillReference[] = [];
  const pattern = /(^|[^a-z0-9._%+-])@([a-z0-9]+(?:-[a-z0-9]+)*)/gi;
  for (const match of text.matchAll(pattern)) {
    const id = match[2].toLowerCase();
    const skill = available.get(id);
    const start = (match.index ?? -1) + match[1].length;
    if (start < 0) continue;
    references.push({ id, name: skill?.name ?? id, start, end: start + id.length + 1 });
  }
  return references;
}

function recognizedSkillTokensFromText(text: string, skills: ManagedSkillSummary[]): SkillReference[] {
  const available = new Set(skills.filter((skill) => skill.deployed).map((skill) => skill.id));
  return skillTokensFromText(text, skills).filter((reference) => available.has(reference.id));
}

function skillReferencesFromText(text: string, skills: ManagedSkillSummary[]): SkillReference[] {
  const seen = new Set<string>();
  return skillTokensFromText(text, skills).filter((reference) => {
    if (seen.has(reference.id)) return false;
    seen.add(reference.id);
    return true;
  });
}

function mentionAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const prefix = text.slice(0, caret);
  const start = prefix.lastIndexOf('@');
  if (start < 0) return null;
  const query = prefix.slice(start + 1);
  if (!/^[a-z0-9-]*$/i.test(query)) return null;
  const before = prefix[start - 1] || '';
  if (/[a-z0-9._%+-]/i.test(before)) return null;
  return { start, query: query.toLowerCase() };
}

function insertSkillAtCaret(text: string, selectionStart: number, selectionEnd: number, id: string): { text: string; caret: number } {
  const mention = mentionAtCaret(text, selectionStart);
  const replaceStart = mention?.start ?? selectionStart;
  const before = text.slice(0, replaceStart);
  const after = text.slice(selectionEnd);
  const leading = mention || !before || /\s$/.test(before) ? '' : ' ';
  const trailing = ' ';
  const token = `${leading}@${id}${trailing}`;
  return {
    text: `${before}${token}${after}`,
    caret: before.length + token.length,
  };
}

function removeSkillAtBackspace(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  skills: ManagedSkillSummary[],
): { text: string; caret: number } | null {
  if (selectionStart !== selectionEnd || selectionStart <= 0) return null;
  const reference = recognizedSkillTokensFromText(text, skills).find((candidate) => {
    const afterToken = selectionStart === candidate.end;
    const afterInsertedSpace = selectionStart === candidate.end + 1 && text[candidate.end] === ' ';
    const insideToken = selectionStart > candidate.start && selectionStart < candidate.end;
    return afterToken || afterInsertedSpace || insideToken;
  });
  if (!reference) return null;
  const removeEnd = selectionStart === reference.end + 1 && text[reference.end] === ' '
    ? reference.end + 1
    : reference.end;
  return {
    text: `${text.slice(0, reference.start)}${text.slice(removeEnd)}`,
    caret: reference.start,
  };
}

function UserMessageText({ message }: { message: ChatMessage }) {
  const references = [...(message.skillRefs ?? [])].sort((left, right) => left.start - right.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  references.forEach((reference) => {
    if (reference.start < cursor || message.text.slice(reference.start, reference.end) !== `@${reference.id}`) return;
    if (reference.start > cursor) parts.push(message.text.slice(cursor, reference.start));
    parts.push(<span className="chat-inline-skill" style={skillMarkerStyle(reference.id)} key={`${reference.id}:${reference.start}`} title={`Skill：${reference.name}`}>@{reference.id}</span>);
    cursor = reference.end;
  });
  if (cursor < message.text.length) parts.push(message.text.slice(cursor));
  return (
    <>
      <p className="chat-msg-text">{parts}</p>
      {message.attachments?.length ? <AttachmentCards attachments={message.attachments} /> : null}
    </>
  );
}

function AttachmentCards({ attachments, removable, onRemove }: { attachments: AttachmentReference[]; removable?: boolean; onRemove?: (id: string) => void }) {
  return (
    <div className="chat-attachment-cards">
      {attachments.map((item) => (
        <div className={`chat-attachment-card is-${item.kind}`} key={item.id} title={item.warning || item.mimeType}>
          <span aria-hidden="true">{item.kind === 'image' ? '▧' : item.kind === 'pdf' ? 'PDF' : item.kind === 'word' ? 'W' : item.kind === 'powerpoint' ? 'P' : 'TXT'}</span>
          <div><strong>{item.name}</strong><small>{formatFileSize(item.size)} · {item.textAvailable ? '文字已提取' : item.kind === 'image' ? '可视觉解析' : '等待解析'}</small></div>
          {removable ? <button type="button" aria-label={`移除附件 ${item.name}`} onClick={() => onRemove?.(item.id)}>×</button> : null}
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ComposerHighlightedText({ text, skills }: { text: string; skills: ManagedSkillSummary[] }) {
  const references = recognizedSkillTokensFromText(text, skills);
  if (!references.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  references.forEach((reference) => {
    if (reference.start < cursor || text.slice(reference.start, reference.end) !== `@${reference.id}`) return;
    if (reference.start > cursor) parts.push(text.slice(cursor, reference.start));
    parts.push(
      <span
        className="chat-inline-skill"
        style={skillMarkerStyle(reference.id)}
        key={`${reference.id}:${reference.start}`}
      >
        @{reference.id}
      </span>,
    );
    cursor = reference.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}{text.endsWith('\n') ? '\u200b' : null}</>;
}

function ExecutionDetails({ group, professionalView }: { group: ExecutionGroup; professionalView: boolean }) {
  const [open, setOpen] = useState(professionalView);
  useEffect(() => setOpen(professionalView), [professionalView]);
  const duration = formatDuration(group.messages);
  const lastMeaningful = [...group.messages].reverse().find((message) => message.kind !== 'detail') ?? group.messages[group.messages.length - 1];
  const hasError = group.messages.some((message) => message.error);

  return (
    <details className={`chat-execution${hasError ? ' chat-execution--error' : ''}`} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="chat-execution-disclosure" aria-hidden="true" />
        <strong>执行过程</strong>
        <span>{group.messages.length} 条{duration ? ` · ${duration}` : ''}</span>
        <em title={lastMeaningful.text}>{compactExecutionLabel(lastMeaningful)}</em>
      </summary>
      <div className="chat-execution-list">
        {group.messages.map((message) => (
          <div key={message.id} className={`chat-execution-item chat-execution-item--${message.kind ?? 'detail'}${message.error ? ' is-error' : ''}`}>
            <div className="chat-execution-item-head">
              <span>{detailLabel(message)}</span>
              <time>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}</time>
            </div>
            {message.kind === 'detail'
              ? <pre>{message.text}</pre>
              : <MarkdownContent text={message.text.replace(/^\[(?:Agent|Worker)\]\s*/, '')} />}
          </div>
        ))}
      </div>
    </details>
  );
}

export default function ChatPanel({
  messages,
  steps,
  conversations,
  activeConversationId,
  historyError,
  taskStatus,
  onSend,
  onStop,
  onCreateConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onToggleConversationPinned,
  onSetConversationModel,
}: Props) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AttachmentReference[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentPicking, setAttachmentPicking] = useState(false);
  const [professionalView, setProfessionalView] = useState(readProfessionalView);
  const [historyCollapsed, setHistoryCollapsed] = useState(readHistoryCollapsed);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'recent' | 'pinned'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [skills, setSkills] = useState<ManagedSkillSummary[]>([]);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillLoadError, setSkillLoadError] = useState('');
  const [composerHeight, setComposerHeight] = useState(readComposerHeight);
  const [engineeringModels, setEngineeringModels] = useState<Array<ModelProfile & { provider: ProviderConfig }>>([]);
  const [modelDefaultId, setModelDefaultId] = useState('');
  const [modelLoadError, setModelLoadError] = useState('');
  const cancelRenameRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerEditorRef = useRef<HTMLDivElement>(null);
  const skillPickerRef = useRef<HTMLDivElement>(null);
  const composerResizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, steps, taskStatus.busy, taskStatus.paused]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFESSIONAL_VIEW_KEY, String(professionalView));
    } catch {
      // The preference remains active for this session.
    }
  }, [professionalView]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_COLLAPSED_KEY, String(historyCollapsed));
    } catch {
      // The preference remains active for this session.
    }
  }, [historyCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPOSER_HEIGHT_KEY, String(composerHeight));
    } catch {
      // The resized height remains active for this session.
    }
  }, [composerHeight]);

  useEffect(() => () => composerResizeCleanupRef.current?.(), []);
  useEffect(() => {
    setAttachments([]);
    setAttachmentError('');
  }, [activeConversationId]);

  useEffect(() => {
    let active = true;
    void window.electronAPI?.listManagedSkills?.().then((result) => {
      if (!active) return;
      if (result?.ok) {
        setSkills(result.skills);
        setSkillLoadError('');
      } else {
        setSkillLoadError(result?.error || 'Skill 列表读取失败');
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const api = window.electronAPI;
    if (!api?.listModels) return () => { active = false; };
    void api.listModels().then((result) => {
      if (!active) return;
      const providers = new Map(result.config.providers.map((item) => [item.id, item]));
      setEngineeringModels(result.config.models.flatMap((model) => {
        const provider = providers.get(model.providerId);
        return model.enabled && model.capabilities.includes('engineering-agent') && model.protocol === 'anthropic-compatible' && provider?.enabled
          ? [{ ...model, provider }]
          : [];
      }));
      setModelDefaultId(result.config.defaults['engineering-agent'] || '');
      setModelLoadError('');
    }).catch((error) => {
      if (active) setModelLoadError(error instanceof Error ? error.message : '模型列表读取失败');
    });
    return () => { active = false; };
  }, [activeConversationId]);

  useEffect(() => {
    const refresh = () => {
      const api = window.electronAPI;
      if (!api?.listModels) return;
      void api.listModels().then((result) => {
        const providers = new Map(result.config.providers.map((item) => [item.id, item]));
        setEngineeringModels(result.config.models.flatMap((model) => {
          const provider = providers.get(model.providerId);
          return model.enabled && model.capabilities.includes('engineering-agent') && model.protocol === 'anthropic-compatible' && provider?.enabled
            ? [{ ...model, provider }]
            : [];
        }));
        setModelDefaultId(result.config.defaults['engineering-agent'] || '');
      }).catch(() => { /* the existing visible error remains */ });
    };
    window.addEventListener('catnip:model-config-changed', refresh);
    return () => window.removeEventListener('catnip:model-config-changed', refresh);
  }, []);

  useEffect(() => {
    if (!skillPickerOpen) return undefined;
    const closePicker = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && skillPickerRef.current?.contains(target)) return;
      setSkillPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSkillPickerOpen(false);
    };
    document.addEventListener('pointerdown', closePicker);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closePicker);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [skillPickerOpen]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.chat-history-menu-wrap')) return;
      setOpenMenuId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenuId]);

  const startRename = (conversation: ChatConversationSummary) => {
    cancelRenameRef.current = false;
    setOpenMenuId(null);
    setPendingDeleteId(null);
    setRenamingId(conversation.id);
    setRenameValue(conversation.title);
  };

  const commitRename = (id: string) => {
    const title = renameValue.trim();
    if (!title) return;
    setRenamingId(null);
    onRenameConversation(id, title);
  };

  const executionGroups = useMemo(() => {
    const groups = new Map<string, ChatMessage[]>();
    messages.forEach((message) => {
      if (message.role !== 'agent' || !message.kind || message.kind === 'conversation') return;
      const key = executionKey(message);
      groups.set(key, [...(groups.get(key) ?? []), message]);
    });
    return groups;
  }, [messages]);

  const submit = (mode: TaskSubmitMode) => {
    if (readOnlyConversation) return;
    const text = input.trim() || (attachments.length ? '请分析这些附件，并根据其中与当前任务相关的信息继续处理。' : '');
    if (!text) return;
    onSend({ text, skillRefs: skillReferencesFromText(text, skills), attachments }, mode);
    setInput('');
    setAttachments([]);
    setAttachmentError('');
    setSkillPickerOpen(false);
    setSkillQuery('');
  };

  const startComposerResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    composerResizeCleanupRef.current?.();
    const startY = event.clientY;
    const startHeight = composerEditorRef.current?.getBoundingClientRect().height ?? composerHeight;
    const onPointerMove = (pointerEvent: PointerEvent) => {
      setComposerHeight(clampComposerHeight(startHeight + startY - pointerEvent.clientY));
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.classList.remove('is-resizing-chat-composer');
      composerResizeCleanupRef.current = null;
    };
    composerResizeCleanupRef.current = cleanup;
    document.body.classList.add('is-resizing-chat-composer');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(taskStatus.busy ? 'guide' : 'auto');
  };

  const renderedExecutions = new Set<string>();
  const activeExecutionKey = taskStatus.activeTaskId ? `task:${taskStatus.activeTaskId}` : null;
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const readOnlyConversation = Boolean(activeConversation?.readOnly);
  const selectedModelId = activeConversation?.modelProfileId || modelDefaultId;
  const visibleConversations = useMemo(() => {
    const query = historyQuery.trim().toLocaleLowerCase('zh-CN');
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return conversations.filter((conversation) => {
      if (historyFilter === 'pinned' && !conversation.pinned) return false;
      if (historyFilter === 'recent' && new Date(conversation.updatedAt).getTime() < recentThreshold) return false;
      return !query || conversation.title.toLocaleLowerCase('zh-CN').includes(query);
    });
  }, [conversations, historyFilter, historyQuery]);
  const inputSkillRefs = useMemo(() => skillReferencesFromText(input, skills), [input, skills]);
  const visibleSkills = useMemo(() => {
    const query = skillQuery.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((skill) => skill.id.includes(query) || skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query));
  }, [skillQuery, skills]);

  return (
    <div className={`chat-panel nes-container is-rounded${historyCollapsed ? ' chat-panel--history-collapsed' : ''}`}>
      <aside className="chat-history" data-tour-id="chat-history" aria-label="历史对话">
        <nav className="chat-history-rail" aria-label="对话筛选">
          <button className={historyFilter === 'all' ? 'is-active' : ''} type="button" title="全部对话" aria-label="全部对话" onClick={() => setHistoryFilter('all')}><MessageCircleMore aria-hidden="true" /></button>
          <button className={historyFilter === 'recent' ? 'is-active' : ''} type="button" title="最近 7 天" aria-label="最近 7 天" onClick={() => setHistoryFilter('recent')}><Clock3 aria-hidden="true" /></button>
          <button className={historyFilter === 'pinned' ? 'is-active' : ''} type="button" title="已置顶" aria-label="已置顶" onClick={() => setHistoryFilter('pinned')}><Pin aria-hidden="true" /></button>
          <button type="button" disabled={taskStatus.busy} title="新建对话" aria-label="新建对话" onClick={onCreateConversation}><FolderClock aria-hidden="true" /></button>
        </nav>
        <div className="chat-history-main">
        <div className="chat-history-header">
          <label className="chat-history-search">
            <Search aria-hidden="true" />
            <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="搜索历史对话…" aria-label="搜索历史对话" />
          </label>
          <button type="button" disabled={taskStatus.busy} onClick={onCreateConversation} title={taskStatus.busy ? 'Agent 工作结束后可新建对话' : '新建对话'} aria-label="新建对话">＋</button>
        </div>
        <button className="chat-history-new" type="button" disabled={taskStatus.busy} onClick={onCreateConversation}><Sparkles aria-hidden="true" /><span>新对话</span><kbd>⌘ N</kbd></button>
        <div className="chat-history-list">
          <span className="chat-history-period">{historyFilter === 'pinned' ? '已置顶' : historyFilter === 'recent' ? '最近 7 天' : '历史对话'}</span>
          {visibleConversations.map((conversation) => (
            <div key={conversation.id} className={`chat-history-item${conversation.id === activeConversationId ? ' is-active' : ''}${conversation.pinned ? ' is-pinned' : ''}${conversation.readOnly ? ' is-read-only' : ''}`}>
              <button
                type="button"
                className="chat-history-select"
                disabled={taskStatus.busy && conversation.id !== activeConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                title={conversation.title}
              >
                <span>{conversation.pinned ? <i className="chat-history-pin" aria-hidden="true">●</i> : null}{conversation.title}{conversation.readOnly ? <i className="chat-history-read-only">未归属 · 只读</i> : null}</span>
                <small>{conversationTime(conversation.updatedAt)} · {conversation.messageCount} 条</small>
              </button>
              {!conversation.readOnly ? <div className="chat-history-menu-wrap">
                <button
                  type="button"
                  className="chat-history-more"
                  disabled={taskStatus.busy}
                  aria-label={`编辑对话：${conversation.title}`}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === conversation.id}
                  title={taskStatus.busy ? 'Agent 工作结束后可编辑' : '编辑对话'}
                  onClick={() => { setPendingDeleteId(null); setOpenMenuId((current) => current === conversation.id ? null : conversation.id); }}
                >
                  ⋯
                </button>
                {openMenuId === conversation.id ? (
                  <div className="chat-history-menu" role="menu" aria-label={`编辑 ${conversation.title}`}>
                    <button type="button" role="menuitem" onClick={() => startRename(conversation)}>重命名</button>
                    <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onToggleConversationPinned(conversation.id, !conversation.pinned); }}>
                      {conversation.pinned ? '取消置顶' : '置顶'}
                    </button>
                    <span className="chat-history-menu-separator" />
                    <button type="button" role="menuitem" className="is-danger" onClick={() => { setOpenMenuId(null); setPendingDeleteId(conversation.id); }}>删除</button>
                  </div>
                ) : null}
              </div> : null}
              {renamingId === conversation.id ? (
                <form className="chat-history-rename" onSubmit={(event) => event.preventDefault()}>
                  <input
                    autoFocus
                    maxLength={30}
                    value={renameValue}
                    aria-label="对话名称"
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
                      if (event.key === 'Escape') { cancelRenameRef.current = true; setRenamingId(null); }
                    }}
                    onBlur={() => {
                      if (cancelRenameRef.current) { cancelRenameRef.current = false; return; }
                      commitRename(conversation.id);
                    }}
                  />
                  <small>{renameValue.trim().length}/30</small>
                </form>
              ) : null}
              {pendingDeleteId === conversation.id ? (
                <div className="chat-history-confirm">
                  <span>删除后无法恢复</span>
                  <button type="button" onClick={() => setPendingDeleteId(null)}>取消</button>
                  <button type="button" className="is-danger" onClick={() => { setPendingDeleteId(null); onDeleteConversation(conversation.id); }}>删除</button>
                </div>
              ) : null}
            </div>
          ))}
          {!visibleConversations.length ? <p className="chat-history-empty-copy">没有匹配的对话</p> : null}
        </div>
        {historyError ? <p className="chat-history-error" title={historyError}>{historyError}</p> : null}
        </div>
      </aside>
      <section className="chat-conversation">
      <div className="chat-title">
        <div className="chat-title-main">
          <button
            type="button"
            className="chat-history-toggle"
            aria-label={historyCollapsed ? '展开历史对话' : '收起历史对话'}
            aria-expanded={!historyCollapsed}
            onClick={() => setHistoryCollapsed((current) => !current)}
          >
            <span aria-hidden="true">{historyCollapsed ? '›' : '‹'}</span>
          </button>
          <span title={activeConversation?.title}>{activeConversation?.title === '新对话' || !activeConversation ? 'Agent 对话' : activeConversation.title}</span>
        </div>
        <div className="chat-title-actions">
          <button
            type="button"
            className={`chat-professional-toggle${professionalView ? ' is-active' : ''}`}
            data-tour-id="professional-view"
            aria-pressed={professionalView}
            title="开启后自动展开每轮任务的工具、状态与诊断信息"
            onClick={() => setProfessionalView((current) => !current)}
          >
            专业视图
          </button>
          <i className={`chat-agent-status${taskStatus.busy ? ' chat-agent-status--busy' : ''}`}>
            {taskStatus.paused ? '已暂停' : taskStatus.busy ? '执行中' : '空闲'}
          </i>
        </div>
      </div>
      {taskStatus.busy ? (
        <div className="chat-task-strip" title={taskStatus.activeTask || ''}>
          <span>{taskStatus.activeTask || '当前任务正在执行'}</span>
          <em>追加 {taskStatus.guidanceCount} · 排队 {taskStatus.queueLength}</em>
        </div>
      ) : null}
      {historyCollapsed && historyError ? <div className="chat-history-inline-error">{historyError}</div> : null}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <img src={catnipAgentWelcomeImage} alt="" aria-hidden="true" />
            <span className="chat-empty-kicker">CATNIP AGENT</span>
            <strong>你好！我是学院呱呱</strong>
            <p>有什么想法或工程问题，一起实现吧。</p>
            <div className="chat-empty-actions" aria-label="快捷开始">
              {CHAT_ACTIONS.map(({ label, prompt, icon: Icon, tone }) => (
                <button
                  key={label}
                  className={`is-${tone}`}
                  type="button"
                  disabled={readOnlyConversation}
                  onClick={() => {
                    setInput(prompt);
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }}
                >
                  <Icon aria-hidden="true" /><span>{label}</span>
                </button>
              ))}
            </div>
            <div className="chat-empty-suggestions">
              <span>你可以这样开始：</span>
              {CHAT_SUGGESTIONS.map((suggestion, index) => (
                <button key={suggestion} type="button" disabled={readOnlyConversation} onClick={() => { setInput(suggestion); requestAnimationFrame(() => textareaRef.current?.focus()); }}>
                  {index === 0 ? <Lightbulb aria-hidden="true" /> : index === 1 ? <Search aria-hidden="true" /> : index === 2 ? <Sparkles aria-hidden="true" /> : <Wrench aria-hidden="true" />}
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
            <small>对话会保存在当前工程中，重新打开软件后仍可继续。</small>
          </div>
        ) : null}
        {messages.map((message) => {
          if (message.role === 'agent' && message.kind && message.kind !== 'conversation') {
            const key = executionKey(message);
            if (renderedExecutions.has(key)) return null;
            renderedExecutions.add(key);
            const showDashboard = taskStatus.busy && !taskStatus.paused && key === activeExecutionKey;
            return (
              <React.Fragment key={key}>
                <ExecutionDetails group={{ key, messages: executionGroups.get(key) ?? [message] }} professionalView={professionalView} />
                {showDashboard ? <TaskProgress steps={steps} /> : null}
              </React.Fragment>
            );
          }
          return (
            <div key={message.id} className={`chat-msg nes-container is-rounded chat-msg--${message.role}${message.error ? ' chat-msg--error is-error' : ''}`}>
              <span className="chat-msg-role">{message.role === 'user' ? 'You' : 'Agent'}</span>
              {message.role === 'agent'
                ? <MarkdownContent text={message.text} />
                : <UserMessageText message={message} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" data-tour-id="agent-composer" onSubmit={handleSubmit}>
        {attachments.length ? <AttachmentCards attachments={attachments} removable onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} /> : null}
        {attachmentError ? <div className="chat-attachment-error" role="alert">{attachmentError}</div> : null}
        <div
          ref={composerEditorRef}
          className="chat-composer-editor"
          style={{ height: composerHeight }}
        >
          <div
            className="chat-composer-resize-handle"
            role="separator"
            aria-label="调整输入框高度"
            aria-orientation="horizontal"
            aria-valuemin={COMPOSER_MIN_HEIGHT}
            aria-valuemax={COMPOSER_MAX_HEIGHT}
            aria-valuenow={composerHeight}
            tabIndex={0}
            onPointerDown={startComposerResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              setComposerHeight((current) => clampComposerHeight(current + (event.key === 'ArrowUp' ? 16 : -16)));
            }}
          >
            <span aria-hidden="true" />
          </div>
          <div className="chat-input-highlight" aria-hidden="true">
            <ComposerHighlightedText text={input} skills={skills} />
          </div>
          <textarea
            ref={textareaRef}
            className="nes-input"
            rows={2}
            value={input}
            disabled={readOnlyConversation}
            onChange={(event) => {
              const next = event.target.value;
              const mention = mentionAtCaret(next, event.target.selectionStart ?? next.length);
              setInput(next);
              if (mention) {
                setSkillQuery(mention.query);
                setSkillPickerOpen(true);
              }
            }}
            onScroll={(event) => {
              const highlight = event.currentTarget.previousElementSibling;
              if (!(highlight instanceof HTMLElement)) return;
              highlight.scrollTop = event.currentTarget.scrollTop;
              highlight.scrollLeft = event.currentTarget.scrollLeft;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !event.nativeEvent.isComposing) {
                const removed = removeSkillAtBackspace(
                  input,
                  event.currentTarget.selectionStart ?? 0,
                  event.currentTarget.selectionEnd ?? 0,
                  skills,
                );
                if (removed) {
                  event.preventDefault();
                  setInput(removed.text);
                  setSkillPickerOpen(false);
                  setSkillQuery('');
                  requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.setSelectionRange(removed.caret, removed.caret);
                  });
                  return;
                }
              }
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(taskStatus.busy ? 'guide' : 'auto');
              }
            }}
            placeholder={readOnlyConversation ? '这是未归属的旧历史，只能查看' : taskStatus.busy ? '输入对当前任务的追加要求；Shift+Enter 换行' : '描述要交给 Agent 的任务；Shift+Enter 换行'}
          />
        </div>
        <div className="chat-input-actions">
          <label className="chat-model-select" title={modelLoadError || '为当前工程对话选择模型'}>
            <Bot aria-hidden="true" />
            <select
              aria-label="当前 Agent 模型"
              value={selectedModelId}
              disabled={readOnlyConversation || taskStatus.busy || !engineeringModels.length}
              onChange={(event) => onSetConversationModel(activeConversationId, event.target.value)}
            >
              {!engineeringModels.length ? <option value="">{modelLoadError || '没有可用模型'}</option> : engineeringModels.map((item) => <option key={item.id} value={item.id}>{item.provider.name} · {item.name}</option>)}
            </select>
          </label>
          <button
            className="chat-attachment-button nes-btn"
            data-tour-id="attachment-button"
            type="button"
            disabled={readOnlyConversation || attachmentPicking || !activeConversationId || attachments.length >= 6}
            title="添加图片、PDF、Word、PPT 或文本附件"
            onClick={() => {
              if (!activeConversationId) return;
              setAttachmentPicking(true);
              setAttachmentError('');
              void window.electronAPI.pickChatAttachments(activeConversationId)
                .then((result) => setAttachments((current) => {
                  const known = new Set(current.map((item) => item.id));
                  return [...current, ...result.attachments.filter((item) => !known.has(item.id))].slice(0, 6);
                }))
                .catch((error) => setAttachmentError(error instanceof Error ? error.message : String(error)))
                .finally(() => {
                  setAttachmentPicking(false);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                });
            }}
          >
            <Paperclip aria-hidden="true" /> {attachmentPicking ? '读取中…' : `附件${attachments.length ? ` · ${attachments.length}` : ''}`}
          </button>
          <div className="chat-skill-picker-wrap" ref={skillPickerRef}>
            <button
              className={`chat-skill-button nes-btn${skillPickerOpen ? ' is-active' : ''}`}
              data-tour-id="skill-button"
              type="button"
              disabled={readOnlyConversation}
              aria-haspopup="listbox"
              aria-expanded={skillPickerOpen}
              onClick={() => {
                const opening = !skillPickerOpen;
                setSkillPickerOpen(opening);
                setSkillQuery('');
                if (!opening) return;
                void window.electronAPI?.listManagedSkills?.().then((result) => {
                  if (result?.ok) {
                    setSkills(result.skills);
                    setSkillLoadError('');
                  } else {
                    setSkillLoadError(result?.error || 'Skill 列表读取失败');
                  }
                });
              }}
            >
              <span aria-hidden="true">＋</span> Skills{inputSkillRefs.length ? ` · ${inputSkillRefs.length}` : ''}
            </button>
            {skillPickerOpen ? (
              <div
                className="chat-skill-picker"
                role="listbox"
                aria-label="选择要调用的 Skill"
              >
                <div className="chat-skill-picker-head">
                  <strong>引用 Skill</strong>
                  <span>选择后返回输入框，可再次插入</span>
                </div>
                {skillLoadError ? <p className="chat-skill-error">{skillLoadError}</p> : null}
                <div className="chat-skill-options">
                  {visibleSkills.length ? visibleSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      disabled={!skill.deployed}
                      onClick={() => {
                        const textarea = textareaRef.current;
                        const selectionStart = textarea?.selectionStart ?? input.length;
                        const selectionEnd = textarea?.selectionEnd ?? selectionStart;
                        const next = insertSkillAtCaret(input, selectionStart, selectionEnd, skill.id);
                        setInput(next.text);
                        setSkillQuery('');
                        setSkillPickerOpen(false);
                        requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                          textareaRef.current?.setSelectionRange(next.caret, next.caret);
                        });
                      }}
                    >
                      <span><strong>{skill.name}</strong><code>@{skill.id}</code></span>
                      <small>{skill.deployed ? skill.description : '等待同步后可用'}</small>
                    </button>
                  )) : !skillLoadError ? <p className="chat-skill-empty">{skillQuery ? `没有匹配“${skillQuery}”的 Skill` : '暂无可用 Skill'}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          <button className="chat-submit nes-btn is-primary" type="submit" disabled={readOnlyConversation || (!input.trim() && !attachments.length)} aria-label={taskStatus.busy ? '追加要求' : '发送'} title={taskStatus.busy ? '追加要求' : '发送'}><Send aria-hidden="true" /></button>
          {taskStatus.busy ? <button className="nes-btn is-warning" type="button" disabled={!input.trim() && !attachments.length} onClick={() => submit('queue')}>排队</button> : null}
          {taskStatus.busy ? <button className="nes-btn is-error" type="button" onClick={onStop}>停止</button> : null}
        </div>
      </form>
      </section>
    </div>
  );
}
