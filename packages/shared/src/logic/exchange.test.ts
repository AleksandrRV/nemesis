import { describe, expect, it } from 'vitest';
import { RED_ITEM_CARDS } from '../data/itemCards.js';
import type { ExchangeTransfer } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { contactState, expectEngineError, putPlayer } from '../testing/contactFixtures.js';
import { lastEvent, payWith } from '../testing/roomFixtures.js';
import { EXCHANGE_OPTION } from './exchange.js';
import { GameEngine } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';

const engine = new GameEngine();

function lightItem(): ItemCard {
  return structuredClone(RED_ITEM_CARDS.find((card) => !card.isHeavy && !card.isWeapon)!);
}

function trio(seed: string): GameState {
  const state = contactState(3, seed);
  const roomId = state.players['player-1']!.roomId;
  for (const playerId of ['player-2', 'player-3']) putPlayer(state, playerId, roomId);
  return state;
}

function propose(state: GameState, transfers: ExchangeTransfer[]): GameState {
  return engine.processAction(state, {
    type: 'ACTION_EXCHANGE',
    payload: { discardCardIds: payWith(state, 'player-1', 1), transfers },
  });
}

function answer(state: GameState, playerId: string, option: string): GameState {
  return engine.processAction(
    state,
    { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: state.pendingDecision!.id, selectedOption: option } },
    { actorId: playerId },
  );
}

describe('Действие [1] Обмен (стр. 12)', () => {
  it('партнёр соглашается — Предметы меняются местами, в журнале — сделка', () => {
    const state = trio('exchange-accept');
    const mine = lightItem();
    const theirs = { ...lightItem(), id: 'partner-item' };
    state.players['player-1']!.inventory.push(mine);
    state.players['player-2']!.inventory.push(theirs);

    const offered = propose(state, [
      { fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: mine.id },
      { fromPlayerId: 'player-2', toPlayerId: 'player-1', entryId: theirs.id },
    ]);
    expect(offered.pendingDecision).toMatchObject({ type: 'EXCHANGE_CONSENT', playerId: 'player-2' });

    const done = answer(offered, 'player-2', EXCHANGE_OPTION.ACCEPT);

    expect(done.players['player-1']!.inventory.map((card) => card.id)).toContain('partner-item');
    expect(done.players['player-2']!.inventory.map((card) => card.id)).toContain(mine.id);
    expect(lastEvent(done, 'EXCHANGE_COMPLETED')!.entries).toHaveLength(2);
  });

  it('можно отдать Предмет даром; отказ получателя отменяет передачу, Действие всё равно потрачено', () => {
    const state = trio('exchange-decline');
    const gift = lightItem();
    state.players['player-1']!.inventory.push(gift);
    const handBefore = state.players['player-1']!.actionDeck.hand.length;

    const declined = answer(
      propose(state, [{ fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: gift.id }]),
      'player-2',
      EXCHANGE_OPTION.DECLINE,
    );

    expect(declined.players['player-1']!.inventory.map((card) => card.id)).toContain(gift.id);
    expect(declined.players['player-1']!.actionDeck.hand).toHaveLength(handBefore - 1);
    expect(lastEvent(declined, 'EXCHANGE_COMPLETED')!.entries).toEqual([]);
  });

  it('каждый участник отвечает сам: сделки с отказавшимся отменяются, остальные проходят', () => {
    const state = trio('exchange-partial');
    const toSecond = lightItem();
    const toThird = { ...lightItem(), id: 'to-third' };
    state.players['player-1']!.inventory.push(toSecond, toThird);

    let current = propose(state, [
      { fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: toSecond.id },
      { fromPlayerId: 'player-1', toPlayerId: 'player-3', entryId: toThird.id },
    ]);
    current = answer(current, 'player-2', EXCHANGE_OPTION.DECLINE);
    expect(current.pendingDecision).toMatchObject({ playerId: 'player-3' });
    current = answer(current, 'player-3', EXCHANGE_OPTION.ACCEPT);

    expect(current.players['player-3']!.inventory.map((card) => card.id)).toContain('to-third');
    expect(current.players['player-1']!.inventory.map((card) => card.id)).toContain(toSecond.id);
  });

  it('Боезапас привязан к Оружию: переходит в Руки вместе с ним', () => {
    const state = trio('exchange-weapon');
    const slot = state.players['player-1']!.handSlots.find((entry) => entry.source === 'ITEM' && entry.card.isWeapon)!;
    const weaponId = slot.source === 'ITEM' ? slot.card.id : '';
    const ammo = slot.source === 'ITEM' ? (slot.card.ammo ?? 0) : 0;
    expect(ammo).toBeGreaterThan(0);
    state.players['player-2']!.handSlots = [];

    const done = answer(
      propose(state, [{ fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: weaponId }]),
      'player-2',
      EXCHANGE_OPTION.ACCEPT,
    );

    const received = done.players['player-2']!.handSlots.find((entry) => entry.source === 'ITEM')!;
    expect(received.source === 'ITEM' && received.card.ammo).toBe(ammo);
    expect(lastEvent(done, 'EXCHANGE_COMPLETED')!.entries[0]!.ammo).toBe(ammo);
  });

  it('названия Предметов из Инвентаря видят только участники', () => {
    const state = trio('exchange-secret');
    const gift = lightItem();
    state.players['player-1']!.inventory.push(gift);

    const done = answer(
      propose(state, [{ fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: gift.id }]),
      'player-2',
      EXCHANGE_OPTION.ACCEPT,
    );

    const seenByThird = filterStateForPlayer(done, 'player-3').gameLog.find(
      (entry) => entry.event.type === 'EXCHANGE_COMPLETED',
    )!.event;
    expect(seenByThird).toMatchObject({ entries: [{ name: null, color: gift.color }] });
    const seenByPartner = filterStateForPlayer(done, 'player-2').gameLog.find(
      (entry) => entry.event.type === 'EXCHANGE_COMPLETED',
    )!.event;
    expect(seenByPartner).toMatchObject({ entries: [{ name: gift.name }] });
  });

  it('недопустимые Обмены отклоняются явной ошибкой', () => {
    const state = trio('exchange-invalid');
    const gift = lightItem();
    state.players['player-1']!.inventory.push(gift);
    putPlayer(state, 'player-3', 1);

    expectEngineError(() => propose(state, []), 'EXCHANGE_NOT_ALLOWED');
    expectEngineError(
      () => propose(state, [{ fromPlayerId: 'player-1', toPlayerId: 'player-3', entryId: gift.id }]),
      'EXCHANGE_NOT_ALLOWED',
    );
    expectEngineError(
      () => propose(state, [{ fromPlayerId: 'player-2', toPlayerId: 'player-1', entryId: gift.id }]),
      'EXCHANGE_NOT_ALLOWED',
    );
    state.players['player-2']!.handSlots.push(
      { source: 'OBJECT', object: { id: 'egg-a', kind: 'EGG' } },
      { source: 'OBJECT', object: { id: 'egg-b', kind: 'EGG' } },
    );
    state.players['player-1']!.handSlots.push({ source: 'OBJECT', object: { id: 'egg-c', kind: 'EGG' } });
    expectEngineError(
      () => propose(state, [{ fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: 'egg-c' }]),
      'EXCHANGE_NOT_ALLOWED',
    );
  });
});
