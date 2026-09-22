import type { IntruderType, RoomId, SanitizedGameState } from '@nemesis/shared';

/**
 * Модель анимационного слоя карты (Шаг 9 этапа 0.5.0): мгновенные скачки
 * фишек заменяются плавным скольжением по траектории Коридора. Модель
 * чистая и детерминированная: сравнивает два соседних среза состояния и
 * возвращает список анимируемых переходов.
 *
 * Источники переходов:
 * - изменение `roomId` Персонажа — движение, Побег, уход в Капсулу;
 * - изменение `roomId` миниатюры — Движение Чужих по карте События, Охота,
 *   Отступление по стрелке карты боя;
 * - `INTRUDER_MOVED` с `technicalCorridors` в новых записях журнала —
 *   затягивание в вентиляцию (миниатюра уже снята с поля);
 * - `INTRUDERS_BLOCKED_BY_DOOR` — совместный взлом Закрытой Двери.
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
  | { kind: 'DOOR_BREACHED'; key: string; corridorId: string };

/** Сколько миллисекунд живёт анимация на слое до удаления. */
export const BOARD_ANIMATION_TTL_MS = 1400;

function lastSequence(view: SanitizedGameState): number {
  return view.gameLog.length > 0 ? view.gameLog[view.gameLog.length - 1]!.sequence : 0;
}

/**
 * Сравнивает два среза и находит всё, что переместилось между ними.
 * Первый срез (загрузка страницы) анимаций не рождает — история не играет.
 */
export function diffBoardSnapshots(previous: SanitizedGameState | null, next: SanitizedGameState): BoardAnimation[] {
  if (!previous) return [];

  const animations: BoardAnimation[] = [];
  const tail = `t${lastSequence(next)}`;

  for (const [playerId, player] of Object.entries(next.players)) {
    const before = previous.players[playerId];
    if (!before || before.roomId === player.roomId) continue;
    if (before.isDead || player.isDead) continue;
    animations.push({
      kind: 'PLAYER_MOVE',
      key: `p-${playerId}-${tail}`,
      playerId,
      fromRoomId: before.roomId,
      toRoomId: player.roomId,
    });
  }

  const previousTokens = new Map(previous.intrudersPool.boardTokens.map((token) => [token.id, token]));
  for (const token of next.intrudersPool.boardTokens) {
    const before = previousTokens.get(token.id);
    if (!before || before.roomId === token.roomId) continue;
    animations.push({
      kind: 'INTRUDER_MOVE',
      key: `i-${token.id}-${tail}`,
      intruderId: token.id,
      intruderType: token.type,
      fromRoomId: before.roomId,
      toRoomId: token.roomId,
    });
  }

  const previousTail = lastSequence(previous);
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
    }
  }

  return animations;
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
