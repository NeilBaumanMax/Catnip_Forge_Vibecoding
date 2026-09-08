import React, { useEffect, useMemo, useState } from 'react';
import type { ExploreContextItem, ExploreRequest, ExploreZhihuConnectionStatus } from '../../common/explore';

type ExploreView = 'home' | 'idea' | 'diagnosis';

interface Props {
  currentProject: string;
  hardwareSummary: string;
  runtimeSummary: string;
}

interface ContextOption {
  id: string;
  kind: ExploreContextItem['kind'];
  label: string;
  summary: string;
  available: boolean;
}

export default function ExplorePanel({ currentProject, hardwareSummary, runtimeSummary }: Props) {
  const [view, setView] = useState<ExploreView>('home');
  const [goal, setGoal] = useState('');
  const [problem, setProblem] = useState('');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState<ExploreZhihuConnectionStatus | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [startingConnection, setStartingConnection] = useState(false);

  const contextOptions = useMemo<ContextOption[]>(() => [
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
  }, []);

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
    if (next === 'diagnosis') {
      setSelectedContextIds(contextOptions.filter((item) => item.available).map((item) => item.id));
    }
  };

  const toggleContext = (id: string) => {
    setSelectedContextIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const prepareRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const request: ExploreRequest = {
      mode: view === 'idea' ? 'idea' : 'diagnosis',
      goal: (view === 'idea' ? goal : problem).trim(),
      context: {
        items: contextOptions.map((item) => ({
          id: item.id,
          kind: item.kind,
          label: item.label,
          summary: item.summary,
          selected: view === 'idea' ? item.available && item.id !== 'recent-runtime' : selectedContextIds.includes(item.id),
        })),
      },
    };
    try {
      const prepared = await window.electronAPI.prepareExploreRequest(request);
      if (prepared.state === 'ready') {
        setNotice(`${prepared.message} 当前 Agent 检索编排尚未恢复，本次没有发起搜索。`);
      } else {
        setNotice(`${prepared.message} 本次没有发起搜索。`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法准备探索请求');
    }
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
          <fieldset className="explore-context-picker">
            <legend>本次分析 Context</legend>
            <p>已自动选择当前可用证据。取消勾选后，该项不会进入分析。</p>
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
        )}

        <div className="explore-submit-row">
          <button className="nes-btn is-primary" type="submit" disabled={!(isIdea ? goal.trim() : problem.trim())}>
            {isIdea ? '形成可实现的 Idea' : '分析当前问题'}
          </button>
          <span>分析阶段不会修改文件、Build、Flash 或操作串口。</span>
        </div>
        {notice ? <div className="explore-connection-notice" role="status">{notice}</div> : null}
      </form>
    </section>
  );
}
