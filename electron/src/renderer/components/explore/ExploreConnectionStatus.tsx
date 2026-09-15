import React from 'react';
import type { ExploreZhihuConnectionStatus } from '../../../common/explore';

interface Props {
  connection: ExploreZhihuConnectionStatus | null;
  checking: boolean;
  installing: boolean;
  starting: boolean;
  onInstall: () => void | Promise<void>;
  onConnect: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

// Presentation only: official CLI setup, Secret handling and polling stay in the parent/Main boundary.
export default function ExploreConnectionStatus({ connection, checking, installing, starting, onInstall, onConnect, onRefresh }: Props) {
  const state = connection?.state || 'checking';
  const needsAction = state === 'needs_secret' || state === 'needs_install' || state === 'error';

  return (
    <section
      className={`explore-connection-status explore-connection-status--${state}${needsAction ? ' is-actionable' : ''}`}
      data-tour-id="explore-zhihu-connection"
      role="status"
    >
      <span className="explore-connection-dot" aria-hidden="true" />
      <div className="explore-connection-copy">
        <span>知乎开放平台</span>
        <strong>{checking
          ? '正在检查连接…'
          : installing
            ? '正在从知乎官方下载并校验 CLI…'
            : starting
              ? '正在等待 Access Secret 安全窗口显示…'
              : connection?.message || '需要先连接知乎开放平台'}</strong>
        {needsAction ? <p>Access Secret 只交给知乎官方连接工具，不会出现在页面、聊天或日志中。</p> : null}
      </div>
      <div className="explore-connection-actions">
        {connection?.state === 'needs_install' ? (
          <button className="explore-primary-action" type="button" onClick={() => void onInstall()} disabled={installing}>
            {installing ? '正在下载并校验 CLI…' : '安装连接组件并继续'}
          </button>
        ) : null}
        {connection?.state === 'needs_secret' ? (
          <button className="explore-primary-action" type="button" onClick={() => void onConnect()} disabled={starting}>
            {starting ? '正在打开安全窗口…' : '配置 Access Secret'}
          </button>
        ) : null}
        <button className="explore-secondary-action" type="button" onClick={() => void onRefresh()} disabled={checking}>
          {checking ? '检查中…' : '重新检查'}
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
}
