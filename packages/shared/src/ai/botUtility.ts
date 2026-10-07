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
import { handOf } from './botHand.js';
import { forecastHarm, forecastTotal, isRelocation } from './botForecast.js';
import { routeHarm, shelterAccess, SHELTER_TASKS } from './botShelter.js';
import { contactHarm, intrudersIn, threatContext, type ThreatContext } from './botThreat.js';
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
 * (ценность + убрать Чужих) × экономия + безопасность + конец хода − запас руки.
 */
export interface UtilityFactors {
  taskValue: number;
  /** Чужие, убранные с поля: меньше угроз для всех в следующих раундах. */
  cleanup: number;
  /** Прогноз вреда Действия в долях гибели (сразу и до конца раунда). */
  harm: number;
  /** Насколько Действие безопаснее Паса: разница прогнозов вреда × желание выжить. */
  safety: number;
  endTurn: number;
  handReserve: number;
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
  access: Map<RoomId, number>;
  arrivals: Map<string, number>;
  threat: ThreatContext;
  inCombat: boolean;
  passHarm: number;
  enemies: string[];
}

/** Где цель задачи по тайлам: известные Комнаты и закрытые тайлы с шансом оказаться нужным. */
function tileGoals(view: SanitizedGameState, entry: BotTask): GoalRoom[] {
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

/** Чужое присутствие в Комнате: любой сосед немного тревожит, подозреваемый враг — сильнее. */
function companyHarm(context: ScoringContext, roomId: RoomId): number {
  const others = (context.view.ship.rooms[roomId]?.occupantPlayerIds ?? []).filter((id) => id !== context.mind.botId);
  const { sharedRoomDanger } = context.tuning.choice;
  const unease = others.some((id) => context.enemies.includes(id))
    ? sharedRoomDanger.suspectedEnemy
    : others.length > 0
      ? sharedRoomDanger.anyone
      : 0;
  return unease * context.knobs.sharedRoomAvoidance;
}

function harmOf(context: ScoringContext, candidate: Candidate): number {
  return forecastTotal(forecastHarm(context.threat, candidate)) + companyHarm(context, candidate.roomId);
}

function completes(context: ScoringContext, candidate: Candidate, entry: BotTask): boolean {
  const matches = candidate.effects.some(
    (produced) => produced.kind === entry.kind && detailMatches(entry.detail, produced.detail),
  );
  if (!matches) return false;
  if (!isPlaced(entry) || (isRelocation(candidate) && candidate.kind !== 'ESCAPE')) return true;
  const rooms = tileGoals(context.view, entry);
  return rooms.some((goal) => goal.roomId === candidate.roomId && goal.probability >= 1);
}

function accessOf(context: ScoringContext, roomId: RoomId): number {
  if (!context.access.has(roomId)) context.access.set(roomId, shelterAccess(context.threat, roomId));
  return context.access.get(roomId)!;
}

/** Цели задачи для пути: укрытие, занятое Чужими, достижимо лишь с шансом его освободить. */
function goalsOf(context: ScoringContext, entry: BotTask): GoalRoom[] {
  if (!context.goals.has(entry)) {
    const tiles = tileGoals(context.view, entry);
    const goals = SHELTER_TASKS.has(entry.kind)
      ? tiles.map((goal) => ({ ...goal, probability: goal.probability * accessOf(context, goal.roomId) }))
      : tiles;
    context.goals.set(entry, goals);
  }
  return context.goals.get(entry)!;
}

function hopsBetween(context: ScoringContext, from: RoomId, to: RoomId): number {
  if (!context.hops.has(from)) context.hops.set(from, hopDistances(context.view, from));
  return context.hops.get(from)!.get(to) ?? Number.POSITIVE_INFINITY;
}

/** Коридоров до ближайшей цели задачи по графу: кривая расстояния — о пути, а не о его риске. */
function hopsToGoal(context: ScoringContext, from: RoomId, entry: BotTask): number {
  return Math.min(...goalsOf(context, entry).map((goal) => hopsBetween(context, from, goal.roomId)));
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

/** Шанс дойти до укрытия из Комнаты и укрыться: вред оставшегося пути и доступность самого укрытия. */
function arrivalChance(context: ScoringContext, from: RoomId, shelter: RoomId): number {
  const key = `${from}>${shelter}`;
  if (!context.arrivals.has(key)) {
    const harm = routeHarm(context.threat, from, shelter, context.knobs.riskAversion);
    context.arrivals.set(key, Math.max(0, 1 - harm) * accessOf(context, shelter));
  }
  return context.arrivals.get(key)!;
}

/**
 * Шаг к спасению, когда время на исходе (стр. 11): без него к Прыжку не успеть, поэтому шаг стоит шанса дойти от
 * следующей Комнаты до укрытия, к которому он приближает, и укрыться; закрытый тайл — ещё и на шанс, что укрытие там.
 * Так занятый Чужим Спасательный отсек уступает поиску второго.
 */
function lifelineProgress(context: ScoringContext, candidate: Candidate, entry: BotTask): number {
  const next = candidate.roomId;
  if (!SHELTER_TASKS.has(entry.kind)) {
    return hopsToGoal(context, next, entry) < hopsToGoal(context, context.here, entry) ? 1 : 0;
  }
  return tileGoals(context.view, entry).reduce((best, { roomId, probability }) => {
    if (hopsBetween(context, next, roomId) >= hopsBetween(context, context.here, roomId)) return best;
    return Math.max(best, probability * arrivalChance(context, next, roomId));
  }, 0);
}

/** Движение к цели задачи: доля сокращённого пути, умноженная на кривую расстояния до цели. */
function progress(context: ScoringContext, candidate: Candidate, entry: BotTask): number {
  if (!isRelocation(candidate) || !isPlaced(entry)) return 0;
  if (entry.lifeline) return lifelineProgress(context, candidate, entry);
  const costs = costsFor(context, entry);
  const now = costs.get(context.here);
  const next = costs.get(candidate.roomId);
  if (now === undefined || next === undefined || next >= now) return 0;
  const reach = reachAt(context, hopsToGoal(context, candidate.roomId, entry));
  return ((now - next) / Math.max(now, context.tuning.navigation.actionCost)) * reach;
}

/** Кривая расстояния до цели в Коридорах с нижним пределом: короткий горизонт не обнуляет далёкую цель. */
function reachAt(context: ScoringContext, hops: number): number {
  const { navigation, curves } = context.tuning;
  return Math.max(navigation.farGoalFloor, evaluateCurve(curves.distance, hops / context.knobs.horizon));
}

interface ScoutedTile {
  roomId: RoomId;
  /** Доля ценности находки: вошедший уже на месте, подсмотревший ещё должен дойти. */
  reach: number;
}

function scoutedTile(context: ScoringContext, candidate: Candidate): ScoutedTile | null {
  if (isRelocation(candidate)) {
    const entered = context.view.ship.rooms[candidate.roomId];
    return entered?.isExplored === false ? { roomId: candidate.roomId, reach: 1 } : null;
  }
  const observed = candidate.effects.find((produced) => produced.kind === 'OBSERVE')?.detail.roomId;
  if (observed === undefined) return null;
  return { roomId: observed, reach: reachAt(context, hopsBetween(context, context.here, observed)) };
}

/**
 * Разведка (стр. 6, 14, 25): закрытый тайл, который может оказаться целью задачи, с этим шансом сразу приводит к
 * цели — войти в него или подсмотреть его из Комнаты Наблюдения, — а в остальных случаях остаётся обычным шагом пути.
 */
function withSearch(context: ScoringContext, candidate: Candidate, entry: BotTask, travel: number): number {
  const tile = isPlaced(entry) ? scoutedTile(context, candidate) : null;
  if (!tile) return travel;
  const found = Math.min(1, goalsOf(context, entry).find((goal) => goal.roomId === tile.roomId)?.probability ?? 0);
  const learns = isRelocation(candidate) || found < 1;
  const value = context.tuning.navigation.findShare * tile.reach;
  return learns ? travel + found * Math.max(0, value - travel) : travel;
}

/** Дверь, открытая к цели, ценится как Движение за неё с поправкой на второе Действие. */
function doorway(context: ScoringContext, candidate: Candidate, entry: BotTask): number {
  if (candidate.opensTo === undefined) return 0;
  const step: Candidate = { ...candidate, kind: 'MOVE', roomId: candidate.opensTo };
  return progress(context, step, entry) * context.tuning.tactics.doorProgressShare;
}

const COMBAT_TASKS: ReadonlySet<BotTask['kind']> = new Set(['FIGHT', 'HIBERNATE', 'BOARD_POD', 'LAUNCH_POD']);

/** В Бою бот сначала разбирается с Чужим: посторонние задачи ждут (Бой и эвакуация — нет). */
function focusOn(context: ScoringContext, entry: BotTask): number {
  return context.inCombat && !COMBAT_TASKS.has(entry.kind) ? context.tuning.tactics.harm.combatFocus : 1;
}

/** Меньше карт на руке — выше шанс Внезапной Атаки при следующей Встрече до добора (стр. 18). */
function handReserveCost(context: ScoringContext, before: number, after: number): number {
  const { tuning } = context;
  if (after >= before) return 0;
  const exposure = contactHarm(context.threat, Math.max(0, after)) - contactHarm(context.threat, before);
  return tuning.desires.SURVIVE * tuning.tactics.harm.weight * tuning.risk.contactBeforeDraw * Math.max(0, exposure);
}

/** Сколько Чужих Действие уберёт с поля, с поправкой на тех, кого это спасает в Комнате. */
function cleanupValue(context: ScoringContext, candidate: Candidate): number {
  const saved = (context.view.ship.rooms[context.here]?.occupantPlayerIds.length ?? 1) - 1;
  const removed = (candidate.neutralizes ?? []).reduce((sum, entry) => sum + entry.chance, 0);
  return context.tuning.tactics.intruderRemoval * context.knobs.combatDesire * removed * (1 + saved);
}

function localWork(context: ScoringContext, candidate: Candidate): number {
  return isRelocation(candidate) || candidate.kind === 'PASS' ? 1 : 1 + context.tuning.tactics.localWork;
}

/**
 * Utility (В8-7-2, В8-10): ценность задач, которые Действие закрывает или к которым ведёт, и убранные Чужие ×
 * экономия карт, плюс выигрыш безопасности против Паса по прогнозу вреда.
 */
function score(context: ScoringContext, candidate: Candidate): ScoredCandidate {
  const { tuning, agenda, knobs } = context;
  let total = 0;
  let bestTask: BotTask | null = null;
  let bestShare = 0;
  for (const entry of agenda.tasks) {
    const share = completes(context, candidate, entry)
      ? 1
      : withSearch(context, candidate, entry, progress(context, candidate, entry) + doorway(context, candidate, entry));
    const gained = entry.weight * share * focusOn(context, entry);
    total += gained;
    if (gained > bestShare) {
      bestShare = gained;
      bestTask = entry;
    }
  }
  const harm = harmOf(context, candidate);
  const hand = handOf(context.view, context.mind.botId).length;
  const caution =
    tuning.desires.SURVIVE * tuning.tactics.harm.weight * knobs.riskAversion * clamp01(knobs.riskAccuracy);
  const factors: UtilityFactors = {
    taskValue:
      (bestShare + tuning.choice.sideTaskShare * (total - bestShare)) *
      (candidate.quality ?? 1) *
      localWork(context, candidate),
    cleanup: cleanupValue(context, candidate),
    harm,
    safety: caution * (context.passHarm - harm),
    endTurn: candidate.kind === 'PASS' ? tuning.choice.passValue : 0,
    handReserve: handReserveCost(context, hand, hand - (candidate.cardsUsed ?? 0)),
    economy: 1 / (1 + tuning.choice.cardCostWeight * candidate.spent),
  };
  const utility =
    (factors.taskValue + factors.cleanup) * factors.economy + factors.safety + factors.endTurn - factors.handReserve;
  return { candidate, utility, task: bestTask, factors };
}

function passCandidate(roomId: RoomId): Candidate {
  return { action: { type: 'ACTION_PASS', payload: {} }, kind: 'PASS', effects: [], roomId, spent: 0 };
}

export function scoreCandidates(
  view: SanitizedGameState,
  mind: BotMind,
  agenda: BotAgenda,
  candidates: readonly Candidate[],
  tuning: BotTuning,
): ScoredCandidate[] {
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const threat = threatContext(view, view.players[mind.botId]!, tuning, knobs.fear);
  const context: ScoringContext = {
    view,
    mind,
    agenda,
    tuning,
    knobs,
    here: view.players[mind.botId]!.roomId,
    costs: new Map(),
    goals: new Map(),
    hops: new Map(),
    access: new Map(),
    arrivals: new Map(),
    threat,
    inCombat: intrudersIn(view, view.players[mind.botId]!.roomId).length > 0,
    passHarm: 0,
    enemies: suspectedEnemies(mind, view, tuning),
  };
  context.passHarm = harmOf(context, passCandidate(context.here));
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
