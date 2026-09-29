import type { CrewSetupState, SanitizedCrewSetup } from '../types/crew.js';
import { availableRoles, canPickRole, currentDraftPicker, isCrewReady } from './crewSetup.js';
import { EngineError } from './engineErrors.js';

/** Кто выбирает Персонажа сейчас: в Драфте — по номерам, в свободном выборе — первый невыбравший по очереди. */
export function crewSetupPicker(state: CrewSetupState): string | null {
  if (state.roleSelection === 'DRAFT') return currentDraftPicker(state);
  return state.pickOrder.find((playerId) => canPickRole(state, playerId)) ?? null;
}

export function filterCrewSetupForSeat(state: CrewSetupState, viewerId: string): SanitizedCrewSetup {
  if (!state.seats.some((seat) => seat.playerId === viewerId)) {
    throw new EngineError('UNKNOWN_PLAYER', `Места ${viewerId} за столом нет.`);
  }
  const canPick = canPickRole(state, viewerId);
  return {
    viewerId,
    seed: state.seed,
    playerCount: state.playerCount,
    gameMode: state.gameMode,
    roleSelection: state.roleSelection,
    seats: state.seats.map((seat) => ({ ...seat })),
    objectives: structuredClone(state.objectives[viewerId] ?? []),
    objectiveCounts: Object.fromEntries(
      Object.entries(state.objectives).map(([playerId, cards]) => [playerId, cards.length]),
    ),
    roles: { ...state.roles },
    pickOrder: [...state.pickOrder],
    currentPicker: crewSetupPicker(state),
    availableRoles: canPick ? availableRoles(state, viewerId) : [],
    canPick,
    isReady: isCrewReady(state),
  };
}
