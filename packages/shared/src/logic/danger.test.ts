import { describe, expect, it } from 'vitest';
import { contactState, existingIntruder, putPlayer } from '../testing/contactFixtures.js';
import { resolveInterrupt } from './interrupts.js';
import { corridorsLeadingInto } from './shipGraphQueries.js';
import type { GameState } from '../types/state.js';

function danger(state: GameState): void {
  putPlayer(state, 'player-1', 14);
  state.ship.rooms[14]!.explorationEffect = 'DANGER';
  resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 14, noise: { kind: 'ROLL' } });
}

describe('Опасность после появления Чужих (стр. 15, 17)', () => {
  it('не вытягивает жетон и не атакует при перемещении уже существующих особей', () => {
    const state = contactState();
    const first = existingIntruder(state, 'ADULT', 13);
    const second = existingIntruder(state, 'CREEPER', 13);
    const before = { ...state.meta.rngDraws };
    danger(state);
    expect(state.ship.rooms[14]!.occupantIntruderIds).toEqual([first, second]);
    expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual([]);
    expect(state.meta.rngDraws).toEqual(before);
    expect(
      state.gameLog.some(
        (entry) => entry.event.type === 'CONTACT_OCCURRED' || entry.event.type === 'SURPRISE_ATTACK_RESOLVED',
      ),
    ).toBe(false);
  });

  it('не уводит Чужих из Боя; вместо этого заполняет свободные Коридоры Шумом', () => {
    const state = contactState(2);
    putPlayer(state, 'player-2', 13);
    const id = existingIntruder(state, 'ADULT', 13);
    danger(state);
    expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual([id]);
    expect(state.ship.rooms[14]!.occupantIntruderIds).toEqual([]);
    expect(corridorsLeadingInto(state, 14).every((corridor) => corridor.hasNoise)).toBe(true);
    expect(state.ship.technicalCorridorNoise).toBe(true);
    expect(state.interruptQueue).toEqual([]);
  });

  it('группа перед закрытой Дверью разрушает её и целиком остаётся в исходном отсеке', () => {
    const state = contactState();
    const ids = [existingIntruder(state, 'ADULT', 13), existingIntruder(state, 'CREEPER', 13)];
    const path = corridorsLeadingInto(state, 14).find(
      (corridor) => corridor.fromRoomId === 13 || corridor.toRoomId === 13,
    )!;
    path.doorState = 'CLOSED';
    danger(state);
    expect(path.doorState).toBe('DESTROYED');
    expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual(ids);
    expect(state.ship.rooms[14]!.occupantIntruderIds).toEqual([]);
    expect(corridorsLeadingInto(state, 14).every((corridor) => !corridor.hasNoise)).toBe(true);
    danger(state);
    expect(state.ship.rooms[14]!.occupantIntruderIds).toEqual(ids);
    expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual([]);
  });

  it('уже заполненные Коридоры при Опасности не создают Контакт (FAQ Rules 4)', () => {
    const state = contactState();
    for (const corridor of corridorsLeadingInto(state, 14)) corridor.hasNoise = true;
    state.ship.technicalCorridorNoise = true;
    const before = state.meta.rngDraws.bag;
    danger(state);
    expect(state.interruptQueue).toEqual([]);
    expect(state.meta.rngDraws.bag).toBe(before);
  });

  it.each(['DANGER', 'SILENCE'] as const)(
    'Осторожное движение заменяет автоматический результат %s одним выбранным маркером (FAQ Actions 11)',
    (effect) => {
      const state = contactState();
      putPlayer(state, 'player-1', 14);
      state.ship.rooms[14]!.explorationEffect = effect;
      state.players['player-1']!.hasSlime = true;
      const id = existingIntruder(state, 'ADULT', 13);
      const chosen = corridorsLeadingInto(state, 14)[0]!;
      resolveInterrupt(state, {
        type: 'NOISE_ROLL_INTERRUPT',
        playerId: 'player-1',
        roomId: 14,
        noise: { kind: 'CAREFUL', chosen: { kind: 'CORRIDOR', corridorId: chosen.id } },
      });
      expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual([id]);
      expect(
        Object.values(state.ship.corridors)
          .filter((corridor) => corridor.hasNoise)
          .map((corridor) => corridor.id),
      ).toEqual([chosen.id]);
      expect(state.ship.technicalCorridorNoise).toBe(false);
      expect(state.meta.rngDraws.noise).toBe(0);
    },
  );
});
