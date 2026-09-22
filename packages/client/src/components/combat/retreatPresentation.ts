import type { IntruderRetreatRecord } from '@nemesis/shared';

export function retreatNumberLabel(record: IntruderRetreatRecord): string {
  return record.corridorNumber === 'ANY' ? 'любой Коридор' : `Коридор №${record.corridorNumber}`;
}

export function retreatOutcomeText(record: IntruderRetreatRecord): string {
  switch (record.outcome) {
    case 'MOVED':
      return `Чужой отступает через Коридор ${record.corridorId} в отсек #${record.toRoomId}.`;
    case 'DOOR_DESTROYED':
      return `Дверь Коридора ${record.corridorId} разрушена — Чужой остаётся в отсеке (FAQ, правило 8).`;
    case 'TECHNICAL_CORRIDORS':
      return 'Чужой уходит в Технический Коридор: миниатюра снята с поля, все Раны сброшены (стр. 16).';
    case 'STAYED':
      return record.corridorNumber === 'ANY'
        ? 'Карта не указывает номер Коридора — Чужой остаётся в отсеке.'
        : 'В отсеке нет выхода с этим номером — Чужой остаётся на месте.';
  }
}
