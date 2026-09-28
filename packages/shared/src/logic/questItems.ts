import type { EngineAction } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import type { PlayerState, QuestItemState } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { getItemEffectKind } from '../data/itemEffectKinds.js';
import {
  QUEST_ACTIVATION_COST,
  questDefinition,
  questItemCardId,
  type QuestActivation,
  type QuestDefinition,
  type QuestKey,
} from '../data/questItems.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { queueActionCompletion } from './actionCompletion.js';
import { placeItemToPlayer } from './search.js';
import { ASSAULT_RIFLE_NAME } from './shoot.js';
import { discardItemCard } from './cardEffectsShared.js';

export type QuestBlocker = 'ALREADY_ACTIVE' | 'WRONG_ROOM' | 'ROOM_MALFUNCTION' | 'NO_SACRIFICE';

export interface QuestReadiness {
  ready: boolean;
  blocker: QuestBlocker | null;
  sacrificeItemIds: string[];
}

function sacrificeMatches(activation: Extract<QuestActivation, { kind: 'SACRIFICE_ITEM' }>, item: ItemCard): boolean {
  if (item.origin === 'QUEST') return false;
  return activation.itemKinds.includes(getItemEffectKind(item));
}

export function sacrificeCandidates(
  player: Pick<PlayerState, 'inventory' | 'handSlots'>,
  definition: QuestDefinition,
): ItemCard[] {
  const activation = definition.activation;
  if (activation.kind !== 'SACRIFICE_ITEM') return [];
  const owned = [
    ...player.inventory,
    ...player.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : [])),
  ];
  return owned.filter((item) => sacrificeMatches(activation, item));
}

export function questReadiness(
  player: Pick<PlayerState, 'inventory' | 'handSlots'>,
  room: { definitionId: string | null; hasMalfunction: boolean } | undefined,
  quest: Pick<QuestItemState, 'isActivated' | 'questKey'>,
): QuestReadiness {
  const definition = questDefinition(quest.questKey);
  if (quest.isActivated) return { ready: false, blocker: 'ALREADY_ACTIVE', sacrificeItemIds: [] };
  if (definition.activation.kind === 'ROOM') {
    if (room?.definitionId !== definition.activation.roomDefinitionId) {
      return { ready: false, blocker: 'WRONG_ROOM', sacrificeItemIds: [] };
    }
    if (room.hasMalfunction) return { ready: false, blocker: 'ROOM_MALFUNCTION', sacrificeItemIds: [] };
    return { ready: true, blocker: null, sacrificeItemIds: [] };
  }
  const candidates = sacrificeCandidates(player, definition).map((item) => item.id);
  return candidates.length > 0
    ? { ready: true, blocker: null, sacrificeItemIds: candidates }
    : { ready: false, blocker: 'NO_SACRIFICE', sacrificeItemIds: [] };
}

export function buildQuestItemCard(quest: QuestItemState): ItemCard {
  const definition = questDefinition(quest.questKey);
  return {
    id: questItemCardId(quest.id),
    name: definition.name,
    color: 'QUEST',
    origin: 'QUEST',
    isHeavy: false,
    isSingleUse: definition.isSingleUse,
    componentSymbols: [],
    actionCost: definition.actionCost,
    description: definition.itemDescription,
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  };
}

function removeSacrifice(state: GameState, player: PlayerState, itemId: string): ItemCard {
  const inventoryIndex = player.inventory.findIndex((item) => item.id === itemId);
  if (inventoryIndex !== -1) {
    const [item] = player.inventory.splice(inventoryIndex, 1);
    discardItemCard(state, item!);
    return item!;
  }
  const slotIndex = player.handSlots.findIndex((slot) => slot.source === 'ITEM' && slot.card.id === itemId);
  const slot = player.handSlots[slotIndex];
  if (slotIndex === -1 || !slot || slot.source !== 'ITEM') {
    throw new EngineError('NO_ITEMS_LEFT', 'Предмета для сброса нет у Персонажа.');
  }
  player.handSlots.splice(slotIndex, 1);
  discardItemCard(state, slot.card);
  return slot.card;
}

function applyActivationBonus(player: PlayerState, questKey: QuestKey): void {
  if (questKey !== 'AUTOLOADER') return;
  for (const slot of player.handSlots) {
    if (slot.source === 'ITEM' && slot.card.name === ASSAULT_RIFLE_NAME && slot.card.maxAmmo !== null) {
      slot.card.maxAmmo += 1;
    }
  }
}

const BLOCKER_MESSAGES: Record<QuestBlocker, string> = {
  ALREADY_ACTIVE: 'Этот квест уже выполнен.',
  WRONG_ROOM: 'Квест активируется только в указанной комнате.',
  ROOM_MALFUNCTION: 'В комнате стоит Неисправность — её оборудование не работает.',
  NO_SACRIFICE: 'Нет Предмета, который требует квест.',
};

export function executeActivateQuest(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_ACTIVATE_QUEST' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const quest = player.questItems.find((entry) => entry.id === action.payload.questItemId);
  if (!quest) throw new EngineError('INVALID_DECISION_OPTION', 'У Персонажа нет такого Квестового Предмета.');
  const readiness = questReadiness(player, state.ship.rooms[player.roomId], quest);
  if (!readiness.ready) throw new EngineError('CARD_NOT_USABLE_NOW', BLOCKER_MESSAGES[readiness.blocker!]);

  const definition = questDefinition(quest.questKey);
  let sacrificedItemName: string | undefined;
  if (definition.activation.kind === 'SACRIFICE_ITEM') {
    const sacrificeId = action.payload.sacrificeItemId;
    if (!sacrificeId || !readiness.sacrificeItemIds.includes(sacrificeId)) {
      throw new EngineError('INVALID_DECISION_OPTION', `Выберите, что сбросить: ${definition.activation.label}.`);
    }
    executeCardPayment(state, actorId, action.payload.discardCardIds, QUEST_ACTIVATION_COST);
    sacrificedItemName = removeSacrifice(state, player, sacrificeId).name;
  } else {
    executeCardPayment(state, actorId, action.payload.discardCardIds, QUEST_ACTIVATION_COST);
  }

  quest.isActivated = true;
  applyActivationBonus(player, quest.questKey);
  appendGameLog(state, {
    type: 'QUEST_ACTIVATED',
    playerId: actorId,
    questItemId: quest.id,
    questKey: quest.questKey,
    itemName: definition.name,
    ...(sacrificedItemName ? { sacrificedItemName } : {}),
  });
  placeItemToPlayer(state, actorId, buildQuestItemCard(quest));
  queueActionCompletion(state, actorId);
}

export function questKeyOfItem(
  item: Pick<ItemCard, 'id' | 'origin'>,
  player: Pick<PlayerState, 'questItems'>,
): QuestKey | null {
  if (item.origin !== 'QUEST') return null;
  return player.questItems.find((quest) => questItemCardId(quest.id) === item.id)?.questKey ?? null;
}

export function ownsActiveQuestItem(player: PlayerState, questKey: QuestKey): ItemCard | null {
  return player.inventory.find((item) => questKeyOfItem(item, player) === questKey) ?? null;
}
