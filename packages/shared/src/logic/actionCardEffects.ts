import type { EngineAction } from '../types/actions.js';
import type { ActionCard } from '../types/cards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { movePlayer } from './movement.js';
import { performPass } from './turnCycle.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { executeReposition } from './classCombatCards.js';
import { receiveContamination } from './characterDamage.js';
import {
  discardInventoryItem,
  fixRoomMalfunction,
  isContaminationCard,
  isEngineOption,
  moveViaTechnicalCorridors,
  peekRoom,
  placeFireFromCard,
  placeMalfunctionFromCard,
  requirePlayer,
  requireRoom,
  requireTargetRoom,
  setEngineState,
  toggleDoor,
  weaponInHandSlots,
} from './cardEffectsShared.js';
import { motivateRoom, performRoomSearch, performScavenge, threatAssessment } from './actionCardSupport.js';

type PlayCardPayload = Extract<EngineAction, { type: 'ACTION_PLAY_CARD' }>['payload'];

function notUsableNow(message: string): never {
  throw new EngineError('CARD_NOT_USABLE_NOW', message);
}

function reload(state: GameState, actorId: string, effect: Extract<ActionCard['effect'], { kind: 'RELOAD' }>): void {
  const weapon = weaponInHandSlots(state, actorId, effect.weaponHint);
  if (!weapon) {
    throw new EngineError(
      'WEAPON_NOT_AVAILABLE',
      effect.weaponHint
        ? 'Нужного Оружия нет в слотах рук: перезаряжать нечего.'
        : 'В слотах рук нет Оружия: нечего перезаряжать.',
    );
  }
  if (weapon.ammo === null) return;
  if (weapon.maxAmmo !== null && weapon.ammo >= weapon.maxAmmo) {
    throw new EngineError('WEAPON_FULL', `«${weapon.name}» уже заряжен полностью (${weapon.ammo}/${weapon.maxAmmo}).`);
  }
  weapon.ammo = Math.min(weapon.ammo + effect.ammoGain, weapon.maxAmmo ?? weapon.ammo + effect.ammoGain);
}

function repairOrEngine(state: GameState, actorId: string, option: string | undefined): void {
  if (isEngineOption(option)) {
    setEngineState(state, actorId, option);
    return;
  }
  if (option !== undefined && option !== CARD_OPTION.FIX_ROOM) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      'Выберите: сбросить Неисправность, починить или повредить Двигатель.',
    );
  }
  fixRoomMalfunction(state, actorId);
}

function rest(state: GameState, actorId: string): void {
  const player = requirePlayer(state, actorId);
  if (!player.actionDeck.hand.some(isContaminationCard)) {
    throw new EngineError('NO_CONTAMINATION', 'На руке нет карт Заражения — «Отдых» нечего сканировать.');
  }
  let infected = false;
  const nextHand: typeof player.actionDeck.hand = [];
  for (const entry of player.actionDeck.hand) {
    if (!isContaminationCard(entry)) {
      nextHand.push(entry);
      continue;
    }
    entry.isScanned = true;
    if (entry.isInfected) {
      infected = true;
      nextHand.push(entry);
    }
  }
  player.actionDeck.hand = nextHand;
  if (!infected) return;
  if (player.hasLarva) receiveContamination(state, actorId);
  else player.hasLarva = true;
}

function demolition(state: GameState, actorId: string, payload: PlayCardPayload): void {
  const room = requireRoom(state, actorId);
  if (payload.option === CARD_OPTION.MALFUNCTION) {
    placeMalfunctionFromCard(state, room.id);
    return;
  }
  if (!payload.targetCorridorId) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Разрушение»: выберите Дверь в коридоре вашей комнаты.');
  }
  const corridor = state.ship.corridors[payload.targetCorridorId];
  if (!corridor) throw new EngineError('UNKNOWN_CORRIDOR', 'Такого коридора нет на карте.');
  if (corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Разрушить Дверь можно только в коридоре вашей комнаты.');
  }
  if (corridor.doorState === 'DESTROYED') {
    throw new EngineError('DOOR_DESTROYED', 'Эта Дверь уже разрушена.');
  }
  corridor.doorState = 'DESTROYED';
}

function accessDenied(state: GameState, actorId: string, payload: PlayCardPayload): void {
  const room = requireRoom(state, actorId);
  if (!room.hasComputer) {
    throw new EngineError('NO_COMPUTER', '«Отказ в доступе» работает только в комнате с Компьютером.');
  }
  if (payload.option === CARD_OPTION.ROOM_ACTION) {
    notUsableNow('Бесплатные Действия комнат ещё не реализованы — используйте маркер Неисправности.');
  }
  const target = requireTargetRoom(
    state,
    payload.targetRoomId,
    'Выберите комнату с Компьютером для маркера Неисправности.',
  );
  if (!target.hasComputer) throw new EngineError('NO_COMPUTER', 'В выбранном отсеке нет Компьютера.');
  placeMalfunctionFromCard(state, target.id);
}

function reconnaissance(state: GameState, actorId: string, targetRoomId: number | undefined): void {
  const room = requireRoom(state, actorId);
  const target = requireTargetRoom(state, targetRoomId, '«Разведка»: выберите соседний отсек.');
  if (target.id === room.id) throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
  const path = requireOpenPath(state, room.id, target.id);
  movePlayer(state, actorId, target.id, path[0]!.id, { kind: 'NONE' });
}

function pyrotechnic(state: GameState, actorId: string, payload: PlayCardPayload): void {
  const room = requireRoom(state, actorId);
  if (payload.option === CARD_OPTION.EXTINGUISH) {
    if (!room.hasFire) throw new EngineError('NO_FIRE', 'В вашем отсеке нет маркера Пожара.');
    room.hasFire = false;
    return;
  }
  if (room.hasFire) throw new EngineError('FIRE_PRESENT', 'В вашем отсеке уже горит Пожар.');
  discardInventoryItem(state, actorId, payload.targetItemId);
  placeFireFromCard(state, room.id);
}

function order(state: GameState, actorId: string, payload: PlayCardPayload): void {
  if (!payload.targetPlayerId) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Приказ»: выберите Персонажа в вашей комнате.');
  }
  if (payload.targetPlayerId === actorId) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Приказ» перемещает другого Персонажа, не вас.');
  }
  if (payload.targetRoomId === undefined) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Приказ»: выберите соседний отсек для перемещения.');
  }
  executeReposition(
    state,
    actorId,
    [{ playerId: payload.targetPlayerId, targetRoomId: payload.targetRoomId }],
    1,
    '«Приказ»',
  );
}

export function applyActionCardEffect(
  state: GameState,
  actorId: string,
  card: ActionCard,
  payload: PlayCardPayload,
): void {
  const effect = card.effect;
  switch (effect.kind) {
    case 'RELOAD':
      return reload(state, actorId, effect);
    case 'ORDER':
      return order(state, actorId, payload);
    case 'MOTIVATION':
      return motivateRoom(state, actorId);
    case 'BASIC_REPAIR':
    case 'REPAIR':
    case 'FAST_REPAIR':
      return repairOrEngine(state, actorId, payload.option);
    case 'INGENUITY':
      if (payload.option === CARD_OPTION.CRAFT) {
        notUsableNow('Создание Предмета картой выполняется базовым Действием [1] на панели инвентаря.');
      }
      return repairOrEngine(state, actorId, payload.option);
    case 'DISMISS':
      return notUsableNow(
        '«Отставить» отменяет Действия других Игроков в вашей комнате — одновременные действия ещё не реализованы.',
      );
    case 'STEEL_NERVES':
      return notUsableNow('«Стальные нервы» сбрасываются во время Внезапной Атаки — движок предложит карту сам.');
    case 'SEARCH':
      return performRoomSearch(state, actorId, payload.targetDeckColor);
    case 'SCAVENGE':
      return performScavenge(state, actorId, payload.targetDeckColor);
    case 'REST':
      return rest(state, actorId);
    case 'DEMOLITION':
      return demolition(state, actorId, payload);
    case 'SHIP_KNOWLEDGE':
      if (payload.option === CARD_OPTION.DOOR) return toggleDoor(state, actorId, payload.targetCorridorId, true);
      return peekRoom(state, actorId, payload.targetRoomId, true);
    case 'COMPUTER_SKILLS':
      if (payload.option === CARD_OPTION.ROOM_ACTION) {
        notUsableNow('Бесплатные Действия комнат ещё не реализованы — используйте вариант с Дверью.');
      }
      return toggleDoor(state, actorId, payload.targetCorridorId, false);
    case 'PILOTING':
      return notUsableNow(
        '«Пилотирование»: бесплатные Действия комнат и проверка Координат картой ещё не реализованы.',
      );
    case 'OLD_FRIEND':
      return notUsableNow('«Старый друг»: бесплатные Действия комнат ещё не реализованы.');
    case 'INTRANET':
      return notUsableNow('«Интранет»: бесплатные Действия комнат ещё не реализованы.');
    case 'ACCESS_DENIED':
      return accessDenied(state, actorId, payload);
    case 'THREAT_ASSESSMENT':
      return threatAssessment(state, actorId, payload.option);
    case 'TECH_CORRIDORS':
      moveViaTechnicalCorridors(state, actorId, payload.targetRoomId);
      performPass(state, actorId);
      return;
    case 'RECONNAISSANCE':
      return reconnaissance(state, actorId, payload.targetRoomId);
    case 'PYROTECHNIC':
      return pyrotechnic(state, actorId, payload);
    case 'SUPPRESSIVE_FIRE':
    case 'BURST_FIRE':
    case 'AIMED_FIRE':
    case 'ADRENALINE':
      throw new EngineError('INVALID_DECISION_OPTION', `Боевая карта «${card.name}» требует боевых параметров.`);
    default: {
      const unknownKind: never = effect;
      throw new EngineError(
        'ACTION_NOT_IMPLEMENTED',
        `Эффект карты «${card.name}» (kind: ${(unknownKind as { kind: string }).kind}) ещё не реализован.`,
      );
    }
  }
}
