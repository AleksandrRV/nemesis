import {
  HIBERNATION_OPENS_AT_TIME,
  TIME_TRACK_LENGTH,
  podSectionOfRoom,
  type EscapePodState,
  type SanitizedGameState,
} from '@nemesis/shared';

export const EVACUATION_ACTION_COST = 2;

export type PodStatus = 'LOCKED' | 'OPEN' | 'FULL' | 'LAUNCHED' | 'DESTROYED';

export interface PodView {
  pod: EscapePodState;
  status: PodStatus;
  occupants: string[];
  seatsFree: number;
}

export interface CryoStatus {
  open: boolean;
  position: number;
  opensAt: number;
  length: number;
  advancesUntilOpen: number;
}

export function cryoStatus(view: SanitizedGameState): CryoStatus {
  const position = view.meta.timeTrackPosition;
  return {
    open: position >= HIBERNATION_OPENS_AT_TIME,
    position,
    opensAt: HIBERNATION_OPENS_AT_TIME,
    length: TIME_TRACK_LENGTH,
    advancesUntilOpen: Math.max(0, HIBERNATION_OPENS_AT_TIME - position),
  };
}

function podStatus(pod: EscapePodState): PodStatus {
  if (pod.isLaunched) return 'LAUNCHED';
  if (pod.isDestroyed) return 'DESTROYED';
  if (pod.isLocked) return 'LOCKED';
  return pod.occupantIds.length >= 2 ? 'FULL' : 'OPEN';
}

export function podViews(view: SanitizedGameState, section?: 'A' | 'B'): PodView[] {
  return Object.values(view.ship.escapePods)
    .filter((pod) => !section || pod.section === section)
    .sort((a, b) => a.number - b.number)
    .map((pod) => ({
      pod,
      status: podStatus(pod),
      occupants: pod.occupantIds.map((id) => view.players[id]?.name ?? id),
      seatsFree: Math.max(0, 2 - pod.occupantIds.length),
    }));
}

export function sectionOfRoom(view: SanitizedGameState, roomId: number): 'A' | 'B' | null {
  return podSectionOfRoom(view.ship.rooms[roomId]?.definitionId);
}

export function hibernationBlocker(view: SanitizedGameState, roomId: number, paymentReady: boolean): string | null {
  const status = cryoStatus(view);
  if (!status.open) return `Камеры закрыты: откроются через ${status.advancesUntilOpen} сдвиг(а) маркера Времени`;
  if ((view.ship.rooms[roomId]?.occupantIntruderIds.length ?? 0) > 0) return 'В Криогенном отсеке Чужой';
  if (!paymentReady) return 'Отметьте 2 карты на руке для оплаты';
  return null;
}

export function boardingBlocker(
  view: SanitizedGameState,
  roomId: number,
  entry: PodView,
  paymentReady: boolean,
): string | null {
  if (entry.status === 'LOCKED') return 'Капсула заблокирована';
  if (entry.status === 'FULL') return 'Мест нет';
  if (entry.status === 'LAUNCHED') return 'Капсула уже улетела';
  if (entry.status === 'DESTROYED') return 'Капсула уничтожена';
  if ((view.ship.rooms[roomId]?.occupantIntruderIds.length ?? 0) > 0) return 'В отсеке Чужой';
  if (!paymentReady) return 'Отметьте 2 карты на руке для оплаты';
  return null;
}

export const POD_STATUS_LABELS: Record<PodStatus, string> = {
  LOCKED: 'Заблокирована',
  OPEN: 'Разблокирована',
  FULL: 'Мест нет',
  LAUNCHED: 'Стартовала',
  DESTROYED: 'Уничтожена',
};
