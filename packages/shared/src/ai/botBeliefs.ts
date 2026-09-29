import { COORDINATE_CARDS } from '../data/coordinateCards.js';
import type { CourseMarker, Destination } from '../types/state.js';
import type {
  BetaScale,
  BotMind,
  CoordinatesBelief,
  DestinationDistribution,
  EngineBelief,
  PlayerModel,
} from './botMind.js';
import type { BotTuning } from './botTuning.js';
import type { Rng } from '../utils/rng.js';

const MARKERS: readonly CourseMarker[] = ['A', 'B', 'C', 'D'];
const DESTINATIONS: readonly Destination[] = ['EARTH', 'MARS', 'VENUS', 'DEEP_SPACE'];

type EngineKey = '1' | '2' | '3';

export function engineKey(engineNumber: number): EngineKey | null {
  return engineNumber === 1 || engineNumber === 2 || engineNumber === 3 ? (String(engineNumber) as EngineKey) : null;
}

/** Априорная пара жетонов (стр. 7, шаг 8): один Исправный и один Неисправный, верхний случаен. */
export function priorEngineBelief(): EngineBelief {
  return { pWorking: 0.5, known: null, knownSinceRound: null, source: 'PRIOR' };
}

export function initialEngineBeliefs(): Record<EngineKey, EngineBelief> {
  return { '1': priorEngineBelief(), '2': priorEngineBelief(), '3': priorEngineBelief() };
}

/** Координаты до проверки: доля карт колоды, где маркер ведёт в каждый пункт назначения. */
export function priorCoordinatesBelief(): CoordinatesBelief {
  const byMarker = Object.fromEntries(
    MARKERS.map((marker) => {
      const counts = Object.fromEntries(DESTINATIONS.map((destination) => [destination, 0])) as DestinationDistribution;
      for (const card of COORDINATE_CARDS) counts[card.destinations[marker]] += 1;
      for (const destination of DESTINATIONS) counts[destination] /= COORDINATE_CARDS.length;
      return [marker, counts];
    }),
  ) as Record<CourseMarker, DestinationDistribution>;
  return { cardId: null, byMarker };
}

export function knownCoordinates(cardId: string): CoordinatesBelief {
  const card = COORDINATE_CARDS.find((entry) => entry.id === cardId);
  if (!card) return priorCoordinatesBelief();
  const byMarker = Object.fromEntries(
    MARKERS.map((marker) => [
      marker,
      Object.fromEntries(
        DESTINATIONS.map((destination) => [destination, card.destinations[marker] === destination ? 1 : 0]),
      ),
    ]),
  ) as Record<CourseMarker, DestinationDistribution>;
  return { cardId, byMarker };
}

export function certainEngine(isWorking: boolean, round: number, source: EngineBelief['source']): EngineBelief {
  return { pWorking: isWorking ? 1 : 0, known: isWorking, knownSinceRound: round, source };
}

/** Объявление о перестановке (Р-4): знал S — теперь не S; не знал — вероятность отражается. */
export function flipEngine(belief: EngineBelief): EngineBelief {
  if (belief.known !== null)
    return { ...belief, known: !belief.known, pWorking: belief.known ? 0 : 1, source: 'INFERRED' };
  return { ...belief, pWorking: 1 - belief.pWorking };
}

export function scaleMean(scale: BetaScale): number {
  return scale.alpha / (scale.alpha + scale.beta);
}

/** Вес слов игрока: ниже порога скепсиса Заявления почти не слышны. */
export function claimWeight(model: PlayerModel | undefined, tuning: BotTuning): number {
  const honesty = model ? scaleMean(model.honesty) : tuning.trust.initial;
  if (honesty < tuning.trust.skepticismFloor) return 0;
  return tuning.trust.claimInfluence * honesty;
}

/** Заявление сдвигает лишь то, чего бот не знает сам. */
export function applyEngineClaim(belief: EngineBelief, saysWorking: boolean, weight: number): EngineBelief {
  if (belief.known !== null || weight <= 0) return belief;
  const target = saysWorking ? 1 : 0;
  return { ...belief, pWorking: belief.pWorking + weight * (target - belief.pWorking), source: 'CLAIMS' };
}

function normalize(distribution: DestinationDistribution): DestinationDistribution {
  const total = DESTINATIONS.reduce((sum, destination) => sum + distribution[destination], 0);
  if (total <= 0) return distribution;
  return Object.fromEntries(
    DESTINATIONS.map((destination) => [destination, distribution[destination] / total]),
  ) as DestinationDistribution;
}

function leanTowards(
  distribution: DestinationDistribution,
  destinations: readonly Destination[],
  weight: number,
): DestinationDistribution {
  const target = Object.fromEntries(
    DESTINATIONS.map((destination) => [destination, destinations.includes(destination) ? 1 / destinations.length : 0]),
  ) as DestinationDistribution;
  return normalize(
    Object.fromEntries(
      DESTINATIONS.map((destination) => [
        destination,
        distribution[destination] + weight * (target[destination] - distribution[destination]),
      ]),
    ) as DestinationDistribution,
  );
}

export function applyCoordinatesClaim(
  belief: CoordinatesBelief,
  marker: CourseMarker,
  destinations: readonly Destination[],
  weight: number,
): CoordinatesBelief {
  if (belief.cardId !== null || weight <= 0) return belief;
  return {
    ...belief,
    byMarker: { ...belief.byMarker, [marker]: leanTowards(belief.byMarker[marker], destinations, weight) },
  };
}

export const COURSE_CLAIM_DESTINATIONS: Record<'TO_EARTH' | 'NOT_EARTH', readonly Destination[]> = {
  TO_EARTH: ['EARTH'],
  NOT_EARTH: ['MARS', 'VENUS', 'DEEP_SPACE'],
};

/** Вероятность прилететь на Землю при текущем маркере Курса — по знанию бота. */
export function earthProbability(belief: CoordinatesBelief, currentMarker: CourseMarker): number {
  return belief.byMarker[currentMarker].EARTH;
}

/** «Склеротик»: за раунд каждое точное знание может забыться — тогда остаётся только априорное. */
export function forgetKnowledge(mind: BotMind, chance: number, rng: Rng): BotMind {
  if (chance <= 0) return mind;
  const engines = { ...mind.engines };
  for (const key of ['1', '2', '3'] as const) {
    if (engines[key].known !== null && rng() < chance) engines[key] = priorEngineBelief();
  }
  const coordinates = mind.coordinates.cardId !== null && rng() < chance ? priorCoordinatesBelief() : mind.coordinates;
  return { ...mind, engines, coordinates };
}
