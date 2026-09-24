import type { IntruderAttackCard } from '@nemesis/shared';

/**
 * Представление карты Атаки Чужих (Шаг 5 плана `doc/intruder-board-ui.md`):
 * общая логика компактной карточки для веера сброса и поповера.
 * Класс-эффект определяется по `effect` (машина) + префиксу id (данные).
 */

/** Компактная метка класса карты для цветового кодирования. */
export type AttackCardClass = 'SCRATCH' | 'BITE' | 'CLAW' | 'TAIL' | 'TRANSFORM' | 'FRENZY' | 'SLIME' | 'CALL';

export interface AttackCardPresentation {
  /** Класс-эффект: цвет и подпись. */
  cls: AttackCardClass;
  /** Короткая подпись класса для бейджа на карте. */
  classLabel: string;
  /** Цвет текста/рамки класса (hex). */
  color: string;
}

/** Цвета классов: тёплые — урон, холодный — Слизь, фиолетовый — Зов. */
const CLASS_PRESENTATION: Record<AttackCardClass, { label: string; color: string }> = {
  SCRATCH: { label: 'Царапина', color: '#f87171' },
  BITE: { label: 'Укус', color: '#fb923c' },
  CLAW: { label: 'Когти', color: '#f472b6' },
  TAIL: { label: 'Хвост', color: '#c084fc' },
  TRANSFORM: { label: 'Трансформация', color: '#facc15' },
  FRENZY: { label: 'Ярость', color: '#ef4444' },
  SLIME: { label: 'Слизь', color: '#38bdf8' },
  CALL: { label: 'Зов', color: '#a855f7' },
};

/** Класс-эффект карты: сначала префикс id (данные), затем machine-код. */
export function attackCardClass(card: IntruderAttackCard): AttackCardClass {
  const id = card.id.toUpperCase();
  if (id.startsWith('IAT_')) {
    const rest = id.slice(4);
    if (rest.startsWith('SCRATCH')) return 'SCRATCH';
    if (rest.startsWith('BITE')) return 'BITE';
    if (rest.startsWith('CLAW')) return 'CLAW';
    if (rest.startsWith('TAIL')) return 'TAIL';
    if (rest.startsWith('TRANSFORMATION')) return 'TRANSFORM';
    if (rest.startsWith('FRENZY')) return 'FRENZY';
    if (rest.startsWith('SLIME')) return 'SLIME';
    if (rest.startsWith('CALL')) return 'CALL';
  }
  switch (card.effect) {
    case 'SCRATCH':
      return 'SCRATCH';
    case 'BITE':
      return 'BITE';
    case 'CLAW_ATTACK':
      return 'CLAW';
    case 'TAIL_ATTACK':
      return 'TAIL';
    case 'TRANSFORMATION':
      return 'TRANSFORM';
    case 'FRENZY':
      return 'FRENZY';
    case 'SLIME':
      return 'SLIME';
    case 'CALL':
      return 'CALL';
  }
}

export function attackCardPresentation(card: IntruderAttackCard): AttackCardPresentation {
  const cls = attackCardClass(card);
  return { cls, classLabel: CLASS_PRESENTATION[cls].label, color: CLASS_PRESENTATION[cls].color };
}

/** Стиль поповер-карточки: рамка и подпись в цвете класса. */
export function attackCardPopoverStyle(card: IntruderAttackCard): { borderColor: string; classLabel: string; color: string } {
  const { color, classLabel } = attackCardPresentation(card);
  return { borderColor: `${color}66`, classLabel, color };
}
