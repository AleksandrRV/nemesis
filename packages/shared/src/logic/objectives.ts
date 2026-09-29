import type { ObjectiveCard } from '../types/cards.js';
import type { PlayerState } from '../types/entities.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { GameMode, GameState } from '../types/state.js';
import type { RoomId } from '../types/rooms.js';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
  SOLO_OBJECTIVES_DEALT,
  objectivesForPlayerCount,
} from '../data/objectiveCards.js';
import { shuffle } from '../utils/rng.js';
import type { Rng } from '../utils/rng.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';

function shuffledCopies(rng: Rng, cards: readonly ObjectiveCard[]): ObjectiveCard[] {
  return shuffle(rng, cards).map((card) => structuredClone(card));
}

/** Подготовка, стр. 8, шаг 16; Соло и Кооператив — стр. 27. Руки Целей по номерам игроков, остаток — в коробку. */
export function dealObjectiveHands(playerCount: number, gameMode: GameMode, rng: Rng): ObjectiveCard[][] {
  if (gameMode === 'SOLO' || gameMode === 'COOP') {
    if (playerCount * SOLO_OBJECTIVES_DEALT > SOLO_COOP_OBJECTIVE_CARDS.length) {
      throw new EngineError(
        'OBJECTIVE_DECK_EXHAUSTED',
        `Соло/Кооп Целей ${SOLO_COOP_OBJECTIVE_CARDS.length}: на ${playerCount} игроков по ${SOLO_OBJECTIVES_DEALT} не хватит.`,
      );
    }
    const soloDeck = shuffledCopies(rng, SOLO_COOP_OBJECTIVE_CARDS);
    return Array.from({ length: playerCount }, () => soloDeck.splice(0, SOLO_OBJECTIVES_DEALT));
  }
  const corporate = shuffledCopies(rng, objectivesForPlayerCount(CORPORATE_OBJECTIVE_CARDS, playerCount));
  const personal = shuffledCopies(rng, objectivesForPlayerCount(PERSONAL_OBJECTIVE_CARDS, playerCount));
  return Array.from({ length: playerCount }, (_, index) => [corporate[index]!, personal[index]!]);
}

export function dealObjectives(playersInOrder: readonly PlayerState[], gameMode: GameMode, rng: Rng): void {
  const hands = dealObjectiveHands(playersInOrder.length, gameMode, rng);
  playersInOrder.forEach((player, index) => {
    player.objectives = hands[index]!;
  });
}

function playersChoosingObjective(state: GameState): PlayerState[] {
  return Object.values(state.players)
    .filter((player) => !player.isDead && player.objectives.length > 1)
    .sort((left, right) => left.orderNumber - right.orderNumber);
}

/**
 * Первый Контакт (стр. 12): первая миниатюра Чужого любого типа на поле — Контакт,
 * Ползун из погибшего носителя, Королева в Улье. Возвращает выбор Цели для каждого
 * игрока; вызывающий ставит его в стек до продолжения розыгрыша.
 */
export function announceIntruderMiniature(state: GameState, playerId: string, roomId: RoomId): InterruptEvent[] {
  if (state.intrudersPool.firstEncounterOccurred) return [];
  state.intrudersPool.firstEncounterOccurred = true;
  appendGameLog(state, { type: 'FIRST_CONTACT', playerId, roomId });
  return playersChoosingObjective(state).map((player) => ({
    type: 'FIRST_CONTACT_OBJECTIVE_INTERRUPT',
    playerId: player.id,
  }));
}
