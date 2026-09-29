import type { ExchangeTransfer } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import type { ExchangeOfferLine, PendingDecision, PendingExchange } from '../types/decisions.js';
import type { PlayerState } from '../types/entities.js';
import type { ExchangedEntry } from '../types/shipSystemsLog.js';
import type { GameState } from '../types/state.js';
import { queueActionCompletion } from './actionCompletion.js';
import { livingCharactersInRoom, requireRoom } from './cardEffectsShared.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { handSlotCapacity } from './seriousWoundEffects.js';
import { allocateEntityId } from './stateIds.js';

export const EXCHANGE_OPTION = { ACCEPT: 'ACCEPT', DECLINE: 'DECLINE' } as const;

type ExchangeConsentDecision = Extract<PendingDecision, { type: 'EXCHANGE_CONSENT' }>;

type HeldEntry =
  { kind: 'ITEM'; card: ItemCard; fromHandSlot: boolean } | { kind: 'OBJECT'; objectId: string; name: string };

const OBJECT_NAMES = { CORPSE: 'Труп', EGG: 'Яйцо Чужих', INTRUDER_REMAINS: 'Останки Чужого' } as const;

function notAllowed(message: string): never {
  throw new EngineError('EXCHANGE_NOT_ALLOWED', message);
}

function findHeldEntry(player: PlayerState, entryId: string): HeldEntry | null {
  const inInventory = player.inventory.find((card) => card.id === entryId);
  if (inInventory) return { kind: 'ITEM', card: inInventory, fromHandSlot: false };
  for (const slot of player.handSlots) {
    if (slot.source === 'ITEM' && slot.card.id === entryId)
      return { kind: 'ITEM', card: slot.card, fromHandSlot: true };
    if (slot.source === 'OBJECT' && slot.object.id === entryId) {
      return { kind: 'OBJECT', objectId: slot.object.id, name: OBJECT_NAMES[slot.object.kind] };
    }
  }
  return null;
}

function goesToHandSlot(line: Pick<ExchangeOfferLine, 'kind' | 'isHeavy'>, fromHandSlot: boolean): boolean {
  return line.kind === 'OBJECT' || line.isHeavy || fromHandSlot;
}

function offerLine(transfer: ExchangeTransfer, held: HeldEntry): ExchangeOfferLine {
  if (held.kind === 'OBJECT') {
    return { ...transfer, kind: 'OBJECT', name: held.name, color: null, isHeavy: true, ammo: 0 };
  }
  return {
    ...transfer,
    kind: 'ITEM',
    name: held.card.name,
    color: held.card.color,
    isHeavy: held.card.isHeavy || held.fromHandSlot,
    ammo: held.card.isWeapon ? (held.card.ammo ?? 0) : 0,
  };
}

function requireHandSlotRoom(state: GameState, lines: readonly ExchangeOfferLine[]): void {
  const players = new Set(lines.flatMap((line) => [line.fromPlayerId, line.toPlayerId]));
  for (const playerId of players) {
    const player = state.players[playerId]!;
    const outgoing = lines.filter((line) => line.fromPlayerId === playerId && line.isHeavy).length;
    const incoming = lines.filter((line) => line.toPlayerId === playerId && line.isHeavy).length;
    if (player.handSlots.length - outgoing + incoming > handSlotCapacity(player)) {
      notAllowed(`${player.name}: не хватит свободных слотов Рук для Тяжёлых Предметов и Объектов.`);
    }
  }
}

function buildOfferLines(
  state: GameState,
  actorId: string,
  transfers: readonly ExchangeTransfer[],
): ExchangeOfferLine[] {
  const room = requireRoom(state, actorId);
  const present = new Set(
    livingCharactersInRoom(state, room).filter((playerId) => !state.players[playerId]!.isInHibernation),
  );
  if (transfers.length === 0) notAllowed('Выберите хотя бы один Предмет или Объект для Обмена.');
  const entryIds = new Set<string>();
  return transfers.map((transfer) => {
    if (transfer.fromPlayerId === transfer.toPlayerId) notAllowed('Нельзя передать Предмет самому себе.');
    if (!present.has(transfer.fromPlayerId) || !present.has(transfer.toPlayerId)) {
      notAllowed('Обмениваться можно только с Персонажами в вашей Комнате.');
    }
    if (entryIds.has(transfer.entryId)) notAllowed('Один Предмет нельзя передать дважды.');
    entryIds.add(transfer.entryId);
    const held = findHeldEntry(state.players[transfer.fromPlayerId]!, transfer.entryId);
    if (!held) notAllowed('У отдающего Персонажа нет такого Предмета или Объекта.');
    if (held.kind === 'ITEM' && held.card.color === 'QUEST') {
      notAllowed('Квестовые Предметы принадлежат своему Персонажу и в Обмене не участвуют.');
    }
    return offerLine(transfer, held);
  });
}

function orderedParticipants(state: GameState, lines: readonly ExchangeOfferLine[], initiatorId: string): string[] {
  const ids = new Set(lines.flatMap((line) => [line.fromPlayerId, line.toPlayerId]));
  ids.delete(initiatorId);
  return [...ids].sort((left, right) => state.players[left]!.orderNumber - state.players[right]!.orderNumber);
}

function askNextParticipant(state: GameState, exchange: PendingExchange): void {
  const [next] = exchange.awaitingPlayerIds;
  if (next === undefined) {
    state.pendingDecision = null;
    completeExchange(state, exchange);
    return;
  }
  state.pendingDecision = {
    id: allocateEntityId(state, 'exchange-consent'),
    playerId: next,
    type: 'EXCHANGE_CONSENT',
    exchange,
  };
}

export function proposeExchange(state: GameState, actorId: string, transfers: readonly ExchangeTransfer[]): void {
  const lines = buildOfferLines(state, actorId, transfers);
  requireHandSlotRoom(state, lines);
  const room = requireRoom(state, actorId);
  const exchange: PendingExchange = {
    exchangeId: allocateEntityId(state, 'exchange'),
    initiatorId: actorId,
    roomId: room.id,
    lines,
    acceptedPlayerIds: [],
    declinedPlayerIds: [],
    awaitingPlayerIds: orderedParticipants(state, lines, actorId),
  };
  appendGameLog(state, {
    type: 'EXCHANGE_PROPOSED',
    playerId: actorId,
    roomId: room.id,
    exchangeId: exchange.exchangeId,
    participantIds: [...exchange.awaitingPlayerIds],
  });
  askNextParticipant(state, exchange);
}

export function resolveExchangeConsent(state: GameState, decision: ExchangeConsentDecision, option: string): void {
  if (option !== EXCHANGE_OPTION.ACCEPT && option !== EXCHANGE_OPTION.DECLINE) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Ответьте на предложение Обмена: принять или отказаться.');
  }
  const accepted = option === EXCHANGE_OPTION.ACCEPT;
  const exchange: PendingExchange = {
    ...decision.exchange,
    acceptedPlayerIds: accepted
      ? [...decision.exchange.acceptedPlayerIds, decision.playerId]
      : decision.exchange.acceptedPlayerIds,
    declinedPlayerIds: accepted
      ? decision.exchange.declinedPlayerIds
      : [...decision.exchange.declinedPlayerIds, decision.playerId],
    awaitingPlayerIds: decision.exchange.awaitingPlayerIds.filter((playerId) => playerId !== decision.playerId),
  };
  appendGameLog(state, {
    type: 'EXCHANGE_ANSWERED',
    playerId: decision.playerId,
    exchangeId: exchange.exchangeId,
    accepted,
  });
  askNextParticipant(state, exchange);
}

type ObjectHandSlot = Extract<PlayerState['handSlots'][number], { source: 'OBJECT' }>;

type TakenEntry = { kind: 'ITEM'; card: ItemCard; fromHandSlot: boolean } | { kind: 'OBJECT'; slot: ObjectHandSlot };

function takeEntry(player: PlayerState, entryId: string): TakenEntry {
  const inventoryIndex = player.inventory.findIndex((card) => card.id === entryId);
  if (inventoryIndex >= 0) {
    return { kind: 'ITEM', card: player.inventory.splice(inventoryIndex, 1)[0]!, fromHandSlot: false };
  }
  const slotIndex = player.handSlots.findIndex(
    (slot) => (slot.source === 'ITEM' ? slot.card.id : slot.object.id) === entryId,
  );
  if (slotIndex < 0) notAllowed('Предмет для Обмена уже не у отдающего Персонажа.');
  const slot = player.handSlots.splice(slotIndex, 1)[0]!;
  return slot.source === 'ITEM' ? { kind: 'ITEM', card: slot.card, fromHandSlot: true } : { kind: 'OBJECT', slot };
}

function transferLine(state: GameState, line: ExchangeOfferLine): ExchangedEntry {
  const receiver = state.players[line.toPlayerId]!;
  const taken = takeEntry(state.players[line.fromPlayerId]!, line.entryId);
  if (taken.kind === 'OBJECT') {
    receiver.handSlots.push(taken.slot);
  } else {
    if (goesToHandSlot(line, taken.fromHandSlot)) receiver.handSlots.push({ source: 'ITEM', card: taken.card });
    else receiver.inventory.push(taken.card);
  }
  return {
    fromPlayerId: line.fromPlayerId,
    toPlayerId: line.toPlayerId,
    kind: line.kind,
    name: line.name,
    color: line.color,
    fromHandSlot: taken.kind === 'OBJECT' || taken.fromHandSlot,
    ammo: line.ammo,
  };
}

function completeExchange(state: GameState, exchange: PendingExchange): void {
  const agreed = new Set([exchange.initiatorId, ...exchange.acceptedPlayerIds]);
  const lines = exchange.lines.filter((line) => agreed.has(line.fromPlayerId) && agreed.has(line.toPlayerId));
  requireHandSlotRoom(state, lines);
  const entries = lines.map((line) => transferLine(state, line));
  appendGameLog(state, {
    type: 'EXCHANGE_COMPLETED',
    playerId: exchange.initiatorId,
    roomId: exchange.roomId,
    exchangeId: exchange.exchangeId,
    entries,
  });
  queueActionCompletion(state, exchange.initiatorId);
}
