import { describe, expect, it } from 'vitest';
import { INTRUDER_MINIATURE_LIMITS } from '../data/intruderMiniatures.js';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { contactState, existingIntruder, forceAttack, forceToken, putPlayer } from '../testing/contactFixtures.js';
import { resolveContact } from './contact.js';
import { resolveEventCardEffect } from './eventEffects.js';
import { resolveHiveDevelopment } from './hiveDevelopment.js';
import { resolveInfectionFound } from './infectionScanner.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';

function fillMiniatures(state: GameState, type: IntruderType, roomId = 2): void {
  for (let index = 0; index < INTRUDER_MINIATURE_LIMITS[type]; index++) existingIntruder(state, type, roomId);
}

function loggedTypes(state: GameState): string[] {
  return state.gameLog.map((entry) => entry.event.type);
}

function missingMiniatureEvents(state: GameState) {
  return state.gameLog.flatMap((entry) => (entry.event.type === 'INTRUDER_MINIATURE_MISSING' ? [entry.event] : []));
}

describe('В-10: свободной миниатюры нет — миниатюра не ставится, событие игнорируется', () => {
  it('Контакт: жетон возвращается в мешок, Внезапной атаки и Первого Контакта нет', () => {
    const state = contactState();
    fillMiniatures(state, 'BREEDER');
    forceToken(state, 'BREEDER');
    state.players['player-1']!.actionDeck.hand = [];
    const bagBefore = structuredClone(state.intrudersPool.bag);

    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });

    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
    expect(state.intrudersPool.bag).toEqual(bagBefore);
    expect(state.interruptQueue).toEqual([]);
    expect(loggedTypes(state)).not.toContain('CONTACT_OCCURRED');
    expect(missingMiniatureEvents(state)).toEqual([
      { type: 'INTRUDER_MINIATURE_MISSING', intruderType: 'BREEDER', roomId: 11 },
    ]);
  });

  it('Созревание: носитель Личинки гибнет, но четвёртый Крипер не выставляется', () => {
    const state = contactState(2);
    fillMiniatures(state, 'CREEPER');
    state.players['player-1']!.hasLarva = true;
    const maturation = EVENT_CARDS.find((card) => card.id === 'EVT_MATURATION')!;

    resolveEventCardEffect(state, maturation);

    expect(state.players['player-1']!.isDead).toBe(true);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
    const resolved = state.gameLog.find((entry) => entry.event.type === 'EVENT_EFFECT_RESOLVED')!.event;
    expect(resolved).toMatchObject({ outcome: { deadPlayerIds: ['player-1'], creeperRoomIds: [] } });
    expect(missingMiniatureEvents(state)).toHaveLength(1);
  });

  it('Инфекция у носителя Личинки: Персонаж гибнет, Крипер не выставляется', () => {
    const state = contactState();
    fillMiniatures(state, 'CREEPER');
    state.players['player-1']!.hasLarva = true;

    expect(resolveInfectionFound(state, 'player-1')).toBe('DIED');

    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
    expect(state.interruptQueue).toEqual([]);
    expect(missingMiniatureEvents(state)).toHaveLength(1);
  });

  it('Развитие Улья: Королева уже на поле — нет ни миниатюры, ни Контакта, ни Яйца', () => {
    const state = contactState(1, 'dump');
    putPlayer(state, 'player-1', 3);
    existingIntruder(state, 'QUEEN', 2);
    forceToken(state, 'QUEEN');
    const eggsBefore = state.intrudersPool.eggsOnBoard;

    resolveHiveDevelopment(state);

    expect(state.ship.rooms[3]!.occupantIntruderIds).toEqual([]);
    expect(state.interruptQueue).toEqual([]);
    expect(state.intrudersPool.eggsOnBoard).toBe(eggsBefore);
    expect(state.intrudersPool.bag.map((token) => token.type)).toEqual(['QUEEN']);
    const resolved = state.gameLog.find((entry) => entry.event.type === 'HIVE_DEVELOPMENT_RESOLVED')!.event;
    expect(resolved).toMatchObject({ outcome: { kind: 'QUEEN', queenPlaced: false, eggAdded: false } });
  });

  it('Трансформация: оба Трутня на поле — Крипер остаётся Крипером, второй атаки нет', () => {
    const state = contactState();
    fillMiniatures(state, 'BREEDER');
    forceAttack(state, 'TRANSFORMATION');
    state.players['player-1']!.actionDeck.hand = [];
    const creeperId = existingIntruder(state, 'CREEPER');
    state.interruptQueue = [{ type: 'COMPLETE_ACTION_INTERRUPT', playerId: 'player-1' }];

    resolveSurpriseAttack(state, 'player-1', creeperId);

    expect(state.intrudersPool.boardTokens.find((intruder) => intruder.id === creeperId)?.type).toBe('CREEPER');
    expect(state.interruptQueue.map((interrupt) => interrupt.type)).toEqual(['COMPLETE_ACTION_INTERRUPT']);
    expect(loggedTypes(state)).not.toContain('INTRUDER_TRANSFORMED');
    expect(missingMiniatureEvents(state)).toEqual([
      { type: 'INTRUDER_MINIATURE_MISSING', intruderType: 'BREEDER', roomId: 11 },
    ]);
  });
});
