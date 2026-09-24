import type { CorridorConnection, SanitizedGameState } from '@nemesis/shared';
import type { BatchBaseline } from './boardAnimationModel';
import type { SequencedItem } from '../../store/presentationStore';

export type DoorState = CorridorConnection['doorState'];

export type DoorTransitionKind = 'CLOSING' | 'OPENING' | 'BREACH' | 'BLAST';

export interface DoorTransition {
  key: string;
  corridorId: string;
  kind: DoorTransitionKind;
  from: DoorState;
  to: DoorState;
}

export interface DoorSnapshot {
  gameId: string;
  doors: ReadonlyMap<string, DoorState>;
}

export const DOOR_TRANSITION_DURATION_MS: Record<DoorTransitionKind, number> = {
  CLOSING: 1000,
  OPENING: 1050,
  BREACH: 1700,
  BLAST: 1300,
};

export const DOOR_BLAST_DELAY_MS: Record<Extract<DoorTransitionKind, 'BREACH' | 'BLAST'>, number> = {
  BREACH: 520,
  BLAST: 80,
};

export const DOOR_STATE_LABELS: Record<DoorState, string> = {
  OPEN: 'Дверь открыта',
  CLOSED: 'Дверь закрыта',
  DESTROYED: 'Дверь разрушена',
};

export function classifyDoorTransition(from: DoorState, to: DoorState): DoorTransitionKind | null {
  if (from === to || from === 'DESTROYED') return null;
  if (to === 'CLOSED') return 'CLOSING';
  if (to === 'OPEN') return 'OPENING';
  return from === 'CLOSED' ? 'BREACH' : 'BLAST';
}

export function snapshotDoors(view: SanitizedGameState): DoorSnapshot {
  return {
    gameId: view.meta.gameId,
    doors: new Map(Object.values(view.ship.corridors).map((corridor) => [corridor.id, corridor.doorState])),
  };
}

export function diffDoorSnapshots(previous: DoorSnapshot | null, next: DoorSnapshot, stamp: number): DoorTransition[] {
  if (!previous || previous.gameId !== next.gameId) return [];
  const transitions: DoorTransition[] = [];
  for (const [corridorId, to] of next.doors) {
    const from = previous.doors.get(corridorId);
    if (!from) continue;
    const kind = classifyDoorTransition(from, to);
    if (!kind) continue;
    transitions.push({ key: `door-${corridorId}-${stamp}`, corridorId, kind, from, to });
  }
  return transitions;
}

export function changedDoorStates(previous: SanitizedGameState, next: SanitizedGameState): Map<string, DoorState> {
  const before = new Map<string, DoorState>();
  for (const [corridorId, corridor] of Object.entries(next.ship.corridors)) {
    const previousState = previous.ship.corridors[corridorId]?.doorState;
    if (previousState && previousState !== corridor.doorState) before.set(corridorId, previousState);
  }
  return before;
}

function heldByExplorationDoors(item: SequencedItem): boolean {
  return item.kind === 'EXPLORATION_REVEAL' && item.animation.effect === 'DOORS';
}

export function heldDoorStates(
  queue: readonly SequencedItem[],
  baseline: BatchBaseline | null,
  current: SanitizedGameState['ship']['corridors'],
): Map<string, DoorState> {
  const held = new Map<string, DoorState>();
  if (!baseline || baseline.doorStatesBefore.size === 0) return held;

  const holdsAllDoorEffects = queue.some(heldByExplorationDoors);
  for (const item of queue) {
    if (item.kind !== 'DOOR_BREACHED') continue;
    const before = baseline.doorStatesBefore.get(item.animation.corridorId);
    if (before) held.set(item.animation.corridorId, before);
  }
  if (holdsAllDoorEffects) {
    for (const [corridorId, before] of baseline.doorStatesBefore) {
      if (current[corridorId]?.doorState !== 'DESTROYED') held.set(corridorId, before);
    }
  }
  return held;
}
