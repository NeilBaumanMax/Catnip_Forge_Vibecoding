import React, { useEffect, useState } from 'react';
import { RadioTower, RefreshCw } from 'lucide-react';
import type { RadioProcessSnapshot } from '../types';

export default function RadioPanel() {
  const [status, setStatus] = useState<RadioProcessSnapshot>({ state: 'starting', pid: null, url: null, message: '正在启动电台服务…', xiaozhiEnabled: false });

  const start = async () => setStatus(await window.electronAPI.startRadio());
  useEffect(() => { void start(); }, []);

  if (status.state !== 'ready' || !status.url) {
    return <section className="radio-workspace-state" aria-live="polite">
      <RadioTower aria-hidden="true" />
      <h2>Forge 电台</h2>
      <p>{status.message}</p>
      {status.state === 'error' ? <button type="button" onClick={() => void start()}><RefreshCw aria-hidden="true" />重新启动</button> : null}
    </section>;
  }

  return <section className="radio-workspace" data-tour-id="panel-radio">
    <iframe
      key={status.url}
      src={`${status.url}?embedded=1`}
      title="Forge 电台"
      allow="autoplay"
      referrerPolicy="no-referrer"
    />
    <div className="radio-service-chip" title={`Python PID ${status.pid ?? 'unknown'}`}>
      <span />{status.xiaozhiEnabled ? '电台与小智已就绪' : '电台已就绪 · 小智待配置'}
    </div>
  </section>;
}
