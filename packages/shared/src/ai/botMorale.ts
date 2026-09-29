import type { SanitizedGameState } from '../types/sanitized.js';
import type { BotCharacter, BotMind } from './botMind.js';
import type { BotTuning } from './botTuning.js';

/** «Проигрываю» (В8-6-3): видно по своему планшету — Тяжёлые Травмы или Личинка. */
export function isLosing(view: SanitizedGameState, botId: string, tuning: BotTuning): boolean {
  const self = view.players[botId];
  if (!self || self.isDead) return false;
  return self.seriousWounds.length >= tuning.morale.losingSeriousWounds || self.hasLarva;
}

function withMorale(character: BotCharacter, morale: number): BotCharacter {
  if (character.activePersona === 'ALTER' && character.alterEgo) {
    return { ...character, alterEgo: { ...character.alterEgo, morale } };
  }
  return { ...character, morale };
}

function activeMorale(character: BotCharacter): number {
  return character.activePersona === 'ALTER' && character.alterEgo ? character.alterEgo.morale : character.morale;
}

/** Дрейф морали за прошедшие раунды: накопленное за раунд плюс «проигрываю», шаг не больше предела. */
export function applyMoraleDrift(mind: BotMind, view: SanitizedGameState, rounds: number, tuning: BotTuning): BotMind {
  if (rounds <= 0) return mind;
  const losing = isLosing(view, mind.botId, tuning) ? tuning.morale.losing * rounds : 0;
  const limit = tuning.morale.driftLimitPerRound * rounds;
  const step = Math.max(-limit, Math.min(limit, mind.pendingMorale + losing));
  const morale = Math.max(tuning.morale.min, Math.min(tuning.morale.max, activeMorale(mind.character) + step));
  return { ...mind, character: withMorale(mind.character, morale), pendingMorale: 0 };
}
