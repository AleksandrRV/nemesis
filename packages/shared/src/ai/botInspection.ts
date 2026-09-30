import type { GameAction } from '../types/actions.js';
import type { CommsClaim } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { CourseMarker, Destination } from '../types/state.js';
import { generateCandidates } from './botActions.js';
import { activePersona, effectiveKnobs } from './botCharacter.js';
import type { CandidateKind } from './botCandidates.js';
import { buildAgenda } from './botGoals.js';
import type { BotMind, BotPlan, EngineBelief, OwnPromise, SocialEvidence } from './botMind.js';
import { observe } from './botObserver.js';
import { scaleMean, trustIn } from './botSocial.js';
import type { BotTask } from './botTasks.js';
import { BOT_TUNING, type BotDifficulty, type BotTraitId, type BotTuning, type TuningKnob } from './botTuning.js';
import { scoreCandidates, type UtilityFactors } from './botUtility.js';

const TOP_CANDIDATES = 5;
const TOP_TASKS = 6;
const RECENT_EVIDENCE = 5;
const COURSE_MARKERS: readonly CourseMarker[] = ['A', 'B', 'C', 'D'];

export interface InspectedTrust {
  playerId: string;
  trust: number;
  honesty: number;
  reliability: number;
  goodwill: number;
  skepticism: number;
  evidence: SocialEvidence[];
}

export interface InspectedCandidate {
  action: GameAction;
  kind: CandidateKind;
  utility: number;
  task: string | null;
  factors: UtilityFactors;
}

export interface InspectedObjectiveGuess {
  playerId: string;
  cardId: string;
  probability: number;
}

/** Всё, что Инспектор ботов (В8-9-1, только dev-сборка) показывает о мыслях бота. */
export interface BotInspection {
  botId: string;
  difficulty: BotDifficulty;
  traits: BotTraitId[];
  alterTraits: BotTraitId[] | null;
  activePersona: 'PRIMARY' | 'ALTER';
  morale: number;
  knobs: Record<TuningKnob, number>;
  objectives: { id: string; name: string }[];
  objectiveGuesses: InspectedObjectiveGuess[];
  engines: Record<'1' | '2' | '3', EngineBelief>;
  coordinatesKnown: boolean;
  course: Record<CourseMarker, Record<Destination, number>>;
  trust: InspectedTrust[];
  plan: BotPlan | null;
  danger: number;
  timePressure: number;
  tasks: Pick<BotTask, 'kind' | 'desire' | 'weight' | 'reason'>[];
  candidates: InspectedCandidate[];
  lies: { messageId: string; round: number; body: CommsClaim }[];
  promises: OwnPromise[];
}

function strongestGuesses(mind: BotMind): InspectedObjectiveGuess[] {
  return Object.entries(mind.objectiveGuesses).flatMap(([playerId, guesses]) => {
    const [cardId, probability] = Object.entries(guesses).sort((left, right) => right[1] - left[1])[0] ?? [];
    return cardId === undefined || probability === undefined ? [] : [{ playerId, cardId, probability }];
  });
}

/**
 * Разбор решения бота по его срезу (В8-9-1): тот же путь, что у `BotAgent.decide`, но без броска выбора и без
 * изменения памяти. Черты здесь видны — поэтому вызывает его только dev-канал транспорта.
 */
export function inspectBot(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotInspection {
  const seen = observe(view, mind, tuning);
  const persona = activePersona(seen.character);
  const agenda = buildAgenda(view, seen, tuning);
  const scored = scoreCandidates(view, seen, agenda, generateCandidates(view, seen, agenda.tasks, tuning), tuning);
  return {
    botId: seen.botId,
    difficulty: seen.difficulty,
    traits: [...seen.character.traits],
    alterTraits: seen.character.alterEgo ? [...seen.character.alterEgo.traits] : null,
    activePersona: seen.character.activePersona,
    morale: persona.morale,
    knobs: effectiveKnobs(seen.character, seen.difficulty, tuning),
    objectives: (view.players[seen.botId]?.objectives ?? []).map((card) => ({ id: card.id, name: card.name })),
    objectiveGuesses: strongestGuesses(seen),
    engines: seen.engines,
    coordinatesKnown: seen.coordinates.cardId !== null,
    course: Object.fromEntries(COURSE_MARKERS.map((marker) => [marker, seen.coordinates.byMarker[marker]])) as Record<
      CourseMarker,
      Record<Destination, number>
    >,
    trust: Object.entries(seen.players).map(([playerId, model]) => ({
      playerId,
      trust: trustIn(model, tuning),
      honesty: scaleMean(model.honesty),
      reliability: scaleMean(model.reliability),
      goodwill: scaleMean(model.goodwill),
      skepticism: model.skepticism,
      evidence: model.evidence.slice(-RECENT_EVIDENCE),
    })),
    plan: seen.plan,
    danger: agenda.danger,
    timePressure: agenda.timePressure,
    tasks: [...agenda.tasks]
      .sort((left, right) => right.weight - left.weight)
      .slice(0, TOP_TASKS)
      .map(({ kind, desire, weight, reason }) => ({ kind, desire, weight, reason })),
    candidates: scored.slice(0, TOP_CANDIDATES).map((entry) => ({
      action: entry.candidate.action,
      kind: entry.candidate.kind,
      utility: entry.utility,
      task: entry.task?.reason ?? null,
      factors: entry.factors,
    })),
    lies: seen.ownLies.map(({ messageId, round, body }) => ({ messageId, round, body })),
    promises: seen.ownPromises,
  };
}
