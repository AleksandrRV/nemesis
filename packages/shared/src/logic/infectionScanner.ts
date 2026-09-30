import type { ActionDeckCard, ContaminationCard } from '../types/cards.js';
import type { ContaminationScanOutcome, ContaminationScanResult, ContaminationScanSource } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { killPlayer } from './characterDamage.js';
import { placeIntruder } from './intruderPlacement.js';
import { announceIntruderMiniature } from './objectives.js';

export function isContamination(card: ActionDeckCard): card is ContaminationCard {
  return !('characterClass' in card);
}

export function scanContaminationCards(cards: readonly ActionDeckCard[]): ContaminationScanResult[] {
  return cards.filter(isContamination).map((card) => {
    card.isScanned = true;
    return card.isInfected ? 'INFECTED' : 'CLEAN';
  });
}

export function resolveInfectionFound(
  state: GameState,
  playerId: string,
): Extract<ContaminationScanOutcome, 'LARVA_PLACED' | 'DIED'> {
  const player = state.players[playerId]!;
  if (!player.hasLarva) {
    player.hasLarva = true;
    return 'LARVA_PLACED';
  }
  const roomId = player.roomId;
  killPlayer(state, playerId);
  if (placeIntruder(state, 'CREEPER', roomId)) {
    state.interruptQueue.unshift(...announceIntruderMiniature(state, playerId, roomId));
  }
  return 'DIED';
}

export function logContaminationScan(
  state: GameState,
  playerId: string,
  source: ContaminationScanSource,
  results: ContaminationScanResult[],
  removedCount: number,
  outcome: ContaminationScanOutcome,
): void {
  appendGameLog(state, { type: 'CONTAMINATION_SCANNED', playerId, source, results, removedCount, outcome });
}

export function removeInfectedCards(cards: ActionDeckCard[]): { kept: ActionDeckCard[]; removed: number } {
  const kept = cards.filter((card) => !isContamination(card) || !card.isInfected);
  return { kept, removed: cards.length - kept.length };
}

/** Скан руки (стр. 20): карты без ИНФЕКЦИИ удаляются, ИНФЕКЦИЯ сажает Личинку или убивает. */
export function scanHandAndRemoveClean(state: GameState, playerId: string, source: ContaminationScanSource): void {
  const player = state.players[playerId]!;
  const results = scanContaminationCards(player.actionDeck.hand);
  const before = player.actionDeck.hand.length;
  player.actionDeck.hand = player.actionDeck.hand.filter((card) => !isContamination(card) || card.isInfected);
  const removed = before - player.actionDeck.hand.length;
  const outcome = results.includes('INFECTED') ? resolveInfectionFound(state, playerId) : 'CLEAN';
  logContaminationScan(state, playerId, source, results, removed, outcome);
}

export function hasContaminationInHand(state: GameState, playerId: string): boolean {
  return state.players[playerId]!.actionDeck.hand.some(isContamination);
}
