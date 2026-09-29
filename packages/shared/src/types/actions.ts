import type { CraftedItemId, ItemDeckColor } from './cards.js';
import type { CarefulMoveChosenCorridor, RoomId } from './rooms.js';
import type { CourseMarker } from './state.js';
import type { CommsDraft } from './comms.js';

/**
 * Действия игрока — единственный способ изменить состояние партии:
 * клиент не мутирует `GameState`, он отправляет действие, а правила применяет
 * движок (`GameEngine.processAction`, AGENTS.md §2.2, GDD §3.2).
 *
 * Часть действий объявлена контрактом заранее: движок принимает их и отклоняет
 * с кодом `ACTION_NOT_IMPLEMENTED`, пока не наступит соответствующий этап
 * дорожной карты (поиск — этап 3, комнаты и крафт — этап 4, цели — этап 6).
 */
export type EscapePodCommand = 'LAUNCH' | 'EXIT' | 'STAY';

export type ActivateQuestActionPayload = {
  questItemId: string;
  sacrificeItemId?: string;
  discardCardIds: string[];
};

export type CraftItemActionPayload = {
  recipeId: CraftedItemId;
  componentItemIds: string[];
  discardCardIds: string[];
};

export type RoomAbilityPayload = {
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetDeckColor?: ItemDeckColor;
  targetEscapePodId?: string;
  targetObjectKind?: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS';
  /** Стр. 16: после Изучения можно сбросить объект с руки, не тратя Действия. */
  discardObjectAfterStudy?: boolean;
  /** Мостик: куда переставить маркер Курса. */
  targetCourseMarker?: CourseMarker;
  /** Центр Управления: какие Двери выбранной Комнаты Закрыть; остальные Открываются. */
  closedCorridorIds?: string[];
  /** Столовая и Душевая: просканировать карты Заражения на руке. */
  scanContamination?: boolean;
};

/** Одна передача Обмена (стр. 12): Предмет или Объект от одного Персонажа другому. */
export type ExchangeTransfer = {
  fromPlayerId: string;
  toPlayerId: string;
  /** id карты Предмета или Объекта в Инвентаре или слоте Руки отдающего. */
  entryId: string;
};

/**
 * Встроенное боевое действие классовой карты (Шаг 8): разыгрывание карты и
 * действие атомарны — один ход, одна транзакция.
 */
export type CombatCardPayload =
  /** Стрельба с перебросом кубика («Прицельный огонь»). */
  | { kind: 'AIMED_SHOOT'; weaponItemId: string; targetIntruderId: string; spendExtraAmmoOnTwoWounds?: boolean }
  /** Стрельба со сбросом всего Боезапаса винтовки («Стрельба очередью»). */
  | { kind: 'BURST_SHOOT'; weaponItemId: string; targetIntruderId: string }
  /** Отход без Атаки Чужих («Заградительный огонь» / «Огонь на подавление»). */
  | { kind: 'REPOSITION'; weaponItemId: string; moves: { playerId: string; targetRoomId: RoomId }[] }
  /** «Адреналин»: Стрельба или Побег, затем добор 1 карты Действия. */
  | { kind: 'ADRENALINE_SHOOT'; weaponItemId: string; targetIntruderId: string; spendExtraAmmoOnTwoWounds?: boolean }
  | { kind: 'ADRENALINE_ESCAPE'; targetRoomId: RoomId };

export type PlayCardActionPayload = {
  cardId: string;
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetCorridorId?: string;
  /** Персонаж-цель («Приказ»: перенос другого Персонажа). */
  targetPlayerId?: string;
  /** Цвет колоды Предметов («Мародерство», «Поиск» в белом отсеке). */
  targetDeckColor?: ItemDeckColor;
  /** Предмет-цена («Пиротехник»: сброс Предмета за маркер Пожара). */
  targetItemId?: string;
  /** Шаг 8: параметры классовой боевой карты — карта и действие играются вместе. */
  combat?: CombatCardPayload;
  craftRecipeId?: CraftedItemId;
  componentItemIds?: string[];
};

export type UseItemActionPayload = {
  itemId: string;
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  /** Вторая цель («Планы Немезиды»: подглядывание двух комнат). */
  targetRoomId2?: RoomId;
  targetCorridorId?: string;
  /** Персонаж-цель, если предмет действует на другого Персонажа. */
  targetPlayerId?: string;
  /** Цвет колоды Предметов, если предмет ищет в конкретной колоде. */
  targetDeckColor?: ItemDeckColor;
  /** Карты с руки для спецэффектов («Военные препараты»: сброс N карт → добор N+1). */
  targetCardIds?: string[];
  targetIntruderId?: string;
  targetEscapePodId?: string;
  /** «Лабораторное оборудование»: какой Объект изучить. */
  targetObjectKind?: RoomAbilityPayload['targetObjectKind'];
  /** «Ключ безопасности»: какие Двери выбранной Комнаты Закрыть; остальные Открываются. */
  closedCorridorIds?: string[];
};

export type GameAction =
  | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
  /**
   * «Осторожное движение» [1] (стр. 13): обычное Движение, но вместо броска
   * кубика Шума маркер кладётся в выбранный игроком Коридор, ведущий в отсек
   * назначения. Нельзя выполнять в Бою и когда во всех ведущих Коридорах уже
   * стоят маркеры.
   */
  | {
      type: 'ACTION_CAREFUL_MOVE';
      payload: { targetRoomId: RoomId; chosenCorridor: CarefulMoveChosenCorridor; discardCardIds: string[] };
    }
  | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
  /**
   * Базовое действие «Стрельба» [1] (стр. 19): Оружие из слота Руки с хотя бы
   * 1 ед. Боезапаса, цель — Чужой в одном отсеке со стрелком. Цена — 1 карта
   * Действия сверх Боезапаса; результат определяет кубик Боя (стр. 18).
   */
  | {
      type: 'ACTION_SHOOT';
      payload: {
        weaponItemId: string;
        targetIntruderId: string;
        discardCardIds: string[];
        /** «Прототип: винтовка»: при выпавших «2 Ранах» потратить 1 доп. ед. Боезапаса. */
        spendExtraAmmoOnTwoWounds?: boolean;
      };
    }
  | {
      /** Базовое действие «Рукопашная атака» (стр. 19): без Оружия, цена — 1 карта Действия. */
      type: 'ACTION_MELEE';
      payload: { targetIntruderId: string; discardCardIds: string[] };
    }
  | {
      /** Базовое действие «Поднять Тяжёлый объект» [1] (стр. 13, 22): Труп, Яйцо или Останки из своего отсека. */
      type: 'ACTION_PICK_UP_OBJECT';
      payload: { objectId: string; discardCardIds: string[] };
    }
  | {
      /** Сброс тяжёлого предмета/объекта из слота руки в комнату (стр. 22, ITEMS_AND_GEAR.md: сброс без действия) */
      type: 'ACTION_DISCARD_HEAVY_ITEM';
      payload: { handSlotIndex: number };
    }
  | { type: 'ACTION_ROOM_ABILITY'; payload: RoomAbilityPayload }
  | { type: 'ACTION_PLAY_CARD'; payload: PlayCardActionPayload }
  | { type: 'ACTION_USE_ITEM'; payload: UseItemActionPayload }
  | { type: 'ACTION_CRAFT_ITEM'; payload: CraftItemActionPayload }
  | { type: 'ACTION_ACTIVATE_QUEST'; payload: ActivateQuestActionPayload }
  | { type: 'ACTION_ESCAPE_POD'; payload: { command: EscapePodCommand } }
  | { type: 'ACTION_PASS'; payload: { discardCardIds?: string[] } }
  | { type: 'ACTION_EXCHANGE'; payload: { discardCardIds: string[]; transfers: ExchangeTransfer[] } }
  | {
      type: 'ACTION_RESOLVE_DECISION';
      payload: {
        decisionId: string;
        selectedOption: string;
      };
    }
  /** Рация (план 0.8.0, шаг 3): не тратит Действий и карт. */
  | { type: 'ACTION_COMMS'; payload: CommsDraft };

/**
 * Отладочные действия (переключатели дверей и шума): в продакшн-сборке движок
 * отклоняет их всегда, локальный транспорт включает их только при
 * `allowDevActions` в dev-режиме.
 */
export type DevAction =
  | { type: 'DEV_TOGGLE_DOOR'; payload: { corridorId: string } }
  | { type: 'DEV_TOGGLE_NOISE'; payload: { corridorId: string } };

/** Всё, что движок умеет обрабатывать: действия игрока и отладочные действия. */
export type EngineAction = GameAction | DevAction;
