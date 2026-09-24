import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import { mergeBatchBaselines, snapshotBatchBaseline } from './boardAnimationModel';
import {
  DOOR_BLAST_DELAY_MS,
  DOOR_TRANSITION_DURATION_MS,
  changedDoorStates,
  classifyDoorTransition,
  diffDoorSnapshots,
  heldDoorStates,
  snapshotDoors,
  type DoorState,
} from './doorTransitionModel';
import type { SequencedItem } from '../../store/presentationStore';

function snapshot(seed = 'door-transitions'): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState(seed), 'player-1');
}

function withDoor(view: SanitizedGameState, corridorId: string, doorState: DoorState): SanitizedGameState {
  const draft = structuredClone(view);
  draft.ship.corridors[corridorId]!.doorState = doorState;
  return draft;
}

const CORRIDOR = '6-11';

function breachItem(corridorId: string): SequencedItem {
  return {
    kind: 'DOOR_BREACHED',
    key: `d-${corridorId}-9`,
    sequence: 9,
    animation: { kind: 'DOOR_BREACHED', key: `d-${corridorId}-9`, corridorId },
  };
}

function explorationItem(effect: 'DOORS' | 'FIRE'): SequencedItem {
  return {
    kind: 'EXPLORATION_REVEAL',
    key: 'e-12-4',
    sequence: 4,
    animation: { kind: 'EXPLORATION_REVEAL', key: 'e-12-4', roomId: 12, effect, itemsCount: 1 },
  };
}

describe('Двери: классификация переходов', () => {
  it('закрытие, открытие, взлом Закрытой и подрыв Открытой Двери различаются', () => {
    expect(classifyDoorTransition('OPEN', 'CLOSED')).toBe('CLOSING');
    expect(classifyDoorTransition('CLOSED', 'OPEN')).toBe('OPENING');
    expect(classifyDoorTransition('CLOSED', 'DESTROYED')).toBe('BREACH');
    expect(classifyDoorTransition('OPEN', 'DESTROYED')).toBe('BLAST');
  });

  it('без смены состояния и из Разрушенной Двери кинематографии нет', () => {
    expect(classifyDoorTransition('OPEN', 'OPEN')).toBeNull();
    expect(classifyDoorTransition('DESTROYED', 'OPEN')).toBeNull();
    expect(classifyDoorTransition('DESTROYED', 'CLOSED')).toBeNull();
  });

  it('взлом длится дольше задержки взрыва: осколки успевают разлететься', () => {
    expect(DOOR_TRANSITION_DURATION_MS.BREACH).toBeGreaterThan(DOOR_BLAST_DELAY_MS.BREACH + 800);
    expect(DOOR_TRANSITION_DURATION_MS.BLAST).toBeGreaterThan(DOOR_BLAST_DELAY_MS.BLAST + 800);
  });
});

describe('Двери: сравнение снимков', () => {
  it('находит изменившиеся Двери с уникальным ключом кадра', () => {
    const before = snapshot();
    const after = withDoor(before, CORRIDOR, 'CLOSED');

    const transitions = diffDoorSnapshots(snapshotDoors(before), snapshotDoors(after), 7);

    expect(transitions).toEqual([
      { key: `door-${CORRIDOR}-7`, corridorId: CORRIDOR, kind: 'CLOSING', from: 'OPEN', to: 'CLOSED' },
    ]);
  });

  it('первый снимок и новая партия переходов не рождают', () => {
    const before = snapshot();
    const after = withDoor(before, CORRIDOR, 'CLOSED');
    const otherGame = { ...snapshotDoors(after), gameId: 'another-game' };

    expect(diffDoorSnapshots(null, snapshotDoors(after), 1)).toEqual([]);
    expect(diffDoorSnapshots(snapshotDoors(before), otherGame, 2)).toEqual([]);
  });

  it('базлайн пачки запоминает прежнее состояние Двери, слияние хранит самое раннее', () => {
    const start = snapshot();
    const closed = withDoor(start, CORRIDOR, 'CLOSED');
    const destroyed = withDoor(closed, CORRIDOR, 'DESTROYED');

    expect(changedDoorStates(start, closed).get(CORRIDOR)).toBe('OPEN');
    const merged = mergeBatchBaselines(snapshotBatchBaseline(start, closed), snapshotBatchBaseline(closed, destroyed));
    expect(merged.doorStatesBefore.get(CORRIDOR)).toBe('OPEN');
  });
});

describe('Двери: удержание состояния до своего шага презентации', () => {
  it('взломанная Дверь остаётся Закрытой, пока взлом ждёт в очереди', () => {
    const before = withDoor(snapshot(), CORRIDOR, 'CLOSED');
    const after = withDoor(before, CORRIDOR, 'DESTROYED');
    const baseline = snapshotBatchBaseline(before, after);

    const held = heldDoorStates([breachItem(CORRIDOR)], baseline, after.ship.corridors);

    expect(held.get(CORRIDOR)).toBe('CLOSED');
  });

  it('когда взлом стал активным (очередь пуста), удержание снято', () => {
    const before = withDoor(snapshot(), CORRIDOR, 'CLOSED');
    const after = withDoor(before, CORRIDOR, 'DESTROYED');

    expect(heldDoorStates([], snapshotBatchBaseline(before, after), after.ship.corridors).size).toBe(0);
  });

  it('жетон Исследования «Двери» держит захлопнутую Дверь до своей карточки', () => {
    const before = snapshot();
    const after = withDoor(before, CORRIDOR, 'CLOSED');
    const baseline = snapshotBatchBaseline(before, after);

    expect(heldDoorStates([explorationItem('DOORS')], baseline, after.ship.corridors).get(CORRIDOR)).toBe('OPEN');
    expect(heldDoorStates([explorationItem('FIRE')], baseline, after.ship.corridors).size).toBe(0);
  });

  it('без базлайна или без изменившихся Дверей ничего не удерживается', () => {
    const view = snapshot();
    expect(heldDoorStates([breachItem(CORRIDOR)], null, view.ship.corridors).size).toBe(0);
    expect(heldDoorStates([breachItem(CORRIDOR)], snapshotBatchBaseline(view, view), view.ship.corridors).size).toBe(0);
  });
});
