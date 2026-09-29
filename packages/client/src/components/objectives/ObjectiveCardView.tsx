import React from 'react';
import { Crosshair, Users } from 'lucide-react';
import type { ObjectiveCard, ObjectiveKind } from '@nemesis/shared';
import { OBJECTIVE_KIND_LABELS, OBJECTIVE_THEMES } from './objectiveModel';

interface ObjectiveCardFaceProps {
  card: ObjectiveCard;
  playerHints?: readonly (string | null)[];
  compact?: boolean;
}

export const ObjectiveCardFace: React.FC<ObjectiveCardFaceProps> = ({ card, playerHints = [], compact = false }) => {
  const theme = OBJECTIVE_THEMES[card.kind];
  return (
    <article
      aria-label={`${OBJECTIVE_KIND_LABELS[card.kind]} Цель: ${card.name}`}
      className={`relative flex ${compact ? 'min-h-72 w-52' : 'min-h-[22rem] w-60'} flex-col overflow-hidden rounded-2xl border-2 bg-slate-950 text-left ${theme.frame} ${theme.glow}`}
    >
      <div className={`relative ${compact ? 'h-20' : 'h-28'} shrink-0 ${theme.art}`} aria-hidden="true">
        <span className="absolute inset-0 bg-gradient-to-b from-transparent from-70% to-slate-950" />
      </div>
      <div className="relative -mt-6 flex flex-1 flex-col px-3 pb-3">
        <span
          className={`mx-auto flex items-center gap-1 rounded-full border bg-slate-950 px-2 py-0.5 text-[11px] font-bold ${theme.frame} ${theme.accent}`}
        >
          {card.minPlayers === null ? (
            <>
              <Crosshair size={11} aria-hidden="true" /> соло/кооп
            </>
          ) : (
            <>
              <Users size={11} aria-hidden="true" />
              <span aria-label={`от ${card.minPlayers} игроков`}>{card.minPlayers}+</span>
            </>
          )}
        </span>
        <h3
          className={`mt-1.5 text-center font-heading ${compact ? 'text-lg' : 'text-xl'} uppercase leading-none tracking-wider text-white`}
        >
          {card.name}
        </h3>
        <ol className="mt-2 flex flex-col items-stretch gap-1.5" aria-label="Условия">
          {card.conditions.map((condition, index) => (
            <li key={condition} className="flex flex-col items-center gap-1.5">
              {index > 0 && (
                <span className={`rounded px-2 text-[10px] font-bold uppercase tracking-widest ${theme.divider}`}>
                  или
                </span>
              )}
              <p className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-center text-[12px] leading-snug text-slate-100">
                {condition}
              </p>
              {playerHints[index] && <p className="text-center text-[10px] text-slate-400">{playerHints[index]}</p>}
            </li>
          ))}
        </ol>
        {!compact && (
          <p className={`mt-2 text-center text-[11px] italic leading-snug ${theme.flavor}`}>{card.flavorText}</p>
        )}
        <p
          className={`mt-auto flex items-center justify-center gap-2 pt-2 text-[10px] font-bold uppercase tracking-[0.3em] ${theme.accent}`}
        >
          <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
          {OBJECTIVE_KIND_LABELS[card.kind]}
          <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
        </p>
      </div>
    </article>
  );
};

export const ObjectiveCardBack: React.FC<{ kind: ObjectiveKind | null; compact?: boolean; label?: string }> = ({
  kind,
  compact = false,
  label = 'Цель скрыта',
}) => {
  const theme = kind ? OBJECTIVE_THEMES[kind] : null;
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex ${compact ? 'min-h-72 w-52' : 'min-h-[22rem] w-60'} flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 bg-[radial-gradient(circle_at_50%_40%,#1e293b_0%,#020617_70%)] ${theme?.frame ?? 'border-slate-600'}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-3 rounded-xl border border-slate-700/70 bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.05)_0px,rgba(148,163,184,0.05)_6px,transparent_6px,transparent_12px)]"
      />
      <span
        aria-hidden="true"
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${theme?.frame ?? 'border-slate-500'} bg-slate-950`}
      >
        <Crosshair size={28} className={theme?.accent ?? 'text-slate-400'} />
      </span>
      <span className="relative font-heading text-2xl uppercase tracking-[0.35em] text-slate-200">Цель</span>
    </div>
  );
};
