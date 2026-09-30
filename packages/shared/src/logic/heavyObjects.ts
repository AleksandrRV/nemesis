import type { GameState } from '../types/state.js';
import type { EngineAction } from '../types/actions.js';
import { EngineError, enforceRule } from './engineErrors.js';
import { pickUpBlock } from './actionRules.js';
import { appendGameLog } from './gameLog.js';
import { queueActionCompletion } from './actionCompletion.js';
import { discardItemCard } from './cardEffectsShared.js';

/**
 * Базовое действие «Поднять Тяжёлый объект» [1] (стр. 13, 22): «поднимите
 * 1 Тяжелый Объект, находящийся в вашей Комнате. Это может быть Труп
 * Персонажа, Останки Чужого или Яйцо Чужих». Объект занимает свободный слот
 * Руки, как Тяжёлый предмет; в Бою действие доступно наравне с другими
 * базовыми действиями (FAQ Actions 4).
 */
export function executePickUpObject(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PICK_UP_OBJECT' }>,
  actorId: string,
): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  const room = state.ship.rooms[player.roomId]!;
  enforceRule(pickUpBlock(player, room, action.payload.objectId));
  const index = room.objects.findIndex((object) => object.id === action.payload.objectId);

  // Индекс найден findIndex выше — объект гарантированно существует.
  const object = room.objects[index]!;
  room.objects.splice(index, 1);
  player.handSlots.push({ source: 'OBJECT', object });
  appendGameLog(state, {
    type: 'OBJECT_PICKED_UP',
    playerId: actorId,
    roomId: room.id,
    objectId: object.id,
    objectKind: object.kind,
  });
  queueActionCompletion(state, actorId);
}

/** «Сброс» (стр. 22): в любой момент своего хода, не тратя Действия. */
export function executeDiscardHeavyItem(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_DISCARD_HEAVY_ITEM' }>,
  actorId: string,
): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);

  const slotIndex = action.payload.handSlotIndex;
  if (slotIndex < 0 || slotIndex >= player.handSlots.length) {
    throw new EngineError('INVALID_HAND_SLOT', `Слот руки ${slotIndex} пуст или не существует`);
  }

  const slot = player.handSlots[slotIndex]!;
  const room = state.ship.rooms[player.roomId]!;

  if (slot.source === 'OBJECT') {
    // Объект возвращается на пол комнаты
    room.objects.push(slot.object);
    appendGameLog(state, {
      type: 'OBJECT_DROPPED',
      playerId: actorId,
      roomId: room.id,
      objectId: slot.object.id,
      objectKind: slot.object.kind,
    } as never);
  } else {
    discardItemCard(state, slot.card);
    appendGameLog(state, {
      type: 'HEAVY_ITEM_DISCARDED',
      playerId: actorId,
      roomId: room.id,
      itemId: slot.card.id,
      itemName: slot.card.name,
    } as never);
  }

  player.handSlots.splice(slotIndex, 1);
}
