import React from 'react';
import type { PendingDecision } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { Package, ArrowRight, Dices } from 'lucide-react';
import { COMBAT_DIE_PRESENTATION } from '../combat/shootPresentation';

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

  if (decision.type === 'CHOOSE_OBJECTIVE') {
    const objectives = view?.players[decision.playerId]?.objectives ?? [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Первый Контакт: выбор Цели"
          className="w-full max-w-lg space-y-4 rounded-xl border border-amber-500/60 bg-slate-900 p-5 shadow-2xl"
        >
          <h2 className="font-heading text-xl tracking-wider text-amber-200">ПЕРВЫЙ КОНТАКТ: ВЫБЕРИТЕ ЦЕЛЬ</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Оставьте одну Цель. Другая удалится из игры втайне от остальных. Контакт продолжится после решений всех
            игроков.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {objectives
              .filter((objective) => decision.objectiveIds.includes(objective.id))
              .map((objective) => (
                <button
                  key={objective.id}
                  onClick={() => handleSelect(objective.id)}
                  className="rounded-lg border border-amber-700 bg-slate-950 p-4 text-left transition hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  <span className="block font-semibold text-amber-100">{objective.name}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-slate-300">{objective.description}</span>
                  <span className="mt-3 block text-xs font-bold text-amber-300">Оставить эту Цель →</span>
                </button>
              ))}
          </div>
        </section>
      </div>
    );
  }

  if (decision.type === 'CHOOSE_EVENT_CARD') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Подготовка: выбор карты Событий"
          className="w-full max-w-2xl space-y-4 rounded-xl border border-violet-500/60 bg-slate-900 p-5 shadow-2xl"
        >
          <h2 className="font-heading text-xl tracking-wider text-violet-200">ПОДГОТОВКА: ВЫБЕРИТЕ КАРТУ СОБЫТИЙ</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            «Подготовка» позволяет вытянуть три карты Событий и разыграть одну из них — её перемещение и эффект
            выполняются немедленно. Две другие отправляются в сброс Событий.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {decision.cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card.id)}
                className="rounded-lg border border-violet-700 bg-slate-950 p-4 text-left transition hover:border-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
              >
                <span className="block font-semibold text-violet-100">{card.name}</span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-violet-400">
                  {card.corridorNumber === 'ANY'
                    ? 'Перемещение Чужих не выполняется'
                    : `Коридор ${card.corridorNumber}`}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-slate-300">{card.description}</span>
                <span className="mt-3 block text-xs font-bold text-violet-300">Разыграть эту карту →</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

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

  if (decision.type === 'CHOOSE_SEARCH_ITEM' || decision.type === 'CHOOSE_STORAGE_ITEM') {
    const isStorage = decision.type === 'CHOOSE_STORAGE_ITEM';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-3">
            <Package size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">
              {isStorage ? 'СКЛАД: ВЫБОР НАЙДЕННОГО ПРЕДМЕТА' : 'ВЫБОР НАЙДЕННОГО ПРЕДМЕТА'}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Вы вытянули 2 карты предметов из колоды {decision.sourceDeck}. Выберите одну карту себе в инвентарь (вторая
            вернётся под низ колоды — shift() верх, push() низ):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decision.cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card.id)}
                className="p-3 text-left rounded-lg bg-slate-800/80 border border-cyan-600/40 hover:border-cyan-400 hover:bg-slate-800 text-white transition flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        card.color === 'RED'
                          ? 'bg-red-500'
                          : card.color === 'YELLOW'
                            ? 'bg-amber-400'
                            : card.color === 'GREEN'
                              ? 'bg-emerald-500'
                              : 'bg-cyan-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">{card.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 leading-snug line-clamp-3">{card.description}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {card.isHeavy ? 'Тяжёлый' : 'Лёгкий'} • Цена: {card.actionCost} • {card.color}
                    {card.componentSymbols.length > 0 ? ` • ${card.componentSymbols.join(', ')}` : ''}
                  </div>
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

  if (decision.type === 'CHOOSE_ENERGY_WEAPON') {
    const activePlayer = view?.players[view.meta.activePlayerId];
    const weaponSlots = activePlayer?.handSlots.filter(
      (s) => s.source === 'ITEM' && decision.weaponIds.includes(s.card.id),
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-3">
            <Package size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">ОРУЖЕЙНАЯ: ВЫБЕРИТЕ ЭНЕРГООРУЖИЕ</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            У вас несколько энергооружий в руках. Выберите, какое зарядить (+2 патрона):
          </p>
          <div className="space-y-2">
            {weaponSlots?.map((slot) => {
              if (slot.source !== 'ITEM') return null;
              return (
                <button
                  key={slot.card.id}
                  onClick={() => handleSelect(slot.card.id)}
                  className="w-full p-3 rounded-lg bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-left transition"
                >
                  <div className="text-xs font-bold text-cyan-200">{slot.card.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Патроны: {slot.card.ammo}/{slot.card.maxAmmo} • {slot.card.description}
                  </div>
                </button>
              );
            })}
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

  if (decision.type === 'REROLL_COMBAT_DIE') {
    const face = COMBAT_DIE_PRESENTATION[decision.firstFace];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400 border-b border-slate-800 pb-3">
            <Dices size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">ПРИЦЕЛЬНЫЙ ОГОНЬ: ПЕРЕБРОС?</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Кубик Боя показал грань — можно один раз перебросить её (стр. 24). Оружие: «{decision.weaponName}», цель уже
            выбрана.
          </p>
          <div
            role="img"
            aria-label={`Выпавшая грань: ${face.label}`}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-slate-950 font-mono text-lg font-bold text-amber-300"
          >
            {face.label}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSelect('REROLL')}
              className="py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase transition"
            >
              Перебросить
            </button>
            <button
              onClick={() => handleSelect('KEEP')}
              className="py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs uppercase transition"
            >
              Оставить грань
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
