import type { CraftedItemId } from '../types/cards.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { ACTION_CARD_COMBAT_USE } from '../data/combatUse.js';
import { getItemEffectKind, type ItemEffectKind } from '../data/itemEffectKinds.js';
import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import { clamp01, evaluateCurve } from './botCurves.js';
import { roundsLeft } from './botRisk.js';
import { handOf, isActionCard, unscannedContamination } from './botHand.js';
import { infectionDeath, nextMaturationChance } from './botFinale.js';
import { attackHarm, fragilityCost, vitalityOf, type Vitality } from './botHarm.js';
import type { BotMind } from './botMind.js';
import { searchableRoomIds } from './botNavigation.js';
import { task, type BotTask } from './botTasks.js';
import { markerRelief } from './botShipDoom.js';
import { intrudersIn, shooterOf } from './botThreat.js';
import type { BotTuning, TuningKnob } from './botTuning.js';

export interface NeedsContext {
  view: SanitizedGameState;
  mind: BotMind;
  self: SanitizedPlayerState;
  tuning: BotTuning;
  knobs: Record<TuningKnob, number>;
  altruism: number;
}

const REPAIR_CARD_KINDS = new Set(['BASIC_REPAIR', 'REPAIR', 'FAST_REPAIR']);
const REPAIR_ITEMS: readonly ItemEffectKind[] = ['TOOLS', 'DUCT_TAPE'];
const TREATING_ITEMS: readonly ItemEffectKind[] = ['MEDKIT', 'BANDAGES', 'CLOTHES'];
const SCAN_ROOMS = ['CANTEEN', 'SHOWER'];
const ANYWHERE = {};

function ownedKinds(self: SanitizedPlayerState): ItemEffectKind[] {
  const slots = self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : []));
  return [...(self.inventory ?? []), ...slots].map((item) => getItemEffectKind(item));
}

function owns(self: SanitizedPlayerState, kinds: readonly ItemEffectKind[]): boolean {
  return ownedKinds(self).some((kind) => kinds.includes(kind));
}

function holdsCard(view: SanitizedGameState, botId: string, matches: (kind: string) => boolean): boolean {
  return handOf(view, botId).some(
    (card) => matches(card.effect.kind) && ACTION_CARD_COMBAT_USE[card.effect.kind] !== 'IN_COMBAT',
  );
}

function worth(context: NeedsContext, deathShare: number): number {
  return context.tuning.desires.SURVIVE * context.tuning.tactics.harm.weight * deathShare;
}

function withoutOneSerious(vitality: Vitality): Vitality {
  return { ...vitality, seriousWounds: Math.max(0, vitality.seriousWounds - 1) };
}

/**
 * Лечение (стр. 21): Обработка снимает действие Тяжёлой Травмы, Аптечка и Медпункт вылечивают Обработанную,
 * Бинты — Лёгкие. Ценность — насколько бот отойдёт от гибели.
 */
function healthTasks(context: NeedsContext): BotTask[] {
  const { view, mind, self, tuning, knobs } = context;
  const vitality = vitalityOf(self);
  const now = fragilityCost(vitality, tuning);
  const tasks: BotTask[] = [];
  const untreated = self.seriousWounds.filter((wound) => !wound.isTreated);
  const healSerious = now - fragilityCost(withoutOneSerious(vitality), tuning);
  if (untreated.length > 0) {
    const effects = untreated.reduce((sum, wound) => sum + (tuning.tactics.woundEffects[wound.kind] ?? 0), 0);
    const place = owns(self, TREATING_ITEMS) ? ANYWHERE : { definitionIds: ['INFIRMARY'] };
    tasks.push(task('TREAT_WOUND', 'SURVIVE', worth(context, effects + healSerious / 2), place, 'Обработать Травму'));
  }
  if (self.seriousWounds.some((wound) => wound.isTreated)) {
    const place = owns(self, ['MEDKIT']) ? ANYWHERE : { definitionIds: ['INFIRMARY'] };
    tasks.push(task('HEAL', 'SURVIVE', worth(context, healSerious), place, 'Вылечить Травму'));
  }
  if (self.lightWounds > 0) {
    const healLight = now - fragilityCost({ ...vitality, lightWounds: 0 }, tuning);
    const place = owns(self, ['BANDAGES']) ? ANYWHERE : { definitionIds: ['INFIRMARY', 'CANTEEN'] };
    tasks.push(task('HEAL', 'SURVIVE', worth(context, healLight), place, 'Залечить Лёгкие Раны'));
  }
  const infection = infectionDeath(view, self);
  if (infection > 0) {
    const place = owns(self, ['ANTIDOTE']) ? ANYWHERE : { definitionIds: ['SURGERY'] };
    const reason = self.hasLarva ? 'Удалить Личинку' : 'Удалить ИНФЕКЦИЮ';
    const delay = nextMaturationChance(view, self) + timePressure(view, tuning) * infection;
    const carrier = self.hasLarva ? tuning.tactics.harm.larva : 0;
    tasks.push(task('CURE', 'SURVIVE', worth(context, Math.max(carrier, delay)), place, reason));
  }
  const contamination = unscannedContamination(view, mind.botId);
  if (contamination > 0) {
    const resting = handOf(view, mind.botId).some((card) => isActionCard(card) && card.effect.kind === 'REST');
    const place = resting || owns(self, ['ALCOHOL']) ? ANYWHERE : { definitionIds: SCAN_ROOMS };
    const everyday =
      tuning.desires.SURVIVE * clamp01(contamination * tuning.hand.scanPerContamination * knobs.scanRate);
    const finalCheck = worth(
      context,
      timePressure(view, tuning) * clamp01(contamination * tuning.tactics.infectionPerCard),
    );
    const weight = Math.max(everyday, finalCheck);
    tasks.push(task('SCAN_HAND', 'SURVIVE', weight, place, 'Просканировать руку'));
  }
  return tasks;
}

function weaponsInHands(self: SanitizedPlayerState) {
  return self.handSlots.flatMap((slot) => (slot.source === 'ITEM' && slot.card.isWeapon ? [slot.card] : []));
}

function reloadPlace(context: NeedsContext, weapon: ReturnType<typeof weaponsInHands>[number]) {
  const { view, self, mind } = context;
  const flamethrower = weapon.id.startsWith('CRAFTED_FLAMETHROWER_');
  if (flamethrower && owns(self, ['CHEMICALS'])) return ANYWHERE;
  if (weapon.isEnergyWeapon && owns(self, ['ENERGY_CHARGE'])) return ANYWHERE;
  if (holdsCard(view, mind.botId, (kind) => kind === 'RELOAD')) return ANYWHERE;
  return weapon.isEnergyWeapon ? { definitionIds: ['ARMORY'] } : null;
}

/** Боезапас (стр. 22): пустое Оружие — повод зарядиться, пока рядом нет Чужих. */
function ammoTasks(context: NeedsContext): BotTask[] {
  const { tuning, knobs } = context;
  return weaponsInHands(context.self).flatMap((weapon) => {
    const missing = Math.max(0, (weapon.maxAmmo ?? 0) - (weapon.ammo ?? 0));
    const place = reloadPlace(context, weapon);
    if (missing === 0 || !place) return [];
    const empty = (weapon.ammo ?? 0) === 0 ? 1.5 : 1;
    const weight = worth(context, tuning.tactics.ammoValue * Math.min(3, missing) * empty) * knobs.combatDesire;
    return [task('RELOAD', 'EQUIP', weight, place, 'Зарядить Оружие')];
  });
}

function crowdedNearby(view: SanitizedGameState, self: SanitizedPlayerState): number {
  const rooms = [self.roomId, ...findAdjacentOpenRoomIds(view, self.roomId)];
  return Math.max(0, ...rooms.map((roomId) => intrudersIn(view, roomId).length));
}

/** Нужда в Создаваемом Предмете (стр. 23): оружие без Боезапаса, толпа Чужих рядом, Личинка. */
function craftNeed(context: NeedsContext, recipe: CraftedItemId, armed: boolean): number {
  const { view, self } = context;
  const nearby = crowdedNearby(view, self);
  switch (recipe) {
    case 'FLAMETHROWER':
      return armed ? 0.2 : 1;
    case 'TASER':
      return nearby > 0 && !armed ? 0.8 : 0.25;
    case 'MOLOTOV_COCKTAIL':
      return nearby >= 2 ? 0.9 : 0.15;
    case 'ANTIDOTE':
      return self.hasLarva ? 1.5 : unscannedContamination(view, context.mind.botId) > 0 ? 0.3 : 0.05;
  }
}

function armsTasks(context: NeedsContext): BotTask[] {
  const { view, self, tuning, knobs } = context;
  const armed = (shooterOf(self, 1)?.attempts ?? 0) > 0;
  const tasks: BotTask[] = [];
  if (!armed) {
    tasks.push(
      task(
        'SEARCH',
        'EQUIP',
        tuning.desires.EQUIP * knobs.itemHoarding,
        { roomIds: searchableRoomIds(view) },
        'Найти Оружие',
      ),
    );
  }
  const recipes: CraftedItemId[] = ['FLAMETHROWER', 'TASER', 'MOLOTOV_COCKTAIL', 'ANTIDOTE'];
  for (const recipe of recipes) {
    const weight = tuning.desires.SURVIVE * tuning.tactics.craftValue * craftNeed(context, recipe, armed);
    tasks.push(task('CRAFT', 'EQUIP', weight, ANYWHERE, 'Создать Предмет', { itemId: recipe }));
  }
  return [...tasks, ...ammoTasks(context)];
}

/** Неисправный Криогенный отсек закрывает Анабиоз (стр. 17, 26): чем ближе Прыжок, тем это смертельнее. */
function timePressure(view: SanitizedGameState, tuning: BotTuning): number {
  return evaluateCurve(tuning.curves.timePressure, 1 - roundsLeft(view) / TIME_TRACK_LENGTH);
}

export function canRepair(context: Pick<NeedsContext, 'view' | 'mind' | 'self'>): boolean {
  return (
    owns(context.self, REPAIR_ITEMS) ||
    holdsCard(context.view, context.mind.botId, (kind) => REPAIR_CARD_KINDS.has(kind))
  );
}

/**
 * Корабль (стр. 17): 9-й маркер Неисправности или Пожара губит всех на борту. Ремонт и тушение ценны ростом
 * запаса маркеров; Пожар к тому же перекидывается на соседей.
 */
function shipTasks(context: NeedsContext): BotTask[] {
  const { view, self, tuning, altruism } = context;
  const care = tuning.desires.HELP * Math.max(0, 0.5 + altruism);
  const rooms = Object.values(view.ship.rooms);
  const tasks: BotTask[] = [];
  if (canRepair(context)) {
    const relief = worth(context, markerRelief(view, 'MALFUNCTION', tuning));
    for (const room of rooms.filter((entry) => entry.hasMalfunction)) {
      const weight = relief + care * 0.5;
      tasks.push(
        task('FIX_MALFUNCTION', 'SURVIVE', weight, { roomIds: [room.id] }, 'Починить Комнату', {
          roomId: room.id,
        }),
      );
    }
  }
  const fireRelief = worth(context, markerRelief(view, 'FIRE', tuning));
  const extinguisher = owns(self, ['FIRE_EXTINGUISHER']);
  for (const room of rooms.filter((entry) => entry.hasFire)) {
    const place = extinguisher
      ? { roomIds: [room.id], definitionIds: ['FIRE_CONTROL'] }
      : { definitionIds: ['FIRE_CONTROL'] };
    tasks.push(
      task('EXTINGUISH', 'SURVIVE', fireRelief + care * 0.5, place, 'Потушить Пожар', {
        roomId: room.id,
      }),
    );
  }
  return tasks;
}

/** Бой (стр. 19): свой — всегда, чужой — только с заряженным Оружием; ценнее, чем ближе союзник к гибели. */
function fightTasks(context: NeedsContext): BotTask[] {
  const { view, self, tuning, knobs, altruism } = context;
  const tasks: BotTask[] = [];
  const fightWeight = (tuning.desires.SURVIVE * 0.6 * knobs.combatDesire) / Math.max(knobs.combatFlight, 0.1);
  if (intrudersIn(view, self.roomId).length > 0) {
    tasks.push(task('FIGHT', 'SURVIVE', fightWeight, { roomIds: [self.roomId] }, 'Бой в своей Комнате'));
  }
  const shots = shooterOf(self, handOf(view, self.id).length)?.attempts ?? 0;
  if (shots === 0) return tasks;
  const helpBase = tuning.desires.HELP * knobs.killHelpValue * Math.max(0, 0.5 + altruism);
  for (const ally of Object.values(view.players)) {
    if (ally.id === self.id || ally.isDead || ally.isInHibernation || ally.hasEscapedInPod) continue;
    const intruders = intrudersIn(view, ally.roomId);
    if (intruders.length === 0 || ally.roomId === self.roomId) continue;
    const peril = intruders.reduce((sum, intruder) => sum + attackHarm(vitalityOf(ally), intruder.type, tuning), 0);
    const weight =
      helpBase +
      tuning.tactics.intruderRemoval * knobs.combatDesire +
      worth(context, peril) * Math.max(0, 0.5 + altruism) * clamp01(shots / 2);
    tasks.push(task('FIGHT', 'HELP', weight, { roomIds: [ally.roomId] }, 'Помочь в Бою', { playerId: ally.id }));
  }
  return tasks;
}

/** Нужды бота (В8-10): здоровье, оружие и Боезапас, Создание Предметов, корабль, Бой — с весом по реальной нужде. */
export function needTasks(context: NeedsContext): BotTask[] {
  return [...healthTasks(context), ...armsTasks(context), ...shipTasks(context), ...fightTasks(context)];
}
