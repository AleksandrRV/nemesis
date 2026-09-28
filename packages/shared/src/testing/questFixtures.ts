import type { ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { QUEST_DEFINITIONS, questItemCardId, type QuestKey } from '../data/questItems.js';
import { GameEngine } from '../logic/fsm.js';
import { buildQuestItemCard } from '../logic/questItems.js';

export function giveQuest(state: GameState, questKey: QuestKey, isActivated = false): string {
  const id = `player-1-quest-${questKey}`;
  const name = QUEST_DEFINITIONS.find((entry) => entry.key === questKey)!.name;
  const quest = { id, name, isActivated, questKey };
  state.players['player-1']!.questItems = [quest];
  if (isActivated) state.players['player-1']!.inventory.push(buildQuestItemCard(quest));
  return id;
}

export function setRoom(state: GameState, definitionId: string): number {
  const room = state.ship.rooms[state.players['player-1']!.roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  return room.id;
}

export function payment(state: GameState): string[] {
  return [state.players['player-1']!.actionDeck.hand.find((card) => 'characterClass' in card)!.id];
}

export function activate(state: GameState, questItemId: string, sacrificeItemId?: string): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_ACTIVATE_QUEST',
    payload: { questItemId, discardCardIds: payment(state), ...(sacrificeItemId ? { sacrificeItemId } : {}) },
  });
}

export function item(prefix: string, pool: readonly ItemCard[]): ItemCard {
  return structuredClone(pool.find((entry) => entry.id.startsWith(prefix))!);
}

export function useQuestItem(state: GameState, questItemId: string, payload: Record<string, unknown>): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId: questItemCardId(questItemId), discardCardIds: payment(state), ...payload },
  });
}
