import type { InterruptEvent } from '../types/interrupts.js';
import type { GameState } from '../types/state.js';
import { drawFromStream } from '../utils/rng.js';
import { receiveContamination } from './characterDamage.js';
import { isWeaknessRevealed } from './weaknesses.js';

/**
 * Проверка Внезапной Атаки (стр. 18): карты на руке строго меньше числа
 * на жетоне. «Реакция на опасность» снижает значение на 1, но не ниже 1
 * (doc/data/WEAKNESSES.md; стр. 21). «Зов» внезапной атаки не вызывает.
 */
export function isSurpriseAttack(
  state: GameState,
  token: { escapeNumber: number },
  handCount: number,
  source: 'NOISE' | 'CALL' | 'EVENT',
): boolean {
  const threshold = Math.max(1, token.escapeNumber - (isWeaknessRevealed(state, 'DANGER_REACTION') ? 1 : 0));
  return source !== 'CALL' && handCount < threshold;
}

import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { placeIntruder, returnTokenToBag } from './intruderPlacement.js';
import { clearRoomNoise, fillRoomNoise } from './noiseMarkers.js';
import { allocateEntityId } from './stateIds.js';

export function requestFirstContactObjective(state: GameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (player.isDead || player.objectives.length <= 1) return;
  state.pendingDecision = {
    id: allocateEntityId(state, 'first-contact-objective'),
    playerId,
    type: 'CHOOSE_OBJECTIVE',
    objectiveIds: player.objectives.map((objective) => objective.id),
  };
}

export function resolveContact(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'CONTACT_INTERRUPT' }>,
): void {
  const { playerId, roomId, source } = interrupt;
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${playerId}.`);
  if (!state.ship.rooms[roomId]) throw new EngineError('UNKNOWN_ROOM', `Отсека ${roomId} нет на корабле.`);
  if (player.isDead) return;
  if (player.roomId !== roomId || player.isInHibernation || player.hasEscapedInPod) {
    throw new EngineError('INVALID_ATTACK_TARGET', 'Участник Контакта должен находиться в указанном отсеке.');
  }
  const bag = state.intrudersPool.bag;
  if (bag.length === 0) throw new EngineError('EMPTY_INTRUDER_BAG', 'В Пуле Чужих нет жетонов.');
  clearRoomNoise(state, roomId);
  const value = drawFromStream(state.meta.seed, 'bag', state.meta.rngDraws.bag);
  state.meta.rngDraws.bag += 1;
  const token = bag.splice(Math.floor(value * bag.length), 1)[0]!;
  const handCount = player.actionDeck.hand.length;

  if (token.type === 'BLANK') {
    if (bag.length === 0) returnTokenToBag(state, 'ADULT');
    bag.push(token);
    appendGameLog(state, {
      type: 'CONTACT_OCCURRED',
      playerId,
      roomId,
      source,
      tokenType: 'BLANK',
      escapeNumber: token.escapeNumber,
      handCount,
      intruderId: null,
      firstEncounter: false,
      surpriseAttack: false,
    });
    fillRoomNoise(state, playerId, roomId, 'BLANK');
    return;
  }

  if (token.type === 'LARVA') {
    // Личинка не ставится миниатюрой в отсек: она немедленно заражает
    // персонажа (стр. 18 в связке со стр. 20; ИНТРУДЕРЫ §2 — «атакует
    // автоматически»). Миниатюра не появляется, поэтому Первым Контактом
    // это не считается (стр. 12), а Внезапная атака не проверяется:
    // заражение и есть исход Контакта. Вытянутый жетон уходит в запас
    // рядом с полем (FAQ Rules 19 — жетоны всегда остаются в пуле),
    // фактом партии остаётся флаг `hasLarva` на планшете. Повторная
    // Личинка исчезает без гибели персонажа (FAQ Rules 12): только ещё
    // одна карта Заражения.
    state.intrudersPool.supply.push(token);
    const alreadyInfested = player.hasLarva;
    player.hasLarva = true;
    receiveContamination(state, playerId);
    appendGameLog(state, {
      type: 'CONTACT_OCCURRED',
      playerId,
      roomId,
      source,
      tokenType: 'LARVA',
      escapeNumber: token.escapeNumber,
      handCount,
      intruderId: null,
      firstEncounter: false,
      surpriseAttack: false,
      infestation: { alreadyInfested },
    });
    return;
  }

  state.intrudersPool.supply.push(token);
  const intruder = placeIntruder(state, token.type, roomId);
  const firstEncounter = !state.intrudersPool.firstEncounterOccurred;
  state.intrudersPool.firstEncounterOccurred = true;
  const surpriseAttack = isSurpriseAttack(state, token, handCount, source);
  if (source === 'CALL') {
    state.intrudersPool.attackSuppression[intruder.id] = { round: state.meta.currentRound, phase: state.meta.phase };
  }
  appendGameLog(state, {
    type: 'CONTACT_OCCURRED',
    playerId,
    roomId,
    source,
    tokenType: token.type,
    escapeNumber: token.escapeNumber,
    handCount,
    intruderId: intruder.id,
    firstEncounter,
    surpriseAttack,
  });
  const following: InterruptEvent[] = [];
  if (firstEncounter) {
    appendGameLog(state, { type: 'FIRST_CONTACT', playerId, roomId });
    const players = Object.values(state.players).sort((left, right) => left.orderNumber - right.orderNumber);
    for (const candidate of players) {
      if (!candidate.isDead && candidate.objectives.length > 1) {
        following.push({ type: 'FIRST_CONTACT_OBJECTIVE_INTERRUPT', playerId: candidate.id });
      }
    }
  }
  if (surpriseAttack) {
    // «Стальные нервы»: сброс карты отменяет Внезапную Атаку (стр. 25).
    // Есть карта — спрашиваем владельца решением; нет — атака состоится.
    const nerves = player.actionDeck.hand.find(
      (entry) => 'characterClass' in entry && entry.id === 'ACT_SOL_STEEL_NERVES',
    );
    if (nerves && 'characterClass' in nerves) {
      state.pendingDecision = {
        id: allocateEntityId(state, 'steel-nerves'),
        playerId,
        type: 'STEEL_NERVES_OFFER',
        intruderId: intruder.id,
        intruderType: intruder.type,
      };
    } else {
      following.push({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId, intruderId: intruder.id });
    }
  }
  state.interruptQueue.unshift(...following);
}
