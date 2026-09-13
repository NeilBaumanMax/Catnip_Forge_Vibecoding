import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catnipAssistantImage from '../assets/liukanshan-assistant.png';

const STORAGE_KEY = 'vibeide.onboarding.catnipJourney';
const VERSION = 9;
const REMIND_DELAY_MS = 24 * 60 * 60 * 1000;
const TARGET_GAP = 8;
const CARD_WIDTH = 380;
const CARD_HEIGHT = 360;
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
    eyebrow: '第一步 · 先认识整个项目',
    title: 'Catnip Forge 把硬件创意带到真实运行',
    content: '这是面向 ESP32/ESP32-S3 创客的本地硬件智能开发平台。完整流程是：先配置模型并选择工程；用探索找方向、查问题；再把确认后的目标交给 Agent；通过仓库与 Skill Hub 扩展能力；最后在编辑器、任务管理器和监视器中完成代码、编译、烧录与实机验证。顶部七个标签、左侧 Agent、当前工程和本地历史始终围绕同一个工程协作。教程只讲解，不会调用模型、连接知乎、修改工程、编译、烧录或打开串口。',
    actionLabel: '先配置模型',
  },
  {
    id: 'models-tab',
    eyebrow: '第二步 · 模型是智能能力入口',
    title: '请点击“模型”',
    content: '这里统一管理 Agent、找灵感和解问题之后要使用的 Claude Code 供应商。亲自点击高亮标签，查看当前供应商、模型和 Key 状态。',
    target: '[data-tour-id="tab-models"]',
    actionLabel: '等待点击“模型”',
    advanceOnTargetClick: true,
  },
  {
    id: 'models-preset',
    eyebrow: '模型 · 预设配置与凭据维护',
    title: 'DeepSeek 必填，Qwen 视觉选填',
    content: '首次启动先选择预设配置或其他供应商。预设配置会在独立 Windows 安全窗口输入 DeepSeek Key 和可选 Qwen Key：DeepSeek 负责 Agent 与探索，Qwen 只负责主动提交的图片；保存后按提示重启，再在工程选择页进入已有工程或创建新工程。Key 不进入页面、聊天、日志或预览。以后可在模型页查看状态、替换或清除，Qwen 留空不影响文本任务。',
    target: '[data-tour-id="panel-models"]',
    actionLabel: '学习其他供应商',
  },
  {
    id: 'models-provider',
    eyebrow: '模型 · 其他 Claude Code 供应商',
    title: '按“保存 → Key → 模型 → 测试 → 启用”操作',
    content: '新增供应商后填写名称、Base URL、鉴权变量和默认兜底模型，先保存，再用原生安全窗口配置 Key。随后获取当前 Key 的真实模型列表，设置 Sonnet、Opus、Fable、Haiku、Subagent，测试 Messages 接口，查看脱敏预览，最后启用。当前直连版只支持原生 Anthropic Messages。',
    target: '[data-tour-id="model-provider-editor"]',
    actionLabel: '理解角色和生效范围',
  },
  {
    id: 'models-mapping',
    eyebrow: '模型 · 映射与任务快照',
    title: '显示名、实际模型、1M 各不相同',
    content: '显示名只改变 Claude Code 的 /model 菜单；实际请求模型必须是供应商接受的 ID；1M 只在供应商支持长上下文时开启。Agent 输入框可切换当前供应商实际返回的模型，但不能跨供应商。切换只影响之后提交的任务，运行中和已排队任务不会中途换模型。',
    target: '[data-tour-id="model-mapping"]',
    actionLabel: '认识开发 Agent',
  },
  {
    id: 'agent',
    eyebrow: '第三步 · 开发 Agent',
    title: '把目标告诉 Agent',
    content: '顶部依次进入仓库、监视器、任务管理器、编辑器、探索、模型和 Skill 小站，右上角显示当前工程。左侧是开发 Agent：用一句话描述目标，它会调用 Skills、修改当前工程并展示执行过程；同一时间只处理一个活动任务，工作中再次发送会追加要求。顶部齿轮管理界面设置，窗口按钮只控制窗口。',
    target: '[data-tour-id="agent-workspace"]',
    actionLabel: '认识资源仓库',
  },
  {
    id: 'repository-tab',
    eyebrow: '第四步 · 资源仓库',
    title: '请点击“仓库”',
    content: '这里集中管理 Skills、硬件工程和参考代码。亲自点击高亮按钮，刘看山会继续带路。',
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
    actionLabel: '继续认识探索',
  },
  {
    id: 'explore-tab',
    eyebrow: '第五步 · 独立探索工作区',
    title: '请点击“探索”',
    content: '探索先研究、再计划，不会直接动工程。它有独立于左侧 Agent 的对话与历史，并与当前工程绑定。亲自点击高亮标签继续。',
    target: '[data-tour-id="tab-explore"]',
    actionLabel: '等待点击“探索”',
    advanceOnTargetClick: true,
  },
  {
    id: 'explore-connection',
    eyebrow: '探索 · 知乎官方连接',
    title: '先看顶部的知乎连接状态',
    content: '探索会先调用官方 Skill 的 status。缺 CLI 时由你授权下载安装；缺凭据时打开知乎个人中心生成 Access Secret，再粘贴到独立 Windows 安全窗口。已连接后可替换 Secret、在线验证或退出本机登录。Secret 不进入页面、URL、聊天、日志或收藏。',
    target: '[data-tour-id="explore-zhihu-connection"]',
    actionLabel: '认识两个入口',
  },
  {
    id: 'explore-modes',
    eyebrow: '探索 · 找灵感与解问题',
    title: '两个入口解决不同阶段的问题',
    content: '“找灵感”把模糊目标、当前工程和硬件限制变成多个有来源的可实现方向，适合还没决定做什么；“解问题”让你勾选工程、Build、串口和历史知识，并用知乎＋全网资料交叉判断根因，适合已经出现异常。两者都先分析，不直接执行。',
    target: '[data-tour-id="explore-entry-grid"]',
    actionLabel: '学习探索历史',
  },
  {
    id: 'explore-history',
    eyebrow: '探索 · 每个工程的多会话历史',
    title: '新建、恢复、重命名或删除记录',
    content: '找灵感和解问题分别保存多条会话：草稿、勾选 Context、对话、来源、结论、计划和阶段都会保留在当前工程的 .catnip/explore/。返回首页、切标签或重启后可继续；“新建灵感/新建调查”不会覆盖旧记录。删除探索历史也不会删除已收藏的知识卡。',
    target: '[data-tour-id="explore-history"]',
    actionLabel: '学习本地知识库',
  },
  {
    id: 'explore-knowledge',
    eyebrow: '探索 · 本地收藏与验证',
    title: '收藏不等于自动加入 Context',
    content: '可信来源要由你主动收藏；卡片可查看来源对话、删除或“记录验证”。解问题只会发现相关候选，必须再次勾选才会使用。验证时写明实际操作和现象，可记录任务 ID/日志，并标记有效或无效，让知识库能够长期纠错。它不是知乎官方知识库。',
    target: '[data-tour-id="explore-saved-knowledge"]',
    actionLabel: '理解执行门禁',
  },
  {
    id: 'explore-flow',
    eyebrow: '探索 · 四步确认流程',
    title: '描述、查看结论、确认计划、执行',
    content: '先描述并选择 Context，再查看带来源的结论；第三步只生成 PLAN/HANDOFF 交接材料；第四步先预览磁盘内容。只有你点击“确认提交给工程 Agent”后才允许执行。代码完成、编译成功、烧录成功和实机运行正常必须用各自的真实证据判断。',
    target: '[data-tour-id="panel-explore"]',
    actionLabel: '认识 Neil 的 skill 小站',
  },
  {
    id: 'skill-hub-tab',
    eyebrow: '第六步 · 在线 Skill 发现',
    title: '请点击“Neil 的 skill 小站”',
    content: '这里打开在线 Skill Hub，用来了解、浏览和下载可扩展能力。它不是第二套 Agent 或云端工程。亲自点击高亮标签继续。',
    target: '[data-tour-id="tab-skill-hub"]',
    actionLabel: '等待点击 Skill 小站',
    advanceOnTargetClick: true,
  },
  {
    id: 'skill-hub-boundary',
    eyebrow: 'Neil 的 skill 小站',
    title: '线上发现，本地管理与同步',
    content: '小站只负责线上发现与下载；下载后回“仓库”的 Skill Manager 检查 SKILL.md、编辑并“立即同步”，再在 Agent 输入框用“＋ Skills”或 @ 主动引用。网页内容不会自动加入工程 Context，也不能任意读写本地文件或取得 Secret。',
    target: '[data-tour-id="panel-skill-hub"]',
    actionLabel: '继续认识监视器',
  },
  {
    id: 'monitor-tab',
    eyebrow: '第七步 · 串口监视器',
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
    eyebrow: '第八步 · 硬件任务',
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
    content: '实时日志和事件卡片用于诊断过程；“最近任务与结果”保存状态、工程、串口、耗时、退出码，点击“查看”会直接打开对应任务日志。',
    target: '[data-tour-id="task-results"]',
    actionLabel: '接着认识编辑器',
  },
  {
    id: 'editor-tab',
    eyebrow: '第九步 · 工程编辑器',
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
    eyebrow: '第九步 · 工程编辑器工作区',
    title: '需要空间时收起 Agent',
    content: '点击左右区域之间的箭头，可以收起或重新展开 Agent 对话框；旁边的分隔线还能拖动，调整对话区与编辑区的宽度。',
    target: '[data-tour-id="agent-panel-toggle"]',
    actionLabel: '认识字体设置',
  },
  {
    id: 'editor-font',
    eyebrow: '第九步 · 工程编辑器字体',
    title: '代码字体可以随时调节',
    content: '编辑器右下角的“− / ＋”用于减小或增大代码字号，当前像素值会显示在中间；“重置”恢复默认字号。',
    target: '[data-tour-id="editor-font-controls"]',
    actionLabel: '回到 Agent 对话',
  },
  {
    id: 'history',
    eyebrow: '第十步 · Agent 对话历史',
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
    actionLabel: '最后认识刘看山',
    prepare: 'agent',
  },
  {
    id: 'assistant-trigger',
    eyebrow: '第十一步 · 软件助手刘看山',
    title: '请点击右下角的刘看山',
    content: '除了开发 Agent，我也是软件使用聊天机器人。点击高亮的刘看山打开我的设置和问答面板。',
    target: '[data-tour-id="assistant-trigger"]',
    actionLabel: '等待点击刘看山',
    advanceOnTargetClick: true,
  },
  {
    id: 'assistant',
    eyebrow: '软件助手 · 随时来问我',
    title: '不会使用软件，就问刘看山',
    content: '我可以回答界面、探索、知乎连接、Skill 小站、模型配置、编译、烧录、串口和 Skills 的使用问题。顶部可查看项目主页、切换亮暗模式、重播新手教程和调节形象大小；刘看山本身还可以拖动。',
    target: '.software-assistant-popover',
    actionLabel: '完成新手旅程',
    prepare: 'assistant',
  },
  {
    id: 'complete',
    eyebrow: '新手旅程完成 · Enjoy',
    title: 'One Prompt, Working Hardware',
    content: '从一句 Prompt，到真正运行的硬件。现在把你的目标告诉 Agent，开始创造吧；遇到不会的地方，刘看山一直在右下角等你。',
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
          <span>刘看山新手旅程 · 知乎特供版</span>
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
