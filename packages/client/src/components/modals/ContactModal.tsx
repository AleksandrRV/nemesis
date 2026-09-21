import React from 'react';

import type { GameLogEntry, SanitizedGameState } from '@nemesis/shared';
import { Bug } from 'lucide-react';

import { roomLabel, woundsSummary } from '../log/gameLogModel';
import { useGameStore } from '../../store/gameStore';
import { INTRUDER_TOKEN_LABELS, INTRUDER_TYPE_LABELS } from '../../utils/labels';
import { surpriseOutcomes, surpriseTriggered, type SurpriseResolvedEvent } from './contactModalModel';

function SurpriseBanner({
  outcome,
  playerName,
}: {
  outcome: SurpriseResolvedEvent;
  playerName: string;
}): React.ReactElement {
  const base = 'rounded-lg border px-3 py-2 text-xs leading-relaxed';
  const intruder = INTRUDER_TYPE_LABELS[outcome.intruderType];

  switch (outcome.outcome) {
    case 'MISSED':
      return (
        <div className={`${base} bg-emerald-950/60 border-emerald-600/60 text-emerald-200`}>
          <span className="font-bold uppercase">Внезапная атака — мимо! </span>
          {intruder}: карта «{outcome.attackCardName ?? '—'}» не задела {playerName}.
        </div>
      );

    case 'LARVA_INFECTION':
      return (
        <div className={`${base} bg-red-950/60 border-red-600/60 text-red-200`}>
          <span className="font-bold uppercase">Внезапная атака: заражение! </span>
          Личинка уходит на планшет {playerName}, +1 Заражение.
        </div>
      );

    case 'HIT_DIED':
      return (
        <div className={`${base} bg-red-950/60 border-red-600/60 text-red-200`}>
          <span className="font-bold uppercase">Внезапная атака: гибель! </span>
          {playerName} погибает от карты «{outcome.attackCardName ?? '—'}».
        </div>
      );

    case 'HIT_SURVIVED': {
      const summary = woundsSummary(outcome.lightWoundsDealt, outcome.seriousWoundsDealt, outcome.contaminationDealt);

      return (
        <div className={`${base} bg-amber-950/60 border-amber-500/60 text-amber-200`}>
          <span className="font-bold uppercase">Внезапная атака: попадание! </span>
          {intruder}, карта «{outcome.attackCardName ?? '—'}»{summary ? `: ${summary}` : ' — без ран и Заражения'}.
        </div>
      );
    }
  }
}

interface ContactModalProps {
  entry: GameLogEntry;
  view: SanitizedGameState;
}

export const ContactModal: React.FC<ContactModalProps> = ({ entry, view }) => {
  const dismissContact = useGameStore((state) => state.dismissContact);

  if (entry.event.type !== 'CONTACT_OCCURRED') return null;

  const contact = entry.event;
  const playerName = view.players[contact.playerId]?.name ?? contact.playerId;
  const isBlank = contact.tokenType === 'BLANK';
  const outcomes = surpriseOutcomes(view, contact, entry.sequence);
  const triggered = outcomes.length === 0 && surpriseTriggered(view, contact, entry.sequence);
  const clearedAny = contact.clearedCorridorIds.length > 0 || contact.clearedTechnical;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-red-400 border-b border-slate-800 pb-3">
          <Bug size={20} />
          <h3 className="text-lg font-heading tracking-wider text-white">КОНТАКТ!</h3>
        </div>

        {contact.isFirstContact && (
          <div className="rounded-lg bg-amber-950/60 border border-amber-500/60 px-3 py-2 text-xs font-bold text-amber-200 uppercase tracking-wide">
            Первый Контакт партии
          </div>
        )}

        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-cyan-300">{playerName}</span> в {roomLabel(view, contact.roomId)} вытягивает
          жетон:
        </p>

        <div className="rounded-lg bg-slate-800/80 border border-red-600/40 p-3 text-center space-y-1">
          <div className="text-xl font-bold text-red-300">{INTRUDER_TOKEN_LABELS[contact.tokenType]}</div>
          {!isBlank && (
            <div className="text-[11px] text-slate-400">
              Число Бегства {contact.escapeNumber} • карт на руке: {contact.handCount}
            </div>
          )}
          {isBlank && <div className="text-[11px] text-slate-400">Шум во всех Коридорах отсека, Чужой не появился</div>}
        </div>

        {clearedAny && (
          <p className="text-[11px] text-slate-400">
            Маркеры Шума сброшены{contact.clearedTechnical ? ' (включая Технические Коридоры)' : ''}.
          </p>
        )}

        {!isBlank && outcomes.length === 0 && !triggered && (
          <div className="rounded-lg bg-emerald-950/60 border border-emerald-600/60 px-3 py-2 text-xs text-emerald-200">
            Внезапная атака не сработала: карт на руке хватило.
          </div>
        )}

        {triggered && (
          <div className="rounded-lg bg-amber-950/60 border border-amber-500/60 px-3 py-2 text-xs text-amber-200">
            Внезапная атака разыгрывается…
          </div>
        )}

        {outcomes.map((outcome, index) => (
          <SurpriseBanner key={index} outcome={outcome} playerName={playerName} />
        ))}

        <button
          onClick={() => dismissContact(entry.sequence)}
          className="w-full py-2.5 rounded-lg bg-red-950/60 border border-red-600/60 hover:bg-red-900/80 text-red-200 font-bold text-xs uppercase transition"
        >
          Понятно
        </button>
      </div>
    </div>
  );
};
