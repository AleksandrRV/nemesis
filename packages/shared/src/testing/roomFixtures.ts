import type { RoomAbilityPayload } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { putPlayer } from './contactFixtures.js';

export function payWith(state: GameState, playerId: string, count: number): string[] {
  return state.players[playerId]!.actionDeck.hand.filter((card) => 'characterClass' in card)
    .slice(0, count)
    .map((card) => card.id);
}

export function roomOf(state: GameState, definitionId: string): number {
  return Object.values(state.ship.rooms).find((room) => room.definitionId === definitionId)!.id;
}

/** Ставит Персонажа в Комнату нужного типа: особую — на её место, остальные — подменяя тайл его отсека. */
export function standAt(state: GameState, playerId: string, definitionId: string): number {
  const existing = Object.values(state.ship.rooms).find((room) => room.definitionId === definitionId);
  const roomId = existing?.id ?? Object.values(state.ship.rooms).find((room) => room.category === 'ROOM_1')!.id;
  putPlayer(state, playerId, roomId);
  const room = state.ship.rooms[roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  room.occupantIntruderIds = [];
  return roomId;
}

export function useConsole(state: GameState, playerId: string, payload: RoomAbilityPayload = {}): GameState {
  state.meta.activePlayerId = playerId;
  return new GameEngine().processAction(
    state,
    { type: 'ACTION_ROOM_ABILITY', payload: { discardCardIds: payWith(state, playerId, 2), ...payload } },
    { actorId: playerId },
  );
}

export function lastEvent<TType extends GameState['gameLog'][number]['event']['type']>(
  state: GameState,
  type: TType,
): Extract<GameState['gameLog'][number]['event'], { type: TType }> | undefined {
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === type);
  return entry?.event as Extract<GameState['gameLog'][number]['event'], { type: TType }> | undefined;
}

/** Делает отсек исследованной Комнатой нужного типа без Чужих и аварий. */
export function exploreAs(state: GameState, roomId: number, definitionId: string): number {
  const room = state.ship.rooms[roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  room.occupantIntruderIds = [];
  return roomId;
}
