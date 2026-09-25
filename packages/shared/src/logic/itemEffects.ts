import type { EngineAction } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { GameState } from '../types/state.js';
import { getItemEffectKind } from '../data/itemEffectKinds.js';
import { EngineError } from './engineErrors.js';
import { movePlayer } from './movement.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { checkInjuryResult } from './shoot.js';
import { sufferLightWounds } from './characterDamage.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { requireIntruder } from './intruderPlacement.js';
import { getRoomDeckColor } from './search.js';
import { drawSharedCard } from './cardPiles.js';
import { applyCraftedItemEffect } from './craftedItemEffects.js';
import {
  chooseIntruderInRoom,
  drawActionCards,
  energyWeaponInHandSlots,
  fixRoomMalfunction,
  hasDrawableActionCards,
  isContaminationCard,
  isEngineOption,
  livingCharactersInRoom,
  moveViaTechnicalCorridors,
  neighbourRoomIds,
  peekRoom,
  relocatePlayer,
  requireOwnOrNeighbourRoom,
  requirePlayer,
  requireRoom,
  requireTargetRoom,
  roomOfIntruder,
  setEngineState,
  toggleDoor,
} from './cardEffectsShared.js';

export type UseItemPayload = Extract<EngineAction, { type: 'ACTION_USE_ITEM' }>['payload'];

export type ItemDisposal = 'KEEP' | 'DISCARD' | 'ATTACHED';

function notUsableNow(message: string): never {
  throw new EngineError('CARD_NOT_USABLE_NOW', message);
}

function energyCharge(state: GameState, actorId: string, payload: UseItemPayload): void {
  if (payload.option === CARD_OPTION.DOOR) return toggleDoor(state, actorId, payload.targetCorridorId, true);
  const weapon = energyWeaponInHandSlots(state, actorId);
  if (!weapon) throw new EngineError('WEAPON_NOT_AVAILABLE', 'В слотах рук нет Энергооружия (стр. 22).');
  if (weapon.maxAmmo !== null && (weapon.ammo ?? 0) >= weapon.maxAmmo) {
    throw new EngineError('WEAPON_FULL', `«${weapon.name}» уже заряжен полностью.`);
  }
  weapon.ammo = weapon.maxAmmo;
}

function extendedMagazine(state: GameState, actorId: string): void {
  const weapon = energyWeaponInHandSlots(state, actorId);
  if (!weapon) throw new EngineError('WEAPON_NOT_AVAILABLE', 'Магазин крепится к Энергооружию в слоте руки.');
  weapon.ammo = (weapon.ammo ?? 0) + 2;
  weapon.maxAmmo = (weapon.maxAmmo ?? 0) + 2;
}

function woundIntruder(state: GameState, intruderId: string, wounds: number, actorId: string): void {
  if (!state.intrudersPool.boardTokens.some((token) => token.id === intruderId)) return;
  const intruder = requireIntruder(state, intruderId);
  checkInjuryResult(state, intruderId, intruder.type, wounds, actorId);
}

function grenade(state: GameState, actorId: string, payload: UseItemPayload): void {
  const roomId =
    payload.targetRoomId ?? (payload.targetIntruderId ? roomOfIntruder(state, payload.targetIntruderId) : undefined);
  const target = requireOwnOrNeighbourRoom(state, actorId, roomId);
  const chosenId = chooseIntruderInRoom(target, payload.targetIntruderId);
  const bystanders = target.occupantIntruderIds.filter((id) => id !== chosenId);
  const characters = livingCharactersInRoom(state, target);
  woundIntruder(state, chosenId, 2, actorId);
  for (const intruderId of bystanders) woundIntruder(state, intruderId, 1, actorId);
  for (const characterId of characters) sufferLightWounds(state, characterId, 1);
}

function smokeGrenade(state: GameState, actorId: string, targetRoomId: number | undefined): void {
  const room = requireRoom(state, actorId);
  const others = livingCharactersInRoom(state, room).filter((id) => id !== actorId);
  if (others.length > 0) {
    notUsableNow(
      'Сброс карт другими Персонажами требует их одновременного решения — пока граната работает, когда вы одни в комнате.',
    );
  }
  const target = requireTargetRoom(state, targetRoomId, 'Выберите соседний отсек для перемещения.');
  if (target.id === room.id) throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
  const path = requireOpenPath(state, room.id, target.id);
  movePlayer(state, actorId, target.id, path[0]!.id, { kind: 'ROLL' });
}

function decoy(state: GameState, actorId: string, targetRoomId: number | undefined): void {
  const room = requireRoom(state, actorId);
  const target = requireTargetRoom(state, targetRoomId, 'Выберите соседний отсек, куда уйдут Чужие.');
  const neighbours = neighbourRoomIds(state, room.id);
  if (!neighbours.includes(target.id)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Отсек должен быть соседним с вашей комнатой.');
  }
  const sources = new Set(neighbours.filter((id) => id !== target.id));
  const moving = state.intrudersPool.boardTokens.filter((token) => sources.has(token.roomId));
  if (moving.length === 0) {
    throw new EngineError('UNKNOWN_INTRUDER', 'В других соседних комнатах нет Чужих — приманивать некого.');
  }
  const inCombat = moving.some((token) => {
    const from = state.ship.rooms[token.roomId];
    return from !== undefined && livingCharactersInRoom(state, from).length > 0;
  });
  if (inCombat) {
    notUsableNow(
      'Атака Чужих в Бою перед перемещением Приманкой ещё не реализована — выберите момент, когда рядом нет Боя.',
    );
  }
  for (const token of moving) {
    const from = state.ship.rooms[token.roomId];
    if (from) from.occupantIntruderIds = from.occupantIntruderIds.filter((id) => id !== token.id);
    token.roomId = target.id;
    target.occupantIntruderIds.push(token.id);
  }
}

function militaryStimulants(state: GameState, actorId: string, cardIds: readonly string[]): void {
  const player = requirePlayer(state, actorId);
  const chosen = new Set(cardIds);
  if (chosen.size !== cardIds.length) {
    throw new EngineError('PAYMENT_CARD_DUPLICATE', 'Карта для сброса выбрана дважды.');
  }
  const handIds = new Set(player.actionDeck.hand.map((card) => card.id));
  if (cardIds.some((id) => !handIds.has(id))) {
    throw new EngineError('PAYMENT_CARD_NOT_IN_HAND', 'Одной из карт для сброса нет на руке.');
  }
  const kept: typeof player.actionDeck.hand = [];
  for (const card of player.actionDeck.hand) {
    if (chosen.has(card.id)) player.actionDeck.discard.push(card);
    else kept.push(card);
  }
  player.actionDeck.hand = kept;
  drawActionCards(state, actorId, cardIds.length + 1);
}

function repairTools(state: GameState, actorId: string, payload: UseItemPayload, allowsDoor: boolean): void {
  if (isEngineOption(payload.option)) return setEngineState(state, actorId, payload.option);
  if (payload.option === CARD_OPTION.COMBINE_HEAVY) {
    notUsableNow('Объединение двух Тяжёлых предметов в один слот ещё не реализовано.');
  }
  if (payload.option === CARD_OPTION.DOOR) {
    if (!allowsDoor) throw new EngineError('INVALID_DECISION_OPTION', 'Изолента не открывает и не закрывает Двери.');
    return toggleDoor(state, actorId, payload.targetCorridorId, false);
  }
  fixRoomMalfunction(state, actorId);
}

function fireExtinguisher(state: GameState, actorId: string, payload: UseItemPayload): void {
  const room = requireRoom(state, actorId);
  if (payload.option === CARD_OPTION.RETREAT) {
    const intruderId = chooseIntruderInRoom(room, payload.targetIntruderId);
    resolveIntruderRetreat(state, intruderId, null);
    return;
  }
  if (!room.hasFire) throw new EngineError('NO_FIRE', 'В вашем отсеке нет маркера Пожара.');
  room.hasFire = false;
}

function spaceSuit(state: GameState, actorId: string, targetRoomId: number | undefined): void {
  const player = requirePlayer(state, actorId);
  const room = requireRoom(state, actorId);
  if (getRoomDeckColor(room.definitionId) !== 'YELLOW') {
    throw new EngineError('WRONG_ROOM_COLOR', 'Скафандр работает только в Жёлтой комнате.');
  }
  const target = requireTargetRoom(state, targetRoomId, 'Выберите другую Жёлтую комнату.');
  if (getRoomDeckColor(target.definitionId) !== 'YELLOW') {
    throw new EngineError('WRONG_ROOM_COLOR', 'Отсек назначения не Жёлтый.');
  }
  if (target.id === room.id) throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
  const kept: typeof player.actionDeck.hand = [];
  for (const card of player.actionDeck.hand) {
    if (isContaminationCard(card)) kept.push(card);
    else player.actionDeck.discard.push(card);
  }
  player.actionDeck.hand = kept;
  relocatePlayer(state, player, room, target);
}

function nemesisPlans(state: GameState, actorId: string, payload: UseItemPayload): void {
  const unexploredCount = Object.values(state.ship.rooms).filter((room) => !room.isExplored).length;
  const picks = [payload.targetRoomId, payload.targetRoomId2].filter((id): id is number => id !== undefined);
  const distinct = [...new Set(picks)];
  const required = Math.min(2, unexploredCount);
  if (distinct.length < required || distinct.length === 0) {
    throw new EngineError('INVALID_DECISION_OPTION', `Выберите ${required} разных Неисследованных отсека.`);
  }
  for (const roomId of distinct) peekRoom(state, actorId, roomId, false);
}

function untreatedWound(state: GameState, actorId: string) {
  return requirePlayer(state, actorId).seriousWounds.find((wound) => !wound.isTreated);
}

function treatSerious(state: GameState, actorId: string): void {
  const wound = untreatedWound(state, actorId);
  if (!wound) throw new EngineError('NO_WOUNDS', 'Необработанных Тяжёлых Травм нет.');
  wound.isTreated = true;
}

function healLight(state: GameState, actorId: string): void {
  const player = requirePlayer(state, actorId);
  if (player.lightWounds <= 0) throw new EngineError('NO_WOUNDS', 'Лёгких Травм нет — лечить нечего.');
  player.lightWounds = 0;
}

function healTreated(state: GameState, actorId: string): void {
  const player = requirePlayer(state, actorId);
  const index = player.seriousWounds.findIndex((wound) => wound.isTreated);
  if (index === -1) throw new EngineError('NO_WOUNDS', 'Обработанных Тяжёлых Травм нет — вылечивать нечего.');
  const [healed] = player.seriousWounds.splice(index, 1);
  if (healed) state.decks.seriousWounds.discard.push({ ...healed, isTreated: false });
}

function medical(state: GameState, actorId: string, option: string | undefined, allowsHealTreated: boolean): void {
  if (option === CARD_OPTION.HEAL_TREATED) {
    if (!allowsHealTreated) {
      throw new EngineError(
        'INVALID_DECISION_OPTION',
        'Бинты не вылечивают Обработанные Тяжёлые Травмы — это умеет Аптечка.',
      );
    }
    return healTreated(state, actorId);
  }
  if (option === CARD_OPTION.TREAT_SERIOUS) return treatSerious(state, actorId);
  if (option === CARD_OPTION.HEAL_LIGHT) return healLight(state, actorId);
  if (untreatedWound(state, actorId)) return treatSerious(state, actorId);
  return healLight(state, actorId);
}

function alcohol(state: GameState, actorId: string, cardIds: readonly string[] | undefined): void {
  const player = requirePlayer(state, actorId);
  const chosenId = cardIds?.[0];
  const index = player.actionDeck.hand.findIndex(
    (card) => isContaminationCard(card) && (chosenId === undefined || card.id === chosenId),
  );
  if (index === -1) {
    throw new EngineError(
      'NO_CONTAMINATION',
      chosenId ? 'Выбранной карты Заражения нет на руке.' : 'На руке нет карт Заражения.',
    );
  }
  const [removed] = player.actionDeck.hand.splice(index, 1);
  if (!removed || !isContaminationCard(removed)) return;
  if (!removed.isInfected) return;
  const fresh = drawSharedCard(state, state.decks.contamination, 'Заражение');
  fresh.isScanned = false;
  player.actionDeck.hand.push(fresh);
}

function clothes(state: GameState, actorId: string, option: string | undefined): void {
  const player = requirePlayer(state, actorId);
  if (option === CARD_OPTION.TREAT_SERIOUS) return treatSerious(state, actorId);
  if (option === CARD_OPTION.SLIME || player.hasSlime) {
    if (!player.hasSlime) throw new EngineError('NO_SLIME', 'На планшете нет маркера Слизи.');
    player.hasSlime = false;
    return;
  }
  treatSerious(state, actorId);
}

function adrenalineInjection(state: GameState, actorId: string): void {
  const player = requirePlayer(state, actorId);
  drawActionCards(state, actorId, 1);
  player.hasAdrenalineRush = true;
}

function syntheticFood(state: GameState, actorId: string): void {
  if (!hasDrawableActionCards(requirePlayer(state, actorId))) {
    throw new EngineError('CARD_SUPPLY_EXHAUSTED', 'Колода Действий и сброс пусты — брать нечего.');
  }
  drawActionCards(state, actorId, 2);
}

export function applyItemEffect(
  state: GameState,
  actorId: string,
  item: ItemCard,
  payload: UseItemPayload,
): ItemDisposal {
  const kind = getItemEffectKind(item);
  switch (kind) {
    case 'ENERGY_CHARGE':
      energyCharge(state, actorId, payload);
      break;
    case 'EXTENDED_MAGAZINE':
      extendedMagazine(state, actorId);
      return 'ATTACHED';
    case 'GRENADE':
      grenade(state, actorId, payload);
      break;
    case 'SMOKE_GRENADE':
      smokeGrenade(state, actorId, payload.targetRoomId);
      break;
    case 'DECOY':
      decoy(state, actorId, payload.targetRoomId);
      break;
    case 'RECON_DRONE':
      peekRoom(state, actorId, payload.targetRoomId, true);
      break;
    case 'MILITARY_STIMULANTS':
      militaryStimulants(state, actorId, payload.targetCardIds ?? []);
      break;
    case 'DUCT_TAPE':
      repairTools(state, actorId, payload, false);
      break;
    case 'TOOLS':
      repairTools(state, actorId, payload, true);
      break;
    case 'FIRE_EXTINGUISHER':
      fireExtinguisher(state, actorId, payload);
      break;
    case 'TECH_CORRIDOR_PLANS':
      moveViaTechnicalCorridors(state, actorId, payload.targetRoomId);
      break;
    case 'SPACE_SUIT':
      spaceSuit(state, actorId, payload.targetRoomId);
      break;
    case 'NEMESIS_PLANS':
      nemesisPlans(state, actorId, payload);
      break;
    case 'BANDAGES':
      medical(state, actorId, payload.option, false);
      break;
    case 'MEDKIT':
      medical(state, actorId, payload.option, true);
      break;
    case 'ALCOHOL':
      alcohol(state, actorId, payload.targetCardIds);
      break;
    case 'CLOTHES':
      clothes(state, actorId, payload.option);
      break;
    case 'ADRENALINE_INJECTION':
      adrenalineInjection(state, actorId);
      break;
    case 'SYNTHETIC_FOOD':
      syntheticFood(state, actorId);
      break;
    case 'ANTIDOTE':
    case 'TASER':
    case 'MOLOTOV':
      applyCraftedItemEffect(state, actorId, kind, payload);
      break;
    case 'WEAPON':
      notUsableNow(`«${item.name}» — Оружие: оно используется Действием «Стрельба».`);
      break;
    case 'UNKNOWN':
      notUsableNow(`Эффект Предмета «${item.name}» в этой версии ещё не реализован.`);
      break;
  }
  return item.isSingleUse ? 'DISCARD' : 'KEEP';
}
