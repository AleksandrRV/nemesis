import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { Candidate } from './botCandidates.js';
import { botStream, effectiveKnobs } from './botCharacter.js';
import { clamp01, evaluateCurve } from './botCurves.js';
import type { BotAgenda } from './botGoals.js';
import type { BotMind } from './botMind.js';
import { hopDistances } from './botGraph.js';
import { costsToGoals, roomTypeProbability, type GoalRoom } from './botNavigation.js';
import { suspectedEnemies } from './botObjectives.js';
import { escapeCost } from '../logic/seriousWoundEffects.js';
import { handOf } from './botHand.js';
import { entryRisk, intruderSeverity, roomThreat, surpriseChance } from './botRisk.js';
import { detailMatches, type BotTask } from './botTasks.js';
import type { BotTuning, TuningKnob } from './botTuning.js';

export interface ScoredCandidate {
  candidate: Candidate;
  utility: number;
  /** Задача, которую Действие продвигает сильнее всего: её желание становится планом бота. */
  task: BotTask | null;
  factors: UtilityFactors;
}

/**
 * Разбор полезности для Инспектора ботов:
 * (ценность − риск + бегство − Побег + конец хода − запас руки) × безопасность × экономия.
 */
export interface UtilityFactors {
  taskValue: number;
  selfRisk: number;
  flee: number;
  escapeAttack: number;
  endTurn: number;
  handReserve: number;
  dangerAfter: number;
  safety: number;
  economy: number;
}

interface ScoringContext {
  view: SanitizedGameState;
  mind: BotMind;
  agenda: BotAgenda;
  tuning: BotTuning;
  knobs: Record<TuningKnob, number>;
  here: RoomId;
  costs: Map<BotTask, Map<RoomId, number>>;
  goals: Map<BotTask, GoalRoom[]>;
  hops: Map<RoomId, Map<RoomId, number>>;
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

/** Чужое присутствие в Комнате: любой сосед немного тревожит, подозреваемый враг — сильнее. */
function company(context: ScoringContext, roomId: RoomId): number {
  const others = (context.view.ship.rooms[roomId]?.occupantPlayerIds ?? []).filter((id) => id !== context.mind.botId);
  if (others.some((id) => context.enemies.includes(id))) return context.tuning.choice.sharedRoomDanger.suspectedEnemy;
  return others.length > 0 ? context.tuning.choice.sharedRoomDanger.anyone : 0;
}

function dangerOf(context: ScoringContext, roomId: RoomId, arrival: Arrival = 'STAY'): number {
  const key = `${arrival}:${roomId}`;
  if (!context.dangerCache.has(key)) {
    const { view, tuning, knobs } = context;
    const risk =
      arrival === 'STAY'
        ? roomThreat(view, roomId, tuning, knobs.fear)
        : entryRisk(view, roomId, tuning, arrival === 'CAREFUL', knobs.fear);
    const threat = risk * knobs.riskAversion;
    const estimate = evaluateCurve(tuning.curves.danger, threat / tuning.risk.seriousWound);
    const accuracy = clamp01(knobs.riskAccuracy);
    context.dangerCache.set(
      key,
      clamp01(estimate * accuracy + 0.3 * (1 - accuracy) + company(context, roomId) * knobs.sharedRoomAvoidance),
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

function goalsOf(context: ScoringContext, entry: BotTask): GoalRoom[] {
  if (!context.goals.has(entry)) context.goals.set(entry, goalRooms(context.view, entry));
  return context.goals.get(entry)!;
}

/** Коридоров до ближайшей цели задачи по графу: кривая расстояния — о пути, а не о его риске. */
function hopsToGoal(context: ScoringContext, from: RoomId, entry: BotTask): number {
  if (!context.hops.has(from)) context.hops.set(from, hopDistances(context.view, from));
  const distances = context.hops.get(from)!;
  return Math.min(...goalsOf(context, entry).map((goal) => distances.get(goal.roomId) ?? Number.POSITIVE_INFINITY));
}

function costsFor(context: ScoringContext, entry: BotTask): Map<RoomId, number> {
  if (!context.costs.has(entry)) {
    context.costs.set(
      entry,
      costsToGoals(context.view, goalsOf(context, entry), context.tuning, context.knobs.riskAversion),
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
  const { navigation, curves } = context.tuning;
  const hops = hopsToGoal(context, candidate.roomId, entry);
  const reach = Math.max(navigation.farGoalFloor, evaluateCurve(curves.distance, hops / context.knobs.horizon));
  return ((now - next) / Math.max(now, navigation.actionCost)) * reach;
}

/** Действие оставит бота в опасной Комнате без карт на Побег: в Фазе Событий его атакуют (стр. 10). */
function strandsInDanger(context: ScoringContext, candidate: Candidate): boolean {
  const left = handOf(context.view, context.mind.botId).length - (candidate.cardsUsed ?? 0);
  return left < escapeCost(context.view.players[context.mind.botId]!);
}

/** Пустая рука — Внезапная Атака при следующей Встрече: цена — прирост её шанса × ожидаемая Атака Взрослой. */
function handReserveCost(context: ScoringContext, before: number, after: number): number {
  const { tuning } = context;
  const exposure = Math.max(0, surpriseChance(Math.max(0, after)) - surpriseChance(before));
  const attack = (intruderSeverity('ADULT', tuning) * tuning.risk.wound) / tuning.risk.seriousWound;
  return tuning.desires.SURVIVE * tuning.risk.contactBeforeDraw * exposure * attack;
}

function endTurnFactor(context: ScoringContext, candidate: Candidate, moving: boolean, here: number, after: number) {
  const { tuning } = context;
  const survive = tuning.desires.SURVIVE;
  if (candidate.kind === 'PASS') return tuning.choice.passValue - survive * tuning.choice.endTurnDangerWeight * here;
  if (!moving && strandsInDanger(context, candidate)) return -survive * tuning.choice.endTurnDangerWeight * after * 0.5;
  return 0;
}

/**
 * Utility (В8-7-2): ценность задач, которые Действие закрывает или к которым ведёт, × безопасность
 * Комнаты, где бот окажется, × экономия карт. Бегство из опасной Комнаты ценно само по себе.
 */
function score(context: ScoringContext, candidate: Candidate): ScoredCandidate {
  const { tuning, agenda } = context;
  const survive = tuning.desires.SURVIVE;
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
  const moving = candidate.kind === 'MOVE' || candidate.kind === 'ESCAPE' || candidate.kind === 'CAREFUL_MOVE';
  const dangerHere = dangerOf(context, context.here);
  const dangerAfter = dangerOf(
    context,
    candidate.roomId,
    candidate.kind === 'CAREFUL_MOVE' ? 'CAREFUL' : moving ? 'ROLL' : 'STAY',
  );
  const hand = handOf(context.view, context.mind.botId).length;
  const factors: UtilityFactors = {
    taskValue: (bestShare + tuning.choice.sideTaskShare * (total - bestShare)) * (candidate.quality ?? 1),
    selfRisk: (survive * (candidate.selfRisk ?? 0)) / tuning.risk.seriousWound,
    flee: moving ? survive * tuning.choice.fleeWeight * Math.max(0, dangerHere - dangerAfter) : 0,
    escapeAttack:
      candidate.kind === 'ESCAPE' ? survive * tuning.choice.fleeWeight * dangerHere * tuning.risk.escapeAttackShare : 0,
    endTurn: endTurnFactor(context, candidate, moving, dangerHere, dangerAfter),
    handReserve: handReserveCost(context, hand, hand - (candidate.cardsUsed ?? 0)),
    dangerAfter,
    safety: 1 - dangerAfter * survive * 0.5,
    economy: 1 / (1 + tuning.choice.cardCostWeight * candidate.spent),
  };
  const value =
    factors.taskValue - factors.selfRisk + factors.flee - factors.escapeAttack + factors.endTurn - factors.handReserve;
  return { candidate, utility: value * factors.safety * factors.economy, task: bestTask, factors };
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
    goals: new Map(),
    hops: new Map(),
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
