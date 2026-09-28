import { boardChangeDelta, type BoardChangeDelta, type IntruderBoardModel } from './intruderBoardModel';

export const SEEN_BOARD_STORAGE_KEY = 'nemesis:intruder-board-last-seen';

export type SnapshotStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function sessionSnapshotStorage(): SnapshotStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSeenBoardSnapshot(storage: SnapshotStorage | null): IntruderBoardModel | null {
  try {
    const stored = storage?.getItem(SEEN_BOARD_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as IntruderBoardModel) : null;
  } catch {
    return null;
  }
}

export function writeSeenBoardSnapshot(storage: SnapshotStorage | null, model: IntruderBoardModel): void {
  try {
    storage?.setItem(SEEN_BOARD_STORAGE_KEY, JSON.stringify(model));
  } catch {
    return;
  }
}

export function deltaSinceSnapshot(
  snapshot: IntruderBoardModel | null,
  model: IntruderBoardModel,
): BoardChangeDelta | null {
  if (!snapshot) return null;
  try {
    return boardChangeDelta(snapshot, model);
  } catch {
    return null;
  }
}

export function hasUnseenBoardChanges(changeKey: string, seenKey: string, isBoardOpen: boolean): boolean {
  return !isBoardOpen && changeKey !== seenKey;
}
