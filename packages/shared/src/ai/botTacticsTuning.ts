/**
 * Числа тактики ботов: вред, бой, корабль, Предметы. Единица вреда — «доля гибели»: 1 — смерть бота.
 * Это настройки цифровой версии, а не правила игры: их правят по отчётам симулятора (`doc/bots.md`, §7.8).
 */
export interface TacticsTuning {
  harm: {
    /** Цена состояния по числу Тяжёлых Травм 0–3: чем ближе к смерти, тем дороже каждая следующая Рана. */
    fragility: readonly [number, number, number, number];
    contamination: number;
    slime: number;
    /** Личинка на планшете: без Хирургии или Антидота — гибель в «Созревании». */
    larva: number;
    /** Мера вреда в полезности: вред × желание выжить × этот вес. */
    weight: number;
    /** Доля ценности посторонних задач, пока бот в Бою: сначала Чужой, потом планы. */
    combatFocus: number;
    /** Бой, не закончившийся в этом раунде, продолжится в следующем: доля вреда сверх одной Атаки. */
    combatContinuation: number;
    /** Шанс, что Чужой соседней Комнаты придёт в Фазе Событий. */
    adjacentArrival: number;
    /** Доля Атак Фазы Событий, достающихся боту, у которого на руке больше карт, чем у соседа (стр. 20). */
    sparedShare: number;
    /** Доверие собственным будущим выстрелам в этом раунде: бот может передумать. */
    futureShotTrust: number;
    /** Маркер Шума без Встречи: следующий вход рядом опаснее. */
    noise: number;
    /** Новый Чужой на поле после Встречи: он будет охотиться на весь экипаж до конца партии. */
    newIntruder: number;
  };
  /** Средний приток маркеров за раунд от Событий (замер симулятора): по нему — шанс исчерпать запас (стр. 11, 17). */
  shipInflowPerRound: Readonly<Record<'MALFUNCTION' | 'FIRE', number>>;
  /** Маркеров за одно Событие: «Сбой жизнеобеспечения» и «Короткое замыкание» бьют по всем Комнатам цвета. */
  shipBurst: Readonly<Record<'MALFUNCTION' | 'FIRE', number>>;
  /** Каждый горящий отсек ускоряет приток Пожаров: карты Пламени перекидывают огонь на соседей (стр. 10). */
  fireSpread: number;
  /** Вред раунда на борту в конце партии (доля гибели): ради него бот ложится в открытый Анабиоз заранее. */
  roundExposure: number;
  /** Шанс, что непроверенная карта Заражения погубит спасшегося на финальной проверке Инфекции (стр. 11). */
  infectionPerCard: number;
  /** Доли веса жизни в эвакуации: Анабиоз со сломанным отсеком, подготовка полёта, отпереть Капсулы (стр. 11, 25). */
  evacuation: {
    blockedRoute: number;
    voyage: number;
    unlockPods: number;
    /** Насколько Капсула предпочтительнее Анабиоза, когда Цели не требуют Анабиоза (1 — только по шансу гибели корабля). */
    podPreference: number;
    /** Доля веса жизни у посадки в Капсулу, когда Цель уже выполнена или безнадёжна. */
    missionOver: number;
    /** Цель безнадёжна, если её близость ниже этой, а до Прыжка не больше `missionOverRounds` раундов. */
    missionHopeless: number;
    missionOverRounds: number;
  };
  /** Тревога: каждый Чужой на борту прибавляет эту долю к вреду раунда (`roundExposure`). */
  intruderAlarm: number;
  /** Надбавка к ценности задачи за Действие на месте, без Движения (своя Комната, рука, Предметы). */
  localWork: number;
  /** Доля веса общей задачи корабля (Капсулы, Мостик, Двигатели) для того, кто дальше от неё, чем товарищ. */
  teamShare: number;
  /** Множитель веса разовых вех Целей (Сигнал, Координаты, Курс) против остальных шагов Цели. */
  milestoneBoost: number;
  /** Работа командой по Намерениям в Рации: занятые товарищем общие задачи и прикрытие по двое. */
  team: {
    /** Доля веса общей задачи, которую объявил надёжный товарищ. */
    claimedShare: number;
    /** Доверие, начиная с которого Намерение товарища принимается в расчёт. */
    claimTrust: number;
    /** Вес задачи «Прикрыть товарища» (0 — групп нет). */
    escort: number;
  };
  /** Шанс не успеть на каждый Коридор до укрытия в последнем раунде: Шум, Встреча, закрытая Дверь. */
  jumpStepRisk: number;
  /** Открыть Дверь на пути — почти шаг к цели: доля ценности Движения за ней. */
  doorProgressShare: number;
  /** Чем ценен Чужой, убранный с поля: меньше угроз для всех в следующих раундах. */
  intruderRemoval: number;
  /** Вред активной Тяжёлой Травмы до обработки (стр. 21): Кровотечение ранит при каждом Пасе. */
  woundEffects: Readonly<Record<'BLEEDING' | 'LEG' | 'ARM' | 'HAND' | 'BACK', number>>;
  /** Ценность Боезапаса: каждый заряд — выстрел в следующем Бою. */
  ammoValue: number;
  /** Ценность Создания Предмета, который закрывает нужду бота. */
  craftValue: number;
}

export const TACTICS_TUNING = {
  harm: {
    fragility: [0, 0.15, 0.35, 0.6],
    contamination: 0.03,
    slime: 0.03,
    larva: 0.35,
    weight: 6,
    combatFocus: 0.25,
    combatContinuation: 0.6,
    adjacentArrival: 0.2,
    sparedShare: 0.2,
    futureShotTrust: 0.8,
    noise: 0.05,
    newIntruder: 0.3,
  },
  shipInflowPerRound: { MALFUNCTION: 0.35, FIRE: 0.25 },
  shipBurst: { MALFUNCTION: 2.5, FIRE: 2 },
  fireSpread: 0.35,
  roundExposure: 0.12,
  infectionPerCard: 0.15,
  evacuation: {
    blockedRoute: 0.15,
    voyage: 0.3,
    unlockPods: 0.6,
    podPreference: 1,
    missionOver: 0,
    missionHopeless: 0.3,
    missionOverRounds: 4,
  },
  intruderAlarm: 0,
  localWork: 0.6,
  teamShare: 1,
  milestoneBoost: 1,
  team: { claimedShare: 1, claimTrust: 0.4, escort: 0 },
  jumpStepRisk: 0.3,
  doorProgressShare: 0.7,
  intruderRemoval: 0.25,
  woundEffects: { BLEEDING: 0.12, LEG: 0.04, ARM: 0.03, HAND: 0.02, BACK: 0.04 },
  ammoValue: 0.04,
  craftValue: 0.8,
} as const satisfies TacticsTuning;
