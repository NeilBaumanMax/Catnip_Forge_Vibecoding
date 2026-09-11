import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, Cpu, ExternalLink, FolderOpen, History, Lightbulb, PlayCircle, SearchCheck, Sparkles, Star } from 'lucide-react';
import type { ExploreAnalysisResult, ExploreContextGatherResult, ExploreContextItem, ExploreRequest, HandoffContext, IdeaResult, KnowledgeCard, SourceEvidence, ExploreZhihuConnectionStatus } from '../../common/explore';
import type { ExploreConversationMessage, ExploreHandoffArtifact, ExploreWorkSessionRecord, ExploreWorkSessionSummary, ExploreWorkStatus } from '../../common/project-session';
import ExploreSourceList from './explore/ExploreSourceList';
import ExploreStageNav, { type ExploreStage } from './explore/ExploreStageNav';
import exploreIdeaGuagua from '../assets/explore-idea-guagua.png';
import exploreDiagnosisGuagua from '../assets/explore-diagnosis-guagua.png';

type ExploreView = 'home' | 'idea' | 'diagnosis';

interface Props {
  projectId: string;
  currentProject: string;
  hardwareSummary: string;
  runtimeSummary: string;
  diagnosisSeed?: ExploreDiagnosisSeed | null;
}

export interface ExploreDiagnosisSeed {
  id: number;
  problem: string;
}

interface ContextOption {
  id: string;
  kind: ExploreContextItem['kind'];
  label: string;
  summary: string;
  available: boolean;
}

const CONTEXT_KIND_LABELS: Record<ExploreContextItem['kind'], string> = {
  project: '工程',
  target: 'Target',
  hardware: '硬件',
  source: '源码',
  build: 'Build',
  serial: 'Serial',
  knowledge: 'Knowledge',
};

function verificationLabel(status: KnowledgeCard['verificationStatus']): string {
  if (status === 'verified_effective') return '已验证有效';
  if (status === 'verified_ineffective') return '已验证无效';
  return '尚未验证';
}

function workStatusLabel(status: ExploreWorkStatus): string {
  if (status === 'draft') return '草稿';
  if (status === 'analyzing') return '分析中';
  if (status === 'result_ready') return '已有结果';
  if (status === 'planning') return '生成计划中';
  if (status === 'awaiting_confirmation') return '等待确认';
  if (status === 'execution_queued') return '已交给 Agent';
  if (status === 'interrupted') return '上次中断';
  return '发生错误';
}

export default function ExplorePanel({ projectId, currentProject, hardwareSummary, runtimeSummary, diagnosisSeed }: Props) {
  const [view, setView] = useState<ExploreView>('home');
  const [goal, setGoal] = useState('');
  const [problem, setProblem] = useState('');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState<ExploreZhihuConnectionStatus | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [installingConnection, setInstallingConnection] = useState(false);
  const [startingConnection, setStartingConnection] = useState(false);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExploreAnalysisResult | null>(null);
  const [analysisRequest, setAnalysisRequest] = useState<ExploreRequest | null>(null);
  const [planResult, setPlanResult] = useState<Extract<ExploreAnalysisResult, { mode: 'plan' }> | null>(null);
  const [planPending, setPlanPending] = useState(false);
  const [planHandoff, setPlanHandoff] = useState<HandoffContext | null>(null);
  const [executionPending, setExecutionPending] = useState(false);
  const [executionStarted, setExecutionStarted] = useState(false);
  const [analysisTaskId, setAnalysisTaskId] = useState<string | null>(null);
  const [analysisRequestId, setAnalysisRequestId] = useState<string | null>(null);
  const [planTaskId, setPlanTaskId] = useState<string | null>(null);
  const [planRequestId, setPlanRequestId] = useState<string | null>(null);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);
  const [executionDisposition, setExecutionDisposition] = useState<'started' | 'queued' | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState('');
  const [editingInput, setEditingInput] = useState(true);
  const [gatheredContext, setGatheredContext] = useState<ExploreContextGatherResult | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [expandedKnowledgeId, setExpandedKnowledgeId] = useState('');
  const [savingSourceUrl, setSavingSourceUrl] = useState('');
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeCard[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [relatedKnowledgeLoading, setRelatedKnowledgeLoading] = useState(false);
  const [relatedKnowledgeError, setRelatedKnowledgeError] = useState('');
  const [verificationCardId, setVerificationCardId] = useState('');
  const [verificationSummary, setVerificationSummary] = useState('');
  const [verificationEvidence, setVerificationEvidence] = useState('');
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [workSessions, setWorkSessions] = useState<ExploreWorkSessionSummary[]>([]);
  const [activeWorkSession, setActiveWorkSession] = useState<ExploreWorkSessionRecord | null>(null);
  const [workStatus, setWorkStatus] = useState<ExploreWorkStatus>('draft');
  const [displayStage, setDisplayStage] = useState<ExploreStage>('describe');
  const [conversation, setConversation] = useState<ExploreConversationMessage[]>([]);
  const [handoffArtifact, setHandoffArtifact] = useState<ExploreHandoffArtifact | null>(null);
  const [editingArtifactFile, setEditingArtifactFile] = useState<'HANDOFF.md' | 'PLAN.md' | null>(null);
  const [artifactDraft, setArtifactDraft] = useState('');
  const latestWorkSession = useRef<ExploreWorkSessionRecord | null>(null);
  const restoringKnowledgeSelection = useRef(false);
  const restoringContextSelection = useRef<string[] | null>(null);
  const activeAnalysisRequestId = useRef<string | null>(null);
  const activePlanRequestId = useRef<string | null>(null);
  const connectionWatchId = useRef(0);
  const autoConnectionPrompted = useRef(false);

  const appendExploreMessage = (
    role: ExploreConversationMessage['role'],
    kind: ExploreConversationMessage['kind'],
    text: string,
    meta: { requestId?: string; taskId?: string } = {},
  ) => {
    const message: ExploreConversationMessage = {
      id: crypto.randomUUID(), role, kind, text: text.slice(0, 8_000), createdAt: new Date().toISOString(), ...meta,
    };
    setConversation((current) => [...current, message].slice(-200));
    return message;
  };

  const applyWorkSession = (session: ExploreWorkSessionRecord) => {
    const wasInterrupted = session.status === 'analyzing' || session.status === 'planning';
    const snapshot = wasInterrupted
      ? { ...session.snapshot, notice: '上次分析在应用关闭或页面离开时中断，请重新发起。' }
      : session.snapshot;
    const restoredSession = wasInterrupted ? { ...session, status: 'interrupted' as const, snapshot } : session;
    setActiveWorkSession(restoredSession);
    setWorkStatus(restoredSession.status);
    setView(session.mode);
    if (session.mode === 'idea') setGoal(snapshot.input);
    else setProblem(snapshot.input);
    setSelectedContextIds(snapshot.selectedContextIds);
    restoringContextSelection.current = session.mode === 'diagnosis' ? snapshot.selectedContextIds : null;
    restoringKnowledgeSelection.current = session.mode === 'diagnosis';
    setSelectedKnowledgeIds(snapshot.selectedKnowledgeIds);
    setAnalysisRequest(snapshot.analysisRequest);
    setAnalysisResult(snapshot.analysisResult?.mode === 'plan' ? null : snapshot.analysisResult);
    setPlanResult(snapshot.planResult);
    setPlanHandoff(snapshot.planHandoff);
    setSelectedIdeaId(snapshot.selectedIdeaId);
    setEditingInput(snapshot.editingInput);
    setGatheredContext(snapshot.gatheredContext);
    setAnalysisTaskId(snapshot.analysisTaskId);
    setAnalysisRequestId(snapshot.analysisRequestId);
    setPlanTaskId(snapshot.planTaskId);
    setPlanRequestId(snapshot.planRequestId);
    setExecutionStarted(snapshot.executionStarted);
    setExecutionTaskId(snapshot.executionTaskId);
    setExecutionDisposition(snapshot.executionDisposition);
    activeAnalysisRequestId.current = snapshot.analysisRequestId;
    activePlanRequestId.current = snapshot.planRequestId;
    setNotice(snapshot.notice);
    setDisplayStage(snapshot.displayStage);
    setConversation(snapshot.conversation);
    setHandoffArtifact(snapshot.handoffArtifact);
    setAnalysisPending(false);
    setPlanPending(false);
    setExecutionPending(false);
  };

  const refreshWorkSessions = async () => {
    if (!projectId) {
      setWorkSessions([]);
      return [];
    }
    const sessions = await window.electronAPI.listExploreWorkSessions();
    setWorkSessions(sessions);
    return sessions;
  };

  const openWorkSession = async (mode: 'idea' | 'diagnosis', id?: string, forceNew = false) => {
    if ((analysisPending || planPending) && activeWorkSession) {
      setView(activeWorkSession.mode);
      setNotice('当前探索仍在运行，请等待完成后再打开其他记录。');
      return;
    }
    if (!forceNew && activeWorkSession?.mode === mode && (!id || id === activeWorkSession.id)) {
      setView(mode);
      return;
    }
    try {
      const sessions = await refreshWorkSessions();
      const targetId = forceNew ? undefined : id || sessions.find((item) => item.mode === mode)?.id;
      const session = targetId
        ? await window.electronAPI.getExploreWorkSession(mode, targetId)
        : await window.electronAPI.createExploreWorkSession(mode);
      applyWorkSession(session);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法打开探索记录');
    }
  };

  const deleteWorkSession = async (session: ExploreWorkSessionSummary) => {
    if (!window.confirm(`确定删除“${session.title}”这条探索记录吗？本地 Knowledge 不会被删除。`)) return;
    try {
      const sessions = await window.electronAPI.deleteExploreWorkSession(session.mode, session.id);
      setWorkSessions(sessions);
      if (activeWorkSession?.id === session.id) {
        setActiveWorkSession(null);
        latestWorkSession.current = null;
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法删除探索记录');
    }
  };

  useEffect(() => {
    setView('home');
    setActiveWorkSession(null);
    latestWorkSession.current = null;
    activeAnalysisRequestId.current = null;
    activePlanRequestId.current = null;
    void refreshWorkSessions().catch((error) => {
      setNotice(error instanceof Error ? error.message : '无法读取探索历史');
    });
  }, [projectId]);

  useEffect(() => {
    if (!activeWorkSession) return;
    const sessionMode = activeWorkSession.mode;
    const input = sessionMode === 'idea' ? goal : problem;
    const record: ExploreWorkSessionRecord = {
      ...activeWorkSession,
      title: input.trim().replace(/\s+/g, ' ').slice(0, 80) || (sessionMode === 'idea' ? '新灵感探索' : '新问题调查'),
      status: workStatus,
      snapshot: {
        input,
        selectedContextIds,
        selectedKnowledgeIds,
        analysisRequest,
        analysisResult,
        planResult,
        planHandoff,
        selectedIdeaId,
        editingInput,
        gatheredContext: gatheredContext ? {
          ...gatheredContext,
          items: gatheredContext.items.filter((item) => selectedContextIds.includes(item.id)),
        } : null,
        analysisTaskId,
        analysisRequestId,
        planTaskId,
        planRequestId,
        executionStarted,
        executionTaskId,
        executionDisposition,
        notice,
        displayStage,
        conversation,
        handoffArtifact,
      },
    };
    latestWorkSession.current = record;
    const timer = window.setTimeout(() => {
      void window.electronAPI.saveExploreWorkSession(record).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeWorkSession?.id, analysisRequest, analysisRequestId, analysisResult, analysisTaskId, conversation, displayStage, editingInput, executionDisposition, executionStarted, executionTaskId, gatheredContext, goal, handoffArtifact, notice, planHandoff, planRequestId, planResult, planTaskId, problem, selectedContextIds, selectedIdeaId, selectedKnowledgeIds, view, workStatus]);

  useEffect(() => () => {
    if (latestWorkSession.current) void window.electronAPI.saveExploreWorkSession(latestWorkSession.current).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!diagnosisSeed || !projectId) return;
    void window.electronAPI.createExploreWorkSession('diagnosis')
      .then((session) => {
        applyWorkSession({
          ...session,
          title: diagnosisSeed.problem.trim().slice(0, 80) || session.title,
          snapshot: {
            ...session.snapshot,
            input: diagnosisSeed.problem,
            notice: '已从工作区带入问题线索。请核对描述和 Context 后再开始分析。',
          },
        });
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : '无法创建问题调查记录'));
  }, [diagnosisSeed, projectId]);

  const fallbackContextOptions = useMemo<ContextOption[]>(() => [
    {
      id: 'current-project',
      kind: 'project',
      label: '当前工程',
      summary: currentProject || '尚未选择工程',
      available: Boolean(currentProject),
    },
    {
      id: 'current-hardware',
      kind: 'hardware',
      label: '开发板状态',
      summary: hardwareSummary,
      available: hardwareSummary !== '未检测到开发板',
    },
    {
      id: 'recent-runtime',
      kind: 'build',
      label: '最近 Build / 运行状态',
      summary: runtimeSummary,
      available: runtimeSummary !== '暂无运行记录',
    },
  ], [currentProject, hardwareSummary, runtimeSummary]);

  const contextOptions = useMemo<ContextOption[]>(() => {
    if (view !== 'diagnosis' || !gatheredContext) return fallbackContextOptions;
    const gathered = gatheredContext.items;
    const project = gathered.find((item) => item.kind === 'project') || fallbackContextOptions[0];
    const hardware = fallbackContextOptions[1];
    const runtime = gathered.find((item) => item.kind === 'build') || {
      id: 'recent-runtime', kind: 'build' as const, label: '最近 Build / Flash 记录',
      summary: '所选工程最近 24 小时内没有可用记录', available: false,
    };
    const serial = gathered.find((item) => item.kind === 'serial') || {
      id: 'recent-serial', kind: 'serial' as const, label: '最近串口片段',
      summary: '当前共享串口没有可用记录', available: false,
    };
    return [
      project,
      ...gathered.filter((item) => item.kind === 'target'),
      hardware,
      ...gathered.filter((item) => item.kind === 'source'),
      runtime,
      serial,
    ];
  }, [fallbackContextOptions, gatheredContext, view]);

  useEffect(() => {
    void window.electronAPI.listExploreKnowledge()
      .then(setKnowledgeCards)
      .catch((error) => setNotice(error instanceof Error ? error.message : '无法读取已收藏知识'));
  }, []);

  useEffect(() => {
    const query = problem.trim();
    if (restoringKnowledgeSelection.current) restoringKnowledgeSelection.current = false;
    else setSelectedKnowledgeIds([]);
    setRelatedKnowledgeError('');
    if (view !== 'diagnosis' || query.length < 2) {
      setRelatedKnowledge([]);
      setRelatedKnowledgeLoading(false);
      return;
    }

    let cancelled = false;
    setRelatedKnowledgeLoading(true);
    const timer = window.setTimeout(() => {
      void window.electronAPI.findRelatedExploreKnowledge(query, 6)
        .then((cards) => {
          if (!cancelled) setRelatedKnowledge(cards);
        })
        .catch((error) => {
          if (cancelled) return;
          setRelatedKnowledge([]);
          setRelatedKnowledgeError(error instanceof Error ? error.message : '无法查找相关收藏');
        })
        .finally(() => {
          if (!cancelled) setRelatedKnowledgeLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [problem, view]);

  const refreshConnection = async () => {
    setCheckingConnection(true);
    try {
      setConnection(await window.electronAPI.getExploreZhihuStatus());
    } catch {
      setConnection({ state: 'error', installed: false, compatible: false, authConfigured: false, message: '无法检查知乎开放平台连接状态' });
    } finally {
      setCheckingConnection(false);
    }
  };

  const watchConnection = async (watchId: number) => {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      if (connectionWatchId.current !== watchId) return;
      try {
        const next = await window.electronAPI.getExploreZhihuStatus();
        if (connectionWatchId.current !== watchId) return;
        setConnection(next);
        if (next.state === 'connected') {
          setNotice('知乎开放平台已连接，现在可以开始探索。');
          return;
        }
      } catch {
        // Keep the independent input window usable through a transient status failure.
      }
    }
  };

  useEffect(() => {
    void refreshConnection();
    window.electronAPI.onExploreAnalysisResult((result) => {
      if (result.mode === 'plan') {
        if (result.requestId !== activePlanRequestId.current) return;
        setPlanResult(result);
        setPlanPending(false);
        setWorkStatus('awaiting_confirmation');
        setDisplayStage('plan');
        appendExploreMessage('assistant', 'plan', `执行计划已生成：${result.plan.summary}`, { requestId: result.requestId });
        setNotice('执行计划已生成，正在写入当前工程的交接目录。');
        const session = latestWorkSession.current;
        if (session?.snapshot.planHandoff) {
          const updatedConversation = [...session.snapshot.conversation, {
            id: crypto.randomUUID(), role: 'assistant' as const, kind: 'plan' as const,
            text: `执行计划已生成：${result.plan.summary}`, createdAt: new Date().toISOString(), requestId: result.requestId,
          }].slice(-200);
          const updated: ExploreWorkSessionRecord = {
            ...session, status: 'awaiting_confirmation',
            snapshot: { ...session.snapshot, planResult: result, displayStage: 'plan', conversation: updatedConversation },
          };
          latestWorkSession.current = updated;
          void window.electronAPI.saveExploreWorkSession(updated)
            .then(() => window.electronAPI.createExploreHandoffArtifact({ sessionId: session.id, handoff: session.snapshot.planHandoff!, planResult: result }))
            .then((artifact) => {
              setHandoffArtifact(artifact);
              const latest = latestWorkSession.current;
              if (latest) {
                const persisted: ExploreWorkSessionRecord = { ...latest, updatedAt: new Date().toISOString(), snapshot: { ...latest.snapshot, handoffArtifact: artifact } };
                latestWorkSession.current = persisted;
                void window.electronAPI.saveExploreWorkSession(persisted).then(() => refreshWorkSessions()).catch(() => undefined);
              }
              appendExploreMessage('system', 'handoff', `交接材料已写入 ${artifact.relativeDir}`);
              setNotice(`交接材料已写入 ${artifact.relativeDir}。可进入“执行”步骤预览并确认提交。`);
            })
            .catch((error) => {
              setWorkStatus('error');
              setNotice(error instanceof Error ? error.message : '无法写入工程交接材料');
            });
        }
      } else {
        if (result.requestId !== activeAnalysisRequestId.current) return;
        setAnalysisResult(result);
        setAnalysisPending(false);
        setWorkStatus('result_ready');
        setDisplayStage('analyze');
        appendExploreMessage('assistant', 'result', result.mode === 'idea'
          ? `已形成 ${result.ideas.length} 个可实现方向。`
          : `已形成 ${result.diagnosis.hypotheses.length} 个优先验证假设。`, { requestId: result.requestId });
        setNotice('分析完成，以下结论均保留原始来源。');
      }
    });
    window.electronAPI.onExploreAnalysisError((error) => {
      const expectedRequestId = error.mode === 'plan' ? activePlanRequestId.current : activeAnalysisRequestId.current;
      if (error.requestId && error.requestId !== expectedRequestId) return;
      setAnalysisPending(false);
      setPlanPending(false);
      setWorkStatus('error');
      appendExploreMessage('system', 'error', error.message, { requestId: error.requestId });
      setNotice(error.message);
    });
    window.electronAPI.onExploreConversationMessage((message) => {
      const expected = message.mode === 'plan' ? activePlanRequestId.current : activeAnalysisRequestId.current;
      if (message.requestId && message.requestId !== expected) return;
      if (!message.text || message.kind === 'detail') return;
      appendExploreMessage('assistant', message.error ? 'error' : 'status', message.text, { requestId: message.requestId, taskId: message.taskId });
    });
  }, []);

  useEffect(() => {
    if (view !== 'diagnosis') return;
    let cancelled = false;
    setContextLoading(true);
    setContextError('');
    setGatheredContext(null);
    void window.electronAPI.gatherExploreContext({ projectDir: currentProject || undefined })
      .then((result) => {
        if (cancelled) return;
        setGatheredContext(result);
        setContextError(result.warnings.join('；'));
        const ids = result.items.filter((item) => item.available).map((item) => item.id);
        if (hardwareSummary !== '未检测到开发板') ids.splice(Math.min(2, ids.length), 0, 'current-hardware');
        const restoredIds = restoringContextSelection.current;
        restoringContextSelection.current = null;
        setSelectedContextIds(restoredIds ? [...new Set(restoredIds)] : [...new Set(ids)]);
      })
      .catch((error) => {
        if (cancelled) return;
        setContextError(error instanceof Error ? error.message : '无法收集当前工程 Context');
        setSelectedContextIds(fallbackContextOptions.filter((item) => item.available).map((item) => item.id));
      })
      .finally(() => { if (!cancelled) setContextLoading(false); });
    return () => { cancelled = true; };
  }, [activeWorkSession?.id, currentProject, hardwareSummary, view]);

  const beginConnection = async () => {
    const watchId = ++connectionWatchId.current;
    setStartingConnection(true);
    try {
      const result = await window.electronAPI.beginExploreZhihuConnection();
      setNotice(result.message);
      if (result.ok && result.state === 'launched') void watchConnection(watchId);
      if (result.ok && result.state === 'already_connected') await refreshConnection();
    } catch {
      setNotice('无法启动知乎开放平台安全连接');
    } finally {
      setStartingConnection(false);
    }
  };

  const installConnection = async () => {
    setInstallingConnection(true);
    try {
      const result = await window.electronAPI.installExploreZhihuConnection();
      setConnection(result.connection);
      setNotice(result.message);
      if (result.ok && result.connection.state === 'needs_secret') {
        autoConnectionPrompted.current = true;
        await beginConnection();
      } else if (result.ok && result.connection.state === 'connected') {
        setNotice('知乎开放平台已连接，现在可以开始探索。');
      }
    } catch {
      setNotice('无法安装知乎开放平台连接组件');
    } finally {
      setInstallingConnection(false);
    }
  };

  useEffect(() => {
    if (connection?.state !== 'needs_secret' || checkingConnection || startingConnection || autoConnectionPrompted.current) return;
    autoConnectionPrompted.current = true;
    void beginConnection();
  }, [connection?.state, checkingConnection, startingConnection]);

  const enter = (next: Exclude<ExploreView, 'home'>) => {
    void openWorkSession(next);
  };

  const editRequest = () => {
    setDisplayStage('describe');
    setEditingInput(true);
    setAnalysisPending(false);
    setAnalysisResult(null);
    setAnalysisRequest(null);
    setPlanResult(null);
    setPlanPending(false);
    setPlanHandoff(null);
    setExecutionPending(false);
    setExecutionStarted(false);
    setAnalysisTaskId(null);
    setAnalysisRequestId(null);
    setPlanTaskId(null);
    setPlanRequestId(null);
    setExecutionTaskId(null);
    setExecutionDisposition(null);
    setHandoffArtifact(null);
    setEditingArtifactFile(null);
    activeAnalysisRequestId.current = null;
    activePlanRequestId.current = null;
    setSelectedIdeaId('');
    setWorkStatus('draft');
    setNotice('可以修改描述或资料选择；重新分析前不会执行旧计划。');
  };

  const toggleContext = (id: string) => {
    setSelectedContextIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const toggleKnowledge = (id: string) => {
    setSelectedKnowledgeIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const prepareRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const relatedIds = new Set(relatedKnowledge.map((card) => card.id));
      const explicitlySelectedIds = selectedKnowledgeIds.filter((id) => relatedIds.has(id));
      const selectedKnowledge = view === 'diagnosis' && explicitlySelectedIds.length
        ? await window.electronAPI.selectExploreKnowledgeForContext(explicitlySelectedIds)
        : [];
      const knowledgeContext: ExploreContextItem[] = selectedKnowledge.map((card) => ({
        id: `history:${card.id}`,
        kind: 'knowledge',
        label: `历史收藏：${card.source.title}`,
        summary: [
          card.taskSummary,
          card.source.excerpt,
          `来源：${card.source.url}`,
          `验证状态：${card.verificationStatus}`,
        ].join('；'),
        selected: true,
      }));
      const request: ExploreRequest = {
        mode: view === 'idea' ? 'idea' : 'diagnosis',
        goal: (view === 'idea' ? goal : problem).trim(),
        context: {
          items: [
            ...contextOptions.map((item) => ({
              id: item.id,
              kind: item.kind,
              label: item.label,
              summary: item.summary,
              selected: view === 'idea' ? item.available && item.id !== 'recent-runtime' : selectedContextIds.includes(item.id),
            })),
            ...knowledgeContext,
          ],
        },
      };
      const prepared = await window.electronAPI.prepareExploreRequest(request);
      if (prepared.state !== 'ready') {
        setNotice(`${prepared.message} 本次没有发起搜索。`);
        return;
      }
      setAnalysisPending(true);
      setWorkStatus('analyzing');
      setDisplayStage('analyze');
      setAnalysisResult(null);
      setPlanResult(null);
      setPlanHandoff(null);
      setSelectedIdeaId('');
      setExecutionPending(false);
      setExecutionStarted(false);
      setExecutionTaskId(null);
      setExecutionDisposition(null);
      setHandoffArtifact(null);
      setAnalysisTaskId(null);
      setAnalysisRequestId(null);
      activeAnalysisRequestId.current = null;
      setAnalysisRequest(prepared.request);
      setEditingInput(false);
      const started = await window.electronAPI.startExploreAnalysis(prepared.request);
      setAnalysisTaskId(started.taskId);
      setAnalysisRequestId(started.requestId);
      activeAnalysisRequestId.current = started.requestId;
      appendExploreMessage('user', 'request', prepared.request.goal, { requestId: started.requestId, taskId: started.taskId });
      setNotice(`已取得 ${started.sourceCount} 条来源，Catnip 正在形成判断。`);
    } catch (error) {
      setAnalysisPending(false);
      setWorkStatus('error');
      setNotice(error instanceof Error ? error.message : '无法准备探索请求');
    }
  };
  const beginPlan = async (selectedIdea?: IdeaResult) => {
    if (!analysisRequest || !analysisResult || analysisResult.mode === 'plan') return;
    const diagnosis = analysisResult.mode === 'diagnosis' ? analysisResult.diagnosis : undefined;
    const sources = selectedIdea?.sources || (diagnosis
      ? diagnosis.hypotheses.flatMap((item) => [...item.communitySources, ...item.externalSources])
      : []);
    const handoff: HandoffContext = {
      id: crypto.randomUUID(),
      kind: selectedIdea ? 'idea' : 'investigation',
      status: 'planning',
      originalGoal: analysisRequest.goal,
      environment: analysisRequest.context.items,
      selectedIdea,
      diagnosis,
      sources,
      suggestedFirstStep: selectedIdea?.implementationDirection || diagnosis?.hypotheses[0]?.nextValidation || '先核对现有工程和硬件状态',
      createdAt: new Date().toISOString(),
    };
    setSelectedIdeaId(selectedIdea?.id || 'diagnosis');
    setPlanHandoff(handoff);
    setExecutionPending(false);
    setExecutionStarted(false);
    setExecutionTaskId(null);
    setExecutionDisposition(null);
    setPlanPending(true);
    setWorkStatus('planning');
    setDisplayStage('plan');
    setPlanResult(null);
    setPlanTaskId(null);
    setPlanRequestId(null);
    setHandoffArtifact(null);
    activePlanRequestId.current = null;
    try {
      const started = await window.electronAPI.startExplorePlan(handoff);
      setPlanTaskId(started.taskId);
      setPlanRequestId(started.requestId);
      activePlanRequestId.current = started.requestId;
      const requestMessage = appendExploreMessage('user', 'plan', selectedIdea?.title ? `为“${selectedIdea.title}”生成工程计划` : '为当前调查结论生成工程计划', { requestId: started.requestId, taskId: started.taskId });
      const session = latestWorkSession.current;
      if (session) {
        const updated: ExploreWorkSessionRecord = {
          ...session,
          status: 'planning',
          snapshot: {
            ...session.snapshot,
            planHandoff: handoff,
            planResult: null,
            planTaskId: started.taskId,
            planRequestId: started.requestId,
            handoffArtifact: null,
            displayStage: 'plan',
            conversation: [...session.snapshot.conversation, requestMessage].slice(-200),
          },
        };
        latestWorkSession.current = updated;
        await window.electronAPI.saveExploreWorkSession(updated);
      }
      setNotice('已交给 Catnip，正在生成只读执行计划。');
    } catch (error) {
      setPlanPending(false);
      setWorkStatus('error');
      setNotice(error instanceof Error ? error.message : '无法生成执行计划');
    }
  };

  const confirmExecution = async () => {
    if (!planResult || !planHandoff || !handoffArtifact || !activeWorkSession || executionPending || executionStarted) return;
    setExecutionPending(true);
    try {
      const started = await window.electronAPI.confirmExploreExecution({
        planRequestId: planResult.requestId,
        handoffId: planHandoff.id,
        sessionId: activeWorkSession?.id || '',
        artifactDigest: handoffArtifact?.digest || '',
        confirmed: true,
      });
      setExecutionStarted(true);
      setExecutionTaskId(started.taskId);
      setExecutionDisposition(started.disposition);
      setWorkStatus('execution_queued');
      setDisplayStage('execute');
      const executionNotice = started.disposition === 'queued'
        ? '已确认执行，任务已进入现有 Agent 队列。'
        : '已确认执行，现有 Agent 已开始处理。';
      const executionMessage: ExploreConversationMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        kind: 'execution',
        text: '用户已确认交接材料，任务已提交给工程 Agent。',
        createdAt: new Date().toISOString(),
        taskId: started.taskId,
      };
      const persistedConversation = [...conversation, executionMessage].slice(-200);
      setConversation(persistedConversation);
      setNotice(executionNotice);
      const latest = latestWorkSession.current;
      if (latest) {
        const persisted: ExploreWorkSessionRecord = {
          ...latest,
          status: 'execution_queued',
          updatedAt: new Date().toISOString(),
          snapshot: {
            ...latest.snapshot,
            executionStarted: true,
            executionTaskId: started.taskId,
            executionDisposition: started.disposition,
            displayStage: 'execute',
            conversation: persistedConversation,
            notice: executionNotice,
          },
        };
        latestWorkSession.current = persisted;
        setActiveWorkSession(persisted);
        await window.electronAPI.saveExploreWorkSession(persisted);
        await refreshWorkSessions();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法确认执行当前计划');
    } finally {
      setExecutionPending(false);
    }
  };

  const beginVerification = (cardId: string) => {
    setVerificationCardId(cardId);
    setVerificationSummary('');
    setVerificationEvidence('');
    setNotice('');
  };

  const saveVerification = async (status: 'verified_effective' | 'verified_ineffective') => {
    const summary = verificationSummary.trim();
    if (!verificationCardId || !summary || verificationSaving) {
      setNotice('请先填写真实验证说明。');
      return;
    }
    const evidenceRefs = verificationEvidence
      .split(/[\n,，]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30);
    setVerificationSaving(true);
    try {
      const updated = await window.electronAPI.addExploreKnowledgeVerification({
        cardId: verificationCardId,
        status,
        projectId: currentProject || undefined,
        summary,
        evidenceRefs,
      });
      setKnowledgeCards((current) => current.map((card) => card.id === updated.id ? updated : card));
      setRelatedKnowledge((current) => current.map((card) => card.id === updated.id ? updated : card));
      setVerificationCardId('');
      setVerificationSummary('');
      setVerificationEvidence('');
      setNotice(status === 'verified_effective' ? '已记录：这条知识验证有效。' : '已记录：这条知识验证无效。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法保存验证结果');
    } finally {
      setVerificationSaving(false);
    }
  };

  const saveSource = async (source: SourceEvidence) => {
    if (knowledgeCards.some((card) => card.source.url === source.url)) {
      setNotice('这条来源已经收藏。');
      return;
    }
    setSavingSourceUrl(source.url);
    try {
      const card = await window.electronAPI.saveExploreKnowledge({
        source,
        taskSummary: analysisRequest?.goal || source.title,
        associatedProjects: currentProject ? [currentProject] : [],
        origin: activeWorkSession ? {
          sessionId: activeWorkSession.id,
          mode: activeWorkSession.mode,
          title: latestWorkSession.current?.title || activeWorkSession.title,
          projectPath: currentProject || undefined,
          conversation: conversation.map((message) => ({
            id: message.id,
            role: message.role,
            kind: message.kind,
            text: message.text,
            createdAt: message.createdAt,
          })),
        } : undefined,
      });
      setKnowledgeCards((current) => [card, ...current]);
      setNotice('已收藏到本地知识库；不会自动加入后续 Context。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法收藏这条来源');
    } finally {
      setSavingSourceUrl('');
    }
  };

  const savedSourceUrls = useMemo(() => new Set(knowledgeCards.map((card) => card.source.url)), [knowledgeCards]);
  const furthestStage = useMemo<ExploreStage>(() => {
    if (editingInput) return 'describe';
    if (executionStarted || handoffArtifact) return 'execute';
    if (planPending || planResult) return 'plan';
    if (analysisPending || analysisResult) return 'analyze';
    return 'describe';
  }, [analysisPending, analysisResult, editingInput, executionStarted, handoffArtifact, planPending, planResult]);

  const selectStage = async (stage: ExploreStage) => {
    const order: ExploreStage[] = ['describe', 'analyze', 'plan', 'execute'];
    const maximum = handoffArtifact ? 3 : order.indexOf(furthestStage);
    if (order.indexOf(stage) > maximum) return;
    if (stage === 'execute' && activeWorkSession) {
      try { setHandoffArtifact(await window.electronAPI.getExploreHandoffArtifact(activeWorkSession.id)); }
      catch (error) { setNotice(error instanceof Error ? error.message : '无法读取工程内交接材料'); return; }
    }
    setDisplayStage(stage);
  };

  const deleteKnowledgeCard = async (card: KnowledgeCard) => {
    if (!window.confirm(`确定删除收藏“${card.source.title}”吗？对应的探索历史不会被删除。`)) return;
    try {
      const cards = await window.electronAPI.deleteExploreKnowledge(card.id);
      setKnowledgeCards(cards);
      setRelatedKnowledge((current) => current.filter((entry) => entry.id !== card.id));
      setSelectedKnowledgeIds((current) => current.filter((id) => id !== card.id));
      if (expandedKnowledgeId === card.id) setExpandedKnowledgeId('');
      if (verificationCardId === card.id) setVerificationCardId('');
      setNotice('收藏已删除；对应的探索对话记录仍然保留。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法删除这条收藏');
    }
  };

  const openSource = (url: string) => {
    void window.electronAPI.navigateBrowser(url);
  };

  const sourceList = (sources: SourceEvidence[], label: string) => (
    <ExploreSourceList
      sources={sources}
      savedUrls={savedSourceUrls}
      savingSourceUrl={savingSourceUrl}
      label={label}
      onOpen={openSource}
      onSave={(source) => void saveSource(source)}
    />
  );

  const connectionState = connection?.state || 'checking';
  const connectionNeedsAction = connectionState === 'needs_secret' || connectionState === 'needs_install' || connectionState === 'error';
  const connectionBadge = (
    <section
      className={`explore-connection-status explore-connection-status--${connectionState}${connectionNeedsAction ? ' is-actionable' : ''}`}
      data-tour-id="explore-zhihu-connection"
      role="status"
    >
      <span className="explore-connection-dot" aria-hidden="true" />
      <div className="explore-connection-copy">
        <span>知乎开放平台</span>
        <strong>{checkingConnection ? '正在检查连接…' : connection?.message || '需要先连接知乎开放平台'}</strong>
        {connectionNeedsAction ? (
          <p>Access Secret 只交给知乎官方连接工具，不会出现在页面、聊天或日志中。</p>
        ) : null}
      </div>
      <div className="explore-connection-actions">
        {connection?.state === 'needs_install' && (
          <button className="explore-primary-action" type="button" onClick={() => void installConnection()} disabled={installingConnection}>
            {installingConnection ? '正在安装连接组件…' : '安装连接组件并继续'}
          </button>
        )}
        {connection?.state === 'needs_secret' && (
          <button className="explore-primary-action" type="button" onClick={() => void beginConnection()} disabled={startingConnection}>
            {startingConnection ? '正在打开安全窗口…' : '配置 Access Secret'}
          </button>
        )}
        <button className="explore-secondary-action" type="button" onClick={() => void refreshConnection()} disabled={checkingConnection}>
          {checkingConnection ? '检查中…' : '重新检查'}
        </button>
      </div>
      {connection?.state === 'needs_secret' ? (
        <ol className="explore-connection-steps" aria-label="连接步骤">
          <li><span>1</span>在知乎个人中心生成新的 Secret</li>
          <li><span>2</span>粘贴到弹出的安全窗口</li>
          <li><span>3</span>连接成功后页面会自动确认</li>
        </ol>
      ) : connection?.state === 'needs_install' ? (
        <ol className="explore-connection-steps" aria-label="安装步骤">
          <li><span>1</span>点击安装即授权从知乎官方地址下载并校验</li>
          <li><span>2</span>安装在当前用户目录，不需要管理员权限，也不会修改 PATH</li>
          <li><span>3</span>安装成功后自动弹出 Access Secret 安全窗口</li>
        </ol>
      ) : null}
    </section>
  );

  if (view === 'home') {
    return (
      <section className="explore-panel" data-tour-id="panel-explore" aria-labelledby="explore-title">
        <header className="explore-home-header">
          <div className="explore-hero">
            <span className="explore-eyebrow">RESEARCH WORKSPACE</span>
            <h2 id="explore-title">探索</h2>
            <p className="explore-reading-copy">把模糊想法变成可实现方向，或者结合工程证据定位问题。</p>
          </div>
          <div className="explore-home-metrics" aria-label="探索状态摘要">
            <span className={`explore-metric explore-metric--${connectionState}`}>
              <i aria-hidden="true" />
              {connectionState === 'connected' ? '知乎已连接' : connectionState === 'needs_secret' ? '知乎待连接' : connectionState === 'needs_install' ? '连接组件待安装' : connectionState === 'error' ? '连接异常' : '检查连接中'}
            </span>
            <span className="explore-metric"><strong>{knowledgeCards.length}</strong> 条本地知识</span>
          </div>
        </header>
        {connectionBadge}
        {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
        <div className="explore-entry-grid">
          <button className="explore-entry-card explore-entry-card--idea" type="button" onClick={() => enter('idea')} data-tour-id="explore-idea">
            <span className="explore-entry-illustration" aria-hidden="true"><img src={exploreIdeaGuagua} alt="" /></span>
            <span className="explore-entry-symbol explore-entry-symbol--idea" aria-hidden="true"><Lightbulb /></span>
            <span className="explore-entry-index">从一个念头开始</span>
            <strong>找灵感</strong>
            <span>描述你想做的东西，Catnip 会结合当前工程和硬件条件，给出真正能落地的方向。</span>
            <em>开始探索 <span aria-hidden="true">→</span></em>
            <span className="explore-entry-tags" aria-label="找灵感内容类型"><span>创意启发</span><span>技术方案</span><span>设计灵感</span><span>最佳实践</span></span>
          </button>
          <button className="explore-entry-card explore-entry-card--diagnosis" type="button" onClick={() => enter('diagnosis')} data-tour-id="explore-diagnosis">
            <span className="explore-entry-illustration" aria-hidden="true"><img src={exploreDiagnosisGuagua} alt="" /></span>
            <span className="explore-entry-symbol explore-entry-symbol--diagnosis" aria-hidden="true"><SearchCheck /></span>
            <span className="explore-entry-index">从一条线索开始</span>
            <strong>解问题</strong>
            <span>选择必要的工程和运行证据，再用社区经验与权威资料交叉判断。</span>
            <em>分析当前问题 <span aria-hidden="true">→</span></em>
            <span className="explore-entry-tags" aria-label="解问题内容类型"><span>问题分析</span><span>报错诊断</span><span>方案对比</span><span>代码示例</span></span>
          </button>
        </div>
        <div className="explore-home-dashboard-grid">
        <section className="explore-session-history" aria-labelledby="explore-history-title">
          <header className="explore-section-header">
            <div className="explore-section-heading"><span className="explore-section-title-icon is-history" aria-hidden="true"><History /></span><div><span className="explore-section-kicker">PROJECT HISTORY</span><h3 id="explore-history-title">最近的探索记录</h3></div></div>
            <div className="explore-history-actions">
              <button type="button" onClick={() => void openWorkSession('idea', undefined, true)}>新建灵感</button>
              <button type="button" onClick={() => void openWorkSession('diagnosis', undefined, true)}>新建调查</button>
            </div>
          </header>
          {workSessions.length ? (
            <ul className="explore-session-list">
              {workSessions.slice(0, 12).map((session) => (
                <li key={session.id}>
                  <button className="explore-session-open" type="button" onClick={() => void openWorkSession(session.mode, session.id)}>
                    <span className={'explore-session-kind is-' + session.mode}>{session.mode === 'idea' ? <Sparkles aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}{session.mode === 'idea' ? '灵感' : '问题'}</span>
                    <span><strong>{session.title}</strong><small>{new Date(session.updatedAt).toLocaleString()} · {workStatusLabel(session.status)}</small></span>
                    <span aria-hidden="true">→</span>
                  </button>
                  <button className="explore-session-delete" type="button" onClick={() => void deleteWorkSession(session)} aria-label={'删除探索记录：' + session.title}>删除</button>
                </li>
              ))}
            </ul>
          ) : <p className="explore-history-empty">当前工程还没有探索记录。进入找灵感或解问题后会自动创建并保存。</p>}
        </section>
        <section className="explore-knowledge-preview" data-tour-id="explore-saved-knowledge" aria-labelledby="explore-knowledge-title">
          <header className="explore-section-header">
            <div className="explore-section-heading"><span className="explore-section-title-icon is-knowledge" aria-hidden="true"><Star /></span><div><span className="explore-section-kicker">LOCAL KNOWLEDGE</span><h3 id="explore-knowledge-title">我的知识库</h3></div></div>
            <span>{knowledgeCards.length} 条 · 只在你选择后使用</span>
          </header>
          {knowledgeCards.length ? (
            <ul className="explore-knowledge-list">{knowledgeCards.slice(0, 6).map((card) => {
              const latestVerification = card.verificationRecords.at(-1);
              return (
                <li key={card.id} className="explore-knowledge-row">
                  <div className="explore-knowledge-main">
                    <div className="explore-knowledge-heading">
                      <BookMarked className="explore-row-icon" aria-hidden="true" />
                      <span className={`explore-verification-badge is-${card.verificationStatus}`}>{verificationLabel(card.verificationStatus)}</span>
                      <button className="explore-knowledge-link" type="button" onClick={() => openSource(card.source.url)}>{card.source.title}</button>
                    </div>
                    <p>{card.taskSummary}</p>
                    <small>{card.associatedProjects.length ? `关联工程：${card.associatedProjects.join('、')}` : '未关联工程'}</small>
                    {expandedKnowledgeId === card.id && card.origin ? (
                      <section className="explore-knowledge-conversation" aria-label={'收藏来源对话：' + card.source.title}>
                        <header><strong>{card.origin.mode === 'idea' ? '找灵感' : '解问题'} · {card.origin.title}</strong><small>{card.origin.conversation.length} 条对话</small></header>
                        {card.origin.conversation.length ? <ol>{card.origin.conversation.map((message) => (
                          <li key={message.id} className={'is-' + message.role}>
                            <span>{message.role === 'user' ? '你' : message.role === 'assistant' ? '探索 AI' : '系统'}</span>
                            <p>{message.text}</p>
                            <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
                          </li>
                        ))}</ol> : <p>收藏时还没有产生对话内容。</p>}
                      </section>
                    ) : null}
                    {latestVerification ? (
                      <div className="explore-verification-summary">
                        <strong>最近验证</strong>
                        <span>{latestVerification.summary}</span>
                        {latestVerification.evidenceRefs.length ? <small>证据：{latestVerification.evidenceRefs.join(' · ')}</small> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="explore-knowledge-actions">
                    {card.origin ? <button className="explore-row-action" type="button" onClick={() => setExpandedKnowledgeId((current) => current === card.id ? '' : card.id)}>{expandedKnowledgeId === card.id ? '收起原对话' : '查看原对话'}</button> : null}
                    <button className="explore-row-action" type="button" onClick={() => beginVerification(card.id)}>记录验证</button>
                    <button className="explore-row-action is-danger" type="button" onClick={() => void deleteKnowledgeCard(card)}>删除收藏</button>
                  </div>
                </li>
              );
            })}</ul>
          ) : <div className="explore-empty-state"><span aria-hidden="true">◇</span><div><strong>这里还没有内容</strong><p>完成一次分析后，可在可信来源旁点击“收藏”。</p></div></div>}
          {verificationCardId ? (
            <div className="explore-verification-form" data-tour-id="explore-verification-form" role="group" aria-label="记录真实验证结果">
              <div><span className="explore-section-kicker">VERIFICATION</span><strong>记录真实验证结果</strong></div>
              <textarea
                value={verificationSummary}
                onChange={(event) => setVerificationSummary(event.target.value)}
                placeholder="必填：说明实际做了什么、观察到了什么结果"
                aria-label="验证说明"
                maxLength={2000}
              />
              <input
                value={verificationEvidence}
                onChange={(event) => setVerificationEvidence(event.target.value)}
                placeholder="可选：证据引用，用逗号或换行分隔，例如任务 ID、日志时间"
                aria-label="验证证据引用"
                maxLength={4000}
              />
              <div className="explore-verification-actions">
                <button type="button" disabled={verificationSaving || !verificationSummary.trim()} onClick={() => void saveVerification('verified_effective')}>验证有效</button>
                <button type="button" disabled={verificationSaving || !verificationSummary.trim()} onClick={() => void saveVerification('verified_ineffective')}>验证无效</button>
                <button type="button" disabled={verificationSaving} onClick={() => setVerificationCardId('')}>取消</button>
              </div>
              <small>只记录你提供的验证结论；没有实机证据时不会声称硬件验证完成。</small>
            </div>
          ) : null}
        </section>
        <section className="explore-project-preview" aria-labelledby="explore-project-title">
          <header className="explore-section-header">
            <div className="explore-section-heading"><span className="explore-section-title-icon is-project" aria-hidden="true"><FolderOpen /></span><div><span className="explore-section-kicker">CURRENT PROJECT</span><h3 id="explore-project-title">当前工程</h3></div></div>
            <span>探索与 Agent 共用同一工程上下文</span>
          </header>
          <div className="explore-project-summary">
            <div><FolderOpen aria-hidden="true" /><span>工程</span><strong>{currentProject.split(/[\\/]/).filter(Boolean).at(-1) || '尚未选择'}</strong></div>
            <div><Cpu aria-hidden="true" /><span>硬件</span><strong>{hardwareSummary}</strong></div>
            <div><PlayCircle aria-hidden="true" /><span>运行</span><strong>{runtimeSummary}</strong></div>
            <code title={currentProject}><ExternalLink aria-hidden="true" />{currentProject || '请先选择一个工程'}</code>
          </div>
        </section>
        </div>
      </section>
    );
  }

  const isIdea = view === 'idea';
  const requestText = isIdea ? goal : problem;
  const selectedContextCount = contextOptions.filter((item) => selectedContextIds.includes(item.id)).length;
  const selectedKnowledgeCount = selectedKnowledgeIds.length;

  const ideaResults = analysisResult?.mode === 'idea' ? (
    <section className="explore-analysis-result explore-idea-results" aria-labelledby="explore-results-title">
      <header className="explore-section-header">
        <div><span className="explore-section-kicker">CATNIP SYNTHESIS</span><h3 id="explore-results-title">可实现方向</h3></div>
        <span>{analysisResult.ideas.length} 个候选 · 选择后只生成计划</span>
      </header>
      <div className="explore-idea-grid">
        {analysisResult.ideas.map((idea, index) => (
          <article
            className={`explore-idea-option${selectedIdeaId === idea.id ? ' is-selected' : ''}${selectedIdeaId && selectedIdeaId !== idea.id ? ' is-dimmed' : ''}`}
            key={idea.id}
          >
            <header>
              <span className="explore-idea-number">{String(index + 1).padStart(2, '0')}</span>
              {selectedIdeaId === idea.id ? <span className="explore-selected-label">当前选择</span> : null}
            </header>
            <h4>{idea.title}</h4>
            <p className="explore-idea-value explore-reading-copy">{idea.value}</p>
            <dl className="explore-result-facts">
              <div><dt>实现方向</dt><dd className="explore-reading-copy">{idea.implementationDirection}</dd></div>
              <div><dt>条件匹配</dt><dd className="explore-reading-copy">{idea.compatibility}</dd></div>
            </dl>
            {sourceList(idea.sources, '依据来源')}
            <footer className="explore-idea-action-bar">
              <button type="button" className="explore-generate-plan" onClick={() => void beginPlan(idea)} disabled={planPending}>
                {planPending && selectedIdeaId === idea.id ? '正在生成计划…' : '用这个方向生成计划'}
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  ) : null;

  const diagnosisResults = analysisResult?.mode === 'diagnosis' ? (
    <section className="explore-analysis-result explore-diagnosis-report" aria-labelledby="explore-diagnosis-title">
      <header className="explore-report-header">
        <span className="explore-section-kicker">INVESTIGATION REPORT</span>
        <h3 id="explore-diagnosis-title">分析结果</h3>
        <p className="explore-reading-copy">{analysisResult.diagnosis.problem}</p>
      </header>
      {analysisResult.diagnosis.sourceConflicts.length ? (
        <aside className="explore-conflict-notice" role="note" aria-labelledby="explore-conflicts-title">
          <div>
            <span aria-hidden="true">!</span>
            <div><strong id="explore-conflicts-title">需要注意的来源分歧</strong><small>以下冲突需要通过工程或实机证据继续验证。</small></div>
          </div>
          <ul>{analysisResult.diagnosis.sourceConflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul>
        </aside>
      ) : null}
      <ol className="explore-hypothesis-list">
        {analysisResult.diagnosis.hypotheses.map((hypothesis, index) => (
          <li className="explore-hypothesis" key={hypothesis.id}>
            <div className="explore-hypothesis-index">{String(index + 1).padStart(2, '0')}</div>
            <article>
              <span className="explore-section-kicker">优先排查</span>
              <h4>{hypothesis.statement}</h4>
              <section className="explore-report-section">
                <h5>为什么怀疑</h5>
                <p className="explore-reading-copy">{hypothesis.priorityReason}</p>
              </section>
              <section className="explore-report-section explore-project-evidence">
                <h5>你的工程证据</h5>
                {hypothesis.projectEvidence.length ? (
                  <ul>{hypothesis.projectEvidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>
                ) : <p className="explore-muted-copy">当前结果没有引用可确认的工程证据，请优先执行下一步验证。</p>}
              </section>
              {sourceList(hypothesis.communitySources, '社区经验')}
              {sourceList(hypothesis.externalSources, '外部资料')}
              <section className="explore-next-validation">
                <span>下一步验证</span>
                <p className="explore-reading-copy">{hypothesis.nextValidation}</p>
              </section>
            </article>
          </li>
        ))}
      </ol>
      <button type="button" className="explore-generate-plan" onClick={() => void beginPlan()} disabled={planPending}>
        {planPending ? '正在生成计划…' : '为这份调查生成计划'}
      </button>
    </section>
  ) : null;

  const planView = planPending || planResult ? (
    <section className="explore-plan-view" aria-labelledby="explore-plan-title">
      <header>
        <div><span className="explore-section-kicker">READ-ONLY HANDOFF</span><h3 id="explore-plan-title">执行计划</h3></div>
        <span className="explore-plan-lock">确认前只读</span>
      </header>
      <div className="explore-plan-selection">
        <span>你选择</span>
        <strong>{planHandoff?.selectedIdea?.title || planHandoff?.diagnosis?.problem || requestText}</strong>
      </div>
      {planPending ? (
        <div className="explore-plan-progress" role="status" aria-live="polite">
          <div className="explore-progress-ring" aria-hidden="true"><span>AI</span></div>
          <div className="explore-plan-progress-copy"><span className="explore-section-kicker">CATNIP EXECUTION</span><strong>Catnip 正在组织执行步骤</strong><p>正在读取当前工程交接上下文，只生成计划，不会修改工程或操作硬件。</p></div>
          <ol className="explore-plan-progress-steps"><li className="is-active">整理目标</li><li>核对约束</li><li>生成计划</li></ol>
        </div>
      ) : planResult ? (
        <>
          <p className="explore-plan-summary explore-reading-copy">{planResult.plan.summary}</p>
          <ol className="explore-plan-steps">
            {planResult.plan.steps.map((step, index) => (
              <li key={step.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{step.title}</strong><p className="explore-reading-copy">{step.detail}</p></div>
              </li>
            ))}
          </ol>
          {planResult.plan.risks.length > 0 ? (
            <section className="explore-risk-list">
              <h4>风险与注意事项</h4>
              <ul>{planResult.plan.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
            </section>
          ) : null}
          <div className="explore-confirm-zone">
            <div><strong>工程交接材料</strong><p>{handoffArtifact ? `已写入 ${handoffArtifact.relativeDir}` : '计划完成后会在当前工程中生成分层交接材料。'}</p></div>
            <button
              type="button"
              className="explore-confirm-action"
              disabled={!handoffArtifact}
              onClick={() => void selectStage('execute')}
            >
              查看交接材料
            </button>
            <small>这里只生成和保存材料，不会修改业务源码或操作硬件。</small>
          </div>
        </>
      ) : null}
    </section>
  ) : null;

  const artifactView = displayStage === 'execute' && handoffArtifact ? (
    <section className="explore-artifact-view" aria-labelledby="explore-artifact-title">
      <header>
        <div><span className="explore-section-kicker">PROJECT HANDOFF</span><h3 id="explore-artifact-title">工程内交接材料</h3></div>
        <code>{handoffArtifact.relativeDir}</code>
      </header>
      {(['HANDOFF.md', 'PLAN.md'] as const).map((file) => {
        const text = file === 'HANDOFF.md' ? handoffArtifact.handoffMarkdown : handoffArtifact.planMarkdown;
        const target = `${currentProject}\\${handoffArtifact.relativeDir}\\${file}`;
        return <details key={file} open={file === 'HANDOFF.md'}><summary>{file}</summary>
          {editingArtifactFile === file ? <textarea className="explore-artifact-editor" value={artifactDraft} onChange={(event) => setArtifactDraft(event.target.value)} aria-label={`${file} 编辑`} /> : <pre>{text}</pre>}
          <div className="explore-artifact-actions"><button type="button" onClick={() => { setEditingArtifactFile(file); setArtifactDraft(text); }}>编辑</button><button type="button" onClick={() => void window.electronAPI?.openWorkbenchItem(target)}>在文件资源管理器中打开</button>{editingArtifactFile === file ? <button type="button" onClick={async () => { const result = await window.electronAPI?.writeWorkbenchFile(target, artifactDraft); if (result?.ok) { setHandoffArtifact((current) => current ? { ...current, ...(file === 'HANDOFF.md' ? { handoffMarkdown: artifactDraft } : { planMarkdown: artifactDraft }) } : current); setEditingArtifactFile(null); setNotice(`${file} 已保存`); } }}>保存</button> : null}</div>
        </details>;
      })}
      <div className="explore-confirm-zone">
        <div><strong>提交给工程 Agent</strong><p>确认后才会把这份磁盘材料交给左侧当前工程 Agent；该确认只能使用一次。</p></div>
        <button
          type="button"
          className="explore-confirm-action"
          data-tour-id="explore-confirm-execution"
          disabled={executionPending || executionStarted}
          onClick={() => void confirmExecution()}
        >
          {executionPending ? '正在提交…' : executionStarted ? '已提交给工程 Agent' : '确认提交给工程 Agent'}
        </button>
        <small>{executionStarted ? '工程 Agent 已接收任务。' : '确认前不会修改文件、Build、Flash 或操作串口。'}</small>
      </div>
    </section>
  ) : null;

  const conversationView = activeWorkSession ? (
    <section className="explore-conversation" aria-labelledby="explore-conversation-title">
      <header><div><span className="explore-section-kicker">EXPLORE AGENT</span><h3 id="explore-conversation-title">本次探索对话</h3></div><span>{conversation.length} 条</span></header>
      {conversation.length ? <ol>{conversation.map((message) => (
        <li key={message.id} className={`is-${message.role} is-${message.kind}`}>
          <span>{message.role === 'user' ? '你' : message.role === 'assistant' ? '探索 AI' : '系统'}</span>
          <p>{message.text}</p>
          <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
        </li>
      ))}</ol> : <p className="explore-history-empty">描述并开始分析后，这里会单独记录本次探索过程，不会写入左侧工程 Agent 对话。</p>}
    </section>
  ) : null;

  return (
    <section className={`explore-panel explore-panel--flow is-stage-${displayStage}`} data-tour-id={isIdea ? 'panel-explore-idea' : 'panel-explore-diagnosis'}>
      <header className="explore-flow-header">
        <button type="button" className="explore-back-button" onClick={() => { setView('home'); void refreshWorkSessions(); }} aria-label="返回探索首页">←</button>
        <div>
          <span className="explore-eyebrow">{isIdea ? 'IDEA' : 'INVESTIGATION'}</span>
          <h2>{isIdea ? '找灵感' : '解问题'}</h2>
        </div>
        <ExploreStageNav current={displayStage} furthest={furthestStage} onSelect={(stage) => void selectStage(stage)} />
        <span className={'explore-session-status is-' + workStatus}>{workStatusLabel(workStatus)}</span>
      </header>

      {connectionBadge}
      {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
      <form className="explore-form" onSubmit={(event) => void prepareRequest(event)}>
        <section className="explore-input-pane" aria-label={isIdea ? '想法与当前条件' : '问题与分析资料'}>
          {displayStage === 'describe' && (editingInput || !analysisRequest) ? (
            <>
              <label className="explore-field">
                <span>{isIdea ? '你想做什么？' : '现在遇到了什么问题？'}</span>
                <textarea
                  value={requestText}
                  onChange={(event) => isIdea ? setGoal(event.target.value) : setProblem(event.target.value)}
                  placeholder={isIdea
                    ? '例如：我想做一个放在桌面上、有陪伴感的小设备。'
                    : '例如：固件可以 Build 和 Flash，但 Wi-Fi 在真实运行时反复断开。'}
                  maxLength={4000}
                />
              </label>

              {isIdea ? (
                <section className="explore-condition-list" aria-labelledby="explore-condition-title">
                  <h3 id="explore-condition-title">当前条件</h3>
                  <dl>
                    <div><dt><span className="is-project">P</span>工程</dt><dd>{currentProject || '尚未选择，Catnip 将按新项目理解'}</dd></div>
                    <div><dt><span className="is-hardware">H</span>硬件</dt><dd>{hardwareSummary}</dd></div>
                  </dl>
                </section>
              ) : (
                <>
                  <fieldset className="explore-context-picker">
                    <legend>本次分析 Context</legend>
                    <p>{contextLoading ? '正在收集有界工程证据...' : '已自动选择当前可用证据。取消勾选后，该项不会进入分析。'}</p>
                    {contextError ? <p className="explore-context-error" role="alert">{contextError}</p> : null}
                    <div className="explore-context-list">
                      {contextOptions.map((item) => (
                        <label key={item.id} className={`explore-context-row${item.available ? '' : ' is-unavailable'}`}>
                          <input
                            type="checkbox"
                            checked={selectedContextIds.includes(item.id)}
                            disabled={!item.available}
                            onChange={() => toggleContext(item.id)}
                          />
                          <span className={`explore-context-kind is-${item.kind}`}>{CONTEXT_KIND_LABELS[item.kind]}</span>
                          <span><strong>{item.label}</strong><small>{item.summary}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="explore-context-picker explore-related-knowledge" data-tour-id="explore-related-knowledge">
                    <legend>相关历史收藏</legend>
                    <p>{relatedKnowledgeLoading
                      ? '正在本地查找相关收藏...'
                      : '候选默认不加入分析。只有你勾选的内容才会发送给当前分析服务。'}</p>
                    {relatedKnowledgeError ? <p className="explore-context-error" role="alert">{relatedKnowledgeError}</p> : null}
                    {!problem.trim() ? <p>描述问题后，会从本地收藏中发现相关知识。</p> : null}
                    {problem.trim() && !relatedKnowledgeLoading && !relatedKnowledge.length && !relatedKnowledgeError ? <p>没有发现相关收藏。</p> : null}
                    <div className="explore-context-list">
                      {relatedKnowledge.map((card) => (
                        <label key={card.id} className="explore-context-row">
                          <input
                            type="checkbox"
                            checked={selectedKnowledgeIds.includes(card.id)}
                            onChange={() => toggleKnowledge(card.id)}
                          />
                          <span className="explore-context-kind is-knowledge">知识</span>
                          <span>
                            <strong>{card.source.title}</strong>
                            <small>{card.taskSummary} · {verificationLabel(card.verificationStatus)}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              <div className="explore-submit-row">
                <button className="explore-primary-cta" type="submit" disabled={analysisPending || (!isIdea && contextLoading) || !(isIdea ? goal.trim() : problem.trim())}>
                  {!isIdea && contextLoading ? '正在收集 Context…' : analysisPending ? '正在分析…' : isIdea ? '开始探索' : '开始分析'}
                </button>
                <span>分析阶段不会修改文件、Build、Flash 或操作串口。</span>
              </div>
            </>
          ) : (
            <section className="explore-request-summary">
              <div><span className="explore-section-kicker">{isIdea ? '目标' : '问题'}</span><h3>{analysisRequest.goal}</h3></div>
              <dl>
                <div><dt>当前工程</dt><dd>{currentProject || '未选择'}</dd></div>
                {isIdea ? <div><dt>硬件</dt><dd>{hardwareSummary}</dd></div> : <div><dt>分析资料</dt><dd>{selectedContextCount} 项 Context · {selectedKnowledgeCount} 条历史知识</dd></div>}
              </dl>
              <button type="button" onClick={editRequest} disabled={analysisPending || planPending}>修改描述与资料</button>
            </section>
          )}
        </section>

        <section className="explore-output-pane" aria-live="polite" aria-label="探索输出">
          {displayStage === 'analyze' && analysisPending ? (
            <div className="explore-loading-state" role="status"><span aria-hidden="true" /><div><strong>Catnip 正在形成判断</strong><p>正在整理真实来源与当前条件，不会修改工程。</p></div></div>
          ) : null}
          {displayStage === 'describe' && !analysisPending && !analysisResult ? (
            <div className="explore-output-empty">
              <span aria-hidden="true">{isIdea ? '✦' : '⌁'}</span>
              <div><strong>{isIdea ? '探索结果将在这里展开' : '调查报告将在这里展开'}</strong><p>{isIdea ? '输入目标后，候选方向、匹配度与来源会并列呈现。' : '工程证据、社区经验、外部资料与来源冲突会在这里交叉呈现。'}</p></div>
            </div>
          ) : null}
          {displayStage === 'plan' ? planView : null}
          {displayStage === 'execute' ? artifactView : null}
          {displayStage === 'analyze' ? <>{ideaResults}{diagnosisResults}</> : null}
        </section>
      </form>
      {conversationView}
    </section>
  );
}
