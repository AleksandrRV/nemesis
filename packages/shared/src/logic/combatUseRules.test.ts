import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import {
  ACTION_CARD_COMBAT_USE,
  ITEM_COMBAT_USE,
  QUEST_ITEM_COMBAT_USE,
  actionCardCombatUse,
  itemCombatUse,
} from '../data/combatUse.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { RED_ITEM_CARDS } from '../data/itemCards.js';
import { questItemCardId } from '../data/questItems.js';
import { contactState, existingIntruder, expectEngineError } from '../testing/contactFixtures.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';

interface CombatUseTable {
  status: string;
  expectation: { actionCards: unknown; items: unknown; questItems: unknown };
}

const table = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
  ) as { tables: Record<string, CombatUseTable> }
).tables['combat-use']!;

function cardById(id: string): ActionCard {
  return structuredClone(ACTION_CARDS.find((card) => card.id === id)!);
}

function play(state: GameState, card: ActionCard): GameState {
  state.players['player-1']!.actionDeck.hand.push(card);
  return new GameEngine().processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: card.id } });
}

function give(state: GameState, item: ItemCard): string {
  state.players['player-1']!.inventory.push(structuredClone(item));
  return item.id;
}

function useItem(state: GameState, itemId: string): GameState {
  const payment = state.players['player-1']!.actionDeck.hand.find((card) => 'characterClass' in card)!.id;
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId, discardCardIds: [payment] },
  });
}

function inCombat(seed: string): GameState {
  const state = contactState(1, seed);
  existingIntruder(state, 'ADULT', state.players['player-1']!.roomId);
  return state;
}

describe('Golden: символы «Только в Бою / вне Боя» (стр. 12; cards_base.pdf, стр. 17–29; cards_additional.pdf)', () => {
  it('совпадают с пакетом источника', () => {
    expect(table.status).toBe('SCAN_VERIFIED');
    expect(table.expectation).toEqual({
      actionCards: ACTION_CARD_COMBAT_USE,
      items: ITEM_COMBAT_USE,
      questItems: QUEST_ITEM_COMBAT_USE,
    });
  });

  it('одноимённые карты разных Персонажей несут одинаковый символ', () => {
    const byName = new Map<string, Set<string>>();
    for (const card of ACTION_CARDS) {
      const symbols = byName.get(card.name) ?? new Set<string>();
      symbols.add(String(actionCardCombatUse(card)));
      byName.set(card.name, symbols);
    }
    for (const [name, symbols] of byName) expect(symbols.size, name).toBe(1);
  });

  it('Ключ эвакуации красной колоды без символа, квестовый Ключ эвакуации Пилота — «Только вне Боя»', () => {
    const redKey = RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_EVACUATION_KEY_'))!;
    const questKey = { ...redKey, id: questItemCardId('q-1') };

    expect(itemCombatUse(redKey)).toBeNull();
    expect(itemCombatUse(questKey, [{ id: 'q-1', questKey: 'EVACUATION_KEY' }])).toBe('OUT_OF_COMBAT');
  });
});

describe('Движок соблюдает символы Боя', () => {
  it('«Отдых» (вне Боя) в Бою отклоняется явной ошибкой и не меняет партию', () => {
    const state = inCombat('combat-use-rest');
    const before = structuredClone(state);
    const rest = cardById('ACT_CAP_REST');

    expectEngineError(() => play(state, rest), 'ACTION_ONLY_OUT_OF_COMBAT');
    state.players['player-1']!.actionDeck.hand.pop();
    expect(state).toEqual(before);
  });

  it('«Огонь на подавление» (в Бою) вне Боя отклоняется', () => {
    const state = contactState(1, 'combat-use-suppress');

    expectEngineError(() => play(state, cardById('ACT_CAP_SUPPRESSIVE_FIRE')), 'ACTION_ONLY_IN_COMBAT');
  });

  it('карты без символа («Разрушение») играются и в Бою', () => {
    const state = inCombat('combat-use-demolition');
    const demolition = cardById('ACT_CAP_DEMOLITION');
    state.players['player-1']!.actionDeck.hand.push(demolition);

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: demolition.id, option: CARD_OPTION.MALFUNCTION },
    });

    expect(next.ship.rooms[next.players['player-1']!.roomId]!.hasMalfunction).toBe(true);
  });

  it('Антидот (вне Боя) в Бою отклоняется; вне Боя работает', () => {
    const antidote = CRAFTED_ITEM_CARDS.find((item) => item.recipeId === 'ANTIDOTE')!;

    const fighting = inCombat('combat-use-antidote');
    expectEngineError(() => useItem(fighting, give(fighting, antidote)), 'ACTION_ONLY_OUT_OF_COMBAT');

    const calm = contactState(2, 'combat-use-antidote-calm');
    expect(useItem(calm, give(calm, antidote)).players['player-1']!.hasPassed).toBe(true);
  });

  it('Дымовая граната (в Бою) вне Боя отклоняется', () => {
    const smoke = RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_SMOKE_GRENADE_'))!;
    const state = contactState(1, 'combat-use-smoke');

    expectEngineError(() => useItem(state, give(state, smoke)), 'ACTION_ONLY_IN_COMBAT');
  });
});
