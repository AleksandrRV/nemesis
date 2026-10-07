import { ACTION_CARDS } from '../data/actionCards.js';
import { CONTAMINATION_CARDS_COUNT, CONTAMINATION_CARDS_INFECTED_COUNT } from '../data/contaminationCards.js';
import type { SanitizedContaminationCard, SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { eventDrawChance } from './botEventDeck.js';
import { isActionCard } from './botHand.js';
import { roundsLeft } from './botRisk.js';

/** На проверке Заражения после Прыжка игрок берёт 4 верхние карты замешанной колоды (стр. 11). */
const FINAL_INFECTION_DRAW = 4;
const INFECTED_SHARE = CONTAMINATION_CARDS_INFECTED_COUNT / CONTAMINATION_CARDS_COUNT;

function classDeckSize(self: SanitizedPlayerState): number {
  return ACTION_CARDS.filter((card) => card.characterClass === self.characterClass).length;
}

interface OwnDeck {
  cards: number;
  contamination: number;
  /** Карты Заражения, о которых бот не знает, есть ли на них ИНФЕКЦИЯ. */
  unknown: number;
  infectedKnown: boolean;
}

/** Своя колода глазами бота: рука и сброс открыты владельцу, в колоде добора — всё, чего там не видно (стр. 18). */
function ownDeck(self: SanitizedPlayerState): OwnDeck {
  const deck = self.actionDeck;
  const cards = deck.handCount + deck.discardCount + deck.drawPileCount;
  const contamination = Math.max(0, cards - classDeckSize(self));
  const known = [...deck.hand, ...deck.discard].filter(
    (card): card is SanitizedContaminationCard => !isActionCard(card) && card.isInfected !== null,
  );
  return {
    cards,
    contamination,
    unknown: Math.max(0, contamination - known.length),
    infectedKnown: known.some((card) => card.isInfected === true),
  };
}

/** Шанс вытянуть хоть одну карту Заражения среди 4 из замешанной колоды (стр. 11, шаг Б). */
function drawsContamination(deck: OwnDeck): number {
  let clean = 1;
  for (let draw = 0; draw < FINAL_INFECTION_DRAW; draw++) {
    const left = deck.cards - draw;
    if (left <= 0) break;
    clean *= Math.max(0, left - deck.contamination) / left;
  }
  return 1 - clean;
}

/**
 * Гибель на проверке Заражения у спасшегося (стр. 11): с Личинкой — сразу шаг Б; без неё — только если среди карт
 * Заражения есть ИНФЕКЦИЯ (доля таких карт в колоде Заражения).
 */
export function finalCheckDeath(self: SanitizedPlayerState): number {
  const deck = ownDeck(self);
  if (deck.contamination === 0 && !self.hasLarva) return 0;
  const infected = self.hasLarva || deck.infectedKnown ? 1 : 1 - Math.pow(1 - INFECTED_SHARE, deck.unknown);
  return infected * drawsContamination(deck);
}

/** «Созревание» убивает носителя Личинки (стр. 10): шанс, что карта выйдет до конца партии. */
export function maturationChance(view: SanitizedGameState, self: SanitizedPlayerState): number {
  return self.hasLarva ? eventDrawChance(view, 'MATURATION', roundsLeft(view)) : 0;
}

/** «Созревание» в ближайшей Фазе Событий: столько стоит отложить удаление Личинки на раунд. */
export function nextMaturationChance(view: SanitizedGameState, self: SanitizedPlayerState): number {
  return self.hasLarva ? eventDrawChance(view, 'MATURATION', 1) : 0;
}

/** Цена Заражения в долях гибели: «Созревание» на борту и проверка в финале, если до неё дожить. */
export function infectionDeath(view: SanitizedGameState, self: SanitizedPlayerState): number {
  const matures = maturationChance(view, self);
  return matures + (1 - matures) * finalCheckDeath(self);
}

/**
 * Скан руки находит ИНФЕКЦИЮ — Личинка; если она уже есть, Персонаж гибнет (стр. 20, 25). Шанс гибели от скана:
 * известная ИНФЕКЦИЯ на руке или хоть одна среди непроверенных карт.
 */
export function scanDeathChance(self: SanitizedPlayerState): number {
  if (!self.hasLarva) return 0;
  const contamination = self.actionDeck.hand.filter((card): card is SanitizedContaminationCard => !isActionCard(card));
  if (contamination.some((card) => card.isInfected === true)) return 1;
  const unknown = contamination.filter((card) => card.isInfected === null).length;
  return 1 - Math.pow(1 - INFECTED_SHARE, unknown);
}
