import React from 'react';
import type { ActionCard, EngineAction, ItemCard, SanitizedGameState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { CardDetailsModal, type CardDetailsTarget } from '../modals/CardDetailsModal';
import { ModalPortal } from '../ui/ModalPortal';
import { HandConfirmModals } from './HandConfirmModals';
import { CardUseModal, type CardUseConfirmation } from './CardUseModal';
import type { HandCardPlayability } from './HandCard';
import { getActionCardUsage } from './actionCardUsage';
import { CardResultModal } from './CardResultModal';
import { buildCardUseResult, type CardUseResult } from './cardUseResultModel';
import type { CardUseRequest } from './cardUsageModel';
import { CombatActionButtons } from '../combat/CombatActionButtons';
import { isActivePlayerInCombat } from '../board/intruderMapModel';
import { buildPlayerBoardSummary, type BoardTab } from './playerBoardModel';
import { PlayerBoardSummaryBar } from './PlayerBoardSummary';
import { BoardCardsSection } from './BoardCardsSection';
import { BoardGearSection } from './BoardGearSection';
import { BoardVitalsSection } from './BoardVitalsSection';
import { WorkshopModal, type WorkshopConfirmation, type WorkshopMode } from '../crafting/WorkshopModal';
import { hasCraftableRecipe } from '../crafting/workshopModel';
import { BoardQuestSection } from '../quests/BoardQuestSection';
import { QuestActivationModal, type QuestActivationConfirmation } from '../quests/QuestActivationModal';
import { buildQuestViews, questProgress, type QuestView } from '../quests/questBoardModel';

interface PlayerHandPanelProps {
  view: SanitizedGameState;
}

interface PendingResult {
  title: string;
  variantLabel: string;
  before: SanitizedGameState;
}

const TAB_LABELS: Record<BoardTab, string> = {
  CARDS: 'Карты',
  GEAR: 'Снаряжение',
  QUESTS: 'Квесты',
  VITALS: 'Состояние',
};

export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [tab, setTab] = React.useState<BoardTab>('CARDS');
  const [prevTurnKey, setPrevTurnKey] = React.useState('');
  const [showPassConfirm, setShowPassConfirm] = React.useState(false);
  const [inspectCardTarget, setInspectCardTarget] = React.useState<CardDetailsTarget | null>(null);
  const [inspectLocation, setInspectLocation] = React.useState<'INVENTORY' | 'HAND_SLOT'>('INVENTORY');
  const [useRequest, setUseRequest] = React.useState<CardUseRequest | null>(null);
  const [pendingResult, setPendingResult] = React.useState<PendingResult | null>(null);
  const [useResult, setUseResult] = React.useState<CardUseResult | null>(null);
  const [workshop, setWorkshop] = React.useState<WorkshopMode | null>(null);
  const [questToActivate, setQuestToActivate] = React.useState<QuestView | null>(null);
  const selectRoom = useGameStore((state) => state.selectRoom);

  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const convertedCardIds = useGameStore((state) => state.convertedCardIds);
  const toggleSelectCard = useGameStore((state) => state.toggleSelectCard);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const convertToEnergy = useGameStore((state) => state.convertToEnergy);
  const refundConvertedCard = useGameStore((state) => state.refundConvertedCard);
  const setShootModalOpen = useGameStore((state) => state.setShootModalOpen);
  const setMeleeModalOpen = useGameStore((state) => state.setMeleeModalOpen);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);

  if (pendingResult && (rejection || view !== pendingResult.before)) {
    setUseResult(
      buildCardUseResult(
        pendingResult.before,
        view,
        pendingResult.title,
        pendingResult.variantLabel,
        rejection ?? undefined,
      ),
    );
    setPendingResult(null);
  }

  const activePlayerId = view.meta.activePlayerId;
  const player = view.players[activePlayerId];
  const currentTurnKey = `${activePlayerId}-${player?.actionsPerformedThisRound ?? 0}`;
  if (currentTurnKey !== prevTurnKey) {
    setPrevTurnKey(currentTurnKey);
    clearSelection();
  }

  if (!player) return null;

  const inCombat = isActivePlayerInCombat(view);
  const summary = buildPlayerBoardSummary(view, player, inCombat);
  const { canAct } = summary;
  const handCards = player.actionDeck.hand;

  const executePass = () => {
    dispatch({ type: 'ACTION_PASS', payload: { discardCardIds: selectedCardIds } });
    clearSelection();
    setShowPassConfirm(false);
  };

  const handlePassClick = () => {
    if (handCards.length > 0 || convertedCardIds.length > 0) {
      setShowPassConfirm(true);
      return;
    }
    executePass();
  };

  const openUseModal = (request: CardUseRequest) => {
    setInspectCardTarget(null);
    setUseRequest(request);
  };

  const openTab = (next: BoardTab) => {
    setTab(next);
    setIsExpanded(true);
  };

  const handleUseConfirm = (request: CardUseRequest, confirmation: CardUseConfirmation) => {
    const before = view;
    const { discardCardIds } = confirmation;
    const action: EngineAction =
      request.kind === 'ACTION'
        ? { type: 'ACTION_PLAY_CARD', payload: { ...confirmation.payload, cardId: request.card.id, discardCardIds } }
        : { type: 'ACTION_USE_ITEM', payload: { ...confirmation.payload, itemId: request.card.id, discardCardIds } };
    dispatch(action);
    discardCardIds.filter((id) => convertedCardIds.includes(id)).forEach(refundConvertedCard);
    setUseRequest(null);
    clearSelection();
    setPendingResult({ title: request.card.name, variantLabel: confirmation.variantLabel, before });
  };

  const handleCraftConfirm = (mode: WorkshopMode, confirmation: WorkshopConfirmation) => {
    const before = view;
    const { discardCardIds, recipeId, componentItemIds } = confirmation;
    dispatch(
      mode.kind === 'CARD'
        ? {
            type: 'ACTION_PLAY_CARD',
            payload: {
              cardId: mode.card.id,
              option: 'CRAFT',
              craftRecipeId: recipeId,
              componentItemIds,
              discardCardIds,
            },
          }
        : { type: 'ACTION_CRAFT_ITEM', payload: { recipeId, componentItemIds, discardCardIds } },
    );
    discardCardIds.filter((id) => convertedCardIds.includes(id)).forEach(refundConvertedCard);
    setWorkshop(null);
    clearSelection();
    setPendingResult({
      title: mode.kind === 'CARD' ? mode.card.name : 'Создание Предмета',
      variantLabel: `Собрать «${confirmation.itemName}»`,
      before,
    });
  };

  const handleQuestConfirm = (quest: QuestView, confirmation: QuestActivationConfirmation) => {
    const before = view;
    dispatch({ type: 'ACTION_ACTIVATE_QUEST', payload: confirmation });
    confirmation.discardCardIds.filter((id) => convertedCardIds.includes(id)).forEach(refundConvertedCard);
    setQuestToActivate(null);
    clearSelection();
    setPendingResult({ title: quest.definition.name, variantLabel: 'Активация квеста', before });
  };

  const playabilityOf = (card: ActionCard): HandCardPlayability => {
    if (!canAct) return { playable: false, reason: 'Сейчас не ваш ход' };
    const variants = getActionCardUsage(card, view).variants;
    if (variants.some((variant) => variant.available)) return { playable: true };
    return { playable: false, reason: variants[0]?.reason };
  };

  const inspectItem = (item: ItemCard, location: 'INVENTORY' | 'HAND_SLOT') => {
    setInspectLocation(location);
    setInspectCardTarget({ kind: 'ITEM', card: item });
  };

  const combatWeaponItemId =
    player.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> =>
        slot.source === 'ITEM' && slot.card.isWeapon && (slot.card.ammo ?? 0) > 0,
    )?.card.id ?? null;

  const questStats = questProgress(buildQuestViews(view));
  const tabCounts: Record<BoardTab, string> = {
    CARDS: String(summary.handCount),
    GEAR: `${summary.occupiedHandSlots + summary.inventoryCount}`,
    VITALS: `${summary.vitals.light + summary.vitals.serious}`,
    QUESTS: `${questStats.active}/${questStats.total}`,
  };

  const trailing = (
    <>
      {canAct && inCombat && (
        <CombatActionButtons onShoot={() => setShootModalOpen(true)} onMelee={() => setMeleeModalOpen(true)} />
      )}
      <button
        type="button"
        disabled={!canAct}
        onClick={handlePassClick}
        title={canAct ? 'Спасовать до конца раунда' : 'Сейчас не ваш ход'}
        className="h-11 rounded-lg border border-red-700/70 bg-red-950/60 px-4 font-heading text-sm font-bold uppercase tracking-wider text-red-100 transition hover:bg-red-900 active:scale-95 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
      >
        Пас{selectedCardIds.length > 0 ? ` · сброс ${selectedCardIds.length}` : ''}
      </button>
    </>
  );

  return (
    <section
      aria-label="Планшет игрока"
      className="relative z-30 shrink-0 border-t border-cyan-500/30 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_-12px_30px_rgba(0,0,0,0.45)]"
    >
      <PlayerBoardSummaryBar
        view={view}
        player={player}
        summary={summary}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((value) => !value)}
        onOpenVitals={() => openTab('VITALS')}
        trailing={trailing}
      />

      {isExpanded && (
        <div id="player-board-body" className="border-t border-slate-800">
          <div role="tablist" aria-label="Разделы планшета" className="flex gap-1 px-3 pt-2 sm:px-4">
            {(Object.keys(TAB_LABELS) as BoardTab[]).map((entry) => (
              <button
                key={entry}
                type="button"
                role="tab"
                id={`board-tab-${entry}`}
                aria-selected={tab === entry}
                aria-controls={`board-panel-${entry}`}
                onClick={() => setTab(entry)}
                className={`flex h-9 items-center gap-1.5 rounded-t-lg border-b-2 px-3 text-xs font-bold uppercase tracking-wider transition ${
                  tab === entry
                    ? 'border-cyan-400 bg-slate-800/70 text-cyan-200'
                    : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {TAB_LABELS[entry]}
                <span className="rounded bg-slate-950 px-1.5 font-mono text-[10px] text-slate-400">
                  {tabCounts[entry]}
                </span>
                {entry === 'QUESTS' && questStats.ready > 0 && (
                  <span className="relative flex h-2 w-2" aria-label="Есть квест, готовый к активации">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`board-panel-${tab}`}
            aria-labelledby={`board-tab-${tab}`}
            className="max-h-[38vh] overflow-y-auto border-t border-slate-800 bg-slate-950/60 px-3 py-3 sm:px-4"
          >
            {tab === 'CARDS' && (
              <BoardCardsSection
                hand={handCards}
                selectedCardIds={selectedCardIds}
                convertedCardIds={convertedCardIds}
                playabilityOf={playabilityOf}
                onToggle={toggleSelectCard}
                onPlay={(card) => openUseModal({ kind: 'ACTION', card })}
                onInspect={setInspectCardTarget}
                onRefund={refundConvertedCard}
                onConvert={convertToEnergy}
                onRefundAll={() => convertedCardIds.forEach((id) => refundConvertedCard(id))}
              />
            )}
            {tab === 'GEAR' && (
              <BoardGearSection
                player={player}
                canAct={canAct}
                onUseItem={(item, location) => openUseModal({ kind: 'ITEM', card: item, location })}
                onInspectItem={inspectItem}
                onInspectObject={(object) => setInspectCardTarget({ kind: 'OBJECT', object })}
                onDiscardHeavy={(handSlotIndex) =>
                  dispatch({ type: 'ACTION_DISCARD_HEAVY_ITEM', payload: { handSlotIndex } })
                }
                onCraft={() => setWorkshop({ kind: 'BASIC' })}
                canCraft={canAct && hasCraftableRecipe(view, false)}
              />
            )}
            {tab === 'QUESTS' && (
              <BoardQuestSection
                view={view}
                canAct={canAct}
                onActivate={setQuestToActivate}
                onShowRoom={(roomId) => selectRoom(roomId)}
              />
            )}
            {tab === 'VITALS' && <BoardVitalsSection player={player} statuses={summary.statuses} />}
          </div>
        </div>
      )}

      <ModalPortal>
        {inspectCardTarget && (
          <CardDetailsModal
            target={inspectCardTarget}
            onClose={() => setInspectCardTarget(null)}
            onPlay={
              inspectCardTarget.kind === 'ACTION'
                ? () => openUseModal({ kind: 'ACTION', card: inspectCardTarget.card })
                : inspectCardTarget.kind === 'ITEM'
                  ? () => openUseModal({ kind: 'ITEM', card: inspectCardTarget.card, location: inspectLocation })
                  : undefined
            }
          />
        )}
        {useRequest && (
          <CardUseModal
            view={view}
            request={useRequest}
            combatWeaponItemId={combatWeaponItemId}
            preferredPaymentIds={[...convertedCardIds, ...selectedCardIds]}
            onConfirm={(confirmation) => handleUseConfirm(useRequest, confirmation)}
            onClose={() => setUseRequest(null)}
            onOpenWorkshop={
              useRequest.kind === 'ACTION'
                ? () => {
                    setWorkshop({ kind: 'CARD', card: useRequest.card });
                    setUseRequest(null);
                  }
                : undefined
            }
          />
        )}
        {questToActivate && (
          <QuestActivationModal
            view={view}
            quest={questToActivate}
            preferredPaymentIds={[...convertedCardIds, ...selectedCardIds]}
            onConfirm={(confirmation) => handleQuestConfirm(questToActivate, confirmation)}
            onClose={() => setQuestToActivate(null)}
          />
        )}
        {workshop && (
          <WorkshopModal
            view={view}
            mode={workshop}
            preferredPaymentIds={[...convertedCardIds, ...selectedCardIds]}
            onConfirm={(confirmation) => handleCraftConfirm(workshop, confirmation)}
            onClose={() => setWorkshop(null)}
          />
        )}
        {useResult && <CardResultModal result={useResult} onClose={() => setUseResult(null)} />}
        <HandConfirmModals
          showPassConfirm={showPassConfirm}
          onCancelPass={() => setShowPassConfirm(false)}
          onConfirmPass={executePass}
          handCardsCount={handCards.length}
          convertedCount={convertedCardIds.length}
        />
      </ModalPortal>
    </section>
  );
};
