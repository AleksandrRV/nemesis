import type { EventCard } from '../types/cards.js';
import type { IntruderEntity } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { findNoiseTarget } from '../logic/shipGraphQueries.js';
import { eventDeckOf } from './botEventDeck.js';
import { findRoute } from './botNavigation.js';
import type { BotTask } from './botTasks.js';
import {
  crewIn,
  entryHarm,
  attacksFromRoom,
  intrudersIn,
  mostDangerous,
  shooterOf,
  standingAtEventPhase,
  type ThreatContext,
} from './botThreat.js';

/** Укрытия от Прыжка (стр. 11): Анабиоз и Капсула — Действия Комнаты, а в Бою их не выполнить (стр. 25). */
export const SHELTER_TASKS: ReadonlySet<BotTask['kind']> = new Set(['HIBERNATE', 'BOARD_POD']);

function leadsOut(view: SanitizedGameState, roomId: RoomId, card: EventCard): boolean {
  const target = findNoiseTarget(view, roomId, card.corridorNumber);
  return target.kind === 'TECHNICAL_CORRIDOR' || (target.kind === 'CORRIDOR' && target.corridor.doorState !== 'CLOSED');
}

/**
 * Шанс, что Чужой вне Боя уйдёт из Комнаты в ближайшей Фазе Событий: карта с его символом ведёт в Коридор без
 * закрытой Двери или в Технические Коридоры (стр. 10, 16–17).
 */
export function eventLeaveChance(view: SanitizedGameState, intruder: IntruderEntity): number {
  if (crewIn(view, intruder.roomId).length > 0) return 0;
  const deck = eventDeckOf(view);
  if (deck.length === 0) return 0;
  const leaving = deck.filter(
    (card) => card.intruderTypes.includes(intruder.type) && leadsOut(view, intruder.roomId, card),
  );
  return leaving.length / deck.length;
}

/**
 * Доступность укрытия: каждый его Чужой должен уйти — сам по карте События до прихода бота или под огнём бота с
 * добранной рукой (огонь сходится на самом опасном). Бот, который будет в укрытии к Фазе Событий (`present`), держит
 * Чужого в Бою: по карте События тот не уйдёт (стр. 9, 18).
 */
export function shelterAccess(context: ThreatContext, roomId: RoomId, present = false): number {
  const intruders = intrudersIn(context.view, roomId);
  if (intruders.length === 0) return 1;
  const shooter = shooterOf(context.self, context.self.handLimit);
  const target = mostDangerous(context, intruders);
  return intruders.reduce((access, intruder) => {
    const fire = intruder === target && shooter && shooter.attempts > 0 ? [shooter] : [];
    const leaves = present ? 0 : eventLeaveChance(context.view, intruder);
    const stays = (1 - leaves) * standingAtEventPhase(context, intruder, undefined, fire);
    return access * (1 - stays);
  }, 1);
}

/** Оставшийся путь к укрытию: его вред и число Движений до входа. */
export interface ShelterRoute {
  harm: number;
  moves: number;
}

/**
 * Путь к укрытию (стр. 13–19): уходя из Комнаты с Чужими — Атака каждого, входя в Комнату — бросок Шума и жетон
 * Исследования с добранной рукой без карты на Движение; в занятом укрытии — Атаки, пока оно не освободится. Пути нет
 * — дойти нельзя.
 */
export function shelterRoute(
  context: ThreatContext,
  from: RoomId,
  shelter: RoomId,
  riskAversion: number,
): ShelterRoute | null {
  const route = findRoute(context.view, from, [shelter], context.tuning, riskAversion);
  if (!route) return null;
  let harm = 0;
  let current = from;
  for (const next of route.path) {
    harm += attacksFromRoom(context, current) + entryHarm(context, next, context.self.handLimit - 1, false);
    current = next;
  }
  const moves = route.path.length;
  if (moves > 0) harm += (1 - shelterAccess(context, shelter)) * attacksFromRoom(context, shelter);
  return { harm, moves };
}

/** Вред оставшегося пути к укрытию; пути нет — бесконечность. */
export function routeHarm(context: ThreatContext, from: RoomId, shelter: RoomId, riskAversion: number): number {
  return shelterRoute(context, from, shelter, riskAversion)?.harm ?? Number.POSITIVE_INFINITY;
}
