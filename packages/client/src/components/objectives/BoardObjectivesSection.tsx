import React from 'react';
import { EyeOff, Eye } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { ObjectiveCardBack, ObjectiveCardFace } from './ObjectiveCardView';
import { OBJECTIVE_STAGE_HINTS, objectiveStage, playerNumberHint, viewerObjectives } from './objectiveModel';

export const BoardObjectivesSection: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [revealed, setRevealed] = React.useState(false);
  const objectives = viewerObjectives(view);
  const stage = objectiveStage(view);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-[11px] text-slate-400">{OBJECTIVE_STAGE_HINTS[stage]}</p>
        <button
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((value) => !value)}
          className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 px-3 text-[11px] font-bold text-slate-200 transition hover:border-cyan-500 hover:text-white"
        >
          {revealed ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
          {revealed ? 'Скрыть' : 'Показать Цели'}
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2 pt-1" aria-label="Цели персонажа">
        {objectives.map((card) => (
          <li key={card.id}>
            {revealed ? (
              <ObjectiveCardFace
                card={card}
                compact
                playerHints={card.conditions.map((condition) => playerNumberHint(view, condition))}
              />
            ) : (
              <ObjectiveCardBack kind={card.kind} compact label="Цель скрыта — нажмите «Показать Цели»" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
