import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIntruderSupply } from '../data/intruderPool.js';
import { contactState, forceToken, putPlayer, setBag, expectEngineError } from '../testing/contactFixtures.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { resolveContact } from './contact.js';
import { drainInterrupts } from './interrupts.js';
import { corridorsLeadingInto } from './shipGraphQueries.js';

const encounter = (state: GameState, roomId = 11) =>
  resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId, source: 'NOISE' });
afterEach(() => vi.restoreAllMocks());

describe('Контакт: Личинка заражает вместо размещения (стр. 18, 20)', () => {
  it('жетон Личинки не ставит миниатюру: персонаж немедленно заражён (+1 Заражение в личный сброс)', () => {
    const state = contactState();
    forceToken(state, 'LARVA');
    const token = { ...state.intrudersPool.bag[0]! };
    const before = { ...state.meta.rngDraws };

    encounter(state);

    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
    expect(state.players['player-1']!.hasLarva).toBe(true);
    const discard = state.players['player-1']!.actionDeck.discard;
    expect(discard).toHaveLength(1);
    expect(discard[0]).toMatchObject({ isScanned: false });
    expect(state.intrudersPool.bag).toEqual([]);
    expect(state.intrudersPool.supply).toContainEqual(token);
    expect(state.intrudersPool.supply).toHaveLength(27);
    expect(state.meta.rngDraws).toEqual({ ...before, bag: before.bag + 1 });
    expect(state.interruptQueue).toEqual([]);
    expect(state.pendingDecision).toBeNull();
    expect(state.intrudersPool.firstEncounterOccurred).toBe(false);
    expect(state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
      tokenType: 'LARVA',
      intruderId: null,
      firstEncounter: false,
      surpriseAttack: false,
      infestation: { alreadyInfested: false },
    });
  });

  it('повторная Личинка при живой Личинке на планшете: без гибели, только ещё одна карта Заражения (FAQ Rules 12)', () => {
    const state = contactState();
    state.players['player-1']!.hasLarva = true;
    forceToken(state, 'LARVA');

    encounter(state);

    const player = state.players['player-1']!;
    expect(player.isDead).toBe(false);
    expect(player.hasLarva).toBe(true);
    expect(player.actionDeck.discard).toHaveLength(1);
    expect(state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
      infestation: { alreadyInfested: true },
    });
  });

  it('Личинка не запускает Первый Контакт: миниатюра на поле не появляется (стр. 12)', () => {
    const state = contactState();
    const player = state.players['player-1']!;
    player.objectives = [
      { id: 'objective-a', card: { id: 'obj-a', kind: 'PERSONAL' } },
      { id: 'objective-b', card: { id: 'obj-b', kind: 'CORPORATE' } },
    ] as never;
    forceToken(state, 'LARVA');

    encounter(state);

    expect(state.intrudersPool.firstEncounterOccurred).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(state.interruptQueue).toEqual([]);
    expect(state.gameLog.some((entry) => entry.event.type === 'FIRST_CONTACT')).toBe(false);
  });

  it('Личинка по Зову заражает так же: подавление атаки не создаётся, так как миниатюры нет', () => {
    const state = contactState();
    forceToken(state, 'LARVA');

    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'CALL' });

    expect(state.players['player-1']!.hasLarva).toBe(true);
    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.intrudersPool.attackSuppression).toEqual({});
  });
});

describe('Контакт: жетон и миниатюра (стр. 18)', () => {
  it.each(['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] satisfies IntruderType[])(
    '%s размещается с нулевыми ранами, жетон сохраняет ID/число и уходит в запас',
    (type) => {
      const state = contactState();
      forceToken(state, type);
      const token = { ...state.intrudersPool.bag[0]! };
      const before = { ...state.meta.rngDraws };
      encounter(state);
      const intruder = state.intrudersPool.boardTokens[0]!;
      expect(intruder).toEqual({ id: 'intruder-1', type, roomId: 11, woundsCount: 0 });
      expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([intruder.id]);
      expect(state.intrudersPool.bag).toEqual([]);
      expect(state.intrudersPool.supply).toContainEqual(token);
      expect(state.intrudersPool.supply).toHaveLength(27);
      expect(state.meta.rngDraws).toEqual({ ...before, bag: before.bag + 1 });
      expect(state.interruptQueue).toEqual([]);
      expect(state.players['player-1']!.hasLarva).toBe(false);
    },
  );

  it.each([1, 2, 3, 4].flatMap((number) => [0, 1, 2, 3, 4, 5].map((handCount) => ({ number, handCount }))))(
    'число $number / рука $handCount: строгое сравнение после оплаты, включая Заражение',
    ({ number, handCount }) => {
      const state = contactState();
      forceToken(state, 'ADULT', number);
      const player = state.players['player-1']!;
      player.actionDeck.hand = player.actionDeck.hand.slice(0, handCount);
      if (handCount > 0) player.actionDeck.hand[handCount - 1] = state.decks.contamination.drawPile.shift()!;
      encounter(state);
      expect(state.interruptQueue.some((event) => event.type === 'SURPRISE_ATTACK_INTERRUPT')).toBe(handCount < number);
      expect(state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
        escapeNumber: number,
        handCount,
        surpriseAttack: handCount < number,
      });
      expect(state.players['player-1']!.actionDeck.hand).toHaveLength(handCount);
    },
  );

  it('сбрасывает шум во всех ведущих Коридорах независимо от дверей, включая вентиляцию (стр. 18, шаг 1)', () => {
    const state = contactState();
    putPlayer(state, 'player-1', 14);
    forceToken(state, 'ADULT');
    const leading = corridorsLeadingInto(state, 14);
    for (const corridor of Object.values(state.ship.corridors)) corridor.hasNoise = true;
    for (const corridor of leading) corridor.doorState = 'CLOSED';
    state.ship.technicalCorridorNoise = true;
    encounter(state, 14);
    expect(leading.every((corridor) => !corridor.hasNoise && corridor.doorState === 'CLOSED')).toBe(true);
    expect(state.ship.technicalCorridorNoise).toBe(false);
    expect(
      Object.values(state.ship.corridors)
        .filter((corridor) => !leading.includes(corridor))
        .every((corridor) => corridor.hasNoise),
    ).toBe(true);
  });

  it('не трогает глобальный технический шум, если в отсеке нет входа', () => {
    const state = contactState();
    forceToken(state, 'ADULT');
    state.ship.technicalCorridorNoise = true;
    encounter(state);
    expect(state.ship.technicalCorridorNoise).toBe(true);
  });

  it('отвергает пустой мешок до чтения RNG, не создавая жетон', () => {
    const state = contactState();
    state.intrudersPool.bag = [];
    const before = structuredClone(state);
    expectEngineError(() => encounter(state), 'EMPTY_INTRUDER_BAG');
    expect(state).toEqual(before);
  });

  it('отвергает чужую комнату Контакта', () => {
    const state = contactState();
    expectEngineError(() => encounter(state, 14), 'INVALID_ATTACK_TARGET');
    expectEngineError(() => encounter(state, 100), 'UNKNOWN_ROOM');
  });
});

describe('Пустой жетон (стр. 18)', () => {
  it('возвращает шум и в закрытые Коридоры, и на техническое поле; не расходует первый Контакт', () => {
    const state = contactState();
    putPlayer(state, 'player-1', 14);
    forceToken(state, 'BLANK');
    for (const corridor of corridorsLeadingInto(state, 14)) {
      corridor.hasNoise = true;
      corridor.doorState = 'CLOSED';
    }
    state.ship.technicalCorridorNoise = true;
    encounter(state, 14);
    expect(corridorsLeadingInto(state, 14).every((corridor) => corridor.hasNoise)).toBe(true);
    expect(state.ship.technicalCorridorNoise).toBe(true);
    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.intrudersPool.firstEncounterOccurred).toBe(false);
    expect(state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
      firstEncounter: false,
      surpriseAttack: false,
    });
    expect(state.interruptQueue).toEqual([]);
  });

  it('добавляет настоящего Взрослого из запаса только если BLANK был последним', () => {
    const state = contactState();
    forceToken(state, 'BLANK');
    const adult = state.intrudersPool.supply.find((token) => token.type === 'ADULT')!;
    encounter(state);
    expect(state.intrudersPool.bag).toEqual([adult, { id: 'blank', type: 'BLANK', escapeNumber: 0 }]);
    expect(state.intrudersPool.supply.some((token) => token.id === adult.id)).toBe(false);
    expect(new Set([...state.intrudersPool.bag, ...state.intrudersPool.supply].map((token) => token.id)).size).toBe(27);
  });

  it('не придумывает Взрослого, когда доступных жетонов нет', () => {
    const state = contactState();
    forceToken(state, 'BLANK');
    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'ADULT');
    encounter(state);
    expect(state.intrudersPool.bag.map((token) => token.type)).toEqual(['BLANK']);
  });

  it('при непустом мешке не добавляет Взрослого; возвращённый BLANK не прилипает к вершине', () => {
    const state = contactState();
    const tokens = createIntruderSupply();
    setBag(state, [tokens.find((token) => token.type === 'BLANK')!, tokens.find((token) => token.type === 'ADULT')!]);
    const before = state.meta.rngDraws.bag;
    const draw = vi.spyOn(rng, 'drawFromStream').mockReturnValueOnce(0).mockReturnValueOnce(0);
    encounter(state);
    expect(state.intrudersPool.bag.map((token) => token.type)).toEqual(['ADULT', 'BLANK']);
    expect(state.intrudersPool.supply.filter((token) => token.type === 'ADULT')).toHaveLength(11);
    encounter(state);
    expect(state.intrudersPool.boardTokens[0]?.type).toBe('ADULT');
    expect(state.meta.rngDraws.bag).toBe(before + 2);
    expect(draw).toHaveBeenNthCalledWith(1, state.meta.seed, 'bag', before);
    expect(draw).toHaveBeenNthCalledWith(2, state.meta.seed, 'bag', before + 1);
    expect(
      state.gameLog.filter((entry) => entry.event.type === 'CONTACT_OCCURRED').map((entry) => entry.event),
    ).toMatchObject([{ firstEncounter: false }, { firstEncounter: true }]);
  });
});

describe('Первый настоящий Контакт и приватный выбор Цели (стр. 12)', () => {
  it('сначала даёт каждому выбрать Цель, затем продолжает Внезапную атаку', () => {
    const state = contactState(2);
    forceToken(state, 'ADULT', 4);
    state.players['player-1']!.actionDeck.hand = [];
    for (const player of Object.values(state.players)) {
      player.objectives = [
        { id: `${player.id}-personal-secret`, name: 'Личная', description: 'Закрытая', kind: 'PERSONAL' },
        { id: `${player.id}-corporate-secret`, name: 'Корпоративная', description: 'Закрытая', kind: 'CORPORATE' },
      ];
    }
    encounter(state);
    expect(state.interruptQueue.map((event) => event.type)).toEqual([
      'FIRST_CONTACT_OBJECTIVE_INTERRUPT',
      'FIRST_CONTACT_OBJECTIVE_INTERRUPT',
      'SURPRISE_ATTACK_INTERRUPT',
    ]);
    drainInterrupts(state);
    expect(state.pendingDecision).toMatchObject({ type: 'CHOOSE_OBJECTIVE', playerId: 'player-1' });
    expect(state.decks.intruderAttacks.discard).toEqual([]);
    expect(state.intrudersPool.firstEncounterOccurred).toBe(true);
  });

  it('не выдумывает Цели для текущей пустой колоды и не повторяет первый Контакт', () => {
    const state = contactState();
    forceToken(state, 'ADULT');
    encounter(state);
    forceToken(state, 'CREEPER');
    encounter(state);
    expect(state.pendingDecision).toBeNull();
    expect(state.interruptQueue).toEqual([]);
    expect(state.gameLog.filter((entry) => entry.event.type === 'FIRST_CONTACT')).toHaveLength(1);
  });
});
