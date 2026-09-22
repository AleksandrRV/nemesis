import type { IntruderEntity, IntruderType, SanitizedGameState } from '@nemesis/shared';

/**
 * Модель отображения Чужих на карте и статуса Боя (Этап 4, Шаг 3).
 *
 * Только чтение `SanitizedGameState`: клиент не вычисляет скрытых фактов —
 * состав отсеков и раны приходят из движка публичными (миниатюры и маркеры
 * Ран лежат на виду, стр. 19). Статус Боя (стр. 18) выводится из того же
 * публичного состава отсеков.
 */

/** Порядок показа типов в узле отсека: от Личинки к Королеве. */
const TYPE_ORDER: Record<IntruderType, number> = {
  LARVA: 0,
  CREEPER: 1,
  ADULT: 2,
  BREEDER: 3,
  QUEEN: 4,
};

/**
 * Индивидуальный масштаб силуэта по классу (Шаг 8): Личинка мельче всех,
 * Трутень и Королева — доминантные силуэты увеличенного размера.
 */
export const INTRUDER_BADGE_SCALE: Record<IntruderType, number> = {
  LARVA: 0.9,
  CREEPER: 0.95,
  ADULT: 1,
  BREEDER: 1.2,
  QUEEN: 1.3,
};

/** Чужие одного типа в отсеке: иконка типа, число миниатюр и суммарные раны. */
export interface IntruderBadgeModel {
  type: IntruderType;
  count: number;
  wounds: number;
}

/** Группирует публичный список Чужих по отсекам (id отсека -> бейджи по типам). */
export function groupIntrudersByRoom(intruders: readonly IntruderEntity[]): Map<number, IntruderBadgeModel[]> {
  const byRoom = new Map<number, IntruderBadgeModel[]>();

  for (const intruder of intruders) {
    const badges = byRoom.get(intruder.roomId) ?? [];
    const existing = badges.find((badge) => badge.type === intruder.type);

    if (existing) {
      existing.count += 1;
      existing.wounds += intruder.woundsCount;
    } else {
      badges.push({ type: intruder.type, count: 1, wounds: intruder.woundsCount });
    }

    byRoom.set(intruder.roomId, badges);
  }

  for (const badges of byRoom.values()) {
    badges.sort((left, right) => TYPE_ORDER[left.type]! - TYPE_ORDER[right.type]!);
  }

  return byRoom;
}

/** Чужие выбранного отсека в порядке показа. */
export function intrudersInRoom(intruders: readonly IntruderEntity[], roomId: number): IntruderEntity[] {
  return intruders
    .filter((intruder) => intruder.roomId === roomId)
    .sort((left, right) => TYPE_ORDER[left.type]! - TYPE_ORDER[right.type]!);
}

/**
 * Персонаж в Бою, если в его отсеке есть Чужой (стр. 18). Считывается из
 * публичных данных — ровно тот же предикат, что движок применяет для
 * блокировки Поиска, Осторожного движения и Действий Комнат.
 */
export function isActivePlayerInCombat(view: SanitizedGameState): boolean {
  const player = view.players[view.meta.activePlayerId];

  if (!player) return false;
  if (player.isDead || player.isInHibernation || player.hasEscapedInPod) return false;

  return (view.ship.rooms[player.roomId]?.occupantIntruderIds.length ?? 0) > 0;
}

/** Ширина одного бейджа: с пилой ран шире, без — компактнее; крупные виды больше. */
export function intruderBadgeWidth(badge: IntruderBadgeModel): number {
  return (badge.wounds > 0 ? 40 : 26) * INTRUDER_BADGE_SCALE[badge.type];
}

/** Доминантные классы (Шаг 8): увеличенный силуэт и пульсирующая аура биоугрозы. */
export function isDominantIntruder(type: IntruderType): boolean {
  return type === 'BREEDER' || type === 'QUEEN';
}

export interface IntruderBadgeLayout {
  items: { badge: IntruderBadgeModel; x: number }[];
  /** 1, если строка помещается; иначе коэффициент сжатия вдоль строки. */
  scale: number;
  /** Полная ширина строки до сжатия. */
  width: number;
}

/**
 * Раскладывает бейджи в одну строку с зазором 4 и при переполнении сжимает
 * её целиком (масштаб SVG), чтобы бейджи не уезжали за пределы гекса.
 */
export function layoutIntruderBadges(badges: readonly IntruderBadgeModel[], maxWidth = 88): IntruderBadgeLayout {
  const gap = 4;
  const width = badges.reduce((sum, badge, index) => sum + intruderBadgeWidth(badge) + (index > 0 ? gap : 0), 0);
  let cursor = 0;
  const items = badges.map((badge) => {
    const item = { badge, x: cursor };
    cursor += intruderBadgeWidth(badge) + gap;
    return item;
  });

  return { items, scale: width > maxWidth ? maxWidth / width : 1, width };
}

/**
 * Адаптивная сетка миниатюр внутри гекса (Шаг 8): до двух бейджей в строке,
 * при трёх и более типах строки складываются стопкой без взаимного
 * перекрытия; каждая строка центрируется и сжимается независимо.
 */
export function layoutIntruderGrid(badges: readonly IntruderBadgeModel[], maxWidth = 88): IntruderBadgeLayout[] {
  if (badges.length <= 2) return [layoutIntruderBadges(badges, maxWidth)];
  return [layoutIntruderBadges(badges.slice(0, 2), maxWidth), layoutIntruderBadges(badges.slice(2), maxWidth)];
}
