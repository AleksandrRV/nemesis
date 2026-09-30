import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { Candidate } from './botCandidates.js';
import { botStream, effectiveKnobs } from './botCharacter.js';
import { clamp01, evaluateCurve } from './botCurves.js';
import type { BotAgenda } from './botGoals.js';
import type { BotMind } from './botMind.js';
import { costsToGoals, roomTypeProbability, type GoalRoom } from './botNavigation.js';
import { suspectedEnemies } from './botObjectives.js';
import { escapeCost } from '../logic/seriousWoundEffects.js';
import { handOf } from './botHand.js';
import { entryRisk, roomThreat } from './botRisk.js';
import { detailMatches, type BotTask } from './botTasks.js';
import type { BotTuning, TuningKnob } from './botTuning.js';

export interface ScoredCandidate {
  candidate: Candidate;
  utility: number;
  /** Задача, которую Действие продвигает сильнее всего: её желание становится планом бота. */
  task: BotTask | null;
}

interface ScoringContext {
  view: SanitizedGameState;
  mind: BotMind;
  agenda: BotAgenda;
  tuning: BotTuning;
  knobs: Record<TuningKnob, number>;
  here: RoomId;
  costs: Map<BotTask, Map<RoomId, number>>;
  dangerCache: Map<string, number>;
  enemies: string[];
}

function goalRooms(view: SanitizedGameState, entry: BotTask): GoalRoom[] {
  const known = (entry.place.roomIds ?? []).map((roomId) => ({ roomId, probability: 1 }));
  const byType = Object.values(view.ship.rooms).flatMap((room) => {
    const probability = (entry.place.definitionIds ?? []).reduce(
      (sum, definitionId) => sum + roomTypeProbability(view, room.id, definitionId),
      0,
    );
    return probability > 0 ? [{ roomId: room.id, probability: Math.min(1, probability) }] : [];
  });
  return [...known, ...byType];
}

function isPlaced(entry: BotTask): boolean {
  return (entry.place.roomIds?.length ?? 0) > 0 || (entry.place.definitionIds?.length ?? 0) > 0;
}

/** Опасность Комнаты для бота (0–1): кривая `danger` от угрозы в долях Тяжёлой Раны; «Гений» точнее. */
type Arrival = 'STAY' | 'ROLL' | 'CAREFUL';

function dangerOf(context: ScoringContext, roomId: RoomId, arrival: Arrival = 'STAY'): number {
  const key = `${arrival}:${roomId}`;
  if (!context.dangerCache.has(key)) {
    const { view, tuning, knobs, enemies } = context;
    const risk =
      arrival === 'STAY' ? roomThreat(view, roomId, tuning) : entryRisk(view, roomId, tuning, arrival === 'CAREFUL');
    const threat = risk * knobs.riskAversion;
    const estimate = evaluateCurve(tuning.curves.danger, threat / tuning.risk.seriousWound);
    const accuracy = clamp01(knobs.riskAccuracy);
    const shared = view.ship.rooms[roomId]?.occupantPlayerIds.some((id) => enemies.includes(id)) ? 0.2 : 0;
    context.dangerCache.set(
      key,
      clamp01(estimate * accuracy + 0.3 * (1 - accuracy) + shared * knobs.sharedRoomAvoidance),
    );
  }
  return context.dangerCache.get(key)!;
}

function completes(context: ScoringContext, candidate: Candidate, entry: BotTask): boolean {
  const matches = candidate.effects.some(
    (produced) => produced.kind === entry.kind && detailMatches(entry.detail, produced.detail),
  );
  if (!matches) return false;
  if (!isPlaced(entry) || candidate.kind === 'MOVE' || candidate.kind === 'CAREFUL_MOVE') return true;
  const rooms = goalRooms(context.view, entry);
  return rooms.some((goal) => goal.roomId === candidate.roomId && goal.probability >= 1);
}

function costsFor(context: ScoringContext, entry: BotTask): Map<RoomId, number> {
  if (!context.costs.has(entry)) {
    context.costs.set(
      entry,
      costsToGoals(context.view, goalRooms(context.view, entry), context.tuning, context.knobs.riskAversion),
    );
  }
  return context.costs.get(entry)!;
}

/** Движение к цели задачи: доля сокращённого пути, умноженная на кривую расстояния до цели. */
function progress(context: ScoringContext, candidate: Candidate, entry: BotTask): number {
  if (
    (candidate.kind !== 'MOVE' && candidate.kind !== 'ESCAPE' && candidate.kind !== 'CAREFUL_MOVE') ||
    !isPlaced(entry)
  )
    return 0;
  const costs = costsFor(context, entry);
  const now = costs.get(context.here);
  const next = costs.get(candidate.roomId);
  if (now === undefined || next === undefined || next >= now) return 0;
  const hops = next / context.tuning.navigation.actionCost;
  return (
    ((now - next) / Math.max(now, context.tuning.navigation.actionCost)) *
    evaluateCurve(context.tuning.curves.distance, hops)
  );
}

/** Действие оставит бота в опасной Комнате без карт на Побег: в Фазе Событий его атакуют (стр. 10). */
function strandsInDanger(context: ScoringContext, candidate: Candidate): boolean {
  const left = handOf(context.view, context.mind.botId).length - (candidate.cardsUsed ?? 0);
  return left < escapeCost(context.view.players[context.mind.botId]!);
}

/**
 * Utility (В8-7-2): ценность задач, которые Действие закрывает или к которым ведёт, × безопасность
 * Комнаты, где бот окажется, × экономия карт. Бегство из опасной Комнаты ценно само по себе.
 */
function score(context: ScoringContext, candidate: Candidate): ScoredCandidate {
  const { tuning, agenda } = context;
  let total = 0;
  let bestTask: BotTask | null = null;
  let bestShare = 0;
  for (const entry of agenda.tasks) {
    const share = completes(context, candidate, entry) ? 1 : progress(context, candidate, entry);
    const gained = entry.weight * share;
    total += gained;
    if (gained > bestShare) {
      bestShare = gained;
      bestTask = entry;
    }
  }
  let value = (bestShare + tuning.choice.sideTaskShare * (total - bestShare)) * (candidate.quality ?? 1);
  value -= (tuning.desires.SURVIVE * (candidate.selfRisk ?? 0)) / tuning.risk.seriousWound;
  const moving = candidate.kind === 'MOVE' || candidate.kind === 'ESCAPE' || candidate.kind === 'CAREFUL_MOVE';
  const dangerHere = dangerOf(context, context.here);
  const dangerAfter = dangerOf(
    context,
    candidate.roomId,
    candidate.kind === 'CAREFUL_MOVE' ? 'CAREFUL' : moving ? 'ROLL' : 'STAY',
  );
  if (moving) {
    value += tuning.desires.SURVIVE * tuning.choice.fleeWeight * Math.max(0, dangerHere - dangerAfter);
  }
  if (candidate.kind === 'ESCAPE') {
    value -= tuning.desires.SURVIVE * tuning.choice.fleeWeight * dangerHere * tuning.risk.escapeAttackShare;
  }
  if (candidate.kind === 'PASS') {
    value += tuning.choice.passValue - tuning.desires.SURVIVE * tuning.choice.endTurnDangerWeight * dangerHere;
  } else if (!moving && strandsInDanger(context, candidate)) {
    value -= tuning.desires.SURVIVE * tuning.choice.endTurnDangerWeight * dangerAfter * 0.5;
  }
  const economy = 1 / (1 + tuning.choice.cardCostWeight * candidate.spent);
  return { candidate, utility: value * (1 - dangerAfter * tuning.desires.SURVIVE * 0.5) * economy, task: bestTask };
}

export function scoreCandidates(
  view: SanitizedGameState,
  mind: BotMind,
  agenda: BotAgenda,
  candidates: readonly Candidate[],
  tuning: BotTuning,
): ScoredCandidate[] {
  const context: ScoringContext = {
    view,
    mind,
    agenda,
    tuning,
    knobs: effectiveKnobs(mind.character, mind.difficulty, tuning),
    here: view.players[mind.botId]!.roomId,
    costs: new Map(),
    dangerCache: new Map(),
    enemies: suspectedEnemies(mind, view, tuning),
  };
  return candidates.map((candidate) => score(context, candidate)).sort((left, right) => right.utility - left.utility);
}

/**
 * Выбор (В8-7-2): softmax по лучшим кандидатам с температурой характера; бросок — личным потоком `ai`.
 * Возвращает выбранного первым, остальных — по убыванию полезности как запасные для движка.
 */
export function chooseCandidate(
  scored: readonly ScoredCandidate[],
  mind: BotMind,
  tuning: BotTuning,
): { ordered: ScoredCandidate[]; mind: BotMind } {
  const pool = scored.filter((entry) => entry.utility > 0).slice(0, tuning.choice.topCandidates);
  if (pool.length <= 1) return { ordered: [...scored], mind };
  const temperature = Math.max(
    0.01,
    tuning.choice.temperature * effectiveKnobs(mind.character, mind.difficulty, tuning).temperature,
  );
  const top = pool[0]!.utility;
  const weights = pool.map((entry) => Math.exp((entry.utility - top) / temperature));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const stream = botStream(mind.seed, mind.rngDraws);
  let roll = stream.rng() * total;
  let chosenIndex = pool.length - 1;
  for (let index = 0; index < pool.length; index++) {
    roll -= weights[index]!;
    if (roll < 0) {
      chosenIndex = index;
      break;
    }
  }
  const chosen = pool[chosenIndex]!;
  return {
    ordered: [chosen, ...scored.filter((entry) => entry !== chosen)],
    mind: { ...mind, rngDraws: stream.used() },
  };
}
