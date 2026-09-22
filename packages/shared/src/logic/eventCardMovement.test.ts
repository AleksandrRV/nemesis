import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { GameState } from '../types/state.js';
import { isPlayerInCombat } from './combatStatus.js';
import { resolveEventCardMovement } from './eventCardMovement.js';
import { createInitialGameState } from './setup.js';
import { putIntruder } from '../testing/contactFixtures.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

/** Верх колоды Событий — одна конкретная карта. */
function eventDeckTop(state: GameState, cardId: string): void {
  const cards = structuredClone(EVENT_CARDS);
  const first = cards.find((card) => card.id === cardId)!;
  state.decks.events = { drawPile: [first, ...cards.filter((card) => card.id !== cardId)], discard: [] };
}

function movedEvents(state: GameState) {
  return state.gameLog.flatMap((entry) => (entry.event.type === 'INTRUDER_MOVED' ? [entry.event] : []));
}

function drawnEvent(state: GameState) {
  const entry = state.gameLog.find((candidate) => candidate.event.type === 'EVENT_CARD_DRAWN');
  if (!entry || entry.event.type !== 'EVENT_CARD_DRAWN') throw new Error('EVENT_CARD_DRAWN не в журнале');
  return entry.event;
}

describe('Шаг 7а Фазы Событий: Движение Чужих по карте События (стр. 10, 15)', () => {
  it('верхняя карта вытягивается лицом вверх и уходит в сброс', () => {
    const state = freshState('move-draw');
    eventDeckTop(state, 'EVT_HUNT_2');

    resolveEventCardMovement(state);

    expect(drawnEvent(state).card.id).toBe('EVT_HUNT_2');
    expect(state.decks.events.discard.map((card) => card.id)).toEqual(['EVT_HUNT_2']);
    expect(state.decks.events.drawPile).toHaveLength(19);
  });

  it('символы карты выбирают типы: Взрослая двигается, Крипер — нет', () => {
    const state = freshState('move-symbols');
    const adultId = putIntruder(state, 'ADULT', 12);
    const creeperId = putIntruder(state, 'CREEPER', 12);
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3, только крупные виды

    resolveEventCardMovement(state);

    expect(state.intrudersPool.boardTokens.find((token) => token.id === adultId)!.roomId).toBe(16);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === creeperId)!.roomId).toBe(12);
    expect(movedEvents(state)).toHaveLength(1);
  });

  it('Чужие в Бою (отсек с Персонажем) не перемещаются', () => {
    const state = freshState('move-combat');
    putIntruder(state, 'ADULT', 11); // player-1 в отсеке 11
    const freeId = putIntruder(state, 'ADULT', 12);
    eventDeckTop(state, 'EVT_HUNT_2');

    resolveEventCardMovement(state);

    const events = movedEvents(state);
    expect(events).toHaveLength(1);
    expect(events[0]!.intruderId).toBe(freeId);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(1);
  });

  it('Закрытая Дверь разрушается сообща: все идущие в неё остаются', () => {
    const state = freshState('move-door');
    const fromTwelve = putIntruder(state, 'ADULT', 12);
    const fromSixteen = putIntruder(state, 'ADULT', 16);
    state.ship.corridors['12-16']!.doorState = 'CLOSED';
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3: из обоих отсеков это «12-16»

    resolveEventCardMovement(state);

    expect(state.ship.corridors['12-16']!.doorState).toBe('DESTROYED');
    expect(movedEvents(state)).toHaveLength(0);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === fromTwelve)!.roomId).toBe(12);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === fromSixteen)!.roomId).toBe(16);
    const blocked = state.gameLog.find((entry) => entry.event.type === 'INTRUDERS_BLOCKED_BY_DOOR');
    expect(blocked?.event).toMatchObject({
      type: 'INTRUDERS_BLOCKED_BY_DOOR',
      corridorId: '12-16',
      source: 'EVENT_PHASE',
      intruderIds: [fromTwelve, fromSixteen],
    });
  });

  it('открытый Коридор: переход фиксирует особь, отсеки и номер карты', () => {
    const state = freshState('move-open');
    const adultId = putIntruder(state, 'ADULT', 12);
    eventDeckTop(state, 'EVT_HUNT_2');

    resolveEventCardMovement(state);

    expect(state.ship.rooms[12]!.occupantIntruderIds).toHaveLength(0);
    expect(state.ship.rooms[16]!.occupantIntruderIds).toEqual([adultId]);
    expect(movedEvents(state)[0]).toMatchObject({
      intruderId: adultId,
      intruderType: 'ADULT',
      fromRoomId: 12,
      toRoomId: 16,
      corridorId: '12-16',
      corridorNumber: 3,
      technicalCorridors: false,
    });
  });

  it('Вход в Технические Коридоры снимает миниатюру и сбрасывает Раны', () => {
    const state = freshState('move-tech');
    const adultId = putIntruder(state, 'ADULT', 5);
    state.intrudersPool.boardTokens.find((token) => token.id === adultId)!.woundsCount = 2;
    const adultsInBagBefore = state.intrudersPool.bag.filter((token) => token.type === 'ADULT').length;
    eventDeckTop(state, 'EVT_HIDDEN'); // Коридор 4: у отсека 5 это вход вентиляции

    resolveEventCardMovement(state);

    expect(state.intrudersPool.boardTokens.find((token) => token.id === adultId)).toBeUndefined();
    expect(state.ship.rooms[5]!.occupantIntruderIds).toHaveLength(0);
    // Жетон спрятавшегося Чужого возвращается в мешок Пула Чужих (стр. 18).
    expect(state.intrudersPool.bag.filter((token) => token.type === 'ADULT')).toHaveLength(adultsInBagBefore + 1);
    expect(movedEvents(state)[0]).toMatchObject({
      intruderId: adultId,
      fromRoomId: 5,
      toRoomId: null,
      corridorId: null,
      corridorNumber: 4,
      technicalCorridors: true,
    });
  });

  it('нет выхода с номером карты: Чужой остаётся на месте', () => {
    const state = freshState('move-unmapped');
    state.players['player-1']!.roomId = 12;
    const adultId = putIntruder(state, 'ADULT', 11);
    delete state.ship.corridors['8-11']; // номер 3 отсека 11 исчез
    eventDeckTop(state, 'EVT_HUNT_2');

    resolveEventCardMovement(state);

    expect(state.intrudersPool.boardTokens.find((token) => token.id === adultId)!.roomId).toBe(11);
    expect(movedEvents(state)).toHaveLength(0);
  });

  it('«Подготовка» (любое направление): никто не двигается', () => {
    const state = freshState('move-preparation');
    const adultId = putIntruder(state, 'ADULT', 12);
    eventDeckTop(state, 'EVT_PREPARATION');

    resolveEventCardMovement(state);

    expect(movedEvents(state)).toHaveLength(0);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === adultId)!.roomId).toBe(12);
    expect(state.decks.events.discard.map((card) => card.id)).toEqual(['EVT_PREPARATION']);
  });

  it('вход в неисследованный отсек к Персонажу: Бой без Контакта и вскрытия', () => {
    const state = freshState('move-into-combat');
    state.players['player-1']!.roomId = 16;
    state.ship.rooms[16]!.isExplored = false;
    putIntruder(state, 'ADULT', 12);
    eventDeckTop(state, 'EVT_HUNT_2');

    resolveEventCardMovement(state);

    expect(state.ship.rooms[16]!.isExplored).toBe(false);
    expect(state.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED')).toBe(false);
    expect(isPlayerInCombat(state, 'player-1')).toBe(true);
  });
});
