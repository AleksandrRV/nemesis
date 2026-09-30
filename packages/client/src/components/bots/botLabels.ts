import type {
  BotDesire,
  BotOutcome,
  BotTraitId,
  CandidateKind,
  DeathCause,
  EngineBeliefSource,
  EvidenceReason,
  GameAction,
} from '@nemesis/shared';
import { BOT_TUNING } from '@nemesis/shared';

export function traitLabel(trait: BotTraitId): string {
  return BOT_TUNING.traits.catalog[trait].label;
}

export const ACTION_TYPE_LABELS: Record<GameAction['type'], string> = {
  ACTION_MOVE: 'Движение',
  ACTION_CAREFUL_MOVE: 'Осторожное движение',
  ACTION_PASS: 'Пас',
  ACTION_EXCHANGE: 'Обмен',
  ACTION_SHOOT: 'Стрельба',
  ACTION_MELEE: 'Рукопашная',
  ACTION_PICK_UP_OBJECT: 'Поднять Объект',
  ACTION_DISCARD_HEAVY_ITEM: 'Бросить Тяжёлое',
  ACTION_SEARCH: 'Поиск',
  ACTION_RESOLVE_DECISION: 'Решение',
  ACTION_ROOM_ABILITY: 'Действие Комнаты',
  ACTION_PLAY_CARD: 'Карта Действия',
  ACTION_USE_ITEM: 'Предмет',
  ACTION_CRAFT_ITEM: 'Создание Предмета',
  ACTION_ACTIVATE_QUEST: 'Квест',
  ACTION_ESCAPE_POD: 'Капсула',
  ACTION_COMMS: 'Рация',
};

export function actionTypeLabel(type: string): string {
  return (ACTION_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

export const CANDIDATE_KIND_LABELS: Record<CandidateKind, string> = {
  MOVE: 'Движение',
  CAREFUL_MOVE: 'Осторожное движение',
  ESCAPE: 'Побег',
  SEARCH: 'Поиск',
  SHOOT: 'Стрельба',
  MELEE: 'Рукопашная',
  PICK_UP: 'Подъём Объекта',
  DROP: 'Сброс',
  ABILITY: 'Действие Комнаты',
  CARD: 'Карта',
  EXCHANGE: 'Обмен',
  ITEM: 'Предмет',
  CRAFT: 'Создание Предмета',
  COVERED_ESCAPE: 'Отход без Атак',
  POD: 'Капсула',
  PASS: 'Пас',
};

export const DESIRE_LABELS: Record<BotDesire, string> = {
  SURVIVE: 'Выжить',
  ADVANCE_OBJECTIVE: 'Продвинуть Цель',
  PREPARE_EVACUATION: 'Эвакуация',
  EQUIP: 'Снаряжение',
  SCOUT: 'Разведка',
  LEARN_SHIP: 'Узнать корабль',
  HELP: 'Помочь',
  SABOTAGE: 'Навредить',
  KEEP_PROMISE: 'Сдержать слово',
};

export function desireLabel(desire: string): string {
  return (DESIRE_LABELS as Record<string, string>)[desire] ?? desire;
}

export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  SURPRISE_ATTACK: 'Внезапная Атака',
  ESCAPE_ATTACK: 'Атака при Побеге',
  EVENT_ATTACK: 'Атака в Фазе Событий',
  MELEE: 'Рукопашная',
  FIRE: 'Пожар',
  BLEEDING: 'Кровотечение',
  DECOMPRESSION: 'Декомпрессия',
  INFECTION: 'Инфекция',
  EVENT: 'Карта События',
  SHIP_DESTROYED: 'Гибель корабля',
  ENGINES_FAILED: 'Неисправные Двигатели',
  WRONG_COORDINATES: 'Не тот Курс',
  LEFT_ON_BOARD: 'Остался на борту',
  OTHER: 'Иное',
};

export const OUTCOME_LABELS: Record<BotOutcome, string> = {
  WON: 'Победа',
  SURVIVED: 'Выжил, Цель не выполнена',
  DIED: 'Погиб',
};

export const ENGINE_SOURCE_LABELS: Record<EngineBeliefSource, string> = {
  PRIOR: 'априори',
  OWN_CHECK: 'своя Проверка',
  OWN_TOGGLE: 'своя перестановка',
  INFERRED: 'вывод из объявления',
  CLAIMS: 'по Заявлениям',
};

const EVIDENCE_LABELS: Record<EvidenceReason, string> = {
  CLAIM_CONFIRMED: 'Заявление подтвердилось',
  CLAIM_REFUTED_BY_CHECK: 'Заявление опровергнуто Проверкой',
  CLAIM_CONTRADICTED: 'Заявлению противоречат другие',
  DEED_CLAIM_REFUTED: 'слова о деле опровергнуты журналом',
  COURSE_CLAIM_SELF_CONTRADICTED: 'сам себе противоречит о Курсе',
  PROMISE_FULFILLED: 'сдержал обещание',
  PROMISE_BROKEN: 'нарушил обещание',
  PROMISE_EXPIRED: 'обещание истекло',
  INTENT_KEPT: 'сделал, что говорил',
  INTENT_ABANDONED: 'бросил Намерение',
  CLOSED_DOOR_ON_ME: 'закрыл передо мной Дверь',
  FIRE_IN_MY_ROOM: 'поджёг мою Комнату',
  DECOMPRESSED_MY_ROOM: 'разгерметизировал мою Комнату',
  STARTED_SELF_DESTRUCT: 'запустил Самоуничтожение',
  LOCKED_POD: 'заблокировал Капсулу',
  LEFT_WITHOUT_ME: 'улетел без меня',
  DAMAGED_ENGINE_AFTER_REPAIR_CLAIM: 'сломал Двигатель, хотя говорил о ремонте',
  EXTINGUISHED_FIRE: 'потушил Пожар',
  REPAIRED: 'чинил',
  KILLED_INTRUDER_NEAR_ME: 'убил Чужого рядом со мной',
  GAVE_ITEM: 'отдал Предмет',
  OPENED_DOOR_ON_REQUEST: 'открыл Дверь по просьбе',
  KEPT_PROMISE_TO_ME: 'сдержал слово мне',
  BROKE_PROMISE_TO_ME: 'нарушил слово мне',
  REFUSED_MY_REQUEST: 'отказал в Просьбе',
};

export function evidenceLabel(reason: EvidenceReason): string {
  return EVIDENCE_LABELS[reason];
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function signed(value: number, digits = 2): string {
  const fixed = value.toFixed(digits);
  return value > 0 ? `+${fixed}` : fixed;
}
