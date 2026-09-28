import type { GameState } from '../types/state.js';
import { podSectionOfRoom } from '../data/evacuation.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { requireRoom } from './cardEffectsShared.js';
import { togglePodLock } from './evacuation.js';
import { toggleSelfDestruct } from './selfDestruct.js';

/** Компьютер Неисправной Комнаты недоступен, как если бы символа не было (стр. 17, 24). */
function requireAvailableComputer(state: GameState, actorId: string, itemName: string): void {
  const room = requireRoom(state, actorId);
  if (!room.hasComputer) {
    throw new EngineError('NO_COMPUTER', `«${itemName}» работает только в Комнате с Компьютером.`);
  }
  if (room.hasMalfunction) {
    throw new EngineError('NO_COMPUTER', 'В Неисправной Комнате Компьютер недоступен (стр. 17).');
  }
}

export function useEvacuationKey(state: GameState, actorId: string, podId: string | undefined): void {
  const section = podSectionOfRoom(requireRoom(state, actorId).definitionId);
  if (!section) {
    throw new EngineError('CARD_NOT_USABLE_NOW', 'Ключ эвакуации работает в Спасательном Отсеке.');
  }
  togglePodLock(state, actorId, podId, 'EVACUATION_KEY', section);
}

export function useSelfDestructKey(state: GameState, actorId: string): void {
  requireAvailableComputer(state, actorId, 'Ключ самоуничтожения');
  const toggle = toggleSelfDestruct(state);
  appendGameLog(state, { type: 'SELF_DESTRUCT_TOGGLED', playerId: actorId, isActive: toggle === 'STARTED' });
}

export function useCommsKey(state: GameState, actorId: string, targetPlayerId: string | undefined): void {
  requireAvailableComputer(state, actorId, 'Ключ связи');
  const target = targetPlayerId ? state.players[targetPlayerId] : undefined;
  if (!target || !target.hasSignalSent) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите Персонажа, на чьем Планшете есть маркер Сигнала.');
  }
  if (target.objectives.length === 0) {
    throw new EngineError('CARD_NOT_USABLE_NOW', 'Карты Целей в этой версии еще не раздаются — смотреть нечего.');
  }
  appendGameLog(state, {
    type: 'OBJECTIVE_PEEKED',
    playerId: actorId,
    targetPlayerId: target.id,
    objectiveNames: target.objectives.map((objective) => objective.name),
  });
}
