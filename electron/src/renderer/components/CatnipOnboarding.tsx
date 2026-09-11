import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catnipAssistantImage from '../assets/catnip-assistant.png';

const STORAGE_KEY = 'vibeide.onboarding.catnipJourney';
const VERSION = 5;
const REMIND_DELAY_MS = 24 * 60 * 60 * 1000;
const TARGET_GAP = 8;
const CARD_WIDTH = 380;
const CARD_HEIGHT = 290;
const VIEWPORT_GAP = 18;

type StoredState = {
  version: number;
  status: 'later' | 'completed' | 'dismissed';
  remindAt?: number;
};

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type TourStep = {
  id: string;
  eyebrow: string;
  title: string;
  content: string;
  target?: string;
  actionLabel: string;
  advanceOnTargetClick?: boolean;
  prepare?: 'agent' | 'assistant';
};

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    eyebrow: '欢迎来到 Catnip Forge',
    title: '跟着猫薄荷认识工作区',
    content: '这是一段约 5 分钟的离线导览。不会修改工程、调用模型、编译、烧录或打开串口，你可以随时退出。',
    actionLabel: '开始认识',
  },
  {
    id: 'agent',
    eyebrow: '第一站 · 开发 Agent',
    title: '把目标告诉 Agent',
    content: '左侧是开发 Agent：用一句话描述目标，它会调用 Skills、修改工程并展示执行过程。同一时间只处理一个活动任务，工作中再次发送会追加要求。',
    target: '[data-tour-id="agent-workspace"]',
    actionLabel: '认识资源仓库',
  },
  {
    id: 'repository-tab',
    eyebrow: '第二站 · 资源仓库',
    title: '请点击“仓库”',
    content: '这里集中管理 Skills、硬件工程和参考代码。亲自点击高亮按钮，猫薄荷会继续带路。',
    target: '[data-tour-id="tab-repo"]',
    actionLabel: '等待点击“仓库”',
    advanceOnTargetClick: true,
  },
  {
    id: 'repository-skills',
    eyebrow: '资源仓库 · Skills',
    title: '管理 Agent 的专业能力',
    content: '“打开目录”查看 Skill 源文件；“立即同步”把磁盘改动部署给 Agent；“新建 Skill”创建一项新能力。编辑后保存也会自动同步。',
    target: '[data-tour-id="skill-manager-actions"]',
    actionLabel: '看看工程与参考代码',
  },
  {
    id: 'repository-resources',
    eyebrow: '资源仓库 · 开发材料',
    title: '硬件工程与参考代码各有用途',
    content: '“硬件工程”是可以实际编辑、编译和烧录的项目；“参考代码”是 ESP-IDF 示例与可复用片段。点击标题可展开，再点击文件可进入编辑器。',
    target: '[data-tour-id="panel-repo"]',
    actionLabel: '继续认识监视器',
  },
  {
    id: 'monitor-tab',
    eyebrow: '第三站 · 串口监视器',
    title: '请点击“监视器”',
    content: '界面和 Agent 共享同一个串口会话。教程只带你查看布局，不会连接任何设备。',
    target: '[data-tour-id="tab-monitor"]',
    actionLabel: '等待点击“监视器”',
    advanceOnTargetClick: true,
  },
  {
    id: 'monitor',
    eyebrow: '串口监视器',
    title: '收发与配置清楚分区',
    content: '左侧负责接收和发送，右侧选择端口、波特率、编码与行尾。连接设备前，请先确认 USB-UART 驱动和端口占用。',
    target: '[data-tour-id="panel-monitor"]',
    actionLabel: '看看任务管理器',
  },
  {
    id: 'tasks-tab',
    eyebrow: '第四站 · 硬件任务',
    title: '请点击“任务管理器”',
    content: '这里统一查看 ESP-IDF 编译、烧录、进度和诊断日志。教程不会执行任何硬件操作。',
    target: '[data-tour-id="tab-tasks"]',
    actionLabel: '等待点击“任务管理器”',
    advanceOnTargetClick: true,
  },
  {
    id: 'tasks',
    eyebrow: '任务管理器',
    title: '刷新工程 → 选择工程 → 编译',
    content: '先点“刷新工程”获取项目列表，再在下拉框选择工程，最后点“编译”。右侧状态和进度条会实时显示 Build 是否等待、运行、成功或失败。',
    target: '[data-tour-id="task-build-controls"]',
    actionLabel: '认识烧录流程',
  },
  {
    id: 'tasks-flash',
    eyebrow: '任务管理器 · Flash',
    title: '刷新设备 → 选择串口 → 烧录',
    content: '先刷新设备并选择开发板对应的真实串口，再点“烧录”。Flash 必须同时具备已选工程和串口；教程不会替你执行这些操作。',
    target: '[data-tour-id="task-flash-controls"]',
    actionLabel: '执行情况在哪里',
  },
  {
    id: 'tasks-results',
    eyebrow: '任务管理器 · 结果',
    title: '执行情况都显示在下方',
    content: '实时日志、完整日志和事件卡片用于诊断过程；“最近任务与结果”保存状态、工程、串口、耗时、退出码，并可点“查看”定位日志。',
    target: '[data-tour-id="task-results"]',
    actionLabel: '接着认识编辑器',
  },
  {
    id: 'editor-tab',
    eyebrow: '第五站 · 工程编辑器',
    title: '请点击“编辑器”',
    content: '编辑器只允许访问受控工作目录，支持文件树、多标签、语法高亮、保存和字号调整。',
    target: '[data-tour-id="tab-editor"]',
    actionLabel: '等待点击“编辑器”',
    advanceOnTargetClick: true,
  },
  {
    id: 'editor',
    eyebrow: '工程编辑器',
    title: '左侧选文件，右侧写代码',
    content: '资源树汇总 Agent 生成、硬件工程、参考代码和 Skills；展开目录并点击文件即可编辑。支持多标签与保存，删除文件会进入系统回收站。',
    target: '[data-tour-id="panel-editor"]',
    actionLabel: '调整工作区空间',
  },
  {
    id: 'editor-collapse',
    eyebrow: '工程编辑器 · 工作区',
    title: '需要空间时收起 Agent',
    content: '点击左右区域之间的箭头，可以收起或重新展开 Agent 对话框；旁边的分隔线还能拖动，调整对话区与编辑区的宽度。',
    target: '[data-tour-id="agent-panel-toggle"]',
    actionLabel: '认识字体设置',
  },
  {
    id: 'editor-font',
    eyebrow: '工程编辑器 · 字体',
    title: '代码字体可以随时调节',
    content: '编辑器右下角的“− / ＋”用于减小或增大代码字号，当前像素值会显示在中间；“重置”恢复默认字号。',
    target: '[data-tour-id="editor-font-controls"]',
    actionLabel: '回到 Agent 对话',
  },
  {
    id: 'history',
    eyebrow: 'Agent 对话 · 历史记录',
    title: '对话会自动保存',
    content: '历史对话在软件重启后仍可继续。点击某条对话右侧的“⋯”，可以重命名、置顶或删除；删除前会再次确认。',
    target: '[data-tour-id="chat-history"]',
    actionLabel: '认识专业视图',
    prepare: 'agent',
  },
  {
    id: 'professional-view',
    eyebrow: 'Agent 对话 · 执行细节',
    title: '专业视图展开技术过程',
    content: '开启“专业视图”后，每轮任务使用的工具、运行状态和诊断信息会自动展开；关闭后默认只看简洁结果，执行记录不会丢失。',
    target: '[data-tour-id="professional-view"]',
    actionLabel: '认识任务输入框',
    prepare: 'agent',
  },
  {
    id: 'composer',
    eyebrow: 'Agent 对话 · 发起任务',
    title: '在输入框描述完整目标',
    content: '直接输入你想完成的事情，Enter 发送、Shift+Enter 换行。Agent 工作中再次发送会追加要求；需要独立等待执行时可选择排队。',
    target: '[data-tour-id="agent-composer"]',
    actionLabel: '怎样添加文件',
    prepare: 'agent',
  },
  {
    id: 'attachments',
    eyebrow: 'Agent 对话 · 文件',
    title: '点“附件”加入图片或文档',
    content: '这里可以添加图片、PDF、Word、PPT 和文本文件。图片只有在配置 Qwen 且由你主动发送后才会用于云端视觉解析。',
    target: '[data-tour-id="attachment-button"]',
    actionLabel: '怎样加入 Skill',
    prepare: 'agent',
  },
  {
    id: 'skills',
    eyebrow: 'Agent 对话 · Skills',
    title: '点“＋ Skills”加入专业能力',
    content: '选择器会把 @Skill 插入当前光标位置，可在一条任务中加入多个 Skill。也可以直接输入“@”搜索，退格一次可完整删除引用。',
    target: '[data-tour-id="skill-button"]',
    actionLabel: '最后认识猫薄荷',
    prepare: 'agent',
  },
  {
    id: 'assistant-trigger',
    eyebrow: '软件助手 · 猫薄荷',
    title: '请点击右下角的猫薄荷',
    content: '除了开发 Agent，我也是软件使用聊天机器人。点击高亮的小猫打开我的设置和问答面板。',
    target: '[data-tour-id="assistant-trigger"]',
    actionLabel: '等待点击猫薄荷',
    advanceOnTargetClick: true,
  },
  {
    id: 'assistant',
    eyebrow: '软件助手 · 随时来问我',
    title: '不会使用软件，就问猫薄荷',
    content: '我可以回答界面、编译、烧录、串口和 Skills 的使用问题。顶部可切换亮暗模式、重播新手教程、调节小猫显示大小；小猫本身还可以拖动。',
    target: '.software-assistant-popover',
    actionLabel: '完成新手旅程',
    prepare: 'assistant',
  },
  {
    id: 'complete',
    eyebrow: '新手旅程完成 · Enjoy',
    title: 'One Prompt, Working Hardware',
    content: '从一句 Prompt，到真正运行的硬件。现在把你的目标告诉 Agent，开始创造吧；遇到不会的地方，猫薄荷一直在右下角等你。',
    actionLabel: '开始创造',
  },
];

function readStoredState(): StoredState | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredState | null;
    return value?.version === VERSION ? value : null;
  } catch {
    return null;
  }
}

function storeState(value: StoredState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The journey remains usable for this session when storage is unavailable.
  }
}

function measureTarget(element: Element): TargetRect {
  const rect = element.getBoundingClientRect();
  const left = Math.max(TARGET_GAP, rect.left - TARGET_GAP);
  const top = Math.max(TARGET_GAP, rect.top - TARGET_GAP);
  const right = Math.min(window.innerWidth - TARGET_GAP, rect.right + TARGET_GAP);
  const bottom = Math.min(window.innerHeight - TARGET_GAP, rect.bottom + TARGET_GAP);
  return { top, right, bottom, left, width: right - left, height: bottom - top };
}

function getCardPosition(target: TargetRect | null): React.CSSProperties {
  if (!target) {
    return {
      left: Math.max(VIEWPORT_GAP, (window.innerWidth - CARD_WIDTH) / 2),
      top: Math.max(VIEWPORT_GAP, (window.innerHeight - CARD_HEIGHT) / 2),
    };
  }
  const fitsRight = window.innerWidth - target.right >= CARD_WIDTH + VIEWPORT_GAP * 2;
  const fitsLeft = target.left >= CARD_WIDTH + VIEWPORT_GAP * 2;
  const fitsBelow = window.innerHeight - target.bottom >= CARD_HEIGHT + VIEWPORT_GAP;
  let left = fitsRight
    ? target.right + VIEWPORT_GAP
    : fitsLeft
      ? target.left - CARD_WIDTH - VIEWPORT_GAP
      : Math.min(window.innerWidth - CARD_WIDTH - VIEWPORT_GAP, Math.max(VIEWPORT_GAP, target.left));
  let top = fitsRight || fitsLeft
    ? target.top + target.height / 2 - CARD_HEIGHT / 2
    : fitsBelow
      ? target.bottom + VIEWPORT_GAP
      : target.top - CARD_HEIGHT - VIEWPORT_GAP;
  left = Math.min(window.innerWidth - CARD_WIDTH - VIEWPORT_GAP, Math.max(VIEWPORT_GAP, left));
  top = Math.min(window.innerHeight - CARD_HEIGHT - VIEWPORT_GAP, Math.max(VIEWPORT_GAP, top));
  return { left, top };
}

interface Props {
  enabled: boolean;
  startRequest: number;
  onStart?: () => void;
  onEnsureAgentOpen?: () => void;
  onEnsureAssistantOpen?: () => void;
}

export default function CatnipOnboarding({
  enabled,
  startRequest,
  onStart,
  onEnsureAgentOpen,
  onEnsureAssistantOpen,
}: Props) {
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const lastStartRequestRef = useRef(startRequest);
  const step = STEPS[stepIndex];

  const close = useCallback((status: StoredState['status']) => {
    storeState({ version: VERSION, status });
    setActive(false);
    setInvitationOpen(false);
    setTargetRect(null);
  }, []);

  const start = useCallback(() => {
    onStart?.();
    setInvitationOpen(false);
    setStepIndex(0);
    setActive(true);
  }, [onStart]);

  useEffect(() => {
    if (!enabled) {
      setInvitationOpen(false);
      return undefined;
    }
    const stored = readStoredState();
    if (stored?.status === 'completed' || stored?.status === 'dismissed') return undefined;
    if (stored?.status === 'later' && (stored.remindAt ?? 0) > Date.now()) return undefined;
    const timer = window.setTimeout(() => setInvitationOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (lastStartRequestRef.current === startRequest) return;
    lastStartRequestRef.current = startRequest;
    start();
  }, [start, startRequest]);

  useEffect(() => {
    if (!active) return;
    if (step.prepare === 'agent') onEnsureAgentOpen?.();
    if (step.prepare === 'assistant') onEnsureAssistantOpen?.();
  }, [active, onEnsureAgentOpen, onEnsureAssistantOpen, step.prepare]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close('later');
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex((current) => current - 1);
      if (event.key === 'ArrowRight' && !step.advanceOnTargetClick) {
        setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, close, step.advanceOnTargetClick, stepIndex]);

  useEffect(() => {
    if (!active || !step.target) {
      setTargetRect(null);
      return undefined;
    }
    let element: Element | null = null;
    let animationFrame = 0;
    let lastPrepareAt = Number.NEGATIVE_INFINITY;
    const onTargetClick = () => {
      if (step.advanceOnTargetClick) {
        window.setTimeout(() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1)), 80);
      }
    };
    const bind = (next: Element | null) => {
      if (element === next) return;
      element?.removeEventListener('click', onTargetClick);
      element = next;
      element?.addEventListener('click', onTargetClick);
    };
    const track = (timestamp: number) => {
      if (!element?.isConnected) bind(document.querySelector(step.target!));
      if (!element) {
        if (step.prepare && timestamp - lastPrepareAt >= 250) {
          lastPrepareAt = timestamp;
          if (step.prepare === 'agent') onEnsureAgentOpen?.();
          if (step.prepare === 'assistant') onEnsureAssistantOpen?.();
        }
        setTargetRect((current) => current === null ? current : null);
      } else {
        const next = measureTarget(element);
        setTargetRect((current) => current
          && Math.abs(current.top - next.top) < 0.5
          && Math.abs(current.left - next.left) < 0.5
          && Math.abs(current.width - next.width) < 0.5
          && Math.abs(current.height - next.height) < 0.5
          ? current
          : next);
      }
      animationFrame = window.requestAnimationFrame(track);
    };
    animationFrame = window.requestAnimationFrame(track);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      element?.removeEventListener('click', onTargetClick);
    };
  }, [active, onEnsureAgentOpen, onEnsureAssistantOpen, step]);

  const progress = useMemo(() => `${stepIndex + 1} / ${STEPS.length}`, [stepIndex]);

  if (!enabled) return null;

  if (invitationOpen && !active) {
    return (
      <section className="catnip-onboarding-invitation" role="dialog" aria-labelledby="catnip-invitation-title">
        <img src={catnipAssistantImage} alt="" aria-hidden="true" />
        <div>
          <span>猫薄荷新手旅程</span>
          <h2 id="catnip-invitation-title">第一次使用 Catnip Forge？</h2>
          <p>我可以用约 5 分钟带你认识主要功能。全程离线，不会碰你的工程或硬件。</p>
          <div className="catnip-onboarding-invitation-actions">
            <button type="button" className="is-primary" onClick={start}>开始快速导览</button>
            <button
              type="button"
              onClick={() => {
                storeState({ version: VERSION, status: 'later', remindAt: Date.now() + REMIND_DELAY_MS });
                setInvitationOpen(false);
              }}
            >
              稍后提醒
            </button>
            <button type="button" className="is-quiet" onClick={() => close('dismissed')}>我已经会了</button>
          </div>
        </div>
      </section>
    );
  }

  if (!active) return null;

  const next = () => {
    if (stepIndex === STEPS.length - 1) close('completed');
    else setStepIndex((current) => current + 1);
  };

  return (
    <div className="catnip-onboarding-layer" aria-live="polite">
      {!targetRect ? <div className="catnip-onboarding-scrim" aria-hidden="true" /> : null}
      {targetRect ? (
        <div
          className="catnip-onboarding-spotlight"
          style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
          aria-hidden="true"
        />
      ) : null}
      <section
        className="catnip-onboarding-card"
        style={getCardPosition(targetRect)}
        role="dialog"
        aria-modal="false"
        aria-labelledby="catnip-onboarding-title"
      >
        <header>
          <span>{step.eyebrow}</span>
          <button type="button" onClick={() => close('later')} title="退出新手旅程" aria-label="退出新手旅程">×</button>
        </header>
        <div className="catnip-onboarding-card-body">
          <img src={catnipAssistantImage} alt="" aria-hidden="true" />
          <div>
            <h2 id="catnip-onboarding-title">{step.title}</h2>
            <p>{step.content}</p>
          </div>
        </div>
        {step.advanceOnTargetClick && targetRect ? <div className="catnip-onboarding-hint"><i /> 请点击高亮区域继续</div> : null}
        {step.target && !targetRect && step.prepare ? <div className="catnip-onboarding-hint"><i /> 正在恢复教程需要的界面…</div> : null}
        {step.target && !targetRect && !step.prepare ? <div className="catnip-onboarding-hint is-warning">当前窗口找不到这个区域，可以安全跳过。</div> : null}
        <footer>
          <span aria-label={`新手旅程进度 ${progress}`}>{progress}</span>
          <div>
            {stepIndex > 0 ? <button type="button" onClick={() => setStepIndex((current) => current - 1)}>上一步</button> : null}
            <button
              type="button"
              className="is-primary"
              disabled={(step.advanceOnTargetClick && Boolean(targetRect)) || (Boolean(step.prepare) && !targetRect)}
              onClick={next}
            >
              {step.target && !targetRect && step.prepare ? '正在恢复…' : step.target && !targetRect ? '跳过此步' : step.actionLabel}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
