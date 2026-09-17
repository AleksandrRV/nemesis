import { EngineError } from './fsm.js';

import type { ActionDeckCard, ActionDeckState, ContaminationCard } from '../types/cards.js';
import type { PlayerState, WeaknessSlotState } from '../types/entities.js';
import type {
  SanitizedActionDeckCard,
  SanitizedActionDeckState,
  SanitizedGameState,
  SanitizedRoomState,
  SanitizedWeaknessSlotState,
} from '../types/sanitized.js';
import type { EngineNumber, GameState } from '../types/state.js';

/**
 * Фильтрация скрытой информации (tech_stack §3.2, AGENTS.md §3.4).
 *
 * Это единственная точка, из которой клиент и боты получают состояние: всё,
 * что персонаж видеть не мог, заменяется на явное «неизвестно», а не прячется
 * в UI — так «Нулевое читерство» становится свойством данных (аудит №7, №10).
 *
 * Осознанные ограничения v0 (см. аудит §4, P1):
 * - порядок мешка Чужих и колод не скрывается: для честной скрытой колоды нужен
 *   серверный генератор (этапы 3–4 и 10 дорожной карты);
 * - карты на руке другого персонажа не скрываются: их количество открыто влияет
 *   на проверку Внезапной атаки (стр. 18), а состав появится вместе с данными колод.
 */
export function filterStateForPlayer(state: GameState, viewingPlayerId: string): SanitizedGameState {
  const viewer = state.players[viewingPlayerId];

  if (!viewer) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Нельзя отфильтровать состояние для неизвестного персонажа: ${viewingPlayerId}.`,
    );
  }

  // Копия состояния, в которой скрытые поля заменяются на null/FACE_DOWN.
  const sanitized = structuredClone(state) as unknown as SanitizedGameState;

  sanitizeShip(sanitized, viewer);
  sanitizePlayers(sanitized, viewingPlayerId);
  sanitizeWeaknessSlots(sanitized);

  return sanitized;
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

    player.actionDeck = sanitizeActionDeck(player.actionDeck as unknown as ActionDeckState);
  }
}

function sanitizeActionDeck(deck: ActionDeckState): SanitizedActionDeckState {
  return {
    drawPile: deck.drawPile.map(sanitizeActionDeckCard),
    hand: deck.hand.map(sanitizeActionDeckCard),
    discard: deck.discard.map(sanitizeActionDeckCard),
  };
}

function sanitizeActionDeckCard(card: ActionDeckCard): SanitizedActionDeckCard {
  if ('characterClass' in card) {
    return card;
  }

  const contamination = card as ContaminationCard;

  return { ...contamination, isInfected: contamination.isScanned ? contamination.isInfected : null };
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
