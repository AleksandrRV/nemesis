import React from 'react';
import { ChevronDown, ChevronUp, Layers, Zap } from 'lucide-react';
import type { SanitizedGameState, SanitizedPlayerState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { CrewToken } from '../board/CrewToken';
import { toCrewToken } from '../board/crewTokenModel';
import { LIGHT_WOUND_LIMIT, SERIOUS_WOUND_LIMIT, type PlayerBoardSummary, type StatusTone } from './playerBoardModel';

const TONE_CLASSES: Record<StatusTone, string> = {
  active: 'border-cyan-400/70 bg-cyan-950/70 text-cyan-200',
  muted: 'border-slate-600 bg-slate-900 text-slate-400',
  danger: 'border-red-500/70 bg-red-950/60 text-red-200',
  warning: 'border-amber-400/70 bg-amber-950/60 text-amber-200',
  toxic: 'border-lime-400/70 bg-lime-950/60 text-lime-200',
};

function Pips({
  filled,
  total,
  filledClass,
  label,
}: {
  filled: number;
  total: number;
  filledClass: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-sm border ${index < filled ? filledClass : 'border-slate-600 bg-slate-900'}`}
        />
      ))}
    </span>
  );
}

interface PlayerBoardSummaryProps {
  view: SanitizedGameState;
  player: SanitizedPlayerState;
  summary: PlayerBoardSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenVitals: () => void;
  trailing: React.ReactNode;
}

export const PlayerBoardSummaryBar: React.FC<PlayerBoardSummaryProps> = ({
  view,
  player,
  summary,
  isExpanded,
  onToggle,
  onOpenVitals,
  trailing,
}) => {
  const identity = CREW_IDENTITIES[player.characterClass];
  const token = toCrewToken(view, player.id);
  const { vitals, actions } = summary;
  const actionLabel =
    actions.limit === null ? `Действий: ${actions.used}, без лимита` : `Действий: ${actions.used} из ${actions.limit}`;

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {token && (
          <svg viewBox="-13 -13 26 26" className="h-9 w-9 shrink-0" aria-hidden="true">
            <CrewToken token={token} showActiveRing={false} />
          </svg>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-heading text-lg tracking-wider" style={{ color: identity.color }}>
            {identity.label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Игрок {player.orderNumber}
          </span>
        </div>
        <ul className="ml-1 hidden flex-wrap gap-1 sm:flex" aria-label="Состояние персонажа">
          {summary.statuses.map((status) => (
            <li
              key={status.id}
              title={status.hint}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TONE_CLASSES[status.tone]}`}
            >
              {status.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
        <div
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1"
          title={actions.limit === null ? 'Инъекция адреналина: без лимита до Паса' : '2 Действия за ход (стр. 10)'}
        >
          <Zap size={13} className="text-amber-300" aria-hidden="true" />
          {actions.limit === null ? (
            <span className="font-mono text-xs font-bold text-amber-200" aria-label={actionLabel}>
              {actions.used} / ∞
            </span>
          ) : (
            <Pips
              filled={actions.used}
              total={actions.limit}
              filledClass="border-amber-300 bg-amber-400"
              label={actionLabel}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onOpenVitals}
          className={`flex items-center gap-3 rounded-lg border px-2.5 py-1 transition hover:border-rose-500/70 ${
            vitals.isCritical ? 'border-red-600/80 bg-red-950/40' : 'border-slate-800 bg-slate-900/70'
          }`}
          aria-label={`Раны: лёгких ${vitals.light} из ${LIGHT_WOUND_LIMIT}, тяжёлых ${vitals.serious} из ${SERIOUS_WOUND_LIMIT}. Открыть состояние`}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300">Лёгкие</span>
            <Pips filled={vitals.light} total={LIGHT_WOUND_LIMIT} filledClass="border-rose-300 bg-rose-500" label="" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">Тяжёлые</span>
            <Pips
              filled={vitals.serious}
              total={SERIOUS_WOUND_LIMIT}
              filledClass="border-red-400 bg-red-600"
              label=""
            />
          </span>
        </button>

        <span
          className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400"
          title={summary.handLimit === 6 ? 'Каюты: лимит руки 6 (стр. 10, 25)' : 'Лимит руки 5 (стр. 10)'}
        >
          <Layers size={13} className="text-slate-500" aria-hidden="true" />
          <span className={summary.handLimit === 6 ? 'text-emerald-300' : 'text-slate-200'}>
            {summary.handCount}/{summary.handLimit}
          </span>
          <span className="hidden md:inline">
            · колода {summary.drawPileCount} · сброс {summary.discardCount}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {trailing}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls="player-board-body"
          title={isExpanded ? 'Свернуть планшет — освободить карту' : 'Развернуть планшет'}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-500 hover:text-white"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
    </div>
  );
};
