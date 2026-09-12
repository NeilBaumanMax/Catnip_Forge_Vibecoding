import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Check, KeyRound, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import type { ModelCapability, ModelConfigState, ModelManagementSnapshot, ModelProfile, ModelProtocol, ProviderConfig } from '../../common/model-config';

const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  'engineering-agent': '工程 Agent',
  'software-assistant': '学院呱呱',
  vision: '图片理解',
};

function cloneConfig(value: ModelConfigState): ModelConfigState {
  return structuredClone(value);
}

function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function ModelPanel() {
  const [snapshot, setSnapshot] = useState<ModelManagementSnapshot | null>(null);
  const [draft, setDraft] = useState<ModelConfigState | null>(null);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('正在读取模型配置…');

  const load = async () => {
    setBusy(true);
    try {
      const value = await window.electronAPI.listModels();
      setSnapshot(value);
      setDraft(cloneConfig(value.config));
      setProviderId((current) => value.config.providers.some((item) => item.id === current) ? current : value.config.providers[0]?.id || '');
      setMessage('模型配置已同步');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取模型配置');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const provider = draft?.providers.find((item) => item.id === providerId) ?? null;
  const models = useMemo(() => draft?.models.filter((item) => item.providerId === providerId) ?? [], [draft, providerId]);
  const model = draft?.models.find((item) => item.id === modelId) ?? null;
  const credential = snapshot?.credentials.find((item) => item.providerId === providerId);
  const providerPersisted = snapshot?.config.providers.some((item) => item.id === providerId) === true;

  useEffect(() => {
    setModelId((current) => models.some((item) => item.id === current) ? current : models[0]?.id || '');
  }, [models]);

  const updateProvider = (patch: Partial<ProviderConfig>) => {
    if (!draft || !provider) return;
    setDraft({ ...draft, providers: draft.providers.map((item) => item.id === provider.id ? { ...item, ...patch } : item) });
  };

  const updateModel = (patch: Partial<ModelProfile>) => {
    if (!draft || !model) return;
    setDraft({ ...draft, models: draft.models.map((item) => item.id === model.id ? { ...item, ...patch } : item) });
  };

  const save = async () => {
    if (!draft || !snapshot) return;
    setBusy(true);
    try {
      const value = await window.electronAPI.saveModels(draft, snapshot.config.revision);
      setSnapshot(value);
      setDraft(cloneConfig(value.config));
      window.dispatchEvent(new Event('catnip:model-config-changed'));
      setMessage('配置已安全保存');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重新载入');
    } finally {
      setBusy(false);
    }
  };

  const addProvider = () => {
    if (!draft) return;
    const id = nextId('provider');
    setDraft({
      ...draft,
      providers: [...draft.providers, {
        id,
        name: '新供应商',
        baseUrl: 'https://api.example.com',
        protocols: ['openai-compatible'],
        enabled: true,
        builtIn: false,
        credentialId: id,
      }],
    });
    setProviderId(id);
    setModelId('');
    setMessage('请填写供应商信息并保存');
  };

  const deleteProvider = () => {
    if (!draft || !provider || provider.builtIn) return;
    if (draft.models.some((item) => item.providerId === provider.id)) {
      setMessage('请先删除该供应商下的模型');
      return;
    }
    setDraft({ ...draft, providers: draft.providers.filter((item) => item.id !== provider.id) });
    setProviderId(draft.providers.find((item) => item.id !== provider.id)?.id || '');
  };

  const addModel = () => {
    if (!draft || !provider) return;
    const id = nextId('model');
    const protocol = provider.protocols[0];
    setDraft({
      ...draft,
      models: [...draft.models, {
        id,
        providerId: provider.id,
        name: '新模型',
        upstreamModel: 'model-id',
        protocol,
        capabilities: ['software-assistant'],
        enabled: true,
        builtIn: false,
      }],
    });
    setModelId(id);
    setMessage('请填写模型信息并保存');
  };

  const deleteModel = () => {
    if (!draft || !model || model.builtIn) return;
    if (Object.values(draft.defaults).includes(model.id)) {
      setMessage('该模型仍是默认用途，请先改绑');
      return;
    }
    setDraft({ ...draft, models: draft.models.filter((item) => item.id !== model.id) });
    setModelId('');
  };

  const configureCredential = async () => {
    if (!provider) return;
    setBusy(true);
    setMessage('请在原生安全窗口中输入凭据');
    try {
      const result = await window.electronAPI.configureModelCredential(provider.id);
      setSnapshot(result.snapshot);
      setMessage(result.outcome === 'submitted' ? '凭据已由 Windows 加密保存' : '已取消，原凭据未改变');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '凭据配置失败');
    } finally {
      setBusy(false);
    }
  };

  const deleteCredential = async () => {
    if (!provider || !window.confirm(`确定清除 ${provider.name} 的本机凭据吗？`)) return;
    setBusy(true);
    try {
      const value = await window.electronAPI.deleteModelCredential(provider.id);
      setSnapshot(value);
      setMessage('本机凭据已清除');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '凭据清除失败');
    } finally {
      setBusy(false);
    }
  };

  const toggleProtocol = (value: ModelProtocol) => {
    if (!provider) return;
    const protocols = provider.protocols.includes(value)
      ? provider.protocols.filter((item) => item !== value)
      : [...provider.protocols, value];
    if (protocols.length) updateProvider({ protocols });
  };

  const toggleCapability = (value: ModelCapability) => {
    if (!model) return;
    const capabilities = model.capabilities.includes(value)
      ? model.capabilities.filter((item) => item !== value)
      : [...model.capabilities, value];
    if (capabilities.length) updateModel({ capabilities });
  };

  return (
    <section className="model-center" data-tour-id="panel-models">
      <header className="model-center-header">
        <div><span className="model-center-kicker">MODEL CONTROL</span><h2>模型中心</h2><p>集中管理供应商、模型用途和本机安全凭据。</p></div>
        <div className="model-center-actions"><button type="button" onClick={() => void load()} disabled={busy}><RefreshCw aria-hidden="true" />重新载入</button><button className="is-primary" type="button" onClick={() => void save()} disabled={busy || !draft}><Save aria-hidden="true" />保存配置</button></div>
      </header>
      <div className="model-center-status" role="status"><ShieldCheck aria-hidden="true" />{message}</div>
      <div className="model-center-grid">
        <aside className="model-provider-list">
          <div className="model-section-title"><strong>供应商</strong><button type="button" onClick={addProvider} disabled={!draft}><Plus aria-label="新增供应商" /></button></div>
          {draft?.providers.map((item) => <button type="button" key={item.id} className={item.id === providerId ? 'is-active' : ''} onClick={() => setProviderId(item.id)}><span>{item.name}</span><small>{item.enabled ? '已启用' : '已停用'} · {snapshot?.credentials.find((entry) => entry.providerId === item.id)?.configured ? '凭据就绪' : '未配置凭据'}</small></button>)}
        </aside>

        <main className="model-catalog">
          <div className="model-section-title"><strong>{provider?.name || '模型档案'}</strong><button type="button" onClick={addModel} disabled={!provider}><Plus aria-hidden="true" />新增模型</button></div>
          <div className="model-card-list">
            {models.map((item) => <button type="button" key={item.id} className={item.id === modelId ? 'is-active' : ''} onClick={() => setModelId(item.id)}><Bot aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.upstreamModel}</small><em>{item.capabilities.map((capability) => CAPABILITY_LABELS[capability]).join(' · ')}</em></span>{Object.values(draft?.defaults || {}).includes(item.id) ? <Check aria-label="默认模型" /> : null}</button>)}
            {!models.length ? <div className="model-empty">这个供应商还没有模型档案。</div> : null}
          </div>
        </main>

        <aside className="model-editor">
          {provider ? <>
            <div className="model-editor-heading"><strong>供应商设置</strong>{!provider.builtIn ? <button type="button" onClick={deleteProvider}><Trash2 aria-hidden="true" />删除</button> : <span>内置</span>}</div>
            <label>显示名称<input value={provider.name} onChange={(event) => updateProvider({ name: event.target.value })} /></label>
            <label>Base URL<input value={provider.baseUrl} onChange={(event) => updateProvider({ baseUrl: event.target.value })} spellCheck={false} /></label>
            <div className="model-check-row"><label><input type="checkbox" checked={provider.enabled} onChange={(event) => updateProvider({ enabled: event.target.checked })} />启用</label>{(['anthropic-compatible', 'openai-compatible'] as ModelProtocol[]).map((item) => <label key={item}><input type="checkbox" checked={provider.protocols.includes(item)} onChange={() => toggleProtocol(item)} />{item.replace('-compatible', '')}</label>)}</div>
            <div className="model-credential-card"><KeyRound aria-hidden="true" /><span><strong>{credential?.configured ? '凭据已安全配置' : '尚未配置凭据'}</strong><small>{!providerPersisted ? '先保存供应商，再配置凭据' : credential?.updatedAt ? `更新于 ${new Date(credential.updatedAt).toLocaleString()}` : 'Key 不会进入本页面或聊天'}</small></span><button type="button" onClick={() => void configureCredential()} disabled={busy || !providerPersisted}>{credential?.configured ? '替换' : '配置'}</button>{credential?.configured ? <button className="is-danger" type="button" onClick={() => void deleteCredential()} disabled={busy}>清除</button> : null}</div>
          </> : null}

          {model ? <div className="model-profile-editor">
            <div className="model-editor-heading"><strong>模型设置</strong>{!model.builtIn ? <button type="button" onClick={deleteModel}><Trash2 aria-hidden="true" />删除</button> : <span>内置</span>}</div>
            <label>显示名称<input value={model.name} onChange={(event) => updateModel({ name: event.target.value })} /></label>
            <label>上游模型 ID<input value={model.upstreamModel} onChange={(event) => updateModel({ upstreamModel: event.target.value })} spellCheck={false} /></label>
            <label>协议<select value={model.protocol} onChange={(event) => updateModel({ protocol: event.target.value as ModelProtocol })}>{provider.protocols.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <div className="model-check-row model-capabilities">{(Object.keys(CAPABILITY_LABELS) as ModelCapability[]).map((item) => <label key={item}><input type="checkbox" checked={model.capabilities.includes(item)} onChange={() => toggleCapability(item)} />{CAPABILITY_LABELS[item]}</label>)}</div>
            <div className="model-default-actions">{model.capabilities.map((item) => <button type="button" key={item} className={draft?.defaults[item] === model.id ? 'is-current' : ''} onClick={() => draft && setDraft({ ...draft, defaults: { ...draft.defaults, [item]: model.id } })}>{draft?.defaults[item] === model.id ? '当前默认' : `设为${CAPABILITY_LABELS[item]}默认`}</button>)}</div>
          </div> : null}
        </aside>
      </div>
    </section>
  );
}
