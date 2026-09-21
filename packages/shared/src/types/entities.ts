import type { ActionDeckState, ItemCard, ObjectiveCard, SeriousWoundCard, WeaknessCard } from './cards.js';
import type { RoomId } from './rooms.js';

/** Шесть персонажей базовой игры (GDD §2.2). */
export type CharacterClass = 'CAPTAIN' | 'PILOT' | 'SCIENTIST' | 'SCOUT' | 'SOLDIER' | 'MECHANIC';

export type IntruderType = 'LARVA' | 'CREEPER' | 'ADULT' | 'BREEDER' | 'QUEEN';

export interface IntruderToken {
  id: string;
  type: IntruderType | 'BLANK';
  /** Число на обратной стороне жетона (1..4) для проверки Внезапной атаки (стр. 18). */
  escapeNumber: number;
}

/** Чужой на поле: миниатюра с накопленными ранами и отложенным жетоном. */
export interface IntruderEntity {
  id: string;
  type: IntruderType;
  roomId: RoomId;
  woundsCount: number;
  /** Вытянутый жетон: отложен при появлении и вернётся в пул при отступлении в вентиляцию. */
  token: IntruderToken;
}

/**
 * Объект на полу отсека — то, что можно поднять Действием «Поднять Тяжёлый
 * объект» (стр. 13, 22). Дискриминированное объединение по полю `kind`.
 */
export type BoardObject =
  | { id: string; kind: 'CORPSE'; characterClass: CharacterClass | null }
  | { id: string; kind: 'EGG' }
  | { id: string; kind: 'INTRUDER_REMAINS'; intruderType: IntruderType };

/**
 * Слот Слабости на Планшете Чужих: у каждого слота свой Объект, который нужно
 * принести в Лабораторию, чтобы изучить лежащую в слоте Слабость (стр. 21).
 */
export interface WeaknessSlotState {
  /** Труп Персонажа, Яйцо Чужих или Останки Чужого — по одному на слот. */
  objectKind: BoardObject['kind'];
  /** Карта Слабости в слоте: в начале партии лежит рубашкой вверх (`isRevealed` = false). */
  card: WeaknessCard | null;
}

/** Тяжёлый предмет из инвентаря — карта, занимающая слот руки. */
export interface HeavyItemRef {
  source: 'ITEM';
  card: ItemCard;
}

/** Тяжёлый объект с пола — Труп, Яйцо или Останки (жетон, а не карта). */
export interface HeavyObjectRef {
  source: 'OBJECT';
  object: BoardObject;
}

/** Содержимое слота руки: ровно 2 слота под Тяжёлые предметы и Объекты (GDD §2.2, стр. 22). */
export type HandSlotContent = HeavyItemRef | HeavyObjectRef;

/**
 * Квестовый предмет персонажа: в начале партии лежит горизонтально (неактивен).
 * Выполнив условие мини-квеста, карта переворачивается и становится обычным
 * Предметом — при активации она занимает слот Руки или уходит в Инвентарь
 * по общим правилам Предметов (стр. 21).
 */
export interface QuestItemState {
  id: string;
  name: string;
  isActivated: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  characterClass: CharacterClass;
  orderNumber: number;
  roomId: RoomId;
  /** Личная колода действий вместе с рукой и сбросом; Заражение лежит здесь же. */
  actionDeck: ActionDeckState;
  /** Не более двух Тяжёлых предметов или Объектов одновременно. */
  handSlots: HandSlotContent[];
  /** Не-тяжёлые предметы; места не ограничены (стр. 22). */
  inventory: ItemCard[];
  /** Два квестовых предмета персонажа. */
  questItems: QuestItemState[];
  lightWounds: number; // 0..2, третья даёт Тяжёлую травму
  seriousWounds: SeriousWoundCard[]; // максимум 3, четвёртая означает смерть
  objectives: ObjectiveCard[]; // 1 личная и 1 корпоративная цель
  /** Маркер Слизи лежит на планшете Персонажа, а не в отсеке (стр. 15). */
  hasSlime: boolean;
  /** Личинка на планшете Персонажа после атаки-инфицирования (стр. 20). */
  hasLarva: boolean;
  hasSignalSent: boolean;
  isInHibernation: boolean;
  hasEscapedInPod: boolean;
  isDead: boolean;
  hasPassed: boolean;
  actionsPerformedThisRound: number;
  inspectedEngines: (1 | 2 | 3)[];
  inspectedCoordinates: boolean;
}

/** Спасательная капсула: 2 места, номер жетона нужен для «Системы блокировки капсул» (стр. 26). */
export interface EscapePodState {
  id: string;
  number: number;
  section: 'A' | 'B';
  isLocked: boolean;
  occupantIds: string[];
}
