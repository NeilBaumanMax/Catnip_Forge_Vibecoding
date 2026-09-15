import React from 'react';
import { FolderOpen, Rocket, Settings2 } from 'lucide-react';
import taskManagerEmptyGuagua from '../../assets/task-manager-empty-guagua-v2.png';
import type { TaskHistoryItem } from './task-history';

interface Props {
  tasks: TaskHistoryItem[];
  clearing: boolean;
  clearFeedback: string;
  statusLabel: (status: TaskHistoryItem['status']) => string;
  projectLabel: (projectDir: string) => string;
  durationLabel: (task: TaskHistoryItem) => string;
  onClear: () => void | Promise<void>;
  onShowLog: (task: TaskHistoryItem) => void;
  onAnalyzeFailure: (task: TaskHistoryItem) => void;
}

// Presentation only: event projection, disk cleanup, log focus and failure analysis stay in BrowserPanel.
export default function TaskHistoryPanel({ tasks, clearing, clearFeedback, statusLabel, projectLabel, durationLabel, onClear, onShowLog, onAnalyzeFailure }: Props) {
  return (
    <section className="task-history-panel nes-container is-rounded" data-tour-id="task-results">
      <header className="task-history-header">
        <strong>最近任务与结果</strong>
        <div className="task-history-header-actions">
          <span className={clearFeedback ? 'runtime-clear-feedback runtime-clear-feedback--success' : ''} aria-live="polite">
            {clearing ? '正在清除本地记录…' : clearFeedback || (tasks.length ? `${tasks.length} 条 Build / Flash 记录` : '等待任务')}
          </span>
          <button className="nes-btn clear-history-button" type="button" disabled={clearing} onClick={() => void onClear()}>{clearing ? '清除中...' : '清除记录'}</button>
        </div>
      </header>
      <div className="task-history-table">
        <div className="task-history-table-head">
          <span>状态</span><span>操作</span><span>工程</span><span>端口</span><span>开始时间</span><span>耗时</span><span>退出码</span><span>日志</span>
        </div>
        {tasks.length ? tasks.map((task) => (
          <div key={task.taskId} className={`task-history-row task-history-row--${task.status}`}>
            <span><i className={`task-status-badge task-status-badge--${task.status}`}>{statusLabel(task.status)}</i></span>
            <strong>{task.kind === 'hardboard.build' ? 'Build' : 'Flash'}</strong>
            <code title={task.projectDir}>{projectLabel(task.projectDir)}</code>
            <span>{task.port || '—'}</span>
            <span>{new Date(task.startedAt).toLocaleTimeString('zh-CN', { hour12: false })}</span>
            <span>{durationLabel(task)}</span>
            <span>{task.exitCode ?? (task.status === 'failed' ? 'error' : '—')}</span>
            <div className="task-history-row-actions">
              <button className="nes-btn" type="button" onClick={() => onShowLog(task)}>查看</button>
              {task.status === 'failed' ? <button className="nes-btn is-warning" data-tour-id="task-analyze-problem" type="button" onClick={() => onAnalyzeFailure(task)}>分析</button> : null}
            </div>
          </div>
        )) : (
          <div className="task-history-empty">
            <img src={taskManagerEmptyGuagua} alt="学院呱呱等待新的编译或烧录任务" />
            <strong>暂无编译或烧录记录</strong>
            <p>选择工程并执行 Build / Flash，结果会显示在这里。</p>
            <div className="task-empty-steps" aria-label="开始硬件任务的三个步骤">
              <span><FolderOpen aria-hidden="true" /><b>1 选择工程</b><small>刷新工程并选择目标项目</small></span>
              <span><Settings2 aria-hidden="true" /><b>2 配置与编译</b><small>根据需要调整配置并开始编译</small></span>
              <span><Rocket aria-hidden="true" /><b>3 选择串口并烧录</b><small>连接设备并执行烧录</small></span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
