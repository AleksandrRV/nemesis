import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
import type { CorridorConnection, RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { corridorsAround, otherEnd } from './botGraph.js';
import { peeksOf } from './botPeeks.js';
import { entryRisk } from './botRisk.js';
import { markerCost } from './botShipDoom.js';
import { explorationOdds, tokenOdds } from './botThreat.js';
import type { BotTuning } from './botTuning.js';

export interface Route {
  /** Комнаты по порядку, без стартовой; последняя — цель. Пусто — бот уже на месте. */
  path: RoomId[];
  cost: number;
}

interface Step {
  to: RoomId;
  corridor: CorridorConnection;
}

function stepsFrom(view: SanitizedGameState, roomId: RoomId): Step[] {
  return corridorsAround(view, roomId).map((corridor) => ({ to: otherEnd(corridor, roomId), corridor }));
}

/** Эвристика A*: кратчайшее число Коридоров до ближайшей цели (многоисточниковый поиск в ширину). */
function hopsToGoals(view: SanitizedGameState, goals: readonly RoomId[]): Map<RoomId, number> {
  const distances = new Map<RoomId, number>(goals.map((goal) => [goal, 0]));
  const queue = [...goals];
  while (queue.length > 0) {
    const room = queue.shift()!;
    for (const step of stepsFrom(view, room)) {
      if (distances.has(step.to)) continue;
      distances.set(step.to, distances.get(room)! + 1);
      queue.push(step.to);
    }
  }
  return distances;
}

function shipDoomOf(view: SanitizedGameState, odds: ReadonlyMap<string, number>, tuning: BotTuning): number {
  const doom =
    (odds.get('MALFUNCTION') ?? 0) * markerCost(view, 'MALFUNCTION', tuning) +
    (odds.get('FIRE') ?? 0) * markerCost(view, 'FIRE', tuning);
  return doom * tuning.desires.SURVIVE * tuning.tactics.harm.weight;
}

/**
 * Цена вскрыть новую Комнату для корабля: Неисправность или Пожар из жетона Исследования (стр. 14, 17); подсмотренный
 * жетон бот знает точно.
 */
function explorationShipRisk(view: SanitizedGameState, tuning: BotTuning): (roomId: RoomId) => number {
  let unseen: number | undefined;
  return (roomId) => {
    if (view.ship.rooms[roomId]?.isExplored !== false) return 0;
    if (peeksOf(view).tokens.has(roomId)) return shipDoomOf(view, tokenOdds(view, roomId), tuning);
    unseen ??= shipDoomOf(view, explorationOdds(view), tuning);
    return unseen;
  };
}

/**
 * A* по графу корабля (В8-7-4). Цена ребра — Движение, риск Комнаты входа (Шум, Встреча, Пожар, Чужие,
 * неизвестный тайл) с множителем осторожности бота и цена закрытой Двери. Эвристика допустима: каждое
 * ребро стоит не меньше одного Движения.
 */
export function findRoute(
  view: SanitizedGameState,
  from: RoomId,
  goals: readonly RoomId[],
  tuning: BotTuning,
  riskAversion = 1,
): Route | null {
  if (goals.length === 0) return null;
  if (goals.includes(from)) return { path: [], cost: 0 };
  const heuristic = hopsToGoals(view, goals);
  const riskCache = new Map<RoomId, number>();
  const shipRisk = explorationShipRisk(view, tuning);
  const riskOf = (roomId: RoomId): number => {
    if (!riskCache.has(roomId))
      riskCache.set(roomId, (entryRisk(view, roomId, tuning) + shipRisk(roomId)) * riskAversion);
    return riskCache.get(roomId)!;
  };
  const edgeCost = (step: Step): number =>
    tuning.navigation.actionCost +
    riskOf(step.to) +
    (step.corridor.doorState === 'CLOSED' ? tuning.navigation.closedDoorCost : 0);
  const best = new Map<RoomId, number>([[from, 0]]);
  const cameFrom = new Map<RoomId, RoomId>();
  const open = new Set<RoomId>([from]);
  const estimate = (roomId: RoomId) =>
    best.get(roomId)! + (heuristic.get(roomId) ?? Number.POSITIVE_INFINITY) * tuning.navigation.actionCost;
  let expanded = 0;
  while (open.size > 0 && expanded < tuning.navigation.maxExpandedNodes) {
    const current = [...open].reduce((left, right) => (estimate(right) < estimate(left) ? right : left));
    if (goals.includes(current)) return { path: pathTo(cameFrom, current), cost: best.get(current)! };
    open.delete(current);
    expanded += 1;
    for (const step of stepsFrom(view, current)) {
      const cost = best.get(current)! + edgeCost(step);
      if (cost >= (best.get(step.to) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(step.to, cost);
      cameFrom.set(step.to, current);
      open.add(step.to);
    }
  }
  return null;
}

function pathTo(cameFrom: Map<RoomId, RoomId>, goal: RoomId): RoomId[] {
  const path = [goal];
  let cursor = goal;
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor)!;
    path.unshift(cursor);
  }
  return path.slice(1);
}

const TILE_POOLS: Record<'ROOM_1' | 'ROOM_2', readonly string[]> = {
  ROOM_1: BASIC_ROOMS_1.map((definition) => definition.id),
  ROOM_2: ADDITIONAL_ROOMS_2.map((definition) => definition.id),
};

const placedTiles = new WeakMap<SanitizedGameState, ReadonlySet<string>>();

/** Тайлы, место которых боту известно: открытые и подсмотренные. */
function placedTilesOf(view: SanitizedGameState): ReadonlySet<string> {
  const cached = placedTiles.get(view);
  if (cached) return cached;
  const placed = new Set(peeksOf(view).tiles.values());
  for (const room of Object.values(view.ship.rooms)) if (room.definitionId !== null) placed.add(room.definitionId);
  placedTiles.set(view, placed);
  return placed;
}

/**
 * Вероятность, что Комната — тайл `definitionId`. Открытый или подсмотренный тайл известен; закрытый равновероятно
 * любой из тайлов своей стопки, чьё место боту неизвестно (стр. 6: стопки «1» и «2» перемешиваются; лишние тайлы
 * «2» не видны).
 */
export function roomTypeProbability(view: SanitizedGameState, roomId: RoomId, definitionId: string): number {
  const room = view.ship.rooms[roomId];
  if (!room) return 0;
  if (room.definitionId !== null) return room.definitionId === definitionId ? 1 : 0;
  const seen = peeksOf(view).tiles.get(roomId);
  if (seen !== undefined) return seen === definitionId ? 1 : 0;
  if (room.category !== 'ROOM_1' && room.category !== 'ROOM_2') return 0;
  const placed = placedTilesOf(view);
  const remaining = TILE_POOLS[room.category].filter((id) => !placed.has(id));
  return remaining.includes(definitionId) ? 1 / remaining.length : 0;
}

export interface RoomSearch {
  roomId: RoomId;
  probability: number;
  route: Route;
}

/** Ближайшая Комната типа X с учётом вероятностей тайлов: минимум ожидаемой цены пути (цена / вероятность). */
export function findRoomOfType(
  view: SanitizedGameState,
  from: RoomId,
  definitionIds: readonly string[],
  tuning: BotTuning,
  riskAversion = 1,
): RoomSearch | null {
  let best: RoomSearch | null = null;
  for (const room of Object.values(view.ship.rooms)) {
    const probability = definitionIds.reduce((sum, id) => sum + roomTypeProbability(view, room.id, id), 0);
    if (probability <= 0) continue;
    const route = findRoute(view, from, [room.id], tuning, riskAversion);
    if (!route) continue;
    const expected = (route.cost + tuning.navigation.actionCost) / Math.min(1, probability);
    const bestExpected = best
      ? (best.route.cost + tuning.navigation.actionCost) / Math.min(1, best.probability)
      : Infinity;
    if (expected < bestExpected) best = { roomId: room.id, probability: Math.min(1, probability), route };
  }
  return best;
}

export interface GoalRoom {
  roomId: RoomId;
  probability: number;
}

/**
 * Цена пути до ближайшей цели из каждой Комнаты: обратный Дейкстра от целей по тем же ценам рёбер, что у A*.
 * Неоткрытая цель начинается со штрафа за шанс ошибиться тайлом.
 */
export function costsToGoals(
  view: SanitizedGameState,
  goals: readonly GoalRoom[],
  tuning: BotTuning,
  riskAversion = 1,
): Map<RoomId, number> {
  const costs = new Map<RoomId, number>();
  for (const goal of goals) {
    const start = tuning.navigation.unknownTilePenalty * (1 / Math.max(goal.probability, 0.01) - 1);
    if (start < (costs.get(goal.roomId) ?? Number.POSITIVE_INFINITY)) costs.set(goal.roomId, start);
  }
  const settled = new Set<RoomId>();
  const riskCache = new Map<RoomId, number>();
  const shipRisk = explorationShipRisk(view, tuning);
  const riskOf = (roomId: RoomId): number => {
    if (!riskCache.has(roomId))
      riskCache.set(roomId, (entryRisk(view, roomId, tuning) + shipRisk(roomId)) * riskAversion);
    return riskCache.get(roomId)!;
  };
  while (settled.size < costs.size) {
    let current: RoomId | null = null;
    for (const [roomId, cost] of costs) {
      if (!settled.has(roomId) && (current === null || cost < costs.get(current)!)) current = roomId;
    }
    if (current === null) break;
    settled.add(current);
    for (const step of stepsFrom(view, current)) {
      const cost =
        costs.get(current)! +
        tuning.navigation.actionCost +
        riskOf(current) +
        (step.corridor.doorState === 'CLOSED' ? tuning.navigation.closedDoorCost : 0);
      if (cost < (costs.get(step.to) ?? Number.POSITIVE_INFINITY)) costs.set(step.to, cost);
    }
  }
  return costs;
}

/** Где ещё можно найти Предметы: открытые Комнаты с жетоном Предметов и неисследованные тайлы. */
export function searchableRoomIds(view: SanitizedGameState): RoomId[] {
  return Object.values(view.ship.rooms)
    .filter((room) => (room.isExplored ? (room.itemsCount ?? 0) > 0 : room.category !== 'SPECIAL'))
    .map((room) => room.id);
}
