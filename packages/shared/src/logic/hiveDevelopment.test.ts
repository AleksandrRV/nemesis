import { describe, expect, it } from 'vitest';
import type { IntruderToken } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { drainInterrupts } from './interrupts.js';
import { HIVE_EGG_CAPACITY, resolveHiveDevelopment } from './hiveDevelopment.js';
import { createInitialGameState } from './setup.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

function token(type: IntruderToken['type'], id: string): IntruderToken {
  return { id, type, escapeNumber: type === 'ADULT' ? 2 : 1 };
}

/** Мешок Пула Чужих из единственного жетона — вытянется гарантированно он. */
function singleTokenBag(state: GameState, type: IntruderToken['type']): void {
  state.intrudersPool.bag = [token(type, `drawn-${type.toLowerCase()}`)];
}

function hiveOutcome(state: GameState) {
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === 'HIVE_DEVELOPMENT_RESOLVED');
  if (!entry || entry.event.type !== 'HIVE_DEVELOPMENT_RESOLVED') {
    throw new Error('HIVE_DEVELOPMENT_RESOLVED не в журнале');
  }
  return entry.event;
}

describe('Шаг 8 Фазы Событий: Развитие Улья (стр. 10, шаг 8; стр. 31)', () => {
  it('Личинка удаляется из Пула, в мешок приходит жетон Взрослой Особи', () => {
    const state = freshState('hive-larva');
    singleTokenBag(state, 'LARVA');
    const adultsInSupply = state.intrudersPool.supply.filter((t) => t.type === 'ADULT').length;

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.tokenType).toBe('LARVA');
    expect(entry.outcome).toEqual({ kind: 'LARVA', adultAdded: true });
    // Жетон Личинки «в коробку»: вытянутого жетона нет ни в мешке, ни в запасе.
    expect(state.intrudersPool.bag.map((t) => t.type)).toEqual(['ADULT']);
    expect(state.intrudersPool.supply.map((t) => t.id)).not.toContain('drawn-larva');
    expect(state.intrudersPool.supply.filter((t) => t.type === 'ADULT')).toHaveLength(adultsInSupply - 1);
  });

  it('Крипер удаляется из Пула, в мешок приходит жетон Трутня', () => {
    const state = freshState('hive-creeper');
    singleTokenBag(state, 'CREEPER');

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.tokenType).toBe('CREEPER');
    expect(entry.outcome).toEqual({ kind: 'CREEPER', breederAdded: true });
    expect(state.intrudersPool.bag.map((t) => t.type)).toEqual(['BREEDER']);
    expect(state.intrudersPool.supply.map((t) => t.id)).not.toContain('drawn-creeper');
  });

  it('Взрослая Особь: Персонажи вне Боя бросают кубик Шума по очереди ходов', () => {
    const state = freshState('dump2', 2);
    singleTokenBag(state, 'ADULT');
    const drawnId = state.intrudersPool.bag[0]!.id;

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.outcome).toEqual({ kind: 'ADULT', rolledPlayerIds: ['player-1', 'player-2'] });
    expect(state.intrudersPool.bag.map((t) => t.id)).toContain(drawnId); // жетон вернулся в мешок
    expect(state.interruptQueue).toEqual([
      { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 11, noise: { kind: 'ROLL' } },
      { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-2', roomId: 11, noise: { kind: 'ROLL' } },
    ]);
  });

  it('Персонажи в Бою игнорируют бросок Шума', () => {
    const state = freshState('dump2', 2); // оба Персонажа в отсеке 11
    putIntruder(state, 'ADULT', 11); // теперь оба в Бою
    singleTokenBag(state, 'BREEDER');

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.tokenType).toBe('BREEDER');
    expect(entry.outcome).toEqual({ kind: 'BREEDER', rolledPlayerIds: [] });
    expect(state.interruptQueue).toHaveLength(0);
    expect(state.intrudersPool.bag.map((t) => t.type)).toEqual(['BREEDER']);
  });

  it('каскад: брошенный Шум разыгрывается движком до конца', () => {
    const state = freshState('hive-cascade');
    singleTokenBag(state, 'ADULT');

    resolveHiveDevelopment(state);
    drainInterrupts(state);

    expect(state.gameLog.some((entry) => entry.event.type === 'NOISE_ROLLED')).toBe(true);
    // Запрошенный бросок исполнен; очередь может удерживать лишь каскад Контакта.
    expect(state.interruptQueue.every((interrupt) => interrupt.type !== 'NOISE_ROLL_INTERRUPT')).toBe(true);
  });

  it('Королева при Персонаже в Улье: миниатюра и немедленный Контакт', () => {
    const state = freshState('dump'); // seed 'dump': Улей — комната 3
    putPlayer(state, 'player-1', 3);
    singleTokenBag(state, 'QUEEN');
    const eggsBefore = state.intrudersPool.eggsOnBoard;

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.outcome).toMatchObject({ kind: 'QUEEN', queenPlaced: true, contactPlayerIds: ['player-1'] });
    const outcome = entry.outcome;
    if (outcome.kind !== 'QUEEN') throw new Error('Ожидался итог Королевы');
    expect(state.ship.rooms[3]!.occupantIntruderIds).toEqual([outcome.intruderId]);
    const queen = state.intrudersPool.boardTokens.find((t) => t.id === outcome.intruderId);
    expect(queen).toMatchObject({ type: 'QUEEN', roomId: 3 });
    expect(state.interruptQueue).toEqual([
      { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 3, source: 'EVENT' },
    ]);
    expect(state.intrudersPool.eggsOnBoard).toBe(eggsBefore);
    expect(state.intrudersPool.bag.map((t) => t.type)).toEqual(['QUEEN']);
  });

  it('Королева без Персонажей в Улье: Яйцо на Планшет Чужих', () => {
    const state = freshState('dump');
    singleTokenBag(state, 'QUEEN');

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.outcome).toEqual({
      kind: 'QUEEN',
      queenPlaced: false,
      intruderId: null,
      contactPlayerIds: [],
      eggAdded: true,
    });
    expect(state.intrudersPool.eggsOnBoard).toBe(6);
    expect(state.intrudersPool.boardTokens).toHaveLength(0);
    expect(state.interruptQueue).toHaveLength(0);
  });

  it('Планшет Чужих вмещает не более 8 Яиц', () => {
    const state = freshState('dump');
    state.intrudersPool.eggsOnBoard = HIVE_EGG_CAPACITY;
    singleTokenBag(state, 'QUEEN');

    resolveHiveDevelopment(state);

    expect(hiveOutcome(state).outcome).toEqual({
      kind: 'QUEEN',
      queenPlaced: false,
      intruderId: null,
      contactPlayerIds: [],
      eggAdded: false,
    });
    expect(state.intrudersPool.eggsOnBoard).toBe(HIVE_EGG_CAPACITY);
  });

  it('Пустой жетон добавляет Взрослую Особь и возвращается в мешок', () => {
    const state = freshState('hive-blank');
    singleTokenBag(state, 'BLANK');

    resolveHiveDevelopment(state);

    const entry = hiveOutcome(state);
    expect(entry.tokenType).toBe('BLANK');
    expect(entry.outcome).toEqual({ kind: 'BLANK', adultAdded: true });
    expect(state.intrudersPool.bag.map((t) => t.type).sort()).toEqual(['ADULT', 'BLANK']);
  });

  it('пустой мешок честно пропускается журналом', () => {
    const state = freshState('hive-empty');
    state.intrudersPool.bag = [];

    resolveHiveDevelopment(state);

    const entry = state.gameLog.find((candidate) => candidate.event.type === 'HIVE_DEVELOPMENT_SKIPPED');
    expect(entry).toBeDefined();
    expect(entry!.event.type === 'HIVE_DEVELOPMENT_SKIPPED' && entry!.event.reason).toBe('EMPTY_BAG');
    expect(state.gameLog.some((candidate) => candidate.event.type === 'HIVE_DEVELOPMENT_RESOLVED')).toBe(false);
  });

  it('вытягивание детерминировано сидом: два вызова с одним мешком дают один результат', () => {
    const first = freshState('hive-det');
    const second = freshState('hive-det');
    const mixed: IntruderToken[] = [token('ADULT', 'a'), token('LARVA', 'l'), token('QUEEN', 'q')];
    first.intrudersPool.bag = structuredClone(mixed);
    second.intrudersPool.bag = structuredClone(mixed);

    resolveHiveDevelopment(first);
    resolveHiveDevelopment(second);

    expect(hiveOutcome(first).tokenType).toBe(hiveOutcome(second).tokenType);
  });
});
