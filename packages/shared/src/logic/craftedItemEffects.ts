import type { ItemEffectKind } from '../data/itemEffectKinds.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { performPass } from './turnCycle.js';
import { checkInjuryResult } from './shoot.js';
import { receiveContamination, sufferSeriousWound } from './characterDamage.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { requireIntruder } from './intruderPlacement.js';
import { reshuffleDiscard } from './cardPiles.js';
import {
  chooseIntruderInRoom,
  isContaminationCard,
  livingCharactersInRoom,
  placeFireFromCard,
  requireOwnOrNeighbourRoom,
  requirePlayer,
  requireRoom,
} from './cardEffectsShared.js';
import type { UseItemPayload } from './itemEffects.js';

type CraftedEffectKind = Extract<ItemEffectKind, 'ANTIDOTE' | 'TASER' | 'MOLOTOV'>;

function antidote(state: GameState, actorId: string): void {
  const player = requirePlayer(state, actorId);
  const deck = player.actionDeck;
  const scan = (cards: typeof deck.hand): typeof deck.hand =>
    cards.filter((card) => {
      if (!isContaminationCard(card)) return true;
      card.isScanned = true;
      return !card.isInfected;
    });
  deck.hand = scan(deck.hand);
  deck.drawPile = scan(deck.drawPile);
  deck.discard = scan(deck.discard);
  player.hasLarva = false;
  receiveContamination(state, actorId);
  deck.discard = [...deck.drawPile, ...deck.discard];
  deck.drawPile = [];
  reshuffleDiscard(state, deck);
  performPass(state, actorId);
}

function taser(state: GameState, actorId: string, payload: UseItemPayload): void {
  const room = requireRoom(state, actorId);
  if (payload.option === CARD_OPTION.DISARM_CHARACTER) {
    const targetId = payload.targetPlayerId;
    if (!targetId || targetId === actorId || !livingCharactersInRoom(state, room).includes(targetId)) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другого Персонажа в вашей комнате.');
    }
    const target = requirePlayer(state, targetId);
    target.actionDeck.discard.push(...target.actionDeck.hand);
    target.actionDeck.hand = [];
    return;
  }
  const intruderId = chooseIntruderInRoom(room, payload.targetIntruderId);
  const intruder = requireIntruder(state, intruderId);
  const result = checkInjuryResult(state, intruderId, intruder.type, 1, actorId);
  if (result.killed) return;
  if (state.intrudersPool.boardTokens.some((token) => token.id === intruderId && token.roomId === room.id)) {
    resolveIntruderRetreat(state, intruderId, actorId);
  }
}

function molotov(state: GameState, actorId: string, payload: UseItemPayload): void {
  const target = requireOwnOrNeighbourRoom(state, actorId, payload.targetRoomId);
  if (target.occupantIntruderIds.length === 0) {
    throw new EngineError('UNKNOWN_INTRUDER', 'Коктейль бросают в комнату с Чужим — в выбранной комнате Чужих нет.');
  }
  if (!target.hasFire) placeFireFromCard(state, target.id);
  for (const intruderId of [...target.occupantIntruderIds]) {
    if (!state.intrudersPool.boardTokens.some((token) => token.id === intruderId)) continue;
    checkInjuryResult(state, intruderId, requireIntruder(state, intruderId).type, 1, actorId);
  }
  for (const characterId of livingCharactersInRoom(state, target)) sufferSeriousWound(state, characterId);
}

export function applyCraftedItemEffect(
  state: GameState,
  actorId: string,
  kind: CraftedEffectKind,
  payload: UseItemPayload,
): void {
  if (kind === 'ANTIDOTE') return antidote(state, actorId);
  if (kind === 'TASER') return taser(state, actorId, payload);
  molotov(state, actorId, payload);
}
