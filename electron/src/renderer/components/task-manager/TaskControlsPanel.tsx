import React from 'react';
import { Wrench, Zap } from 'lucide-react';
import type { HardboardDevice, HardboardRuntimeState } from '../../types';

interface Props {
  buildLabel: string;
  runtimeState: HardboardRuntimeState | null;
  activeProjectName: string | null;
  hasSelectedProject: boolean;
  devices: HardboardDevice[];
  selectedPort: string;
  onRefreshProjects: () => void;
  onSelectProject: () => void;
  onBuild: () => void | Promise<void>;
  onRefreshDevices: () => void;
  onSelectPort: (port: string) => void;
  onFlash: () => void | Promise<void>;
}

// Presentation only: project gates, selected-port authority and Build/Flash execution stay in BrowserPanel.
export default function TaskControlsPanel({ buildLabel, runtimeState, activeProjectName, hasSelectedProject, devices, selectedPort, onRefreshProjects, onSelectProject, onBuild, onRefreshDevices, onSelectPort, onFlash }: Props) {
  const progress = runtimeState?.progress ?? 0;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const runtimeBusy = runtimeState?.status === 'running';
  const buildTone = !hasSelectedProject ? 'needs-input' : runtimeState?.phase === 'build' ? runtimeState.status : 'idle';
  const flashTone = !hasSelectedProject || !selectedPort ? 'needs-input' : runtimeState?.phase === 'flash' ? runtimeState.status : 'idle';

  return (
    <div className="task-manager-compile">
      <div className="compile-workbench-title nes-container is-dark">
        <strong>硬件编译/烧录任务 · {buildLabel}</strong>
        <span>{runtimeState ? `${runtimeState.phase} / ${runtimeState.status}` : 'eventbus idle'}</span>
      </div>
      <div className="compile-control-grid">
        <div className="compile-control-row compile-control-row--build nes-container is-rounded" data-tour-id="task-build-controls">
          <strong className="compile-operation-title"><Wrench aria-hidden="true" /><span>Build<small>编译工程生成固件</small></span></strong>
          <button className="nes-btn compile-refresh-button" type="button" onClick={onRefreshProjects}>刷新工程</button>
          <button className="nes-btn project-select" type="button" onClick={onSelectProject}>{activeProjectName || '选择工作工程'}</button>
          <button className="nes-btn is-warning" type="button" onClick={() => void onBuild()} disabled={!hasSelectedProject || runtimeBusy}>编译</button>
          <span className={`compile-action-status is-${buildTone}`} aria-live="polite">
            {!hasSelectedProject ? '请先选择工作工程' : runtimeState?.phase === 'build' ? `${runtimeState.status} · ${progress}%` : '等待编译'}
          </span>
          <div className="runtime-progress compile-row-progress"><span style={{ width: `${runtimeState?.phase === 'build' ? clampedProgress : 0}%` }} /></div>
        </div>
        <div className="compile-control-row compile-control-row--flash nes-container is-rounded" data-tour-id="task-flash-controls">
          <strong className="compile-operation-title"><Zap aria-hidden="true" /><span>Flash<small>烧录固件到设备</small></span></strong>
          <button className="nes-btn" type="button" onClick={onRefreshDevices}>刷新设备</button>
          <select className="nes-select" value={selectedPort} onChange={(event) => onSelectPort(event.target.value)}>
            <option value="">串口</option>
            {devices.map((device) => <option key={device.port} value={device.port}>{device.port} · {device.label}</option>)}
          </select>
          <button className="nes-btn is-error" type="button" onClick={() => void onFlash()} disabled={!hasSelectedProject || !selectedPort || runtimeBusy}>烧录</button>
          <span className={`compile-action-status is-${flashTone}`} aria-live="polite">
            {!hasSelectedProject ? '请先选择工作工程' : !selectedPort ? '请选择串口' : runtimeState?.phase === 'flash' ? `${runtimeState.status} · ${progress}%` : '等待烧录'}
          </span>
          <div className="runtime-progress compile-row-progress"><span style={{ width: `${runtimeState?.phase === 'flash' ? clampedProgress : 0}%` }} /></div>
        </div>
      </div>
    </div>
  );
}
