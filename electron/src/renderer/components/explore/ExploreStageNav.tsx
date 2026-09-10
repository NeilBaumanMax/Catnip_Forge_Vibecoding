import React from 'react';

export type ExploreStage = 'describe' | 'analyze' | 'plan' | 'execute';

interface Props {
  current: ExploreStage;
  furthest: ExploreStage;
  onSelect: (stage: ExploreStage) => void;
}

const STAGES: Array<{ id: ExploreStage; label: string; index: string }> = [
  { id: 'describe', label: '描述', index: '1' },
  { id: 'analyze', label: '查看结论', index: '2' },
  { id: 'plan', label: '确认计划', index: '3' },
  { id: 'execute', label: '执行', index: '4' },
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
                <span>{index < furthestIndex ? '✓' : stage.index}</span>
                <strong>{stage.label}</strong>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
