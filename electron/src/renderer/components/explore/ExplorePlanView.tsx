import React from 'react';
import type { ExploreAnalysisResult, HandoffContext } from '../../../common/explore';
import type { ExploreHandoffArtifact } from '../../../common/project-session';

type PlanResult = Extract<ExploreAnalysisResult, { mode: 'plan' }>;

interface Props {
  planPending: boolean;
  planResult: PlanResult | null;
  planHandoff: HandoffContext | null;
  requestText: string;
  handoffArtifact: ExploreHandoffArtifact | null;
  onViewHandoff: () => Promise<void>;
}

// Read-only presentation. Artifact I/O and execution confirmation remain outside this component.
export default function ExplorePlanView({ planPending, planResult, planHandoff, requestText, handoffArtifact, onViewHandoff }: Props) {
  return (
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
              onClick={() => void onViewHandoff()}
            >
              查看交接材料
            </button>
            <small>这里只生成和保存材料，不会修改业务源码或操作硬件。</small>
          </div>
        </>
      ) : null}
    </section>
  );
}
