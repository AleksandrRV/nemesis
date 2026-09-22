import { SHIP_ROOM_NODES, type GameLogEntry, type IntruderType, type RoomId } from '@nemesis/shared';

/**
 * Визуальная модель локации «Технические Коридоры» (Шаг 3 этапа 0.5.0):
 * отдельное Поле Технических Коридоров (стр. 9, элемент 10; стр. 16) показано
 * обособленным узлом под картой корабля, соединённым вентиляционными шахтами
 * с каждым входом вентиляции.
 */

/** Центр узла Технических Коридоров на расширенной карте. */
export const TECH_HUB = { x: 520, y: 1040 } as const;

/** Радиус шестиугольника узла Технических Коридоров. */
export const TECH_HUB_RADIUS = 55;

/** Отсеки с Входом в Технические Коридоры: красный маячок и номера выходов. */
export function techEntranceRooms() {
  return SHIP_ROOM_NODES.filter((node) => node.techNumbers.length > 0);
}

/**
 * Трассы вентиляционных шахт: маршруты с углами вокруг корпуса корабля,
 * чтобы шахты не пересекали жилые отсеки. Маршрут начинается у маячка входа
 * (верх шестиугольника отсека) и заканчивается у верхней кромки узла.
 */
export const VENT_SHAFT_ROUTES: Record<number, ReadonlyArray<readonly [number, number]>> = {
  2: [
    [235, 161],
    [-20, 161],
    [-20, 1006],
    [484, 1006],
  ],
  5: [
    [410, 65],
    [-44, 65],
    [-44, 992],
    [508, 992],
  ],
  4: [
    [235, 720],
    [-20, 720],
    [-20, 1006],
    [484, 1006],
  ],
  9: [
    [410, 820],
    [-44, 820],
    [-44, 992],
    [508, 992],
  ],
  14: [
    [670, 305],
    [670, 40],
    [1048, 40],
    [1048, 1006],
    [556, 1006],
  ],
  15: [
    [670, 575],
    [670, 992],
    [532, 992],
  ],
  19: [
    [910, 150],
    [1062, 150],
    [1062, 992],
    [532, 992],
  ],
  21: [
    [910, 730],
    [1048, 730],
    [1048, 1006],
    [556, 1006],
  ],
};

/** Маршруты шахт только для существующих на карте входов вентиляции. */
export function ventShaftRoutes(): Array<{ roomId: RoomId; points: ReadonlyArray<readonly [number, number]> }> {
  return techEntranceRooms()
    .map((node) => ({ roomId: node.id, points: VENT_SHAFT_ROUTES[node.id] ?? [] }))
    .filter((route) => route.points.length > 1);
}

/** Силуэт Чужого, уходящего во тьму вентиляции: тип и ключ для анимации. */
export interface VentEcho {
  key: number;
  type: IntruderType;
}

/** Последний номер записи журнала; 0 для пустого журнала. */
export function lastLogSequence(log: readonly GameLogEntry[]): number {
  return log.at(-1)?.sequence ?? 0;
}

/** Новые уходы Чужих в вентиляцию после уже показанной записи журнала. */
export function newVentRetreats(
  log: readonly GameLogEntry[],
  seenSequence: number,
): Array<{ sequence: number; intruderId: string; intruderType: IntruderType; roomId: RoomId }> {
  return log.flatMap((entry) => {
    const event = entry.event;
    if (entry.sequence <= seenSequence || event.type !== 'INTRUDER_RETREATED') return [];
    if (event.retreat.outcome !== 'TECHNICAL_CORRIDORS') return [];
    return [
      {
        sequence: entry.sequence,
        intruderId: event.intruderId,
        intruderType: event.intruderType,
        roomId: event.roomId,
      },
    ];
  });
}
