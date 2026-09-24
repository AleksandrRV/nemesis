import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import {
  DOOR_TRANSITION_DURATION_MS,
  diffDoorSnapshots,
  snapshotDoors,
  type DoorSnapshot,
  type DoorTransition,
} from './doorTransitionModel';

interface TrackedDoors {
  view: SanitizedGameState | null;
  snapshot: DoorSnapshot | null;
  stamp: number;
}

function replaceByCorridor(current: DoorTransition[], fresh: DoorTransition[]): DoorTransition[] {
  const refreshed = new Set(fresh.map((transition) => transition.corridorId));
  return [...current.filter((transition) => !refreshed.has(transition.corridorId)), ...fresh];
}

export function useDoorTransitions(
  view: SanitizedGameState | null,
  reducedMotion: boolean,
): ReadonlyMap<string, DoorTransition> {
  const [tracked, setTracked] = React.useState<TrackedDoors>(() => ({
    view,
    snapshot: view ? snapshotDoors(view) : null,
    stamp: 0,
  }));
  const [active, setActive] = React.useState<DoorTransition[]>([]);

  if (view !== tracked.view) {
    const snapshot = view ? snapshotDoors(view) : null;
    const stamp = tracked.stamp + 1;
    const fresh = snapshot && !reducedMotion ? diffDoorSnapshots(tracked.snapshot, snapshot, stamp) : [];
    setTracked({ view, snapshot, stamp });
    if (fresh.length > 0) setActive((current) => replaceByCorridor(current, fresh));
  }

  const timersRef = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    const timers = timersRef.current;
    for (const transition of active) {
      if (timers.has(transition.key)) continue;
      const timer = window.setTimeout(() => {
        timers.delete(transition.key);
        setActive((current) => current.filter((candidate) => candidate.key !== transition.key));
      }, DOOR_TRANSITION_DURATION_MS[transition.kind]);
      timers.set(transition.key, timer);
    }
  }, [active]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return React.useMemo(() => new Map(active.map((transition) => [transition.corridorId, transition])), [active]);
}
