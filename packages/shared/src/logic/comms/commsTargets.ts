import { CRAFTED_ITEM_CARDS } from '../../data/crafting.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../../data/itemCards.js';
import { QUEST_DEFINITIONS } from '../../data/questItems.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../../data/roomDefinitions.js';
import { STARTING_WEAPONS } from '../../data/startingItems.js';
import type { CommsAddressee, CommsClaim, CommsIntent, CommsReaction, CommsRequestTopic } from '../../types/comms.js';
import type { GameState } from '../../types/state.js';
import { EngineError } from '../engineErrors.js';
import { findCommsMessage } from './commsState.js';

const COURSE_MARKERS = new Set(['A', 'B', 'C', 'D']);
const DESTINATIONS = new Set(['EARTH', 'MARS', 'VENUS', 'DEEP_SPACE']);
const ROOM_DEFINITION_IDS = new Set([...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS].map((room) => room.id));

export const KNOWN_ITEM_NAMES: ReadonlySet<string> = new Set([
  ...[...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS, ...RED_ITEM_CARDS, ...CRAFTED_ITEM_CARDS].map((card) => card.name),
  ...Object.values(STARTING_WEAPONS).map((card) => card.name),
  ...QUEST_DEFINITIONS.map((quest) => quest.name),
]);

function unknownTarget(message: string): never {
  throw new EngineError('COMMS_UNKNOWN_TARGET', message);
}

function isOnShip(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  return player !== undefined && !player.isDead && !player.hasEscapedInPod;
}

export function requireAddressee(state: GameState, authorId: string, to: CommsAddressee): void {
  if (to === 'ALL') return;
  if (to === authorId) throw new EngineError('COMMS_INVALID_ADDRESSEE', 'Сообщение самому себе не отправить.');
  if (!isOnShip(state, to)) {
    throw new EngineError(
      'COMMS_INVALID_ADDRESSEE',
      'Адресата нет на корабле: он погиб, покинул корабль или не существует.',
    );
  }
}

function requireEngine(engineNumber: number): void {
  if (![1, 2, 3].includes(engineNumber)) unknownTarget(`Двигателя №${engineNumber} нет.`);
}

function requireRoom(state: GameState, roomId: number): void {
  if (!state.ship.rooms[roomId]) unknownTarget(`Комнаты #${roomId} нет на корабле.`);
}

function requireRoomDefinition(definitionId: string): void {
  if (!ROOM_DEFINITION_IDS.has(definitionId)) unknownTarget(`Комнаты типа ${definitionId} в игре нет.`);
}

function requireItemName(itemName: string | undefined): void {
  if (!itemName || !KNOWN_ITEM_NAMES.has(itemName)) unknownTarget(`Предмета «${itemName ?? ''}» в игре нет.`);
}

function requirePod(state: GameState, podId: string): void {
  if (!state.ship.escapePods[podId]) unknownTarget('Такой Спасательной Капсулы нет.');
}

export function requireClaimTarget(state: GameState, claim: CommsClaim): void {
  switch (claim.topic) {
    case 'ENGINE_STATUS':
    case 'ENGINE_DEED':
      return requireEngine(claim.engineNumber);
    case 'COORDINATES':
      if (!COURSE_MARKERS.has(claim.marker) || !DESTINATIONS.has(claim.destination)) {
        unknownTarget('Такого маркера Курса или пункта назначения нет.');
      }
      return;
    case 'ROOM_IDENTITY':
      requireRoom(state, claim.roomId);
      return requireRoomDefinition(claim.definitionId);
    case 'HAS_ITEM':
      return requireItemName(claim.itemName);
    case 'COURSE':
    case 'NOT_INFECTED':
      return;
  }
}

export function requireIntentTarget(state: GameState, authorId: string, intent: CommsIntent): void {
  switch (intent.topic) {
    case 'SEEK_ROOM':
      return requireRoomDefinition(intent.definitionId);
    case 'GO_TO_POD':
      return requirePod(state, intent.podId);
    case 'COVER_PLAYER':
      if (intent.playerId === authorId || !isOnShip(state, intent.playerId)) {
        unknownTarget('Прикрывать можно только другого Персонажа на корабле.');
      }
      return;
    case 'GO_TO_ROOM':
      return requireRoom(state, intent.roomId);
    case 'EXPLORE':
    case 'GO_TO_ENGINES':
    case 'GO_TO_BRIDGE':
    case 'GO_HEAL':
    case 'GO_TO_HIBERNATION':
      return;
  }
}

export function requireRequestTarget(state: GameState, request: CommsRequestTopic): void {
  switch (request.topic) {
    case 'NEED_ITEM':
      if (request.need === 'SPECIFIC') requireItemName(request.itemName);
      return;
    case 'HELP_KILL':
    case 'EXTINGUISH':
      return requireRoom(state, request.roomId);
    case 'CHECK_ENGINE':
      return requireEngine(request.engineNumber);
    case 'SET_DOOR':
      if (!state.ship.corridors[request.corridorId]) unknownTarget('Такого Коридора нет на карте.');
      if (request.doorState !== 'OPEN' && request.doorState !== 'CLOSED') {
        unknownTarget('Дверь можно просить только открыть или закрыть.');
      }
      return;
    case 'WAIT_IN_POD':
      return requirePod(state, request.podId);
    case 'CHECK_COORDINATES':
    case 'NO_SELF_DESTRUCT':
      return;
  }
}

function playerOfLogEvent(event: object): string | undefined {
  return 'playerId' in event && typeof event.playerId === 'string' ? event.playerId : undefined;
}

export function requireReactionTarget(state: GameState, authorId: string, reaction: CommsReaction): void {
  if (reaction.topic === 'THANKS_FOR_DEED') {
    const entry = state.gameLog.find((candidate) => candidate.sequence === reaction.logSequence);
    const doerId = entry ? playerOfLogEvent(entry.event) : undefined;
    if (!doerId || doerId === authorId) unknownTarget('Благодарить можно только за чужой поступок из журнала.');
    return;
  }
  const target = findCommsMessage(state, reaction.messageId);
  if (!target || target.authorId === null || target.authorId === authorId) {
    unknownTarget('Реагировать можно только на чужое сообщение Рации.');
  }
  if (reaction.topic === 'DISBELIEVE' && target.kind !== 'CLAIM') {
    unknownTarget('«Не верю» относится только к Заявлению.');
  }
}
