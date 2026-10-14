import type { CorridorNumber, RoomId } from '../types/rooms.js';
import type { IntruderEntity } from '../types/entities.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { findNoiseTarget } from '../logic/shipGraphQueries.js';
import { eventDeckOf } from './botEventDeck.js';
import { otherEnd } from './botGraph.js';
import { DANGER_SHARE, SILENCE_SHARE } from './botRisk.js';
import { attacksFromRoom, crewIn, intruderHarm, intrudersIn, tokenOdds, type ThreatContext } from './botThreat.js';

/** Чужие, которых бот оставляет без Боя: в Комнате, кроме него, никого из экипажа (стр. 18). */
function leftBehind(context: ThreatContext, from: RoomId): IntruderEntity[] {
  const guarded = crewIn(context.view, from).some((player) => player.id !== context.self.id);
  return guarded ? [] : intrudersIn(context.view, from);
}

function corridorInto(view: SanitizedGameState, from: RoomId, number: CorridorNumber, to: RoomId): boolean {
  const target = findNoiseTarget(view, from, number);
  return target.kind === 'CORRIDOR' && target.corridor.doorState !== 'CLOSED' && otherEnd(target.corridor, from) === to;
}

/** Шанс, что карта ближайшего События поведёт Чужого Коридором в Комнату `to` (стр. 9): его символ и номер Коридора. */
export function eventPursuitChance(context: ThreatContext, intruder: IntruderEntity, to: RoomId): number {
  const deck = eventDeckOf(context.view);
  if (deck.length === 0) return 0;
  const leading = deck.filter(
    (card) =>
      card.intruderTypes.includes(intruder.type) &&
      corridorInto(context.view, intruder.roomId, card.corridorNumber, to),
  );
  return leading.length / deck.length;
}

/** Шанс «Опасности» при входе в Комнату (стр. 15, 17): грань кубика или жетон Исследования, со Слизью — и «Тишина». */
function entryDangerChance(context: ThreatContext, to: RoomId): number {
  const { view, self } = context;
  const room = view.ship.rooms[to];
  if (!room) return 0;
  const occupied = intrudersIn(view, to).length > 0 || crewIn(view, to).some((player) => player.id !== self.id);
  if (occupied) return 0;
  if (room.isExplored) return DANGER_SHARE + (self.hasSlime ? SILENCE_SHARE : 0);
  const odds = tokenOdds(view, to);
  return (odds.get('DANGER') ?? 0) + (self.hasSlime ? (odds.get('SILENCE') ?? 0) : 0);
}

/** Шанс, что Чужие Комнаты `from` окажутся за ботом в соседней `to`: «Опасность» при входе или карта События. */
export function followChance(context: ThreatContext, from: RoomId, to: RoomId): number {
  const behind = leftBehind(context, from);
  if (behind.length === 0 || from === to) return 0;
  const byEvent = Math.max(...behind.map((intruder) => eventPursuitChance(context, intruder, to)));
  return 1 - (1 - entryDangerChance(context, to)) * (1 - byEvent);
}

/**
 * Вред Чужих, пришедших за ботом по карте События (стр. 9): Бой продолжается в новой Комнате. Приход по
 * «Опасности» уже в цене входа.
 */
export function eventPursuitHarm(context: ThreatContext, from: RoomId, to: RoomId): number {
  if (from === to) return 0;
  const { harm, pursuit } = context.tuning.tactics;
  const continuation = harm.combatContinuation * pursuit.event;
  return leftBehind(context, from).reduce(
    (sum, intruder) =>
      sum + eventPursuitChance(context, intruder, to) * intruderHarm(context, intruder.type) * continuation,
    0,
  );
}

/**
 * Обратная дорога в покинутое укрытие: если Чужие пошли следом, вернуться — снова Побег с их Атаками (стр. 19).
 * Нет цены, если бот уходит в свободное укрытие: вторым отсеком стоит идти, только когда там можно укрыться.
 */
export function returnTripHarm(context: ThreatContext, from: RoomId, to: RoomId, shelters: readonly RoomId[]): number {
  if (!shelters.includes(from)) return 0;
  const freeShelter = shelters.includes(to) && intrudersIn(context.view, to).length === 0;
  if (freeShelter) return 0;
  return followChance(context, from, to) * attacksFromRoom(context, from) * context.tuning.tactics.pursuit.returnTrip;
}
