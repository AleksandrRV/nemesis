import type { RoomId } from '../types/rooms.js';
import type { Candidate } from './botCandidates.js';
import { handOf } from './botHand.js';
import { isPodUsable } from '../logic/actionRules.js';
import { hopDistances } from './botGraph.js';
import { roundsLeft } from './botRisk.js';
import {
  survivalUnderFire,
  combatHarm,
  entryHarm,
  hazardHarm,
  intruderHarm,
  intrudersIn,
  shooterOf,
  type Shooter,
  type ThreatContext,
} from './botThreat.js';

/** Прогноз вреда Действия в долях гибели: сразу (Атаки Побега, Встреча) и до конца раунда (Бой, Пожар). */
export interface HarmForecast {
  now: number;
  later: number;
}

export function forecastTotal(forecast: HarmForecast): number {
  return forecast.now + forecast.later;
}

const ROLLING_MOVES: ReadonlySet<Candidate['kind']> = new Set(['MOVE', 'ESCAPE', 'COVERED_ESCAPE']);

export function isRelocation(candidate: Candidate): boolean {
  return ROLLING_MOVES.has(candidate.kind) || candidate.kind === 'CAREFUL_MOVE';
}

function futureShooter(context: ThreatContext, candidate: Candidate | null, handAfter: number): Shooter | null {
  if (candidate?.kind === 'PASS') return null;
  const shooter = shooterOf(context.self, handAfter);
  if (!shooter) return null;
  const ammoLeft = (shooter.weapon.ammo ?? 0) - (candidate?.ammoUsed ?? 0);
  const trusted = Math.floor(Math.min(ammoLeft, handAfter) * context.tuning.tactics.harm.futureShotTrust + 0.5);
  return trusted > 0 ? { weapon: shooter.weapon, attempts: trusted } : null;
}

function escapeAttacks(context: ThreatContext, roomId: RoomId): number {
  return intrudersIn(context.view, roomId).reduce((sum, intruder) => sum + intruderHarm(context, intruder.type), 0);
}

function roundEndHarm(context: ThreatContext, roomId: RoomId, handAfter: number, candidate: Candidate | null) {
  const removed = new Map((candidate?.neutralizes ?? []).map((entry) => [entry.intruderId, entry.chance]));
  const focusId = candidate?.neutralizes?.[0]?.intruderId;
  return (
    combatHarm(context, roomId, {
      handAfter,
      ownShots: futureShooter(context, candidate, handAfter),
      removed,
      ...(focusId ? { focusId } : {}),
    }) + hazardHarm(context, roomId)
  );
}

const SHELTER_ACTION_COST = 2;
/** Отложить Анабиоз на Действие в последнем раунде — риск меньше шага, но не ноль: может прийти Чужой. */
const DELAY_SHARE = 0.3;
const SHELTER_EFFECTS: ReadonlySet<string> = new Set(['HIBERNATE', 'BOARD_POD']);

/** Укрытия от Прыжка (стр. 11): исправный Криогенный отсек и Комнаты с открытой Капсулой. */
function shelterRooms(context: ThreatContext): RoomId[] {
  const { view } = context;
  const podsOpen = Object.values(view.ship.escapePods).some((pod) => isPodUsable(pod) && !pod.isLocked);
  return Object.values(view.ship.rooms)
    .filter(
      (room) =>
        (room.definitionId === 'HIBERNATORIUM' && !room.hasMalfunction) ||
        (podsOpen && (room.definitionId === 'ESCAPE_POD_A' || room.definitionId === 'ESCAPE_POD_B')),
    )
    .map((room) => room.id);
}

/**
 * Прыжок в конце раунда (стр. 11): кто не в Анабиозе и не в Капсуле, погибает. Шанс не успеть — по расстоянию до
 * укрытия, картам на Движения и Действие Комнаты и Чужим, которых ещё надо убрать из укрытия.
 */
function unshelteredAtJump(context: ThreatContext, candidate: Candidate | null, handAfter: number): number {
  if (roundsLeft(context.view) > 1 || !candidate) return 0;
  if (candidate.effects.some((produced) => SHELTER_EFFECTS.has(produced.kind))) return 0;
  if (candidate.kind === 'PASS') return 1;
  const room = candidate.roomId;
  const distances = hopDistances(context.view, room);
  const shelters = shelterRooms(context);
  const hops = Math.min(...shelters.map((shelter) => distances.get(shelter) ?? Number.POSITIVE_INFINITY));
  if (!Number.isFinite(hops) || handAfter < hops + SHELTER_ACTION_COST) return 1;
  if (hops > 0) {
    const occupied = shelters.some(
      (shelter) => distances.get(shelter) === hops && intrudersIn(context.view, shelter).length > 0,
    );
    const { jumpStepRisk } = context.tuning.tactics;
    return Math.min(1, hops * jumpStepRisk + (occupied ? jumpStepRisk * 2 : 0));
  }
  const removed = new Map((candidate.neutralizes ?? []).map((entry) => [entry.intruderId, entry.chance]));
  const shooter = futureShooter(context, candidate, handAfter - SHELTER_ACTION_COST);
  const clear = intrudersIn(context.view, room).reduce(
    (chance, intruder) =>
      chance *
      (1 - (1 - (removed.get(intruder.id) ?? 0)) * survivalUnderFire(context, intruder, shooter ? [shooter] : [])),
    1,
  );
  return 1 - clear * (1 - context.tuning.tactics.jumpStepRisk * DELAY_SHARE);
}

/**
 * Прогноз вреда (В8-10): Побег — Атака каждого Чужого Комнаты (стр. 19); вход — Встреча по Шуму и жетон
 * Исследования; остаться — Бой до Фазы Событий с учётом выстрелов бота и союзников и Пожар в Комнате.
 */
export function forecastHarm(context: ThreatContext, candidate: Candidate | null): HarmForecast {
  const here = context.self.roomId;
  const hand = handOf(context.view, context.self.id).length;
  const handAfter = Math.max(0, hand - (candidate?.cardsUsed ?? 0));
  const target = candidate?.roomId ?? here;
  const own = candidate?.harmNow ?? 0;
  const jump = unshelteredAtJump(context, candidate, handAfter);
  if (!candidate || !isRelocation(candidate) || target === here) {
    return { now: own, later: roundEndHarm(context, here, handAfter, candidate) + jump };
  }
  const attacks = candidate.kind === 'ESCAPE' ? escapeAttacks(context, here) : 0;
  const entry = entryHarm(context, target, handAfter, candidate.kind === 'CAREFUL_MOVE');
  return { now: own + attacks + entry, later: roundEndHarm(context, target, handAfter, candidate) + jump };
}
