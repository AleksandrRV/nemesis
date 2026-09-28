import type { CombatDieFace } from '../data/combatDie.js';
import type { WeaknessEffect } from '../types/cards.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';

/**
 * Раскрыта ли Слабость с данным машинным эффектом (стр. 21): изученная
 * в Лаборатории карта переворачивается и действует до конца партии.
 * Рубашкой вверх лежащие карты эффектов не создают — их состав скрыт.
 */
export function isWeaknessRevealed(state: GameState, effect: WeaknessEffect): boolean {
  return state.intrudersPool.weaknessSlots.some((slot) => slot.card?.isRevealed && slot.card.effect === effect);
}

/** «Уязвимые места»: при атаке Взрослых Особей выброшенный Промах считается «1 Раной». */
export function countedCombatFace(
  state: GameState,
  rolledFace: CombatDieFace,
  targetType: IntruderType,
): CombatDieFace {
  const isVulnerableSpot =
    rolledFace === 'MISS' && targetType === 'ADULT' && isWeaknessRevealed(state, 'VULNERABLE_SPOTS');
  return isVulnerableSpot ? 'ONE_WOUND' : rolledFace;
}
