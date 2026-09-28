import type { CombatDieFace, IntruderAttackCard } from '@nemesis/shared';
import { COMBAT_DIE_PRESENTATION } from './shootPresentation';

export const RETREAT_ARROW_LABEL = 'Стрелка Отступления';

export function toughnessGlyph(card: Pick<IntruderAttackCard, 'toughness'>): string {
  return card.toughness === null ? '➜' : String(card.toughness);
}

export function toughnessCardLabel(card: Pick<IntruderAttackCard, 'toughness'>): string {
  return card.toughness === null ? RETREAT_ARROW_LABEL : `Стойкость ${card.toughness}`;
}

export function toughnessSummary(toughnessTotal: number | null): string {
  return toughnessTotal === null
    ? 'Стрелка Отступления вместо числа: Раны со Стойкостью не сравниваются (стр. 20).'
    : `Сумма Стойкости: ${toughnessTotal}`;
}

export function survivalText(woundsTotal: number, toughnessTotal: number | null): string {
  return toughnessTotal === null
    ? `Чужой выжил и Отступает: вытянута стрелка Отступления. Раны (${woundsTotal}) остаются на миниатюре (стр. 20).`
    : `Чужой выжил: Ран ${woundsTotal} против Стойкости ${toughnessTotal}. Раны остаются на миниатюре до следующей успешной атаки (стр. 20).`;
}

export function countedFaceText(countedFace: CombatDieFace | undefined): string | null {
  if (!countedFace) return null;
  return `«Уязвимые места»: промах по Взрослой Особи засчитан как «${COMBAT_DIE_PRESENTATION[countedFace].label}».`;
}
