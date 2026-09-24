import type { ExplorationEffect, GameLogEntry, GameLogEvent, IntruderLogEvent, NoiseDieFace } from '@nemesis/shared';
import type { IntruderType, RoomId, SanitizedGameState } from '@nemesis/shared';
import { changedDoorStates, type DoorState } from './doorTransitionModel';

/**
 * Модель анимационного слоя карты (Шаг 9 этапа 0.5.0 + Этап 2 вскрытие):
 * мгновенные скачки фишек заменяются плавным скольжением, вскрытие тайлов
 * и жетоны Исследования получают кинематографичную презентацию.
 *
 * Источники переходов:
 * - изменение `roomId` Персонажа — движение, Побег, уход в Капсулу;
 * - изменение `roomId` миниатюры — Движение Чужих по карте События, Охота,
 *   Отступление по стрелке карты боя;
 * - `INTRUDER_MOVED` с `technicalCorridors` в новых записях журнала —
 *   затягивание в вентиляцию (миниатюра уже снята с поля);
 * - `INTRUDERS_BLOCKED_BY_DOOR` — совместный взлом Закрытой Двери;
 * - `ROOM_DISCOVERED` / `EXPLORATION_TOKEN_REVEALED` — туман, переворот,
 *   жетон Исследования с иконкой эффекта (Этап 2).
 */
export type BoardAnimation =
  | { kind: 'PLAYER_MOVE'; key: string; playerId: string; fromRoomId: RoomId; toRoomId: RoomId }
  | {
      kind: 'INTRUDER_MOVE';
      key: string;
      intruderId: string;
      intruderType: IntruderType;
      fromRoomId: RoomId;
      toRoomId: RoomId;
    }
  | { kind: 'INTRUDER_TO_TECH'; key: string; intruderId: string; intruderType: IntruderType; fromRoomId: RoomId }
  | { kind: 'DOOR_BREACHED'; key: string; corridorId: string }
  | { kind: 'ROOM_REVEAL'; key: string; roomId: RoomId }
  | {
      kind: 'EXPLORATION_REVEAL';
      key: string;
      roomId: RoomId;
      effect: ExplorationEffect;
      itemsCount: number;
    }
  | {
      kind: 'NOISE_POP';
      key: string;
      roomId: RoomId;
      corridorId: string | null;
      isTechnical: boolean;
      reason: string;
    }
  | {
      kind: 'NOISE_ROLL';
      key: string;
      roomId: RoomId;
      corridorId: string | null;
      isTechnical: boolean;
      face: NoiseDieFace;
    }
  | { kind: 'CONTACT_TEASE'; key: string; roomId: RoomId };

/** Сколько миллисекунд живёт анимация на слое до удаления. */
export const BOARD_ANIMATION_TTL_MS = 1800;

/** TTL для жетона Исследования — чуть дольше, чтобы успеть прочитать эффект. */
export const EXPLORATION_ANIMATION_TTL_MS = 2100;

/** Скан-пинг по туману до переворота тайла (ROOM_REVEAL). */
export const ROOM_REVEAL_TTL_MS = 1500;

/**
 * Удержка после вскрытия: пока RoomHex проигрывает переворот тумана,
 * печатную машинку имени и выезд иконок (~2.6с), очередь ждёт и только
 * потом открывает бросок Шума. Порядок: скан → карточка → имя и иконки.
 */
export const ROOM_SETTLE_TTL_MS = 3000;

export const NOISE_POP_TTL_MS = 1600;
export const NOISE_ROLL_TTL_MS = 1400;
export const CONTACT_TEASE_TTL_MS = 1800;

type FreshPlayerMoved = GameLogEntry & { event: Extract<GameLogEvent, { type: 'PLAYER_MOVED' }> };
type FreshIntruderMoved = GameLogEntry & { event: Extract<IntruderLogEvent, { type: 'INTRUDER_MOVED' }> };

function isPlayerMovedEntry(entry: GameLogEntry): entry is FreshPlayerMoved {
  return entry.event.type === 'PLAYER_MOVED';
}

function isIntruderMovedEntry(entry: GameLogEntry): entry is FreshIntruderMoved {
  return entry.event.type === 'INTRUDER_MOVED';
}

function lastSequence(view: SanitizedGameState): number {
  return view.gameLog.length > 0 ? view.gameLog[view.gameLog.length - 1]!.sequence : 0;
}

function corridorNumbersForRoom(
  corridor: { fromRoomId: number; toRoomId: number; fromNumbers: readonly number[]; toNumbers: readonly number[] },
  roomId: number,
): readonly number[] {
  if (corridor.fromRoomId === roomId) return corridor.fromNumbers;
  if (corridor.toRoomId === roomId) return corridor.toNumbers;
  return [];
}

function findCorridorIdForNoiseRoll(view: SanitizedGameState, roomId: number, rolledNumber: number): string | null {
  for (const corridor of Object.values(view.ship.corridors)) {
    const leadsInto = corridor.fromRoomId === roomId || corridor.toRoomId === roomId;
    if (!leadsInto) continue;
    const nums = corridorNumbersForRoom(corridor, roomId);
    if (nums.includes(rolledNumber)) return corridor.id;
  }
  return null;
}

/**
 * Сравнивает два среза и находит всё, что переместилось между ними.
 * Первый срез (загрузка страницы) анимаций не рождает — история не играет.
 *
 * Ключевое правило порядка (причинно-следственная связь): перемещения
 * Персонажа и Чужих привязываются к СВОИМ записям журнала, а не к последнему
 * срезу целиком. Иначе «Переход → Вскрытие → Шум» одной пачки получает один
 * и тот же хвост-секвенс, и переход уезжает в конец очереди после окна кубика.
 */
export function diffBoardSnapshots(previous: SanitizedGameState | null, next: SanitizedGameState): BoardAnimation[] {
  if (!previous) return [];

  const animations: BoardAnimation[] = [];
  const tail = `t${lastSequence(next)}`;
  const previousTail = lastSequence(previous);

  const freshPlayerMoves = new Map<string, FreshPlayerMoved>();
  const freshIntruderMoves = new Map<string, FreshIntruderMoved>();
  for (const entry of next.gameLog) {
    if (entry.sequence <= previousTail) continue;
    if (isPlayerMovedEntry(entry)) freshPlayerMoves.set(entry.event.playerId, entry);
    if (isIntruderMovedEntry(entry)) freshIntruderMoves.set(entry.event.intruderId, entry);
  }

  for (const [playerId, player] of Object.entries(next.players)) {
    const before = previous.players[playerId];
    if (!before || before.roomId === player.roomId) continue;
    if (before.isDead || player.isDead) continue;
    // Секвенс — из записи PLAYER_MOVED этого перехода: движение всегда
    // первое звено цепочки «движение → вскрытие → шум → контакт».
    const logged = freshPlayerMoves.get(playerId);
    const seq = logged && logged.event.toRoomId === player.roomId ? String(logged.sequence) : tail;
    animations.push({
      kind: 'PLAYER_MOVE',
      key: `p-${playerId}-${seq}`,
      playerId,
      fromRoomId: before.roomId,
      toRoomId: player.roomId,
    });
  }

  const previousTokens = new Map(previous.intrudersPool.boardTokens.map((token) => [token.id, token]));
  for (const token of next.intrudersPool.boardTokens) {
    const before = previousTokens.get(token.id);
    if (!before || before.roomId === token.roomId) continue;
    const logged = freshIntruderMoves.get(token.id);
    const seq =
      logged && logged.event.toRoomId === token.roomId && !logged.event.technicalCorridors
        ? String(logged.sequence)
        : tail;
    animations.push({
      kind: 'INTRUDER_MOVE',
      key: `i-${token.id}-${seq}`,
      intruderId: token.id,
      intruderType: token.type,
      fromRoomId: before.roomId,
      toRoomId: token.roomId,
    });
  }

  for (const entry of next.gameLog) {
    if (entry.sequence <= previousTail) continue;
    const event = entry.event;
    if (event.type === 'INTRUDER_MOVED' && event.technicalCorridors) {
      animations.push({
        kind: 'INTRUDER_TO_TECH',
        key: `v-${event.intruderId}-${entry.sequence}`,
        intruderId: event.intruderId,
        intruderType: event.intruderType,
        fromRoomId: event.fromRoomId,
      });
      continue;
    }
    if (event.type === 'INTRUDERS_BLOCKED_BY_DOOR') {
      animations.push({
        kind: 'DOOR_BREACHED',
        key: `d-${event.corridorId}-${entry.sequence}`,
        corridorId: event.corridorId,
      });
      continue;
    }
    // Этап 2: вскрытие отсека — переворот тайла уже в RoomHex, но дублируем для слоя вспышки
    if (event.type === 'ROOM_DISCOVERED') {
      animations.push({
        kind: 'ROOM_REVEAL',
        key: `r-${event.roomId}-${entry.sequence}`,
        roomId: event.roomId,
      });
      continue;
    }
    // Этап 2: жетон Исследования — мини-карта с эффектом
    if (event.type === 'EXPLORATION_TOKEN_REVEALED') {
      animations.push({
        kind: 'EXPLORATION_REVEAL',
        key: `e-${event.roomId}-${entry.sequence}`,
        roomId: event.roomId,
        effect: event.effect,
        itemsCount: event.itemsCount,
      });
      continue;
    }
    // Этап C7: бросок кубика Шума — вспышка на целевом коридоре
    if (event.type === 'NOISE_ROLLED') {
      const face = event.result;
      let corridorId: string | null = null;
      if (face.kind === 'CORRIDOR') {
        corridorId = findCorridorIdForNoiseRoll(next, event.roomId, face.number);
      }
      animations.push({
        kind: 'NOISE_ROLL',
        key: `nr-${event.roomId}-${entry.sequence}`,
        roomId: event.roomId,
        corridorId,
        isTechnical: false,
        face,
      });
      continue;
    }
    // Этап C8: маркер Шума только что поставлен — pop + ripple
    if (event.type === 'NOISE_MARKER_PLACED') {
      const isTechnical = event.target.kind === 'TECHNICAL_CORRIDOR';
      const corridorId = event.target.kind === 'CORRIDOR' ? event.target.corridorId : null;
      animations.push({
        kind: 'NOISE_POP',
        key: `np-${corridorId ?? 'tech'}-${entry.sequence}`,
        roomId: event.roomId,
        corridorId,
        isTechnical,
        reason: event.reason,
      });
      continue;
    }
    // Этап C9: дубликат Шума → Контакт — красная виньетка + shake
    if (event.type === 'CONTACT_OCCURRED' && event.source === 'NOISE') {
      animations.push({
        kind: 'CONTACT_TEASE',
        key: `ct-${event.roomId}-${entry.sequence}`,
        roomId: event.roomId,
      });
    }
  }

  return animations;
}

/**
 * Базлайн пачки обновлений: что именно изменилось в срезе «было → стало».
 * Нужен откату презентации, чтобы прятать до своего хода только НОВОЕ
 * (маркер Шума, появившийся в этой пачке; новая миниатюра Чужого),
 * а не трогать состояние, существовавшее до неё.
 */
export interface BatchBaseline {
  /** Коридоры, получившие маркер Шума в этой пачке (false → true). */
  noiseCorridorIds: ReadonlySet<string>;
  /** Технические Коридоры получили шум в этой пачке. */
  techNoise: boolean;
  /** Миниатюры Чужих, появившиеся на поле в этой пачке (Контакт). */
  newIntruderIds: ReadonlySet<string>;
  doorStatesBefore: ReadonlyMap<string, DoorState>;
}

export function snapshotBatchBaseline(previous: SanitizedGameState | null, next: SanitizedGameState): BatchBaseline {
  const noiseCorridorIds = new Set<string>();
  if (previous) {
    for (const [id, corridor] of Object.entries(next.ship.corridors)) {
      if (corridor.hasNoise && !previous.ship.corridors[id]?.hasNoise) noiseCorridorIds.add(id);
    }
  }
  const techNoise = Boolean(previous) && !previous!.ship.technicalCorridorNoise && next.ship.technicalCorridorNoise;
  const newIntruderIds = new Set<string>();
  if (previous) {
    const known = new Set(previous.intrudersPool.boardTokens.map((token) => token.id));
    for (const token of next.intrudersPool.boardTokens) {
      if (!known.has(token.id)) newIntruderIds.add(token.id);
    }
  }
  const doorStatesBefore = previous ? changedDoorStates(previous, next) : new Map<string, DoorState>();
  return { noiseCorridorIds, techNoise, newIntruderIds, doorStatesBefore };
}

/** Слияние базлайнов: новое действие может прийти, пока предыдущее ещё показывается. */
export function mergeBatchBaselines(base: BatchBaseline | null, next: BatchBaseline): BatchBaseline {
  if (!base) return next;
  return {
    noiseCorridorIds: new Set([...base.noiseCorridorIds, ...next.noiseCorridorIds]),
    techNoise: base.techNoise || next.techNoise,
    newIntruderIds: new Set([...base.newIntruderIds, ...next.newIntruderIds]),
    doorStatesBefore: new Map([...next.doorStatesBefore, ...base.doorStatesBefore]),
  };
}

/** Идентификаторы сущностей, которые сейчас в пути: статический рендер их прячет. */
export function inTransitIds(animations: readonly BoardAnimation[]): {
  playerIds: Set<string>;
  intruderIds: Set<string>;
} {
  const playerIds = new Set<string>();
  const intruderIds = new Set<string>();
  for (const animation of animations) {
    if (animation.kind === 'PLAYER_MOVE') playerIds.add(animation.playerId);
    if (animation.kind === 'INTRUDER_MOVE') intruderIds.add(animation.intruderId);
  }
  return { playerIds, intruderIds };
}
