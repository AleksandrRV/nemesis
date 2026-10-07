import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { ContaminationCard } from '../types/cards.js';
import type { SanitizedPlayerState } from '../types/sanitized.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { BOT, agendaFor, botTable, neutralMind, rankedFor } from '../testing/botTacticsFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import { buildAgenda } from './botGoals.js';
import { finalCheckDeath, infectionDeath, maturationChance, scanDeathChance } from './botFinale.js';
import { BOT_TUNING } from './botTuning.js';

const INFECTED_SHARE = 7 / 27;
/** 10 карт класса и одна карта Заражения: 4 из 11 без неё — 7/11. */
const ONE_IN_ELEVEN = 1 - 7 / 11;

function contamination(isInfected: boolean, isScanned: boolean): ContaminationCard {
  return { id: `TEST_CONTAMINATION_${isInfected ? 'I' : 'C'}_${isScanned ? 'S' : 'U'}`, isInfected, isScanned };
}

/** Колода бота: 10 карт класса и перечисленные карты Заражения в сбросе. */
function withDiscard(state: GameState, cards: ContaminationCard[], hasLarva = false): SanitizedPlayerState {
  const player = state.players[BOT]!;
  const deck = player.actionDeck;
  const actions = [...deck.hand, ...deck.drawPile, ...deck.discard].filter((card) => 'characterClass' in card);
  deck.hand = actions.slice(0, 5);
  deck.drawPile = actions.slice(5);
  deck.discard = cards;
  player.hasLarva = hasLarva;
  return filterStateForPlayer(state, BOT).players[BOT]!;
}

describe('Проверка Заражения в финале (стр. 11)', () => {
  it('без Заражения и Личинки проверка не грозит', () => {
    expect(finalCheckDeath(withDiscard(botTable('finale-clean'), []))).toBe(0);
  });

  it('с Личинкой — сразу шаг Б: гибнет, если среди 4 карт попадётся Заражение', () => {
    const self = withDiscard(botTable('finale-larva'), [contamination(false, false)], true);
    expect(finalCheckDeath(self)).toBeCloseTo(ONE_IN_ELEVEN);
  });

  it('без Личинки — только если среди непроверенных карт есть ИНФЕКЦИЯ (7 из 27)', () => {
    const unknown = withDiscard(botTable('finale-unknown'), [contamination(false, false)]);
    expect(finalCheckDeath(unknown)).toBeCloseTo(INFECTED_SHARE * ONE_IN_ELEVEN);
    const infected = withDiscard(botTable('finale-infected'), [contamination(true, true)]);
    expect(finalCheckDeath(infected)).toBeCloseTo(ONE_IN_ELEVEN);
  });
});

describe('«Созревание» (стр. 10): носитель Личинки гибнет, когда выйдет карта', () => {
  it('карта в колоде — доля вытянутых карт; в сбросе — только после замеса; без Личинки — ноль', () => {
    const state = botTable('finale-maturation');
    state.meta.timeTrackPosition = 10;
    const larva = withDiscard(state, [contamination(false, false)], true);
    const view = filterStateForPlayer(state, BOT);
    expect(maturationChance(view, larva)).toBeCloseTo(5 / state.decks.events.drawPile.length);
    const maturation = EVENT_CARDS.find((card) => card.effect === 'MATURATION')!;
    state.decks.events.drawPile = state.decks.events.drawPile.filter((card) => card.id !== maturation.id);
    state.decks.events.discard = [{ ...maturation, intruderTypes: [...maturation.intruderTypes] }];
    expect(maturationChance(filterStateForPlayer(state, BOT), larva)).toBe(0);
    const clean = withDiscard(botTable('finale-no-larva'), []);
    expect(maturationChance(view, clean)).toBe(0);
  });

  it('цена Заражения — «Созревание» на борту плюс проверка в финале, если до неё дожить', () => {
    const state = botTable('finale-total');
    const self = withDiscard(state, [contamination(false, false)], true);
    const view = filterStateForPlayer(state, BOT);
    const matures = maturationChance(view, self);
    expect(infectionDeath(view, self)).toBeCloseTo(matures + (1 - matures) * ONE_IN_ELEVEN);
  });
});

describe('Скан с Личинкой (стр. 20, 25): найденная ИНФЕКЦИЯ убивает', () => {
  it('без Личинки скан безопасен; с Личинкой — по шансу ИНФЕКЦИИ на руке, известная ИНФЕКЦИЯ — гибель', () => {
    const state = botTable('finale-scan');
    expect(scanDeathChance(withDiscard(state, []))).toBe(0);
    state.players[BOT]!.hasLarva = true;
    state.players[BOT]!.actionDeck.hand.push(contamination(false, false));
    expect(scanDeathChance(filterStateForPlayer(state, BOT).players[BOT]!)).toBeCloseTo(INFECTED_SHARE);
    state.players[BOT]!.actionDeck.hand.push(contamination(true, true));
    expect(scanDeathChance(filterStateForPlayer(state, BOT).players[BOT]!)).toBe(1);
  });

  it('бот с Личинкой не сканирует руку в Столовой, если рискует найти ИНФЕКЦИЮ', () => {
    const state = botTable('finale-canteen');
    standAt(state, BOT, 'CANTEEN');
    state.players[BOT]!.hasLarva = true;
    state.players[BOT]!.actionDeck.hand.push(contamination(true, false), contamination(true, false));
    const scan = rankedFor(state).find((entry) =>
      entry.candidate.effects.some((produced) => produced.kind === 'SCAN_HAND'),
    );
    expect(scan?.factors.harm ?? 1).toBeGreaterThan(1 - (1 - INFECTED_SHARE) ** 2 - 1e-9);
  });
});

describe('Предполётная проверка: укрытие стоит шанса пережить финал', () => {
  it('Личинка — задача «Удалить Личинку»: в начале партии не ниже `harm.larva`, к концу дороже; Операционная её выполняет', () => {
    const state = botTable('finale-cure');
    withDiscard(state, [contamination(false, false)], true);
    const cureOf = (round: number) => {
      state.meta.timeTrackPosition = round;
      return agendaFor(state).tasks.find((entry) => entry.kind === 'CURE')!.weight;
    };
    const lifeline = BOT_TUNING.desires.SURVIVE * BOT_TUNING.tactics.harm.weight;
    expect(cureOf(1)).toBeCloseTo(lifeline * BOT_TUNING.tactics.harm.larva);
    expect(cureOf(13)).toBeGreaterThan(cureOf(1));
    standAt(state, BOT, 'SURGERY');
    const [best] = rankedFor(state);
    expect(best!.candidate.effects).toContainEqual({ kind: 'CURE', detail: {} });
  });

  it('без Личинки и непроверенного Заражения излечивать нечего', () => {
    const state = botTable('finale-nothing');
    withDiscard(state, []);
    expect(agendaFor(state).tasks.some((entry) => entry.kind === 'CURE')).toBe(false);
  });

  it('смыть Слизь в Душевой — не удалить Личинку', () => {
    const state = botTable('finale-shower');
    standAt(state, BOT, 'SHOWER');
    withDiscard(state, [contamination(false, false)], true);
    state.players[BOT]!.hasSlime = true;
    const wash = rankedFor(state).find((entry) =>
      entry.candidate.effects.some((produced) => produced.kind === 'CLEANSE'),
    );
    expect(wash?.task?.kind).not.toBe('CURE');
  });

  it('пока время есть, Анабиоз при известном неверном Курсе стоит меньше: сначала Курс', () => {
    const state = botTable('finale-course');
    state.meta.timeTrackPosition = 9;
    const view = filterStateForPlayer(state, BOT);
    const mind = neutralMind(state);
    const marker = view.ship.coordinates.currentCourseMarker;
    const towards = (earth: number) => ({
      ...mind,
      coordinates: {
        ...mind.coordinates,
        byMarker: { ...mind.coordinates.byMarker, [marker]: { ...mind.coordinates.byMarker[marker], EARTH: earth } },
      },
    });
    const hibernate = (earth: number) =>
      buildAgenda(view, towards(earth), BOT_TUNING).tasks.find((entry) => entry.kind === 'HIBERNATE')?.weight ?? 0;
    expect(hibernate(0)).toBeLessThan(hibernate(1));
  });
});
