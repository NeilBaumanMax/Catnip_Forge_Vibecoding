import React from 'react';
import type { ExploreAnalysisResult, IdeaResult, SourceEvidence } from '../../../common/explore';

type IdeaAnalysisResult = Extract<ExploreAnalysisResult, { mode: 'idea' }>;
type DiagnosisAnalysisResult = Extract<ExploreAnalysisResult, { mode: 'diagnosis' }>;
type SourceListRenderer = (sources: SourceEvidence[], label: string) => React.ReactNode;

interface IdeaProps {
  result: IdeaAnalysisResult;
  selectedIdeaId: string;
  planPending: boolean;
  sourceList: SourceListRenderer;
  onBeginPlan: (idea: IdeaResult) => Promise<void>;
}

interface DiagnosisProps {
  result: DiagnosisAnalysisResult;
  planPending: boolean;
  sourceList: SourceListRenderer;
  onBeginPlan: () => Promise<void>;
}

export function ExploreIdeaResults({ result, selectedIdeaId, planPending, sourceList, onBeginPlan }: IdeaProps) {
  return (
    <section className="explore-analysis-result explore-idea-results" aria-labelledby="explore-results-title">
      <header className="explore-section-header">
        <div><span className="explore-section-kicker">CATNIP SYNTHESIS</span><h3 id="explore-results-title">可实现方向</h3></div>
        <span>{result.ideas.length} 个候选 · 选择后只生成计划</span>
      </header>
      <div className="explore-idea-grid">
        {result.ideas.map((idea, index) => (
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
              <button type="button" className="explore-generate-plan" onClick={() => void onBeginPlan(idea)} disabled={planPending}>
                {planPending && selectedIdeaId === idea.id ? '正在生成计划…' : '用这个方向生成计划'}
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ExploreDiagnosisResults({ result, planPending, sourceList, onBeginPlan }: DiagnosisProps) {
  return (
    <section className="explore-analysis-result explore-diagnosis-report" aria-labelledby="explore-diagnosis-title">
      <header className="explore-report-header">
        <span className="explore-section-kicker">INVESTIGATION REPORT</span>
        <h3 id="explore-diagnosis-title">分析结果</h3>
        <p className="explore-reading-copy">{result.diagnosis.problem}</p>
      </header>
      {result.diagnosis.sourceConflicts.length ? (
        <aside className="explore-conflict-notice" role="note" aria-labelledby="explore-conflicts-title">
          <div>
            <span aria-hidden="true">!</span>
            <div><strong id="explore-conflicts-title">需要注意的来源分歧</strong><small>以下冲突需要通过工程或实机证据继续验证。</small></div>
          </div>
          <ul>{result.diagnosis.sourceConflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul>
        </aside>
      ) : null}
      <ol className="explore-hypothesis-list">
        {result.diagnosis.hypotheses.map((hypothesis, index) => (
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
      <button type="button" className="explore-generate-plan" onClick={() => void onBeginPlan()} disabled={planPending}>
        {planPending ? '正在生成计划…' : '为这份调查生成计划'}
      </button>
    </section>
  );
}
