import type { IntruderAttackEffect } from '../types/cards.js';
import type { AttackVictimStatus, IntruderLogEvent } from '../types/contact.js';
import type { GameState } from '../types/state.js';
import { drawSharedCard, reshuffleDiscard } from './cardPiles.js';
import { killPlayer, receiveContamination, sufferLightWounds, sufferSeriousWound } from './characterDamage.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { livingPlayersInRoom, removeIntruder, requireIntruder, transformCreeper } from './intruderPlacement.js';
import { isWeaknessRevealed } from './weaknesses.js';

function victimStatus(state: GameState, playerId: string): AttackVictimStatus {
  const player = state.players[playerId]!;
  return {
    playerId,
    isDead: player.isDead,
    lightWounds: player.lightWounds,
    seriousWounds: player.seriousWounds.length,
    hasLarva: player.hasLarva,
    hasSlime: player.hasSlime,
  };
}

function applyAttackEffect(
  state: GameState,
  playerId: string,
  intruderId: string,
  effect: IntruderAttackEffect,
): string[] {
  const player = state.players[playerId]!;
  switch (effect) {
    case 'SCRATCH':
    case 'CLAW_ATTACK':
      sufferLightWounds(state, playerId, effect === 'SCRATCH' ? 1 : 2);
      receiveContamination(state, playerId);
      break;
    case 'BITE':
    case 'TAIL_ATTACK': {
      // «Повадки атаки»: Укус Взрослой Особи наносит Лёгкую Травму вместо
      // Тяжёлой (doc/data/WEAKNESSES.md; стр. 21) — без правил мгновенной
      // смерти от Укуса, они относятся к Тяжёлой Травме.
      const attackerType = requireIntruder(state, intruderId).type;
      if (effect === 'BITE' && attackerType === 'ADULT' && isWeaknessRevealed(state, 'ATTACK_BEHAVIOR')) {
        sufferLightWounds(state, playerId, 1);
        break;
      }
      if (player.seriousWounds.length >= (effect === 'BITE' ? 2 : 1)) killPlayer(state, playerId);
      else sufferSeriousWound(state, playerId);
      break;
    }
    case 'SLIME':
      player.hasSlime = true;
      receiveContamination(state, playerId);
      break;
    case 'FRENZY': {
      const victims = livingPlayersInRoom(state, player.roomId);
      for (const victimId of victims) {
        if (state.players[victimId]!.seriousWounds.length >= 2) killPlayer(state, victimId);
        else sufferSeriousWound(state, victimId);
      }
      return victims;
    }
    case 'TRANSFORMATION':
      transformCreeper(state, intruderId);
      if (player.actionDeck.hand.length === 0) {
        state.interruptQueue.unshift({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId, intruderId });
      }
      break;
    case 'CALL':
      state.interruptQueue.unshift({ type: 'CONTACT_INTERRUPT', playerId, roomId: player.roomId, source: 'CALL' });
      break;
  }
  return [playerId];
}

/** Общее тело события об атаке Чужого — Внезапная атака и Побег различаются только `type`. */
export type AttackLogPayload = Omit<Extract<IntruderLogEvent, { type: 'SURPRISE_ATTACK_RESOLVED' }>, 'type'>;

/**
 * Ядро Атаки Чужого (стр. 20): подавление Зовом, Личинка-инфицирование либо
 * вытягивание карты Атаки с проверкой символов. Событие журнала подбирает
 * вызывающая сторона — Внезапная атака и Побег различаются только им.
 */
export function performIntruderAttack(
  state: GameState,
  playerId: string,
  intruderId: string,
  appendEvent: (payload: AttackLogPayload) => void,
): void {
  const player = state.players[playerId]!;
  const intruder = requireIntruder(state, intruderId);
  const intruderType = intruder.type;
  const common = { playerId, intruderId, intruderType, roomId: player.roomId };

  // «Зов» подавляет атаки этой особи до конца текущей фазы — в любом
  // контексте атаки (Внезапная атака, Побег).
  const suppression = state.intrudersPool.attackSuppression[intruderId];
  if (suppression?.round === state.meta.currentRound && suppression.phase === state.meta.phase) {
    appendEvent({ ...common, card: null, outcome: 'SUPPRESSED', victims: [] });
    return;
  }

  if (intruderType === 'LARVA') {
    removeIntruder(state, intruderId);
    player.hasLarva = true;
    receiveContamination(state, playerId);
    appendEvent({ ...common, card: null, outcome: 'INFESTATION', victims: [victimStatus(state, playerId)] });
    return;
  }

  const pile = state.decks.intruderAttacks;
  const card = drawSharedCard(state, pile, 'Атаки Чужих');
  const hit = card.attackerTypes.includes(intruderType);
  const victims = hit ? applyAttackEffect(state, playerId, intruderId, card.effect) : [playerId];
  appendEvent({
    ...common,
    card: { ...card, attackerTypes: [...card.attackerTypes] },
    outcome: hit ? 'HIT' : 'MISS',
    victims: victims.map((id) => victimStatus(state, id)),
  });
  pile.discard.push(card);
  reshuffleDiscard(state, pile);
}

export function resolveSurpriseAttack(state: GameState, playerId: string, intruderId: string): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (player.isDead) return;
  const intruder = requireIntruder(state, intruderId);
  if (intruder.roomId !== player.roomId || player.isInHibernation || player.hasEscapedInPod) {
    throw new EngineError('INVALID_ATTACK_TARGET', 'Атакующий Чужой и персонаж должны находиться в одном отсеке.');
  }
  performIntruderAttack(state, playerId, intruderId, (event) =>
    appendGameLog(state, { type: 'SURPRISE_ATTACK_RESOLVED', ...event }),
  );
}
