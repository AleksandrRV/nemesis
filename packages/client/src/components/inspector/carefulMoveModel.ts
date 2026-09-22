import type { CorridorNumber, SanitizedGameState } from '@nemesis/shared';

export interface CorridorChoice {
  number: CorridorNumber;
  isFree: boolean;
  count: number;
}

/**
 * Раскладка «Осторожного движения» (стр. 13): уникальные номера Коридоров,
 * ведущих в целевой отсек, и свободен ли хотя бы один Коридор номера.
 * Чистая функция — движок проверяет тот же расклад при исполнении.
 */
export function carefulMoveChoices(
  view: SanitizedGameState,
  targetRoomId: number,
): { choices: CorridorChoice[]; hasFreeTechnical: boolean } {
  const corridorsIntoTarget = Object.values(view.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === targetRoomId || corridor.toRoomId === targetRoomId,
  );

  const numbers = new Set<number>();
  for (const corridor of corridorsIntoTarget) {
    const own = corridor.fromRoomId === targetRoomId ? corridor.fromNumbers : corridor.toNumbers;
    for (const value of own) numbers.add(value);
  }

  const choices: CorridorChoice[] = [...numbers]
    .sort((left, right) => left - right)
    .map((value) => {
      const corridorNumber = value as CorridorNumber;
      const matching = corridorsIntoTarget.filter((corridor) => {
        const own = corridor.fromRoomId === targetRoomId ? corridor.fromNumbers : corridor.toNumbers;
        return own.includes(corridorNumber);
      });
      return {
        number: corridorNumber,
        isFree: matching.some((corridor) => !corridor.hasNoise),
        count: matching.length,
      };
    });

  const hasFreeTechnical =
    view.ship.rooms[targetRoomId]!.hasTechnicalCorridorEntrance && !view.ship.technicalCorridorNoise;

  return { choices, hasFreeTechnical };
}
