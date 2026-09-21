import type { ContaminationCard } from '../types/cards.js';

export const CONTAMINATION_CARDS_COUNT = 27;

export const CONTAMINATION_CARDS_INFECTED_COUNT = 7;

export const CONTAMINATION_CARDS: readonly ContaminationCard[] = Array.from(
  { length: CONTAMINATION_CARDS_COUNT },
  (_, index) => ({
    id: `CONTAMINATION_${index + 1}`,
    isInfected: index < CONTAMINATION_CARDS_INFECTED_COUNT,
    isScanned: false,
  }),
);
