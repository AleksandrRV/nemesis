import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import { ROOM_OPTION } from '../types/cardOptions.js';
import { contactState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';
import { lastEvent, roomOf, standAt, useConsole } from '../testing/roomFixtures.js';
import { GameEngine } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';

function duo(seed: string) {
  const state = contactState(2, seed);
  state.ship.engines = { 1: { isWorking: true }, 2: { isWorking: false }, 3: { isWorking: true } };
  return state;
}

describe('Машинный Отсек [2]: Проверка Двигателя (стр. 26)', () => {
  it('тайно показывает состояние только проверившему, остальные видят сам факт проверки', () => {
    const state = duo('engine-check');
    standAt(state, 'player-1', 'ENGINE_02');

    const next = useConsole(state, 'player-1');

    expect(next.players['player-1']!.inspectedEngines).toEqual([2]);
    const own = filterStateForPlayer(next, 'player-1');
    const other = filterStateForPlayer(next, 'player-2');
    expect(own.ship.engines[2]!.isWorking).toBe(false);
    expect(other.ship.engines[2]!.isWorking).toBeNull();
    const otherEntry = other.gameLog.at(-1)!.event;
    expect(otherEntry).toMatchObject({ type: 'ENGINES_INSPECTED', engines: [{ engineNumber: 2, isWorking: null }] });
  });

  it('Неисправность в самом Машинном Отсеке блокирует Проверку', () => {
    const state = duo('engine-check-malfunction');
    const roomId = standAt(state, 'player-1', 'ENGINE_01');
    state.ship.rooms[roomId]!.hasMalfunction = true;

    expectEngineError(() => useConsole(state, 'player-1'), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});

describe('Машинное Отделение [2]: все 3 Двигателя (стр. 25)', () => {
  it('смотрит все Двигатели, даже если в Машинных Отсеках Неисправности', () => {
    const state = duo('engine-control');
    state.ship.rooms[roomOf(state, 'ENGINE_01')]!.hasMalfunction = true;
    standAt(state, 'player-1', 'ENGINE_CONTROL');

    const next = useConsole(state, 'player-1');

    expect(next.players['player-1']!.inspectedEngines).toEqual([1, 2, 3]);
    expect(lastEvent(next, 'ENGINES_INSPECTED')).toMatchObject({
      source: 'ENGINE_CONTROL',
      engines: [
        { engineNumber: 1, isWorking: true },
        { engineNumber: 2, isWorking: false },
        { engineNumber: 3, isWorking: true },
      ],
    });
  });
});

describe('Мостик [2]: Проверка Координат или Установка Курса (стр. 26)', () => {
  it('Проверка Координат открывает карту только проверившему', () => {
    const state = duo('bridge-check');
    standAt(state, 'player-1', 'COCKPIT');

    const next = useConsole(state, 'player-1', { option: ROOM_OPTION.CHECK_COORDINATES });

    expect(filterStateForPlayer(next, 'player-1').ship.coordinates.cardId).toBe(next.ship.coordinates.cardId);
    expect(filterStateForPlayer(next, 'player-2').ship.coordinates.cardId).toBeNull();
    expect(filterStateForPlayer(next, 'player-2').gameLog.at(-1)!.event).toMatchObject({
      type: 'COORDINATES_INSPECTED',
      cardId: null,
    });
  });

  it('Установка Курса переносит маркер публично', () => {
    const state = duo('bridge-course');
    state.ship.coordinates.currentCourseMarker = 'A';
    standAt(state, 'player-1', 'COCKPIT');

    const next = useConsole(state, 'player-1', { option: ROOM_OPTION.SET_COURSE, targetCourseMarker: 'C' });

    expect(next.ship.coordinates.currentCourseMarker).toBe('C');
    expect(filterStateForPlayer(next, 'player-2').ship.coordinates.currentCourseMarker).toBe('C');
    expect(lastEvent(next, 'COURSE_SET')).toMatchObject({ fromMarker: 'A', toMarker: 'C' });
  });

  it('Курс нельзя изменить, пока кто-то в Анабиозе', () => {
    const state = duo('bridge-hibernation');
    state.players['player-2']!.isInHibernation = true;
    standAt(state, 'player-1', 'COCKPIT');

    expectEngineError(
      () => useConsole(state, 'player-1', { option: ROOM_OPTION.SET_COURSE, targetCourseMarker: 'B' }),
      'COURSE_CHANGE_FORBIDDEN',
    );
  });

  it('Чужой на Мостике: Бой запрещает Действие Комнаты', () => {
    const state = duo('bridge-intruder');
    const roomId = standAt(state, 'player-1', 'COCKPIT');
    putIntruder(state, 'ADULT', roomId);

    expectEngineError(
      () => useConsole(state, 'player-1', { option: ROOM_OPTION.SET_COURSE, targetCourseMarker: 'B' }),
      'ROOM_ABILITY_NOT_ALLOWED',
    );
  });

  it('без выбора режима и при том же маркере — явный отказ', () => {
    const state = duo('bridge-invalid');
    standAt(state, 'player-1', 'COCKPIT');
    const marker = state.ship.coordinates.currentCourseMarker;

    expectEngineError(() => useConsole(state, 'player-1'), 'INVALID_DECISION_OPTION');
    expectEngineError(
      () => useConsole(state, 'player-1', { option: ROOM_OPTION.SET_COURSE, targetCourseMarker: marker }),
      'INVALID_DECISION_OPTION',
    );
  });
});

describe('Комната Наблюдения [2] и подглядывание', () => {
  it('тайно открывает оборот тайла и жетон Исследования; другим — только какой отсек', () => {
    const state = duo('observation');
    standAt(state, 'player-1', 'OBSERVATION_ROOM');
    const target = Object.values(state.ship.rooms).find((room) => !room.isExplored)!;

    const next = useConsole(state, 'player-1', { targetRoomId: target.id });

    expect(filterStateForPlayer(next, 'player-1').gameLog.at(-1)!.event).toMatchObject({
      type: 'ROOM_PEEKED',
      source: 'OBSERVATION_ROOM',
      roomDefinitionId: target.definitionId,
      effect: target.explorationEffect,
      itemsCount: target.itemsCount,
    });
    expect(filterStateForPlayer(next, 'player-2').gameLog.at(-1)!.event).toMatchObject({
      roomId: target.id,
      roomDefinitionId: null,
      effect: null,
      itemsCount: null,
    });
  });

  it('исследованный отсек смотреть нельзя', () => {
    const state = duo('observation-explored');
    const roomId = standAt(state, 'player-1', 'OBSERVATION_ROOM');

    expectEngineError(() => useConsole(state, 'player-1', { targetRoomId: roomId }), 'ROOM_ALREADY_EXPLORED');
  });

  it('«Знание корабля»: оборот Комнаты виден, жетон Исследования — нет (текст карты)', () => {
    const state = contactState(1, 'ship-knowledge');
    const card = structuredClone(ACTION_CARDS.find((entry) => entry.id === 'ACT_PIL_SHIP_KNOWLEDGE')!);
    state.players['player-1']!.actionDeck.hand.push(card);
    const target = Object.values(state.ship.rooms).find((room) => !room.isExplored)!;

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: card.id, discardCardIds: [], option: 'PEEK', targetRoomId: target.id },
    });

    expect(lastEvent(next, 'ROOM_PEEKED')).toMatchObject({
      roomDefinitionId: target.definitionId,
      effect: null,
      itemsCount: null,
    });
  });
});
