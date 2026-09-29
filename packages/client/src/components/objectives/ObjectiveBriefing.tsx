import React from 'react';
import { Eye, Radio, ShieldAlert, Trophy } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ObjectiveCardFace } from './ObjectiveCardView';
import {
  isBriefingDismissed,
  objectiveStage,
  playerNumberHint,
  rememberBriefingDismissed,
  viewerObjectives,
  viewerPlayer,
} from './objectiveModel';

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

interface ObjectiveBriefingSceneProps {
  view: SanitizedGameState;
  onClose: () => void;
}

export const ObjectiveBriefingScene: React.FC<ObjectiveBriefingSceneProps> = ({ view, onClose }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { onEscape: onClose });
  const player = viewerPlayer(view);
  const objectives = viewerObjectives(view);
  const soloDeck = objectives.every((card) => card.kind === 'SOLO_COOP');

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-slate-950/95 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(34,211,238,0.04)_0px,rgba(34,211,238,0.04)_1px,transparent_1px,transparent_3px)]"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="objective-briefing-title"
        className="relative flex w-full max-w-4xl flex-col items-center gap-5 py-6"
      >
        <header className="flex flex-col items-center gap-1 text-center">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300 motion-safe:animate-step-enter">
            <Radio size={13} aria-hidden="true" /> Входящая передача · гриф «Секретно»
          </span>
          <h2
            id="objective-briefing-title"
            className="font-heading text-4xl uppercase tracking-[0.25em] text-white motion-safe:animate-objective-glitch-in sm:text-5xl"
          >
            Ваши Цели
          </h2>
          <p className="text-sm text-slate-400 motion-safe:animate-step-enter" style={delay(300)}>
            {player ? `Только для: ${player.name}. ` : ''}
            {soloDeck ? 'Соло: 2 карты Соло/Кооп Целей (стр. 27).' : '1 Корпоративная и 1 Личная Цель (стр. 8).'}
          </p>
        </header>

        <ul className="flex flex-wrap justify-center gap-5" aria-label="Розданные Цели">
          {objectives.map((card, index) => (
            <li key={card.id} className="motion-safe:animate-objective-card-deal" style={delay(500 + index * 260)}>
              <ObjectiveCardFace
                card={card}
                playerHints={card.conditions.map((condition) => playerNumberHint(view, condition))}
              />
            </li>
          ))}
        </ul>

        <ul
          className="grid w-full max-w-3xl gap-2 text-xs leading-relaxed text-slate-300 motion-safe:animate-step-enter sm:grid-cols-3"
          style={delay(1200)}
        >
          <li className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <Eye size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            Цели секретны: другие игроки их не видят.
          </li>
          <li className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <ShieldAlert size={16} className="shrink-0 text-red-300" aria-hidden="true" />
            Первая миниатюра Чужого на поле — пауза: оставьте одну Цель, вторая уйдёт из игры.
          </li>
          <li className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <Trophy size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
            Победа — выполненная Цель и выживший Персонаж.
          </li>
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-cyan-400 px-8 py-2.5 font-heading text-base font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)] transition hover:bg-cyan-300 active:scale-95 motion-safe:animate-step-enter"
          style={delay(1400)}
        >
          Принять брифинг
        </button>
      </div>
    </div>
  );
};

interface ObjectiveBriefingProps {
  view: SanitizedGameState;
  enabled: boolean;
}

export const ObjectiveBriefing: React.FC<ObjectiveBriefingProps> = ({ view, enabled }) => {
  const gameId = view.meta.gameId;
  const [dismissedGameIds, setDismissedGameIds] = React.useState<readonly string[]>([]);
  const dismissed = dismissedGameIds.includes(gameId) || isBriefingDismissed(gameId);
  if (!enabled || dismissed || objectiveStage(view) !== 'AWAITING_FIRST_CONTACT') return null;
  return (
    <ObjectiveBriefingScene
      view={view}
      onClose={() => {
        rememberBriefingDismissed(gameId);
        setDismissedGameIds((ids) => [...ids, gameId]);
      }}
    />
  );
};
