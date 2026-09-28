import type { CraftComponent, ItemCard, ItemDeckColor } from '../types/cards.js';

interface RoomDeckItemSpec {
  key: string;
  name: string;
  count: number;
  description: string;
  componentSymbols?: readonly CraftComponent[];
  isHeavy?: boolean;
  isSingleUse?: boolean;
  actionCost?: number;
}

interface PrototypeWeaponSpec {
  key: string;
  name: string;
  ammo: number;
  description: string;
}

const ID_COLOR_CODE: Record<ItemDeckColor, string> = { RED: 'RED', YELLOW: 'YEL', GREEN: 'GRE' };

function roomDeckItems(color: ItemDeckColor, spec: RoomDeckItemSpec): ItemCard[] {
  return Array.from({ length: spec.count }, (_, index) => ({
    id: `ITEM_${ID_COLOR_CODE[color]}_${spec.key}_${index + 1}`,
    name: spec.name,
    color,
    origin: 'ROOM_DECK',
    isHeavy: spec.isHeavy ?? false,
    isSingleUse: spec.isSingleUse ?? true,
    componentSymbols: spec.componentSymbols ?? [],
    actionCost: spec.actionCost ?? 1,
    description: spec.description,
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  }));
}

function prototypeWeapon(spec: PrototypeWeaponSpec): ItemCard {
  return {
    id: `ITEM_RED_${spec.key}_1`,
    name: spec.name,
    color: 'RED',
    origin: 'ROOM_DECK',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: spec.description,
    isWeapon: true,
    isEnergyWeapon: true,
    ammo: spec.ammo,
    maxAmmo: spec.ammo,
  };
}

const DOOR_TEXT = 'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату';
const REPAIR_TEXT = 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке';

const ENERGY_CHARGE: Omit<RoomDeckItemSpec, 'count'> = {
  key: 'ENERGY_CHARGE',
  name: 'Энергозаряд',
  componentSymbols: ['BATTERY'],
  description: `Полностью зарядите 1 Энергооружие ИЛИ ${DOOR_TEXT}.`,
};

const CLOTHES: Omit<RoomDeckItemSpec, 'count'> = {
  key: 'CLOTHES',
  name: 'Одежда',
  componentSymbols: ['FABRIC'],
  description: 'Сбросьте маркер Слизи ИЛИ Обработайте 1 Тяжелую Травму.',
};

export const RED_ITEM_CARDS: readonly ItemCard[] = [
  ...roomDeckItems('RED', { ...ENERGY_CHARGE, count: 11 }),
  ...roomDeckItems('RED', {
    key: 'GRENADE',
    name: 'Граната',
    count: 4,
    description:
      'Выберите 1 Чужого в вашей или соседней Комнате. Выбранный Чужой получает 2 Раны. Все, кто находятся в одной Комнате с выбранным Чужим (включая вас), получают 1 Рану/Тяжелую Травму.',
  }),
  ...roomDeckItems('RED', {
    key: 'SMOKE_GRENADE',
    name: 'Дымовая граната',
    count: 3,
    description:
      'Используйте в вашей Комнате. Все остальные Персонажи в этой Комнате сбрасывают 1 карту Действия с руки. Вы перемещаетесь в соседнюю Комнату. Чужие не атакуют вас во время этого перемещения.',
  }),
  ...roomDeckItems('RED', {
    key: 'RECON_DRONE',
    name: 'Дрон-разведчик',
    count: 3,
    description: 'Посмотрите обороты 1 Неисследованной Комнаты и жетона Исследования в ней.',
  }),
  ...roomDeckItems('RED', {
    key: 'DECOY',
    name: 'Приманка',
    count: 2,
    description:
      'Выберите 1 соседнюю Комнату: переместите в нее всех Чужих из всех соседних Комнат (в том числе находящихся в Бою). Каждый Чужой, находившийся в Бою, проводит 1 Атаку перед перемещением.',
  }),
  ...roomDeckItems('RED', {
    key: 'EXTENDED_MAGAZINE',
    name: 'Увеличенный магазин',
    count: 1,
    isSingleUse: false,
    actionCost: 0,
    description:
      'Прикрепите к Энергооружию. Добавьте 2 ед. Боезапаса к 1 вашему Энергооружию. С этого момента максимальный Боезапас этого Энергооружия увеличен на 2.',
  }),
  prototypeWeapon({
    key: 'PROTOTYPE_RIFLE',
    name: 'Прототип: винтовка',
    ammo: 6,
    description:
      'Энергооружие. Боезапас: 6. Каждый раз, когда вы выбрасываете [2 Раны], вы можете потратить 1 доп. ед. Боезапаса, чтобы нанести 1 доп. Рану.',
  }),
  prototypeWeapon({
    key: 'PROTOTYPE_SHOTGUN',
    name: 'Прототип: дробовик',
    ammo: 2,
    description:
      'Энергооружие. Боезапас: 2. Вы всегда наносите как минимум 1 Рану (кроме [Промах]). Если вы выбросили [1 Рана] или [2 Раны], вы наносите 1 доп. Рану.',
  }),
  prototypeWeapon({
    key: 'PROTOTYPE_PISTOL',
    name: 'Прототип: пистолет',
    ammo: 3,
    description:
      'Энергооружие. Боезапас: 3. При использовании этого Оружия вы можете один раз перебросить кубик Атаки.',
  }),
  ...roomDeckItems('RED', {
    key: 'COMMS_KEY',
    name: 'Ключ связи',
    count: 1,
    description:
      'Если вы находитесь в Комнате с Компьютером, посмотрите карту Цели у 1 Персонажа, на чьем Планшете есть маркер Сигнала.',
  }),
  ...roomDeckItems('RED', {
    key: 'EVACUATION_KEY',
    name: 'Ключ эвакуации',
    count: 1,
    description: 'Если вы находитесь в Спасательном Отсеке, Разблокируйте или Заблокируйте 1 Капсулу в этом Отсеке.',
  }),
  ...roomDeckItems('RED', {
    key: 'SELF_DESTRUCT_KEY',
    name: 'Ключ самоуничтожения',
    count: 1,
    description:
      'Если вы находитесь в Комнате с Компьютером, запустите или остановите процесс Самоуничтожения. (Нельзя использовать, если счетчик Самоуничтожения находится на желтом делении).',
  }),
];

export const YELLOW_ITEM_CARDS: readonly ItemCard[] = [
  ...roomDeckItems('YELLOW', {
    key: 'DUCT_TAPE',
    name: 'Изолента',
    count: 4,
    description: `${REPAIR_TEXT} ИЛИ Прикрепите 1 Тяжелый Предмет к 1 Тяжелому Предмету в руке Персонажа (таким образом 2 Тяжелых Предмета будут занимать 1 слот руки).`,
  }),
  ...roomDeckItems('YELLOW', {
    key: 'TOOLS',
    name: 'Инструменты',
    count: 6,
    componentSymbols: ['TOOLS'],
    description: `${REPAIR_TEXT} ИЛИ ${DOOR_TEXT}.`,
  }),
  ...roomDeckItems('YELLOW', {
    key: 'FIRE_EXTINGUISHER',
    name: 'Огнетушитель',
    count: 4,
    isHeavy: true,
    description: 'Сбросьте маркер Пожара из вашей Комнаты ИЛИ Выберите Чужого в вашей Комнате - он Отступает.',
  }),
  ...roomDeckItems('YELLOW', {
    key: 'CHEMICALS',
    name: 'Химикаты',
    count: 7,
    componentSymbols: ['FLAME'],
    description: 'Полностью зарядите Огнемет.',
  }),
  ...roomDeckItems('YELLOW', { ...CLOTHES, count: 3 }),
  ...roomDeckItems('YELLOW', { ...ENERGY_CHARGE, count: 3 }),
  ...roomDeckItems('YELLOW', {
    key: 'TECH_CORRIDOR_PLANS',
    name: 'Планы технических коридоров',
    count: 1,
    description:
      'Если вы находитесь в Комнате, соединенной с Техническими Коридорами, переместитесь в другую Комнату, соединенную с Техническими Коридорами.',
  }),
  ...roomDeckItems('YELLOW', {
    key: 'SPACE_SUIT',
    name: 'Скафандр',
    count: 1,
    description:
      'Если вы находитесь в Желтой Комнате, сбросьте все карты Действия с руки и переместитесь в любую другую Желтую Комнату.',
  }),
  ...roomDeckItems('YELLOW', {
    key: 'NEMESIS_PLANS',
    name: 'Планы «Немезиды»',
    count: 1,
    description: 'Посмотрите обороты 2 Неисследованных Комнат (не смотрите обороты жетонов Исследования в них).',
  }),
];

export const GREEN_ITEM_CARDS: readonly ItemCard[] = [
  ...roomDeckItems('GREEN', {
    key: 'BANDAGES',
    name: 'Бинты',
    count: 7,
    componentSymbols: ['FABRIC'],
    description: 'Обработайте 1 Тяжелую Травму ИЛИ Вылечите все Легкие Травмы.',
  }),
  ...roomDeckItems('GREEN', {
    key: 'MEDKIT',
    name: 'Аптечка',
    count: 7,
    componentSymbols: ['MEDKIT'],
    description: 'Обработайте 1 Тяжелую Травму ИЛИ Вылечите 1 Обработанную Тяжелую Травму.',
  }),
  ...roomDeckItems('GREEN', {
    key: 'SYNTHETIC_FOOD',
    name: 'Синтетическая еда',
    count: 5,
    description: 'Возьмите 2 карты Действия из своей колоды.',
  }),
  ...roomDeckItems('GREEN', {
    key: 'ADRENALINE',
    name: 'Инъекция адреналина',
    count: 3,
    description:
      'Возьмите 1 карту. В этот Ход вы можете выполнить любое количество Действий. Затем вы обязаны спасовать.',
  }),
  ...roomDeckItems('GREEN', {
    key: 'ALCOHOL',
    name: 'Алкоголь',
    count: 3,
    componentSymbols: ['FLAME'],
    description:
      'Просканируйте и удалите 1 карту Заражения с руки. Если это была карта с ИНФЕКЦИЕЙ, возьмите 1 карту Заражения.',
  }),
  ...roomDeckItems('GREEN', { ...CLOTHES, count: 3 }),
  ...roomDeckItems('GREEN', {
    key: 'MILITARY_STIMULANTS',
    name: 'Военные препараты',
    count: 2,
    description:
      'Сбросьте с руки любое количество карт (включая карты Заражения) и возьмите из колоды то же количество +1.',
  }),
];
