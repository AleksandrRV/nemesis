import { queueActionCompletion } from './actionCompletion.js';
import type { EngineAction } from '../types/actions.js';
import type { ActionDeckCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { advanceTurnWithoutFire, applyFireEndTurnEffect } from './turnCycle.js';
import { EngineError } from './engineErrors.js';

export function executePass(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PASS' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  // Обычный пас (стр. 10, 28): игрок объявляет пас и имеет право
  // сбросить любое количество карт с руки (как карт Действий, так и карт Заражения).
  const discardIds = action.payload.discardCardIds ?? [];
  if (discardIds.length > 0) {
    const uniqueIds = new Set(discardIds);
    if (uniqueIds.size !== discardIds.length) {
      throw new EngineError('PAYMENT_CARD_DUPLICATE', 'Переданы повторяющиеся карты для сброса при пасе');
    }
    const handCardIds = new Set(player.actionDeck.hand.map((c) => c.id));
    for (const cardId of discardIds) {
      if (!handCardIds.has(cardId)) {
        throw new EngineError('PAYMENT_CARD_NOT_IN_HAND', 'Одной или нескольких сбрасываемых карт нет в руке');
      }
    }
    const remainingHand: ActionDeckCard[] = [];
    for (const card of player.actionDeck.hand) {
      if (uniqueIds.has(card.id)) {
        player.actionDeck.discard.push(card);
      } else {
        remainingHand.push(card);
      }
    }
    player.actionDeck.hand = remainingHand;
  }

  // Шаг 4, долг 9: огонь на Пас — явно вызываем до блокировки, чтобы sufferLightWounds убил до смены activePlayerId
  applyFireEndTurnEffect(state, actorId);

  // Если игрок умер от огня, killPlayer уже выставил hasPassed=true
  if (!player.isDead) {
    player.hasPassed = true;
  }

  appendGameLog(state, {
    type: 'PLAYER_PASSED',
    playerId: actorId,
    discardedCount: discardIds.length,
  });
  advanceTurnWithoutFire(state, actorId);
  return;
}

export function executePlayCard(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PLAY_CARD' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const cardIndex = player.actionDeck.hand.findIndex((c) => c.id === action.payload.cardId);
  if (cardIndex === -1) {
    throw new EngineError('INSUFFICIENT_ACTION_CARDS', 'Разыгрываемой карты нет в руке');
  }
  const card = player.actionDeck.hand[cardIndex]!;
  if (!('characterClass' in card)) {
    throw new EngineError('CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST', 'Карту Заражения нельзя разыграть');
  }
  // Оплата стоимости карты (playCost)
  if (card.playCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], card.playCost, card.id);
  }
  // Удаляем сыгранную карту из руки и кладём в личный сброс
  player.actionDeck.hand.splice(
    player.actionDeck.hand.findIndex((entry) => entry.id === card.id),
    1,
  );
  player.actionDeck.discard.push(card);
  // Применяем специфический эффект базовых карт, если есть
  if (card.id.includes('RELOAD')) {
    // Пополнение патронов для оружия в руке
    const weaponSlot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.isWeapon);
    if (weaponSlot && weaponSlot.source === 'ITEM') {
      weaponSlot.card.ammo = Math.min((weaponSlot.card.ammo ?? 0) + 1, weaponSlot.card.maxAmmo ?? 6);
    }
  } else if (card.id.includes('REST') || card.name === 'Отдых') {
    // Просканировать карты Заражения в руке и удалить чистые
    const nextHand: ActionDeckCard[] = [];
    for (const c of player.actionDeck.hand) {
      if (!('characterClass' in c)) {
        c.isScanned = true;
        if (c.isInfected) {
          // Заражена - остаётся
          nextHand.push(c);
        }
        // Чистая отбрасывается
      } else {
        nextHand.push(c);
      }
    }
    player.actionDeck.hand = nextHand;
  } else if (card.id.includes('REPAIR')) {
    // Ремонт отсека
    const currentRoom = state.ship.rooms[player.roomId];
    if (currentRoom) {
      currentRoom.hasMalfunction = false;
    }
  } else if (card.id.includes('DEMOLITION') && action.payload.targetCorridorId) {
    const corridor = state.ship.corridors[action.payload.targetCorridorId];
    if (corridor) {
      corridor.doorState = 'DESTROYED';
    }
  }
  appendGameLog(state, {
    type: 'ACTION_CARD_PLAYED',
    playerId: actorId,
    cardId: card.id,
    cardName: card.name,
  });
  queueActionCompletion(state, actorId);
  return;
}

export function executeUseItem(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_USE_ITEM' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const itemIndex = player.inventory.findIndex((it) => it.id === action.payload.itemId);
  let foundItem: ItemCard | null = null;
  if (itemIndex > -1) {
    foundItem = player.inventory[itemIndex] ?? null;
    if (foundItem?.isSingleUse) {
      player.inventory.splice(itemIndex, 1);
    }
  } else {
    const handSlotIndex = player.handSlots.findIndex((s) => s.source === 'ITEM' && s.card.id === action.payload.itemId);
    if (handSlotIndex > -1) {
      const slot = player.handSlots[handSlotIndex];
      if (slot && slot.source === 'ITEM') {
        foundItem = slot.card;
        if (foundItem.isSingleUse) {
          player.handSlots.splice(handSlotIndex, 1);
        }
      }
    }
  }
  if (!foundItem) {
    throw new EngineError('NO_ITEMS_LEFT', 'Предмет не найден в инвентаре или слотах рук');
  }
  // Оплата стоимости предмета
  if (foundItem.actionCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], foundItem.actionCost);
  }
  // Эффекты предметов
  if (foundItem.id.includes('BANDAGES') || foundItem.id.includes('MEDKIT')) {
    if (player.lightWounds > 0) {
      player.lightWounds = 0;
    } else if (player.seriousWounds.length > 0) {
      player.seriousWounds.pop();
    }
  } else if (foundItem.id.includes('ALCOHOL')) {
    const contamIndex = player.actionDeck.hand.findIndex((c) => !('characterClass' in c));
    if (contamIndex > -1) {
      player.actionDeck.hand.splice(contamIndex, 1);
    }
  } else if (foundItem.id.includes('ENERGY_CHARGE')) {
    const weaponSlot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.isWeapon);
    if (weaponSlot && weaponSlot.source === 'ITEM') {
      weaponSlot.card.ammo = weaponSlot.card.maxAmmo;
    }
  } else if (foundItem.id.includes('SYNTHETIC_FOOD')) {
    // Взять 2 карты
    for (let i = 0; i < 2; i++) {
      if (player.actionDeck.drawPile.length > 0) {
        player.actionDeck.hand.push(player.actionDeck.drawPile.pop()!);
      }
    }
  } else if (foundItem.id.includes('CLOTHES')) {
    player.hasSlime = false;
  } else if (foundItem.id.includes('FIRE_EXTINGUISHER')) {
    const currentRoom = state.ship.rooms[player.roomId];
    if (currentRoom) {
      currentRoom.hasFire = false;
    }
  } else if (foundItem.id.includes('TOOLS') || foundItem.id.includes('DUCT_TAPE')) {
    const currentRoom = state.ship.rooms[player.roomId];
    if (currentRoom) {
      currentRoom.hasMalfunction = false;
    }
  }
  appendGameLog(state, {
    type: 'ITEM_USED',
    playerId: actorId,
    itemId: foundItem.id,
    itemName: foundItem.name,
  });
  queueActionCompletion(state, actorId);
  return;
}
