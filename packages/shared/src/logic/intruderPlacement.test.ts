import { describe, expect, it } from 'vitest';
import { INTRUDER_MINIATURE_LIMITS } from '../data/intruderMiniatures.js';
import {
  contactState,
  expectEngineError,
  existingIntruder,
  forceToken,
  putPlayer,
} from '../testing/contactFixtures.js';
import { resolveContact } from './contact.js';
import { placeIntruder, removeIntruder } from './intruderPlacement.js';
import { filterStateForPlayer } from './sanitizer.js';

describe('Миниатюры и жетоны — разные запасы (стр. 2, 15, 18)', () => {
  it('при лимите 8 взрослых снимает всех не находящихся в Бою, возвращая существующие жетоны', () => {
    const state = contactState(2);
    putPlayer(state, 'player-2', 2);
    forceToken(state, 'ADULT');
    const fighting = existingIntruder(state, 'ADULT', 2);
    const withdrawing = Array.from({ length: 7 }, () => existingIntruder(state, 'ADULT', 3));
    for (const intruder of state.intrudersPool.boardTokens) intruder.woundsCount = 3;
    const tokensBefore = [...state.intrudersPool.bag, ...state.intrudersPool.supply].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });
    expect(state.intrudersPool.boardTokens).toHaveLength(2);
    expect(state.ship.rooms[2]!.occupantIntruderIds).toEqual([fighting]);
    expect(state.intrudersPool.boardTokens.find((intruder) => intruder.id === fighting)?.woundsCount).toBe(3);
    expect(state.ship.rooms[3]!.occupantIntruderIds).toEqual([]);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(1);
    expect(state.intrudersPool.bag).toHaveLength(7);
    expect(
      [...state.intrudersPool.bag, ...state.intrudersPool.supply].sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(tokensBefore);
    expect(state.gameLog.find((entry) => entry.event.type === 'INTRUDERS_WITHDRAWN')?.event).toMatchObject({
      intruderIds: withdrawing,
    });
  });

  it.each(['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const)('не создаёт лишнюю миниатюру %s', (type) => {
    const state = contactState();
    for (let index = 0; index < INTRUDER_MINIATURE_LIMITS[type]; index++) existingIntruder(state, type);
    const before = structuredClone(state);
    expectEngineError(() => placeIntruder(state, type, 11), 'INTRUDER_MINIATURE_UNAVAILABLE');
    expect(state).toEqual(before);
  });

  it('учитывает Личинок на планшетах при лимите шести миниатюр', () => {
    const state = contactState(5);
    for (const player of Object.values(state.players)) player.hasLarva = true;
    existingIntruder(state, 'LARVA');
    expectEngineError(() => placeIntruder(state, 'LARVA', 11), 'INTRUDER_MINIATURE_UNAVAILABLE');
  });

  it('не синтезирует жетон при возвращении миниатюры, если подходящих жетонов в запасе нет', () => {
    const state = contactState();
    for (let index = 0; index < 8; index++) existingIntruder(state, 'ADULT', 2);
    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'ADULT');
    const bagBefore = structuredClone(state.intrudersPool.bag);
    placeIntruder(state, 'ADULT', 11);
    expect(state.intrudersPool.boardTokens).toHaveLength(1);
    expect(state.intrudersPool.bag).toEqual(bagBefore);
  });

  it('генерирует новые ID без повторного использования удалённой особи и очищает подавление атак', () => {
    const state = contactState();
    const first = existingIntruder(state, 'CREEPER');
    state.intrudersPool.attackSuppression[first] = { round: 1, phase: 'PLAYER_PHASE' };
    removeIntruder(state, first);
    const second = existingIntruder(state, 'CREEPER');
    expect(second).not.toBe(first);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([second]);
    expect(state.intrudersPool.attackSuppression[first]).toBeUndefined();
  });

  it('миниатюра в невскрытой комнате публична, но свойства тайла не раскрываются (стр. 15)', () => {
    const state = contactState();
    state.ship.rooms[2]!.isExplored = false;
    const id = existingIntruder(state, 'ADULT', 2);
    const view = filterStateForPlayer(state, 'player-1');
    expect(view.ship.rooms[2]!.occupantIntruderIds).toEqual([id]);
    expect(view.ship.rooms[2]!.definitionId).toBeNull();
    expect(view.ship.rooms[2]!.itemsCount).toBeNull();
    expect(view.intrudersPool.boardTokens).toMatchObject([{ id, type: 'ADULT', roomId: 2 }]);
  });
});
