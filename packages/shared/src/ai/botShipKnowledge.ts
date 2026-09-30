import type { CourseMarker, Destination, EngineNumber } from '../types/state.js';
import { COURSE_MARKERS } from '../logic/actionRules.js';
import { engineKey } from './botBeliefs.js';
import type { BotMind } from './botMind.js';

export const ENGINE_NUMBERS: readonly EngineNumber[] = [1, 2, 3];

/** Вероятность, что Двигатель исправен, по убеждению бота: точное знание — 0 или 1. */
export function probabilityWorking(mind: BotMind, engineNumber: EngineNumber): number {
  const belief = mind.engines[engineKey(engineNumber)!];
  return belief.known === null ? belief.pWorking : belief.known ? 1 : 0;
}

/** Корабль долетит, если исправны хотя бы 2 Двигателя из 3 (стр. 11). */
export function probabilityEnginesHold(mind: BotMind): number {
  const [first, second, third] = ENGINE_NUMBERS.map((engine) => probabilityWorking(mind, engine)) as [
    number,
    number,
    number,
  ];
  return (
    first * second * third + first * second * (1 - third) + first * (1 - second) * third + (1 - first) * second * third
  );
}

export function destinationChance(mind: BotMind, marker: CourseMarker, destination: Destination): number {
  return mind.coordinates.byMarker[marker][destination];
}

export function bestMarkerFor(mind: BotMind, destination: Destination): CourseMarker {
  return COURSE_MARKERS.reduce((best, marker) =>
    destinationChance(mind, marker, destination) > destinationChance(mind, best, destination) ? marker : best,
  );
}

export function isEngineUncertain(mind: BotMind, engineNumber: EngineNumber): boolean {
  return mind.engines[engineKey(engineNumber)!].known === null;
}
