import { describe, expect, it } from 'vitest';

import { CHARACTERS, MAX_PLAYER_COUNT, WEAKNESS_SLOT_OBJECT_KINDS } from '@nemesis/shared';
import { createInitialGameState, explorationTokenAt } from './initialState';

describe('createInitialGameState: состав партии по числу игроков', () => {
  it.each([1, 2, 3, 4, 5])('создаёт по персонажу на каждого игрока (партия на %i)', (playerCount) => {
    const state = createInitialGameState('nemesis-alpha', { playerCount });
    const players = Object.values(state.players);

    expect(players).toHaveLength(playerCount);
    expect(state.ship.rooms[11]?.occupantPlayerIds).toHaveLength(playerCount);

    for (const [index, player] of players.entries()) {
      expect(player.id).toBe(`player-${index + 1}`);
      expect(player.orderNumber).toBe(index + 1);
      expect(player.roomId).toBe(11);
      expect(player.characterClass).toBe(CHARACTERS[index]?.characterClass);
      expect(player.name).toBe(CHARACTERS[index]?.name);
    }
  });

  it('берёт персонажей из пресетов базовой игры без повторов', () => {
    const state = createInitialGameState('nemesis-alpha', { playerCount: MAX_PLAYER_COUNT });
    const classes = Object.values(state.players).map((player) => player.characterClass);

    expect(new Set(classes).size).toBe(classes.length);
  });

  it('называет режим партии: Соло на одного игрока, полукооператив на остальных (стр. 27)', () => {
    expect(createInitialGameState('nemesis-alpha').meta.gameMode).toBe('SOLO');

    for (const playerCount of [2, 3, 4, 5]) {
      expect(createInitialGameState('nemesis-alpha', { playerCount }).meta.gameMode).toBe('SEMI_COOP');
    }
  });

  it('ведёт активным и первым игроком первого персонажа', () => {
    const state = createInitialGameState('nemesis-alpha', { playerCount: 4 });

    expect(state.meta.activePlayerId).toBe('player-1');
    expect(state.meta.firstPlayerId).toBe('player-1');
  });

  it('начинает одиночную партию Капитаном — так же, как до появления пресетов', () => {
    const player = createInitialGameState('nemesis-alpha').players['player-1'];

    expect(player?.characterClass).toBe('CAPTAIN');
    expect(player?.name).toBe('Капитан');
  });

  it.each([0, -1, 2.5, MAX_PLAYER_COUNT + 1, Number.NaN])(
    'отказывается собирать партию на %s игроков',
    (playerCount) => {
      expect(() => createInitialGameState('nemesis-alpha', { playerCount })).toThrow(/число игроков/i);
    },
  );

  it('кладёт по Взрослой Особи в мешок за каждого игрока (стр. 6, шаг 10)', () => {
    for (const playerCount of [1, 2, 3, 4, 5]) {
      const bag = createInitialGameState('nemesis-alpha', { playerCount }).intrudersPool.bag;
      const adults = bag.filter((token) => token.type === 'ADULT');

      expect(adults).toHaveLength(3 + playerCount);
    }
  });
});

describe('createInitialGameState: Планшет Чужих', () => {
  it('начинает партию без убитых Чужих и без Чужих на поле (стр. 6, шаг 10)', () => {
    const pool = createInitialGameState('nemesis-alpha').intrudersPool;

    expect(pool.boardTokens).toEqual([]);
    expect(pool.deadTokens).toEqual([]);
  });

  it('создаёт по слоту Слабости на каждый тип Объекта (стр. 6, шаг 9; стр. 21)', () => {
    const slots = createInitialGameState('nemesis-alpha').intrudersPool.weaknessSlots;

    expect(slots).toHaveLength(3);
    expect(slots.map((slot) => slot.objectKind)).toEqual([...WEAKNESS_SLOT_OBJECT_KINDS]);
    expect(new Set(slots.map((slot) => slot.objectKind)).size).toBe(3);
  });

  it('оставляет слоты Слабостей пустыми до появления данных о картах', () => {
    const slots = createInitialGameState('nemesis-alpha').intrudersPool.weaknessSlots;

    expect(slots.every((slot) => slot.card === null)).toBe(true);
  });
});

describe('createInitialGameState: жетоны Исследования', () => {
  it('отдаёт жетон по его номеру раздачи', () => {
    const pool = [
      { itemsCount: 4, effect: 'FIRE' as const },
      { itemsCount: 1, effect: 'SLIME' as const },
    ];

    expect(explorationTokenAt(pool, 0)).toBe(pool[0]);
    expect(explorationTokenAt(pool, 1)).toBe(pool[1]);
  });

  it('падает с понятной ошибкой, если жетонов не хватило (стр. 6, шаг 4)', () => {
    expect(() => explorationTokenAt([], 0)).toThrow(/Исследования/);
    expect(() => explorationTokenAt([{ itemsCount: 2, effect: 'DOORS' }], 1)).toThrow(/№2/);
  });
});
