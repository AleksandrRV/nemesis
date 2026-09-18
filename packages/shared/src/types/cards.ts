import type { CharacterClass } from './entities.js';

/**
 * Карты, колоды и компоненты крафта.
 *
 * Контракт v0 фиксирует структуру карт и колод, но не их состав: перечней
 * карт (предметы, события, травмы, цели, слабости) в репозитории нет
 * (этап 3 дорожной карты), поэтому колоды описаны типизированными «стопками»
 * и наполняются данными отдельным блоком работ.
 */

/** Семейство компонента крафта (GDD §2.4). */
export type ComponentFamily = 'MEDICAL' | 'TECH';

/** Синие символы компонентов, напечатанные на картах предметов. */
export type CraftComponent = 'CHEMICALS' | 'ALCOHOL' | 'FABRIC' | 'ELECTRONICS' | 'POWER_CELL' | 'TOOLS';

/** Принадлежность каждого компонента своему семейству. */
export const COMPONENT_FAMILY: Record<CraftComponent, ComponentFamily> = {
  CHEMICALS: 'MEDICAL',
  ALCOHOL: 'MEDICAL',
  FABRIC: 'MEDICAL',
  ELECTRONICS: 'TECH',
  POWER_CELL: 'TECH',
  TOOLS: 'TECH',
};

/** Цвет колоды Предметов, лежащей у поля: Красная, Жёлтая, Зелёная (стр. 7, шаг 11). */
export type ItemDeckColor = 'RED' | 'YELLOW' | 'GREEN';

/** Цвет карты Предмета: три игровые колоды плюс синие Создаваемые (GDD §2.4, стр. 23). */
export type ItemColor = ItemDeckColor | 'BLUE';

/**
 * Происхождение карты Предмета: откуда она попадает к персонажу.
 * Стартовые Предметы и Квестовые Предметы не лежат в общих колодах — они
 * раздаются персонажам при подготовке (стр. 8, шаги D–E).
 */
export type ItemOrigin = 'ROOM_DECK' | 'CRAFTED' | 'STARTING' | 'QUEST';

export interface ItemCard {
  id: string;
  name: string;
  color: ItemColor;
  origin: ItemOrigin;
  /** Тяжёлый Предмет (символ руки): обязан занимать слот Руки (стр. 22). */
  isHeavy: boolean;
  isSingleUse: boolean;
  /** Пустой массив — карта не участвует в создании предметов (стр. 23). */
  componentSymbols: readonly CraftComponent[];
  /** Цена действия с карты: сколько карт сбросить дополнительно (стр. 13). */
  actionCost: number;
  description: string;
  isWeapon: boolean;
  /**
   * Боезапас — поле экземпляра карты в игре: маркеры кладутся прямо на карту.
   * Для не-оружия — null.
   */
  ammo: number | null;
  /** Предел боезапаса, напечатанный на карте оружия (стр. 22). */
  maxAmmo: number | null;
}

/** Создаваемые предметы: их ровно 4, состав рецептов зафиксирован (GDD §2.4). */
export type CraftedItemId = 'ANTIDOTE' | 'TASER' | 'FLAMETHROWER' | 'MOLOTOV_COCKTAIL';

/**
 * Карта синей колоды Создаваемых предметов (12 карт, стр. 23).
 * Серые символы компонентов на карте совпадают с её рецептом.
 */
export interface CraftedItemCard extends ItemCard {
  color: 'BLUE';
  origin: 'CRAFTED';
  /** Рецепт из `CRAFTING_RECIPES` (data/crafting.ts). */
  recipeId: CraftedItemId;
  /** Те же два компонента, что и в рецепте: карта собирается по нему. */
  components: [CraftComponent, CraftComponent];
}

export interface ActionCard {
  id: string;
  /** У каждого персонажа собственный набор из 10 карт (стр. 13). */
  characterClass: CharacterClass;
  name: string;
  /** Цена карты: число карт действий, сбрасываемых с руки помимо неё (стр. 13). */
  playCost: number;
  description: string;
}

export interface ContaminationCard {
  id: string;
  /** Карта с ИНФЕКЦИЕЙ: вскрывается сканером (стр. 20). */
  isInfected: boolean;
  /** Проверена Красным Сканером, Операционной, Столовой или Душевой. */
  isScanned: boolean;
}

/** На руке лежат карты действий и карты Заражения: последние нельзя оплачивать (GDD §3.2). */
export type ActionDeckCard = ActionCard | ContaminationCard;

/**
 * Личная колода персонажа: колода добора, рука и личный сброс.
 * Карты Заражения попадают сюда же и занимают место на руке.
 */
export interface ActionDeckState {
  drawPile: ActionDeckCard[];
  hand: ActionDeckCard[];
  discard: ActionDeckCard[];
}

/** Общая «стопка» карт: колода добора и сброс. */
export interface CardPile<TCard> {
  drawPile: TCard[];
  discard: TCard[];
}

/** Базовая карта для колод, состав которых ещё не описан данными. */
export interface CardDefinition {
  id: string;
  name: string;
  description: string;
}

export interface SeriousWoundCard extends CardDefinition {
  /** Обработана в Лазарете (стр. 21). */
  isTreated: boolean;
}

export interface ObjectiveCard extends CardDefinition {
  /** Личная или корпоративная цель (этап 6 дорожной карты). */
  kind: 'PERSONAL' | 'CORPORATE';
}

/** Карта Событий: сдвигает Чужих по номерам коридоров и разыгрывает текст (стр. 10). */
export type EventCard = CardDefinition;

/** Карта Атаки Чужих: стойкость Чужого — сумма двух таких карт (стр. 20). */
export type IntruderAttackCard = CardDefinition;

/**
 * Карта Слабости Чужих. Всего их 8, в партию попадают 3 случайные и лежат
 * рубашкой вверх на Планшете Чужих; изученная Слабость переворачивается
 * и остаётся в своём слоте (стр. 21).
 */
export interface WeaknessCard extends CardDefinition {
  isRevealed: boolean;
}

/** Колоды корабля и колоды карт, общие для всей партии. */
export interface GameDecksState {
  /** Три колоды Предметов, лежащие рядом с полем (стр. 7, шаг 11). */
  items: Record<ItemDeckColor, CardPile<ItemCard>>;
  /** Синяя колода Создаваемых предметов (стр. 7, шаг 11; стр. 23). */
  craftedItems: CardPile<CraftedItemCard>;
  /** Колода Заражения; рядом с ней лежит Сканер (стр. 7, шаг 11; стр. 20). */
  contamination: CardPile<ContaminationCard>;
  seriousWounds: CardPile<SeriousWoundCard>;
  events: CardPile<EventCard>;
  intruderAttacks: CardPile<IntruderAttackCard>;
  objectives: {
    personal: CardPile<ObjectiveCard>;
    corporate: CardPile<ObjectiveCard>;
  };
  /** Карты Слабостей: 3 из них при подготовке уходят в слоты Планшета Чужих. */
  weaknesses: CardPile<WeaknessCard>;
}
