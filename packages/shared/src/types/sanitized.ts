import type {
  ActionCard,
  ContaminationCard,
  CraftedItemCard,
  EventCard,
  IntruderAttackCard,
  ItemCard,
  ItemDeckColor,
  ObjectiveCard,
  SeriousWoundCard,
  WeaknessCard,
} from './cards.js';
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
 * Порядок добора не видит никто, включая владельца колоды (стр. 7): наружу
 * уходят только размеры стопок. Число карт на руке — открытая информация:
 * именно с ней сравнивается число на жетоне Чужого при Внезапной атаке
 * (стр. 18, шаг 4 Контакта), поэтому `handCount` виден всем игрокам.
 */
export interface SanitizedActionDeckState {
  /** Число карт в закрытой колоде добора: порядок не раскрывается (стр. 7). */
  drawPileCount: number;
  /** Число карт на руке: нужно проверке Внезапной атаки (стр. 18). */
  handCount: number;
  /** Число карт в сбросе; сами карты видит только владелец колоды. */
  discardCount: number;
  /** Карты руки — только владельцу: чужая рука скрыта (стр. 22). */
  hand: SanitizedActionDeckCard[];
  /** Карты сброса — только владельцу: у чужой колоды наружу уходит лишь число (план, Э2-5). */
  discard: SanitizedActionDeckCard[];
}

/**
 * Общая закрытая стопка: порядок и состав карт скрыты, наружу — только число.
 * Так выглядят колоды, у которых сброс тоже не раскрывается.
 */
export interface SanitizedHiddenCardPile {
  drawPileCount: number;
  discardCount: number;
}

/**
 * Стопка общей колоды: колода добора закрыта (стр. 7, шаг 11), а сброс лежит
 * лицом вверх у поля (стр. 9, шаг 11) — его карты открыты всем.
 */
export interface SanitizedCardPile<TCard> {
  drawPileCount: number;
  discard: TCard[];
}

/**
 * Колоды корабля в срезе игрока.
 *
 * Состав и порядок закрытых колод — чужая для игрока информация (GDD
 * §5.1): наружу уходят только размеры стопок. Карты сброса остаются видимыми
 * там, где физический сброс лежит лицом вверх (Предметы, События, Атаки
 * Чужих, Тяжёлые Травмы — стр. 9, шаг 11). У колоды Заражения, Слабостей и
 * Целей закрыты и сбросы: их содержимое не раскрывается ни размером, ни
 * картами (план исправлений, Э2-5).
 */
export interface SanitizedDecksState {
  items: Record<ItemDeckColor, SanitizedCardPile<ItemCard>>;
  craftedItems: SanitizedCardPile<CraftedItemCard>;
  contamination: SanitizedHiddenCardPile;
  seriousWounds: SanitizedCardPile<SeriousWoundCard>;
  events: SanitizedCardPile<EventCard>;
  intruderAttacks: SanitizedCardPile<IntruderAttackCard>;
  objectives: {
    personal: SanitizedHiddenCardPile;
    corporate: SanitizedHiddenCardPile;
  };
  weaknesses: SanitizedHiddenCardPile;
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
 * быть случайным событием, а «нулевое читерство» нарушается (GDD §5.1).
 */
export type SanitizedIntruderBag = Record<IntruderToken['type'], number>;

export interface SanitizedIntrudersPoolState extends Omit<IntrudersPoolState, 'bag' | 'supply' | 'weaknessSlots'> {
  /** Состав мешка без порядка жетонов (стр. 6, шаг 10). */
  bag: SanitizedIntruderBag;
  /** Состав запаса рядом с полем без порядка жетонов (стр. 6, шаг 10). */
  supply: SanitizedIntruderBag;
  weaknessSlots: SanitizedWeaknessSlotState[];
}

export interface SanitizedGameState extends Omit<GameState, 'ship' | 'intrudersPool' | 'players' | 'decks'> {
  decks: SanitizedDecksState;
  ship: Omit<ShipState, 'rooms' | 'engines' | 'coordinates'> & {
    rooms: Record<RoomId, SanitizedRoomState>;
    engines: Record<EngineNumber, SanitizedEngineState>;
    coordinates: SanitizedCoordinatesState;
  };
  intrudersPool: SanitizedIntrudersPoolState;
  players: Record<string, SanitizedPlayerState>;
}
