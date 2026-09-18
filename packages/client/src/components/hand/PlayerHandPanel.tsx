import React from 'react';
import type { ActionCard, SanitizedGameState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { ChevronUp, ChevronDown, Hand, CheckCircle2, Briefcase } from 'lucide-react';

interface PlayerHandPanelProps {
  view: SanitizedGameState;
}

export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [selectedCardIds, setSelectedCardIds] = React.useState<string[]>([]);
  const [showInventory, setShowInventory] = React.useState(false);
  const [prevTurnKey, setPrevTurnKey] = React.useState<string>('');

  const dispatch = useGameStore((state) => state.dispatch);
  const activePlayerId = view.meta.activePlayerId;
  const player = view.players[activePlayerId];

  const currentTurnKey = `${activePlayerId}-${player?.actionsPerformedThisRound ?? 0}`;
  if (currentTurnKey !== prevTurnKey) {
    setPrevTurnKey(currentTurnKey);
    setSelectedCardIds([]);
  }

  if (!player) return null;

  const handCards = player.actionDeck.hand;
  const handLimit = 5; // базовый предел
  const isMyTurn = view.meta.activePlayerId === player.id;
  const canAct = isMyTurn && !player.hasPassed && view.meta.phase === 'PLAYER_PHASE';

  const toggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handlePass = () => {
    // Пас со сбросом выбранных карт (включая Заражение)
    dispatch({
      type: 'ACTION_PASS',
      payload: {
        discardCardIds: selectedCardIds,
      },
    });
    setSelectedCardIds([]);
  };

  return (
    <aside
      aria-label="Панель руки игрока"
      className="absolute bottom-10 left-0 right-0 z-40 flex flex-col bg-slate-950/95 border-t border-cyan-500/30 backdrop-blur-md shadow-2xl transition-all"
    >
      {/* Шапка руки */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Hand size={16} />
            <span className="text-xs font-bold tracking-wider uppercase">РУКА ИГРОКА</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {handCards.length} / {handLimit}
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Колода: {player.actionDeck.drawPileCount} • Сброс: {player.actionDeck.discardCount}
          </span>
          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />
          <span className="text-xs font-bold text-amber-400">
            Действий в этом ходу: {player.actionsPerformedThisRound} / 2
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Кнопка показа снаряжения / инвентаря */}
          <button
            type="button"
            onClick={() => setShowInventory((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition border ${
              showInventory
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Briefcase size={13} />
            <span>Инвентарь</span>
          </button>

          {/* Свернуть/развернуть */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title={isOpen ? 'Свернуть' : 'Развернуть'}
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </header>

      {/* Выдвижная панель инвентаря */}
      {showInventory && (
        <div className="bg-slate-900/90 border-b border-slate-800 p-3 flex flex-wrap gap-4 text-xs">
          {/* Слоты рук */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Слоты рук (макс 2):</span>
            <div className="flex gap-2">
              {[0, 1].map((idx) => {
                const slot = player.handSlots[idx];
                return (
                  <div
                    key={idx}
                    className="w-40 h-14 rounded border border-slate-700 bg-slate-950/70 p-1.5 flex flex-col justify-between"
                  >
                    {slot ? (
                      slot.source === 'ITEM' ? (
                        <>
                          <div className="font-bold text-cyan-300 truncate text-[11px]">{slot.card.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {slot.card.isWeapon
                              ? `Оружие • Патроны: ${slot.card.ammo}/${slot.card.maxAmmo}`
                              : 'Тяжёлый предмет'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-amber-300 truncate text-[11px]">
                            {slot.object.kind === 'CORPSE'
                              ? 'Труп'
                              : slot.object.kind === 'EGG'
                                ? 'Яйцо Чужих'
                                : 'Останки'}
                          </div>
                          <div className="text-[10px] text-slate-400">Тяжёлый объект</div>
                        </>
                      )
                    ) : (
                      <span className="text-slate-600 italic text-[11px] m-auto">Свободная рука</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Инвентарь предметов */}
          <div className="space-y-1 flex-1 min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Карманные предметы ({player.inventory?.length ?? 0}):
            </span>
            <div className="flex flex-wrap gap-2">
              {player.inventory && player.inventory.length > 0 ? (
                player.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.color === 'RED'
                          ? 'bg-red-500'
                          : item.color === 'YELLOW'
                            ? 'bg-amber-400'
                            : item.color === 'GREEN'
                              ? 'bg-emerald-500'
                              : 'bg-cyan-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs py-1">Нет предметов</span>
              )}
            </div>
          </div>

          {/* Травмы */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Здоровье / Травмы:</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-rose-300">
                Лёгкие раны: <b>{player.lightWounds} / 2</b>
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-red-400">
                Тяжёлые травмы: <b>{player.seriousWounds.length} / 3</b>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Карты в руке и кнопки действий */}
      {isOpen && (
        <div className="p-3 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between overflow-x-auto">
          {/* Сетка карт руки */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
            {handCards.map((card) => {
              const isContamination = !('characterClass' in card);
              const isSelected = selectedCardIds.includes(card.id);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleSelectCard(card.id)}
                  className={`w-32 h-28 shrink-0 rounded-lg p-2.5 text-left border flex flex-col justify-between transition-all select-none relative ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_15px_rgba(6,182,212,0.4)] -translate-y-1'
                      : isContamination
                        ? 'border-purple-800/60 bg-purple-950/40 hover:border-purple-600'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isContamination ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-cyan-300'
                        }`}
                      >
                        {isContamination ? 'Заражение' : `Цена: ${(card as ActionCard).playCost}`}
                      </span>
                      {isSelected && <CheckCircle2 size={13} className="text-cyan-400" />}
                    </div>

                    <div className="text-xs font-bold text-white line-clamp-1 leading-snug">
                      {isContamination ? 'Карта Заражения' : (card as ActionCard).name}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {isContamination
                      ? card.isScanned
                        ? card.isInfected
                          ? 'ИНФЕКЦИЯ ОБНАРУЖЕНА'
                          : 'Стерильно'
                        : 'Не просканировано'
                      : (card as ActionCard).description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Панель управления ходом / оплатой */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">
                Выбрано для сброса: <b className="text-cyan-300">{selectedCardIds.length}</b>
              </div>
              <div className="text-[10px] text-slate-500">
                {selectedCardIds.length > 0 ? 'Карты пойдут на оплату действия' : 'Выберите карты при необходимости'}
              </div>
            </div>

            {/* Кнопка Паса */}
            <button
              type="button"
              disabled={!canAct}
              onClick={handlePass}
              className={`min-h-[44px] px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition border ${
                canAct
                  ? 'bg-red-950/50 hover:bg-red-900/80 border-red-700/60 text-red-200 active:scale-95'
                  : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              Пас {selectedCardIds.length > 0 ? `(сброс: ${selectedCardIds.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
