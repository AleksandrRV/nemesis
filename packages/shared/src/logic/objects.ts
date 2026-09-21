import { HAND_SLOT_COUNT } from '../data/setup.js';
import type { BoardObject, PlayerState } from '../types/entities.js';
import type { RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';

/** Проверенные условия подбора: живые ссылки на состояние для `performPickUpObject`. */
export interface PickUpConditions {
  player: PlayerState;
  room: RoomState;
  object: BoardObject;
}

/**
 * Условия базового действия «Поднять Тяжёлый Объект» (стр. 13): объект лежит
 * на полу отсека персонажа, в руках есть свободный слот. Вызывается из fsm
 * до оплаты, затем повторно внутри `performPickUpObject`, чтобы прямые
 * вызовы тоже были безопасны.
 */
export function validatePickUpConditions(state: GameState, playerId: string, objectId: string): PickUpConditions {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Подбор объекта от неизвестного персонажа: ${playerId}.`);
  }

  const room = state.ship.rooms[player.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Персонаж ${playerId} находится в несуществующем отсеке.`);
  }

  const object = room.objects.find((candidate) => candidate.id === objectId);

  if (!object) {
    throw new EngineError(
      'PICK_UP_OBJECT_NOT_HERE',
      `Объекта ${objectId} нет на полу отсека ${room.id}: поднимать можно только из своей Комнаты (стр. 13).`,
    );
  }

  if (player.handSlots.length >= HAND_SLOT_COUNT) {
    throw new EngineError(
      'PICK_UP_HANDS_FULL',
      `Обе руки персонажа ${playerId} заняты: сначала освободите слот руки (стр. 22).`,
    );
  }

  return { player, room, object };
}

/**
 * Подбор Тяжёлого Объекта целиком (стр. 13, 22): жетон переезжает с пола
 * отсека в руки персонажа. Оплату картой Действия выполняет вызывающая
 * ветка fsm до этого вызова.
 */
export function performPickUpObject(state: GameState, playerId: string, objectId: string): void {
  const { player, room, object } = validatePickUpConditions(state, playerId, objectId);

  room.objects = room.objects.filter((candidate) => candidate.id !== objectId);
  player.handSlots.push({ source: 'OBJECT', object });

  appendGameLog(state, {
    type: 'OBJECT_PICKED_UP',
    playerId,
    roomId: room.id,
    objectId: object.id,
    objectKind: object.kind,
  });
}
