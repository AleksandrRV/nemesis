import type { GameState } from '../types/state.js';
import type { EngineAction } from '../types/actions.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { queueActionCompletion } from './actionCompletion.js';

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
  if (player.handSlots.length >= 2) {
    throw new EngineError('HAND_SLOTS_FULL', 'Оба слота Рук заняты — некуда положить Тяжёлый объект (стр. 22).');
  }

  const room = state.ship.rooms[player.roomId]!;
  const index = room.objects.findIndex((object) => object.id === action.payload.objectId);
  if (index === -1) {
    throw new EngineError('OBJECT_NOT_AVAILABLE', `Такого Тяжёлого объекта нет в отсеке №${room.id} (стр. 22).`);
  }

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

/**
 * Сброс тяжёлого предмета/объекта из руки (Шаг 7, долг 22):
 * «Сброс — в любой момент хода без действия: объект — в комнату, предмет — теряется (в сброс колоды)» (ITEMS_AND_GEAR.md).
 * Реализовано как действие без стоимости (0 карт), но допускает оплату если передана.
 */
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
    // Тяжёлый предмет — в сброс соответствующей колоды (если не BLUE)
    const card = slot.card;
    if (card.color !== 'BLUE') {
      const pile = state.decks.items[card.color];
      if (pile) {
        pile.discard.push(card);
      }
    } else {
      // Синие (крафтовые) — в общий сброс? Для простоты — в дискард BLUE если есть, иначе в комнату как объект? Кладём в discard BLUE.
      const bluePile = (state.decks.items as Record<string, { discard: typeof card[] }>).BLUE;
      if (bluePile) {
        bluePile.discard.push(card);
      }
    }
    appendGameLog(state, {
      type: 'HEAVY_ITEM_DISCARDED',
      playerId: actorId,
      roomId: room.id,
      itemId: card.id,
      itemName: card.name,
    } as never);
  }

  player.handSlots.splice(slotIndex, 1);
  queueActionCompletion(state, actorId);
}
