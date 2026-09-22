import { expect } from 'vitest';
import type { IntruderAttackEffect } from '../types/cards.js';
import type { IntruderToken, IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { createIntruderSupply } from '../data/intruderPool.js';
import { EngineError } from '../logic/engineErrors.js';
import type { EngineErrorCode } from '../logic/engineErrors.js';
import { placeIntruder } from '../logic/intruderPlacement.js';
import { createInitialGameState } from '../logic/setup.js';

export function contactState(playerCount = 1, seed = 'contact-step-2'): GameState {
  return createInitialGameState(seed, { playerCount });
}

export function putPlayer(state: GameState, playerId: string, roomId: number): void {
  for (const room of Object.values(state.ship.rooms))
    room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
  state.players[playerId]!.roomId = roomId;
  state.ship.rooms[roomId]!.occupantPlayerIds.push(playerId);
}

export function setBag(state: GameState, tokens: IntruderToken[]): void {
  const ids = new Set(tokens.map((token) => token.id));
  state.intrudersPool.bag = tokens;
  state.intrudersPool.supply = createIntruderSupply().filter((token) => !ids.has(token.id));
}

export function forceToken(state: GameState, type: IntruderToken['type'], escapeNumber?: number): void {
  const token = createIntruderSupply().find((candidate) => candidate.type === type)!;
  setBag(state, [{ ...token, escapeNumber: escapeNumber ?? token.escapeNumber }]);
}

export function forceAttack(state: GameState, effect: IntruderAttackEffect): void {
  const cards = structuredClone(INTRUDER_ATTACK_CARDS);
  const first = cards.find((card) => card.effect === effect)!;
  state.decks.intruderAttacks = { drawPile: [first, ...cards.filter((card) => card.id !== first.id)], discard: [] };
}

export function giveSeriousWounds(state: GameState, playerId: string, count: number, treated = false): void {
  state.players[playerId]!.seriousWounds = state.decks.seriousWounds.drawPile
    .splice(0, count)
    .map((wound) => ({ ...wound, isTreated: treated }));
}

export function existingIntruder(state: GameState, type: IntruderType, roomId = 11): string {
  const intruder = placeIntruder(state, type, roomId);
  state.intrudersPool.firstEncounterOccurred = true;
  return intruder.id;
}

/** Минимальное состояние для проверок статуса Боя: один персонаж в отсеке 11. */
export function combatStatusState(seed = 'combat-status'): GameState {
  return contactState(1, seed);
}

/** Ставит миниатюру Чужого в отсек как это делает движок (с учётом лимитов). */
export function putIntruder(state: GameState, type: IntruderType, roomId = 11): string {
  return placeIntruder(state, type, roomId).id;
}

export function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(EngineError);
  expect(thrown).toMatchObject({ code });
}
