import type { SeriousWoundCard, SeriousWoundKind } from '../types/cards.js';

interface SeriousWoundSpec {
  kind: SeriousWoundKind;
  name: string;
  count: number;
  description: string;
}

function seriousWounds(spec: SeriousWoundSpec): SeriousWoundCard[] {
  return Array.from({ length: spec.count }, (_, index) => ({
    id: `SERIOUS_WOUND_${spec.kind}_${index + 1}`,
    kind: spec.kind,
    name: spec.name,
    description: spec.description,
    isTreated: false,
  }));
}

export const SERIOUS_WOUND_CARDS: readonly SeriousWoundCard[] = [
  ...seriousWounds({
    kind: 'BACK',
    name: 'Травма спины',
    count: 4,
    description: 'В начале Фазы Игроков вы добираете на руку до 4 карт вместо 5.',
  }),
  ...seriousWounds({
    kind: 'LEG',
    name: 'Травма ноги',
    count: 3,
    description: 'С этого момента цена Действия «Побег» равна 2.',
  }),
  ...seriousWounds({
    kind: 'HAND',
    name: 'Травма кисти',
    count: 3,
    description: 'С этого момента цена использования ваших Предметов увеличена на 1.',
  }),
  ...seriousWounds({
    kind: 'BLEEDING',
    name: 'Кровотечение',
    count: 3,
    description: 'Каждый раз, когда вы пасуете во время Фазы Игроков, вы получаете 1 Легкую Травму.',
  }),
  ...seriousWounds({
    kind: 'ARM',
    name: 'Травма руки',
    count: 3,
    description:
      'У вас остается только 1 слот руки для Тяжелых Предметов/Объектов. Если вы несете 2 Тяжелых Предмета, вы должны бросить один из них.',
  }),
];
