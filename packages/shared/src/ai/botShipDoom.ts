import { FIRE_MARKER_SUPPLY, MALFUNCTION_MARKER_SUPPLY } from '../data/markerSupply.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { roundsLeft } from './botRisk.js';
import type { BotTuning } from './botTuning.js';

export type ShipMarker = 'MALFUNCTION' | 'FIRE';

export function markersLeft(view: SanitizedGameState, marker: ShipMarker): number {
  const rooms = Object.values(view.ship.rooms);
  return marker === 'MALFUNCTION'
    ? MALFUNCTION_MARKER_SUPPLY - rooms.filter((room) => room.hasMalfunction).length
    : FIRE_MARKER_SUPPLY - rooms.filter((room) => room.hasFire).length;
}

/** Хвост Пуассона: шанс, что придёт больше `left` маркеров при среднем притоке `inflow`. */
function exceedChance(left: number, inflow: number): number {
  let term = Math.exp(-inflow);
  let atMost = term;
  for (let count = 1; count <= left; count++) {
    term *= inflow / count;
    atMost += term;
  }
  return Math.max(0, 1 - atMost);
}

/** Ожидаемый приток маркеров до конца партии: События, а Пожару — ещё и распространение от горящих Комнат. */
function expectedInflow(view: SanitizedGameState, marker: ShipMarker, tuning: BotTuning): number {
  const { shipInflowPerRound, fireSpread } = tuning.tactics;
  const rounds = Math.max(1, roundsLeft(view));
  if (marker === 'MALFUNCTION') return shipInflowPerRound.MALFUNCTION * rounds;
  const burning = FIRE_MARKER_SUPPLY - markersLeft(view, 'FIRE');
  return shipInflowPerRound.FIRE * rounds * (1 + burning * fireSpread);
}

/**
 * Шанс гибели корабля от маркеров этого вида (стр. 11, 17), если в запасе останется `left`: События приходят
 * по Пуассону, каждое кладёт пачку маркеров; запас кончится, когда пачек придёт больше, чем в нём помещается.
 */
export function breachChance(view: SanitizedGameState, marker: ShipMarker, left: number, tuning: BotTuning): number {
  if (left < 0) return 1;
  const burst = tuning.tactics.shipBurst[marker];
  const events = expectedInflow(view, marker, tuning) / burst;
  const fitting = left / burst;
  const whole = Math.floor(fitting);
  const partial = fitting - whole;
  return (1 - partial) * exceedChance(whole, events) + partial * exceedChance(whole + 1, events);
}

/** Сколько гибели корабля добавит ещё один маркер: при пустом запасе — гибель сразу. */
export function markerCost(view: SanitizedGameState, marker: ShipMarker, tuning: BotTuning): number {
  const left = markersLeft(view, marker);
  if (left <= 0) return 1;
  return breachChance(view, marker, left - 1, tuning) - breachChance(view, marker, left, tuning);
}

/** Сколько гибели корабля снимет один убранный маркер. */
export function markerRelief(view: SanitizedGameState, marker: ShipMarker, tuning: BotTuning): number {
  const left = markersLeft(view, marker);
  return breachChance(view, marker, left, tuning) - breachChance(view, marker, left + 1, tuning);
}
