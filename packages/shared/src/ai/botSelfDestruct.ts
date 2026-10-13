import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { SELF_DESTRUCT_EXPLODES_AT, SELF_DESTRUCT_IRREVERSIBLE_AT, podSectionOfRoom } from '../data/evacuation.js';
import { isPodUsable } from '../logic/actionRules.js';
import { handOf } from './botHand.js';
import { roomTypeProbability } from './botNavigation.js';
import { roundsLeft } from './botRisk.js';
import { shelterAccess, shelterRoute } from './botShelter.js';
import { task, type BotTask } from './botTasks.js';
import { POD_DEFINITIONS, type ThreatContext } from './botThreat.js';
import type { BotTuning } from './botTuning.js';

export function isSelfDestructArmed(view: SanitizedGameState): boolean {
  return view.meta.selfDestructTrackPosition !== null;
}

/** Самоуничтожение ещё можно остановить: маркер на зелёном делении (стр. 24). */
export function canStopSelfDestruct(view: SanitizedGameState): boolean {
  const position = view.meta.selfDestructTrackPosition;
  return position !== null && position < SELF_DESTRUCT_IRREVERSIBLE_AT;
}

/** Запустить Самоуничтожение нельзя, пока кто-то в Анабиозе (стр. 24). */
export function canStartSelfDestruct(view: SanitizedGameState): boolean {
  return (
    view.meta.selfDestructTrackPosition === null &&
    !Object.values(view.players).some((player) => player.isInHibernation)
  );
}

function hasFreePod(view: SanitizedGameState, definitionId: string): boolean {
  const section = podSectionOfRoom(definitionId);
  return Object.values(view.ship.escapePods).some(
    (pod) => pod.section === section && isPodUsable(pod) && pod.occupantIds.length < 2,
  );
}

/**
 * Шанс погибнуть при взрыве, если Самоуничтожение с деления `position` дойдёт до конца (стр. 11, 24): на жёлтом
 * делении Капсулы разблокируются сами (стр. 12), и сесть надо успеть до взрыва и до Прыжка — Прыжок при идущем
 * Самоуничтожении тоже губит корабль. Шанс уйти — лучший Спасательный отсек с исправной Капсулой: вред пути,
 * доступность отсека и карты на Движения и посадку, пока Капсулы ещё заперты, — лишь с раунда их разблокировки.
 */
export function explosionDeath(context: ThreatContext, position: number): number {
  const { view, self } = context;
  const rounds = Math.min(SELF_DESTRUCT_EXPLODES_AT - position, roundsLeft(view));
  const lockedFor = Object.values(view.ship.escapePods).some((pod) => isPodUsable(pod) && !pod.isLocked)
    ? 0
    : Math.max(0, SELF_DESTRUCT_IRREVERSIBLE_AT - position);
  const usableRounds = rounds - lockedFor;
  if (usableRounds <= 0) return 1;
  const cards = (lockedFor === 0 ? handOf(view, self.id).length : self.handLimit) + self.handLimit * (usableRounds - 1);
  const escape = Object.values(view.ship.rooms).reduce((best, room) => {
    const probability = POD_DEFINITIONS.filter((definitionId) => hasFreePod(view, definitionId)).reduce(
      (sum, definitionId) => sum + roomTypeProbability(view, room.id, definitionId),
      0,
    );
    if (probability === 0 || room.hasMalfunction) return best;
    const route = shelterRoute(context, self.roomId, room.id, 1);
    if (!route || route.moves + 1 > cards) return best;
    const arrival = Math.max(0, 1 - route.harm) * shelterAccess(context, room.id);
    return Math.max(best, Math.min(1, probability) * arrival);
  }, 0);
  return 1 - escape;
}

/**
 * Остановить Самоуничтожение (Генератор, стр. 24), пока маркер на зелёном: задача весит шанс погибнуть при взрыве.
 * Её нет у бота, чья Цель требует гибели корабля.
 */
export function stopSelfDestructTasks(
  context: ThreatContext,
  self: SanitizedPlayerState,
  wantsShipDestroyed: boolean,
  tuning: BotTuning,
): BotTask[] {
  const position = context.view.meta.selfDestructTrackPosition;
  if (position === null || !canStopSelfDestruct(context.view) || wantsShipDestroyed || self.isInHibernation) {
    return [];
  }
  const lifeline = tuning.desires.SURVIVE * tuning.tactics.harm.weight;
  const death = explosionDeath(context, position);
  if (death === 0) return [];
  return [
    task(
      'STOP_SELF_DESTRUCT',
      'SURVIVE',
      lifeline * death,
      { definitionIds: ['GENERATOR'] },
      'Остановить Самоуничтожение',
    ),
  ];
}
