import { describe, expect, it } from 'vitest';

import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import type { IntruderEntity, IntruderType } from '../types/entities.js';
import { rollCombatDie } from './combatDie.js';
import { filterStateForPlayer } from './sanitizer.js';
import { createInitialGameState } from './setup.js';

const SEED = 'intruder-data-integration-step-1';

describe('Контракт данных Чужих в партии', () => {
  it.each([1, 2, 3, 4, 5])('создаёт полную колоду при подготовке партии на %i игроков', (playerCount) => {
    const state = createInitialGameState(SEED, { playerCount });
    const pile = state.decks.intruderAttacks;

    expect(pile.drawPile).toHaveLength(20);
    expect(pile.discard).toEqual([]);
    expect(pile.drawPile.map((card) => card.id).sort()).toEqual(INTRUDER_ATTACK_CARDS.map((card) => card.id).sort());
    expect(state.meta.rngDraws.combat).toBe(0);
    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.interruptQueue).toEqual([]);
  });

  it('броски Боя не переставляют колоды, мешок, комнаты и не создают игровые события', () => {
    const state = createInitialGameState(SEED);
    const before = structuredClone(state);

    for (let draw = 0; draw < 12; draw++) rollCombatDie(state);

    expect(state).toEqual({
      ...before,
      meta: { ...before.meta, rngDraws: { ...before.meta.rngDraws, combat: 12 } },
    });
  });

  it('сохраняет существующий IntruderEntity с woundsCount в состоянии и публичном срезе', () => {
    const state = createInitialGameState(SEED);
    const types: IntruderType[] = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'];
    const entities: IntruderEntity[] = types.map((type, index) => ({
      id: `intruder-${index + 1}`,
      type,
      roomId: 11,
      woundsCount: index,
    }));
    state.intrudersPool.boardTokens = entities;
    state.ship.rooms[11]!.occupantIntruderIds = entities.map((entity) => entity.id);

    const view = filterStateForPlayer(state, 'player-1');

    expect(view.intrudersPool.boardTokens).toEqual(entities);
    expect(view.ship.rooms[11]!.occupantIntruderIds).toEqual(entities.map((entity) => entity.id));
    expect(JSON.parse(JSON.stringify(entities))).toEqual(entities);
  });
});

describe('Приватность колоды Атак Чужих (стр. 7, 20)', () => {
  it('передаёт всем игрокам только размер закрытой стопки, без карт и порядка', () => {
    const state = createInitialGameState(SEED, { playerCount: 3 });

    for (const playerId of Object.keys(state.players)) {
      const view = filterStateForPlayer(state, playerId);
      expect(view.decks.intruderAttacks).toEqual({ drawPileCount: 20, discard: [] });

      const serialized = JSON.stringify(view);
      for (const card of INTRUDER_ATTACK_CARDS) expect(serialized).not.toContain(card.id);
    }
  });

  it('скрывает перестановку закрытой колоды: одинаковое публичное состояние', () => {
    const state = createInitialGameState(SEED);
    const before = filterStateForPlayer(state, 'player-1');
    state.decks.intruderAttacks.drawPile.reverse();

    expect(filterStateForPlayer(state, 'player-1')).toEqual(before);
  });

  it('оставляет разыгранные карты в публичном сбросе, не раскрывая следующую карту', () => {
    const state = createInitialGameState(SEED, { playerCount: 2 });
    const pile = state.decks.intruderAttacks;
    const discarded = pile.drawPile.shift()!;
    pile.discard.push(discarded);
    const before = structuredClone(state);

    for (const playerId of Object.keys(state.players)) {
      const view = filterStateForPlayer(state, playerId);
      expect(view.decks.intruderAttacks).toEqual({ drawPileCount: 19, discard: [discarded] });
      expect(view.decks.intruderAttacks.discard[0]).not.toBe(discarded);
      expect(view.decks.intruderAttacks.discard[0]!.attackerTypes).not.toBe(discarded.attackerTypes);
      expect(JSON.stringify(view)).not.toContain(pile.drawPile[0]!.id);
      view.decks.intruderAttacks.discard[0]!.description = 'Клиент не меняет ядро';
    }

    expect(state).toEqual(before);
  });
});
