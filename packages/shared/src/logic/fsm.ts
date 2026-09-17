import { produce } from 'immer';

import type { EngineAction } from '../types/actions.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { CorridorConnection, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';

/**
 * Движок правил.
 *
 * Единственная точка, где меняется `GameState`: клиент отправляет действие,
 * движок проверяет возможность, выполняет шаг и разбирает каскад прерываний
 * до конца (AGENTS.md §3.3, tech_stack §4).
 *
 * Принцип «правила 1:1»: каждый шаг здесь имеет ссылку на страницу правил,
 * а всё, что ещё не реализовано, отклоняется с явной ошибкой — молчаливое
 * «ничего не произошло» или разыгранная наугад механика недопустимы.
 */

export type EngineErrorCode =
  | 'UNKNOWN_PLAYER'
  | 'PLAYER_IS_DEAD'
  | 'UNKNOWN_ROOM'
  | 'UNKNOWN_CORRIDOR'
  | 'MOVE_TARGET_IS_CURRENT_ROOM'
  | 'NO_OPEN_DOOR_BETWEEN_ROOMS'
  | 'ACTION_NOT_IMPLEMENTED'
  | 'DEV_ACTION_FORBIDDEN'
  | 'INTERRUPT_NOT_IMPLEMENTED';

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

export interface ProcessActionOptions {
  /** Кто выполняет действие. По умолчанию — активный игрок партии. */
  actorId?: string;
  /** Разрешить отладочные действия: только dev-сборка и только локально (аудит №22). */
  allowDevActions?: boolean;
}

const DEV_ACTION_TYPES: readonly EngineAction['type'][] = ['DEV_TOGGLE_DOOR', 'DEV_TOGGLE_NOISE'];

function isDevAction(action: EngineAction): boolean {
  return DEV_ACTION_TYPES.includes(action.type);
}

/**
 * Закрытая и разрушенная Дверь путь закрывают (стр. 14).
 */
function hasOpenDoorBetween(state: GameState, fromRoomId: RoomId, toRoomId: RoomId): boolean {
  return findAdjacentOpenRoomIds(state, fromRoomId).includes(toRoomId);
}

/**
 * Соседние отсеки, доступные для перехода: соединены хотя бы одним
 * Коридором с открытой Дверью (стр. 14). Одно место для правила: им пользуется
 * и проверка движения в движке, и подсветка доступных отсеков в интерфейсе.
 */
export function findAdjacentOpenRoomIds(state: CorridorGraphState, fromRoomId: RoomId): RoomId[] {
  return Object.values(state.ship.corridors)
    .filter((corridor) => corridor.doorState === 'OPEN')
    .flatMap((corridor) =>
      corridor.fromRoomId === fromRoomId
        ? [corridor.toRoomId]
        : corridor.toRoomId === fromRoomId
          ? [corridor.fromRoomId]
          : [],
    );
}

/**
 * Минимум состояния, который нужен проверке соседства: только коридоры.
 * Подходит и полному `GameState`, и отфильтрованному представлению игрока,
 * поэтому правило читается из одного места и движком, и интерфейсом.
 */
export interface CorridorGraphState {
  ship: { corridors: Record<string, CorridorConnection> };
}

/** Коридор по идентификатору или ошибка: разыгрывать «действие в никуда» нельзя. */
function requireCorridor(state: GameState, corridorId: string): CorridorConnection {
  const corridor = state.ship.corridors[corridorId];

  if (!corridor) {
    throw new EngineError('UNKNOWN_CORRIDOR', `Коридора ${corridorId} нет на корабле.`);
  }

  return corridor;
}

export class GameEngine {
  /**
   * Применяет действие к состоянию партии и возвращает новое состояние.
   * Исходное состояние не меняется: работа идёт на immer-драфте.
   */
  processAction(state: GameState, action: EngineAction, options: ProcessActionOptions = {}): GameState {
    const actorId = options.actorId ?? state.meta.activePlayerId;

    return produce(state, (draft) => {
      this.handleAction(draft, action, actorId, options);
      drainInterrupts(draft);
    });
  }

  /**
   * Проверка и выполнение шага — в одном месте: у каждого действия ровно одна
   * ветка, поэтому «проверили одно, выполнили другое» невозможно, а забытое
   * действие контракта отклоняется явной ошибкой в `default`.
   */
  private handleAction(state: GameState, action: EngineAction, actorId: string, options: ProcessActionOptions): void {
    if (isDevAction(action) && options.allowDevActions !== true) {
      throw new EngineError(
        'DEV_ACTION_FORBIDDEN',
        `Отладочное действие ${action.type} запрещено: разрешено только в dev-режиме.`,
      );
    }

    const player = state.players[actorId];

    if (!player) {
      throw new EngineError('UNKNOWN_PLAYER', `Действие от неизвестного персонажа: ${actorId}.`);
    }

    if (player.isDead) {
      throw new EngineError('PLAYER_IS_DEAD', `Погибший персонаж ${actorId} не может действовать.`);
    }

    switch (action.type) {
      case 'ACTION_MOVE': {
        const targetRoomId = action.payload.targetRoomId;

        if (!state.ship.rooms[targetRoomId]) {
          throw new EngineError('UNKNOWN_ROOM', `Отсека ${targetRoomId} нет на корабле.`);
        }

        if (targetRoomId === player.roomId) {
          throw new EngineError('MOVE_TARGET_IS_CURRENT_ROOM', 'Персонаж уже находится в этом отсеке.');
        }

        if (!hasOpenDoorBetween(state, player.roomId, targetRoomId)) {
          throw new EngineError(
            'NO_OPEN_DOOR_BETWEEN_ROOMS',
            `Отсек ${targetRoomId} не соседний с ${player.roomId}: нет Коридора с открытой Дверью (стр. 14).`,
          );
        }

        movePlayer(state, actorId, targetRoomId);
        return;
      }

      case 'DEV_TOGGLE_DOOR': {
        const corridor = requireCorridor(state, action.payload.corridorId);

        corridor.doorState =
          corridor.doorState === 'OPEN' ? 'CLOSED' : corridor.doorState === 'CLOSED' ? 'DESTROYED' : 'OPEN';
        return;
      }

      case 'DEV_TOGGLE_NOISE': {
        const corridor = requireCorridor(state, action.payload.corridorId);

        corridor.hasNoise = !corridor.hasNoise;
        return;
      }

      default:
        throw new EngineError(
          'ACTION_NOT_IMPLEMENTED',
          `Действие ${action.type} объявлено контрактом, но ещё не реализовано движком (см. дорожную карту).`,
        );
    }
  }
}

/**
 * Перемещение персонажа (стр. 14): миниатюра уходит в соседний отсек, откуда
 * он уходит — исчезает из списка occupants. Если отсек был неисследованным,
 * вскрытие тайла и жетона Исследования оформляется прерыванием
 * `EXPLORE_ROOM_INTERRUPT`, а не побочным эффектом перемещения.
 */
function movePlayer(state: GameState, playerId: string, targetRoomId: RoomId): void {
  const player = state.players[playerId];
  const targetRoom = state.ship.rooms[targetRoomId];

  if (!player || !targetRoom) return;

  const oldRoom = state.ship.rooms[player.roomId];

  if (oldRoom) {
    oldRoom.occupantPlayerIds = oldRoom.occupantPlayerIds.filter((id) => id !== playerId);
  }

  targetRoom.occupantPlayerIds = [...targetRoom.occupantPlayerIds, playerId];
  const wasUnexplored = !targetRoom.isExplored;
  player.roomId = targetRoomId;

  if (wasUnexplored) {
    state.interruptQueue = [
      ...state.interruptQueue,
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId, roomId: targetRoomId },
    ];
  }
}

/** Разбирает стек прерываний до конца: действие считается завершённым только тогда (AGENTS.md §3.3). */
export function drainInterrupts(state: GameState): void {
  while (state.interruptQueue.length > 0) {
    const interrupt = state.interruptQueue.shift();

    if (!interrupt) return;

    resolveInterrupt(state, interrupt);
  }
}

/**
 * Разыгрывает одно прерывание.
 *
 * Реализовано вскрытие неисследованного отсека — единственное прерывание,
 * для которого в контракте v0 достаточно данных. Бросок кубика Шума, Контакт,
 * Внезапная атака и Побег требуют данных о колодах, кубике и бою: их разбор —
 * следующий этап дорожной карты, поэтому движок отклоняет их явной ошибкой,
 * а не разыгрывает наугад (см. аудит §4, P1).
 */
export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
  switch (interrupt.type) {
    case 'EXPLORE_ROOM_INTERRUPT': {
      const room = state.ship.rooms[interrupt.roomId];

      if (!room) {
        throw new EngineError(
          'UNKNOWN_ROOM',
          `Прерывание вскрытия ссылается на несуществующий отсек ${interrupt.roomId}.`,
        );
      }

      // Тайл переворачивается, счётчик Предметов и свойства отсека становятся
      // видимыми. Жетон Исследования остаётся в отсеке до Действия «Поиск»
      // (стр. 14, шаг 1), поэтому его число предметов только раскрывается.
      room.isExplored = true;
      return;
    }

    default:
      throw new EngineError(
        'INTERRUPT_NOT_IMPLEMENTED',
        `Прерывание ${interrupt.type} ещё не разыгрывается движком (этап «Движение и шум» дорожной карты).`,
      );
  }
}
