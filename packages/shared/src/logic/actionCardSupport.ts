import type { ItemDeckColor } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { drawOneActionCard } from './classCombatCards.js';
import { validateSearchConditions, drawSearchCards, placeItemToPlayer } from './search.js';
import { finishSearch } from './searchActions.js';
import { reshuffleDiscard } from './cardPiles.js';
import { allocateEntityId } from './stateIds.js';
import { requireRoom } from './cardEffectsShared.js';

export function performRoomSearch(state: GameState, actorId: string, chosenDeckColor?: ItemDeckColor): void {
  const { roomId, color } = validateSearchConditions(state, actorId);
  const targetColor = color === 'WHITE' ? chosenDeckColor : color;
  if (color === 'WHITE' && !targetColor) {
    throw new EngineError('INVALID_DECISION_OPTION', 'В белом отсеке выберите цвет колоды Предметов.');
  }
  const drawn = drawSearchCards(state, targetColor!);
  if (drawn.length === 0) {
    throw new EngineError('NO_ITEMS_LEFT', `В колоде ${targetColor} не осталось карт Предметов.`);
  }
  if (drawn.length === 1) {
    const placed = placeItemToPlayer(state, actorId, drawn[0]!, roomId);
    if (!placed) return;
    finishSearch(state, actorId, roomId);
    return;
  }
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    cards: drawn,
    sourceDeck: targetColor!,
    roomId,
  };
}

export function performScavenge(state: GameState, actorId: string, chosenDeckColor?: ItemDeckColor): void {
  const room = requireRoom(state, actorId);
  if (!chosenDeckColor) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Мародерство» требует выбрать цвет колоды Предметов.');
  }
  const drawn = drawSearchCards(state, chosenDeckColor);
  if (drawn.length === 0) {
    throw new EngineError('NO_ITEMS_LEFT', `В колоде ${chosenDeckColor} не осталось карт Предметов.`);
  }
  room.itemsCount -= 1;
  if (drawn.length === 1) {
    const placed = placeItemToPlayer(state, actorId, drawn[0]!, room.id);
    if (!placed) return;
    appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: room.id });
    return;
  }
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    cards: drawn,
    sourceDeck: chosenDeckColor,
    roomId: room.id,
  };
  appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: room.id });
}

export function motivateRoom(state: GameState, actorId: string): void {
  const room = requireRoom(state, actorId);
  const occupants = room.occupantPlayerIds.filter((id) => {
    const occupant = state.players[id];
    return occupant && !occupant.isDead && !occupant.hasEscapedInPod;
  });
  for (const occupantId of occupants) {
    const deck = state.players[occupantId]!.actionDeck;
    if (deck.drawPile.length === 0 && deck.discard.length === 0) continue;
    drawOneActionCard(state, occupantId);
  }
}

export function threatAssessment(state: GameState, actorId: string, option: string | undefined): void {
  const room = requireRoom(state, actorId);
  if (!room.hasComputer) {
    throw new EngineError('NO_COMPUTER', '«Оценка угрозы» работает только в комнате с Компьютером.');
  }
  const pile = state.decks.events;
  if (pile.drawPile.length === 0 && pile.discard.length === 0) {
    throw new EngineError('CARD_SUPPLY_EXHAUSTED', 'Колода Событий пуста.');
  }
  if (pile.drawPile.length === 0) reshuffleDiscard(state, pile);
  const top = pile.drawPile[0]!;
  if (option === CARD_OPTION.MOVE_BOTTOM) {
    pile.drawPile.shift();
    pile.drawPile.push(top);
  }
  appendGameLog(state, {
    type: 'EVENT_PEEKED',
    playerId: actorId,
    cardName: top.name,
    placed: option === CARD_OPTION.MOVE_BOTTOM ? 'BOTTOM' : 'TOP',
  });
}
