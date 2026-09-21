import React from 'react';
import type { GameLogEvent, RoomId } from '@nemesis/shared';
import { Swords, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { INTRUDER_TYPE_LABELS } from '../../utils/labels';
import { roomIntruders } from '../../utils/roomIntruders';
import { CombatResultView } from './CombatResultView';

interface MeleeModalProps {
  roomId: RoomId;
  onClose: () => void;
}

/**
 * Модалка Рукопашной Атаки [1] (стр. 19): выбор цели, затем результат атаки
 * из журнала партии. Оружие не требуется, но цена неизбежна: +1 Заражение
 * в сброс всегда и +1 Тяжёлая Травма при промахе — бейджи предупреждают.
 */
export const MeleeModal: React.FC<MeleeModalProps> = ({ roomId, onClose }) => {
  const view = useGameStore((state) => state.view);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);

  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);
  const [logStart, setLogStart] = React.useState<number | null>(null);

  if (!view) return null;

  const targets = roomIntruders(view, roomId);
  const resultEvents: GameLogEvent[] =
    logStart === null ? [] : view.gameLog.slice(logStart).map((entry) => entry.event);

  const handleAttack = () => {
    if (selectedTarget === null) return;

    const discardCardIds = consumePaymentCards(1);
    setLogStart(view.gameLog.length);
    dispatch({
      type: 'ACTION_MELEE',
      payload: { targetIntruderId: selectedTarget, discardCardIds },
    });
  };

  const handleAgain = () => {
    setLogStart(null);
    setSelectedTarget(null);
  };

  const hasPaymentSelected = selectedCardIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-orange-500/50 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 text-orange-400 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">РУКОПАШНАЯ АТАКА</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {logStart === null ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-950/60 border border-amber-500/60 text-amber-300">
                +1 Заражение
              </span>
              <span className="px-2 py-1 rounded text-[11px] font-bold bg-rose-950/60 border border-rose-500/60 text-rose-300">
                Риск Тяжёлой Травмы при промахе
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Цель в отсеке:</p>
              {targets.length === 0 && <p className="text-xs text-slate-500">Целей в отсеке не осталось.</p>}
              <div className="flex flex-col gap-1.5">
                {targets.map((target) => {
                  const isSelected = selectedTarget === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedTarget(target.id)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
                        isSelected ? 'bg-orange-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{INTRUDER_TYPE_LABELS[target.type]}</span>
                      <span>Ран: {target.woundsCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!hasPaymentSelected && (
              <p className="text-xs text-amber-300">Выберите 1 карту оплаты в руке: без неё атака будет отклонена.</p>
            )}

            <button
              type="button"
              disabled={selectedTarget === null}
              onClick={handleAttack}
              className="w-full min-h-[40px] bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg text-sm active:scale-95 transition"
            >
              Атаковать [цена: 1]
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {resultEvents.length === 0 && !rejection && (
              <p className="text-xs text-slate-400">Результат обрабатывается…</p>
            )}

            {resultEvents.length === 0 && rejection && (
              <div className="space-y-3">
                <p className="text-xs text-rose-400">Атака отклонена: {rejection}</p>
                <button
                  type="button"
                  onClick={handleAgain}
                  className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                >
                  Назад к выбору
                </button>
              </div>
            )}

            <CombatResultView view={view} events={resultEvents} />

            {resultEvents.length > 0 && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAgain}
                  className="flex-1 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                >
                  Ещё атака [цена: 1]
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[36px] bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
