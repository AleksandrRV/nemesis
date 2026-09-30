import { phrasesFor, type PhraseKind, type PhraseTone } from '../data/botPhrases.js';
import { activePersona } from './botCharacter.js';
import type { BotCharacter } from './botMind.js';
import type { BotTuning } from './botTuning.js';

/** Интонация активной личности: голос первой черты с голосом, иначе — по морали. */
export function toneOf(character: BotCharacter, tuning: BotTuning): PhraseTone {
  const persona = activePersona(character);
  const voiced = persona.traits.map((trait) => tuning.traits.catalog[trait].voice).find((tone) => tone !== undefined);
  if (voiced) return voiced;
  if (persona.morale >= tuning.comms.warmMorale) return 'WARM';
  if (persona.morale <= tuning.comms.coldMorale) return 'COLD';
  return 'CALM';
}

/** Фраза для сообщения: интонация характера, вариант — бросок личного потока `ai`. */
export function pickPhraseId(
  kind: PhraseKind,
  character: BotCharacter,
  roll: number,
  tuning: BotTuning,
): string | undefined {
  const options = phrasesFor(kind, toneOf(character, tuning));
  return options[Math.min(options.length - 1, Math.floor(roll * options.length))]?.id;
}
