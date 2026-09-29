/**
 * Все числа поведения ботов в одном месте (план 0.8.0, принцип 5). Описание ручек — `doc/bots.md`.
 * Это настройки цифровой версии, а не правила игры: их правят по отчётам симулятора (шаг 9).
 */

export const BOT_TRAITS = [
  'PANICKER',
  'EXTERMINATOR',
  'HOARDER',
  'EXPLORER',
  'PERFECTIONIST',
  'STRATEGIST',
  'GENIUS',
  'FORGETFUL',
  'PARANOID',
  'EGOIST',
  'EGOCENTRIST',
  'PHILANTHROPIST',
  'SOCIOPATH',
  'PSYCHOPATH',
  'POTENTIAL_LIAR',
  'TOUCHY',
  'SPLIT_PERSONALITY',
] as const;

export type BotTraitId = (typeof BOT_TRAITS)[number];

export const BOT_DIFFICULTIES = ['NOVICE', 'CREW', 'VETERAN'] as const;

export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

/** Ручки поведения: базовое значение умножается на модификаторы черт и сложности. */
export type TuningKnob =
  | 'riskAversion'
  | 'temperature'
  | 'requestRate'
  | 'combatDesire'
  | 'killHelpValue'
  | 'itemHoarding'
  | 'itemGenerosity'
  | 'explorationBonus'
  | 'selfVerification'
  | 'promiseDiligence'
  | 'horizon'
  | 'riskAccuracy'
  | 'forgetChance'
  | 'initialTrust'
  | 'sharedRoomAvoidance'
  | 'scanRate'
  | 'othersSuccessWeight'
  | 'harmWillingness'
  | 'reciprocityWeight'
  | 'lieThreshold'
  | 'fear'
  | 'grudgeMemory'
  | 'skepticismDecay'
  | 'refusalResentment'
  | 'combatFlight';

export type SocialSignal =
  | 'CLOSED_DOOR_ON_ME'
  | 'FIRE_IN_MY_ROOM'
  | 'DECOMPRESSED_MY_ROOM'
  | 'STARTED_SELF_DESTRUCT'
  | 'LOCKED_POD'
  | 'LEFT_WITHOUT_ME'
  | 'DAMAGED_ENGINE_AFTER_REPAIR_CLAIM'
  | 'EXTINGUISHED_FIRE'
  | 'REPAIRED'
  | 'KILLED_INTRUDER_NEAR_ME'
  | 'GAVE_ITEM'
  | 'OPENED_DOOR_ON_REQUEST'
  | 'KEPT_PROMISE_TO_ME'
  | 'BROKE_PROMISE_TO_ME'
  | 'REFUSED_MY_REQUEST';

export type RequestTopic =
  | 'NEED_ITEM'
  | 'HELP_KILL'
  | 'CHECK_ENGINE'
  | 'CHECK_COORDINATES'
  | 'SET_DOOR'
  | 'EXTINGUISH'
  | 'WAIT_IN_POD'
  | 'NO_SELF_DESTRUCT';

/** Что выдаёт Цель другого игрока по его делам (В8-6-4). */
export type ObjectiveClue =
  'CARRIES_EGG' | 'CARRIES_CORPSE' | 'CARRIES_REMAINS' | 'SIGNAL_ROOM' | 'LABORATORY' | 'SURGERY';

export type BotDesire =
  | 'SURVIVE'
  | 'ADVANCE_OBJECTIVE'
  | 'PREPARE_EVACUATION'
  | 'EQUIP'
  | 'SCOUT'
  | 'LEARN_SHIP'
  | 'HELP'
  | 'SABOTAGE'
  | 'KEEP_PROMISE';

export interface ResponseCurve {
  kind: 'LINEAR' | 'LOGISTIC' | 'QUADRATIC';
  midpoint: number;
  steepness: number;
}

export interface BotTraitSpec {
  label: string;
  /** Относительная частота выпадения. */
  rarity: number;
  moraleShift: number;
  /** Множители ручек: 2 — вдвое сильнее, 0.5 — вдвое слабее. */
  modifiers: Partial<Record<TuningKnob, number>>;
  incompatibleWith: readonly BotTraitId[];
}

export interface DifficultyPreset {
  label: string;
  modifiers: Partial<Record<TuningKnob, number>>;
  /** Добавка к шансу получить черту «Склеротик». */
  forgetfulRarityBonus: number;
}

export interface BotTuning {
  morale: {
    min: number;
    max: number;
    /** Сколько бросков делается при генерации; берётся наибольший. */
    rolls: number;
    driftLimitPerRound: number;
    helpReceived: number;
    promiseKeptForMe: number;
    harmReceived: number;
    lieCaughtAgainstMe: number;
    losing: number;
    /** Тяжёлых Травм, с которых бот считает, что проигрывает. */
    losingSeriousWounds: number;
  };
  trust: {
    initial: number;
    /** Вес дела против вес слова: дела весят больше. */
    deedWeight: number;
    wordWeight: number;
    forgettingPerRound: number;
    /** Насколько Заявление с полным доверием сдвигает убеждение. */
    claimInfluence: number;
    /** Ниже этого доверия Заявления почти не слышны. */
    skepticismFloor: number;
    /** Вес опровержения двумя независимыми Заявлениями против собственной Проверки. */
    contradictionWeight: number;
    /** Обещание истекло без исполнения: слабее нарушения. */
    expiredPromiseWeight: number;
    /** Скепсис после пойманной лжи и его таяние за раунд (ручка `skepticismDecay`). */
    skepticismOnLie: number;
    skepticismDecayPerRound: number;
    /** Таяние обид и благодарности за раунд (делится на ручку `grudgeMemory`). */
    goodwillForgettingPerRound: number;
    /** Раунды, за которые Намерение должно дать прогресс по графу. */
    intentWindowRounds: number;
    /** Заявление о своём деле с Двигателем относится к касаниям за это число раундов. */
    deedClaimWindowRounds: number;
    maxEvidencePerPlayer: number;
  };
  socialSignals: Record<SocialSignal, number>;
  lying: {
    benefitThreshold: number;
    exposurePenalty: number;
    /** Шанс разоблачения будущей Проверкой, даже если сейчас никто не знает правды. */
    exposureBase: number;
    exposurePerInspector: number;
    /** Ценность правды о Двигателе и Курсе для чужого успеха. */
    engineInfoValue: number;
    coordinatesInfoValue: number;
    /** Добавка к выгоде лжи, если Цель бота требует чужой гибели или гибели корабля. */
    objectiveConflictBonus: number;
  };
  requests: {
    benefit: Record<RequestTopic, number>;
    baseCost: Record<RequestTopic, number>;
    costPerHop: number;
    /** Доля помощи, которую бот даёт даже при нулевой морали. */
    baseGoodwill: number;
    /** Цена нарушенного обещания для репутации — удерживает от ложного «Помогу». */
    brokenPromiseReputationCost: number;
  };
  objectives: {
    clueLikelihood: Record<ObjectiveClue, number>;
    /** Во сколько раз шаг к игроку N или вред ему повышает Цель «Игрок N не должен выжить». */
    pursuitLikelihood: number;
    harmLikelihood: number;
    /** Выше этой вероятности бот считает, что Цель игрока направлена против него. */
    suspicionThreshold: number;
  };
  risk: { noise: number; contact: number; fire: number; wound: number; seriousWound: number };
  desires: Record<BotDesire, number>;
  curves: {
    danger: ResponseCurve;
    distance: ResponseCurve;
    timePressure: ResponseCurve;
  };
  choice: { temperature: number; topCandidates: number };
  comms: { speakChance: number; requestChance: number; requestLifetimeRounds: number };
  memory: {
    maxFacts: number;
    /** Шанс за раунд забыть наблюдение при ручке `forgetChance` = 1 («Склеротик»). */
    forgetChancePerRound: number;
  };
  knobs: Record<TuningKnob, number>;
  traits: {
    /** Вероятности получить 1, 2 или 3 черты. */
    countWeights: readonly [number, number, number];
    splitPersonalitySwitchRounds: number;
    catalog: Record<BotTraitId, BotTraitSpec>;
  };
  difficulty: Record<BotDifficulty, DifficultyPreset>;
}

export const BOT_TUNING = {
  morale: {
    min: -100,
    max: 100,
    rolls: 2,
    driftLimitPerRound: 12,
    helpReceived: 6,
    promiseKeptForMe: 4,
    harmReceived: -8,
    lieCaughtAgainstMe: -6,
    losing: -4,
    losingSeriousWounds: 2,
  },
  trust: {
    initial: 0.5,
    deedWeight: 3,
    wordWeight: 1,
    forgettingPerRound: 0.04,
    claimInfluence: 0.6,
    skepticismFloor: 0.15,
    contradictionWeight: 0.5,
    expiredPromiseWeight: 0.5,
    skepticismOnLie: 0.9,
    skepticismDecayPerRound: 0.08,
    goodwillForgettingPerRound: 0.06,
    intentWindowRounds: 2,
    deedClaimWindowRounds: 1,
    maxEvidencePerPlayer: 40,
  },
  socialSignals: {
    CLOSED_DOOR_ON_ME: -3,
    FIRE_IN_MY_ROOM: -4,
    DECOMPRESSED_MY_ROOM: -8,
    STARTED_SELF_DESTRUCT: -5,
    LOCKED_POD: -5,
    LEFT_WITHOUT_ME: -6,
    DAMAGED_ENGINE_AFTER_REPAIR_CLAIM: -6,
    EXTINGUISHED_FIRE: 2,
    REPAIRED: 2,
    KILLED_INTRUDER_NEAR_ME: 3,
    GAVE_ITEM: 3,
    OPENED_DOOR_ON_REQUEST: 2,
    KEPT_PROMISE_TO_ME: 2,
    BROKE_PROMISE_TO_ME: -3,
    REFUSED_MY_REQUEST: -0.5,
  },
  lying: {
    benefitThreshold: 0.25,
    exposurePenalty: 1.5,
    exposureBase: 0.15,
    exposurePerInspector: 0.35,
    engineInfoValue: 0.6,
    coordinatesInfoValue: 0.8,
    objectiveConflictBonus: 0.5,
  },
  requests: {
    benefit: {
      NEED_ITEM: 0.6,
      HELP_KILL: 0.8,
      CHECK_ENGINE: 0.4,
      CHECK_COORDINATES: 0.4,
      SET_DOOR: 0.5,
      EXTINGUISH: 0.6,
      WAIT_IN_POD: 0.9,
      NO_SELF_DESTRUCT: 0.7,
    },
    baseCost: {
      NEED_ITEM: 0.25,
      HELP_KILL: 0.45,
      CHECK_ENGINE: 0.1,
      CHECK_COORDINATES: 0.1,
      SET_DOOR: 0.1,
      EXTINGUISH: 0.2,
      WAIT_IN_POD: 0.3,
      NO_SELF_DESTRUCT: 0,
    },
    costPerHop: 0.06,
    baseGoodwill: 0.5,
    brokenPromiseReputationCost: 0.4,
  },
  objectives: {
    clueLikelihood: {
      CARRIES_EGG: 4,
      CARRIES_CORPSE: 4,
      CARRIES_REMAINS: 3,
      SIGNAL_ROOM: 2,
      LABORATORY: 1.5,
      SURGERY: 1.5,
    },
    pursuitLikelihood: 1.15,
    harmLikelihood: 1.6,
    suspicionThreshold: 0.45,
  },
  risk: { noise: 1, contact: 1.6, fire: 1.2, wound: 1.4, seriousWound: 2.5 },
  desires: {
    SURVIVE: 1,
    ADVANCE_OBJECTIVE: 0.8,
    PREPARE_EVACUATION: 0.7,
    EQUIP: 0.5,
    SCOUT: 0.4,
    LEARN_SHIP: 0.45,
    HELP: 0.35,
    SABOTAGE: 0.3,
    KEEP_PROMISE: 0.6,
  },
  curves: {
    danger: { kind: 'LOGISTIC', midpoint: 0.5, steepness: 8 },
    distance: { kind: 'LINEAR', midpoint: 0, steepness: -0.12 },
    timePressure: { kind: 'QUADRATIC', midpoint: 0, steepness: 1 },
  },
  choice: { temperature: 0.35, topCandidates: 5 },
  comms: { speakChance: 0.6, requestChance: 0.35, requestLifetimeRounds: 2 },
  memory: { maxFacts: 400, forgetChancePerRound: 0.2 },
  knobs: {
    riskAversion: 1,
    temperature: 1,
    requestRate: 1,
    combatDesire: 1,
    killHelpValue: 1,
    itemHoarding: 1,
    itemGenerosity: 1,
    explorationBonus: 1,
    selfVerification: 1,
    promiseDiligence: 1,
    horizon: 1,
    riskAccuracy: 1,
    forgetChance: 0,
    initialTrust: 1,
    sharedRoomAvoidance: 1,
    scanRate: 1,
    othersSuccessWeight: 1,
    harmWillingness: 1,
    reciprocityWeight: 1,
    lieThreshold: 1,
    fear: 1,
    grudgeMemory: 1,
    skepticismDecay: 1,
    refusalResentment: 1,
    combatFlight: 1,
  },
  traits: {
    countWeights: [0.5, 0.35, 0.15],
    splitPersonalitySwitchRounds: 3,
    catalog: {
      PANICKER: {
        label: 'Паникёр',
        rarity: 6,
        moraleShift: 0,
        modifiers: { riskAversion: 2, temperature: 1.6, requestRate: 1.8, combatFlight: 2 },
        incompatibleWith: ['EXTERMINATOR'],
      },
      EXTERMINATOR: {
        label: 'Истребитель',
        rarity: 6,
        moraleShift: 0,
        modifiers: { combatDesire: 2, killHelpValue: 1.8, fear: 0.6 },
        incompatibleWith: ['PANICKER'],
      },
      HOARDER: {
        label: 'Барахольщик',
        rarity: 6,
        moraleShift: 0,
        modifiers: { itemHoarding: 2, itemGenerosity: 0.4 },
        incompatibleWith: ['PHILANTHROPIST'],
      },
      EXPLORER: {
        label: 'Исследователь',
        rarity: 7,
        moraleShift: 0,
        modifiers: { explorationBonus: 1.8 },
        incompatibleWith: [],
      },
      PERFECTIONIST: {
        label: 'Перфекционист',
        rarity: 5,
        moraleShift: 0,
        modifiers: { selfVerification: 2, promiseDiligence: 1.6 },
        incompatibleWith: ['FORGETFUL'],
      },
      STRATEGIST: {
        label: 'Стратег',
        rarity: 5,
        moraleShift: 0,
        modifiers: { horizon: 2.5 },
        incompatibleWith: [],
      },
      GENIUS: {
        label: 'Гений',
        rarity: 3,
        moraleShift: 0,
        modifiers: { temperature: 0.4, riskAccuracy: 1.5 },
        incompatibleWith: ['FORGETFUL'],
      },
      FORGETFUL: {
        label: 'Склеротик',
        rarity: 4,
        moraleShift: 0,
        modifiers: { forgetChance: 1 },
        incompatibleWith: ['GENIUS', 'PERFECTIONIST'],
      },
      PARANOID: {
        label: 'Параноик',
        rarity: 5,
        moraleShift: -5,
        modifiers: { initialTrust: 0.5, sharedRoomAvoidance: 2, scanRate: 1.8 },
        incompatibleWith: ['PHILANTHROPIST'],
      },
      EGOIST: {
        label: 'Эгоист',
        rarity: 6,
        moraleShift: -5,
        modifiers: { othersSuccessWeight: 0.3, harmWillingness: 0.5 },
        incompatibleWith: ['PHILANTHROPIST'],
      },
      EGOCENTRIST: {
        label: 'Эгоцентрист',
        rarity: 5,
        moraleShift: 0,
        modifiers: { requestRate: 2, refusalResentment: 2 },
        incompatibleWith: [],
      },
      PHILANTHROPIST: {
        label: 'Филантроп',
        rarity: 4,
        moraleShift: 20,
        modifiers: { itemGenerosity: 2, othersSuccessWeight: 1.6 },
        incompatibleWith: ['PSYCHOPATH', 'SOCIOPATH', 'EGOIST', 'HOARDER', 'PARANOID'],
      },
      SOCIOPATH: {
        label: 'Социопат',
        rarity: 3,
        moraleShift: -20,
        modifiers: { reciprocityWeight: 0, lieThreshold: 0.5 },
        incompatibleWith: ['PHILANTHROPIST'],
      },
      PSYCHOPATH: {
        label: 'Психопат',
        rarity: 2,
        moraleShift: -40,
        modifiers: { harmWillingness: 2.5, fear: 0.5 },
        incompatibleWith: ['PHILANTHROPIST'],
      },
      POTENTIAL_LIAR: {
        label: 'Потенциальный лжец',
        rarity: 5,
        moraleShift: 0,
        modifiers: { lieThreshold: 0.4 },
        incompatibleWith: [],
      },
      TOUCHY: {
        label: 'Обидчивый',
        rarity: 5,
        moraleShift: 0,
        modifiers: { grudgeMemory: 2, skepticismDecay: 0.1 },
        incompatibleWith: [],
      },
      SPLIT_PERSONALITY: {
        label: 'Раздвоение личности',
        rarity: 1,
        moraleShift: 0,
        modifiers: {},
        incompatibleWith: [],
      },
    },
  },
  difficulty: {
    NOVICE: {
      label: 'Новичок',
      modifiers: { temperature: 2, riskAccuracy: 0.6, horizon: 0.5 },
      forgetfulRarityBonus: 6,
    },
    CREW: { label: 'Экипаж', modifiers: {}, forgetfulRarityBonus: 0 },
    VETERAN: {
      label: 'Ветеран',
      modifiers: { temperature: 0.5, riskAccuracy: 1.4, horizon: 2.5 },
      forgetfulRarityBonus: -3,
    },
  },
} as const satisfies BotTuning;
