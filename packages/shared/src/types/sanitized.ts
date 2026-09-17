import type { ActionCard, ContaminationCard, ItemCard, ObjectiveCard, WeaknessCard } from './cards.js';
import type { BoardObject, IntruderToken, PlayerState, QuestItemState } from './entities.js';
import type { RoomId, RoomState } from './rooms.js';
import type { CoordinatesState, EngineNumber, EngineState, GameState, IntrudersPoolState, ShipState } from './state.js';

/**
 * Состояние глазами конкретного игрока (`filterStateForPlayer`, tech_stack §3.2).
 *
 * Это отдельный тип, а не `GameState`: всё, что игрок видеть не мог, честно
 * помечено как неизвестное, и компилятор не даст случайно прочитать скрытое
 * поле. `null` означает «скрыто от этого игрока», а не «пусто»:
 * - двигатели — этот персонаж их не проверял (стр. 26);
 * - пункт назначения — карта Координат не открывалась на Мостике (стр. 26);
 * - тайл, жетон Исследования, компьютер и аварии неисследованного отсека (стр. 14);
 * - инвентарь, квестовые предметы и цели другого персонажа (стр. 21–22);
 * - карта Заражения, не прошедшая проверку сканером (стр. 20);
 * - порядок добора личной колоды и содержимое чужой руки (стр. 7, 18).
 */

/** Тип объекта на полу: Труп, Яйцо или Останки (стр. 22). */
export type BoardObjectKind = BoardObject['kind'];

export interface SanitizedEngineState {
  /** null — состояние двигателя этому персонажу неизвестно. */
  isWorking: EngineState['isWorking'] | null;
}

export interface SanitizedCoordinatesState extends Omit<CoordinatesState, 'destination'> {
  /** null — карта Координат ещё не открывалась на Мостике. */
  destination: CoordinatesState['destination'] | null;
}

export interface SanitizedRoomState extends Omit<
  RoomState,
  'definitionId' | 'itemsCount' | 'hasComputer' | 'hasFire' | 'hasMalfunction' | 'hasDecompressionToken'
> {
  /** null — тайл неисследованного отсека лежит лицом вниз. */
  definitionId: RoomState['definitionId'];
  /** null — жетон Исследования ещё не раскрыт. */
  itemsCount: number | null;
  /** null — свойства отсека определяются его тайлом. */
  hasComputer: boolean | null;
  /** null — пока тайл лежит лицом вниз, аварии отсека неизвестны. */
  hasFire: boolean | null;
  hasMalfunction: boolean | null;
  hasDecompressionToken: boolean | null;
}

export interface SanitizedContaminationCard extends Omit<ContaminationCard, 'isInfected'> {
  /** null — карта не проверялась (Красный Сканер, Операционная, Душ, Столовая). */
  isInfected: boolean | null;
}

export type SanitizedActionDeckCard = ActionCard | SanitizedContaminationCard;

/**
 * Личная колода персонажа: карты Заражения раскрываются только сканером (стр. 20).
 *
 * `drawPile` всегда пуст: порядок добора — скрытая информация, её не видит даже
 * владелец колоды (стр. 7). `hand` пуст для чужой руки. Числа скрытых стопок
 * появятся вместе с данными колод и правилом Внезапной атаки (план, Э2-5).
 */
export interface SanitizedActionDeckState {
  drawPile: SanitizedActionDeckCard[];
  hand: SanitizedActionDeckCard[];
  discard: SanitizedActionDeckCard[];
}

export interface SanitizedPlayerState extends Omit<
  PlayerState,
  'actionDeck' | 'inventory' | 'questItems' | 'objectives'
> {
  actionDeck: SanitizedActionDeckState;
  /** null — чужой инвентарь скрыт (стр. 22). */
  inventory: ItemCard[] | null;
  /** null — чужие квестовые предметы скрыты до активации (стр. 21). */
  questItems: QuestItemState[] | null;
  /** null — чужие цели скрыты до конца партии (этап 6). */
  objectives: ObjectiveCard[] | null;
}

/**
 * Слот Слабости на Планшете Чужих: рубашка вверх не раскрывает ни карту,
 * ни её текст, но сам факт лежащей карты игроки видят (стр. 6, шаг 9; стр. 21).
 */
export type SanitizedWeaknessSlotState =
  | { objectKind: BoardObjectKind; visibility: 'EMPTY' }
  | { objectKind: BoardObjectKind; visibility: 'FACE_DOWN' }
  | { objectKind: BoardObjectKind; visibility: 'REVEALED'; card: WeaknessCard };

/**
 * Состав мешка (Пула Чужих) без порядка жетонов: игроки знают, какие жетоны
 * ещё не вытянуты, но не знают порядок вытягивания — иначе Контакт перестаёт
 * быть случайным событием, а «нулевое читерство» нарушается (AGENTS.md §3.4).
 */
export type SanitizedIntruderBag = Record<IntruderToken['type'], number>;

export interface SanitizedIntrudersPoolState extends Omit<IntrudersPoolState, 'bag' | 'weaknessSlots'> {
  bag: SanitizedIntruderBag;
  weaknessSlots: SanitizedWeaknessSlotState[];
}

export interface SanitizedGameState extends Omit<GameState, 'ship' | 'intrudersPool' | 'players'> {
  ship: Omit<ShipState, 'rooms' | 'engines' | 'coordinates'> & {
    rooms: Record<RoomId, SanitizedRoomState>;
    engines: Record<EngineNumber, SanitizedEngineState>;
    coordinates: SanitizedCoordinatesState;
  };
  intrudersPool: SanitizedIntrudersPoolState;
  players: Record<string, SanitizedPlayerState>;
}
