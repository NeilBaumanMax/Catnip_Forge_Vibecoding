import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ExploreAnalysisResult, ExploreContextGatherResult, ExploreContextItem, ExploreRequest, HandoffContext, IdeaResult, KnowledgeCard, SourceEvidence, ExploreZhihuConnectionStatus } from '../../common/explore';

type ExploreView = 'home' | 'idea' | 'diagnosis';

interface Props {
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

export default function ExplorePanel({ currentProject, hardwareSummary, runtimeSummary, diagnosisSeed }: Props) {
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
  const [gatheredContext, setGatheredContext] = useState<ExploreContextGatherResult | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [savingSourceUrl, setSavingSourceUrl] = useState('');
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeCard[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [relatedKnowledgeLoading, setRelatedKnowledgeLoading] = useState(false);
  const [relatedKnowledgeError, setRelatedKnowledgeError] = useState('');
  const [verificationCardId, setVerificationCardId] = useState('');
  const [verificationSummary, setVerificationSummary] = useState('');
  const [verificationEvidence, setVerificationEvidence] = useState('');
  const [verificationSaving, setVerificationSaving] = useState(false);
  const connectionWatchId = useRef(0);
  const autoConnectionPrompted = useRef(false);

  useEffect(() => {
    if (!diagnosisSeed) return;
    setView('diagnosis');
    setProblem(diagnosisSeed.problem);
    setNotice('已从工作区带入问题线索。请核对描述和 Context 后再开始分析。');
    setAnalysisPending(false);
    setAnalysisResult(null);
    setAnalysisRequest(null);
    setPlanResult(null);
    setPlanPending(false);
    setPlanHandoff(null);
    setExecutionPending(false);
    setExecutionStarted(false);
  }, [diagnosisSeed]);

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
    setSelectedKnowledgeIds([]);
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
        setPlanResult(result);
        setPlanPending(false);
        setNotice('执行计划已生成。请核对步骤和风险，确认后才会进入 Agent 队列。');
      } else {
        setAnalysisResult(result);
        setAnalysisPending(false);
        setNotice('分析完成，以下结论均保留原始来源。');
      }
    });
    window.electronAPI.onExploreAnalysisError((error) => {
      setAnalysisPending(false);
      setPlanPending(false);
      setNotice(error.message);
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
        setSelectedContextIds([...new Set(ids)]);
      })
      .catch((error) => {
        if (cancelled) return;
        setContextError(error instanceof Error ? error.message : '无法收集当前工程 Context');
        setSelectedContextIds(fallbackContextOptions.filter((item) => item.available).map((item) => item.id));
      })
      .finally(() => { if (!cancelled) setContextLoading(false); });
    return () => { cancelled = true; };
  }, [currentProject, hardwareSummary, view]);

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
    setView(next);
    setNotice('');

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
      setAnalysisResult(null);
      setPlanResult(null);
      setAnalysisRequest(prepared.request);
      const started = await window.electronAPI.startExploreAnalysis(prepared.request);
      setNotice(`已取得 ${started.sourceCount} 条来源，Catnip 正在形成判断。`);
    } catch (error) {
      setAnalysisPending(false);
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
    setPlanHandoff(handoff);
    setExecutionPending(false);
    setExecutionStarted(false);
    setPlanPending(true);
    setPlanResult(null);
    try {
      await window.electronAPI.startExplorePlan(handoff);
      setNotice('已交给 Catnip，正在生成只读执行计划。');
    } catch (error) {
      setPlanPending(false);
      setNotice(error instanceof Error ? error.message : '无法生成执行计划');
    }
  };

  const confirmExecution = async () => {
    if (!planResult || !planHandoff || executionPending || executionStarted) return;
    setExecutionPending(true);
    try {
      const started = await window.electronAPI.confirmExploreExecution({
        planRequestId: planResult.requestId,
        handoffId: planHandoff.id,
        confirmed: true,
      });
      setExecutionStarted(true);
      setNotice(started.disposition === 'queued'
        ? '已确认执行，任务已进入现有 Agent 队列。'
        : '已确认执行，现有 Agent 已开始处理。');
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
      });
      setKnowledgeCards((current) => [card, ...current]);
      setNotice('已收藏到本地知识库；不会自动加入后续 Context。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法收藏这条来源');
    } finally {
      setSavingSourceUrl('');
    }
  };

  const renderSource = (source: SourceEvidence) => {
    const saved = knowledgeCards.some((card) => card.source.url === source.url);
    return (
      <div className="explore-source-item" key={source.url}>
        <a href={source.url} onClick={(event) => { event.preventDefault(); void window.electronAPI.navigateBrowser(source.url); }}>
          {source.title}{source.author ? ` · ${source.author}` : ''}
        </a>
        <button type="button" disabled={saved || savingSourceUrl === source.url} onClick={() => void saveSource(source)}>
          {saved ? '已收藏' : savingSourceUrl === source.url ? '收藏中...' : '收藏'}
        </button>
      </div>
    );
  };

  const connectionBadge = (
    <div className={`explore-connection-card explore-connection-card--${connection?.state || 'checking'}`} data-tour-id="explore-zhihu-connection">
      <div className="explore-connection-icon" aria-hidden="true"><span /></div>
      <div className="explore-connection-copy">
        <span>知乎开放平台</span>
        <strong>{checkingConnection ? '正在检查连接…' : connection?.message || '需要先连接知乎开放平台'}</strong>
        <p>{connection?.state === 'connected'
          ? '探索时可检索知乎真实开发经验；每条结论仍会保留原始来源。'
          : 'Access Secret 只交给知乎官方连接工具，不会出现在页面、聊天或日志中。'}</p>
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
    </div>
  );

  if (view === 'home') {
    return (
      <section className="explore-panel" data-tour-id="panel-explore" aria-labelledby="explore-title">
        <div className="explore-hero">
          <span className="explore-eyebrow">CATNIP FORGE</span>
          <h2 id="explore-title">探索</h2>
          <p>把模糊的想法变成可实现方向，或用真实来源定位硬件问题。</p>
        </div>
        {connectionBadge}
        {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
        <div className="explore-entry-grid">
          <button className="explore-entry-card" type="button" onClick={() => enter('idea')} data-tour-id="explore-idea">
            <span className="explore-entry-symbol explore-entry-symbol--idea" aria-hidden="true">✦</span>
            <span className="explore-entry-index">从一个念头开始</span>
            <strong>找灵感</strong>
            <span>描述你想做的东西，Catnip 会结合当前工程和硬件条件，给出真正能落地的方向。</span>
            <em>描述我的想法 <span aria-hidden="true">→</span></em>
          </button>
          <button className="explore-entry-card" type="button" onClick={() => enter('diagnosis')} data-tour-id="explore-diagnosis">
            <span className="explore-entry-symbol explore-entry-symbol--diagnosis" aria-hidden="true">⌁</span>
            <span className="explore-entry-index">从一条线索开始</span>
            <strong>解问题</strong>
            <span>选择必要的工程和运行证据，再用社区经验与权威资料交叉判断。</span>
            <em>分析当前问题 <span aria-hidden="true">→</span></em>
          </button>
        </div>
        <section className="explore-knowledge-preview" data-tour-id="explore-saved-knowledge">
          <header><div><span className="explore-section-kicker">你的资料库</span><strong>已收藏知识</strong></div><span>{knowledgeCards.length} 条 · 只在你选择后使用</span></header>
          {knowledgeCards.length ? (
            <ul>{knowledgeCards.slice(0, 6).map((card) => (
              <li key={card.id}>
                <button className="explore-knowledge-link" type="button" onClick={() => void window.electronAPI.navigateBrowser(card.source.url)}>{card.source.title}</button>
                <small>{card.verificationStatus === 'unverified' ? '尚未验证' : card.verificationStatus === 'verified_effective' ? '已验证有效' : '已验证无效'}</small>
                <button type="button" onClick={() => beginVerification(card.id)}>记录验证</button>
              </li>
            ))}</ul>
          ) : <div className="explore-empty-state"><span aria-hidden="true">◇</span><div><strong>这里还没有内容</strong><p>完成一次分析后，可在可信来源旁点击“收藏”。</p></div></div>}
          {verificationCardId ? (
            <div className="explore-verification-form" data-tour-id="explore-verification-form">
              <strong>记录真实验证结果</strong>
              <textarea
                value={verificationSummary}
                onChange={(event) => setVerificationSummary(event.target.value)}
                placeholder="必填：说明实际做了什么、观察到了什么结果"
                maxLength={2000}
              />
              <input
                value={verificationEvidence}
                onChange={(event) => setVerificationEvidence(event.target.value)}
                placeholder="可选：证据引用，用逗号或换行分隔，例如任务 ID、日志时间"
                maxLength={4000}
              />
              <div>
                <button type="button" disabled={verificationSaving || !verificationSummary.trim()} onClick={() => void saveVerification('verified_effective')}>验证有效</button>
                <button type="button" disabled={verificationSaving || !verificationSummary.trim()} onClick={() => void saveVerification('verified_ineffective')}>验证无效</button>
                <button type="button" disabled={verificationSaving} onClick={() => setVerificationCardId('')}>取消</button>
              </div>
              <small>只记录你提供的验证结论；没有实机证据时不会声称硬件验证完成。</small>
            </div>
          ) : null}
        </section>
      </section>
    );
  }

  const isIdea = view === 'idea';
  return (
    <section className="explore-panel explore-panel--flow" data-tour-id={isIdea ? 'panel-explore-idea' : 'panel-explore-diagnosis'}>
      <header className="explore-flow-header">
        <button type="button" className="explore-back-button" onClick={() => { setView('home'); setNotice(''); }}>返回探索</button>
        <div>
          <span className="explore-eyebrow">{isIdea ? 'IDEA' : 'INVESTIGATION'}</span>
          <h2>{isIdea ? '找灵感' : '解问题'}</h2>
        </div>
      </header>

      <form className="explore-form" onSubmit={(event) => void prepareRequest(event)}>
        {connectionBadge}
        <label className="explore-field">
          <span>{isIdea ? '你想做什么？' : '现在遇到了什么问题？'}</span>
          <textarea
            value={isIdea ? goal : problem}
            onChange={(event) => isIdea ? setGoal(event.target.value) : setProblem(event.target.value)}
            placeholder={isIdea
              ? '例如：我想做一个放在桌面上、有陪伴感的小设备。'
              : '例如：固件可以 Build 和 Flash，但 Wi-Fi 在真实运行时反复断开。'}
            maxLength={4000}
          />
        </label>

        {isIdea ? (
          <div className="explore-context-summary">
            <span>当前实现约束</span>
            <dl>
              <div><dt>工程</dt><dd>{currentProject || '尚未选择，Catnip 将按新项目理解'}</dd></div>
              <div><dt>硬件</dt><dd>{hardwareSummary}</dd></div>
            </dl>
          </div>
        ) : (
          <>
          <fieldset className="explore-context-picker">
            <legend>本次分析 Context</legend>
            <p>{contextLoading ? '正在收集有界工程证据...' : '已自动选择当前可用证据。取消勾选后，该项不会进入分析。'}</p>
            {contextError ? <p className="explore-context-error">{contextError}</p> : null}
            {contextOptions.map((item) => (
              <label key={item.id} className={item.available ? '' : 'is-unavailable'}>
                <input
                  type="checkbox"
                  checked={selectedContextIds.includes(item.id)}
                  disabled={!item.available}
                  onChange={() => toggleContext(item.id)}
                />
                <span><strong>{item.label}</strong><small>{item.summary}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset className="explore-context-picker explore-related-knowledge" data-tour-id="explore-related-knowledge">
            <legend>相关历史收藏</legend>
            <p>{relatedKnowledgeLoading
              ? '正在本地查找相关收藏...'
              : '候选默认不加入分析。只有你勾选的内容才会发送给当前分析服务。'}</p>
            {relatedKnowledgeError ? <p className="explore-context-error">{relatedKnowledgeError}</p> : null}
            {!problem.trim() ? <p>描述问题后，会从本地收藏中发现相关知识。</p> : null}
            {problem.trim() && !relatedKnowledgeLoading && !relatedKnowledge.length && !relatedKnowledgeError
              ? <p>没有发现相关收藏。</p>
              : null}
            {relatedKnowledge.map((card) => (
              <label key={card.id}>
                <input
                  type="checkbox"
                  checked={selectedKnowledgeIds.includes(card.id)}
                  onChange={() => toggleKnowledge(card.id)}
                />
                <span>
                  <strong>{card.source.title}</strong>
                  <small>{card.taskSummary} · {card.verificationStatus === 'unverified' ? '尚未验证' : card.verificationStatus === 'verified_effective' ? '已验证有效' : '已验证无效'}</small>
                </span>
              </label>
            ))}
          </fieldset>
          </>
        )}

        <div className="explore-submit-row">
          <button className="nes-btn is-primary" type="submit" disabled={analysisPending || (!isIdea && contextLoading) || !(isIdea ? goal.trim() : problem.trim())}>
            {!isIdea && contextLoading ? '正在收集 Context...' : analysisPending ? '正在分析...' : isIdea ? '形成可实现的 Idea' : '分析当前问题'}
          </button>
          <span>分析阶段不会修改文件、Build、Flash 或操作串口。</span>
        </div>
        {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
        {analysisResult?.mode === 'idea' && (
          <div className="explore-results">
            {analysisResult.ideas.map((idea) => (
              <article className="explore-result-card" key={idea.id}>
                <h3>{idea.title}</h3>
                <p>{idea.value}</p>
                <p><strong>怎么实现：</strong>{idea.implementationDirection}</p>
                <p><strong>与当前条件的匹配：</strong>{idea.compatibility}</p>
                <div className="explore-source-list">
                  {idea.sources.map((source) => renderSource(source))}
                </div>
                <button type="button" className="nes-btn" onClick={() => void beginPlan(idea)} disabled={planPending}>
                  {planPending ? '正在生成计划...' : '交给 Catnip'}
                </button>
              </article>
            ))}
          </div>
        )}
        {analysisResult?.mode === 'diagnosis' && (
          <div className="explore-results">
            <h3>{analysisResult.diagnosis.problem}</h3>
            {analysisResult.diagnosis.hypotheses.map((hypothesis) => (
              <article className="explore-result-card" key={hypothesis.id}>
                <h3>{hypothesis.statement}</h3>
                <p>{hypothesis.priorityReason}</p>
                <p><strong>下一步验证：</strong>{hypothesis.nextValidation}</p>
                <div className="explore-source-list">
                  {[...hypothesis.communitySources, ...hypothesis.externalSources].map((source) => renderSource(source))}
                </div>
              </article>
            ))}
            <button type="button" className="nes-btn" onClick={() => void beginPlan()} disabled={planPending}>
              {planPending ? '正在生成计划...' : '交给 Catnip'}
            </button>
          </div>
        )}
        {planResult && (
          <section className="explore-plan-result">
            <h3>Catnip 执行计划</h3>
            <p>{planResult.plan.summary}</p>
            <ol>
              {planResult.plan.steps.map((step) => <li key={step.id}><strong>{step.title}</strong><p>{step.detail}</p></li>)}
            </ol>
            {planResult.plan.risks.length > 0 && <p><strong>风险：</strong>{planResult.plan.risks.join('；')}</p>}
            <button
              type="button"
              className="nes-btn is-primary"
              data-tour-id="explore-confirm-execution"
              disabled={!planHandoff || executionPending || executionStarted}
              onClick={() => void confirmExecution()}
            >
              {executionPending ? '正在提交...' : executionStarted ? '已进入执行队列' : '确认并执行'}
            </button>
            <p>{executionStarted ? '已交给现有 Agent 队列；源码、Build、Flash、Serial 与实机结果仍以真实执行证据为准。' : '确认前不会修改文件、Build、Flash 或操作串口。'}</p>
          </section>
        )}
      </form>
    </section>
  );
}
