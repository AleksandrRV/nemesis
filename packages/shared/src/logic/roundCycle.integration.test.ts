/**
 * Сквозная интеграция замкнутого цикла раунда (Шаг 9 этапа 0.5.0).
 *
 * Проверяет полный круг: Фаза Игроков → Всеобщий пас → Фаза Событий
 * (время, атаки, огонь, карта Событий, Улей) → Новый раунд — через
 * единственный публичный вход движка `GameEngine.processAction`, без
 * прямого вызова внутренних функций Фазы Событий. Дополнительно:
 * целостность узла Технических Коридоров после цикла и защита закрытых
 * данных Санитайзером на снимке, прошедшем Фазу Событий.
 */
import { describe, expect, it } from 'vitest';

import { EVENT_CARDS } from '../data/eventCards.js';
import { putIntruder } from '../testing/contactFixtures.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { filterStateForPlayer } from './sanitizer.js';
import { createInitialGameState } from './setup.js';

function passActivePlayer(engine: GameEngine, state: GameState): GameState {
  return engine.processAction(state, { type: 'ACTION_PASS', payload: {} });
}

/** ES2022 без findLast: ищем с конца вручную. */
function lastEntryOfType(state: GameState, type: string) {
  for (let index = state.gameLog.length - 1; index >= 0; index -= 1) {
    const entry = state.gameLog[index];
    if (entry && entry.event.type === type) return entry;
  }
  return undefined;
}

/**
 * Проводит партию через один замкнутый цикл: пасует каждого живого игрока
 * до начала следующего раунда. Фаза Событий исполняется синхронно внутри
 * последнего паса (`advanceTurn`), поэтому результат — уже новый раунд.
 */
function playUntilNextRound(engine: GameEngine, state: GameState): GameState {
  const startRound = state.meta.currentRound;
  let current = state;
  for (let guard = 0; guard < 24; guard += 1) {
    if (current.meta.currentRound > startRound) return current;
    expect(current.pendingDecision).toBeNull();
    current = passActivePlayer(engine, current);
  }
  throw new Error('Замкнутый цикл не сошёлся: раунд не сменился за 24 паса');
}

describe('Замкнутый цикл раунда: Фаза Игроков → Всеобщий пас → Фаза Событий → Новый раунд', () => {
  it('полный пас двоих игроков исполняет Фазу Событий и начинает раунд 2', () => {
    const engine = new GameEngine();
    const initial = createInitialGameState('round-cycle-integration', { playerCount: 2 });
    expect(initial.meta.phase).toBe('PLAYER_PHASE');
    expect(initial.meta.currentRound).toBe(1);
    const firstPlayerId = initial.meta.firstPlayerId;

    const afterRound = playUntilNextRound(engine, initial);

    // Цикл сошёлся: партия снова в Фазе Игроков нового раунда.
    expect(afterRound.meta.phase).toBe('PLAYER_PHASE');
    expect(afterRound.meta.currentRound).toBe(2);
    // Жетон Первого Игрока передан по часовой стрелке, флаги паса сброшены.
    expect(afterRound.meta.firstPlayerId).not.toBe(firstPlayerId);
    expect(afterRound.meta.activePlayerId).toBe(afterRound.meta.firstPlayerId);
    for (const player of Object.values(afterRound.players)) {
      expect(player.hasPassed).toBe(false);
      expect(player.actionsPerformedThisRound).toBe(0);
    }
  });

  it('журнал Фазы Событий фиксирует шаги в порядке движка: время → атаки → огонь → карта → Улей → новый раунд', () => {
    const engine = new GameEngine();
    const afterRound = playUntilNextRound(
      new GameEngine(),
      createInitialGameState('round-cycle-log-order', { playerCount: 2 }),
    );
    void engine;

    const kinds = afterRound.gameLog.map((entry) => entry.event.type);
    const timeIndex = kinds.indexOf('TIME_TRACK_ADVANCED');
    const roundIndex = kinds.indexOf('ROUND_STARTED');

    expect(timeIndex).toBeGreaterThan(-1);
    expect(roundIndex).toBeGreaterThan(timeIndex);
    // Карта Событий разыграна внутри окна Фазы.
    const cardDrawnIndex = kinds.indexOf('EVENT_CARD_DRAWN');
    expect(cardDrawnIndex).toBeGreaterThan(timeIndex);
    expect(cardDrawnIndex).toBeLessThan(roundIndex);
    // Развитие Улья исполнено либо честно пропущено — оба исхода в окне Фазы.
    const hiveIndex = Math.max(kinds.indexOf('HIVE_DEVELOPMENT_RESOLVED'), kinds.indexOf('HIVE_DEVELOPMENT_SKIPPED'));
    expect(hiveIndex).toBeGreaterThan(timeIndex);
    expect(hiveIndex).toBeLessThan(roundIndex);
    // Новое окно открыто записью начала раунда 2.
    const roundEvent = afterRound.gameLog[roundIndex]!.event;
    expect(roundEvent).toMatchObject({ type: 'ROUND_STARTED', round: 2 });
    // Счётчик Времени сдвинут ровно на одно деление.
    const timeEvent = afterRound.gameLog[timeIndex]!.event;
    expect(timeEvent).toMatchObject({ type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1 });
  });

  it('три замкнутых цикла подряд: раунды 2, 3 и 4, счётчик Времени движется монотонно', () => {
    const engine = new GameEngine();
    let state = createInitialGameState('round-cycle-three', { playerCount: 2 });

    const timePositions: number[] = [];
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const expectedRound = cycle + 2;
      state = playUntilNextRound(engine, state);
      expect(state.meta.currentRound).toBe(expectedRound);
      expect(state.meta.phase).toBe('PLAYER_PHASE');

      const timeEntry = lastEntryOfType(state, 'TIME_TRACK_ADVANCED');
      expect(timeEntry).toBeDefined();
      if (timeEntry && timeEntry.event.type === 'TIME_TRACK_ADVANCED') {
        expect(timeEntry.event.round).toBe(expectedRound - 1);
        timePositions.push(timeEntry.event.timeTrackPosition);
      }
      // Руки всех игроков пополнены до лимита к началу нового раунда.
      for (const player of Object.values(state.players)) {
        expect(player.actionDeck.hand.length).toBeGreaterThanOrEqual(5);
      }
    }

    expect(timePositions).toEqual([1, 2, 3]);
    // За три Фазы Событий партия не застряла: розыгрыш трёх карт Событий записан.
    const drawn = state.gameLog.filter((entry) => entry.event.type === 'EVENT_CARD_DRAWN');
    expect(drawn).toHaveLength(3);
  });

  it('повторный пас уже спасовавшего игрока отклоняется движком', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('round-cycle-double-pass', { playerCount: 2 });
    const activePlayer = state.players[state.meta.activePlayerId]!;
    activePlayer.hasPassed = true; // имитация: игрок уже спасовал ранее

    expect(() => passActivePlayer(engine, state)).toThrowError(/уже спасовал/);
  });
});

describe('Целостность узла Технических Коридоров после замкнутого цикла', () => {
  it('входы вентиляции сохраняются у тех же отсеков после Фазы Событий', () => {
    const engine = new GameEngine();
    const before = createInitialGameState('round-cycle-tech-integrity', { playerCount: 2 });
    const ventRoomIdsBefore = Object.values(before.ship.rooms)
      .filter((room) => room.hasTechnicalCorridorEntrance)
      .map((room) => room.id)
      .sort((a, b) => a - b);
    expect(ventRoomIdsBefore).toEqual([2, 4, 5, 9, 14, 15, 19, 21]);

    const afterRound = playUntilNextRound(engine, before);

    const ventRoomIdsAfter = Object.values(afterRound.ship.rooms)
      .filter((room) => room.hasTechnicalCorridorEntrance)
      .map((room) => room.id)
      .sort((a, b) => a - b);
    expect(ventRoomIdsAfter).toEqual(ventRoomIdsBefore);
  });

  it('отступление по стрелке в вентиляцию: фигурка покидает поле и возвращается в мешок', () => {
    const state = createInitialGameState('round-cycle-tech-retreat', { playerCount: 1 });
    // Отсек 5 несёт единственный выход с номером 4: стрелка 4 ведёт в Технические Коридоры.
    const intruderId = putIntruder(state, 'ADULT', 5);
    const cards = structuredClone(EVENT_CARDS);
    const topCard = cards.find((card) => card.id === 'EVT_SHORT_CIRCUIT')!;
    state.decks.events = { drawPile: [topCard, ...cards.filter((card) => card.id !== topCard.id)], discard: [] };

    const adultCountInBag = (pool: GameState['intrudersPool']) =>
      pool.bag.filter((token) => token.type === 'ADULT').length;
    const adultsInBagBefore = adultCountInBag(state.intrudersPool);

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record.outcome).toBe('TECHNICAL_CORRIDORS');
    expect(state.intrudersPool.boardTokens.some((token) => token.id === intruderId)).toBe(false);
    // Узел цел: токен вернулся в мешок, а не исчез из экономики Улья.
    expect(adultCountInBag(state.intrudersPool)).toBe(adultsInBagBefore + 1);
    const retreatEntry = lastEntryOfType(state, 'INTRUDER_RETREATED');
    expect(retreatEntry?.event).toMatchObject({
      type: 'INTRUDER_RETREATED',
      intruderId,
      intruderType: 'ADULT',
      retreat: { outcome: 'TECHNICAL_CORRIDORS', toRoomId: null },
    });
  });
});

describe('Санитайзер после Фазы Событий: закрытые данные не утекают в снимок', () => {
  it('порядок колоды Событий и чужие цели скрыты от просматривающего игрока', () => {
    const engine = new GameEngine();
    let state = createInitialGameState('round-cycle-sanitizer', { playerCount: 2 });
    state = playUntilNextRound(engine, state);

    const view = filterStateForPlayer(state, 'player-1');
    const serialized = JSON.stringify(view);

    // Колода Событий в снимке — только счётчик и открытый сброс.
    expect(view.decks.events).toHaveProperty('drawPileCount');
    expect(view.decks.events).not.toHaveProperty('drawPile');
    // Ни одна карта, ещё не вытянутая из колоды Событий, не видна в снимке.
    for (const hiddenCard of state.decks.events.drawPile) {
      expect(serialized).not.toContain(hiddenCard.id);
    }
    // Колода Заражения полностью скрыта: ни одной карты Заражения в снимке.
    for (const hiddenCard of state.decks.contamination.drawPile) {
      expect(serialized).not.toContain(hiddenCard.id);
    }
    // Личные и корпоративные Цели других игроков не раскрываются.
    const viewerObjectiveIds = new Set((state.players['player-1']?.objectives ?? []).map((card) => card.id));
    for (const player of Object.values(state.players)) {
      for (const objective of player.objectives) {
        if (viewerObjectiveIds.has(objective.id)) continue;
        expect(serialized).not.toContain(objective.id);
      }
    }
  });

  it('решение, ожидающее другого игрока, скрыто от наблюдающего', () => {
    const state = createInitialGameState('round-cycle-sanitizer-decision', { playerCount: 2 });
    state.pendingDecision = {
      id: 'decision-hidden',
      playerId: 'player-2',
      type: 'CHOOSE_OBJECTIVE',
      objectiveIds: ['OBJ_1', 'OBJ_2'],
    };

    const view = filterStateForPlayer(state, 'player-1');

    expect(view.pendingDecision).toBeNull();
    expect(view.pendingDecisionPlayerId).toBe('player-2');
  });
});
