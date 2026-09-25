import type { ActionDeckCard, ItemCard } from '../types/cards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { PlayerState } from '../types/entities.js';
import type { ExplorationEffect, RoomId, RoomState } from '../types/rooms.js';
import type { EngineNumber, GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { reshuffleDiscard } from './cardPiles.js';
import { placeDoorToken, placeFireMarker, placeMalfunctionMarker } from './markers.js';
import { endGame } from './gameEnd.js';

type ItemHandSlot = Extract<PlayerState['handSlots'][number], { source: 'ITEM' }>;

export function requirePlayer(state: GameState, actorId: string): PlayerState {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}`);
  return player;
}

export function requireRoom(state: GameState, actorId: string): RoomState {
  const player = requirePlayer(state, actorId);
  const room = state.ship.rooms[player.roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Отсек персонажа не найден на карте.');
  return room;
}

export function requireTargetRoom(state: GameState, roomId: RoomId | undefined, missingMessage: string): RoomState {
  if (roomId === undefined) throw new EngineError('INVALID_DECISION_OPTION', missingMessage);
  const room = state.ship.rooms[roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
  return room;
}

export function neighbourRoomIds(state: GameState, roomId: RoomId): RoomId[] {
  const neighbours: RoomId[] = [];
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.fromRoomId !== roomId && corridor.toRoomId !== roomId) continue;
    const other = corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
    if (!neighbours.includes(other)) neighbours.push(other);
  }
  return neighbours;
}

export function requireOwnOrNeighbourRoom(state: GameState, actorId: string, roomId: RoomId | undefined): RoomState {
  const own = requireRoom(state, actorId);
  const target = requireTargetRoom(state, roomId, 'Выберите вашу или соседнюю комнату.');
  if (target.id !== own.id && !neighbourRoomIds(state, own.id).includes(target.id)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Цель должна быть в вашей или соседней комнате.');
  }
  return target;
}

export function chooseIntruderInRoom(room: RoomState, targetIntruderId: string | undefined): string {
  if (room.occupantIntruderIds.length === 0) {
    throw new EngineError('UNKNOWN_INTRUDER', 'В выбранной комнате нет Чужих.');
  }
  if (targetIntruderId === undefined) {
    if (room.occupantIntruderIds.length > 1) {
      throw new EngineError('INVALID_DECISION_OPTION', 'В комнате несколько Чужих — выберите цель.');
    }
    return room.occupantIntruderIds[0]!;
  }
  if (!room.occupantIntruderIds.includes(targetIntruderId)) {
    throw new EngineError('UNKNOWN_INTRUDER', 'Выбранного Чужого нет в этой комнате.');
  }
  return targetIntruderId;
}

export function roomOfIntruder(state: GameState, intruderId: string): RoomId | undefined {
  return state.intrudersPool.boardTokens.find((token) => token.id === intruderId)?.roomId;
}

export function livingCharactersInRoom(state: GameState, room: RoomState): string[] {
  return room.occupantPlayerIds.filter((id) => {
    const occupant = state.players[id];
    return occupant !== undefined && !occupant.isDead && !occupant.hasEscapedInPod;
  });
}

export function toggleDoor(
  state: GameState,
  actorId: string,
  corridorId: string | undefined,
  adjacentOnly: boolean,
): void {
  const room = requireRoom(state, actorId);
  if (!corridorId) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран коридор с Дверью.');
  }
  const corridor = state.ship.corridors[corridorId];
  if (!corridor) throw new EngineError('UNKNOWN_CORRIDOR', 'Такого коридора нет на карте.');
  if (adjacentOnly && corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Дверь можно открыть/закрыть только в коридоре вашей комнаты.');
  }
  if (corridor.doorState === 'DESTROYED') {
    throw new EngineError('DOOR_DESTROYED', 'Эта Дверь уже разрушена — открывать и закрывать её нельзя.');
  }
  if (corridor.doorState === 'CLOSED') {
    corridor.doorState = 'OPEN';
    return;
  }
  if (placeDoorToken(state, corridor.id) === 'NO_TOKEN_IN_SUPPLY') {
    throw new EngineError(
      'DOOR_TOKEN_SUPPLY_EXHAUSTED',
      'Жетонов Дверей нет ни в запасе, ни на поле — закрыть Дверь нечем.',
    );
  }
}

export function placeFireFromCard(state: GameState, roomId: RoomId): void {
  const placement = placeFireMarker(state, roomId);
  if (placement === 'ALREADY_PRESENT') {
    throw new EngineError('FIRE_PRESENT', 'В этой комнате уже горит Пожар.');
  }
  if (placement === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');
}

export function placeMalfunctionFromCard(state: GameState, roomId: RoomId): void {
  const placement = placeMalfunctionMarker(state, roomId);
  if (placement === 'ALREADY_PRESENT') {
    throw new EngineError('MALFUNCTION_PRESENT', 'В этой комнате уже стоит маркер Неисправности.');
  }
  if (placement === 'FORBIDDEN_ROOM') {
    throw new EngineError('INVALID_DECISION_OPTION', 'В этот отсек маркер Неисправности не кладётся (стр. 17).');
  }
  if (placement === 'HULL_BREACH') endGame(state, 'HULL_BREACH');
}

export function engineNumberOfRoom(room: RoomState): EngineNumber | null {
  const match = /^ENGINE_0([123])$/.exec(room.definitionId ?? '');
  return match ? (Number(match[1]) as EngineNumber) : null;
}

export function isEngineOption(option: string | undefined): boolean {
  return option === CARD_OPTION.ENGINE_REPAIR || option === CARD_OPTION.ENGINE_DAMAGE;
}

export function setEngineState(state: GameState, actorId: string, option: string | undefined): void {
  const room = requireRoom(state, actorId);
  const engineNumber = engineNumberOfRoom(room);
  if (engineNumber === null) {
    throw new EngineError('ENGINE_NOT_HERE', 'Починить или повредить Двигатель можно только в Машинном Отсеке.');
  }
  const engine = state.ship.engines[engineNumber];
  if (!engine) throw new EngineError('UNKNOWN_ENGINE', `Двигатель №${engineNumber} не найден.`);
  const shouldWork = option === CARD_OPTION.ENGINE_REPAIR;
  const orderChanged = engine.isWorking !== shouldWork;
  engine.isWorking = shouldWork;
  const player = requirePlayer(state, actorId);
  if (!player.inspectedEngines.includes(engineNumber)) player.inspectedEngines.push(engineNumber);
  appendGameLog(state, {
    type: 'ENGINE_TOGGLED',
    playerId: actorId,
    roomId: room.id,
    engineNumber,
    isWorking: engine.isWorking,
    orderChanged,
  });
}

export function fixRoomMalfunction(state: GameState, actorId: string): void {
  const room = requireRoom(state, actorId);
  if (!room.hasMalfunction) {
    throw new EngineError('NO_MALFUNCTION', 'В вашем отсеке нет маркера Неисправности.');
  }
  room.hasMalfunction = false;
}

export function peekRoom(state: GameState, actorId: string, roomId: RoomId | undefined, withEffect: boolean): void {
  const room = requireTargetRoom(state, roomId, 'Не выбран отсек для подглядывания.');
  if (room.isExplored) {
    throw new EngineError('ROOM_ALREADY_EXPLORED', 'Этот отсек уже исследован — смотреть его оборот незачем.');
  }
  appendGameLog(state, {
    type: 'ROOM_PEEKED',
    playerId: actorId,
    roomId: room.id,
    roomName: `Отсек #${room.id}`,
    effect: withEffect ? (room.explorationEffect as ExplorationEffect | null) : null,
    itemsCount: room.itemsCount,
    peekCount: 1,
  });
}

function itemSlots(player: PlayerState): ItemHandSlot[] {
  return player.handSlots.filter((slot): slot is ItemHandSlot => slot.source === 'ITEM');
}

export function weaponInHandSlots(state: GameState, actorId: string, weaponHint?: string): ItemCard | null {
  const weapons = itemSlots(requirePlayer(state, actorId))
    .map((slot) => slot.card)
    .filter((card) => card.isWeapon);
  if (weaponHint) return weapons.find((card) => card.id.includes(weaponHint)) ?? null;
  return weapons[0] ?? null;
}

export function energyWeaponInHandSlots(state: GameState, actorId: string): ItemCard | null {
  return (
    itemSlots(requirePlayer(state, actorId))
      .map((slot) => slot.card)
      .find((card) => card.isWeapon && card.isEnergyWeapon === true) ?? null
  );
}

export function discardItemCard(state: GameState, item: ItemCard): void {
  if (item.origin === 'CRAFTED') {
    state.decks.craftedItems.discard.push(item as GameState['decks']['craftedItems']['discard'][number]);
    return;
  }
  if (item.color === 'RED' || item.color === 'YELLOW' || item.color === 'GREEN') {
    state.decks.items[item.color].discard.push(item);
  }
}

export function discardInventoryItem(state: GameState, actorId: string, itemId: string | undefined): ItemCard {
  const player = requirePlayer(state, actorId);
  if (!itemId) throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран Предмет для сброса.');
  const index = player.inventory.findIndex((item) => item.id === itemId);
  if (index === -1) {
    throw new EngineError('NO_ITEMS_LEFT', 'Выбранный Предмет не найден в инвентаре.');
  }
  const [item] = player.inventory.splice(index, 1);
  discardItemCard(state, item!);
  return item!;
}

export function drawActionCards(state: GameState, playerId: string, count: number): number {
  const deck = requirePlayer(state, playerId).actionDeck;
  let drawn = 0;
  while (drawn < count) {
    if (deck.drawPile.length === 0) {
      if (deck.discard.length === 0) break;
      reshuffleDiscard(state, deck);
    }
    const card = deck.drawPile.shift();
    if (!card) break;
    deck.hand.push(card);
    drawn += 1;
  }
  return drawn;
}

export function hasDrawableActionCards(player: PlayerState): boolean {
  return player.actionDeck.drawPile.length > 0 || player.actionDeck.discard.length > 0;
}

export function isContaminationCard(card: ActionDeckCard): card is Exclude<ActionDeckCard, { characterClass: string }> {
  return !('characterClass' in card);
}

export function moveViaTechnicalCorridors(state: GameState, actorId: string, targetRoomId: RoomId | undefined): void {
  const player = requirePlayer(state, actorId);
  const room = requireRoom(state, actorId);
  if (!room.hasTechnicalCorridorEntrance) {
    throw new EngineError('NO_TECH_ENTRANCE', 'В вашем отсеке нет Входа в Технические Коридоры.');
  }
  const target = requireTargetRoom(state, targetRoomId, 'Не выбран отсек назначения.');
  if (target.id === room.id) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
  }
  if (!target.hasTechnicalCorridorEntrance) {
    throw new EngineError('NO_TECH_ENTRANCE', 'В отсеке назначения нет Входа в Технические Коридоры.');
  }
  relocatePlayer(state, player, room, target);
}

export function relocatePlayer(state: GameState, player: PlayerState, from: RoomState, target: RoomState): void {
  from.occupantPlayerIds = from.occupantPlayerIds.filter((id) => id !== player.id);
  target.occupantPlayerIds.push(player.id);
  player.roomId = target.id;
  if (!target.isExplored) {
    state.interruptQueue.push({
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: player.id,
      roomId: target.id,
      corridorId: '',
    });
  }
}
