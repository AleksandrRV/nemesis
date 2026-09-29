import React from 'react';
import { ChevronRight, FastForward } from 'lucide-react';
import type { EndgameReport, SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CourseScene, EnginesScene, InfectionScene, ObjectivesScene, ShipFateScene } from './EndgameScenes';
import { EndgameSummary } from './EndgameSummary';
import { buildEndgameStages, characterOf, isEndgameSeen, rememberEndgameSeen, type EndgameStage } from './endgameModel';

const STAGE_LABELS: Record<EndgameStage['kind'], string> = {
  SHIP_FATE: 'Финал',
  ENGINES: 'Двигатели',
  COURSE: 'Курс',
  INFECTION: 'Заражение',
  OBJECTIVES: 'Цели',
  SUMMARY: 'Итоги',
};

export const EndgameStageView: React.FC<{ view: SanitizedGameState; report: EndgameReport; stage: EndgameStage }> = ({
  view,
  report,
  stage,
}) => {
  switch (stage.kind) {
    case 'SHIP_FATE':
      return <ShipFateScene report={report} />;
    case 'ENGINES':
      return <EnginesScene report={report} />;
    case 'COURSE':
      return <CourseScene report={report} />;
    case 'INFECTION':
    case 'OBJECTIVES': {
      const result = characterOf(report, stage.playerId);
      if (!result) return null;
      return stage.kind === 'INFECTION' ? (
        <InfectionScene view={view} result={result} />
      ) : (
        <ObjectivesScene view={view} result={result} />
      );
    }
    case 'SUMMARY':
      return null;
  }
};

const StageProgress: React.FC<{ stages: EndgameStage[]; index: number }> = ({ stages, index }) => (
  <ol className="flex w-full max-w-3xl gap-1.5" aria-label="Этапы финала">
    {stages.map((stage, stageIndex) => (
      <li
        key={`${stage.kind}-${stageIndex}`}
        className="flex flex-1 flex-col gap-1"
        aria-current={stageIndex === index ? 'step' : undefined}
      >
        <span className="relative h-1 overflow-hidden rounded-full bg-slate-800">
          {stageIndex <= index && (
            <span className="absolute inset-0 origin-left bg-cyan-400 motion-safe:animate-endgame-progress" />
          )}
        </span>
        <span
          className={`hidden truncate text-[9px] font-bold uppercase tracking-widest sm:block ${
            stageIndex === index ? 'text-cyan-200' : 'text-slate-600'
          }`}
        >
          {STAGE_LABELS[stage.kind]}
        </span>
      </li>
    ))}
  </ol>
);

const SceneFrame: React.FC<{
  view: SanitizedGameState;
  report: EndgameReport;
  stages: EndgameStage[];
  index: number;
  onNext: () => void;
  onSkip: () => void;
}> = ({ view, report, stages, index, onNext, onSkip }) => {
  const frameRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(frameRef, { onEscape: onSkip });
  const isLastScene = index === stages.length - 2;
  return (
    <div ref={frameRef} className="flex w-full flex-col items-center gap-8">
      <StageProgress stages={stages} index={index} />
      <div key={index} className="flex min-h-[22rem] w-full items-center justify-center" aria-live="polite">
        <EndgameStageView view={view} report={report} stage={stages[index]!} />
      </div>
      <footer className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        >
          {isLastScene ? 'К итогам' : 'Далее'} <ChevronRight size={16} aria-hidden="true" />
        </button>
        {!isLastScene && (
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            <FastForward size={14} aria-hidden="true" /> Пропустить к итогам
          </button>
        )}
      </footer>
    </div>
  );
};

const SummaryFrame: React.FC<React.ComponentProps<typeof EndgameSummary>> = (props) => {
  const frameRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(frameRef, { onEscape: props.onViewBoard });
  return (
    <div ref={frameRef} className="flex w-full justify-center">
      <EndgameSummary {...props} />
    </div>
  );
};

export const EndgameCinematic: React.FC<{
  view: SanitizedGameState;
  report: EndgameReport;
  onNewGame: () => void;
  onClose: () => void;
}> = ({ view, report, onNewGame, onClose }) => {
  const stages = React.useMemo(() => buildEndgameStages(report), [report]);
  const summaryIndex = stages.length - 1;
  const gameId = view.meta.gameId;
  const [index, setIndex] = React.useState(() => (isEndgameSeen(gameId) ? summaryIndex : 0));
  const showSummary = index >= summaryIndex;

  React.useEffect(() => {
    if (showSummary) rememberEndgameSeen(gameId);
  }, [showSummary, gameId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="endgame-scene-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 px-4 py-8 motion-safe:animate-endgame-curtain sm:items-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.2),rgba(0,0,0,0.9))]"
      />
      <div className="relative flex w-full max-w-5xl flex-col items-center">
        {showSummary ? (
          <SummaryFrame
            view={view}
            report={report}
            onNewGame={onNewGame}
            onViewBoard={onClose}
            onReplay={() => setIndex(0)}
          />
        ) : (
          <SceneFrame
            key={index === summaryIndex - 1 ? 'final-scene' : 'scenes'}
            view={view}
            report={report}
            stages={stages}
            index={index}
            onNext={() => setIndex((current) => Math.min(current + 1, summaryIndex))}
            onSkip={() => setIndex(summaryIndex)}
          />
        )}
      </div>
    </div>
  );
};
