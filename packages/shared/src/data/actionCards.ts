import type { ActionCard } from '../types/cards.js';
import type { CharacterClass } from '../types/entities.js';

export const ACTION_CARDS_BY_CHARACTER: Record<CharacterClass, readonly ActionCard[]> = {
  CAPTAIN: [
    {
      id: 'ACT_CAP_RELOAD',
      characterClass: 'CAPTAIN',
      name: 'Перезарядка',
      playCost: 0,
      description: 'Добавьте 1 ед. Боезапаса в ваш Револьвер.',
    },
    {
      id: 'ACT_CAP_ORDER',
      characterClass: 'CAPTAIN',
      name: 'Приказ',
      playCost: 0,
      description: 'Выберите Персонажа в вашей Комнате и Переместите его в соседнюю Комнату по вашему выбору.',
    },
    {
      id: 'ACT_CAP_MOTIVATION',
      characterClass: 'CAPTAIN',
      name: 'Мотивация',
      playCost: 0,
      description: 'Все Персонажи в вашей Комнате (включая вас) берут по 1 карте Действий.',
    },
    {
      id: 'ACT_CAP_SUPPRESSIVE_FIRE',
      characterClass: 'CAPTAIN',
      name: 'Огонь на подавление',
      playCost: 0,
      description: 'Сбросьте 1 ед. Боезапаса. Переместите себя или другого Персонажа в вашей Комнате без Атаки Чужих.',
    },
    {
      id: 'ACT_CAP_BASIC_REPAIR',
      characterClass: 'CAPTAIN',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_CAP_DISMISS',
      characterClass: 'CAPTAIN',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_CAP_SEARCH_1',
      characterClass: 'CAPTAIN',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_CAP_SEARCH_2',
      characterClass: 'CAPTAIN',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_CAP_REST',
      characterClass: 'CAPTAIN',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
    {
      id: 'ACT_CAP_DEMOLITION',
      characterClass: 'CAPTAIN',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
  ],

  PILOT: [
    {
      id: 'ACT_PIL_SHIP_KNOWLEDGE',
      characterClass: 'PILOT',
      name: 'Знание корабля',
      playCost: 0,
      description:
        'Откройте или Закройте 1 Дверь в Коридоре вашей Комнаты ИЛИ посмотрите оборот 1 Неисследованной Комнаты.',
    },
    {
      id: 'ACT_PIL_PILOTING',
      characterClass: 'PILOT',
      name: 'Пилотирование',
      playCost: 0,
      description: 'На Мостике или в Комнате с Компьютером выполните Действие бесплатно ИЛИ проверьте Координаты.',
    },
    {
      id: 'ACT_PIL_OLD_FRIEND',
      characterClass: 'PILOT',
      name: 'Старый друг',
      playCost: 0,
      description: 'В Исправной Комнате без Компьютера выполните Действие этой Комнаты бесплатно.',
    },
    {
      id: 'ACT_PIL_COMPUTER_SKILLS',
      characterClass: 'PILOT',
      name: 'Владение компьютером',
      playCost: 0,
      description: 'Откройте или Закройте 1 Дверь ИЛИ в Комнате с Компьютером выполните Действие Комнаты бесплатно.',
    },
    {
      id: 'ACT_PIL_DEMOLITION',
      characterClass: 'PILOT',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
    {
      id: 'ACT_PIL_DISMISS',
      characterClass: 'PILOT',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_PIL_REST',
      characterClass: 'PILOT',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
    {
      id: 'ACT_PIL_SEARCH_1',
      characterClass: 'PILOT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_PIL_REPAIR',
      characterClass: 'PILOT',
      name: 'Ремонт',
      playCost: 1,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_PIL_SEARCH_2',
      characterClass: 'PILOT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
  ],

  MECHANIC: [
    {
      id: 'ACT_MEC_INGENUITY',
      characterClass: 'MECHANIC',
      name: 'Смекалка',
      playCost: 0,
      description:
        'Сбросьте маркер Неисправности ИЛИ Почините/Повредите Двигатель ИЛИ Создайте Предмет (любой жёлтый как компонент).',
    },
    {
      id: 'ACT_MEC_PYROTECHNIC',
      characterClass: 'MECHANIC',
      name: 'Пиротехник',
      playCost: 1,
      description: 'Сбросьте любой Предмет, чтобы поместить маркер Пожара ИЛИ сбросьте маркер Пожара из вашей Комнаты.',
    },
    {
      id: 'ACT_MEC_TECH_CORRIDORS',
      characterClass: 'MECHANIC',
      name: 'Технические коридоры',
      playCost: 1,
      description: 'Переместитесь в любую другую Комнату с Входом в Технические Коридоры и спасуйте.',
    },
    {
      id: 'ACT_MEC_COMPUTER_SKILLS',
      characterClass: 'MECHANIC',
      name: 'Владение компьютером',
      playCost: 0,
      description: 'Откройте или Закройте 1 Дверь ИЛИ в Комнате с Компьютером выполните Действие Комнаты бесплатно.',
    },
    {
      id: 'ACT_MEC_FAST_REPAIR',
      characterClass: 'MECHANIC',
      name: 'Быстрый ремонт',
      playCost: 0,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_MEC_REST',
      characterClass: 'MECHANIC',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
    {
      id: 'ACT_MEC_DEMOLITION',
      characterClass: 'MECHANIC',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
    {
      id: 'ACT_MEC_SEARCH_1',
      characterClass: 'MECHANIC',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_MEC_DISMISS',
      characterClass: 'MECHANIC',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_MEC_SEARCH_2',
      characterClass: 'MECHANIC',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
  ],

  SOLDIER: [
    {
      id: 'ACT_SOL_BURST_FIRE',
      characterClass: 'SOLDIER',
      name: 'Стрельба очередью',
      playCost: 0,
      description: 'Сбросьте весь Боезапас Боевой Винтовки: +1 доп. Рана за каждые 2 потраченные ед. Боезапаса.',
    },
    {
      id: 'ACT_SOL_STEEL_NERVES',
      characterClass: 'SOLDIER',
      name: 'Стальные нервы',
      playCost: 0,
      description: 'Сбросьте эту карту во время Внезапной Атаки, чтобы проигнорировать её эффект.',
    },
    {
      id: 'ACT_SOL_SUPPRESSIVE_FIRE',
      characterClass: 'SOLDIER',
      name: 'Заградительный огонь',
      playCost: 0,
      description:
        'Сбросьте 1 ед. Боезапаса. Переместите себя и/или другого Персонажа в вашей Комнате без Атаки Чужих.',
    },
    {
      id: 'ACT_SOL_BASIC_REPAIR',
      characterClass: 'SOLDIER',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_SOL_DISMISS',
      characterClass: 'SOLDIER',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_SOL_DEMOLITION',
      characterClass: 'SOLDIER',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
    {
      id: 'ACT_SOL_AIMED_FIRE',
      characterClass: 'SOLDIER',
      name: 'Прицельный огонь',
      playCost: 0,
      description: 'Выполните Действие «Стрельба», используя ваше Оружие. Вы можете один раз перебросить кубик Боя.',
    },
    {
      id: 'ACT_SOL_REST',
      characterClass: 'SOLDIER',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
    {
      id: 'ACT_SOL_SEARCH_1',
      characterClass: 'SOLDIER',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_SOL_SEARCH_2',
      characterClass: 'SOLDIER',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
  ],

  SCOUT: [
    {
      id: 'ACT_SCO_ADRENALINE',
      characterClass: 'SCOUT',
      name: 'Адреналин',
      playCost: 0,
      description: 'Выполните Действие «Стрельба» или «Побег» и возьмите карту Действия.',
    },
    {
      id: 'ACT_SCO_RECONNAISSANCE',
      characterClass: 'SCOUT',
      name: 'Разведка',
      playCost: 1,
      description: 'Переместитесь в любую соседнюю Комнату, не бросая кубик Шума.',
    },
    {
      id: 'ACT_SCO_SCAVENGE',
      characterClass: 'SCOUT',
      name: 'Мародерство',
      playCost: 1,
      description:
        'Уменьшите число предметов на 1 (даже если 0). Вытяните 2 карты предметов, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_SCO_SEARCH_1',
      characterClass: 'SCOUT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_SCO_SEARCH_2',
      characterClass: 'SCOUT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_SCO_BASIC_REPAIR',
      characterClass: 'SCOUT',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_SCO_DISMISS',
      characterClass: 'SCOUT',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_SCO_SUPPRESSIVE_FIRE',
      characterClass: 'SCOUT',
      name: 'Огонь на подавление',
      playCost: 0,
      description: 'Сбросьте 1 ед. Боезапаса. Переместите себя или другого Персонажа без Атаки Чужих.',
    },
    {
      id: 'ACT_SCO_DEMOLITION',
      characterClass: 'SCOUT',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
    {
      id: 'ACT_SCO_REST',
      characterClass: 'SCOUT',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
  ],

  SCIENTIST: [
    {
      id: 'ACT_SCI_INTRANET',
      characterClass: 'SCIENTIST',
      name: 'Интранет',
      playCost: 1,
      description: 'В Комнате с Компьютером выполните Действие любой Исправной Комнаты с Компьютером бесплатно.',
    },
    {
      id: 'ACT_SCI_DISMISS',
      characterClass: 'SCIENTIST',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате ИЛИ отмените «Отставить».',
    },
    {
      id: 'ACT_SCI_ACCESS_DENIED',
      characterClass: 'SCIENTIST',
      name: 'Отказ в доступе',
      playCost: 0,
      description:
        'В Комнате с Компьютером выполните её Действие бесплатно ИЛИ поместите маркер Неисправности в Комнату с Компьютером.',
    },
    {
      id: 'ACT_SCI_COMPUTER_SKILLS',
      characterClass: 'SCIENTIST',
      name: 'Владение компьютером',
      playCost: 0,
      description: 'Откройте или Закройте 1 Дверь ИЛИ в Комнате с Компьютером выполните Действие Комнаты бесплатно.',
    },
    {
      id: 'ACT_SCI_REPAIR',
      characterClass: 'SCIENTIST',
      name: 'Ремонт',
      playCost: 1,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
    },
    {
      id: 'ACT_SCI_THREAT_ASSESSMENT',
      characterClass: 'SCIENTIST',
      name: 'Оценка угрозы',
      playCost: 0,
      description:
        'В Комнате с Компьютером посмотрите верхнюю карту колоды Событий, оставьте её сверху или положите вниз.',
    },
    {
      id: 'ACT_SCI_DEMOLITION',
      characterClass: 'SCIENTIST',
      name: 'Разрушение',
      playCost: 0,
      description: 'Разрушьте 1 Дверь в Коридоре вашей Комнаты ИЛИ поместите маркер Неисправности в вашу Комнату.',
    },
    {
      id: 'ACT_SCI_REST',
      characterClass: 'SCIENTIST',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте карты Заражения в руке и удалите карты без Инфекции. При Инфекции — возьмите Личинку.',
    },
    {
      id: 'ACT_SCI_SEARCH_1',
      characterClass: 'SCIENTIST',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
    {
      id: 'ACT_SCI_SEARCH_2',
      characterClass: 'SCIENTIST',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите число предметов на 1. Вытяните 2 карты из колоды цвета Комнаты, возьмите 1, вторую под низ.',
    },
  ],
};
