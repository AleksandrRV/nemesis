import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contactState,
  forceAttack,
  forceToken,
  giveSeriousWounds,
  expectEngineError,
} from '../testing/contactFixtures.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';
import { corridorsLeadingInto, corridorNumbersOf } from './shipGraphQueries.js';

function movementContact(playerCount = 2): GameState {
  const state = contactState(playerCount, 'engine-test');
  state.ship.rooms[6]!.isExplored = false;
  state.ship.rooms[6]!.explorationEffect = null;
  corridorsLeadingInto(state, 6).find((corridor) => corridorNumbersOf(corridor, 6).includes(3))!.hasNoise = true;
  forceToken(state, 'ADULT', 4);
  return state;
}

function move(state: GameState): GameState {
  const player = state.players[state.meta.activePlayerId]!;
  return new GameEngine().processAction(state, {
    type: 'ACTION_MOVE',
    payload: { targetRoomId: 6, discardCardIds: [player.actionDeck.hand[0]!.id] },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('Внезапная атака внутри оплаченного движения', () => {
  it('оценивает руку после оплаты, до передачи хода и Пожара в новом отсеке', () => {
    const state = movementContact();
    const player = state.players['player-1']!;
    player.actionDeck.hand = player.actionDeck.hand.slice(0, 4);
    player.actionsPerformedThisRound = 1;
    player.lightWounds = 1;
    state.ship.rooms[6]!.hasFire = true;
    forceAttack(state, 'SCRATCH');
    const next = move(state);
    expect(next.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
      handCount: 3,
      escapeNumber: 4,
      surpriseAttack: true,
    });
    expect(next.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED')?.event).toMatchObject({
      victims: [{ playerId: 'player-1', lightWounds: 2, seriousWounds: 0 }],
    });
    const events = next.gameLog.map((entry) => entry.event.type);
    expect(events.indexOf('SURPRISE_ATTACK_RESOLVED')).toBeLessThan(events.indexOf('FIRE_DAMAGE_TAKEN'));
    expect(events.indexOf('FIRE_DAMAGE_TAKEN')).toBeLessThan(events.indexOf('PLAYER_TURN_STARTED'));
    expect(next.players['player-1']!.lightWounds).toBe(0);
    expect(next.players['player-1']!.seriousWounds).toHaveLength(1);
    expect(next.meta.activePlayerId).toBe('player-2');
    expect(next.interruptQueue).toEqual([]);
  });

  it('смерть в первой атаке передаёт ход по часовой стрелке, без урона Пожара и добора погибшему', () => {
    const state = movementContact(3);
    state.meta.activePlayerId = 'player-2';
    const player = state.players['player-2']!;
    player.actionDeck.hand = player.actionDeck.hand.slice(0, 1);
    giveSeriousWounds(state, player.id, 2);
    forceAttack(state, 'BITE');
    state.ship.rooms[6]!.hasFire = true;
    const drawPile = structuredClone(player.actionDeck.drawPile);
    const next = move(state);
    expect(next.players[player.id]!.isDead).toBe(true);
    expect(next.players[player.id]!.actionDeck.drawPile).toEqual(drawPile);
    expect(next.ship.rooms[6]!.objects).toContainEqual(
      expect.objectContaining({ kind: 'CORPSE', characterClass: player.characterClass }),
    );
    expect(next.meta.activePlayerId).toBe('player-3');
    expect(next.gameLog.some((entry) => entry.event.type === 'FIRE_DAMAGE_TAKEN')).toBe(false);
    const events = next.gameLog.map((entry) => entry.event.type);
    expect(events.indexOf('SURPRISE_ATTACK_RESOLVED')).toBeLessThan(events.indexOf('PLAYER_TURN_STARTED'));
  });

  it('смерть последнего персонажа завершает партию, не оставляя активного мёртвого игрока', () => {
    const state = movementContact(1);
    state.players['player-1']!.actionDeck.hand = state.players['player-1']!.actionDeck.hand.slice(0, 1);
    giveSeriousWounds(state, 'player-1', 2);
    forceAttack(state, 'BITE');
    const next = move(state);
    expect(next.meta).toMatchObject({ phase: 'GAME_OVER', gameOverReason: 'NO_ACTIVE_CHARACTERS' });
    expect(next.interruptQueue).toEqual([]);
    expectEngineError(() => new GameEngine().processAction(next, { type: 'ACTION_PASS', payload: {} }), 'GAME_IS_OVER');
  });

  it('Трансформация с пустой после оплаты рукой разыгрывает вторую атаку до завершения действия', () => {
    const state = movementContact();
    forceToken(state, 'CREEPER', 1);
    forceAttack(state, 'TRANSFORMATION');
    const pile = state.decks.intruderAttacks;
    const bite = pile.drawPile.find((card) => card.effect === 'BITE')!;
    pile.drawPile = [pile.drawPile[0]!, bite, ...pile.drawPile.slice(1).filter((card) => card.id !== bite.id)];
    state.players['player-1']!.actionDeck.hand = state.players['player-1']!.actionDeck.hand.slice(0, 1);
    giveSeriousWounds(state, 'player-1', 2);
    const next = move(state);
    const attacks = next.gameLog
      .filter((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED')
      .map((entry) => entry.event);
    expect(attacks).toMatchObject([
      { intruderType: 'CREEPER', card: { effect: 'TRANSFORMATION' } },
      { intruderType: 'BREEDER', card: { effect: 'BITE' } },
    ]);
    expect(next.players['player-1']!.isDead).toBe(true);
    expect(next.meta.activePlayerId).toBe('player-2');
    expect(next.decks.intruderAttacks.discard.map((card) => card.effect)).toEqual(['TRANSFORMATION', 'BITE']);
  });

  it('сбой после оплаты, вскрытия, RNG и ранения откатывает весь каскад', () => {
    const state = movementContact();
    state.players['player-1']!.actionDeck.hand = state.players['player-1']!.actionDeck.hand.slice(0, 1);
    forceAttack(state, 'SCRATCH');
    state.decks.contamination = { drawPile: [], discard: [] };
    const before = structuredClone(state);
    expectEngineError(() => move(state), 'CARD_SUPPLY_EXHAUSTED');
    expect(state).toEqual(before);
  });

  it('обычный вход к существующему Чужому не разыгрывает новый Контакт; бесплатного выхода из Боя нет', () => {
    const state = movementContact();
    state.ship.rooms[6]!.occupantIntruderIds = ['present-intruder'];
    state.intrudersPool.boardTokens = [{ id: 'present-intruder', type: 'ADULT', roomId: 6, woundsCount: 0 }];
    const before = { ...state.meta.rngDraws };
    const next = move(state);
    expect(next.meta.rngDraws).toEqual(before);
    expect(next.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED')).toBe(false);
    // Выход из отсека с Чужим — Побег: атака до шага (стр. 19; Шаг 7).
    const escaped = new GameEngine().processAction(next, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 11, discardCardIds: [next.players['player-1']!.actionDeck.hand[0]!.id] },
    });
    expect(escaped.players['player-1']!.roomId).toBe(11);
    expect(escaped.gameLog.some((entry) => entry.event.type === 'ESCAPE_ATTACK_RESOLVED')).toBe(true);
  });
});

describe('Обязательные Цели, сохранение очереди и блокировка посторонних действий', () => {
  function withObjectives(): GameState {
    const state = movementContact();
    state.players['player-1']!.actionDeck.hand = state.players['player-1']!.actionDeck.hand.slice(0, 1);
    forceAttack(state, 'SCRATCH');
    for (const player of Object.values(state.players)) {
      player.objectives = [
        { id: `${player.id}-secret-A`, name: 'Личная', description: 'Секрет A', kind: 'PERSONAL' },
        { id: `${player.id}-secret-B`, name: 'Корпоративная', description: 'Секрет B', kind: 'CORPORATE' },
      ];
    }
    return state;
  }

  function choose(state: GameState, actorId: string): GameState {
    return new GameEngine().processAction(
      state,
      {
        type: 'ACTION_RESOLVE_DECISION',
        payload: { decisionId: state.pendingDecision!.id, selectedOption: `${actorId}-secret-A` },
      },
      { actorId },
    );
  }

  it('ожидает всех игроков, включая спасовавшего, и не завершает движение дважды', () => {
    const state = withObjectives();
    state.players['player-2']!.hasPassed = true;
    const first = move(state);
    expect(first.pendingDecision?.playerId).toBe('player-1');
    expect(first.players['player-1']!.lightWounds).toBe(0);
    expect(first.players['player-1']!.actionsPerformedThisRound).toBe(0);
    const second = choose(first, 'player-1');
    expect(second.pendingDecision?.playerId).toBe('player-2');
    expect(second.meta.activePlayerId).toBe('player-1');
    const finished = choose(second, 'player-2');
    expect(finished.pendingDecision).toBeNull();
    expect(finished.players['player-1']!.lightWounds).toBe(1);
    expect(finished.players['player-1']!.actionsPerformedThisRound).toBe(1);
    expect(finished.players['player-2']!.actionsPerformedThisRound).toBe(0);
    expect(finished.interruptQueue).toEqual([]);
    expect(Object.values(finished.players).every((player) => player.objectives.length === 1)).toBe(true);
  });

  it('Пас, перемещение, dev-действия и подмена владельца/варианта не обходят решение', () => {
    const state = move(withObjectives());
    const before = structuredClone(state);
    const engine = new GameEngine();
    expectEngineError(
      () => engine.processAction(state, { type: 'ACTION_PASS', payload: {} }),
      'PENDING_DECISION_REQUIRED',
    );
    expectEngineError(
      () => engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: 11, discardCardIds: [] } }),
      'PENDING_DECISION_REQUIRED',
    );
    expectEngineError(
      () =>
        engine.processAction(
          state,
          { type: 'DEV_TOGGLE_NOISE', payload: { corridorId: '6-11' } },
          { allowDevActions: true },
        ),
      'PENDING_DECISION_REQUIRED',
    );
    expectEngineError(() => choose(state, 'player-2'), 'NOT_ACTIVE_PLAYER');
    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: state.pendingDecision!.id, selectedOption: 'player-2-secret-A' },
        }),
      'INVALID_DECISION_OPTION',
    );
    expect(state).toEqual(before);
  });

  it('продолжает очередь после JSON-загрузки без повторной оплаты, вытягивания жетона или смены ID', () => {
    const state = choose(move(withObjectives()), 'player-1');
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    const afterReload = choose(restored, 'player-2');
    const uninterrupted = choose(state, 'player-2');
    expect(afterReload).toEqual(uninterrupted);
    expect(afterReload.meta.rngDraws.bag).toBe(state.meta.rngDraws.bag);
    expect(afterReload.players['player-1']!.actionDeck.discard).toHaveLength(2);
  });

  it('публичный срез не содержит чужих Целей, отложенного выбора или инфекции', () => {
    const state = move(withObjectives());
    const other = filterStateForPlayer(state, 'player-2');
    expect(other.pendingDecision).toBeNull();
    expect(other.pendingDecisionPlayerId).toBe('player-1');
    expect(JSON.stringify(other)).not.toContain('player-1-secret');
    const finished = choose(choose(state, 'player-1'), 'player-2');
    const view = filterStateForPlayer(finished, 'player-2');
    expect(view.players['player-1']!.actionDeck.discard).toEqual([]);
    expect(view.decks.intruderAttacks.discard[0]?.effect).toBe('SCRATCH');
    expect(JSON.stringify(view.gameLog)).not.toContain('secret-');
    expect(JSON.stringify(view.gameLog)).not.toContain('isInfected');
  });

  it('одинаковый сид и действия воспроизводят всё состояние независимо от часов', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const first = move(withObjectives());
    vi.spyOn(Date, 'now').mockReturnValue(987654321);
    const second = move(withObjectives());
    expect(second).toEqual(first);
  });
});

describe('Личинка при Контакте сквозь движение', () => {
  it('движение в отсек с Шумом завершается заражением: без миниатюры, без Боя, с картой Заражения', () => {
    const state = movementContact();
    forceToken(state, 'LARVA');

    const next = move(state);

    expect(next.intrudersPool.boardTokens).toEqual([]);
    expect(next.players['player-1']!.hasLarva).toBe(true);
    // Оплата движения легла в сброс раньше; Заражение appended последним.
    const discard = next.players['player-1']!.actionDeck.discard;
    expect(discard.at(-1)).toMatchObject({ isScanned: false });
    expect(next.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED')?.event).toMatchObject({
      tokenType: 'LARVA',
      infestation: { alreadyInfested: false },
      surpriseAttack: false,
    });
    // Заражение не считается Первым Контактом: выбор Целей не запускается.
    expect(next.gameLog.some((entry) => entry.event.type === 'FIRST_CONTACT')).toBe(false);
    // Для санитайзера: монстров в отсеке нет, клиент увидит пустой список.
    const view = filterStateForPlayer(next, 'player-1');
    expect(view.ship.rooms[6]!.occupantIntruderIds).toEqual([]);
  });
});
