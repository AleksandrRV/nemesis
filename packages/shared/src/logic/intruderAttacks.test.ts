import { describe, expect, it } from 'vitest';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import {
  contactState,
  existingIntruder,
  forceAttack,
  forceToken,
  giveSeriousWounds,
  putPlayer,
  expectEngineError,
} from '../testing/contactFixtures.js';
import type { IntruderAttackEffect } from '../types/cards.js';
import type { IntruderAttackerType } from '../types/cards.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';
import { drainInterrupts } from './interrupts.js';
import { filterStateForPlayer } from './sanitizer.js';

const SYMBOLS: Record<IntruderAttackEffect, readonly IntruderAttackerType[]> = {
  SCRATCH: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
  BITE: ['ADULT', 'BREEDER', 'QUEEN'],
  CLAW_ATTACK: ['ADULT', 'BREEDER', 'QUEEN'],
  TAIL_ATTACK: ['QUEEN'],
  TRANSFORMATION: ['CREEPER'],
  FRENZY: ['BREEDER', 'QUEEN'],
  SLIME: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
  CALL: ['CREEPER', 'QUEEN'],
};

const ACTORS = ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const;

describe('Символы атакующего: все 20 карт × 4 типа (стр. 20)', () => {
  it.each(INTRUDER_ATTACK_CARDS.flatMap((card) => ACTORS.map((type) => ({ card, type }))))(
    '$card.id / $type',
    ({ card, type }) => {
      const state = contactState();
      const intruderId = existingIntruder(state, type);
      const first = state.decks.intruderAttacks.drawPile.find((candidate) => candidate.id === card.id)!;
      state.decks.intruderAttacks.drawPile = [
        first,
        ...state.decks.intruderAttacks.drawPile.filter((candidate) => candidate.id !== card.id),
      ];
      const beforePlayer = structuredClone(state.players['player-1']);
      resolveSurpriseAttack(state, 'player-1', intruderId);
      const hit = SYMBOLS[card.effect].includes(type);
      expect(state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED')?.event).toMatchObject({
        intruderType: type,
        card: { id: card.id },
        outcome: hit ? 'HIT' : 'MISS',
      });
      expect(state.decks.intruderAttacks.discard.map((discarded) => discarded.id)).toEqual([card.id]);
      expect(state.intrudersPool.boardTokens[0]?.woundsCount).toBe(0);
      if (!hit) expect(state.players['player-1']).toEqual(beforePlayer);
    },
  );
});

describe('Эффекты Внезапной атаки', () => {
  it.each([
    ['SCRATCH', 1],
    ['CLAW_ATTACK', 2],
  ] as const)('%s: %i Лёгких Травм и Заражение в сброс, не в руку', (effect, count) => {
    const state = contactState();
    forceAttack(state, effect);
    const intruderId = existingIntruder(state, 'ADULT');
    const beforeHand = [...state.players['player-1']!.actionDeck.hand];
    const contamination = { ...state.decks.contamination.drawPile[0]! };
    resolveSurpriseAttack(state, 'player-1', intruderId);
    const player = state.players['player-1']!;
    expect(player.lightWounds).toBe(count);
    expect(player.actionDeck.hand).toEqual(beforeHand);
    expect(player.actionDeck.discard).toEqual([contamination]);
    expect(state.decks.contamination.drawPile).toHaveLength(26);
    expect(filterStateForPlayer(state, player.id).players[player.id]!.actionDeck.discard[0]).toMatchObject({
      isScanned: false,
      isInfected: null,
    });
    expect(JSON.stringify(state.gameLog)).not.toContain('isInfected');
  });

  it.each([
    ['BITE', 'ADULT', 2],
    ['TAIL_ATTACK', 'QUEEN', 1],
  ] as const)(
    '%s (%s) убивает при %i Тяжёлых Травмах, включая обработанные (текст карты)',
    (effect, type, threshold) => {
      const state = contactState();
      forceAttack(state, effect);
      giveSeriousWounds(state, 'player-1', threshold, true);
      const intruderId = existingIntruder(state, type);
      const beforeDeck = [...state.decks.seriousWounds.drawPile];
      resolveSurpriseAttack(state, 'player-1', intruderId);
      expect(state.players['player-1']!.isDead).toBe(true);
      expect(state.players['player-1']!.seriousWounds).toHaveLength(threshold);
      expect(state.decks.seriousWounds.drawPile).toEqual(beforeDeck);
      expect(state.ship.rooms[11]!.objects).toContainEqual(
        expect.objectContaining({ kind: 'CORPSE', characterClass: state.players['player-1']!.characterClass }),
      );
    },
  );

  it.each([
    ['BITE', 'ADULT', 1],
    ['TAIL_ATTACK', 'QUEEN', 0],
  ] as const)('%s ниже порога даёт только одну Тяжёлую Травму', (effect, type, count) => {
    const state = contactState();
    forceAttack(state, effect);
    giveSeriousWounds(state, 'player-1', count);
    resolveSurpriseAttack(state, 'player-1', existingIntruder(state, type));
    expect(state.players['player-1']!.isDead).toBe(false);
    expect(state.players['player-1']!.seriousWounds).toHaveLength(count + 1);
  });

  it('Ярость задевает всех живых персонажей комнаты, но не соседей и не покинувших корабль', () => {
    const state = contactState(5);
    forceAttack(state, 'FRENZY');
    giveSeriousWounds(state, 'player-1', 2);
    giveSeriousWounds(state, 'player-2', 1);
    putPlayer(state, 'player-3', 14);
    state.players['player-4']!.hasEscapedInPod = true;
    state.players['player-5']!.isInHibernation = true;
    resolveSurpriseAttack(state, 'player-1', existingIntruder(state, 'BREEDER'));
    expect(state.players['player-1']!.isDead).toBe(true);
    expect(state.players['player-2']!.seriousWounds).toHaveLength(2);
    for (const playerId of ['player-3', 'player-4', 'player-5']) {
      expect(state.players[playerId]!.isDead).toBe(false);
      expect(state.players[playerId]!.seriousWounds).toHaveLength(0);
    }
    expect(state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED')?.event).toMatchObject({
      victims: [
        { playerId: 'player-1', isDead: true },
        { playerId: 'player-2', isDead: false },
      ],
    });
  });

  it('Слизь ставит один маркер, но повторная атака всё равно приносит Заражение', () => {
    const state = contactState();
    forceAttack(state, 'SLIME');
    state.players['player-1']!.hasSlime = true;
    resolveSurpriseAttack(state, 'player-1', existingIntruder(state, 'ADULT'));
    expect(state.players['player-1']!.hasSlime).toBe(true);
    expect(state.players['player-1']!.actionDeck.discard).toHaveLength(1);
  });

  it.each([0, 1])(
    'Трансформация при %i картах в руке: Трутень на месте Крипера; дополнительная атака только при пустой руке',
    (count) => {
      const state = contactState();
      forceAttack(state, 'TRANSFORMATION');
      state.players['player-1']!.actionDeck.hand = state.players['player-1']!.actionDeck.hand.slice(0, count);
      const id = existingIntruder(state, 'CREEPER');
      state.interruptQueue = [{ type: 'COMPLETE_ACTION_INTERRUPT', playerId: 'player-1' }];
      resolveSurpriseAttack(state, 'player-1', id);
      expect(state.intrudersPool.boardTokens).toEqual([{ id, type: 'BREEDER', roomId: 11, woundsCount: 0 }]);
      expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([id]);
      expect(state.interruptQueue.map((interrupt) => interrupt.type)).toEqual(
        count === 0 ? ['SURPRISE_ATTACK_INTERRUPT', 'COMPLETE_ACTION_INTERRUPT'] : ['COMPLETE_ACTION_INTERRUPT'],
      );
    },
  );

  it('Зов ставит нового Чужого без Внезапной атаки и сохраняет запрет атак в текущей фазе', () => {
    const state = contactState();
    forceAttack(state, 'CALL');
    forceToken(state, 'QUEEN', 4);
    state.players['player-1']!.actionDeck.hand = [];
    resolveSurpriseAttack(state, 'player-1', existingIntruder(state, 'CREEPER'));
    drainInterrupts(state);
    const queen = state.intrudersPool.boardTokens.find((intruder) => intruder.type === 'QUEEN')!;
    expect(queen).toBeDefined();
    expect(state.intrudersPool.attackSuppression[queen.id]).toEqual({ round: 1, phase: 'PLAYER_PHASE' });
    expect(state.gameLog.filter((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED')).toHaveLength(1);
    const beforeDeck = structuredClone(state.decks.intruderAttacks);
    resolveSurpriseAttack(state, 'player-1', queen.id);
    expect(state.decks.intruderAttacks).toEqual(beforeDeck);
    state.meta.phase = 'EVENT_PHASE';
    forceAttack(state, 'SCRATCH');
    resolveSurpriseAttack(state, 'player-1', queen.id);
    expect(state.players['player-1']!.lightWounds).toBe(1);
  });
});

describe('Личинка: атака без карты (стр. 20; официальный FAQ, Rules 12)', () => {
  it.each([false, true])(
    'hasLarva=%s: Личинка исчезает с поля, персонаж жив и получает только Заражение',
    (hasLarva) => {
      const state = contactState();
      state.players['player-1']!.hasLarva = hasLarva;
      giveSeriousWounds(state, 'player-1', 3);
      const id = existingIntruder(state, 'LARVA');
      const before = structuredClone(state.decks.intruderAttacks);
      const counters = { ...state.meta.rngDraws };
      resolveSurpriseAttack(state, 'player-1', id);
      expect(state.players['player-1']!).toMatchObject({ isDead: false, hasLarva: true, lightWounds: 0 });
      expect(state.players['player-1']!.actionDeck.hand).toHaveLength(5);
      expect(state.players['player-1']!.actionDeck.discard).toHaveLength(1);
      expect(state.intrudersPool.boardTokens).toEqual([]);
      expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
      expect(state.decks.intruderAttacks).toEqual(before);
      expect(state.meta.rngDraws).toEqual(counters);
    },
  );

  it('отвергает атаку чужой комнаты до вытягивания карты', () => {
    const state = contactState();
    const id = existingIntruder(state, 'ADULT', 14);
    const before = structuredClone(state);
    expectEngineError(() => resolveSurpriseAttack(state, 'player-1', id), 'INVALID_ATTACK_TARGET');
    expect(state).toEqual(before);
  });
});
