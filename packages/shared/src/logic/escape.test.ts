import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { drainInterrupts, findAdjacentOpenRoomIds, GameEngine } from './fsm.js';
import { escapeAttackerIds, resolveEscapeAttack } from './escape.js';
import {
  combatStatusState,
  expectEngineError,
  forceAttack,
  giveSeriousWounds,
  putIntruder,
} from '../testing/contactFixtures.js';

/** Типы атак при Побеге в порядке журнала. */
function escapeEvents(state: GameState) {
  return state.gameLog
    .map((entry) => entry.event)
    .filter((event): event is Extract<GameState['gameLog'][number]['event'], { type: 'ESCAPE_ATTACK_RESOLVED' }> => {
      return event.type === 'ESCAPE_ATTACK_RESOLVED';
    });
}

/** Действие «Движение» из отсека 11: оплату берём из руки персонажа. */
function escapeAction(state: GameState, targetRoomId: number): GameState {
  const handCardId = state.players['player-1']!.actionDeck.hand[0]!.id;
  return new GameEngine().processAction(
    state,
    { type: 'ACTION_MOVE', payload: { targetRoomId, discardCardIds: [handCardId] } },
    { actorId: 'player-1' },
  );
}

function targetOf(state: GameState): number {
  return findAdjacentOpenRoomIds(state, state.players['player-1']!.roomId)[0]!;
}

describe('Побег из Боя (стр. 19; Шаг 7)', () => {
  it('Чужой, исчезнувший с поля до своей атаки, её не проводит', () => {
    const state = combatStatusState('escape-gone');
    const target = findAdjacentOpenRoomIds(state, state.players['player-1']!.roomId)[0]!;

    resolveEscapeAttack(state, {
      type: 'ESCAPE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderIds: ['gone-intruder'],
      targetRoomId: target,
    });
    drainInterrupts(state);

    expect(state.gameLog.some((entry) => entry.event.type === 'ESCAPE_ATTACK_RESOLVED')).toBe(false);
    // Исчезнувший Чужой — не атака: персонаж просто завершает Движение.
    expect(state.players['player-1']!.roomId).toBe(target);
    expect(state.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });
  it('атака до шага: раны применены, выживший завершает Движение, Шум и Действие', () => {
    const state = combatStatusState('escape-hit');
    putIntruder(state, 'ADULT', 11);
    forceAttack(state, 'SCRATCH');
    const target = targetOf(state);

    const next = escapeAction(state, target);

    expect(next.players['player-1']!.roomId).toBe(target);
    expect(next.players['player-1']!.lightWounds).toBe(1);
    // Цена Движения списана до атак: рука потеряла карту оплаты, Заражение — в сбросе.
    expect(next.players['player-1']!.actionDeck.discard.some((card) => 'isScanned' in card)).toBe(true);

    const types = next.gameLog.map((entry) => entry.event.type);
    const attackIndex = types.indexOf('ESCAPE_ATTACK_RESOLVED');
    const moveIndex = types.findIndex((event) => event === 'PLAYER_MOVED');
    expect(attackIndex).toBeGreaterThan(-1);
    expect(moveIndex).toBeGreaterThan(attackIndex);
    expect(types.slice(moveIndex + 1)).toContain('NOISE_ROLLED');
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('порядок атак FAQ Rules 5: Королева → Трутень → Крипер → Взрослая → Личинка', () => {
    const state = combatStatusState('escape-order');
    putIntruder(state, 'ADULT', 11);
    putIntruder(state, 'LARVA', 11);
    putIntruder(state, 'QUEEN', 11);
    putIntruder(state, 'BREEDER', 11);
    putIntruder(state, 'CREEPER', 11);

    const orderTypes = escapeAttackerIds(state, 11).map(
      (intruderId) => state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.type,
    );
    expect(orderTypes).toEqual(['QUEEN', 'BREEDER', 'CREEPER', 'ADULT', 'LARVA']);

    forceAttack(state, 'SCRATCH');
    const next = escapeAction(state, targetOf(state));

    expect(escapeEvents(next).map((event) => event.intruderType)).toEqual([
      'QUEEN',
      'BREEDER',
      'CREEPER',
      'ADULT',
      'LARVA',
    ]);
    expect(next.players['player-1']!.isDead).toBe(false);
    expect(next.players['player-1']!.hasLarva).toBe(true);
  });

  it('гибель при Побеге: Труп в исходном отсеке, шага нет, ход перешёл дальше', () => {
    const state = combatStatusState('escape-death');
    giveSeriousWounds(state, 'player-1', 2);
    putIntruder(state, 'ADULT', 11);
    forceAttack(state, 'BITE');
    const target = targetOf(state);

    const next = escapeAction(state, target);

    const player = next.players['player-1']!;
    expect(player.isDead).toBe(true);
    expect(player.roomId).toBe(11);
    expect(next.ship.rooms[target]!.occupantPlayerIds).not.toContain('player-1');

    // В Криогенном отсеке есть стартовый Труп — ищем именно Труп Капитана.
    const corpses = next.ship.rooms[11]!.objects.filter((object) => object.kind === 'CORPSE');
    expect(corpses.some((object) => object.characterClass === 'CAPTAIN')).toBe(true);

    const types = next.gameLog.map((entry) => entry.event.type);
    expect(types).toContain('PLAYER_DIED');
    expect(types).not.toContain('PLAYER_MOVED');
    // Соло-партия: погиб единственный персонаж — партия завершена.
    expect(next.meta.phase).toBe('GAME_OVER');
  });

  it('смерть обрывает очередь атак: второй Чужой уже не бьёт', () => {
    const state = combatStatusState('escape-death-break');
    giveSeriousWounds(state, 'player-1', 2);
    putIntruder(state, 'ADULT', 11);
    putIntruder(state, 'ADULT', 11);
    forceAttack(state, 'BITE');

    const next = escapeAction(state, targetOf(state));

    expect(next.players['player-1']!.isDead).toBe(true);
    expect(escapeEvents(next)).toHaveLength(1);
  });

  it('промах: на карте нет символа атакующего — ран нет, побег удался', () => {
    const state = combatStatusState('escape-miss');
    putIntruder(state, 'CREEPER', 11);
    forceAttack(state, 'BITE');
    const target = targetOf(state);

    const next = escapeAction(state, target);

    const attack = escapeEvents(next)[0]!;
    expect(attack.outcome).toBe('MISS');
    expect(next.players['player-1']!.lightWounds).toBe(0);
    expect(next.players['player-1']!.seriousWounds).toHaveLength(0);
    expect(next.players['player-1']!.roomId).toBe(target);
    expect(next.gameLog.some((entry) => entry.event.type === 'CONTAMINATION_RECEIVED')).toBe(false);
  });

  it('Личинка в отсеке: инфицирование вместо карты Атаки, миниатюра снята, побег продолжается', () => {
    const state = combatStatusState('escape-larva');
    putIntruder(state, 'LARVA', 11);
    forceAttack(state, 'SCRATCH');
    const deckBefore = state.decks.intruderAttacks.drawPile.length;
    const target = targetOf(state);

    const next = escapeAction(state, target);

    const attack = escapeEvents(next)[0]!;
    expect(attack.outcome).toBe('INFESTATION');
    expect(next.players['player-1']!.hasLarva).toBe(true);
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
    expect(next.decks.intruderAttacks.drawPile.length).toBe(deckBefore);
    expect(next.players['player-1']!.roomId).toBe(target);
  });

  it('Подавление Зовом действует и на атаку при Побеге', () => {
    const state = combatStatusState('escape-suppressed');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.intrudersPool.attackSuppression[intruderId] = {
      round: state.meta.currentRound,
      phase: state.meta.phase,
    };
    forceAttack(state, 'SCRATCH');
    const target = targetOf(state);

    const next = escapeAction(state, target);

    expect(escapeEvents(next)[0]!.outcome).toBe('SUPPRESSED');
    expect(next.players['player-1']!.lightWounds).toBe(0);
    expect(next.players['player-1']!.roomId).toBe(target);
  });

  it('нечем оплатить Движение — действие отклонено целиком, атак нет', () => {
    const state = combatStatusState('escape-no-pay');
    putIntruder(state, 'ADULT', 11);
    forceAttack(state, 'SCRATCH');
    state.players['player-1']!.actionDeck.hand = [];
    const logBefore = state.gameLog.length;

    expectEngineError(
      () =>
        new GameEngine().processAction(
          state,
          { type: 'ACTION_MOVE', payload: { targetRoomId: targetOf(state), discardCardIds: [] } },
          { actorId: 'player-1' },
        ),
      'INSUFFICIENT_ACTION_CARDS',
    );
    expect(state.gameLog.length).toBe(logBefore);
    expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(1);
    expect(state.players['player-1']!.roomId).toBe(11);
  });

  it('Побег вторым Действием: Шум разыгрывается до смены хода', () => {
    const state = combatStatusState('escape-second-action');
    putIntruder(state, 'ADULT', 11);
    forceAttack(state, 'SCRATCH');
    state.players['player-1']!.actionsPerformedThisRound = 1;
    const target = targetOf(state);

    const next = escapeAction(state, target);

    const types = next.gameLog.map((entry) => entry.event.type);
    const attackIndex = types.indexOf('ESCAPE_ATTACK_RESOLVED');
    const noiseIndex = types.findIndex((event, index) => index > attackIndex && event === 'NOISE_ROLLED');
    const turnIndex = types.findIndex((event) => event === 'PLAYER_TURN_STARTED');
    expect(noiseIndex).toBeGreaterThan(attackIndex);
    expect(turnIndex).toBeGreaterThan(noiseIndex);
    // Соло-партия: действие засчитано, микроход завершён — начался ход того же персонажа.
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(0);
  });
});
