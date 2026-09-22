import type { IntruderRetreatRecord } from '../types/contact.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { drawSharedCard } from './cardPiles.js';
import { appendGameLog } from './gameLog.js';
import { removeIntruder, requireIntruder } from './intruderPlacement.js';
import { findNoiseTarget } from './shipGraphQueries.js';

/**
 * Отступление Чужого в бою (стр. 20). Стрелка Отступления на карте проверки
 * Стойкости обязывает немедленно отступить: вытягивается верхняя карта
 * Событий, Чужой перемещается в направлении Коридора с номером карты,
 * затем карта сбрасывается без розыгрыша её текстового эффекта.
 *
 * Исходы по номеру на карте:
 * - Коридор без Двери (Открыт либо уже Разрушена) — миниатюра уходит в
 *   соседний отсек;
 * - Закрытая Дверь — Дверь становится Разрушенной, Чужой остаётся в отсеке
 *   (FAQ Rules 8);
 * - номер входа в Технические Коридоры — миниатюра снимается с поля, все
 *   Раны сброшены (стр. 16, 20); жетон Чужого уже находится в пуле рядом
 *   с полем (вытянут при появлении, стр. 18; FAQ Rules 19), поэтому
 *   перекладывать его не нужно;
 * - такого номера среди выходов отсека нет — Чужой остаётся на месте.
 *
 * «Подготовка» не печатает номер Коридора (направление «Любое»): двигаться
 * некуда, Чужой остаётся на месте. Трактовка по строгому чтению стр. 20
 * помечена в `doc/sources/data-sources.json` как непроверенная и меняется
 * одной ветвью при появлении официального разъяснения.
 */
export function resolveIntruderRetreat(
  state: GameState,
  intruderId: string,
  /** null — атакующего нет: Отступление из огня Фазы Событий (стр. 10, шаг 6). */
  attackerId: string | null,
): IntruderRetreatRecord {
  const intruder = requireIntruder(state, intruderId);
  const roomId = intruder.roomId;
  const intruderType = intruder.type;

  const eventCard = drawSharedCard(state, state.decks.events, 'События');
  state.decks.events.discard.push(eventCard);

  const record: IntruderRetreatRecord = {
    eventCardId: eventCard.id,
    eventCardName: eventCard.name,
    corridorNumber: eventCard.corridorNumber,
    outcome: 'STAYED',
    toRoomId: null,
    corridorId: null,
  };

  if (eventCard.corridorNumber !== 'ANY') {
    const target = findNoiseTarget(state, roomId, eventCard.corridorNumber);

    if (target.kind === 'TECHNICAL_CORRIDOR') {
      removeIntruder(state, intruderId);
      record.outcome = 'TECHNICAL_CORRIDORS';
    } else if (target.kind === 'CORRIDOR') {
      const corridor = target.corridor;
      record.corridorId = corridor.id;

      if (corridor.doorState === 'CLOSED') {
        corridor.doorState = 'DESTROYED';
        record.outcome = 'DOOR_DESTROYED';
      } else {
        const toRoomId: RoomId = corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
        intruder.roomId = toRoomId;
        state.ship.rooms[roomId]!.occupantIntruderIds = state.ship.rooms[roomId]!.occupantIntruderIds.filter(
          (id) => id !== intruderId,
        );
        state.ship.rooms[toRoomId]!.occupantIntruderIds.push(intruderId);
        record.outcome = 'MOVED';
        record.toRoomId = toRoomId;
      }
    }
  }

  appendGameLog(state, {
    type: 'INTRUDER_RETREATED',
    playerId: attackerId,
    roomId,
    intruderId,
    intruderType,
    retreat: { ...record },
  });

  return record;
}
