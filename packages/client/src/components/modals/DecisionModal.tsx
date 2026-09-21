import React from 'react';
import type { PendingDecision } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { Package, ArrowRight, Crosshair } from 'lucide-react';
import { COMBAT_DIE_FACE_LABELS } from '../../utils/labels';

interface DecisionModalProps {
  decision: PendingDecision;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({ decision }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const view = useGameStore((state) => state.view);

  const handleSelect = (selectedOption: string) => {
    dispatch({
      type: 'ACTION_RESOLVE_DECISION',
      payload: {
        decisionId: decision.id,
        selectedOption,
      },
    });
  };

  if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-3">
            <Package size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">ВЫБОР КОЛОДЫ ДЛЯ ПОИСКА</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Белый отсек позволяет обыскать любую из трёх стандартных колод предметов. Выберите колоду:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSelect('RED')}
              className="py-3 px-2 rounded-lg bg-red-950/60 border border-red-600/60 hover:bg-red-900/80 text-red-200 font-bold text-xs uppercase transition flex flex-col items-center gap-1.5"
            >
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Военная
            </button>
            <button
              onClick={() => handleSelect('YELLOW')}
              className="py-3 px-2 rounded-lg bg-amber-950/60 border border-amber-500/60 hover:bg-amber-900/80 text-amber-200 font-bold text-xs uppercase transition flex flex-col items-center gap-1.5"
            >
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              Техническая
            </button>
            <button
              onClick={() => handleSelect('GREEN')}
              className="py-3 px-2 rounded-lg bg-emerald-950/60 border border-emerald-600/60 hover:bg-emerald-900/80 text-emerald-200 font-bold text-xs uppercase transition flex flex-col items-center gap-1.5"
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Медицинская
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (decision.type === 'CHOOSE_SEARCH_ITEM') {
    // Карты из drawnCardIds
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-3">
            <Package size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">ВЫБОР НАЙДЕННОГО ПРЕДМЕТА</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Вы вытянули 2 карты предметов из колоды {decision.sourceDeck}. Выберите одну карту себе в инвентарь (вторая
            вернётся под низ колоды):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decision.drawnCardIds.map((cardId) => (
              <button
                key={cardId}
                onClick={() => handleSelect(cardId)}
                className="p-3 text-left rounded-lg bg-slate-800/80 border border-cyan-600/40 hover:border-cyan-400 hover:bg-slate-800 text-white transition flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">{cardId}</div>
                  <div className="text-[11px] text-slate-400">Нажмите, чтобы забрать этот предмет</div>
                </div>
                <div className="flex items-center text-xs text-cyan-400 font-semibold gap-1 pt-1 border-t border-slate-700/60">
                  <span>Выбрать</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (decision.type === 'DISCARD_HEAVY_ITEM_FOR_NEW') {
    const activePlayer = view?.players[view.meta.activePlayerId];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400 border-b border-slate-800 pb-3">
            <Package size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">РУКИ ЗАНЯТЫ: ВЫБЕРИТЕ СБРОС</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Обе руки заняты тяжёлыми предметами или объектами. Чтобы взять новый тяжёлый предмет (ID:{' '}
            {decision.newItemId}), выберите, какой из текущих предметов сбросить:
          </p>
          <div className="space-y-2">
            {activePlayer?.handSlots.map((slot, index) => {
              const name = slot.source === 'ITEM' ? slot.card.name : `Объект: ${slot.object.kind}`;
              const id = slot.source === 'ITEM' ? slot.card.id : slot.object.id;
              return (
                <button
                  key={index}
                  onClick={() => handleSelect(id)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-600/50 text-left text-xs text-white transition flex items-center justify-between"
                >
                  <span>{name}</span>
                  <span className="text-red-400 font-semibold text-[10px] uppercase">Сбросить</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (decision.type === 'CHOOSE_AIMED_REROLL') {
    const firstLabel = COMBAT_DIE_FACE_LABELS[decision.firstFace];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-orange-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-orange-400 border-b border-slate-800 pb-3">
            <Crosshair size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">ПРИЦЕЛЬНЫЙ ОГОНЬ: ПЕРЕБРОС?</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Первая грань кубика Боя: <b className="text-white">{firstLabel}</b>. Оставить результат или перебросить
            кубик один раз?
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleSelect('KEEP')}
              className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Оставить: {firstLabel}
            </button>
            <button
              onClick={() => handleSelect('REROLL')}
              className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase transition"
            >
              Перебросить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
