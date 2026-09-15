import React from 'react';
import { BookMarked, Star } from 'lucide-react';
import type { KnowledgeCard } from '../../../common/explore';

interface Props {
  knowledgeCards: KnowledgeCard[];
  expandedKnowledgeId: string;
  verificationCardId: string;
  verificationSummary: string;
  verificationEvidence: string;
  verificationSaving: boolean;
  verificationLabel: (status: KnowledgeCard['verificationStatus']) => string;
  openSource: (url: string) => Promise<void>;
  setExpandedKnowledgeId: React.Dispatch<React.SetStateAction<string>>;
  beginVerification: (cardId: string) => void;
  deleteKnowledgeCard: (card: KnowledgeCard) => Promise<void>;
  setVerificationSummary: (summary: string) => void;
  setVerificationEvidence: (evidence: string) => void;
  saveVerification: (status: 'verified_effective' | 'verified_ineffective') => Promise<void>;
  setVerificationCardId: (cardId: string) => void;
}

// Controlled presentation only; the parent owns knowledge persistence and selection state.
export default function ExploreKnowledgePreview({
  knowledgeCards, expandedKnowledgeId, verificationCardId,
  verificationSummary, verificationEvidence, verificationSaving,
  verificationLabel, openSource, setExpandedKnowledgeId,
  beginVerification, deleteKnowledgeCard, setVerificationSummary,
  setVerificationEvidence, saveVerification, setVerificationCardId,
}: Props) {
  return (
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
  );
}
