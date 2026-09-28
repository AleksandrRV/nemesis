import { describe, expect, it } from 'vitest';
import { contactState } from '../testing/contactFixtures.js';
import type { ActionCard, ContaminationCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';
import { executeRoomAbility } from './roomAbilities.js';
import { filterStateForPlayer } from './sanitizer.js';

const REST: ActionCard = {
  id: 'TEST_REST',
  characterClass: 'CAPTAIN',
  name: 'Отдых',
  playCost: 0,
  description: '',
  effect: { kind: 'REST' },
};

function contamination(id: string, isInfected: boolean): ContaminationCard {
  return { id, isInfected, isScanned: false };
}

function playRest(state: GameState): GameState {
  state.players['player-1']!.actionDeck.hand.push(structuredClone(REST));
  return new GameEngine().processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: REST.id } });
}

function lastScan(state: GameState) {
  return state.gameLog
    .map((entry) => entry.event)
    .filter((event) => event.type === 'CONTAMINATION_SCANNED')
    .at(-1);
}

describe('Красный Сканер: «Отдых» (стр. 21)', () => {
  it('ИНФЕКЦИЯ без Личинки: Личинка на планшет, карта остаётся на руке просканированной', () => {
    const state = contactState(2, 'scan-larva');
    state.players['player-1']!.actionDeck.hand.push(contamination('INF', true));
    const next = playRest(state);
    const player = next.players['player-1']!;
    expect(player.hasLarva).toBe(true);
    expect(player.actionDeck.hand.find((card) => card.id === 'INF')).toMatchObject({ isScanned: true });
    expect(lastScan(next)).toMatchObject({
      source: 'REST',
      results: ['INFECTED'],
      removedCount: 0,
      outcome: 'LARVA_PLACED',
    });
  });

  it('повторная ИНФЕКЦИЯ при Личинке на планшете: Персонаж умирает, в отсеке появляется Крипер', () => {
    const state = contactState(2, 'scan-death');
    const roomId = state.players['player-1']!.roomId;
    state.players['player-1']!.hasLarva = true;
    state.players['player-1']!.actionDeck.hand.push(contamination('INF', true));
    const next = playRest(state);
    expect(next.players['player-1']!.isDead).toBe(true);
    expect(next.intrudersPool.boardTokens.some((token) => token.type === 'CREEPER' && token.roomId === roomId)).toBe(
      true,
    );
    expect(lastScan(next)).toMatchObject({ outcome: 'DIED' });
  });

  it('стерильные карты удаляются из игры, исход — «чисто»', () => {
    const state = contactState(2, 'scan-clean');
    state.players['player-1']!.actionDeck.hand.push(contamination('CLEAN_1', false), contamination('CLEAN_2', false));
    const next = playRest(state);
    const deck = next.players['player-1']!.actionDeck;
    expect([...deck.hand, ...deck.discard, ...deck.drawPile].some((card) => card.id.startsWith('CLEAN_'))).toBe(false);
    expect(next.decks.contamination.discard.some((card) => card.id.startsWith('CLEAN_'))).toBe(false);
    expect(lastScan(next)).toMatchObject({ results: ['CLEAN', 'CLEAN'], removedCount: 2, outcome: 'CLEAN' });
  });
});

describe('Красный Сканер: Операционная (стр. 25)', () => {
  it('сканирует колоду, руку и сброс, удаляет ИНФЕКЦИИ и Личинку, затасовывает все карты и пасует', () => {
    const state = contactState(2, 'surgery');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;
    room.definitionId = 'SURGERY';
    room.isExplored = true;
    room.hasMalfunction = false;
    player.hasLarva = true;
    player.actionDeck.hand.push(contamination('HAND_INF', true));
    player.actionDeck.drawPile.push(contamination('DRAW_CLEAN', false));
    player.actionDeck.discard.push(contamination('DISCARD_INF', true));
    const totalBefore =
      player.actionDeck.hand.length + player.actionDeck.drawPile.length + player.actionDeck.discard.length;

    executeRoomAbility(state, 'player-1', {});

    const deck = state.players['player-1']!.actionDeck;
    expect(deck.hand).toHaveLength(0);
    expect(deck.discard).toHaveLength(0);
    expect(deck.drawPile).toHaveLength(totalBefore - 2);
    expect(deck.drawPile.find((card) => card.id === 'DRAW_CLEAN')).toMatchObject({ isScanned: true });
    expect(deck.drawPile.some((card) => card.id.endsWith('_INF'))).toBe(false);
    expect(state.players['player-1']!).toMatchObject({ hasLarva: false, hasPassed: true, lightWounds: 1 });
    expect(lastScan(state)).toMatchObject({ source: 'SURGERY', removedCount: 2, outcome: 'LARVA_REMOVED' });
    expect((lastScan(state) as { results: string[] }).results.sort()).toEqual(['CLEAN', 'INFECTED', 'INFECTED']);
  });
});

describe('Красный Сканер и анти-чит', () => {
  it('непросканированная карта не раскрывает ИНФЕКЦИЮ даже владельцу; итог сканирования публичен', () => {
    const state = contactState(2, 'scan-secret');
    state.players['player-1']!.actionDeck.hand.push(contamination('HIDDEN', true));
    const own = filterStateForPlayer(state, 'player-1').players['player-1']!.actionDeck.hand.find(
      (card) => card.id === 'HIDDEN',
    );
    expect(own).toMatchObject({ isInfected: null, isScanned: false });

    const scanned = playRest(state);
    const other = filterStateForPlayer(scanned, 'player-2')
      .gameLog.map((entry) => entry.event)
      .at(-1);
    expect(other).toMatchObject({ type: 'CONTAMINATION_SCANNED', outcome: 'LARVA_PLACED' });
  });
});
