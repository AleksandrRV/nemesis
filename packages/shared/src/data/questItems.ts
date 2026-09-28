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
  /** Символ руки на вертикальной стороне карты: Предмет занимает слот Руки (стр. 22). */
  isHeavy: boolean;
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

function activateIn(place: string): string {
  return `Активируйте этот Предмет ${place}.`;
}

function discardToActivate(item: string): string {
  return `Сбросьте ${item}, чтобы Активировать этот Предмет.`;
}

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    key: 'SHIP_LOG',
    characterClass: 'CAPTAIN',
    name: 'Бортовой журнал',
    questText: activateIn('в Комнате Связи'),
    itemDescription: 'Если вы находитесь в Комнате с Компьютером, выберите 1 Персонажа и посмотрите его карту Цели.',
    activation: room('COMM_ROOM', 'Комната Связи'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: true,
    isHeavy: false,
  },
  {
    key: 'INTERCOM',
    characterClass: 'CAPTAIN',
    name: 'Интерком',
    questText: discardToActivate('Инструменты или Изоленту'),
    itemDescription:
      'Когда вы выполняете Действия «Приказ» или «Мотивация», вы можете выбрать Персонажа в любой Комнате с Компьютером.',
    activation: TOOLS_OR_TAPE,
    effectMode: 'PENDING',
    actionCost: 0,
    isSingleUse: false,
    isHeavy: false,
  },
  {
    key: 'ORBITAL_MANEUVERING',
    characterClass: 'PILOT',
    name: 'Система орбитального маневрирования',
    questText: discardToActivate('Энергозаряд'),
    itemDescription:
      'Каждый Игрок (включая вас) обязан немедленно спасовать. Немедленно закончите этот Раунд, не разыгрывая Атаки Чужих.',
    activation: ENERGY_CHARGE,
    effectMode: 'PENDING',
    actionCost: 1,
    isSingleUse: true,
    isHeavy: false,
  },
  {
    key: 'EVACUATION_KEY',
    characterClass: 'PILOT',
    name: 'Ключ эвакуации',
    questText: activateIn('в Комнате Пожарной Безопасности'),
    itemDescription:
      'Если вы находитесь в Спасательном Отсеке, Разблокируйте или Заблокируйте 1 Капсулу в этом Отсеке.',
    activation: room('FIRE_CONTROL', 'Комната Пожарной Безопасности'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: true,
    isHeavy: false,
  },
  {
    key: 'PLASMA_TORCH',
    characterClass: 'MECHANIC',
    name: 'Плазменная горелка',
    questText: activateIn('на Складе'),
    itemDescription:
      'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату. Вы можете Закрывать Разрушенные Двери.',
    activation: room('STORAGE', 'Склад'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: false,
    isHeavy: false,
  },
  {
    key: 'FLASHLIGHT',
    characterClass: 'MECHANIC',
    name: 'Фонарик',
    questText: discardToActivate('Энергозаряд'),
    itemDescription: 'Выполните Действие «Поиск» в вашей Комнате.',
    activation: ENERGY_CHARGE,
    effectMode: 'ACTION',
    actionCost: 2,
    isSingleUse: false,
    isHeavy: false,
  },
  {
    key: 'AUTOLOADER',
    characterClass: 'SOLDIER',
    name: 'Автозарядчик',
    questText: activateIn('в Оружейной'),
    itemDescription:
      'Прикрепите к Боевой Винтовке. Боевая Винтовка получает +1 к максимальному Боезапасу. Если Боевая Винтовка заряжается с использованием Энергозаряда, цена этого Действия равна 0.',
    activation: room('ARMORY', 'Оружейная'),
    effectMode: 'PASSIVE',
    actionCost: 0,
    isSingleUse: false,
    isHeavy: false,
  },
  {
    key: 'ARMOR',
    characterClass: 'SOLDIER',
    name: 'Броня',
    questText: discardToActivate('Инструменты или Изоленту'),
    itemDescription: 'Вы можете сбросить броню после Атаки Чужого, чтобы проигнорировать эту Атаку.',
    activation: TOOLS_OR_TAPE,
    effectMode: 'REACTIVE',
    actionCost: 0,
    isSingleUse: true,
    isHeavy: false,
  },
  {
    key: 'MOTION_SENSOR',
    characterClass: 'SCOUT',
    name: 'Датчик движения',
    questText: discardToActivate('Энергозаряд'),
    itemDescription:
      'Сбросьте 1 карту Действия с руки, чтобы перебросить кубик Шума. Не более 1 раза за бросок кубика Шума.',
    activation: ENERGY_CHARGE,
    effectMode: 'PENDING',
    actionCost: 0,
    isSingleUse: false,
    isHeavy: true,
  },
  {
    key: 'SECURITY_KEY',
    characterClass: 'SCOUT',
    name: 'Ключ безопасности',
    questText: activateIn('на Мостике'),
    itemDescription:
      'Выберите 1 Комнату и Закройте или Откройте Двери в любых Коридорах, ведущих в эту Комнату. Вы можете выбрать, какие Двери Открыть, а какие Закрыть.',
    activation: room('COCKPIT', 'Мостик'),
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: true,
    isHeavy: false,
  },
  {
    key: 'HOLO_COMPUTER',
    characterClass: 'SCIENTIST',
    name: 'Голографический компьютер',
    questText: activateIn('в Комнате Генератора'),
    itemDescription:
      'Вы можете выполнять Действия «Интранет» и «Оценка Угрозы», находясь в любой Комнате (даже если в ней нет Компьютера или она Неисправна).',
    activation: room('GENERATOR', 'Комната Генератора'),
    effectMode: 'PASSIVE',
    actionCost: 0,
    isSingleUse: false,
    isHeavy: true,
  },
  {
    key: 'LAB_EQUIPMENT',
    characterClass: 'SCIENTIST',
    name: 'Лабораторное оборудование',
    questText: discardToActivate('Химикаты'),
    itemDescription:
      'Если вы находитесь в одной Комнате с Трупом Персонажа, Останками Чужого или Яйцом, Изучите соответствующую Слабость Чужих.',
    activation: CHEMICALS,
    effectMode: 'ACTION',
    actionCost: 1,
    isSingleUse: true,
    isHeavy: false,
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
