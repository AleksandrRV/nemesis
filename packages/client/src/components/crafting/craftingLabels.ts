import { BatteryCharging, Cross, Flame, Shirt, Wrench, type LucideIcon } from 'lucide-react';
import type { CraftComponent, CraftedItemId } from '@nemesis/shared';

export interface ComponentMeta {
  label: string;
  Icon: LucideIcon;
}

export const COMPONENT_META: Record<CraftComponent, ComponentMeta> = {
  FLAME: { label: 'Пламя', Icon: Flame },
  FABRIC: { label: 'Ткань', Icon: Shirt },
  MEDKIT: { label: 'Крест', Icon: Cross },
  TOOLS: { label: 'Ключ', Icon: Wrench },
  BATTERY: { label: 'Батарея', Icon: BatteryCharging },
};

export const RECIPE_TAGLINES: Record<CraftedItemId, string> = {
  ANTIDOTE: 'Очищает колоду от Инфекции и удаляет Личинку',
  TASER: 'Оглушает Чужого или обезоруживает Персонажа',
  FLAMETHROWER: 'Тяжелое Оружие: минимум 1 Рана, на «2 Ранах» — Пожар',
  MOLOTOV_COCKTAIL: 'Пожар в отсеке с Чужим и Раны всем внутри',
};

export function componentLabel(component: CraftComponent): string {
  return COMPONENT_META[component].label;
}
