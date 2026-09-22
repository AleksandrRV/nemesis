import type { GameState } from '../types/state.js';
import { drawSharedCard } from './cardPiles.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { allocateEntityId } from './stateIds.js';

export function killPlayer(state: GameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (player.isDead) return;
  const room = state.ship.rooms[player.roomId]!;
  const firstDeath = !Object.values(state.players).some((candidate) => candidate.isDead);

  player.isDead = true;
  player.hasPassed = true;
  player.hasLarva = false;
  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
  room.objects.push({ id: allocateEntityId(state, 'corpse'), kind: 'CORPSE', characterClass: player.characterClass });
  for (const slot of player.handSlots) {
    if (slot.source === 'OBJECT') room.objects.push(slot.object);
  }
  player.handSlots = state.meta.gameMode === 'COOP' ? player.handSlots.filter((slot) => slot.source === 'ITEM') : [];
  if (state.meta.gameMode !== 'COOP') {
    player.inventory = [];
    player.questItems = [];
  }
  appendGameLog(state, { type: 'PLAYER_DIED', playerId, roomId: room.id });
  if (firstDeath) {
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
    appendGameLog(state, { type: 'ESCAPE_PODS_UNLOCKED' });
  }
}

export function sufferSeriousWound(state: GameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (player.isDead) return;
  if (player.seriousWounds.length >= 3) return killPlayer(state, playerId);
  const wound = drawSharedCard(state, state.decks.seriousWounds, 'Тяжёлые Травмы');
  wound.isTreated = false;
  player.seriousWounds.push(wound);
}

export function sufferLightWounds(state: GameState, playerId: string, count: number): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  for (let wound = 0; wound < count && !player.isDead; wound++) {
    if (player.seriousWounds.length >= 3) {
      killPlayer(state, playerId);
      return;
    }
    player.lightWounds += 1;
    if (player.lightWounds === 3) {
      player.lightWounds = 0;
      sufferSeriousWound(state, playerId);
    }
  }
}

export function receiveContamination(state: GameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (player.isDead) return;
  const card = drawSharedCard(state, state.decks.contamination, 'Заражение');
  card.isScanned = false;
  player.actionDeck.discard.push(card);
  appendGameLog(state, { type: 'CONTAMINATION_RECEIVED', playerId });
}
