import { describe, expect, it } from 'vitest';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { corridorsLeadingInto, roomHasTechnicalEntrance } from '../logic/shipGraphQueries.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { BOT, actionCardOfKind, botTable, handOf, rankedFor, weaponOf } from '../testing/botTacticsFixtures.js';
import { combatHarm, dangerHarm, entryHarm, exitHarm, intruderHarm, threatContext } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';

const EARLY_ROUND = 4;
const LAST_ROUND = 14;

function corridorsOf(state: GameState, roomId: number) {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

function otherEnd(corridor: { fromRoomId: number; toRoomId: number }, roomId: number): number {
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
}

function openNeighbour(state: GameState, roomId: number, except: readonly number[] = []): number {
  const corridor = corridorsOf(state, roomId).find((candidate) => !except.includes(otherEnd(candidate, roomId)))!;
  corridor.doorState = 'OPEN';
  return otherEnd(corridor, roomId);
}

/** Бот один на один с Чужим: союзник ушёл в соседнюю исследованную Комнату. */
function duel(seed: string, type: IntruderType, round = EARLY_ROUND): { state: GameState; here: number } {
  const state = botTable(seed);
  const here = state.players[BOT]!.roomId;
  const away = openNeighbour(state, here);
  state.ship.rooms[away]!.isExplored = true;
  putPlayer(state, 'player-1', away);
  putIntruder(state, type, here);
  state.meta.timeTrackPosition = round;
  return { state, here };
}

function lockIn(state: GameState, roomId: number): void {
  for (const corridor of corridorsOf(state, roomId)) corridor.doorState = 'CLOSED';
}

function contextOf(state: GameState) {
  const view = filterStateForPlayer(state, BOT);
  return threatContext(view, view.players[BOT]!, BOT_TUNING);
}

const STAY = { handAfter: 5, ownShots: null } as const;

describe('Горизонт Боя (стр. 10, 19–20): Чужой в Бою не уходит сам и атакует в каждой Фазе Событий', () => {
  it('без Оружия один на один со Взрослой бот уходит Побегом: Пас — Атака сейчас и Побег потом', () => {
    const { state } = duel('horizon-unarmed', 'ADULT');
    state.players[BOT]!.handSlots = [];
    const ranked = rankedFor(state);
    const pass = ranked.find((entry) => entry.candidate.kind === 'PASS')!;
    expect(ranked[0]!.candidate.kind).toBe('ESCAPE');
    expect(pass.factors.harm).toBeGreaterThan(ranked[0]!.factors.harm);
  });

  it('с разряженным Оружием бот тоже уходит: Боезапаса на Бой нет', () => {
    const { state } = duel('horizon-empty', 'ADULT');
    state.players[BOT]!.handSlots = [{ source: 'ITEM', card: { ...weaponOf(state), ammo: 0 } }];
    expect(rankedFor(state)[0]!.candidate.kind).toBe('ESCAPE');
  });

  it('Королеву стартовым Боезапасом не одолеть — бот уходит, а с «Огнём на подавление» уходит без Атаки', () => {
    const { state } = duel('horizon-queen', 'QUEEN');
    const plain = rankedFor(state);
    expect(plain[0]!.candidate.kind).toBe('ESCAPE');
    handOf(state, [actionCardOfKind('SUPPRESSIVE_FIRE')], 5);
    const covered = rankedFor(state);
    expect(covered[0]!.candidate.kind).toBe('COVERED_ESCAPE');
    expect(covered[0]!.factors.harm).toBeLessThan(plain[0]!.factors.harm);
  });

  it('вооружённый бот против Взрослой стреляет: Раны выстрелов этого раунда складываются', () => {
    const { state } = duel('horizon-armed', 'ADULT');
    const [best] = rankedFor(state);
    expect(best!.candidate.kind).toBe('SHOOT');
  });

  it('кому некуда уйти, тому Боезапас на следующие раунды удешевляет стоянку, а пустое Оружие — нет', () => {
    const { state, here } = duel('horizon-ammo', 'ADULT');
    lockIn(state, here);
    const context = contextOf(state);
    const loaded = combatHarm(context, here, { ...STAY, ammoAfter: 4 });
    const empty = combatHarm(context, here, { ...STAY, ammoAfter: 0 });
    expect(loaded).toBeLessThan(empty);
  });

  it('в последнем раунде Бой стоит одной Атаки, а раньше — больше: Чужой останется и на следующий раунд', () => {
    const last = duel('horizon-last', 'ADULT', LAST_ROUND);
    last.state.players[BOT]!.handSlots = [];
    const lastContext = contextOf(last.state);
    expect(combatHarm(lastContext, last.here, STAY)).toBeCloseTo(intruderHarm(lastContext, 'ADULT'));
    const early = duel('horizon-early', 'ADULT');
    early.state.players[BOT]!.handSlots = [];
    const earlyContext = contextOf(early.state);
    expect(combatHarm(earlyContext, early.here, STAY)).toBeGreaterThan(1.5 * intruderHarm(earlyContext, 'ADULT'));
  });

  it('сосед по Комнате делит Атаки этого и следующих раундов: стоять вдвоём дешевле, чем одному', () => {
    const { state, here } = duel('horizon-pair', 'ADULT');
    state.players[BOT]!.handSlots = [];
    lockIn(state, here);
    const alone = combatHarm(contextOf(state), here, STAY);
    putPlayer(state, 'player-1', here);
    state.players['player-1']!.handSlots = [];
    expect(combatHarm(contextOf(state), here, STAY)).toBeCloseTo(alone / 2);
  });

  it('за закрытыми Дверями уйти некуда: стоянка — Атака в каждой оставшейся Фазе Событий', () => {
    const { state, here } = duel('horizon-locked', 'ADULT');
    state.players[BOT]!.handSlots = [];
    lockIn(state, here);
    const context = contextOf(state);
    const roundsLeft = 15 - EARLY_ROUND;
    expect(exitHarm(context, here)).toBe(Number.POSITIVE_INFINITY);
    expect(combatHarm(context, here, STAY)).toBeCloseTo(roundsLeft * intruderHarm(context, 'ADULT'));
  });
});

describe('«Опасность» жетона Исследования (стр. 15)', () => {
  function crossroads(seed: string) {
    const state = botTable(seed);
    const here = state.players[BOT]!.roomId;
    putPlayer(state, 'player-1', here);
    const target = openNeighbour(state, here);
    const lair = openNeighbour(state, target, [here]);
    for (const corridor of corridorsOf(state, target))
      if (otherEnd(corridor, target) === lair) corridor.doorState = 'OPEN';
    return { state, here, target, lair };
  }

  it('Чужой из соседней Комнаты без Персонажей приходит в новую Комнату', () => {
    const { state, target, lair } = crossroads('danger-attract');
    putIntruder(state, 'ADULT', lair);
    const context = contextOf(state);
    expect(dangerHarm(context, target)).toBeCloseTo(
      intruderHarm(context, 'ADULT') * BOT_TUNING.tactics.harm.combatContinuation,
    );
  });

  it('закрытая Дверь держит Чужого, и Шума тоже нет: прийти было кому', () => {
    const { state, target, lair } = crossroads('danger-door');
    putIntruder(state, 'ADULT', lair);
    for (const corridor of corridorsOf(state, target)) {
      if (otherEnd(corridor, target) === lair) corridor.doorState = 'CLOSED';
    }
    expect(dangerHarm(contextOf(state), target)).toBe(0);
  });

  it('Чужой в Бою с другим Персонажем не приходит: Шум ложится во все тихие Коридоры', () => {
    const { state, target, lair } = crossroads('danger-noise');
    putIntruder(state, 'ADULT', lair);
    putPlayer(state, 'player-1', lair);
    const quiet = corridorsLeadingInto(state, target).filter((corridor) => !corridor.hasNoise).length;
    const technical = roomHasTechnicalEntrance(target) && !state.ship.technicalCorridorNoise ? 1 : 0;
    expect(dangerHarm(contextOf(state), target)).toBeCloseTo((quiet + technical) * BOT_TUNING.tactics.harm.noise);
  });

  it('Чужой, от которого бот бежит, приходит следом: бот уже не держит его в Бою', () => {
    const { state, here, target } = crossroads('danger-chase');
    putPlayer(state, 'player-1', target);
    putIntruder(state, 'ADULT', here);
    putPlayer(state, 'player-1', openNeighbour(state, here, [target]));
    const context = contextOf(state);
    expect(dangerHarm(context, target)).toBeGreaterThanOrEqual(
      intruderHarm(context, 'ADULT') * BOT_TUNING.tactics.harm.combatContinuation - 1e-9,
    );
  });

  it('вход в неисследованную Комнату рядом со свободным Чужим дороже: жетон может оказаться «Опасностью»', () => {
    const { state, target, lair } = crossroads('danger-entry');
    state.ship.rooms[target]!.isExplored = false;
    const calm = entryHarm(contextOf(state), target, 4, false);
    putIntruder(state, 'ADULT', lair);
    expect(entryHarm(contextOf(state), target, 4, false)).toBeGreaterThan(calm);
  });
});
