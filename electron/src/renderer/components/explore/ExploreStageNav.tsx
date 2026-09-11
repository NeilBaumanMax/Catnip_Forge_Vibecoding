import React from 'react';
import { Check } from 'lucide-react';

export type ExploreStage = 'describe' | 'analyze' | 'plan' | 'execute';

interface Props {
  current: ExploreStage;
  furthest: ExploreStage;
  onSelect: (stage: ExploreStage) => void;
}

const STAGES: Array<{ id: ExploreStage; label: string; description: string; index: string }> = [
  { id: 'describe', label: '描述', description: '输入你的想法', index: '1' },
  { id: 'analyze', label: '查看结论', description: 'AI 分析知乎内容', index: '2' },
  { id: 'plan', label: '确认计划', description: '生成可执行方案', index: '3' },
  { id: 'execute', label: '执行', description: '进入 Agent 工作区', index: '4' },
];

export default function ExploreStageNav({ current, furthest, onSelect }: Props) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === current);
  const furthestIndex = STAGES.findIndex((stage) => stage.id === furthest);
  return (
    <nav className="explore-stage-nav" aria-label="探索阶段">
      <ol>
        {STAGES.map((stage, index) => {
          const available = index <= furthestIndex;
          const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : available ? 'available' : 'future';
          return (
            <li key={stage.id} className={`is-${state}`}>
              <button type="button" disabled={!available} onClick={() => onSelect(stage.id)} aria-current={state === 'current' ? 'step' : undefined}>
                <span>{index < furthestIndex ? <Check aria-hidden="true" /> : stage.index}</span>
                <span className="explore-stage-copy"><strong>{stage.label}</strong><small>{stage.description}</small></span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
