import type { GameState } from '../types/state.js';
import { SELF_DESTRUCT_IRREVERSIBLE_AT } from '../data/evacuation.js';
import { EngineError } from './engineErrors.js';

export type SelfDestructToggle = 'STARTED' | 'STOPPED';

export function isSelfDestructIrreversible(state: GameState): boolean {
  const position = state.meta.selfDestructTrackPosition;
  return position !== null && position >= SELF_DESTRUCT_IRREVERSIBLE_AT;
}

/** Запуск или остановка Самоуничтожения (Генератор, стр. 24; Ключ самоуничтожения). */
export function toggleSelfDestruct(state: GameState): SelfDestructToggle {
  if (state.meta.selfDestructTrackPosition === null) {
    if (Object.values(state.players).some((player) => player.isInHibernation)) {
      throw new EngineError(
        'ROOM_ABILITY_NOT_ALLOWED',
        'Нельзя запустить Самоуничтожение, пока кто-то из Персонажей находится в Анабиозе (стр. 24).',
      );
    }
    state.meta.selfDestructTrackPosition = 0;
    return 'STARTED';
  }
  if (isSelfDestructIrreversible(state)) {
    throw new EngineError(
      'ROOM_ABILITY_NOT_ALLOWED',
      'Маркер Самоуничтожения на желтом делении — процесс больше нельзя остановить (стр. 11).',
    );
  }
  state.meta.selfDestructTrackPosition = null;
  return 'STOPPED';
}
