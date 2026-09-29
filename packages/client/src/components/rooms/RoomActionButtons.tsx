import React from 'react';
import { ArrowLeftRight, Cpu, Info } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { ExchangeModal } from './ExchangeModal';
import { RoomConsoleModal } from './RoomConsoleModal';
import { exchangePartners } from './exchangeModel';
import { getRoomConsole, roomDefinitionOf } from './roomConsoleModel';

const PASSIVE_ROOM_NOTES: Record<string, string> = {
  CABINS: 'Свойство Кают срабатывает само: начав Фазу Игроков здесь без Чужих, вы доберёте до 6 карт.',
  SLIME_ROOM: 'Действия нет: каждый вошедший получает маркер Слизи, Поиск запрещён.',
};

/** Консоль отсека и Обмен для Персонажа в текущей Комнате. */
export const RoomActionButtons: React.FC<{ view: SanitizedGameState; roomId: number }> = ({ view, roomId }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const convertedCardIds = useGameStore((state) => state.convertedCardIds);
  const [open, setOpen] = React.useState<'CONSOLE' | 'EXCHANGE' | null>(null);

  const selfId = view.viewerId;
  const roomConsole = getRoomConsole(view);
  const partners = exchangePartners(view, selfId);
  const definitionId = view.ship.rooms[roomId]?.definitionId ?? null;
  const passiveNote = definitionId ? PASSIVE_ROOM_NOTES[definitionId] : undefined;
  const preferredPaymentIds = [...convertedCardIds, ...selectedCardIds];

  return (
    <>
      {roomConsole && (
        <button
          type="button"
          onClick={() => setOpen('CONSOLE')}
          className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-600 text-xs font-bold text-slate-950 transition hover:bg-cyan-500 active:scale-95"
        >
          <Cpu size={14} aria-hidden="true" />
          {`Консоль: ${roomDefinitionOf(definitionId)?.name ?? 'отсек'} [цена: ${roomConsole.cost}]`}
        </button>
      )}
      {passiveNote && (
        <p className="flex items-start gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-400">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> {passiveNote}
        </p>
      )}
      {partners.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen('EXCHANGE')}
          className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-600/60 bg-emerald-950/40 text-xs font-bold text-emerald-200 transition hover:bg-emerald-900/60 active:scale-95"
        >
          <ArrowLeftRight size={14} aria-hidden="true" /> Обмен с экипажем [цена: 1]
        </button>
      )}
      {open === 'CONSOLE' && roomConsole && (
        <RoomConsoleModal
          view={view}
          roomConsole={roomConsole}
          preferredPaymentIds={preferredPaymentIds}
          onClose={() => setOpen(null)}
          onConfirm={(payload) => {
            setOpen(null);
            clearSelection();
            dispatch({ type: 'ACTION_ROOM_ABILITY', payload });
          }}
        />
      )}
      {open === 'EXCHANGE' && (
        <ExchangeModal
          view={view}
          selfId={selfId}
          preferredPaymentIds={preferredPaymentIds}
          onClose={() => setOpen(null)}
          onConfirm={(transfers, discardCardIds) => {
            setOpen(null);
            clearSelection();
            dispatch({ type: 'ACTION_EXCHANGE', payload: { discardCardIds, transfers } });
          }}
        />
      )}
    </>
  );
};
