/** Категориальные слоты для тёмной поверхности (проверены валидатором палитры): идентичность серии, не ранг. */
export const SERIES_STROKES = [
  'stroke-[#3987e5]',
  'stroke-[#d95926]',
  'stroke-[#199e70]',
  'stroke-[#c98500]',
  'stroke-[#d55181]',
] as const;
export const SERIES_FILLS = [
  'fill-[#3987e5]',
  'fill-[#d95926]',
  'fill-[#199e70]',
  'fill-[#c98500]',
  'fill-[#d55181]',
] as const;
export const SERIES_SWATCHES = [
  'bg-[#3987e5]',
  'bg-[#d95926]',
  'bg-[#199e70]',
  'bg-[#c98500]',
  'bg-[#d55181]',
] as const;

/** Статусные цвета: только для исхода (победа / выжил / погиб), всегда с подписью и значком. */
export const STATUS_SWATCHES = {
  good: 'bg-[#0ca30c]',
  warning: 'bg-[#fab219]',
  critical: 'bg-[#d03b3b]',
} as const;

export const MAGNITUDE_BAR = 'bg-[#3987e5]';

function slotOf(slot: number): number {
  return slot % SERIES_STROKES.length;
}

export function seriesStroke(slot: number): string {
  return SERIES_STROKES[slotOf(slot)]!;
}

export function seriesFill(slot: number): string {
  return SERIES_FILLS[slotOf(slot)]!;
}

export function seriesSwatch(slot: number): string {
  return SERIES_SWATCHES[slotOf(slot)]!;
}
