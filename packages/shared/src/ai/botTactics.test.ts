import { describe, expect, it } from 'vitest';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import {
  BOT,
  actionCardOfKind,
  agendaFor,
  botTable,
  handOf,
  itemOfKind,
  rankedFor,
  weaponOf,
} from '../testing/botTacticsFixtures.js';
import { breachChance, markerCost } from './botShipDoom.js';
import { contactHarm, entryHarm, threatContext } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';

function openNeighbour(state: GameState, roomId: number): number {
  const corridor = Object.values(state.ship.corridors).find(
    (candidate) => candidate.fromRoomId === roomId || candidate.toRoomId === roomId,
  )!;
  corridor.doorState = 'OPEN';
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
}

function noiseAround(state: GameState, roomId: number): void {
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) corridor.hasNoise = true;
  }
}

function seriousWounds(state: GameState, count: number): void {
  state.players[BOT]!.seriousWounds = state.decks.seriousWounds.drawPile
    .slice(0, count)
    .map((wound) => ({ ...wound, kind: 'BACK', isTreated: true }));
}

describe('Бой: драться, если есть чем и хватает здоровья; иначе уходить (В8-10)', () => {
  it('здоровый бот с заряженным Оружием стреляет во Взрослую, а не бежит', () => {
    const state = botTable('tactics-fight');
    putPlayer(state, 'player-1', openNeighbour(state, state.players[BOT]!.roomId));
    putIntruder(state, 'ADULT', state.players[BOT]!.roomId);
    const [best] = rankedFor(state);
    expect(best!.candidate.kind).toBe('SHOOT');
    expect(best!.factors.safety).toBeGreaterThan(0);
  });

  it('израненный бот без Оружия не лезет в Рукопашную: промах добьёт его', () => {
    const state = botTable('tactics-flee');
    state.players[BOT]!.handSlots = [];
    seriousWounds(state, 2);
    putIntruder(state, 'ADULT', state.players[BOT]!.roomId);
    const ranked = rankedFor(state);
    const melee = ranked.find((entry) => entry.candidate.kind === 'MELEE')!;
    expect(ranked[0]!.candidate.kind).not.toBe('MELEE');
    expect(melee.factors.harm).toBeGreaterThan(ranked.find((entry) => entry.candidate.kind === 'PASS')!.factors.harm);
  });

  it('союзник в Бою рядом — вооружённый бот идёт на помощь: вдвоём Чужого добивают до Фазы Событий', () => {
    const state = botTable('tactics-gang');
    for (const pod of Object.values(state.ship.escapePods)) pod.isDestroyed = true;
    const here = state.players[BOT]!.roomId;
    const allyRoom = openNeighbour(state, here);
    putPlayer(state, 'player-1', allyRoom);
    putIntruder(state, 'ADULT', allyRoom);
    state.ship.rooms[allyRoom]!.isExplored = true;
    expect(agendaFor(state).tasks.some((entry) => entry.kind === 'FIGHT' && entry.desire === 'HELP')).toBe(true);
    const [best] = rankedFor(state);
    expect(best!.candidate.roomId).toBe(allyRoom);
  });

  it('без заряженного Оружия бот не зовётся в чужой Бой', () => {
    const state = botTable('tactics-gang-unarmed');
    state.players[BOT]!.handSlots = [];
    const allyRoom = openNeighbour(state, state.players[BOT]!.roomId);
    putPlayer(state, 'player-1', allyRoom);
    putIntruder(state, 'ADULT', allyRoom);
    expect(agendaFor(state).tasks.some((entry) => entry.kind === 'FIGHT' && entry.desire === 'HELP')).toBe(false);
  });
});

describe('Шум и последняя карта (стр. 15, 18)', () => {
  it('Встреча дороже с пустой рукой; в Комнату к союзнику кубик Шума не бросается', () => {
    const state = botTable('tactics-noise');
    const here = state.players[BOT]!.roomId;
    const target = openNeighbour(state, here);
    noiseAround(state, target);
    putPlayer(state, 'player-1', here);
    const view = filterStateForPlayer(state, BOT);
    const context = threatContext(view, view.players[BOT]!, BOT_TUNING);
    expect(contactHarm(context, 0)).toBeGreaterThan(contactHarm(context, 4));
    expect(entryHarm(context, target, 0, false)).toBeGreaterThan(entryHarm(context, target, 4, false));
    expect(entryHarm(context, target, 0, true)).toBeLessThan(entryHarm(context, target, 0, false));
    putPlayer(state, 'player-1', target);
    const withAlly = filterStateForPlayer(state, BOT);
    const allyContext = threatContext(withAlly, withAlly.players[BOT]!, BOT_TUNING);
    expect(entryHarm(allyContext, target, 0, false)).toBeLessThan(entryHarm(context, target, 0, false));
  });

  it('в Комнату, где все Коридоры шумят, бот с двумя картами идёт Осторожно, а не на авось', () => {
    const state = botTable('tactics-careful');
    const here = state.players[BOT]!.roomId;
    const target = openNeighbour(state, here);
    noiseAround(state, target);
    const quiet = Object.values(state.ship.corridors).find(
      (corridor) =>
        (corridor.fromRoomId === target || corridor.toRoomId === target) &&
        corridor.fromRoomId !== here &&
        corridor.toRoomId !== here,
    );
    if (quiet) quiet.hasNoise = false;
    handOf(state, [], 2);
    const ranked = rankedFor(state);
    const careful = ranked.find(
      (entry) => entry.candidate.kind === 'CAREFUL_MOVE' && entry.candidate.roomId === target,
    );
    const rolled = ranked.find((entry) => entry.candidate.kind === 'MOVE' && entry.candidate.roomId === target)!;
    if (careful) expect(careful.factors.harm).toBeLessThan(rolled.factors.harm);
    expect(rolled.factors.harm).toBeGreaterThan(0);
  });
});

describe('Предметы, лечение, Боезапас, Создание (стр. 21–23)', () => {
  it('Аптечкой вылечивает Обработанную Тяжёлую Травму', () => {
    const state = botTable('tactics-medkit');
    seriousWounds(state, 2);
    state.players[BOT]!.inventory = [itemOfKind('MEDKIT')];
    const ranked = rankedFor(state);
    const heal = ranked.find((entry) => entry.candidate.action.type === 'ACTION_USE_ITEM')!;
    expect(heal.candidate.effects).toContainEqual({ kind: 'HEAL', detail: {} });
    expect(ranked[0]).toBe(heal);
  });

  it('разряженное Энергооружие заряжает Энергозарядом', () => {
    const state = botTable('tactics-reload');
    state.players[BOT]!.handSlots = [{ source: 'ITEM', card: { ...weaponOf(state), isEnergyWeapon: true, ammo: 0 } }];
    state.players[BOT]!.inventory = [itemOfKind('ENERGY_CHARGE')];
    const [best] = rankedFor(state);
    expect(best!.candidate.action).toMatchObject({ type: 'ACTION_USE_ITEM' });
    expect(best!.candidate.effects).toContainEqual({ kind: 'RELOAD', detail: {} });
  });

  it('без Оружия создаёт Огнемёт из Химикатов и Инструментов', () => {
    const state = botTable('tactics-craft');
    state.players[BOT]!.handSlots = [];
    state.players[BOT]!.inventory = [itemOfKind('CHEMICALS'), itemOfKind('TOOLS')];
    const ranked = rankedFor(state);
    const craft = ranked.find((entry) => entry.candidate.kind === 'CRAFT');
    expect(craft?.candidate.action).toMatchObject({ type: 'ACTION_CRAFT_ITEM', payload: { recipeId: 'FLAMETHROWER' } });
    expect(ranked.indexOf(craft!)).toBeLessThan(3);
  });

  it('Создаваемых Предметов не осталось — кандидата Создания нет', () => {
    const state = botTable('tactics-craft-empty');
    state.players[BOT]!.inventory = [itemOfKind('CHEMICALS'), itemOfKind('TOOLS')];
    state.decks.craftedItems.drawPile = state.decks.craftedItems.drawPile.filter(
      (card) => card.recipeId !== 'FLAMETHROWER',
    );
    expect(CRAFTED_ITEM_CARDS.length).toBeGreaterThan(0);
    const craft = rankedFor(state).find(
      (entry) => entry.candidate.kind === 'CRAFT' && JSON.stringify(entry.candidate.action).includes('FLAMETHROWER'),
    );
    expect(craft).toBeUndefined();
  });
});

describe('Корабль: 9-й маркер губит всех (стр. 11, 17)', () => {
  it('чем меньше маркеров в запасе, тем дороже каждый новый', () => {
    const state = botTable('tactics-doom');
    state.meta.timeTrackPosition = 12;
    const view = filterStateForPlayer(state, BOT);
    expect(breachChance(view, 'MALFUNCTION', 1, BOT_TUNING)).toBeGreaterThan(
      breachChance(view, 'MALFUNCTION', 6, BOT_TUNING),
    );
    expect(breachChance(view, 'MALFUNCTION', -1, BOT_TUNING)).toBe(1);
    const calm = markerCost(view, 'MALFUNCTION', BOT_TUNING);
    const rooms = Object.values(state.ship.rooms)
      .filter((room) => room.definitionId !== 'NEST')
      .slice(0, 7);
    for (const room of rooms) {
      room.isExplored = true;
      room.hasMalfunction = true;
    }
    const brink = markerCost(filterStateForPlayer(state, BOT), 'MALFUNCTION', BOT_TUNING);
    expect(brink).toBeGreaterThan(calm * 5);
    for (const room of Object.values(state.ship.rooms).filter((entry) => entry.definitionId !== 'NEST')) {
      room.isExplored = true;
      room.hasMalfunction = true;
    }
    expect(markerCost(filterStateForPlayer(state, BOT), 'MALFUNCTION', BOT_TUNING)).toBe(1);
  });

  it('с картой Ремонта в Неисправной Комнате бот чинит её', () => {
    const state = botTable('tactics-repair');
    state.ship.rooms[state.players[BOT]!.roomId]!.hasMalfunction = true;
    for (const room of Object.values(state.ship.rooms).slice(0, 6)) room.hasMalfunction = true;
    handOf(state, [actionCardOfKind('REPAIR')], 5);
    const ranked = rankedFor(state);
    const fix = ranked.find((entry) => entry.candidate.effects.some((produced) => produced.kind === 'FIX_MALFUNCTION'));
    expect(fix).toBeDefined();
    expect(ranked[0]).toBe(fix);
  });
});

describe('Прыжок (стр. 11): вне Анабиоза в последнем раунде — гибель', () => {
  it('в последнем раунде Пас стоит жизни, а бот в Криогенном отсеке ложится в Анабиоз', () => {
    const state = botTable('tactics-jump');
    state.meta.timeTrackPosition = 14;
    const cryo = roomOf(state, 'HIBERNATORIUM');
    putPlayer(state, BOT, cryo);
    const ranked = rankedFor(state);
    expect(ranked.find((entry) => entry.candidate.kind === 'PASS')!.factors.harm).toBeGreaterThanOrEqual(1);
    expect(ranked[0]!.candidate.effects).toContainEqual({ kind: 'HIBERNATE', detail: {} });
  });

  it('Чужой в Криогенном отсеке в последнем раунде — бот стреляет, чтобы освободить Анабиоз', () => {
    const state = botTable('tactics-jump-fight');
    state.meta.timeTrackPosition = 14;
    const cryo = roomOf(state, 'HIBERNATORIUM');
    putPlayer(state, BOT, cryo);
    putIntruder(state, 'ADULT', cryo);
    const [best] = rankedFor(state);
    expect(best!.candidate.kind).toBe('SHOOT');
  });
});

describe('Закрытая Дверь на пути (стр. 17)', () => {
  it('перед Прыжком бот сносит «Разрушением» Дверь, за которой Анабиоз', () => {
    const state = botTable('tactics-door');
    state.meta.timeTrackPosition = 13;
    const cryo = roomOf(state, 'HIBERNATORIUM');
    const outside = openNeighbour(state, cryo);
    putPlayer(state, BOT, outside);
    putPlayer(state, 'player-1', outside);
    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId === outside || corridor.toRoomId === outside) corridor.doorState = 'CLOSED';
    }
    handOf(state, [actionCardOfKind('DEMOLITION')], 5);
    const [best] = rankedFor(state);
    expect(best!.candidate.action).toMatchObject({ type: 'ACTION_PLAY_CARD' });
    expect(best!.candidate.opensTo).toBe(cryo);
  });

  it('без закрытых Дверей вокруг «Разрушение» Дверей не предлагается', () => {
    const state = botTable('tactics-no-door');
    for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
    handOf(state, [actionCardOfKind('DEMOLITION')], 5);
    expect(rankedFor(state).some((entry) => entry.candidate.opensTo !== undefined)).toBe(false);
  });
});

describe('Капсулы: спасение от гибели корабля (стр. 11, 25)', () => {
  it('пока Капсулы заперты, бот ставит задачу отпереть их в Контроле шлюзов', () => {
    const state = botTable('tactics-unlock');
    const unlock = agendaFor(state).tasks.find((entry) => entry.kind === 'UNLOCK_POD');
    expect(unlock?.place.definitionIds).toEqual(['HATCH_CONTROL']);
    expect(unlock!.weight).toBeGreaterThan(0);
  });

  it('открытые Капсулы отпирать незачем — бот идёт садиться', () => {
    const state = botTable('tactics-unlocked');
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
    const tasks = agendaFor(state).tasks;
    expect(tasks.some((entry) => entry.kind === 'UNLOCK_POD')).toBe(false);
    expect(tasks.some((entry) => entry.kind === 'BOARD_POD')).toBe(true);
  });
});
