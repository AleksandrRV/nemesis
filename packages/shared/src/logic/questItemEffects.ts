import type { ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { questDefinition } from '../data/questItems.js';
import { EngineError } from './engineErrors.js';
import { placeDoorToken } from './markers.js';
import { performRoomSearch } from './actionCardSupport.js';
import { requirePlayer, requireRoom, requireTargetRoom, toggleDoor } from './cardEffectsShared.js';
import { questKeyOfItem } from './questItems.js';
import type { ItemDisposal, UseItemPayload } from './itemEffects.js';
import { useEvacuationKey, useShipLog } from './keyItemEffects.js';
import { studyWeakness } from './weaknessStudy.js';

function notUsableNow(message: string): never {
  throw new EngineError('CARD_NOT_USABLE_NOW', message);
}

function closeWithToken(state: GameState, corridorId: string): void {
  if (placeDoorToken(state, corridorId) === 'NO_TOKEN_IN_SUPPLY') {
    throw new EngineError('DOOR_TOKEN_SUPPLY_EXHAUSTED', 'Жетонов Дверей нет ни в запасе, ни на поле.');
  }
}

function plasmaTorch(state: GameState, actorId: string, corridorId: string | undefined): void {
  const room = requireRoom(state, actorId);
  const corridor = corridorId ? state.ship.corridors[corridorId] : undefined;
  if (!corridor || (corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите Дверь в Коридоре вашей комнаты.');
  }
  if (corridor.doorState === 'DESTROYED') {
    corridor.doorState = 'OPEN';
    closeWithToken(state, corridor.id);
    return;
  }
  toggleDoor(state, actorId, corridor.id, true);
}

/**
 * «Ключ безопасности»: Двери всех Коридоров выбранной Комнаты — перечисленные
 * Закрываются, остальные Открываются. Без списка — все целые Двери в одно
 * положение: Закрыть, если хотя бы одна открыта, иначе Открыть.
 */
function securityKey(state: GameState, targetRoomId: number | undefined, closedCorridorIds?: readonly string[]): void {
  const target = requireTargetRoom(state, targetRoomId, 'Выберите комнату, Двери которой нужно переключить.');
  const doors = Object.values(state.ship.corridors).filter(
    (corridor) =>
      (corridor.fromRoomId === target.id || corridor.toRoomId === target.id) && corridor.doorState !== 'DESTROYED',
  );
  if (doors.length === 0) throw new EngineError('DOOR_DESTROYED', 'У этой комнаты нет целых Дверей.');
  const doorIds = new Set(doors.map((corridor) => corridor.id));
  if (closedCorridorIds?.some((id) => !doorIds.has(id))) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Закрывать можно только целые Двери выбранной Комнаты.');
  }
  const toClose = new Set(
    closedCorridorIds ??
      (doors.some((corridor) => corridor.doorState === 'OPEN') ? doors.map((corridor) => corridor.id) : []),
  );
  for (const corridor of doors) {
    if (toClose.has(corridor.id) && corridor.doorState === 'OPEN') closeWithToken(state, corridor.id);
    if (!toClose.has(corridor.id)) corridor.doorState = 'OPEN';
  }
}

export function applyQuestItemEffect(
  state: GameState,
  actorId: string,
  item: ItemCard,
  payload: UseItemPayload,
): ItemDisposal {
  const key = questKeyOfItem(item, requirePlayer(state, actorId));
  if (!key) notUsableNow('Квестовый Предмет не принадлежит этому Персонажу.');
  const definition = questDefinition(key);
  switch (key) {
    case 'EVACUATION_KEY':
      useEvacuationKey(state, actorId, payload.targetEscapePodId);
      break;
    case 'PLASMA_TORCH':
      plasmaTorch(state, actorId, payload.targetCorridorId);
      break;
    case 'FLASHLIGHT':
      performRoomSearch(state, actorId, payload.targetDeckColor);
      break;
    case 'SECURITY_KEY':
      securityKey(state, payload.targetRoomId, payload.closedCorridorIds);
      break;
    case 'SHIP_LOG':
      useShipLog(state, actorId, payload.targetPlayerId);
      break;
    case 'LAB_EQUIPMENT':
      studyWeakness(state, actorId, payload.targetObjectKind, 'CARD_NOT_USABLE_NOW');
      break;
    default:
      if (definition.effectMode === 'PASSIVE')
        notUsableNow(`«${definition.name}» действует постоянно — применять его не нужно.`);
      if (definition.effectMode === 'REACTIVE')
        notUsableNow(`«${definition.name}» сработает сама при следующей Атаке Чужого.`);
      notUsableNow(`Эффект «${definition.name}» появится вместе с механикой, от которой он зависит.`);
  }
  return definition.isSingleUse ? 'DISCARD' : 'KEEP';
}
