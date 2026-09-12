import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Folder, FolderOpen, PackageCheck, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react';
import type { ManagedSkillDetail, ManagedSkillSummary, SkillManagerSnapshot, WorkbenchItem, WorkbenchOverview, WorkbenchSection } from '../types';
import cosmicBackground from '../assets/catnip-cosmic-shell.jpg';
import catnipAssistant from '../assets/catnip-assistant.webp';

interface Props {
  overview: WorkbenchOverview | null;
  onRefresh: () => void;
  onOpenItem: (targetPath: string) => void;
  onEditItem: (item: WorkbenchItem) => void;
}

function formatTime(value: number | null): string {
  if (!value) return '未知时间';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(value: number | null): string {
  if (value == null) return '目录';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isBrowserRunnable(item: WorkbenchItem): boolean {
  return item.kind === 'file' && /\.(html?|svg)$/i.test(item.name);
}

function isEditable(item: WorkbenchItem): boolean {
  return item.kind === 'file' && /(?:CMakeLists\.txt|\.(?:c|h|cpp|hpp|S|md|mdx|json|jsonc|txt|yaml|yml|toml|js|mjs|cjs|ts|py|sh|ps1|cmd|bat))$/i.test(item.name);
}

const EMPTY_SKILL: ManagedSkillDetail = {
  id: '', name: '', description: '', body: '# 使用说明\n\n请描述 Agent 应遵循的步骤、边界和验收标准。',
  sourcePath: '', folderPath: '', sourceFormat: 'standard', supportFileCount: 0, updatedAt: 0, deployed: false, command: '',
};

function SkillManager({ onOpenFolder, onRefreshWorkbench }: { onOpenFolder: (folderPath: string) => void; onRefreshWorkbench: () => void }) {
  const [snapshot, setSnapshot] = useState<SkillManagerSnapshot | null>(null);
  const [editor, setEditor] = useState<ManagedSkillDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState<'all' | 'deployed' | 'pending' | 'standard'>('all');
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'updated' | 'name'>('updated');

  const refresh = useCallback(async () => {
    const result = await window.electronAPI?.listManagedSkills?.();
    if (result?.ok) setSnapshot({ skills: result.skills, status: result.status });
    else setFeedback(result?.error || 'Skill 仓库读取失败');
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
    return [...(snapshot?.skills || [])]
      .filter((skill) => filter === 'all'
        || (filter === 'deployed' && skill.deployed)
        || (filter === 'pending' && !skill.deployed)
        || (filter === 'standard' && skill.sourceFormat === 'standard'))
      .filter((skill) => !normalizedQuery
        || `${skill.name} ${skill.id} ${skill.description} ${skill.command}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery))
      .sort((left, right) => sortOrder === 'name'
        ? left.name.localeCompare(right.name, 'zh-CN')
        : right.updatedAt - left.updatedAt);
  }, [filter, query, snapshot?.skills, sortOrder]);

  const editSkill = async (skill: ManagedSkillSummary) => {
    const result = await window.electronAPI?.getManagedSkill?.(skill.id);
    if (result?.ok && result.skill) setEditor(result.skill);
    else setFeedback(result?.error || 'Skill 读取失败');
  };

  const saveSkill = async () => {
    if (!editor) return;
    setBusy(true);
    const result = await window.electronAPI?.saveManagedSkill?.({
      id: editor.id, name: editor.name, description: editor.description, body: editor.body,
      originalId: editor.sourcePath ? editor.id : undefined,
    });
    setBusy(false);
    if (!result?.ok) {
      setFeedback(result?.error || 'Skill 保存失败');
      return;
    }
    if (result.snapshot) setSnapshot(result.snapshot);
    setEditor(null);
    setFeedback('已保存并同步到 Agent 工作区');
    onRefreshWorkbench();
  };

  const deleteSkill = async (skill: ManagedSkillSummary) => {
    if (!window.confirm(`确定删除 Skill“${skill.name}”吗？此操作会同时撤销 Agent 工作区中的部署。`)) return;
    setBusy(true);
    const result = await window.electronAPI?.deleteManagedSkill?.(skill.id);
    setBusy(false);
    if (result?.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setFeedback('Skill 已删除并撤销部署');
      onRefreshWorkbench();
    } else setFeedback(result?.error || 'Skill 删除失败');
  };

  const syncSkills = async () => {
    setBusy(true);
    const result = await window.electronAPI?.syncManagedSkills?.();
    setBusy(false);
    if (result?.ok) {
      setSnapshot({ skills: result.skills, status: result.status });
      setFeedback(`同步完成：${result.status.deployedCount} 个 Skill 可用`);
    } else setFeedback(result?.error || '同步失败');
  };

  return (
    <section className="workspace-section skill-manager nes-container is-rounded">
      <div className="workspace-section-header skill-manager-header">
        <div className="skill-manager-heading"><div><span className="skill-manager-heading-icon" aria-hidden="true"><Sparkles /></span><div><h3>Skills</h3><p>管理 Agent Skills，保存后自动同步到 Agent 工作区。</p></div></div>{snapshot ? <span>{snapshot.status.skillCount} 个 Skill · {snapshot.status.deployedCount} 个已启用</span> : null}</div>
        <div className="skill-manager-actions" data-tour-id="skill-manager-actions">
          <button className="nes-btn" type="button" onClick={() => snapshot && onOpenFolder(snapshot.status.sourceDir)}><FolderOpen aria-hidden="true" />打开目录</button>
          <button className="nes-btn" type="button" disabled={busy} onClick={() => void syncSkills()}><RefreshCw aria-hidden="true" />立即同步</button>
          <button className="nes-btn is-primary" type="button" disabled={!snapshot?.status.writable} onClick={() => setEditor({ ...EMPTY_SKILL })}><Plus aria-hidden="true" />新建 Skill</button>
        </div>
        {feedback ? <div className="skill-manager-feedback" aria-live="polite">{feedback}</div> : null}
      </div>
      <div className="skill-manager-toolbar">
        <div className="skill-manager-filters" role="group" aria-label="筛选 Skills">
          {([
            ['all', '全部', snapshot?.status.skillCount || 0],
            ['deployed', '已启用', snapshot?.status.deployedCount || 0],
            ['pending', '未启用', (snapshot?.status.skillCount || 0) - (snapshot?.status.deployedCount || 0)],
            ['standard', '标准格式', snapshot?.skills.filter((skill) => skill.sourceFormat === 'standard').length || 0],
          ] as const).map(([id, label, count]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label} <span>{count}</span></button>)}
        </div>
        <label className="skill-manager-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skill…" aria-label="搜索 Skill" /></label>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'updated' | 'name')} aria-label="Skill 排序">
          <option value="updated">最近更新</option>
          <option value="name">名称排序</option>
        </select>
      </div>
      <div className="skill-manager-list">
        {visibleSkills.length ? visibleSkills.map((skill) => (
          <article className="skill-manager-row" key={skill.id}>
            <div className={`skill-manager-state${skill.deployed ? ' is-deployed' : ''}`} title={skill.deployed ? 'Agent 已可用' : '等待同步'}><PackageCheck aria-hidden="true" /></div>
            <div className="skill-manager-copy">
              <div><strong>{skill.name}</strong><code>{skill.id}</code></div>
              <p>{skill.description}{skill.supportFileCount ? ` · ${skill.supportFileCount} 个支持文件` : ''}</p>
            </div>
            <div className="skill-manager-badges"><span>{skill.sourceFormat === 'standard' ? '标准' : '兼容'}</span>{skill.supportFileCount ? <em>支持文件</em> : null}</div>
            <span className={`skill-manager-deployment${skill.deployed ? ' is-deployed' : ''}`}>{skill.deployed ? '已启用' : '待同步'}</span>
            <div className="skill-manager-row-actions">
              <button type="button" className="nes-btn" onClick={() => onOpenFolder(skill.folderPath)}><FolderOpen aria-hidden="true" />打开目录</button>
              <button type="button" className="nes-btn" onClick={() => void editSkill(skill)}><Pencil aria-hidden="true" />编辑</button>
              <button type="button" className="nes-btn is-error" disabled={busy} onClick={() => void deleteSkill(skill)}><Trash2 aria-hidden="true" />删除</button>
            </div>
          </article>
        )) : <div className="workspace-empty">{snapshot?.skills.length ? '没有符合当前筛选条件的 Skill。' : '暂无 Skill，可点击“新建 Skill”添加。'}</div>}
      </div>
      {editor ? (
        <div className="skill-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditor(null)}>
          <form className="skill-editor" onSubmit={(event) => { event.preventDefault(); void saveSkill(); }}>
            <div className="skill-editor-title"><strong>{editor.sourcePath ? '编辑 Skill' : '新建 Skill'}</strong><button type="button" onClick={() => setEditor(null)} aria-label="关闭">×</button></div>
            <label>Skill ID<input className="nes-input" value={editor.id} disabled={Boolean(editor.sourcePath)} placeholder="例如 espidf-helper" onChange={(event) => setEditor({ ...editor, id: event.target.value.toLowerCase() })} /></label>
            <label>显示名称<input className="nes-input" value={editor.name} placeholder="简短、明确的名称" onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
            <label>触发描述<textarea className="nes-textarea skill-description" value={editor.description} placeholder="说明何时应使用该 Skill" onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
            <label>Skill 指令<textarea className="nes-textarea skill-body" value={editor.body} onChange={(event) => setEditor({ ...editor, body: event.target.value })} /></label>
            <div className="skill-editor-actions"><button className="nes-btn" type="button" onClick={() => setEditor(null)}>取消</button><button className="nes-btn is-primary" type="submit" disabled={busy}>{busy ? '保存中…' : '保存并同步'}</button></div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function renderResourceSection(
  section: WorkbenchSection,
  onOpenItem: (item: WorkbenchItem) => void,
  onOpenFolder: (folderPath: string) => void,
  onRefresh: () => void,
) {
  const contentId = `workspace-resource-${section.id}`;
  return (
    <section
      key={section.id}
      className="workspace-section workspace-resource-section is-expanded nes-container is-rounded"
      data-workbench-resource={section.id}
    >
      <div className="workspace-section-header workspace-resource-header">
        <div
          className="workspace-resource-toggle"
          aria-expanded="true"
          aria-controls={contentId}
        >
          <span className="workspace-resource-chevron" aria-hidden="true"><ChevronDown /></span>
          <span className="workspace-resource-copy">
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </span>
          <span className="workspace-resource-count">{section.items.length} 项</span>
        </div>
        <div className="workspace-section-tools workspace-resource-tools">
          <code>{section.folderPath}</code>
          <div className="workspace-resource-actions">
            <button className="nes-btn workspace-sync-folder" type="button" onClick={onRefresh}><RefreshCw aria-hidden="true" />立即同步</button>
            <button className="nes-btn workspace-open-folder" type="button" onClick={() => onOpenFolder(section.folderPath)}><FolderOpen aria-hidden="true" />打开目录</button>
          </div>
        </div>
      </div>
      <div className="workspace-items" id={contentId}>
        <div className="workspace-items-heading" aria-hidden="true"><span>名称</span><span>类型</span><span>修改时间</span></div>
        {section.items.length ? section.items.map((item: WorkbenchItem) => (
          <button
            key={item.path}
            type="button"
            className="workspace-item workspace-item-button nes-container is-rounded"
            onClick={() => onOpenItem(item)}
            title={`打开 ${item.path}`}
            data-workbench-path={item.path}
            data-workbench-kind={item.kind}
          >
            <div className="workspace-item-kind">{item.kind === 'dir' ? <Folder aria-hidden="true" /> : isBrowserRunnable(item) ? 'RUN' : isEditable(item) ? 'EDIT' : 'FILE'}</div>
            <div className="workspace-item-body">
              <strong title={item.summary || item.label || item.name}>{item.summary || item.label || item.name}</strong>
              <span title={item.path}>{item.kind === 'dir' ? '工程文件夹' : item.detail || item.path}</span>
              {item.sourceUrl ? <em title={item.sourceUrl}>{item.sourceUrl}</em> : null}
            </div>
            <div className="workspace-item-meta">
              <span>{item.kind === 'dir' ? '文件夹' : formatSize(item.size)}</span>
              <span>{formatTime(item.updatedAt)}</span>
            </div>
          </button>
        )) : (
          <div className="workspace-empty">{section.emptyText}</div>
        )}
      </div>
    </section>
  );
}

export default function WorkspacePanel({ overview, onRefresh, onOpenItem, onEditItem }: Props) {
  const [folderFeedback, setFolderFeedback] = useState<{ message: string; detail: string; tone: 'pending' | 'success' | 'error' } | null>(null);

  const handleOpenFolder = async (folderPath: string) => {
    setFolderFeedback({ message: '正在打开目录…', detail: folderPath, tone: 'pending' });
    const result = await window.electronAPI?.openWorkbenchFolder?.(folderPath);
    setFolderFeedback(result?.ok
      ? { message: '已在资源管理器中打开', detail: result.path || folderPath, tone: 'success' }
      : { message: '目录打开失败', detail: result?.error || '目录不可用', tone: 'error' });
  };

  const handleOpenItem = async (item: WorkbenchItem) => {
    if (window.electronAPI?.isWorkbenchSmokeTest) {
      onOpenItem(item.path);
      return;
    }

    if (item.kind === 'dir' || isBrowserRunnable(item) || !isEditable(item)) {
      onOpenItem(item.path);
      return;
    }
    onEditItem(item);
  };

  const visibleSections = overview?.sections.filter((section) => section.id !== 'agent-generated') || [];
  const skillSection = visibleSections.find((section) => section.id === 'skills');
  const resourceSections = visibleSections.filter((section) => section.id !== 'skills');

  return (
    <div className="workspace-panel">
      <div className="workspace-hero">
        <img className="workspace-hero-background" src={cosmicBackground} alt="" aria-hidden="true" />
        <div className="workspace-hero-copy">
          <span className="workspace-eyebrow">Skill Repository</span>
          <h2>Skills 仓库</h2>
          <p>优先管理 Agent Skills。Skill 保存后会自动部署到 Agent 工作区，并出现在左侧对话输入区的 Skills 选择器中；硬件工程和参考代码在下方始终展开。</p>
        </div>
        <div className="workspace-hero-motto" aria-hidden="true">Build with Curiosity<br />Create the Future!</div>
        <img className="workspace-hero-mascot" src={catnipAssistant} alt="" aria-hidden="true" />
        {folderFeedback ? (
          <span
            className={`workspace-folder-feedback is-${folderFeedback.tone}`}
            aria-live="polite"
            title={folderFeedback.detail}
          >
            {folderFeedback.message}
          </span>
        ) : null}
      </div>
      <div className="workspace-grid">
        {skillSection ? <SkillManager key={skillSection.id} onOpenFolder={(folderPath) => void handleOpenFolder(folderPath)} onRefreshWorkbench={onRefresh} /> : null}
        {resourceSections.map((section) => renderResourceSection(
          section,
          handleOpenItem,
          (folderPath) => void handleOpenFolder(folderPath),
          onRefresh,
        ))}
      </div>
    </div>
  );
}
