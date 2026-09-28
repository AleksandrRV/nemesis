import type { CharacterClass } from '../types/entities.js';
import type { ItemEffectKind } from './itemEffectKinds.js';

export type QuestKey =
  | 'SHIP_LOG'
  | 'INTERCOM'
  | 'ORBITAL_MANEUVERING'
  | 'EVACUATION_KEY'
  | 'PLASMA_TORCH'
  | 'FLASHLIGHT'
  | 'AUTOLOADER'
  | 'ARMOR'
  | 'MOTION_SENSOR'
  | 'SECURITY_KEY'
  | 'HOLO_COMPUTER'
  | 'LAB_EQUIPMENT';

export type QuestActivation =
  | { kind: 'ROOM'; roomDefinitionId: string; roomName: string }
  | {
      kind: 'SACRIFICE_ITEM';
      label: string;
      itemKinds: readonly ItemEffectKind[];
    };

export type QuestEffectMode = 'ACTION' | 'PASSIVE' | 'REACTIVE' | 'PENDING';

export interface QuestDefinition {
  key: QuestKey;
  characterClass: CharacterClass;
  name: string;
  questText: string;
  itemDescription: string;
  activation: QuestActivation;
  effectMode: QuestEffectMode;
  actionCost: number;
  isSingleUse: boolean;
}

export const QUEST_ACTIVATION_COST = 1;

function room(roomDefinitionId: string, roomName: string): QuestActivation {
  return { kind: 'ROOM', roomDefinitionId, roomName };
}

const TOOLS_OR_TAPE: QuestActivation = {
  kind: 'SACRIFICE_ITEM',
  label: 'Инструменты или Изоленту',
  itemKinds: ['TOOLS', 'DUCT_TAPE'],
};
const ENERGY_CHARGE: QuestActivation = { kind: 'SACRIFICE_ITEM', label: 'Энергозаряд', itemKinds: ['ENERGY_CHARGE'] };
const CHEMICALS: QuestActivation = { kind: 'SACRIFICE_ITEM', label: 'Химикаты', itemKinds: ['CHEMICALS'] };

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    key: 'SHIP_LOG',
    characterClass: 'CAPTAIN',
    name: 'Бортовой журнал',
    questText: 'Выполните Действие активации, находясь в Радиорубке.',
    itemDescription: 'Посмотрите Цель Персонажа, находящегося в комнате с Компьютером.',
    activation: room('COMM_ROOM', 'Радиорубка'),
    effectMode: 'PENDING',
    actionCost: 1,
    isSingleUse: false,
  },
  {
    key: 'INTERCOM',
    characterClass: 'CAPTAIN',
    name: 'Интерком',
    questText: 'Сбросьте Инструменты или Изоленту.',
    itemDescription: 'Играйте «Приказ» и «Мотивацию» на Персонажей в любой комнате с Компьютером.',
    activation: TOOLS_OR_TAPE,
    effectMode: 'PENDING',
    actionCost: 0,
    isSingleUse: false,
  },
  {
    key: 'ORBITAL_MANEUVERING',
    characterClass: 'PILOT',
    name: 'Система орбитального маневрирования',
    questText: 'Сбросьте Энергозаряд.',
    itemDescription: 'Все игроки пасуют; раунд заканчивается без Атак Чужих.',
    activation: ENERGY_CHARGE,
    effectMode: 'PENDING',
    actionCost: 1,
    isSingleUse: true,
  },
  {
    key: 'EVACUATION_KEY',
    characterClass: 'PILOT',
    name: 'Ключ эвакуации',
    questText: 'Выполните Действие активации, находясь в Пожарной безопасности.',
    itemDescription: 'Разблокируйте или заблокируйте Капсулу в Спасательном отсеке, где вы находитесь.',
    activation: room('FIRE_CONTROL', 'Пожарная безопасность'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: false,
  },
  {
    key: 'PLASMA_TORCH',
    characterClass: 'MECHANIC',
    name: 'Плазменная горелка',
    questText: 'Выполните Действие активации, находясь на Складе.',
    itemDescription: 'Откройте или закройте Дверь в Коридоре вашей комнаты — даже Разрушенную (её можно заварить).',
    activation: room('STORAGE', 'Склад'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: false,
  },
  {
    key: 'FLASHLIGHT',
    characterClass: 'MECHANIC',
    name: 'Фонарик',
    questText: 'Сбросьте Энергозаряд.',
    itemDescription: 'Проведите Поиск в вашей комнате.',
    activation: ENERGY_CHARGE,
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: false,
  },
  {
    key: 'AUTOLOADER',
    characterClass: 'SOLDIER',
    name: 'Автозарядчик',
    questText: 'Выполните Действие активации, находясь в Оружейной.',
    itemDescription: 'Предел Боезапаса Боевой винтовки +1.',
    activation: room('ARMORY', 'Оружейная'),
    effectMode: 'PASSIVE',
    actionCost: 0,
    isSingleUse: false,
  },
  {
    key: 'ARMOR',
    characterClass: 'SOLDIER',
    name: 'Броня',
    questText: 'Сбросьте Инструменты или Изоленту.',
    itemDescription: 'Одноразово: следующая Атака Чужого по вам игнорируется, затем Броня сбрасывается.',
    activation: TOOLS_OR_TAPE,
    effectMode: 'REACTIVE',
    actionCost: 0,
    isSingleUse: true,
  },
  {
    key: 'MOTION_SENSOR',
    characterClass: 'SCOUT',
    name: 'Датчик движения',
    questText: 'Сбросьте Энергозаряд.',
    itemDescription: 'Перебросьте кубик Шума.',
    activation: ENERGY_CHARGE,
    effectMode: 'PENDING',
    actionCost: 0,
    isSingleUse: false,
  },
  {
    key: 'SECURITY_KEY',
    characterClass: 'SCOUT',
    name: 'Ключ безопасности',
    questText: 'Выполните Действие активации, находясь на Мостике.',
    itemDescription: 'Откройте или закройте все Двери выбранной комнаты.',
    activation: room('COCKPIT', 'Мостик'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: false,
  },
  {
    key: 'HOLO_COMPUTER',
    characterClass: 'SCIENTIST',
    name: 'Голографический компьютер',
    questText: 'Выполните Действие активации, находясь в Генераторе.',
    itemDescription: '«Оценку угрозы» и «Интранет» можно играть из любой комнаты.',
    activation: room('GENERATOR', 'Генератор'),
    effectMode: 'PASSIVE',
    actionCost: 0,
    isSingleUse: false,
  },
  {
    key: 'LAB_EQUIPMENT',
    characterClass: 'SCIENTIST',
    name: 'Лабораторное оборудование',
    questText: 'Сбросьте Химикаты.',
    itemDescription: 'Изучите Объект в комнате с Трупом, Останками Чужого или Яйцом.',
    activation: CHEMICALS,
    effectMode: 'PENDING',
    actionCost: 1,
    isSingleUse: false,
  },
];

export function questDefinitionsFor(characterClass: CharacterClass): QuestDefinition[] {
  return QUEST_DEFINITIONS.filter((definition) => definition.characterClass === characterClass);
}

export function questDefinition(key: QuestKey): QuestDefinition {
  const definition = QUEST_DEFINITIONS.find((entry) => entry.key === key);
  if (!definition) throw new Error(`Неизвестный квест: ${key}`);
  return definition;
}

export function questItemCardId(questItemId: string): string {
  return `QUEST_${questItemId}`;
}
