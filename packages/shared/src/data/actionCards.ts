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
      effect: { kind: 'RELOAD', ammoGain: 1, weaponHint: 'REVOLVER' },
    },
    {
      id: 'ACT_CAP_ORDER',
      characterClass: 'CAPTAIN',
      name: 'Приказ',
      playCost: 0,
      description:
        'Выберите Персонажа в вашей Комнате и Переместите его в соседнюю Комнату по вашему выбору. Может быть выполнено без согласия выбранного Персонажа.',
      effect: { kind: 'ORDER' },
    },
    {
      id: 'ACT_CAP_MOTIVATION',
      characterClass: 'CAPTAIN',
      name: 'Мотивация',
      playCost: 0,
      description: 'Все Персонажи в вашей Комнате (включая вас) берут по 1 карте Действий.',
      effect: { kind: 'MOTIVATION', drawCount: 1 },
    },
    {
      id: 'ACT_CAP_SUPPRESSIVE_FIRE',
      characterClass: 'CAPTAIN',
      name: 'Огонь на подавление',
      playCost: 0,
      description:
        'Сбросьте 1 ед. Боезапаса. Переместите себя или другого Персонажа в вашей Комнате (если он согласен), не вызывая Атаки Чужих.',
      effect: { kind: 'SUPPRESSIVE_FIRE', variant: 'CAPTAIN', ammoCost: 1 },
    },
    {
      id: 'ACT_CAP_BASIC_REPAIR',
      characterClass: 'CAPTAIN',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'BASIC_REPAIR' },
    },
    {
      id: 'ACT_CAP_DISMISS',
      characterClass: 'CAPTAIN',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_CAP_SEARCH_1',
      characterClass: 'CAPTAIN',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_CAP_SEARCH_2',
      characterClass: 'CAPTAIN',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_CAP_REST',
      characterClass: 'CAPTAIN',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
    {
      id: 'ACT_CAP_DEMOLITION',
      characterClass: 'CAPTAIN',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
  ],

  PILOT: [
    {
      id: 'ACT_PIL_SHIP_KNOWLEDGE',
      characterClass: 'PILOT',
      name: 'Знание корабля',
      playCost: 0,
      description:
        'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Посмотрите оборот 1 Неисследованной Комнаты (не смотрите оборот жетона Исследования в ней).',
      effect: { kind: 'SHIP_KNOWLEDGE' },
    },
    {
      id: 'ACT_PIL_PILOTING',
      characterClass: 'PILOT',
      name: 'Пилотирование',
      playCost: 0,
      description:
        'Если вы находитесь на Исправном Мостике или в Комнате с Компьютером, выполните Действие этой Комнаты бесплатно ИЛИ Если вы находитесь в Комнате с Компьютером, Проверьте Координаты.',
      effect: { kind: 'PILOTING' },
    },
    {
      id: 'ACT_PIL_OLD_FRIEND',
      characterClass: 'PILOT',
      name: 'Старый друг',
      playCost: 0,
      description:
        'Если вы находитесь в Исправной Комнате и в ней нет Компьютера, выполните Действие этой Комнаты бесплатно.',
      effect: { kind: 'OLD_FRIEND' },
    },
    {
      id: 'ACT_PIL_COMPUTER_SKILLS',
      characterClass: 'PILOT',
      name: 'Владение компьютером',
      playCost: 0,
      description:
        'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Если вы находитесь в Комнате с Компьютером, выполните Действие этой Комнаты бесплатно.',
      effect: { kind: 'COMPUTER_SKILLS' },
    },
    {
      id: 'ACT_PIL_DEMOLITION',
      characterClass: 'PILOT',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
    {
      id: 'ACT_PIL_DISMISS',
      characterClass: 'PILOT',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_PIL_REST',
      characterClass: 'PILOT',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
    {
      id: 'ACT_PIL_SEARCH_1',
      characterClass: 'PILOT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_PIL_REPAIR',
      characterClass: 'PILOT',
      name: 'Ремонт',
      playCost: 1,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'REPAIR' },
    },
    {
      id: 'ACT_PIL_SEARCH_2',
      characterClass: 'PILOT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
  ],

  MECHANIC: [
    {
      id: 'ACT_MEC_INGENUITY',
      characterClass: 'MECHANIC',
      name: 'Смекалка',
      playCost: 0,
      description:
        'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке ИЛИ Создайте Предмет. Вы можете использовать любой желтый предмет в качестве [ключ].',
      effect: { kind: 'INGENUITY' },
    },
    {
      id: 'ACT_MEC_PYROTECHNIC',
      characterClass: 'MECHANIC',
      name: 'Пиротехник',
      playCost: 1,
      description:
        'Сбросьте любой Предмет, чтобы поместить маркер Пожара в вашу Комнату ИЛИ Сбросьте маркер Пожара из вашей Комнаты.',
      effect: { kind: 'PYROTECHNIC' },
    },
    {
      id: 'ACT_MEC_TECH_CORRIDORS',
      characterClass: 'MECHANIC',
      name: 'Технические коридоры',
      playCost: 1,
      description:
        'Используйте в Комнате, соединенной с Техническими Коридорами. Переместите вашего Персонажа в любую другую Комнату, соединенную с Техническими Коридорами. После этого действия вы обязаны спасовать.',
      effect: { kind: 'TECH_CORRIDORS' },
    },
    {
      id: 'ACT_MEC_COMPUTER_SKILLS',
      characterClass: 'MECHANIC',
      name: 'Владение компьютером',
      playCost: 0,
      description:
        'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Если вы находитесь в Комнате с Компьютером, выполните Действие этой Комнаты бесплатно.',
      effect: { kind: 'COMPUTER_SKILLS' },
    },
    {
      id: 'ACT_MEC_FAST_REPAIR',
      characterClass: 'MECHANIC',
      name: 'Быстрый ремонт',
      playCost: 0,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'FAST_REPAIR' },
    },
    {
      id: 'ACT_MEC_REST',
      characterClass: 'MECHANIC',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
    {
      id: 'ACT_MEC_DEMOLITION',
      characterClass: 'MECHANIC',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
    {
      id: 'ACT_MEC_SEARCH_1',
      characterClass: 'MECHANIC',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_MEC_DISMISS',
      characterClass: 'MECHANIC',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_MEC_SEARCH_2',
      characterClass: 'MECHANIC',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
  ],

  SOLDIER: [
    {
      id: 'ACT_SOL_BURST_FIRE',
      characterClass: 'SOLDIER',
      name: 'Стрельба очередью',
      playCost: 0,
      description:
        'Сбросьте весь Боезапас Боевой Винтовки чтобы выполнить Действие Стрельбы. Вы наносите 1 доп. Рану за каждые 2 потраченные ед. Боезапаса, даже если вы промахнулись.',
      effect: { kind: 'BURST_FIRE' },
    },
    {
      id: 'ACT_SOL_STEEL_NERVES',
      characterClass: 'SOLDIER',
      name: 'Стальные нервы',
      playCost: 0,
      description: 'Сбросьте эту карту во время Внезапной Атаки, чтобы игнорировать её эффект.',
      effect: { kind: 'STEEL_NERVES' },
    },
    {
      id: 'ACT_SOL_SUPPRESSIVE_FIRE',
      characterClass: 'SOLDIER',
      name: 'Заградительный огонь',
      playCost: 0,
      description:
        'Сбросьте 1 ед. Боезапаса. Переместите себя и/или другого Персонажа в вашей Комнате (если он согласен), не вызывая Атаки Чужих.',
      effect: { kind: 'SUPPRESSIVE_FIRE', variant: 'SOLDIER', ammoCost: 1 },
    },
    {
      id: 'ACT_SOL_BASIC_REPAIR',
      characterClass: 'SOLDIER',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'BASIC_REPAIR' },
    },
    {
      id: 'ACT_SOL_DISMISS',
      characterClass: 'SOLDIER',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_SOL_DEMOLITION',
      characterClass: 'SOLDIER',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
    {
      id: 'ACT_SOL_AIMED_FIRE',
      characterClass: 'SOLDIER',
      name: 'Прицельный огонь',
      playCost: 0,
      description:
        'Выполните Действие «Стрельба», используя ваше Энергооружие. Вы можете один раз перебросить кубик Атаки.',
      effect: { kind: 'AIMED_FIRE' },
    },
    {
      id: 'ACT_SOL_REST',
      characterClass: 'SOLDIER',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
    {
      id: 'ACT_SOL_SEARCH_1',
      characterClass: 'SOLDIER',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_SOL_SEARCH_2',
      characterClass: 'SOLDIER',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
  ],

  SCOUT: [
    {
      id: 'ACT_SCO_ADRENALINE',
      characterClass: 'SCOUT',
      name: 'Адреналин',
      playCost: 0,
      description:
        'Выполните Действие «Стрельба» и возьмите карту Действия ИЛИ Выполните Действие «Побег» и возьмите карту Действия.',
      effect: { kind: 'ADRENALINE' },
    },
    {
      id: 'ACT_SCO_RECONNAISSANCE',
      characterClass: 'SCOUT',
      name: 'Разведка',
      playCost: 1,
      description: 'Переместитесь в любую соседнюю Комнату, не бросая кубик Шума.',
      effect: { kind: 'RECONNAISSANCE' },
    },
    {
      id: 'ACT_SCO_SCAVENGE',
      characterClass: 'SCOUT',
      name: 'Мародерство',
      playCost: 1,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вы можете выполнять это Действие, даже если в Комнате не осталось Предметов. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SCAVENGE' },
    },
    {
      id: 'ACT_SCO_SEARCH_1',
      characterClass: 'SCOUT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_SCO_SEARCH_2',
      characterClass: 'SCOUT',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_SCO_BASIC_REPAIR',
      characterClass: 'SCOUT',
      name: 'Базовый ремонт',
      playCost: 2,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'BASIC_REPAIR' },
    },
    {
      id: 'ACT_SCO_DISMISS',
      characterClass: 'SCOUT',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_SCO_SUPPRESSIVE_FIRE',
      characterClass: 'SCOUT',
      name: 'Огонь на подавление',
      playCost: 0,
      description:
        'Сбросьте 1 ед. Боезапаса. Переместите себя или другого Персонажа в вашей Комнате (если он согласен), не вызывая Атаки Чужих.',
      effect: { kind: 'SUPPRESSIVE_FIRE', variant: 'SCOUT', ammoCost: 1 },
    },
    {
      id: 'ACT_SCO_DEMOLITION',
      characterClass: 'SCOUT',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
    {
      id: 'ACT_SCO_REST',
      characterClass: 'SCOUT',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
  ],

  SCIENTIST: [
    {
      id: 'ACT_SCI_INTRANET',
      characterClass: 'SCIENTIST',
      name: 'Интранет',
      playCost: 1,
      description:
        'Если вы находитесь в Комнате с Компьютером, вы можете выполнить Действие любой Исправной Комнаты с Компьютером бесплатно.',
      effect: { kind: 'INTRANET' },
    },
    {
      id: 'ACT_SCI_DISMISS',
      characterClass: 'SCIENTIST',
      name: 'Отставить',
      playCost: 0,
      description:
        'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.',
      effect: { kind: 'DISMISS' },
    },
    {
      id: 'ACT_SCI_ACCESS_DENIED',
      characterClass: 'SCIENTIST',
      name: 'Отказ в доступе',
      playCost: 0,
      description:
        'Если вы находитесь в Комнате с Компьютером, выполните Действие этой Комнаты бесплатно ИЛИ Если вы находитесь в Комнате с Компьютером, поместите маркер Неисправности в 1 Комнату с Компьютером.',
      effect: { kind: 'ACCESS_DENIED' },
    },
    {
      id: 'ACT_SCI_COMPUTER_SKILLS',
      characterClass: 'SCIENTIST',
      name: 'Владение компьютером',
      playCost: 0,
      description:
        'Откройте или Закройте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Если вы находитесь в Комнате с Компьютером, выполните Действие этой Комнаты бесплатно.',
      effect: { kind: 'COMPUTER_SKILLS' },
    },
    {
      id: 'ACT_SCI_REPAIR',
      characterClass: 'SCIENTIST',
      name: 'Ремонт',
      playCost: 1,
      description: 'Сбросьте маркер Неисправности из вашей Комнаты ИЛИ Почините/Повредите Двигатель в Машинном Отсеке.',
      effect: { kind: 'REPAIR' },
    },
    {
      id: 'ACT_SCI_THREAT_ASSESSMENT',
      characterClass: 'SCIENTIST',
      name: 'Оценка угрозы',
      playCost: 0,
      description:
        'Если вы находитесь в Комнате с Компьютером, посмотрите верхнюю карту колоды Событий. После этого вы можете оставить ее сверху, либо поместить ее под низ колоды.',
      effect: { kind: 'THREAT_ASSESSMENT' },
    },
    {
      id: 'ACT_SCI_DEMOLITION',
      characterClass: 'SCIENTIST',
      name: 'Разрушение',
      playCost: 0,
      description:
        'Разрушьте 1 Дверь в любом Коридоре, ведущем в вашу Комнату ИЛИ Поместите маркер Неисправности в вашу Комнату.',
      effect: { kind: 'DEMOLITION' },
    },
    {
      id: 'ACT_SCI_REST',
      characterClass: 'SCIENTIST',
      name: 'Отдых',
      playCost: 0,
      description:
        'Просканируйте все карты Заражения в своей руке и удалите все карты без ИНФЕКЦИИ. Если хотя бы 1 из карт была с ИНФЕКЦИЕЙ, следуйте процедуре Инфицирования.',
      effect: { kind: 'REST' },
    },
    {
      id: 'ACT_SCI_SEARCH_1',
      characterClass: 'SCIENTIST',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
    {
      id: 'ACT_SCI_SEARCH_2',
      characterClass: 'SCIENTIST',
      name: 'Поиск',
      playCost: 0,
      description:
        'Уменьшите количество Предметов в Комнате на 1. Вытяните 2 карты Предметов из колоды, соответствующей цвету вашей Комнаты. Возьмите 1 из них и поместите другую под низ колоды.',
      effect: { kind: 'SEARCH' },
    },
  ],
};

export const ACTION_CARDS: readonly ActionCard[] = Object.values(ACTION_CARDS_BY_CHARACTER).flat();
