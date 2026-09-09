import React, { useEffect, useMemo, useState } from 'react';
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
    setStartingConnection(true);
    try {
      const result = await window.electronAPI.beginExploreZhihuConnection();
      setNotice(result.message);
    } catch {
      setNotice('无法启动知乎开放平台安全连接');
    } finally {
      setStartingConnection(false);
    }
  };

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
    <div className={`explore-connection-badge explore-connection-badge--${connection?.state || 'checking'}`}>
      <span>知识来源</span>
      <strong>{checkingConnection ? '正在检查连接...' : connection?.message || '需要先连接知乎开放平台'}</strong>
      {connection?.state === 'needs_secret' && (
        <button type="button" onClick={() => void beginConnection()} disabled={startingConnection}>
          {startingConnection ? '正在打开...' : '连接知乎开放平台'}
        </button>
      )}
      <button type="button" onClick={() => void refreshConnection()} disabled={checkingConnection}>重新检查</button>
    </div>
  );

  if (view === 'home') {
    return (
      <section className="explore-panel" data-tour-id="panel-explore" aria-labelledby="explore-title">
        <div className="explore-hero">
          <span className="explore-eyebrow">CATNIP FORGE</span>
          <h2 id="explore-title">探索</h2>
          <p>从真实开发经验中找到可实现的方向，或为当前硬件问题建立有证据的判断。</p>
        </div>
        {connectionBadge}
        {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
        <div className="explore-entry-grid">
          <button className="explore-entry-card" type="button" onClick={() => enter('idea')} data-tour-id="explore-idea">
            <span className="explore-entry-index">01</span>
            <strong>找灵感</strong>
            <span>告诉 Catnip 你想做什么，由它结合当前工程与硬件条件形成可实现的 Idea。</span>
            <em>开始描述想法</em>
          </button>
          <button className="explore-entry-card" type="button" onClick={() => enter('diagnosis')} data-tour-id="explore-diagnosis">
            <span className="explore-entry-index">02</span>
            <strong>解问题</strong>
            <span>带上最小必要的工程和运行证据，交叉检索社区经验与权威资料。</span>
            <em>开始分析问题</em>
          </button>
        </div>
        <section className="explore-knowledge-preview" data-tour-id="explore-saved-knowledge">
          <header><strong>已收藏知识</strong><span>{knowledgeCards.length} 条 · 由你主动收藏</span></header>
          {knowledgeCards.length ? (
            <ul>{knowledgeCards.slice(0, 6).map((card) => (
              <li key={card.id}>
                <button type="button" onClick={() => void window.electronAPI.navigateBrowser(card.source.url)}>{card.source.title}</button>
                <small>{card.verificationStatus === 'unverified' ? '尚未验证' : card.verificationStatus === 'verified_effective' ? '已验证有效' : '已验证无效'}</small>
              </li>
            ))}</ul>
          ) : <p>还没有收藏。完成一次分析后，可在来源旁点击“收藏”。</p>}
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
