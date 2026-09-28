import { BatteryCharging, Cpu, FlaskConical, Shirt, Wine, Wrench, type LucideIcon } from 'lucide-react';
import type { CraftComponent, CraftedItemId } from '@nemesis/shared';

export interface ComponentMeta {
  label: string;
  Icon: LucideIcon;
  family: 'MEDICAL' | 'TECH';
}

export const COMPONENT_META: Record<CraftComponent, ComponentMeta> = {
  CHEMICALS: { label: 'Химикаты', Icon: FlaskConical, family: 'MEDICAL' },
  ALCOHOL: { label: 'Алкоголь', Icon: Wine, family: 'MEDICAL' },
  FABRIC: { label: 'Ткань', Icon: Shirt, family: 'MEDICAL' },
  ELECTRONICS: { label: 'Электроника', Icon: Cpu, family: 'TECH' },
  POWER_CELL: { label: 'Энергоблок', Icon: BatteryCharging, family: 'TECH' },
  TOOLS: { label: 'Инструменты', Icon: Wrench, family: 'TECH' },
};

export const RECIPE_TAGLINES: Record<CraftedItemId, string> = {
  ANTIDOTE: 'Очищает колоду от Инфекции и удаляет Личинку',
  TASER: 'Оглушает Чужого или обезоруживает Персонажа',
  FLAMETHROWER: 'Тяжёлое Оружие: минимум 1 Рана, на «2 Ранах» — Пожар',
  MOLOTOV_COCKTAIL: 'Пожар в отсеке с Чужим и Раны всем внутри',
};

export function componentLabel(component: CraftComponent): string {
  return COMPONENT_META[component].label;
}
