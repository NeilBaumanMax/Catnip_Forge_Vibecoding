import React from 'react';
import { History, PenLine, SearchCheck, Sparkles } from 'lucide-react';
import type { ExploreWorkSessionSummary, ExploreWorkStatus } from '../../../common/project-session';

interface Props {
  workSessions: ExploreWorkSessionSummary[];
  renamingSessionId: string;
  renameDraft: string;
  renameSaving: boolean;
  openWorkSession: (mode: ExploreWorkSessionSummary['mode'], id?: string, forceNew?: boolean) => Promise<void>;
  renameWorkSession: (event: React.FormEvent, session: ExploreWorkSessionSummary) => Promise<void>;
  deleteWorkSession: (session: ExploreWorkSessionSummary) => Promise<void>;
  setRenamingSessionId: (id: string) => void;
  setRenameDraft: (title: string) => void;
  workStatusLabel: (status: ExploreWorkStatus) => string;
}

// Controlled presentation only; the parent owns session lifecycle and persistence.
export default function ExploreSessionHistory({
  workSessions, renamingSessionId, renameDraft, renameSaving,
  openWorkSession, renameWorkSession, deleteWorkSession,
  setRenamingSessionId, setRenameDraft, workStatusLabel,
}: Props) {
  return (
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
              {renamingSessionId === session.id ? (
                <form className="explore-session-rename" onSubmit={(event) => void renameWorkSession(event, session)}>
                  <label htmlFor={'explore-session-name-' + session.id}>记录名称</label>
                  <input
                    id={'explore-session-name-' + session.id}
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <button type="submit" disabled={renameSaving}>保存</button>
                  <button type="button" disabled={renameSaving} onClick={() => { setRenamingSessionId(''); setRenameDraft(''); }}>取消</button>
                </form>
              ) : (
                <>
                  <button className="explore-session-open" type="button" data-explore-session-id={session.id} onClick={() => void openWorkSession(session.mode, session.id)}>
                    <span className={'explore-session-kind is-' + session.mode}>{session.mode === 'idea' ? <Sparkles aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}{session.mode === 'idea' ? '灵感' : '问题'}</span>
                    <span><strong>{session.title}</strong><small>{new Date(session.updatedAt).toLocaleString()} · {workStatusLabel(session.status)}</small></span>
                    <span aria-hidden="true">→</span>
                  </button>
                  <div className="explore-session-actions">
                    <button className="explore-session-rename-action" type="button" onClick={() => { setRenamingSessionId(session.id); setRenameDraft(session.title); }} aria-label={'重命名探索记录：' + session.title}><PenLine aria-hidden="true" />重命名</button>
                    <button className="explore-session-delete" type="button" onClick={() => void deleteWorkSession(session)} aria-label={'删除探索记录：' + session.title}>删除</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="explore-history-empty">当前工程还没有探索记录。进入找灵感或解问题后会自动创建并保存。</p>}
    </section>
  );
}
