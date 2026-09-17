import { EngineError } from './fsm.js';

import type { ActionDeckCard, ActionDeckState, CardPile, ContaminationCard, GameDecksState } from '../types/cards.js';
import type { IntruderToken, PlayerState, WeaknessSlotState } from '../types/entities.js';
import type {
  SanitizedActionDeckCard,
  SanitizedActionDeckState,
  SanitizedCardPile,
  SanitizedDecksState,
  SanitizedGameState,
  SanitizedHiddenCardPile,
  SanitizedIntruderBag,
  SanitizedRoomState,
  SanitizedWeaknessSlotState,
} from '../types/sanitized.js';
import type { EngineNumber, GameState } from '../types/state.js';

/**
 * Фильтрация скрытой информации (tech_stack §3.2, AGENTS.md §3.4).
 *
 * Это единственная точка, из которой клиент и боты получают состояние: всё,
 * что персонаж видеть не мог, заменяется на явное «неизвестно», а не прячется
 * в UI — так «нулевое читерство» становится свойством данных, а не обещанием.
 *
 * Порядок нигде наружу не уходит: вместо списка жетонов мешка клиент получает
 * состав по типам, состав и порядок колод заменяются числом карт, порядок
 * добора личных колод не раскрывается даже владельцу, рука и сброс другого
 * персонажа скрыты, а наружу уходит только их размер. Число карт на руке —
 * исключение не по недосмотру: именно с ним сравнивается число на жетоне
 * Чужого при Внезапной атаке (стр. 18, шаг 4 Контакта).
 */
export function filterStateForPlayer(state: GameState, viewingPlayerId: string): SanitizedGameState {
  const viewer = state.players[viewingPlayerId];

  if (!viewer) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Нельзя отфильтровать состояние для неизвестного персонажа: ${viewingPlayerId}.`,
    );
  }

  // Копия состояния, в которой скрытые поля заменяются на null/счётчики/FACE_DOWN.
  const sanitized = structuredClone(state) as unknown as SanitizedGameState;

  sanitizeIntruderPool(sanitized);
  sanitizeShip(sanitized, viewer);
  sanitizePlayers(sanitized, viewingPlayerId);
  sanitizeDecks(sanitized);
  sanitizeWeaknessSlots(sanitized);

  return sanitized;
}

/**
 * Мешок и запас жетонов Чужих: игроки знают состав (он выкладывается при
 * подготовке, стр. 6, шаг 10), но не порядок вытягивания — иначе Контакт
 * перестаёт быть случайным событием (AGENTS.md §3.4).
 */
function sanitizeIntruderPool(state: SanitizedGameState): void {
  state.intrudersPool.bag = countIntruderTokens(state.intrudersPool.bag as unknown as IntruderToken[]);
  state.intrudersPool.supply = countIntruderTokens(state.intrudersPool.supply as unknown as IntruderToken[]);
}

function countIntruderTokens(tokens: IntruderToken[]): SanitizedIntruderBag {
  const counts: SanitizedIntruderBag = { BLANK: 0, LARVA: 0, CREEPER: 0, ADULT: 0, BREEDER: 0, QUEEN: 0 };

  for (const token of tokens) {
    counts[token.type] += 1;
  }

  return counts;
}

/**
 * Двигатели и Координаты персонаж узнаёт только лично: проверив двигатель
 * в Машинном отсеке (стр. 26) или открыв карту Координат на Мостике (стр. 6, шаг 5).
 */
function sanitizeShip(state: SanitizedGameState, viewer: PlayerState): void {
  const inspectedEngines = new Set<EngineNumber>(viewer.inspectedEngines);
  const engineNumbers: EngineNumber[] = [1, 2, 3];

  for (const engineNumber of engineNumbers) {
    const engine = state.ship.engines[engineNumber];

    if (engine) {
      engine.isWorking = inspectedEngines.has(engineNumber) ? engine.isWorking : null;
    }
  }

  if (!viewer.inspectedCoordinates) {
    state.ship.coordinates.destination = null;
  }

  for (const room of Object.values(state.ship.rooms)) {
    sanitizeRoom(room);
  }
}

/**
 * Неисследованный отсек лежит тайлом вниз (стр. 14, шаг 1 «вскрытие тайла»):
 * всё, что определяется самим тайлом — название, жетон Исследования,
 * компьютер и аварии, — игроку неизвестно и помечается как `null`, а не как
 * «нет»: показать «Пожара нет» о тайле, который ещё не перевёрнут, значило бы
 * сообщить знание, которого у персонажа нет. Объекты и Чужие на полу — не
 * свойство тайла: пока отсек не вскрыт, их там нет по правилам, поэтому списки
 * пусты.
 */
function sanitizeRoom(room: SanitizedRoomState): void {
  if (room.isExplored) return;

  room.definitionId = null;
  room.itemsCount = null;
  room.hasComputer = null;
  room.hasFire = null;
  room.hasMalfunction = null;
  room.hasDecompressionToken = null;
  // Эффект жетона Исследования напечатан на его лицевой стороне: пока тайл
  // и жетон лежат рубашкой вверх, игрок не знает ни числа предметов, ни эффекта.
  room.explorationEffect = null;
  room.objects = [];
  room.occupantIntruderIds = [];
}

/**
 * Чужие скрывают только то, что игрок не мог знать сам: инвентарь, неактивированные
 * квестовые предметы и цели. Карты Заражения не раскрывают факт инфекции, пока их
 * не проверили Красным Сканером или Действием Комнаты (стр. 20) — включая карты
 * самого игрока.
 */
function sanitizePlayers(state: SanitizedGameState, viewingPlayerId: string): void {
  for (const [playerId, player] of Object.entries(state.players)) {
    if (playerId !== viewingPlayerId) {
      player.inventory = null;
      player.questItems = null;
      player.objectives = null;
    }

    player.actionDeck = sanitizeActionDeck(
      player.actionDeck as unknown as ActionDeckState,
      playerId === viewingPlayerId,
    );
  }
}

/**
 * Личная колода и рука (стр. 7, 18).
 *
 * Порядок добора не видит никто, включая владельца колоды: в физической игре
 * посмотреть колоду нельзя, видно только толщину стопки. Рука и сброс видны
 * только владельцу; наружу уходят их размеры. Размер руки — не секрет:
 * с ним сравнивается число на жетоне Чужого при Внезапной атаке (стр. 18).
 */
function sanitizeActionDeck(deck: ActionDeckState, isViewer: boolean): SanitizedActionDeckState {
  return {
    drawPileCount: deck.drawPile.length,
    handCount: deck.hand.length,
    discardCount: deck.discard.length,
    hand: isViewer ? deck.hand.map(sanitizeActionDeckCard) : [],
    discard: isViewer ? deck.discard.map(sanitizeActionDeckCard) : [],
  };
}

function sanitizeActionDeckCard(card: ActionDeckCard): SanitizedActionDeckCard {
  if ('characterClass' in card) {
    return card;
  }

  const contamination = card as ContaminationCard;

  return { ...contamination, isInfected: contamination.isScanned ? contamination.isInfected : null };
}

/**
 * Общие колоды корабля (стр. 7, шаг 11).
 *
 * Порядок закрытых колод и их состав — скрытая информация: наружу уходит
 * только число карт. Сбросы Предметов, Событий, Атак Чужих и Тяжёлых Травм
 * лежат лицом вверх (стр. 9, шаг 11), поэтому их карты остаются видимыми;
 * у колоды Заражения, Слабостей и Целей скрыт и сброс (план исправлений, Э2-5).
 */
function sanitizeDecks(state: SanitizedGameState): void {
  const decks = state.decks as unknown as GameDecksState;

  const sanitized: SanitizedDecksState = {
    items: {
      RED: sanitizeCardPile(decks.items.RED),
      YELLOW: sanitizeCardPile(decks.items.YELLOW),
      GREEN: sanitizeCardPile(decks.items.GREEN),
    },
    craftedItems: sanitizeCardPile(decks.craftedItems),
    contamination: sanitizeHiddenCardPile(decks.contamination),
    seriousWounds: sanitizeCardPile(decks.seriousWounds),
    events: sanitizeCardPile(decks.events),
    intruderAttacks: sanitizeCardPile(decks.intruderAttacks),
    objectives: {
      personal: sanitizeHiddenCardPile(decks.objectives.personal),
      corporate: sanitizeHiddenCardPile(decks.objectives.corporate),
    },
    weaknesses: sanitizeHiddenCardPile(decks.weaknesses),
  };

  state.decks = sanitized;
}

function sanitizeCardPile<TCard>(pile: CardPile<TCard>): SanitizedCardPile<TCard> {
  return { drawPileCount: pile.drawPile.length, discard: [...pile.discard] };
}

function sanitizeHiddenCardPile<TCard>(pile: CardPile<TCard>): SanitizedHiddenCardPile {
  return { drawPileCount: pile.drawPile.length, discardCount: pile.discard.length };
}

/** Слабость, лежащая рубашкой вверх, остаётся неизвестной до Изучения в Лаборатории (стр. 21). */
function sanitizeWeaknessSlots(state: SanitizedGameState): void {
  const slots = state.intrudersPool.weaknessSlots as unknown as WeaknessSlotState[];

  state.intrudersPool.weaknessSlots = slots.map((slot): SanitizedWeaknessSlotState => {
    if (!slot.card) {
      return { objectKind: slot.objectKind, visibility: 'EMPTY' };
    }

    return slot.card.isRevealed
      ? { objectKind: slot.objectKind, visibility: 'REVEALED', card: slot.card }
      : { objectKind: slot.objectKind, visibility: 'FACE_DOWN' };
  });
}
