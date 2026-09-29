import { describe, expect, it } from 'vitest';
import { CONTAMINATION_CARDS } from '../data/contaminationCards.js';
import type { ContaminationCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { contactState, expectEngineError, putPlayer } from '../testing/contactFixtures.js';
import { exploreAs, lastEvent, standAt, useConsole } from '../testing/roomFixtures.js';
import { corridorsIntoRoom } from './doorControl.js';
import { movePlayer } from './movement.js';

function contamination(isInfected: boolean): ContaminationCard {
  const card = structuredClone(CONTAMINATION_CARDS.find((entry) => entry.isInfected === isInfected)!);
  card.isScanned = false;
  return card;
}

function withHand(state: GameState, cards: ContaminationCard[]): GameState {
  state.players['player-1']!.actionDeck.hand.push(...cards);
  return state;
}

describe('Столовая [2]: Перекусите (стр. 25)', () => {
  it('лечит 1 Лёгкую Травму', () => {
    const state = contactState(1, 'canteen-heal');
    standAt(state, 'player-1', 'CANTEEN');
    state.players['player-1']!.lightWounds = 2;

    const next = useConsole(state, 'player-1');

    expect(next.players['player-1']!.lightWounds).toBe(1);
  });

  it('по желанию сканирует руку: чистые карты уходят, ИНФЕКЦИЯ сажает Личинку', () => {
    const state = withHand(contactState(1, 'canteen-scan'), [contamination(false), contamination(true)]);
    standAt(state, 'player-1', 'CANTEEN');

    const next = useConsole(state, 'player-1', { scanContamination: true });

    const hand = next.players['player-1']!.actionDeck.hand.filter((card) => !('characterClass' in card));
    expect(hand).toHaveLength(1);
    expect(next.players['player-1']!.hasLarva).toBe(true);
    expect(lastEvent(next, 'CONTAMINATION_SCANNED')).toMatchObject({ source: 'CANTEEN', outcome: 'LARVA_PLACED' });
  });

  it('без Травм и без скана — явный отказ; скан без карт Заражения — тоже', () => {
    const state = contactState(1, 'canteen-nothing');
    standAt(state, 'player-1', 'CANTEEN');
    expectEngineError(() => useConsole(state, 'player-1'), 'ROOM_ABILITY_NOT_ALLOWED');
    expectEngineError(() => useConsole(state, 'player-1', { scanContamination: true }), 'NO_CONTAMINATION');
  });
});

describe('Душевая [2]: Примите душ (стр. 25)', () => {
  it('смывает Слизь и по желанию сканирует руку', () => {
    const state = withHand(contactState(1, 'shower'), [contamination(false)]);
    standAt(state, 'player-1', 'SHOWER');
    state.players['player-1']!.hasSlime = true;

    const next = useConsole(state, 'player-1', { scanContamination: true });

    expect(next.players['player-1']!.hasSlime).toBe(false);
    expect(lastEvent(next, 'CONTAMINATION_SCANNED')).toMatchObject({
      source: 'SHOWER',
      outcome: 'CLEAN',
      removedCount: 1,
    });
  });

  it('без Слизи и без скана — явный отказ', () => {
    const state = contactState(1, 'shower-nothing');
    standAt(state, 'player-1', 'SHOWER');
    expectEngineError(() => useConsole(state, 'player-1'), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});

describe('Центр Управления [2]: Откройте/Закройте Двери (стр. 25)', () => {
  it('закрывает выбранные Двери любой Комнаты, остальные открывает', () => {
    const state = contactState(1, 'command-center');
    standAt(state, 'player-1', 'COMMAND_CENTER');
    const target = 11;
    const [first, second] = corridorsIntoRoom(state, target);
    first!.doorState = 'OPEN';
    second!.doorState = 'CLOSED';

    const next = useConsole(state, 'player-1', { targetRoomId: target, closedCorridorIds: [first!.id] });

    expect(next.ship.corridors[first!.id]!.doorState).toBe('CLOSED');
    expect(next.ship.corridors[second!.id]!.doorState).toBe('OPEN');
    expect(lastEvent(next, 'DOORS_REARRANGED')).toMatchObject({
      targetRoomId: target,
      closedCorridorIds: [first!.id],
      openedCorridorIds: [second!.id],
    });
  });

  it('чужая Дверь в списке — явный отказ', () => {
    const state = contactState(1, 'command-center-invalid');
    standAt(state, 'player-1', 'COMMAND_CENTER');
    const foreign = corridorsIntoRoom(state, 1).find(
      (corridor) => corridor.fromRoomId !== 11 && corridor.toRoomId !== 11,
    )!;
    expectEngineError(
      () => useConsole(state, 'player-1', { targetRoomId: 11, closedCorridorIds: [foreign.id] }),
      'INVALID_DECISION_OPTION',
    );
  });
});

describe('Комната, покрытая Слизью (стр. 25, 17)', () => {
  it('вошедший получает маркер Слизи', () => {
    const state = contactState(1, 'slime-room');
    const from = state.players['player-1']!.roomId;
    const corridor = corridorsIntoRoom(state, from)[0]!;
    const target = corridor.fromRoomId === from ? corridor.toRoomId : corridor.fromRoomId;
    exploreAs(state, target, 'SLIME_ROOM');
    putPlayer(state, 'player-1', from);

    movePlayer(state, 'player-1', target, corridor.id, { kind: 'NONE' });

    expect(state.players['player-1']!.hasSlime).toBe(true);
    expect(lastEvent(state, 'SLIME_ROOM_ENTERED')).toMatchObject({ roomId: target, alreadyHadSlime: false });
  });

  it('у Комнаты Слизи нет Действия — явный отказ', () => {
    const state = contactState(1, 'slime-room-console');
    standAt(state, 'player-1', 'SLIME_ROOM');
    expectEngineError(() => useConsole(state, 'player-1'), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});
