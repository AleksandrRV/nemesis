import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
import { ESCAPE_NUMBERS_BY_TYPE } from '../data/intruderPool.js';
import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
import type { ExplorationEffect, RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { boardablePods, loadedHandWeapon } from '../logic/actionRules.js';
import { findAdjacentOpenRoomIds, roomHasTechnicalEntrance } from '../logic/shipGraphQueries.js';
import type { Neutralization } from './botCandidates.js';
import { corridorsAround, otherEnd } from './botGraph.js';
import { peeksOf } from './botPeeks.js';
import {
  attackHarm,
  lightWoundHarm,
  shotInjuryOdds,
  standingByRound,
  vitalityOf,
  type Vitality,
  type Volley,
} from './botHarm.js';
import { contactChance, roundsLeft } from './botRisk.js';
import { markerCost } from './botShipDoom.js';
import type { BotTuning } from './botTuning.js';

export interface Shooter {
  weapon: { id: string; isEnergyWeapon?: boolean; ammo: number | null };
  attempts: number;
}

export interface ThreatContext {
  view: SanitizedGameState;
  self: SanitizedPlayerState;
  vitality: Vitality;
  tuning: BotTuning;
  /** Ручка страха: множитель вреда от Чужих. */
  fear: number;
  /** Цена самого дешёвого выхода из Комнаты: считается один раз на решение. */
  exits: Map<RoomId, number>;
}

export function threatContext(
  view: SanitizedGameState,
  self: SanitizedPlayerState,
  tuning: BotTuning,
  fear = 1,
): ThreatContext {
  return { view, self, vitality: vitalityOf(self), tuning, fear, exits: new Map() };
}

export function intrudersIn(view: SanitizedGameState, roomId: RoomId): IntruderEntity[] {
  return view.intrudersPool.boardTokens.filter((token) => token.roomId === roomId);
}

export function crewIn(view: SanitizedGameState, roomId: RoomId): SanitizedPlayerState[] {
  return Object.values(view.players).filter(
    (player) => player.roomId === roomId && !player.isDead && !player.isInHibernation && !player.hasEscapedInPod,
  );
}

export function intruderHarm(context: ThreatContext, type: IntruderType): number {
  return attackHarm(context.vitality, type, context.tuning) * context.fear;
}

/** Чужие Фазы Событий атакуют Персонажа с наименьшей рукой (стр. 20): бот с большей рукой прикрыт соседом. */
export function attackShare(context: ThreatContext, roomId: RoomId, handAfter: number): number {
  const others = crewIn(context.view, roomId).filter((player) => player.id !== context.self.id);
  if (others.length === 0) return 1;
  const fewest = Math.min(...others.map((player) => player.actionDeck.handCount));
  if (handAfter < fewest) return 1;
  if (handAfter > fewest) return context.tuning.tactics.harm.sparedShare;
  const tied = others.filter((player) => player.actionDeck.handCount === fewest).length;
  return 1 / (tied + 1);
}

/** Лучшее заряженное Оружие в слотах рук: столько выстрелов, сколько хватит Боезапаса и карт. */
export function shooterOf(player: SanitizedPlayerState, cards: number): Shooter | null {
  const weapons = player.handSlots.flatMap((slot) =>
    slot.source === 'ITEM' && loadedHandWeapon(player, slot.card.id).block === null ? [slot.card] : [],
  );
  const weapon = weapons.sort((left, right) => (right.ammo ?? 0) - (left.ammo ?? 0))[0];
  if (!weapon) return null;
  return { weapon, attempts: Math.max(0, Math.min(weapon.ammo ?? 0, cards)) };
}

function allyShooters(context: ThreatContext, roomId: RoomId): Shooter[] {
  return crewIn(context.view, roomId)
    .filter((player) => player.id !== context.self.id && !player.hasPassed)
    .flatMap((player) => {
      const shooter = shooterOf(player, player.actionDeck.handCount);
      return shooter && shooter.attempts > 0 ? [shooter] : [];
    });
}

function volleyOf(context: ThreatContext, shooter: Shooter, type: IntruderType): Volley {
  return { odds: shotInjuryOdds(context.view, shooter.weapon, type), attempts: shooter.attempts };
}

/**
 * Доля, в которой Чужой стоит в Комнате к каждой Фазе Событий: сначала Действие бота (попадание, к которому
 * добавятся Раны, или уход с шансом), затем выстрелы этого раунда, затем — следующих.
 */
function standingSequence(
  context: ThreatContext,
  intruder: IntruderEntity,
  removal: Neutralization | undefined,
  thisRound: readonly Shooter[],
  later: readonly (readonly Shooter[])[],
): number[] {
  const opening: Volley[] = removal?.hit ? [{ odds: removal.hit, attempts: 1 }] : [];
  const gone = removal && !removal.hit ? removal.chance : 0;
  const rounds = [thisRound, ...later].map((shooters, index) => [
    ...(index === 0 ? opening : []),
    ...shooters.map((shooter) => volleyOf(context, shooter, intruder.type)),
  ]);
  return standingByRound(context.view, intruder.type, intruder.woundsCount, rounds).map(
    (standing) => standing * (1 - gone),
  );
}

/** Шанс, что Чужой ещё в Комнате к Фазе Событий: после Действия бота и выстрелов перечисленных стрелков. */
export function standingAtEventPhase(
  context: ThreatContext,
  intruder: IntruderEntity,
  removal: Neutralization | undefined,
  shooters: readonly Shooter[],
): number {
  return standingSequence(context, intruder, removal, shooters, [])[0]!;
}

export interface StayPlan {
  handAfter: number;
  /** Выстрелы бота до конца раунда; `focusId` — по кому. */
  ownShots: Shooter | null;
  focusId?: string;
  /** Чужие, которых Действие убирает из Комнаты: с шансом или попаданием, к Ранам которого добавятся выстрелы. */
  removed?: ReadonlyMap<string, Neutralization>;
  /** Боезапас бота к следующему раунду: что останется после трат этого. */
  ammoAfter?: number;
}

/** Самый опасный Чужой Комнаты: на нём сходятся выстрелы, если цель не задана. */
export function mostDangerous(context: ThreatContext, intruders: readonly IntruderEntity[]): IntruderEntity | null {
  return intruders.reduce<IntruderEntity | null>(
    (best, next) =>
      best === null || intruderHarm(context, next.type) > intruderHarm(context, best.type) ? next : best,
    null,
  );
}

/** Оружие на следующие раунды: Боезапас и рука, до которой стрелок доберёт карты в начале Фазы Игроков (стр. 10). */
interface Gun {
  weapon: Shooter['weapon'];
  ammo: number;
  hand: number;
}

/** Боезапас бота в лучшем Оружии к следующему раунду, если в этом он потратит `spent`. */
export function ammoAfter(context: ThreatContext, spent: number): number {
  const armed = shooterOf(context.self, Number.POSITIVE_INFINITY);
  return armed ? Math.max(0, (armed.weapon.ammo ?? 0) - spent) : 0;
}

/** Оружие, которое продолжит Бой в Комнате в следующих раундах: бота (с остатком Боезапаса) и союзников. */
function gunsInRoom(context: ThreatContext, roomId: RoomId, ownAmmo: number): Gun[] {
  const own = shooterOf(context.self, Number.POSITIVE_INFINITY);
  const guns: Gun[] = own && ownAmmo > 0 ? [{ weapon: own.weapon, ammo: ownAmmo, hand: context.self.handLimit }] : [];
  for (const player of crewIn(context.view, roomId)) {
    if (player.id === context.self.id) continue;
    const ally = shooterOf(player, Number.POSITIVE_INFINITY);
    if (ally && ally.attempts > 0) guns.push({ weapon: ally.weapon, ammo: ally.attempts, hand: player.handLimit });
  }
  return guns;
}

/**
 * Выстрелы следующих раундов: ходы по 2 Действия идут, пока все не спасуют (стр. 10), так что каждое Оружие стреляет,
 * пока хватает Боезапаса и добранной руки, — с той же поправкой на доверие, что и выстрелы до конца этого раунда.
 */
function laterShooters(context: ThreatContext, guns: readonly Gun[], rounds: number): Shooter[][] {
  const ammo = guns.map((gun) => gun.ammo);
  const trust = context.tuning.tactics.harm.futureShotTrust;
  return Array.from({ length: rounds }, () =>
    guns.flatMap((gun, index): Shooter[] => {
      const attempts = Math.floor(Math.min(ammo[index]!, gun.hand) * trust + 0.5);
      ammo[index] = ammo[index]! - attempts;
      return attempts > 0 ? [{ weapon: gun.weapon, attempts }] : [];
    }),
  );
}

/** Атака каждого Чужого Комнаты: так атакуют уходящего Побегом (стр. 19) и вошедшего к ним в Бой (стр. 20). */
export function attacksFromRoom(context: ThreatContext, roomId: RoomId): number {
  return intrudersIn(context.view, roomId).reduce((sum, intruder) => sum + intruderHarm(context, intruder.type), 0);
}

/**
 * Цена уйти из Комнаты в следующем раунде: Побег в соседнюю Комнату с добранной рукой (−1 карта на Движение) —
 * вход с броском Шума или Бой с её Чужими. Нет открытого выхода — уйти нельзя.
 */
export function exitHarm(context: ThreatContext, roomId: RoomId): number {
  const cached = context.exits.get(roomId);
  if (cached !== undefined) return cached;
  const exits = findAdjacentOpenRoomIds(context.view, roomId).map(
    (exit) => entryHarm(context, exit, context.self.handLimit - 1, false) + attacksFromRoom(context, exit),
  );
  const cheapest = exits.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...exits);
  context.exits.set(roomId, cheapest);
  return cheapest;
}

/**
 * Вред Боя (стр. 19–20): каждый Чужой, переживший выстрелы бота и союзников, атакует в Фазе Событий. Чужие в Бою не
 * уходят сами (стр. 10), поэтому бой, не законченный сейчас, стоит меньшего из двух: стоять дальше — Атака в каждой
 * Фазе Событий, пока выстрелы следующих раундов не уберут Чужого (огонь сходится на одной цели, Атаки делятся
 * поровну: руки добираются заново), — или уйти в следующем раунде, заплатив Атаки Побега и вход в соседнюю Комнату.
 */
export function combatHarm(context: ThreatContext, roomId: RoomId, plan: StayPlan): number {
  const intruders = intrudersIn(context.view, roomId);
  if (intruders.length === 0) return 0;
  const allies = allyShooters(context, roomId);
  const roundsAhead = Math.max(0, roundsLeft(context.view) - 1);
  const ownAmmo = plan.ammoAfter ?? ammoAfter(context, plan.ownShots?.attempts ?? 0);
  const fire = laterShooters(context, gunsInRoom(context, roomId, ownAmmo), roundsAhead);
  const unfired = fire.map((): Shooter[] => []);
  const companions = crewIn(context.view, roomId).filter((player) => player.id !== context.self.id).length;
  const laterShare = 1 / (companions + 1);
  const focus = intruders.find((intruder) => intruder.id === plan.focusId) ?? mostDangerous(context, intruders);
  const share = attackShare(context, roomId, plan.handAfter);
  let thisRound = 0;
  let staying = 0;
  let leaving = 0;
  let clearChance = 1;
  for (const intruder of intruders) {
    const focused = intruder === focus;
    const shooters = focused && plan.ownShots ? [plan.ownShots, ...allies] : allies;
    const removal = plan.removed?.get(intruder.id);
    const [remain = 0, ...ahead] = standingSequence(context, intruder, removal, shooters, focused ? fire : unfired);
    const attack = intruderHarm(context, intruder.type);
    thisRound += attack * remain * share;
    staying += attack * laterShare * ahead.reduce((sum, standing) => sum + standing, 0);
    leaving += attack * remain;
    clearChance *= 1 - remain;
  }
  if (roundsAhead === 0 || clearChance >= 1) return thisRound;
  return thisRound + Math.min(staying, leaving + (1 - clearChance) * exitHarm(context, roomId));
}

/** Вред Комнаты в Фазе Событий помимо Боя: Пожар, Декомпрессия, Чужие по соседству. */
export function hazardHarm(context: ThreatContext, roomId: RoomId): number {
  const { view, tuning } = context;
  const room = view.ship.rooms[roomId];
  if (!room) return 0;
  const neighbours = intrudersIn(view, roomId).length > 0 ? [] : findAdjacentOpenRoomIds(view, roomId);
  const arriving = neighbours.reduce(
    (sum, neighbour) =>
      sum + intrudersIn(view, neighbour).reduce((inner, intruder) => inner + intruderHarm(context, intruder.type), 0),
    0,
  );
  return (
    (room.hasFire ? lightWoundHarm(context.vitality, tuning) : 0) +
    (room.hasDecompressionToken ? 1 : 0) +
    (room.definitionId === 'SLIME_ROOM' && !context.self.hasSlime ? tuning.tactics.harm.slime : 0) +
    arriving * tuning.tactics.harm.adjacentArrival
  );
}

type BagType = IntruderToken['type'];

function surpriseShare(type: BagType, hand: number): number {
  const numbers = ESCAPE_NUMBERS_BY_TYPE[type];
  return numbers.filter((escapeNumber) => escapeNumber > hand).length / numbers.length;
}

/**
 * Вред Встречи (стр. 18) по открытому составу мешка: Внезапная Атака, если на руке меньше карт, чем число
 * на жетоне, и Бой с появившимся Чужим.
 */
export function contactHarm(context: ThreatContext, handAfter: number): number {
  const bag = context.view.intrudersPool.bag;
  const total = Object.values(bag).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  const { harm } = context.tuning.tactics;
  return (Object.entries(bag) as [BagType, number][]).reduce((sum, [type, count]) => {
    if (count === 0 || type === 'BLANK') return sum;
    const share = count / total;
    if (type === 'LARVA') return sum + share * harm.larva;
    const attack = intruderHarm(context, type);
    return sum + share * (attack * (surpriseShare(type, handAfter) + harm.combatContinuation) + harm.newIntruder);
  }, 0);
}

type TokenEffect = ExplorationEffect;

function revealedEffects(view: SanitizedGameState): Map<TokenEffect, number> {
  const revealed = new Map<TokenEffect, number>();
  for (const entry of view.gameLog) {
    if (entry.event.type !== 'EXPLORATION_EFFECT_RESOLVED') continue;
    const effect = entry.event.effect as TokenEffect;
    revealed.set(effect, (revealed.get(effect) ?? 0) + 1);
  }
  return revealed;
}

const explorationOddsCache = new WeakMap<SanitizedGameState, ReadonlyMap<TokenEffect, number>>();

/** Шанс эффекта жетона Исследования в новой Комнате: состав коробки минус уже раскрытые (стр. 14). */
export function explorationOdds(view: SanitizedGameState): ReadonlyMap<TokenEffect, number> {
  const cached = explorationOddsCache.get(view);
  if (cached) return cached;
  const odds = unrevealedOdds(view);
  explorationOddsCache.set(view, odds);
  return odds;
}

function unrevealedOdds(view: SanitizedGameState): Map<TokenEffect, number> {
  const revealed = revealedEffects(view);
  const unrevealed = new Map<TokenEffect, number>();
  for (const token of EXPLORATION_TOKENS) unrevealed.set(token.effect, (unrevealed.get(token.effect) ?? 0) + 1);
  for (const [effect, count] of revealed) unrevealed.set(effect, Math.max(0, (unrevealed.get(effect) ?? 0) - count));
  const total = [...unrevealed.values()].reduce((sum, count) => sum + count, 0);
  return new Map([...unrevealed].map(([effect, count]) => [effect, total === 0 ? 0 : count / total]));
}

/** Жетон Исследования закрытой Комнаты: подсмотренный бот знает, остальные — по составу коробки (стр. 14, 25). */
export function tokenOdds(view: SanitizedGameState, roomId: RoomId): ReadonlyMap<TokenEffect, number> {
  const seen = peeksOf(view).tokens.get(roomId);
  return seen === undefined ? explorationOdds(view) : new Map([[seen, 1]]);
}

/** Вред раскрытия жетона Исследования: Пожар, Неисправность ближе к гибели корабля, Слизь. */
export function explorationHarm(context: ThreatContext, roomId: RoomId): number {
  const { view, tuning } = context;
  const odds = tokenOdds(view, roomId);
  return (
    (odds.get('MALFUNCTION') ?? 0) * markerCost(view, 'MALFUNCTION', tuning) +
    (odds.get('FIRE') ?? 0) * (markerCost(view, 'FIRE', tuning) + lightWoundHarm(context.vitality, tuning)) +
    (odds.get('SLIME') ?? 0) * (context.self.hasSlime ? 0 : tuning.tactics.harm.slime)
  );
}

/**
 * «Опасность» (стр. 15): Чужие из соседних Комнат, где нет других Персонажей, приходят в Комнату, а закрытая Дверь
 * их держит, разрушаясь; если прийти некому, Шум ложится во все свободные Коридоры Комнаты.
 */
export function dangerHarm(context: ThreatContext, roomId: RoomId): number {
  const { view, tuning } = context;
  const corridors = corridorsAround(view, roomId);
  const neighbours = new Set(corridors.map((path) => otherEnd(path, roomId)));
  let attracted = 0;
  let anyone = false;
  for (const neighbour of neighbours) {
    const intruders = intrudersIn(view, neighbour);
    const guarded = crewIn(view, neighbour).some((player) => player.id !== context.self.id);
    if (intruders.length === 0 || guarded) continue;
    anyone = true;
    const routes = corridors.filter((path) => path.fromRoomId === neighbour || path.toRoomId === neighbour);
    if (routes.every((path) => path.doorState === 'CLOSED')) continue;
    attracted += intruders.reduce(
      (sum, intruder) => sum + intruderHarm(context, intruder.type) * tuning.tactics.harm.combatContinuation,
      0,
    );
  }
  if (anyone) return attracted;
  const quiet = corridors.filter((corridor) => !corridor.hasNoise).length;
  const technical = roomHasTechnicalEntrance(roomId) && !view.ship.technicalCorridorNoise ? 1 : 0;
  return (quiet + technical) * tuning.tactics.harm.noise;
}

/**
 * Вред входа в Комнату (стр. 13–15): Встреча по броску Шума с учётом руки после оплаты; бросок не нужен,
 * если в Комнате уже есть Персонаж или Чужой; «Осторожное движение» кладёт Шум без броска. Жетон Исследования
 * новой Комнаты заменяет бросок: «Тишина» — без Шума, «Опасность» (и «Тишина» со Слизью) — приход Чужих.
 */
export function entryHarm(context: ThreatContext, roomId: RoomId, handAfter: number, careful: boolean): number {
  const { view, tuning } = context;
  const room = view.ship.rooms[roomId];
  if (!room) return Number.POSITIVE_INFINITY;
  const exploration = room.isExplored ? 0 : explorationHarm(context, roomId);
  const company = crewIn(view, roomId).some((player) => player.id !== context.self.id);
  if (company || intrudersIn(view, roomId).length > 0) return exploration;
  if (careful) return exploration + tuning.tactics.harm.noise;
  const odds: ReadonlyMap<TokenEffect, number> = room.isExplored ? new Map() : tokenOdds(view, roomId);
  const silence = odds.get('SILENCE') ?? 0;
  const danger = (odds.get('DANGER') ?? 0) + (context.self.hasSlime ? silence : 0);
  const rolled = 1 - danger - (context.self.hasSlime ? 0 : silence);
  const chance = contactChance(view, roomId);
  const roll = chance * contactHarm(context, handAfter) + (1 - chance) * tuning.tactics.harm.noise;
  return exploration + (danger > 0 ? danger * dangerHarm(context, roomId) : 0) + rolled * roll;
}

export const POD_DEFINITIONS = ['ESCAPE_POD_A', 'ESCAPE_POD_B'];

/** Спасательные отсеки, где можно сесть в Капсулу (стр. 26): цела, не улетела, Разблокирована, есть место, нет Неисправности. */
export function boardablePodDefinitions(view: SanitizedGameState): string[] {
  const rooms = Object.values(view.ship.rooms);
  return POD_DEFINITIONS.filter(
    (definitionId) =>
      boardablePods(view.ship.escapePods, definitionId).length > 0 &&
      rooms.find((room) => room.definitionId === definitionId)?.hasMalfunction !== true,
  );
}
