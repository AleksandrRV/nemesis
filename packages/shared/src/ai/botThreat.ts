import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
import { ESCAPE_NUMBERS_BY_TYPE } from '../data/intruderPool.js';
import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
import type { ExplorationEffect, RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { boardablePods, loadedHandWeapon } from '../logic/actionRules.js';
import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import {
  attackHarm,
  lightWoundHarm,
  neutralizeChance,
  shotInjuryOdds,
  vitalityOf,
  type InjuryOdds,
  type Vitality,
} from './botHarm.js';
import { contactChance } from './botRisk.js';
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
}

export function threatContext(
  view: SanitizedGameState,
  self: SanitizedPlayerState,
  tuning: BotTuning,
  fear = 1,
): ThreatContext {
  return { view, self, vitality: vitalityOf(self), tuning, fear };
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

function oddsFor(context: ThreatContext, shooter: Shooter, type: IntruderType): InjuryOdds {
  return shotInjuryOdds(context.view, shooter.weapon, type);
}

/** Шанс, что Чужой доживёт в Комнате до Фазы Событий под огнём перечисленных стрелков. */
export function survivalUnderFire(context: ThreatContext, intruder: IntruderEntity, shooters: readonly Shooter[]) {
  return shooters.reduce(
    (remain, shooter) =>
      remain *
      (1 -
        neutralizeChance(
          context.view,
          intruder.type,
          intruder.woundsCount,
          oddsFor(context, shooter, intruder.type),
          shooter.attempts,
        )),
    1,
  );
}

export interface StayPlan {
  handAfter: number;
  /** Выстрелы бота до конца раунда; `focusId` — по кому. */
  ownShots: Shooter | null;
  focusId?: string;
  /** Чужие, которых Действие уже убрало из Комнаты с этим шансом. */
  removed?: ReadonlyMap<string, number>;
}

/** Самый опасный Чужой Комнаты: на нём сходятся выстрелы, если цель не задана. */
export function mostDangerous(context: ThreatContext, intruders: readonly IntruderEntity[]): IntruderEntity | null {
  return intruders.reduce<IntruderEntity | null>(
    (best, next) =>
      best === null || intruderHarm(context, next.type) > intruderHarm(context, best.type) ? next : best,
    null,
  );
}

/**
 * Вред Боя до конца раунда: каждый Чужой, переживший выстрелы бота и союзников, атакует в Фазе Событий,
 * а бой, не законченный сейчас, продолжится в следующем раунде.
 */
export function combatHarm(context: ThreatContext, roomId: RoomId, plan: StayPlan): number {
  const intruders = intrudersIn(context.view, roomId);
  if (intruders.length === 0) return 0;
  const { harm } = context.tuning.tactics;
  const allies = allyShooters(context, roomId);
  const focus = intruders.find((intruder) => intruder.id === plan.focusId) ?? mostDangerous(context, intruders);
  const share = attackShare(context, roomId, plan.handAfter);
  return intruders.reduce((sum, intruder) => {
    const own = plan.ownShots && intruder === focus ? [plan.ownShots] : [];
    const alreadyGone = plan.removed?.get(intruder.id) ?? 0;
    const remain = (1 - alreadyGone) * survivalUnderFire(context, intruder, [...own, ...allies]);
    return sum + intruderHarm(context, intruder.type) * remain * share * (1 + harm.combatContinuation);
  }, 0);
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

/** Шанс эффекта жетона Исследования в новой Комнате: состав коробки минус уже раскрытые (стр. 14). */
export function explorationOdds(view: SanitizedGameState): Map<TokenEffect, number> {
  const revealed = revealedEffects(view);
  const unrevealed = new Map<TokenEffect, number>();
  for (const token of EXPLORATION_TOKENS) unrevealed.set(token.effect, (unrevealed.get(token.effect) ?? 0) + 1);
  for (const [effect, count] of revealed) unrevealed.set(effect, Math.max(0, (unrevealed.get(effect) ?? 0) - count));
  const total = [...unrevealed.values()].reduce((sum, count) => sum + count, 0);
  return new Map([...unrevealed].map(([effect, count]) => [effect, total === 0 ? 0 : count / total]));
}

/** Вред раскрытия жетона Исследования: Пожар, Неисправность ближе к гибели корабля, Слизь. */
export function explorationHarm(context: ThreatContext): number {
  const { view, tuning } = context;
  const odds = explorationOdds(view);
  return (
    (odds.get('MALFUNCTION') ?? 0) * markerCost(view, 'MALFUNCTION', tuning) +
    (odds.get('FIRE') ?? 0) * (markerCost(view, 'FIRE', tuning) + lightWoundHarm(context.vitality, tuning)) +
    (odds.get('SLIME') ?? 0) * (context.self.hasSlime ? 0 : tuning.tactics.harm.slime)
  );
}

/**
 * Вред входа в Комнату (стр. 13–15): Встреча по броску Шума с учётом руки после оплаты; бросок не нужен,
 * если в Комнате уже есть Персонаж или Чужой; «Осторожное движение» кладёт Шум без броска.
 */
export function entryHarm(context: ThreatContext, roomId: RoomId, handAfter: number, careful: boolean): number {
  const { view, tuning } = context;
  const room = view.ship.rooms[roomId];
  if (!room) return Number.POSITIVE_INFINITY;
  const exploration = room.isExplored ? 0 : explorationHarm(context);
  const company = crewIn(view, roomId).some((player) => player.id !== context.self.id);
  if (company || intrudersIn(view, roomId).length > 0) return exploration;
  if (careful) return exploration + tuning.tactics.harm.noise;
  const silenceOdds = room.isExplored ? 0 : (explorationOdds(view).get('SILENCE') ?? 0);
  const chance = contactChance(view, roomId) * (context.self.hasSlime ? 1 : 1 - silenceOdds);
  return exploration + chance * contactHarm(context, handAfter) + (1 - chance) * tuning.tactics.harm.noise;
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
