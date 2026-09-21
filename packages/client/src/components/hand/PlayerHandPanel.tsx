import React from 'react';
import type { ActionCard, SanitizedGameState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import {
  ChevronUp,
  ChevronDown,
  Hand,
  CheckCircle2,
  Briefcase,
  Zap,
  RotateCcw,
  Play,
  AlertCircle,
  HeartPulse,
  Info,
  Check,
  X,
} from 'lucide-react';
import { CardDetailsModal, type CardDetailsTarget } from '../modals/CardDetailsModal';
import {
  CardTargetingForm,
  defaultCardSelection,
  isSelectionComplete,
  isTargetedCombatCard,
  type CardTargetSelection,
} from './CardTargetingForm';

interface PlayerHandPanelProps {
  view: SanitizedGameState;
}

export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [showInventory, setShowInventory] = React.useState(false);
  const [prevTurnKey, setPrevTurnKey] = React.useState<string>('');
  const [showPassConfirm, setShowPassConfirm] = React.useState(false);
  const [inspectCardTarget, setInspectCardTarget] = React.useState<CardDetailsTarget | null>(null);

  // Состояние подтверждения разыгрывания выбранной карты
  const [pendingPlayCard, setPendingPlayCard] = React.useState<ActionCard | null>(null);
  const [cardTargets, setCardTargets] = React.useState<CardTargetSelection>({});

  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const convertedCardIds = useGameStore((state) => state.convertedCardIds);
  const toggleSelectCard = useGameStore((state) => state.toggleSelectCard);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const convertToEnergy = useGameStore((state) => state.convertToEnergy);
  const refundConvertedCard = useGameStore((state) => state.refundConvertedCard);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const dispatch = useGameStore((state) => state.dispatch);

  const activePlayerId = view.meta.activePlayerId;
  const player = view.players[activePlayerId];

  const currentTurnKey = `${activePlayerId}-${player?.actionsPerformedThisRound ?? 0}`;
  if (currentTurnKey !== prevTurnKey) {
    setPrevTurnKey(currentTurnKey);
    clearSelection();
    setPendingPlayCard(null);
    setCardTargets({});
  }

  if (!player) return null;

  const handCards = player.actionDeck.hand;
  const handLimit = 5; // базовый предел
  const isMyTurn = view.meta.activePlayerId === player.id;
  const canAct = isMyTurn && !player.hasPassed && view.meta.phase === 'PLAYER_PHASE';

  const handlePassClick = () => {
    if (handCards.length > 0 || convertedCardIds.length > 0) {
      setShowPassConfirm(true);
      return;
    }
    executePass();
  };

  const executePass = () => {
    dispatch({
      type: 'ACTION_PASS',
      payload: {
        discardCardIds: selectedCardIds,
      },
    });
    clearSelection();
    setShowPassConfirm(false);
    setPendingPlayCard(null);
  };

  const openPlayConfirm = (card: ActionCard) => {
    setPendingPlayCard(card);
    setCardTargets(defaultCardSelection(card.id, view, activePlayerId));
  };

  const executePlayCard = (card: ActionCard) => {
    const discardCardIds = card.playCost > 0 ? consumePaymentCards(card.playCost) : [];
    dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: card.id,
        discardCardIds,
        ...cardTargets,
      },
    });
    setPendingPlayCard(null);
    setCardTargets({});
    clearSelection();
  };

  const handleUseItem = (itemId: string, actionCost: number) => {
    const discardCardIds = actionCost > 0 ? consumePaymentCards(actionCost) : [];
    dispatch({
      type: 'ACTION_USE_ITEM',
      payload: {
        itemId,
        discardCardIds,
      },
    });
    clearSelection();
  };

  return (
    <aside
      aria-label="Панель руки игрока"
      className="absolute bottom-10 left-0 right-0 z-40 flex flex-col bg-slate-950/95 border-t border-cyan-500/30 backdrop-blur-md shadow-2xl transition-all"
    >
      {/* Модальное окно полной информации о карте / предмете */}
      {inspectCardTarget && (
        <CardDetailsModal
          target={inspectCardTarget}
          onClose={() => setInspectCardTarget(null)}
          onPlay={
            inspectCardTarget.kind === 'ACTION'
              ? () => openPlayConfirm(inspectCardTarget.card)
              : inspectCardTarget.kind === 'ITEM'
                ? () => handleUseItem(inspectCardTarget.card.id, inspectCardTarget.card.actionCost)
                : undefined
          }
        />
      )}

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
          {convertedCardIds.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 flex items-center gap-1">
              <Zap size={12} /> Очки действия: {convertedCardIds.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Статус здоровья в свёрнутом состоянии (символическое отображение) */}
          {!showInventory && (
            <div className="flex items-center gap-2 mr-2">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[11px]"
                title="Лёгкие раны (макс 2)"
              >
                <HeartPulse size={12} className={player.lightWounds > 0 ? 'text-rose-400' : 'text-slate-500'} />
                <span className={player.lightWounds > 0 ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                  Раны: {player.lightWounds}/2
                </span>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[11px]"
                title="Тяжёлые травмы (макс 3)"
              >
                <AlertCircle
                  size={12}
                  className={player.seriousWounds.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500'}
                />
                <span className={player.seriousWounds.length > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                  Травмы: {player.seriousWounds.length}/3
                </span>
              </div>
            </div>
          )}

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
            <span>Инвентарь ({player.inventory?.length ?? 0})</span>
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
                    className="w-48 h-16 rounded border border-slate-700 bg-slate-950/70 p-2 flex flex-col justify-between relative group"
                  >
                    {slot ? (
                      slot.source === 'ITEM' ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 truncate text-xs">{slot.card.name}</span>
                            <button
                              type="button"
                              onClick={() => setInspectCardTarget({ kind: 'ITEM', card: slot.card })}
                              className="text-slate-400 hover:text-cyan-300 p-0.5"
                              title="Инфо о предмете"
                            >
                              <Info size={13} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {slot.card.isWeapon
                                ? `Оружие • Патроны: ${slot.card.ammo}/${slot.card.maxAmmo}`
                                : 'Тяжёлый предмет'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUseItem(slot.card.id, slot.card.actionCost)}
                              className="text-cyan-400 hover:text-cyan-300 font-bold underline"
                            >
                              Исп. [{slot.card.actionCost}]
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-amber-300 truncate text-xs">
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
          <div className="space-y-1 flex-1 min-w-[240px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Карманные предметы ({player.inventory?.length ?? 0}):
            </span>
            <div className="flex flex-wrap gap-2">
              {player.inventory && player.inventory.length > 0 ? (
                player.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 flex items-center gap-2 group"
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
                    <span className="font-semibold">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => setInspectCardTarget({ kind: 'ITEM', card: item })}
                      className="text-slate-400 hover:text-cyan-300 p-0.5 ml-1"
                      title="Подробнее"
                    >
                      <Info size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseItem(item.id, item.actionCost)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/50"
                      title={`Использовать за ${item.actionCost} очков/карт`}
                    >
                      Исп. [{item.actionCost}]
                    </button>
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
        <div className="p-3 pt-4 pb-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between overflow-x-auto min-h-[160px]">
          {/* Сетка карт руки */}
          <div className="flex items-center gap-3 overflow-x-auto pt-4 pb-2 px-1">
            {handCards.map((card) => {
              const isContamination = !('characterClass' in card);
              const isSelected = selectedCardIds.includes(card.id);
              const isConverted = convertedCardIds.includes(card.id);

              return (
                <div key={card.id} className="relative flex flex-col items-center shrink-0">
                  {/* Кнопка "Инфо" для просмотра всей информации о карте */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isContamination) {
                        setInspectCardTarget({
                          kind: 'CONTAMINATION',
                          card: card as Extract<typeof card, { isInfected: boolean }>,
                        });
                      } else {
                        setInspectCardTarget({ kind: 'ACTION', card: card as ActionCard });
                      }
                    }}
                    className="absolute -top-2 right-1 z-20 p-1 rounded-full bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700 shadow transition"
                    title="Полная информация о карте"
                  >
                    <Info size={12} />
                  </button>

                  {/* Карточка */}
                  <button
                    type="button"
                    disabled={isConverted}
                    onClick={() => toggleSelectCard(card.id)}
                    className={`w-36 h-32 rounded-xl p-3 text-left border flex flex-col justify-between transition-all select-none relative ${
                      isConverted
                        ? 'border-emerald-700/60 bg-emerald-950/40 opacity-70 cursor-not-allowed'
                        : isSelected
                          ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_20px_rgba(6,182,212,0.45)] -translate-y-2'
                          : isContamination
                            ? 'border-purple-800/60 bg-purple-950/40 hover:border-purple-600'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1 pr-4">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isConverted
                              ? 'bg-emerald-900 text-emerald-200'
                              : isContamination
                                ? 'bg-purple-900/80 text-purple-200'
                                : 'bg-slate-800 text-cyan-300'
                          }`}
                        >
                          {isConverted
                            ? 'В резерве'
                            : isContamination
                              ? 'Заражение'
                              : `Цена: ${(card as ActionCard).playCost}`}
                        </span>
                        {isSelected && !isConverted && <CheckCircle2 size={14} className="text-cyan-400" />}
                        {isConverted && <Zap size={14} className="text-emerald-400" />}
                      </div>

                      <div className="text-xs font-bold text-white line-clamp-1 leading-snug">
                        {isContamination ? 'Карта Заражения' : (card as ActionCard).name}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {isConverted ? (
                        <div className="flex items-center justify-between text-emerald-300">
                          <span>Очко действия</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              refundConvertedCard(card.id);
                            }}
                            className="text-[9px] underline hover:text-white cursor-pointer"
                          >
                            Вернуть
                          </span>
                        </div>
                      ) : isContamination ? (
                        card.isScanned ? (
                          card.isInfected ? (
                            'ИНФЕКЦИЯ ОБНАРУЖЕНА'
                          ) : (
                            'Стерильно'
                          )
                        ) : (
                          'Не просканировано'
                        )
                      ) : (
                        (card as ActionCard).description
                      )}
                    </div>
                  </button>

                  {/* Кнопка «Применить» снизу карты в освободившемся месте после сдвига вверх */}
                  {isSelected && selectedCardIds.length === 1 && !isConverted && !isContamination && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlayConfirm(card as ActionCard);
                      }}
                      className="mt-1 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] py-1 rounded-lg shadow-lg flex items-center justify-center gap-1 active:scale-95 transition animate-in fade-in slide-in-from-top-1"
                    >
                      <Play size={11} fill="currentColor" /> Применить
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Панель управления ходом / оплатой */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            {/* Кнопка конвертации в очки действия */}
            {selectedCardIds.length > 0 && (
              <button
                type="button"
                onClick={convertToEnergy}
                className="min-h-[44px] px-3.5 rounded-lg font-bold text-xs uppercase tracking-wider transition border bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-600/70 text-emerald-200 active:scale-95 flex items-center gap-1.5"
                title="Конвертировать выбранные карты в очки действия"
              >
                <Zap size={15} />
                <span>В очки действия ({selectedCardIds.length})</span>
              </button>
            )}

            {/* Кнопка отмены конвертации всех очков, если они есть */}
            {convertedCardIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  convertedCardIds.forEach((id) => refundConvertedCard(id));
                }}
                className="min-h-[44px] px-2.5 rounded-lg font-semibold text-xs transition border bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 flex items-center gap-1"
                title="Вернуть все очки действия обратно в карты"
              >
                <RotateCcw size={14} />
                <span>Отмена ({convertedCardIds.length})</span>
              </button>
            )}

            {/* Кнопка Паса */}
            <button
              type="button"
              disabled={!canAct}
              onClick={handlePassClick}
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

      {/* Панель подтверждения разыгрывания действия карты (без системного alert) */}
      {pendingPlayCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Play size={18} fill="currentColor" />
                <h3 className="text-base font-heading tracking-wider text-white uppercase">
                  Действие: «{pendingPlayCard.name}»
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingPlayCard(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Эффект карты:
              </span>
              {pendingPlayCard.description}
            </div>

            {isTargetedCombatCard(pendingPlayCard.id) && (
              <CardTargetingForm
                cardId={pendingPlayCard.id}
                view={view}
                playerId={activePlayerId}
                selection={cardTargets}
                onSelectionChange={setCardTargets}
              />
            )}

            {pendingPlayCard.playCost > 0 && (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 p-2.5 rounded-lg flex items-center gap-2">
                <Zap size={14} className="shrink-0" />
                <span>
                  Для розыгрыша требуется сбросить <b>{pendingPlayCard.playCost}</b> карт(ы) / очков действия.
                </span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingPlayCard(null)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => executePlayCard(pendingPlayCard)}
                disabled={!isSelectionComplete(pendingPlayCard.id, cardTargets)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition ${isSelectionComplete(pendingPlayCard.id, cardTargets) ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
              >
                <Check size={14} /> Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения Паса */}
      {showPassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-red-600/60 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 border-b border-slate-800 pb-3">
              <AlertCircle size={20} />
              <h3 className="text-lg font-heading tracking-wider text-white">ПОДТВЕРЖДЕНИЕ ПАСА</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              У вас ещё остались карты на руке ({handCards.length}) или неиспользованные очки действия (
              {convertedCardIds.length}). Вы уверены, что хотите завершить участие в текущем раунде?
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPassConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={executePass}
                className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase transition"
              >
                Спасовать
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
