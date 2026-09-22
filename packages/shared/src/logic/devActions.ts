import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { placeDoorToken } from './markers.js';
import { EngineError } from './engineErrors.js';
import { requireCorridor } from './shipGraphQueries.js';

export function executeToggleDoor(
  state: GameState,
  action: Extract<EngineAction, { type: 'DEV_TOGGLE_DOOR' }>,
  actorId: string,
): void {
  // Отладочный переключатель идёт тем же переходом, что и правила:
  // OPEN → CLOSED → DESTROYED, а Разрушенная Дверь — терминальное
  // состояние и «починить» её переключателем нельзя (стр. 17).
  const corridor = requireCorridor(state, action.payload.corridorId);
  if (corridor.doorState === 'OPEN') {
    const placement = placeDoorToken(state, corridor.id);

    if (placement === 'NO_TOKEN_IN_SUPPLY') {
      throw new EngineError(
        'DOOR_TOKEN_SUPPLY_EXHAUSTED',
        'Жетонов Дверей нет ни в запасе, ни среди Закрытых Дверей на поле (стр. 17).',
      );
    }
  } else if (corridor.doorState === 'CLOSED') {
    corridor.doorState = 'DESTROYED';
  }
  appendGameLog(state, {
    type: 'DEV_STATE_CHANGED',
    playerId: actorId,
    target: 'DOOR',
    corridorId: corridor.id,
    value: corridor.doorState,
  });
  return;
}

export function executeToggleNoise(
  state: GameState,
  action: Extract<EngineAction, { type: 'DEV_TOGGLE_NOISE' }>,
  actorId: string,
): void {
  const corridor = requireCorridor(state, action.payload.corridorId);
  corridor.hasNoise = !corridor.hasNoise;
  appendGameLog(state, {
    type: 'DEV_STATE_CHANGED',
    playerId: actorId,
    target: 'NOISE',
    corridorId: corridor.id,
    value: corridor.hasNoise,
  });
  return;
}
