import type { RoomDefinition } from '../types/rooms.js';

export const BASIC_ROOMS_1: RoomDefinition[] = [
  {
    id: 'ARMORY',
    name: 'Оружейная',
    category: 'ROOM_1',
    color: 'RED',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Перезарядите энергооружие (+2 заряда)'
  },
  {
    id: 'COMM_ROOM',
    name: 'Радиорубка',
    category: 'ROOM_1',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Отправьте сигнал с корабля'
  },
  {
    id: 'INFIRMARY',
    name: 'Лазарет',
    category: 'ROOM_1',
    color: 'GREEN',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Обработайте тяжелые травмы или вылечите легкие'
  },
  {
    id: 'LABORATORY',
    name: 'Лаборатория',
    category: 'ROOM_1',
    color: 'GREEN',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Изучите объект (Труп, Яйцо или Останки) для раскрытия слабости'
  },
  {
    id: 'GENERATOR',
    name: 'Генератор',
    category: 'ROOM_1',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Запустите или остановите процесс самоуничтожения'
  },
  {
    id: 'ESCAPE_POD_A',
    name: 'Спасательный отсек А',
    category: 'ROOM_1',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Попытайтесь войти в спасательную капсулу'
  },
  {
    id: 'ESCAPE_POD_B',
    name: 'Спасательный отсек В',
    category: 'ROOM_1',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Попытайтесь войти в спасательную капсулу'
  },
  {
    id: 'FIRE_CONTROL',
    name: 'Пожарная безопасность',
    category: 'ROOM_1',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Запустите пожаротушение в любом отсеке'
  },
  {
    id: 'NEST',
    name: 'Улей',
    category: 'ROOM_1',
    color: 'RED',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Возьмите 1 яйцо Чужих (поиск невозможен)'
  },
  {
    id: 'STORAGE',
    name: 'Склад',
    category: 'ROOM_1',
    color: 'RED',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Поищите предмет в выбранной колоде'
  },
  {
    id: 'SURGERY',
    name: 'Операционная',
    category: 'ROOM_1',
    color: 'GREEN',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Просканируйте заражения, удалите инфекции и паразита'
  }
];

export const ADDITIONAL_ROOMS_2: RoomDefinition[] = [
  {
    id: 'AIRLOCK_CONTROL',
    name: 'Контроль шлюзов',
    category: 'ROOM_2',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Запустите экстренную декомпрессию жилого отсека'
  },
  {
    id: 'CABINS',
    name: 'Каюты',
    category: 'ROOM_2',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 0,
    actionDescription: 'Пассивный добор +1 карты в начале раунда'
  },
  {
    id: 'CANTEEN',
    name: 'Столовая',
    category: 'ROOM_2',
    color: 'GREEN',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Перекусите: вылечите 1 легкую травму и просканируйте карты'
  },
  {
    id: 'COMMAND_CENTER',
    name: 'Центр управления',
    category: 'ROOM_2',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Откройте или закройте любые двери на корабле'
  },
  {
    id: 'ENGINE_CONTROL',
    name: 'Машинное отделение',
    category: 'ROOM_2',
    color: 'YELLOW',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Проверьте состояние всех трех Двигателей'
  },
  {
    id: 'HATCH_CONTROL',
    name: 'Блокировка капсул',
    category: 'ROOM_2',
    color: 'GREEN',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Заблокируйте или разблокируйте одну из капсул'
  },
  {
    id: 'OBSERVATION_ROOM',
    name: 'Комната наблюдения',
    category: 'ROOM_2',
    color: 'RED',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Посмотрите тайл любой закрытой комнаты и жетон на ней'
  },
  {
    id: 'SLIME_ROOM',
    name: 'Комната со слизью',
    category: 'ROOM_2',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 0,
    actionDescription: 'При входе дает маркер Слизи (поиск невозможен)'
  },
  {
    id: 'SHOWER',
    name: 'Душевая',
    category: 'ROOM_2',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Смойте слизь и просканируйте карты заражения'
  }
];

export const SPECIAL_ROOMS: RoomDefinition[] = [
  {
    id: 'COCKPIT',
    name: 'Мостик',
    category: 'SPECIAL',
    color: 'WHITE',
    hasComputer: true,
    actionCost: 2,
    actionDescription: 'Проверьте координаты или измените курс'
  },
  {
    id: 'HIBERNATORIUM',
    name: 'Криогенный отсек',
    category: 'SPECIAL',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Войдите в камеру анабиоза (доступно на синем поле таймера)'
  },
  {
    id: 'ENGINE_03',
    name: 'Машинный отсек #03',
    category: 'SPECIAL',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Проверьте, почините или повредите Двигатель #03'
  },
  {
    id: 'ENGINE_02',
    name: 'Машинный отсек #02',
    category: 'SPECIAL',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Проверьте, почините или повредите Двигатель #02'
  },
  {
    id: 'ENGINE_01',
    name: 'Машинный отсек #01',
    category: 'SPECIAL',
    color: 'WHITE',
    hasComputer: false,
    actionCost: 2,
    actionDescription: 'Проверьте, почините или повредите Двигатель #01'
  }
];