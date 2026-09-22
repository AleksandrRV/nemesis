import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { GameState } from '../types/state.js';
import { createInitialGameState } from './setup.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { putIntruder } from '../testing/contactFixtures.js';

function retreatState(seed: string): GameState {
  return createInitialGameState(seed, { playerCount: 1 });
}

/** Ставит карту Событий на верх колоды — её вытянет Отступление. */
function eventDeckTop(state: GameState, cardId: string): void {
  const cards = structuredClone(EVENT_CARDS);
  const first = cards.find((card) => card.id === cardId)!;
  state.decks.events = { drawPile: [first, ...cards.filter((card) => card.id !== cardId)], discard: [] };
}

function retreatLog(state: GameState) {
  const entry = state.gameLog.find((item) => item.event.type === 'INTRUDER_RETREATED');
  if (!entry || entry.event.type !== 'INTRUDER_RETREATED') throw new Error('INTRUDER_RETREATED не в журнале');
  return entry.event;
}

describe('Отступление Чужого в бою (стр. 20)', () => {
  it('открытый Коридор: миниатюра уходит в соседний отсек, карта Событий — в сброс', () => {
    const state = retreatState('retreat-moved');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.woundsCount = 1;
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3 из отсека 11 — Коридор 8-11, отсек 8

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'MOVED', toRoomId: 8, corridorId: '8-11', corridorNumber: 3 });
    const intruder = state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
    expect(intruder.roomId).toBe(8);
    // Раны не сброшены: Отступление не лечит, отсек сменился вместе с ними.
    expect(intruder.woundsCount).toBe(1);
    expect(state.ship.rooms[11]!.occupantIntruderIds).not.toContain(intruderId);
    expect(state.ship.rooms[8]!.occupantIntruderIds).toContain(intruderId);
    expect(state.decks.events.discard.map((card) => card.id)).toEqual(['EVT_HUNT_2']);
    expect(state.decks.events.drawPile).toHaveLength(19);
    expect(retreatLog(state)).toMatchObject({
      playerId: 'player-1',
      roomId: 11,
      intruderId,
      intruderType: 'ADULT',
      retreat: { outcome: 'MOVED', toRoomId: 8 },
    });
  });

  it('Разрушенная Дверь не мешает: Чужой проходит в соседний отсек', () => {
    const state = retreatState('retreat-ruined-door');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.ship.corridors['8-11']!.doorState = 'DESTROYED';
    eventDeckTop(state, 'EVT_HUNT_2');

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record.outcome).toBe('MOVED');
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.roomId).toBe(8);
    expect(state.ship.corridors['8-11']!.doorState).toBe('DESTROYED');
  });

  it('Закрытая Дверь: Дверь разрушается, Чужой остаётся (FAQ Rules 8)', () => {
    const state = retreatState('retreat-door');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.ship.corridors['8-11']!.doorState = 'CLOSED';
    eventDeckTop(state, 'EVT_HUNT_2');

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'DOOR_DESTROYED', corridorId: '8-11', toRoomId: null });
    expect(state.ship.corridors['8-11']!.doorState).toBe('DESTROYED');
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.roomId).toBe(11);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toContain(intruderId);
  });

  it('номер входа в вентиляцию: миниатюра снята, Раны сброшены, пул жетонов не меняется (стр. 16)', () => {
    const state = retreatState('retreat-vents');
    const intruderId = putIntruder(state, 'ADULT', 14); // tech-вход №3 в отсеке 14
    state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.woundsCount = 2;
    const bagBefore = structuredClone(state.intrudersPool.bag);
    const supplyBefore = state.intrudersPool.supply.length;
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3 из отсека 14 — вход в Технические Коридоры

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'TECHNICAL_CORRIDORS', toRoomId: null, corridorId: null });
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)).toBeUndefined();
    expect(state.ship.rooms[14]!.occupantIntruderIds).not.toContain(intruderId);
    // Жетон уже в пуле рядом с полем (вытянут при появлении, FAQ Rules 19).
    expect(state.intrudersPool.bag).toEqual(bagBefore);
    expect(state.intrudersPool.supply.length).toBe(supplyBefore);
    expect(retreatLog(state).retreat.outcome).toBe('TECHNICAL_CORRIDORS');
  });

  it('нет Коридора с номером карты: Чужой остаётся на месте', () => {
    const state = retreatState('retreat-unmapped');
    const intruderId = putIntruder(state, 'ADULT', 9); // выходы отсека 9 — только 3 и 4
    eventDeckTop(state, 'EVT_REGENERATION'); // Коридор 1

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'STAYED', toRoomId: null, corridorId: null });
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.roomId).toBe(9);
  });

  it('«Подготовка» без номера Коридора: направления нет, Чужой остаётся', () => {
    const state = retreatState('retreat-any');
    const intruderId = putIntruder(state, 'ADULT', 11);
    eventDeckTop(state, 'EVT_PREPARATION');

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'STAYED', corridorNumber: 'ANY' });
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.roomId).toBe(11);
  });

  it('пустая колода Событий перетасовывается из сброса потоком cards', () => {
    const state = retreatState('retreat-reshuffle');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.decks.events = {
      drawPile: [],
      discard: structuredClone([
        EVENT_CARDS.find((card) => card.id === 'EVT_HUNT_2')!,
        EVENT_CARDS.find((card) => card.id === 'EVT_REGENERATION')!,
      ]),
    };
    const cardsDrawsBefore = state.meta.rngDraws.cards;

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(['EVT_HUNT_2', 'EVT_REGENERATION']).toContain(record.eventCardId);
    expect(record.outcome).toBe('MOVED');
    expect(state.meta.rngDraws.cards).toBeGreaterThan(cardsDrawsBefore);
    expect(state.decks.events.discard).toHaveLength(1);
  });

  it('текстовый эффект карты Событий не разыгрывается', () => {
    const state = retreatState('retreat-no-effect');
    const intruderId = putIntruder(state, 'ADULT', 11);
    // «Открытие отсеков» (Коридор 1) в Фазу Событий открывает Двери — при
    // Отступлении карта уходит в сброс без эффекта (стр. 20): Закрытая Дверь
    // другого Коридора остаётся Закрытой.
    eventDeckTop(state, 'EVT_OPEN_COMPARTMENTS');
    state.ship.corridors['6-11']!.doorState = 'CLOSED';

    const record = resolveIntruderRetreat(state, intruderId, 'player-1');

    expect(record).toMatchObject({ outcome: 'MOVED', toRoomId: 15, corridorId: '11-15' });
    expect(state.ship.corridors['6-11']!.doorState).toBe('CLOSED');
    expect(state.decks.events.discard.map((card) => card.id)).toEqual(['EVT_OPEN_COMPARTMENTS']);
  });
});
