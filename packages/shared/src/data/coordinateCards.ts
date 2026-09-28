import type { CourseMarker, Destination } from '../types/state.js';

export interface CoordinateCard {
  id: string;
  number: number;
  destinations: Record<CourseMarker, Destination>;
}

function coordinateCard(
  number: number,
  a: Destination,
  b: Destination,
  c: Destination,
  d: Destination,
): CoordinateCard {
  return { id: `COORDINATES_${number}`, number, destinations: { A: a, B: b, C: c, D: d } };
}

export const COORDINATE_CARDS: readonly CoordinateCard[] = [
  coordinateCard(1, 'VENUS', 'DEEP_SPACE', 'MARS', 'EARTH'),
  coordinateCard(2, 'MARS', 'VENUS', 'DEEP_SPACE', 'EARTH'),
  coordinateCard(3, 'DEEP_SPACE', 'MARS', 'EARTH', 'VENUS'),
  coordinateCard(4, 'MARS', 'VENUS', 'EARTH', 'DEEP_SPACE'),
  coordinateCard(5, 'VENUS', 'EARTH', 'DEEP_SPACE', 'MARS'),
  coordinateCard(6, 'DEEP_SPACE', 'EARTH', 'VENUS', 'MARS'),
  coordinateCard(7, 'EARTH', 'DEEP_SPACE', 'MARS', 'VENUS'),
  coordinateCard(8, 'EARTH', 'MARS', 'VENUS', 'DEEP_SPACE'),
];

export function coursedDestination(cardId: string, courseMarker: CourseMarker): Destination {
  const card = COORDINATE_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Неизвестная карта Координат: ${cardId}`);
  return card.destinations[courseMarker];
}
