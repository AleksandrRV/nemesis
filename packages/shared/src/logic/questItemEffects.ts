import type { ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { questDefinition } from '../data/questItems.js';
import { EngineError } from './engineErrors.js';
import { closeDoorWithToken, rearrangeRoomDoors } from './doorControl.js';
import { performRoomSearch } from './actionCardSupport.js';
import { requirePlayer, requireRoom, toggleDoor } from './cardEffectsShared.js';
import { questKeyOfItem } from './questItems.js';
import type { ItemDisposal, UseItemPayload } from './itemEffects.js';
import { useEvacuationKey, useShipLog } from './keyItemEffects.js';
import { studyWeakness } from './weaknessStudy.js';

function notUsableNow(message: string): never {
  throw new EngineError('CARD_NOT_USABLE_NOW', message);
}

function plasmaTorch(state: GameState, actorId: string, corridorId: string | undefined): void {
  const room = requireRoom(state, actorId);
  const corridor = corridorId ? state.ship.corridors[corridorId] : undefined;
  if (!corridor || (corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите Дверь в Коридоре вашей комнаты.');
  }
  if (corridor.doorState === 'DESTROYED') {
    corridor.doorState = 'OPEN';
    closeDoorWithToken(state, corridor.id);
    return;
  }
  toggleDoor(state, actorId, corridor.id, true);
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
      rearrangeRoomDoors(state, payload.targetRoomId, payload.closedCorridorIds);
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
