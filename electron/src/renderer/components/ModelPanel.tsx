import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Cpu, KeyRound, Plus, RefreshCw, Save, ShieldCheck, Trash2, WandSparkles } from 'lucide-react';
import type { ModelConfigState, ModelManagementSnapshot, ModelSetupMode, ProviderConfig } from '../../common/model-config';

function cloneConfig(value: ModelConfigState): ModelConfigState {
  return structuredClone(value);
}

function nextId(): string {
  return `provider-${crypto.randomUUID().slice(0, 8)}`;
}

function createCustomProvider(): ProviderConfig {
  const id = nextId();
  return {
    id,
    name: '新的 Claude Code 供应商',
    baseUrl: 'https://api.example.com',
    protocols: ['anthropic-compatible'],
    enabled: true,
    builtIn: false,
    credentialId: id,
    claudeCode: { authField: 'ANTHROPIC_AUTH_TOKEN', primaryModel: 'model-id' },
  };
}

interface Props {
  startInCustomSetup?: boolean;
  onReturnToStartupSetup?: () => void;
}

export default function ModelPanel({ startInCustomSetup = false, onReturnToStartupSetup }: Props) {
  const [snapshot, setSnapshot] = useState<ModelManagementSnapshot | null>(null);
  const [draft, setDraft] = useState<ModelConfigState | null>(null);
  const [providerId, setProviderId] = useState('');
  const [setupMode, setSetupMode] = useState<ModelSetupMode | ''>('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('正在读取 Claude Code 配置…');

  const load = async () => {
    setBusy(true);
    try {
      const value = await window.electronAPI.listModels();
      setSnapshot(value);
      const existingCustom = value.config.providers.find((item) => item.claudeCode && !item.builtIn);
      const newCustom = !value.setupComplete && startInCustomSetup && !existingCustom ? createCustomProvider() : null;
      const nextConfig = newCustom
        ? { ...cloneConfig(value.config), setupMode: 'custom' as const, providers: [...value.config.providers, newCustom] }
        : cloneConfig(value.config);
      setDraft(nextConfig);
      setSetupMode(value.setupComplete ? '' : startInCustomSetup ? 'custom' : value.config.setupMode || '');
      const providers = value.config.providers.filter((item) => item.claudeCode);
      setProviderId((current) => newCustom?.id || existingCustom?.id || (providers.some((item) => item.id === current) ? current : value.config.activeClaudeProviderId || providers[0]?.id || ''));
      setMessage(value.setupComplete ? 'Claude Code 供应商配置已同步' : startInCustomSetup ? '填写供应商地址和模型名称，保存后配置 API Key 并启用' : '请选择首次配置方式');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取模型配置');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [startInCustomSetup]);

  const claudeProviders = useMemo(() => draft?.providers.filter((item) => item.claudeCode) ?? [], [draft]);
  const provider = draft?.providers.find((item) => item.id === providerId) ?? null;
  const credential = snapshot?.credentials.find((item) => item.providerId === providerId);
  const qwenCredential = snapshot?.credentials.find((item) => item.providerId === 'qwen');
  const providerPersisted = snapshot?.config.providers.some((item) => item.id === providerId) === true;
  const firstRun = snapshot ? !snapshot.setupComplete : true;

  const updateProvider = (patch: Partial<ProviderConfig>) => {
    if (!draft || !provider) return;
    setDraft({ ...draft, providers: draft.providers.map((item) => item.id === provider.id ? { ...item, ...patch } : item) });
  };

  const saveDraft = async (mode: ModelSetupMode | '' = setupMode): Promise<ModelManagementSnapshot | null> => {
    if (!draft || !snapshot) return null;
    const config = mode ? { ...draft, setupMode: mode } : draft;
    const value = await window.electronAPI.saveModels(config, snapshot.config.revision);
    setSnapshot(value);
    setDraft(cloneConfig(value.config));
    window.dispatchEvent(new Event('catnip:model-config-changed'));
    return value;
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveDraft();
      setMessage('供应商配置已保存；当前供应商的改动会用于下一次任务');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重新载入');
    } finally {
      setBusy(false);
    }
  };

  const configureCredential = async (targetProviderId = providerId) => {
    if (!targetProviderId) return;
    setBusy(true);
    setMessage('请在原生安全窗口中输入 API Key');
    try {
      const result = await window.electronAPI.configureModelCredential(targetProviderId);
      setSnapshot(result.snapshot);
      setDraft(cloneConfig(result.snapshot.config));
      setMessage(result.outcome === 'submitted' ? 'API Key 已由 Windows 加密保存' : '已取消，原凭据未改变');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'API Key 配置失败');
    } finally {
      setBusy(false);
    }
  };

  const activate = async (targetProviderId = providerId, mode: ModelSetupMode | '' = setupMode) => {
    if (!targetProviderId || !snapshot) return;
    setBusy(true);
    try {
      const saved = await saveDraft(mode);
      if (!saved) return;
      const value = await window.electronAPI.activateClaudeProvider(targetProviderId, saved.config.revision, mode || undefined);
      setSnapshot(value);
      setDraft(cloneConfig(value.config));
      setSetupMode('');
      setProviderId(targetProviderId);
      window.dispatchEvent(new Event('catnip:model-config-changed'));
      if (firstRun) {
        setMessage('配置完成，正在重启；重新打开后请选择工作区文件夹…');
        await window.electronAPI.restartAfterModelSetup();
        return;
      }
      window.dispatchEvent(new Event('catnip:model-setup-complete'));
      setMessage(`已启用 ${value.config.providers.find((item) => item.id === targetProviderId)?.name || '供应商'}；Agent、找灵感和解问题的下一次任务都会使用它`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '启用失败');
    } finally {
      setBusy(false);
    }
  };

  const deleteCredential = async () => {
    if (!provider || !window.confirm(`确定清除 ${provider.name} 的本机 API Key 吗？`)) return;
    setBusy(true);
    try {
      const value = await window.electronAPI.deleteModelCredential(provider.id);
      setSnapshot(value);
      setMessage('本机 API Key 已清除；该供应商不能启动新任务');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'API Key 清除失败');
    } finally {
      setBusy(false);
    }
  };

  const addProvider = () => {
    if (!draft) return;
    const nextProvider = createCustomProvider();
    setDraft({
      ...draft,
      setupMode: 'custom',
      providers: [...draft.providers, nextProvider],
    });
    setSetupMode('custom');
    setProviderId(nextProvider.id);
    setMessage('填写 Claude Code compatible 地址和模型名，然后保存并配置 API Key');
  };

  const deleteProvider = () => {
    if (!draft || !provider || provider.builtIn) return;
    if (draft.activeClaudeProviderId === provider.id) {
      setMessage('当前正在使用这个供应商，请先启用另一个供应商');
      return;
    }
    if (credential?.configured) {
      setMessage('请先清除该供应商的本机 API Key');
      return;
    }
    setDraft({ ...draft, providers: draft.providers.filter((item) => item.id !== provider.id), models: draft.models.filter((item) => item.providerId !== provider.id) });
    setProviderId(claudeProviders.find((item) => item.id !== provider.id)?.id || '');
  };

  if (!snapshot || !draft) return <section className="model-center" data-tour-id="panel-models"><div className="workspace-loading" role="status">{message}</div></section>;

  if (firstRun && !setupMode) {
    return (
      <section className="model-center model-setup" data-tour-id="panel-models">
        <header className="model-center-header"><div><span className="model-center-kicker">FIRST MODEL SETUP</span><h2>先选择模型配置方式</h2><p>这项配置将统一用于 Agent、找灵感和解问题。</p></div></header>
        <div className="model-center-status" role="status"><ShieldCheck aria-hidden="true" />API Key 只会进入 Windows 安全凭据和 Claude Code 进程。</div>
        <div className="model-setup-choices">
          <button type="button" className="model-setup-choice is-recommended" onClick={() => { setSetupMode('preset'); setProviderId('deepseek'); }}><WandSparkles aria-hidden="true" /><span><em>推荐</em><strong>使用预设模型配置</strong><small>DeepSeek 负责 Agent 与探索；千问负责可选图片理解。只需填写 API Key。</small></span></button>
          <button type="button" className="model-setup-choice" onClick={() => { setSetupMode('custom'); addProvider(); }}><Cpu aria-hidden="true" /><span><strong>使用其他模型供应商</strong><small>配置智谱等 Claude Code compatible 服务，并作为 Agent 与探索的统一供应商。</small></span></button>
        </div>
      </section>
    );
  }

  if (firstRun && setupMode === 'preset') {
    const deepSeekReady = snapshot.credentials.find((item) => item.providerId === 'deepseek')?.configured;
    return (
      <section className="model-center model-setup" data-tour-id="panel-models">
        <header className="model-center-header"><div><button type="button" className="model-back-button" onClick={() => setSetupMode('')}><ChevronLeft aria-hidden="true" />重新选择</button><span className="model-center-kicker">PRESET SETUP</span><h2>配置预设模型</h2><p>完成后，Agent、找灵感和解问题统一使用 DeepSeek。</p></div></header>
        <div className="model-center-status" role="status"><ShieldCheck aria-hidden="true" />{message}</div>
        <div className="model-preset-list">
          <article className="model-preset-card is-required"><Cpu aria-hidden="true" /><div><span>必填</span><h3>DeepSeek API Key</h3><p>Claude Code CLI 的统一文本模型供应商。</p></div><button type="button" onClick={() => void configureCredential('deepseek')} disabled={busy}>{deepSeekReady ? '替换 Key' : '配置 Key'}</button>{deepSeekReady ? <Check aria-label="已配置" /> : null}</article>
          <article className="model-preset-card"><Cpu aria-hidden="true" /><div><span>选填</span><h3>千问 API Key</h3><p>仅用于图片理解；跳过不会影响 Agent 和探索。</p></div><button type="button" onClick={() => void configureCredential('qwen')} disabled={busy}>{qwenCredential?.configured ? '替换 Key' : '配置 Key'}</button>{qwenCredential?.configured ? <Check aria-label="已配置" /> : null}</article>
        </div>
        <button type="button" className="model-complete-button" onClick={() => void activate('deepseek', 'preset')} disabled={busy || !deepSeekReady}>{deepSeekReady ? '完成配置并启用 DeepSeek' : '请先配置 DeepSeek API Key'}</button>
      </section>
    );
  }

  return (
    <section className="model-center" data-tour-id="panel-models">
      <header className="model-center-header"><div>{firstRun ? <button type="button" className="model-back-button" onClick={() => { setSetupMode(''); onReturnToStartupSetup?.(); }}><ChevronLeft aria-hidden="true" />返回预设配置</button> : null}<span className="model-center-kicker">CLAUDE CODE PROVIDERS</span><h2>Claude Code 供应商</h2><p>当前供应商统一用于 Agent、找灵感和解问题；切换对下一次任务生效。</p></div><div className="model-center-actions"><button type="button" onClick={() => void load()} disabled={busy}><RefreshCw aria-hidden="true" />重新载入</button><button className="is-primary" type="button" onClick={() => void save()} disabled={busy}><Save aria-hidden="true" />保存更改</button></div></header>
      <div className="model-active-provider"><Cpu aria-hidden="true" /><span><small>当前启用</small><strong>{draft.providers.find((item) => item.id === draft.activeClaudeProviderId)?.name || '未配置'}</strong><em>{draft.providers.find((item) => item.id === draft.activeClaudeProviderId)?.claudeCode?.primaryModel || ''}</em></span><p>运行中和已入队任务不会被中途切换。</p></div>
      <div className="model-center-status" role="status"><ShieldCheck aria-hidden="true" />{message}</div>
      <div className="model-provider-workspace">
        <aside className="model-provider-list"><div className="model-section-title"><strong>供应商</strong><button type="button" onClick={addProvider}><Plus aria-label="新增 Claude Code 供应商" /></button></div>{claudeProviders.map((item) => <button type="button" key={item.id} className={item.id === providerId ? 'is-active' : ''} onClick={() => setProviderId(item.id)}><span>{item.name}{item.id === draft.activeClaudeProviderId ? <em>当前</em> : null}</span><small>{snapshot.credentials.find((entry) => entry.providerId === item.id)?.configured ? 'API Key 已配置' : 'API Key 未配置'} · {item.claudeCode?.primaryModel}</small></button>)}<div className="model-vision-addon"><span>视觉工具 · 千问</span><small>{qwenCredential?.configured ? 'API Key 已配置' : '选填，未配置时图片理解不可用'}</small><button type="button" onClick={() => void configureCredential('qwen')} disabled={busy}>{qwenCredential?.configured ? '替换千问 Key' : '配置千问 Key'}</button></div></aside>
        <main className="model-provider-editor">
          {provider?.claudeCode ? <>
            <div className="model-editor-heading"><strong>供应商配置</strong>{!provider.builtIn ? <button type="button" onClick={deleteProvider}><Trash2 aria-hidden="true" />删除</button> : <span>预设</span>}</div>
            <label>供应商名称<input value={provider.name} onChange={(event) => updateProvider({ name: event.target.value })} /></label>
            <label>Claude Code Base URL<input value={provider.baseUrl} onChange={(event) => updateProvider({ baseUrl: event.target.value })} spellCheck={false} /></label>
            <label>鉴权变量<select value={provider.claudeCode.authField} onChange={(event) => updateProvider({ claudeCode: { ...provider.claudeCode!, authField: event.target.value as 'ANTHROPIC_AUTH_TOKEN' | 'ANTHROPIC_API_KEY' } })}><option value="ANTHROPIC_AUTH_TOKEN">ANTHROPIC_AUTH_TOKEN（第三方常用）</option><option value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY（Anthropic 常用）</option></select></label>
            <label>主模型<input value={provider.claudeCode.primaryModel} onChange={(event) => updateProvider({ claudeCode: { ...provider.claudeCode!, primaryModel: event.target.value } })} spellCheck={false} /></label>
            <details className="model-advanced"><summary>高级模型映射（选填）</summary><p>留空时自动使用主模型。</p><label>Haiku 模型<input value={provider.claudeCode.haikuModel || ''} onChange={(event) => updateProvider({ claudeCode: { ...provider.claudeCode!, haikuModel: event.target.value || undefined } })} /></label><label>Sonnet 模型<input value={provider.claudeCode.sonnetModel || ''} onChange={(event) => updateProvider({ claudeCode: { ...provider.claudeCode!, sonnetModel: event.target.value || undefined } })} /></label><label>Opus 模型<input value={provider.claudeCode.opusModel || ''} onChange={(event) => updateProvider({ claudeCode: { ...provider.claudeCode!, opusModel: event.target.value || undefined } })} /></label></details>
            <div className="model-credential-card"><KeyRound aria-hidden="true" /><span><strong>{credential?.configured ? 'API Key 已安全配置' : '尚未配置 API Key'}</strong><small>{!providerPersisted ? '先保存供应商，再配置 Key' : credential?.updatedAt ? `更新于 ${new Date(credential.updatedAt).toLocaleString()}` : 'Key 不会进入页面或普通配置'}</small></span><button type="button" onClick={() => void configureCredential()} disabled={busy || !providerPersisted}>{credential?.configured ? '替换' : '配置'}</button>{credential?.configured ? <button className="is-danger" type="button" onClick={() => void deleteCredential()} disabled={busy}>清除</button> : null}</div>
            <div className="model-provider-actions"><button type="button" onClick={() => void save()} disabled={busy}>保存更改</button><button type="button" className="is-primary" onClick={() => void activate(provider.id, provider.builtIn ? 'preset' : 'custom')} disabled={busy || !credential?.configured}>{provider.id === draft.activeClaudeProviderId ? '重新应用到 Claude Code' : '启用此供应商'}</button></div>
          </> : <div className="model-empty">请选择或新增一个 Claude Code 供应商。</div>}
        </main>
      </div>
    </section>
  );
}
