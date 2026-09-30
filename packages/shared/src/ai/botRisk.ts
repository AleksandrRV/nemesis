import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { NOISE_DIE_FACES } from '../data/noiseDie.js';
import { SELF_DESTRUCT_EXPLODES_AT } from '../data/evacuation.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { IntruderType } from '../types/entities.js';
import type { CorridorNumber, RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { findNoiseTarget } from '../logic/shipGraphQueries.js';
import type { BotTuning } from './botTuning.js';

const CORRIDOR_NUMBERS: readonly CorridorNumber[] = [1, 2, 3, 4];

function faceShare(matches: (face: (typeof NOISE_DIE_FACES)[number]) => boolean): number {
  return NOISE_DIE_FACES.filter(matches).length / NOISE_DIE_FACES.length;
}

const DANGER_SHARE = faceShare((face) => face.kind === 'DANGER');

function numberShare(number: CorridorNumber): number {
  return faceShare((face) => face.kind === 'CORRIDOR' && face.number === number);
}

/** Средняя опасность Атаки Чужого этого типа: по картам колоды Атак, которые он разыгрывает (стр. 20). */
export function intruderSeverity(type: IntruderType, tuning: BotTuning): number {
  if (type === 'LARVA') return tuning.risk.larvaSeverity;
  const cards = INTRUDER_ATTACK_CARDS.filter((card) => card.attackerTypes.includes(type));
  if (cards.length === 0) return 0;
  return cards.reduce((sum, card) => sum + tuning.risk.attackEffectSeverity[card.effect], 0) / cards.length;
}

function intrudersIn(view: SanitizedGameState, roomId: RoomId): IntruderType[] {
  return view.intrudersPool.boardTokens.filter((token) => token.roomId === roomId).map((token) => token.type);
}

function neighbours(view: SanitizedGameState, roomId: RoomId): RoomId[] {
  return Object.values(view.ship.corridors).flatMap((corridor) =>
    corridor.fromRoomId === roomId ? [corridor.toRoomId] : corridor.toRoomId === roomId ? [corridor.fromRoomId] : [],
  );
}

function threatOfIntruders(view: SanitizedGameState, roomId: RoomId, tuning: BotTuning): number {
  return intrudersIn(view, roomId).reduce((sum, type) => sum + intruderSeverity(type, tuning), 0) * tuning.risk.wound;
}

export function hasAdjacentIntruders(view: SanitizedGameState, roomId: RoomId): boolean {
  return neighbours(view, roomId).some((room) => intrudersIn(view, room).length > 0);
}

/**
 * Шанс Встречи при входе (стр. 15): выпавший номер Коридора, где уже лежит маркер Шума, — Встреча;
 * «Опасность» приводит соседних Чужих. Грани — состав кубика Шума (`NOISE_DIE_FACES`).
 */
export function contactChance(view: SanitizedGameState, roomId: RoomId): number {
  let chance = hasAdjacentIntruders(view, roomId) ? DANGER_SHARE : 0;
  for (const number of CORRIDOR_NUMBERS) {
    const target = findNoiseTarget(view, roomId, number);
    const noisy =
      target.kind === 'TECHNICAL_CORRIDOR'
        ? view.ship.technicalCorridorNoise
        : target.kind === 'CORRIDOR' && target.corridor.hasNoise;
    if (noisy) chance += numberShare(number);
  }
  return Math.min(1, chance);
}

/**
 * Угроза, которой Комната грозит тому, кто в ней стоит: Чужие, Пожар, Декомпрессия, Слизь, соседи.
 * `fear` — ручка страха перед Чужими: множитель их доли угрозы.
 */
export function roomThreat(view: SanitizedGameState, roomId: RoomId, tuning: BotTuning, fear = 1): number {
  const room = view.ship.rooms[roomId];
  if (!room) return 0;
  const adjacent = neighbours(view, roomId).reduce((sum, other) => sum + threatOfIntruders(view, other, tuning), 0);
  return (
    (threatOfIntruders(view, roomId, tuning) + adjacent * tuning.risk.adjacentIntruderShare) * fear +
    (room.hasFire ? tuning.risk.fire : 0) +
    (room.hasDecompressionToken ? tuning.risk.decompression : 0) +
    (room.definitionId === 'SLIME_ROOM' ? tuning.risk.slime : 0)
  );
}

/**
 * Риск войти в Комнату: её угроза плюс шанс Встречи и неизвестность неисследованного тайла.
 * «Осторожное движение» (стр. 13) кладёт Шум без броска кубика — Встречи при входе нет.
 */
export function entryRisk(
  view: SanitizedGameState,
  roomId: RoomId,
  tuning: BotTuning,
  careful = false,
  fear = 1,
): number {
  const room = view.ship.rooms[roomId];
  if (!room) return Number.POSITIVE_INFINITY;
  return (
    roomThreat(view, roomId, tuning, fear) +
    (careful ? 0 : contactChance(view, roomId) * tuning.risk.contact * fear) +
    (room.isExplored ? 0 : tuning.risk.unexplored)
  );
}

/** Сколько раундов осталось до Прыжка или взрыва Самоуничтожения (стр. 11). */
export function roundsLeft(view: SanitizedGameState): number {
  const untilJump = TIME_TRACK_LENGTH - view.meta.timeTrackPosition;
  const selfDestruct = view.meta.selfDestructTrackPosition;
  return selfDestruct === null ? untilJump : Math.min(untilJump, SELF_DESTRUCT_EXPLODES_AT - selfDestruct);
}
