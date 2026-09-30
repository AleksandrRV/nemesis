/**
 * Все числа поведения ботов в одном месте (план 0.8.0, принцип 5). Описание ручек — `doc/bots.md`.
 * Это настройки цифровой версии, а не правила игры: их правят по отчётам симулятора (шаг 9).
 */

import type { IntruderAttackEffect } from '../types/cards.js';
import type { PhraseTone } from '../data/botPhrases.js';
import { BOT_DIFFICULTY_PRESETS, BOT_TRAIT_CATALOG } from './botTraitCatalog.js';

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

export { BOT_DIFFICULTIES, type BotDifficulty } from '../types/crew.js';
import type { BotDifficulty } from '../types/crew.js';

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
  /** Интонация фраз Рации: черта слышна в подаче, но не называется. */
  voice?: PhraseTone;
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
  risk: {
    noise: number;
    contact: number;
    fire: number;
    wound: number;
    seriousWound: number;
    /** Неисследованная Комната: неизвестный тайл и жетон Исследования. */
    unexplored: number;
    slime: number;
    /** Комната с жетоном Декомпрессии: в конце Фазы Игроков всех внутри выбросит в космос. */
    decompression: number;
    /** Доля угрозы Чужого из соседней Комнаты: он может прийти по Шуму. */
    adjacentIntruderShare: number;
    /** Оценка бота, насколько опасна карта Атаки; тип Чужого — среднее по картам, которые он играет. */
    attackEffectSeverity: Record<IntruderAttackEffect, number>;
    larvaSeverity: number;
    /** Побег (стр. 19): каждый Чужой отсека атакует уходящего — доля опасности Комнаты, которую бот платит сразу. */
    escapeAttackShare: number;
    /** Карта Заражения в колоду (Рукопашная, Контакт). */
    contamination: number;
  };
  navigation: {
    /** Цена одного Движения в A*; к ней прибавляется риск Комнаты входа. */
    actionCost: number;
    /** Неоткрытый тайл может оказаться не тем: штраф за каждую «лишнюю попытку» (1 / вероятность − 1). */
    unknownTilePenalty: number;
    /** Закрытая Дверь: нужно открыть или разрушить её отдельным Действием. */
    closedDoorCost: number;
    maxExpandedNodes: number;
    /** Нижний предел ценности далёкой цели: короткий горизонт (ручка `horizon`) не обнуляет её совсем. */
    farGoalFloor: number;
  };
  time: {
    /** Сколько раундов запаса бот оставляет на путь к Анабиозу или Капсуле. */
    evacuationMarginRounds: number;
  };
  hand: {
    /** Ценность карты в руке: дешёвые уходят на оплату и сброс первыми. */
    cardValue: Record<'BASIC' | 'CLASS' | 'COMBAT', number>;
    /** Желание просканировать руку за каждую непроверенную карту Заражения (ручка `scanRate`). */
    scanPerContamination: number;
  };
  desires: Record<BotDesire, number>;
  curves: {
    danger: ResponseCurve;
    distance: ResponseCurve;
    timePressure: ResponseCurve;
  };
  choice: {
    temperature: number;
    topCandidates: number;
    /** Насколько отданная карта снижает ценность Действия: множитель 1 / (1 + вес × ценность карт). */
    cardCostWeight: number;
    /** Ценность Паса: закончить ход, сберечь руку. */
    passValue: number;
    /** Ценность бегства: разница опасности своей Комнаты и Комнаты назначения. */
    fleeWeight: number;
    /** Доля попутных задач: главная задача Действия идёт целиком, остальные — этой долей. */
    sideTaskShare: number;
    /** Закончить ход в опасной Комнате: в Фазе Событий Чужие атакуют (стр. 10). */
    endTurnDangerWeight: number;
    /** Опасность Комнаты от соседей по ней (ручка `sharedRoomAvoidance`): любой игрок и подозреваемый враг. */
    sharedRoomDanger: { anyone: number; suspectedEnemy: number };
  };
  comms: {
    /** Шанс сказать Заявление после своей Проверки или Намерение перед дальним походом. */
    speakChance: number;
    /** Шанс попросить о помощи, когда не хватает ресурса (ручка `requestRate`). */
    requestChance: number;
    requestLifetimeRounds: number;
    /** С какого числа Движений до цели поход считается дальним и стоит Намерения. */
    intentMinHops: number;
    /** Сколько Заявлений и Намерений бот сам говорит за ход — меньше лимита Рации. */
    ownMessagesPerTurn: number;
    /** Проверка считается свежей для Заявления столько раундов. */
    freshCheckRounds: number;
    /** Интонация без черты с голосом: тёплая при высокой морали, холодная при низкой. */
    warmMorale: number;
    coldMorale: number;
  };
  memory: {
    maxFacts: number;
    /** Сколько уже проверенных Заявлений бот помнит; открытые не вытесняются. */
    maxSettledClaims: number;
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
  risk: {
    noise: 1,
    contact: 1.6,
    fire: 1.2,
    wound: 1.4,
    seriousWound: 2.5,
    unexplored: 0.4,
    slime: 0.3,
    decompression: 8,
    adjacentIntruderShare: 0.35,
    attackEffectSeverity: {
      SCRATCH: 1,
      BITE: 2.5,
      CLAW_ATTACK: 2,
      TAIL_ATTACK: 2.5,
      TRANSFORMATION: 0.5,
      FRENZY: 1.5,
      SLIME: 0.5,
      CALL: 0.8,
    },
    larvaSeverity: 0.8,
    escapeAttackShare: 0.6,
    contamination: 0.4,
  },
  navigation: { actionCost: 1, unknownTilePenalty: 2, closedDoorCost: 3, maxExpandedNodes: 400, farGoalFloor: 0.1 },
  time: { evacuationMarginRounds: 1 },
  hand: { cardValue: { BASIC: 1, CLASS: 1.5, COMBAT: 2 }, scanPerContamination: 0.15 },
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
  choice: {
    temperature: 0.35,
    topCandidates: 5,
    cardCostWeight: 0.15,
    passValue: 0.04,
    fleeWeight: 1.2,
    sideTaskShare: 0.3,
    endTurnDangerWeight: 1,
    sharedRoomDanger: { anyone: 0.04, suspectedEnemy: 0.2 },
  },
  comms: {
    speakChance: 0.6,
    requestChance: 0.35,
    requestLifetimeRounds: 2,
    intentMinHops: 3,
    ownMessagesPerTurn: 2,
    freshCheckRounds: 1,
    warmMorale: 40,
    coldMorale: -40,
  },
  memory: { maxFacts: 400, maxSettledClaims: 60, forgetChancePerRound: 0.2 },
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
    catalog: BOT_TRAIT_CATALOG,
  },
  difficulty: BOT_DIFFICULTY_PRESETS,
} as const satisfies BotTuning;
