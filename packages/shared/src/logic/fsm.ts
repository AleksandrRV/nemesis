import { produce } from 'immer';

import type { EngineAction } from '../types/actions.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { CorridorConnection, CorridorNumber, RoomId } from '../types/rooms.js';
import { nextDoorState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { NOISE_DIE_FACES, type NoiseDieFace } from '../data/noiseDie.js';
import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { drawFromStream } from '../utils/rng.js';

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
  | 'INTERRUPT_NOT_IMPLEMENTED'
  /** Контакт: в Коридоре уже стоит маркер Шума (стр. 15); сам Контакт — этап 4 дорожной карты. */
  | 'CONTACT_NOT_IMPLEMENTED'
  /** Перемещение Чужих по эффекту «Опасность» появится вместе с Пулом Чужих (этап 4 дорожной карты). */
  | 'INTRUDER_MOVEMENT_NOT_IMPLEMENTED';

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
  /** Разрешить отладочные действия: только dev-сборка и только локально. */
  allowDevActions?: boolean;
}

const DEV_ACTION_TYPES: readonly EngineAction['type'][] = ['DEV_TOGGLE_DOOR', 'DEV_TOGGLE_NOISE'];

function isDevAction(action: EngineAction): boolean {
  return DEV_ACTION_TYPES.includes(action.type);
}

/**
 * Коридоры между отсеками с открытой Дверью: только по ним можно перейти
 * (стр. 14). Обычно Коридор один; парные Коридоры между двумя отсеками модель
 * пока не различает — их разбор относится к сверке данных (план исправлений, Э2-1).
 */
function findOpenCorridors(state: GameState, fromRoomId: RoomId, toRoomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) =>
      corridor.doorState === 'OPEN' &&
      ((corridor.fromRoomId === fromRoomId && corridor.toRoomId === toRoomId) ||
        (corridor.fromRoomId === toRoomId && corridor.toRoomId === fromRoomId)),
  );
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
   * Исходное состояние не меняется: работа идёт на immer-драфте. Если каскад
   * прерываний отклоняет шаг (например, Контакт ещё не разыгрывается), откат
   * возвращает партию к состоянию до действия целиком.
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

        const corridors = findOpenCorridors(state, player.roomId, targetRoomId);

        if (corridors.length === 0) {
          throw new EngineError(
            'NO_OPEN_DOOR_BETWEEN_ROOMS',
            `Отсек ${targetRoomId} не соседний с ${player.roomId}: нет Коридора с открытой Дверью (стр. 14).`,
          );
        }

        movePlayer(state, actorId, targetRoomId, corridors[0]!.id);
        return;
      }

      case 'DEV_TOGGLE_DOOR': {
        const corridor = requireCorridor(state, action.payload.corridorId);

        corridor.doorState = nextDoorState(corridor.doorState);
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
 * он уходит — исчезает из списка occupants. Вход в отсек всегда завершается
 * двумя шагами, и оба оформляются прерываниями, а не побочным эффектом:
 *
 * 1. вскрытие тайла и жетона Исследования — `EXPLORE_ROOM_INTERRUPT` (только
 *    для неисследованного отсека);
 * 2. бросок кубика Шума — `NOISE_ROLL_INTERRUPT` (его могут отменить эффекты
 *    жетона и присутствие персонажа или Чужого в отсеке, стр. 14–15).
 */
function movePlayer(state: GameState, playerId: string, targetRoomId: RoomId, corridorId: string): void {
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

  const nextInterrupts: InterruptEvent[] = wasUnexplored
    ? [{ type: 'EXPLORE_ROOM_INTERRUPT', playerId, roomId: targetRoomId, corridorId }]
    : [];

  state.interruptQueue = [
    ...state.interruptQueue,
    ...nextInterrupts,
    { type: 'NOISE_ROLL_INTERRUPT', playerId, roomId: targetRoomId },
  ];
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
 * Реализованы вскрытие отсека и бросок кубика Шума. Побег, Контакт и Внезапная
 * атака требуют Пула Чужих, боя и колод: их разбор — следующие этапы дорожной
 * карты, поэтому движок отклоняет их явной ошибкой, а не разыгрывает наугад.
 */
export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
  switch (interrupt.type) {
    case 'EXPLORE_ROOM_INTERRUPT':
      resolveExploreRoom(state, interrupt);
      return;

    case 'NOISE_ROLL_INTERRUPT':
      resolveNoiseRoll(state, interrupt);
      return;

    default:
      throw new EngineError(
        'INTERRUPT_NOT_IMPLEMENTED',
        `Прерывание ${interrupt.type} ещё не разыгрывается движком (см. дорожную карту).`,
      );
  }
}

/**
 * Вскрытие неисследованного отсека (стр. 14, шаги 1–2): тайл переворачивается,
 * раскрывается жетон Исследования, и разыгрывается его особый эффект.
 *
 * Число предметов уже лежит в отсеке (`itemsCount`) и счётчиком на поле
 * становится известным игроку — уменьшать его будет Действие «Поиск» (этап 3).
 * Эффекты «Тишина» и «Опасность» управляют броском Шума, поэтому их разыгрывает
 * следующее прерывание `NOISE_ROLL_INTERRUPT`, когда бросок уже можно отменить.
 */
function resolveExploreRoom(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'EXPLORE_ROOM_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Прерывание вскрытия ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Прерывание вскрытия ссылается на неизвестного персонажа: ${interrupt.playerId}.`,
    );
  }

  room.isExplored = true;

  switch (room.explorationEffect) {
    case 'FIRE':
      // Маркер Пожара в отсек; запас из 8 маркеров и взрыв корабля — Э2-2 (стр. 17).
      room.hasFire = true;
      return;

    case 'MALFUNCTION':
      // Маркер Неисправности в отсек; запас маркеров — Э2-2 (стр. 17).
      room.hasMalfunction = true;
      return;

    case 'SLIME':
      // У персонажа не больше одного маркера Слизи (стр. 17).
      player.hasSlime = true;
      return;

    case 'DOORS':
      closeDoorOfEntry(state, interrupt.corridorId);
      return;

    case 'SILENCE':
    case 'DANGER':
    case null:
      // «Тишина» и «Опасность» разыгрываются вместе с броском Шума,
      // а у особых отсеков жетона Исследования нет вовсе (стр. 26).
      return;
  }
}

/**
 * Эффект «Двери»: жетон Двери ставится в Коридор, через который персонаж вошёл
 * в отсек (стр. 15). Жетон, стоящий в Коридоре, означает Закрытую Дверь, а
 * Разрушенную снова закрыть нельзя (стр. 17).
 */
function closeDoorOfEntry(state: GameState, corridorId: string): void {
  const corridor = state.ship.corridors[corridorId];

  if (!corridor) {
    throw new EngineError('UNKNOWN_CORRIDOR', `Эффект «Двери» ссылается на несуществующий Коридор ${corridorId}.`);
  }

  if (corridor.doorState === 'DESTROYED') {
    return;
  }

  corridor.doorState = 'CLOSED';
}

/**
 * Бросок кубика Шума (стр. 15).
 *
 * Порядок разбора:
 * 1. `NOISE_ROLL_INTERRUPT` идёт следом за вскрытием отсека, поэтому хранит
 *    память о эффекте жетона; сам жетон после розыгрыша удаляется из игры.
 * 2. В отсеке есть другой Персонаж или Чужой — броска нет («ПОМНИТЕ» на стр. 15).
 * 3. Эффект «Тишина» отменяет бросок, «Опасность» — заменяет его; Слизь
 *    превращает «Тишину» в «Опасность» (стр. 15 и 17).
 * 4. Иначе кубик бросается, и грань разыгрывается целиком.
 */
function resolveNoiseRoll(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'NOISE_ROLL_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Бросок Шума ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Бросок Шума ссылается на неизвестного персонажа: ${interrupt.playerId}.`);
  }

  const tokenEffect = room.explorationEffect;
  room.explorationEffect = null;

  const hasCompany =
    room.occupantPlayerIds.some((occupantId) => occupantId !== interrupt.playerId) ||
    room.occupantIntruderIds.length > 0;

  if (hasCompany) return;

  if (tokenEffect === 'DANGER' || (tokenEffect === 'SILENCE' && player.hasSlime)) {
    resolveDanger(state, interrupt.roomId);
    return;
  }

  if (tokenEffect === 'SILENCE') return;

  applyNoiseFace(state, interrupt.playerId, interrupt.roomId, rollNoiseDie(state));
}

/** Разыгрывает выпавшую грань кубика Шума (стр. 15). */
function applyNoiseFace(state: GameState, playerId: string, roomId: RoomId, face: NoiseDieFace): void {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Грань кубика Шума ссылается на неизвестного персонажа: ${playerId}.`);
  }

  if (face.kind === 'SILENCE') {
    if (player.hasSlime) resolveDanger(state, roomId);

    return;
  }

  if (face.kind === 'DANGER') {
    resolveDanger(state, roomId);
    return;
  }

  const target = findNoiseTarget(state, roomId, face.number);

  if (target.kind === 'UNMAPPED') {
    // Решение владельца проекта (17.09.2026): до сверки данных с полем
    // (план исправлений, Э2-1) бросок на номер, которого нет среди выходов
    // отсека, разыгрывается как «Тишина» — включая превращение Слизью
    // в «Опасность» (стр. 17).
    if (player.hasSlime) resolveDanger(state, roomId);

    return;
  }

  placeNoiseMarker(state, target);
}

/** Куда кладётся маркер Шума: Коридор с выпавшим номером или Вход в Технические Коридоры (стр. 15). */
export type NoiseTarget =
  { kind: 'TECHNICAL_CORRIDOR' } | { kind: 'CORRIDOR'; corridor: CorridorConnection } | { kind: 'UNMAPPED' };

/**
 * Ищет место для маркера Шума по выпавшему номеру.
 *
 * Коридоры считаются вместе с Техническими Коридорами, если в отсеке есть Вход
 * (стр. 15): маркер уходит на общее поле Технических Коридоров. Если номера нет
 * среди выходов отсека — данные поля требуют сверки (план исправлений, Э2-1),
 * и такой бросок движок разыгрывает как «Тишину» по решению владельца проекта.
 */
export function findNoiseTarget(state: GameState, roomId: RoomId, number: CorridorNumber): NoiseTarget {
  const roomNode = SHIP_ROOM_NODES.find((node) => node.id === roomId);

  if (roomNode?.techNumbers.includes(number)) {
    return { kind: 'TECHNICAL_CORRIDOR' };
  }

  const corridor = corridorsLeadingInto(state, roomId).find((candidate) =>
    corridorNumbersOf(candidate, roomId).includes(number),
  );

  return corridor ? { kind: 'CORRIDOR', corridor } : { kind: 'UNMAPPED' };
}

/** Номера Коридора со стороны конкретного отсека: номер напечатан у выхода (стр. 15). */
function corridorNumbersOf(corridor: CorridorConnection, roomId: RoomId): CorridorNumber[] {
  if (corridor.fromRoomId === roomId) return corridor.fromNumbers;
  if (corridor.toRoomId === roomId) return corridor.toNumbers;

  return [];
}

function corridorsLeadingInto(state: GameState, roomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

/**
 * Кладёт маркер Шума. В каждом Коридоре не может быть больше одного маркера:
 * попытка положить второй означает Контакт (стр. 15), а сам Контакт — вытягивание
 * жетона Чужого и Внезапная атака — появится вместе с Пулом Чужих (этап 4
 * дорожной карты), поэтому здесь движок отклоняет шаг явной ошибкой.
 */
function placeNoiseMarker(state: GameState, target: Exclude<NoiseTarget, { kind: 'UNMAPPED' }>): void {
  if (target.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      throw contactError('Технические Коридоры');
    }

    state.ship.technicalCorridorNoise = true;
    return;
  }

  if (target.corridor.hasNoise) {
    throw contactError(`Коридор ${target.corridor.id}`);
  }

  target.corridor.hasNoise = true;
}

function contactError(place: string): EngineError {
  return new EngineError(
    'CONTACT_NOT_IMPLEMENTED',
    `Контакт: в этом месте уже стоит маркер Шума (${place}). Вытягивание жетона Чужого появится вместе с Пулом Чужих (этап 4 дорожной карты).`,
  );
}

/**
 * Эффект «Опасность» (стр. 14–15 и стр. 15): Чужой из соседнего отсека
 * перемещается сюда, а если Чужих рядом нет — по одному маркеру Шума в каждый
 * Коридор без маркера, ведущий в отсек, включая Технические Коридоры, если
 * в отсеке есть Вход. Маркеры ставятся без Контакта: занятые Коридоры просто
 * пропускаются.
 */
function resolveDanger(state: GameState, roomId: RoomId): void {
  const neighbours = corridorsLeadingInto(state, roomId).map((corridor) =>
    corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId,
  );
  const intrudersAround = neighbours.some(
    (neighbourId) => (state.ship.rooms[neighbourId]?.occupantIntruderIds.length ?? 0) > 0,
  );

  if (intrudersAround) {
    throw new EngineError(
      'INTRUDER_MOVEMENT_NOT_IMPLEMENTED',
      'Эффект «Опасность» требует переместить Чужого из соседнего отсека: это появится вместе с Пулом Чужих (этап 4 дорожной карты).',
    );
  }

  for (const corridor of corridorsLeadingInto(state, roomId)) {
    corridor.hasNoise = true;
  }

  const roomNode = SHIP_ROOM_NODES.find((node) => node.id === roomId);

  if (roomNode && roomNode.techNumbers.length > 0) {
    state.ship.technicalCorridorNoise = true;
  }
}

/**
 * Бросок кубика Шума из потока `noise`: позиция берётся из счётчика в состоянии
 * (`meta.rngDraws`), поэтому после сохранения и перезагрузки последовательность
 * продолжается, а не начинается заново (utils/rng.ts).
 */
function rollNoiseDie(state: GameState): NoiseDieFace {
  const drawIndex = state.meta.rngDraws.noise;
  const value = drawFromStream(state.meta.seed, 'noise', drawIndex);
  const faceIndex = Math.min(NOISE_DIE_FACES.length - 1, Math.floor(value * NOISE_DIE_FACES.length));

  state.meta.rngDraws.noise = drawIndex + 1;

  return NOISE_DIE_FACES[faceIndex]!;
}
