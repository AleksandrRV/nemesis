import type { CommsClaim, CommsDraft, CommsMessage } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { CourseMarker, Destination, EngineNumber } from '../types/state.js';
import { engineKey } from './botBeliefs.js';
import { effectiveKnobs } from './botCharacter.js';
import { engineEpoch } from './botClaims.js';
import type { BotMind, OwnLie } from './botMind.js';
import { ownObjectiveConflict } from './botObjectives.js';
import { othersSuccessWeight } from './botSocial.js';
import type { BotTuning } from './botTuning.js';

export interface ClaimPlan {
  draft: Extract<CommsDraft, { kind: 'CLAIM' }>;
  isLie: boolean;
  /** Выгода лжи, шанс разоблачения и итоговый перевес — для Инспектора ботов и тестов. */
  benefit: number;
  exposure: number;
}

const DESTINATIONS: readonly Destination[] = ['EARTH', 'MARS', 'VENUS', 'DEEP_SPACE'];

function lastIndexWhere<T>(items: readonly T[], matches: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index--) if (matches(items[index]!)) return index;
  return -1;
}

/** Кто ещё знает правду: другие игроки, проверявшие Двигатель после последней перестановки. */
function engineInspectorsSinceFlip(mind: BotMind, engineNumber: number): number {
  const lastFlip = lastIndexWhere(
    mind.facts,
    (fact) => fact.kind === 'ENGINE_ORDER_CHANGED' && fact.engineNumber === engineNumber,
  );
  const inspectors = new Set(
    mind.facts
      .slice(lastFlip + 1)
      .filter(
        (fact) =>
          fact.kind === 'ENGINES_CHECKED' && fact.playerId !== mind.botId && fact.engineNumbers.includes(engineNumber),
      )
      .map((fact) => (fact.kind === 'ENGINES_CHECKED' ? fact.playerId : '')),
  );
  return inspectors.size;
}

function coordinatesInspectors(mind: BotMind): number {
  return new Set(
    mind.facts
      .filter((fact) => fact.kind === 'COORDINATES_CHECKED' && fact.playerId !== mind.botId)
      .map((fact) => (fact.kind === 'COORDINATES_CHECKED' ? fact.playerId : '')),
  ).size;
}

function lieBenefit(view: SanitizedGameState, mind: BotMind, infoValue: number, tuning: BotTuning): number {
  const spite = -othersSuccessWeight(mind.character, mind.difficulty, tuning) * infoValue;
  return spite + (ownObjectiveConflict(view, mind.botId) ? tuning.lying.objectiveConflictBonus : 0);
}

/** Политика лжи (В8-6-5): лгать, если выгода выше цены разоблачения, умноженной на его шанс. */
function prefersLie(benefit: number, exposure: number, mind: BotMind, tuning: BotTuning): boolean {
  const threshold =
    tuning.lying.benefitThreshold * effectiveKnobs(mind.character, mind.difficulty, tuning).lieThreshold;
  return benefit - tuning.lying.exposurePenalty * exposure > threshold;
}

function exposureFrom(inspectors: number, tuning: BotTuning): number {
  return Math.min(1, tuning.lying.exposureBase + tuning.lying.exposurePerInspector * inspectors);
}

function keptLine(mind: BotMind, matches: (lie: OwnLie) => boolean): CommsClaim | null {
  return mind.ownLies[lastIndexWhere(mind.ownLies, matches)]?.body ?? null;
}

/** Что сказать о Двигателе после своей Проверки: правду или ложь — и держать линию, пока помнит. */
export function planEngineClaim(
  view: SanitizedGameState,
  mind: BotMind,
  engineNumber: EngineNumber,
  tuning: BotTuning,
): ClaimPlan | null {
  const key = engineKey(engineNumber);
  const known = key ? mind.engines[key].known : null;
  if (known === null) return null;
  const epoch = engineEpoch(mind, engineNumber);
  const exposure = exposureFrom(engineInspectorsSinceFlip(mind, engineNumber), tuning);
  const benefit = lieBenefit(view, mind, tuning.lying.engineInfoValue, tuning);
  const line = keptLine(
    mind,
    (lie) => lie.epoch === epoch && lie.body.topic === 'ENGINE_STATUS' && lie.body.engineNumber === engineNumber,
  );
  const isLie = line !== null || prefersLie(benefit, exposure, mind, tuning);
  const saysWorking = isLie ? !known : known;
  return {
    draft: {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_STATUS', engineNumber, status: saysWorking ? 'WORKING' : 'DAMAGED' },
    },
    isLie,
    benefit,
    exposure,
  };
}

function knownDestination(mind: BotMind, marker: CourseMarker): Destination | null {
  if (mind.coordinates.cardId === null) return null;
  return DESTINATIONS.find((destination) => mind.coordinates.byMarker[marker][destination] === 1) ?? null;
}

/** Ложь о Координатах уводит экипаж: Земля выдаётся за чужой пункт, чужой пункт — за Землю. */
function misleadingDestination(truth: Destination): Destination {
  return truth === 'EARTH' ? 'DEEP_SPACE' : 'EARTH';
}

export function planCoordinatesClaim(
  view: SanitizedGameState,
  mind: BotMind,
  marker: CourseMarker,
  tuning: BotTuning,
): ClaimPlan | null {
  const truth = knownDestination(mind, marker);
  if (truth === null) return null;
  const exposure = exposureFrom(coordinatesInspectors(mind), tuning);
  const benefit = lieBenefit(view, mind, tuning.lying.coordinatesInfoValue, tuning);
  const line = keptLine(mind, (lie) => lie.body.topic === 'COORDINATES' && lie.body.marker === marker);
  const isLie = line !== null || prefersLie(benefit, exposure, mind, tuning);
  const destination = line?.topic === 'COORDINATES' ? line.destination : isLie ? misleadingDestination(truth) : truth;
  return {
    draft: { kind: 'CLAIM', to: 'ALL', body: { topic: 'COORDINATES', marker, destination } },
    isLie,
    benefit,
    exposure,
  };
}

/** Своё Заявление, расходящееся со своим знанием, запоминается как ложь — чтобы держать линию. */
export function recordOwnClaim(mind: BotMind, message: Extract<CommsMessage, { kind: 'CLAIM' }>): BotMind {
  const body = message.body;
  let isLie = false;
  let epoch = 0;
  if (body.topic === 'ENGINE_STATUS') {
    const key = engineKey(body.engineNumber);
    const known = key ? mind.engines[key].known : null;
    epoch = engineEpoch(mind, body.engineNumber);
    isLie = known !== null && known !== (body.status === 'WORKING');
  } else if (body.topic === 'COORDINATES') {
    const truth = knownDestination(mind, body.marker);
    isLie = truth !== null && truth !== body.destination;
  }
  if (!isLie) return mind;
  return { ...mind, ownLies: [...mind.ownLies, { messageId: message.id, round: message.round, body, epoch }] };
}
