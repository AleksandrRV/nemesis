import { describe, expect, it } from 'vitest';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS } from '../data/itemCards.js';
import { PERSONAL_OBJECTIVE_CARDS, SOLO_COOP_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState } from '../testing/contactFixtures.js';
import { BOT, mindFor, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { decideChoice } from './botChoices.js';
import { BOT_TUNING } from './botTuning.js';

describe('Решения бота (план 0.8.0, В8-7-8)', () => {
  it('при Первом Контакте выбирает Цель, которая ближе к выполнению', () => {
    const state = contactState(2, 'choice-objective');
    const signal = SOLO_COOP_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_SOLO_NO_ONE_LEFT_BEHIND')!;
    const scavenger = PERSONAL_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_PERSONAL_SCAVENGER')!;
    state.players[BOT]!.objectives = [structuredClone(scavenger), structuredClone(signal)];
    state.players[BOT]!.hasSignalSent = true;
    for (const room of Object.values(state.ship.rooms)) room.isExplored = true;
    state.pendingDecision = {
      id: 'objective',
      playerId: BOT,
      type: 'CHOOSE_OBJECTIVE',
      objectiveIds: [scavenger.id, signal.id],
    };
    const view = filterStateForPlayer(state, BOT);
    expect(decideChoice(view, seen(state, withCharacter(mindFor(state), {})), BOT_TUNING)).toEqual({
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: 'objective', selectedOption: signal.id },
    });
  });

  it('безоружный бот берёт из Поиска Оружие', () => {
    const state = contactState(2, 'choice-search');
    state.players[BOT]!.handSlots = [];
    const weapon = RED_ITEM_CARDS.find((card) => card.isWeapon)!;
    const other = GREEN_ITEM_CARDS.find((card) => !card.isWeapon && !card.isHeavy)!;
    state.pendingDecision = {
      id: 'search',
      playerId: BOT,
      type: 'CHOOSE_SEARCH_ITEM',
      cards: [structuredClone(other), structuredClone(weapon)],
      sourceDeck: 'RED',
      roomId: state.players[BOT]!.roomId,
    };
    const answer = decideChoice(filterStateForPlayer(state, BOT), mindFor(state), BOT_TUNING);
    expect(answer).toMatchObject({ payload: { selectedOption: weapon.id } });
  });

  it('чужое решение бот не трогает', () => {
    const state = contactState(2, 'choice-foreign');
    state.pendingDecision = { id: 'objective', playerId: 'player-1', type: 'CHOOSE_OBJECTIVE', objectiveIds: [] };
    expect(decideChoice(filterStateForPlayer(state, BOT), mindFor(state), BOT_TUNING)).toBeNull();
  });
});
