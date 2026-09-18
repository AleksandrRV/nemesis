import { produce } from 'immer';

import type { EngineAction } from '../types/actions.js';
import type { ActionDeckCard, ItemCard } from '../types/cards.js';
import type { InterruptEvent, NoiseRollMode } from '../types/interrupts.js';
import type { GameLogEffectOutcome, GameLogNoiseReason } from '../types/log.js';
import type {
  CarefulMoveChosenCorridor,
  CorridorConnection,
  CorridorNumber,
  RoomId,
  RoomState,
} from '../types/rooms.js';
import type { GameOverReason, GameState } from '../types/state.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import { NOISE_DIE_FACES, type NoiseDieFace } from '../data/noiseDie.js';
import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { appendGameLog } from './gameLog.js';
import { noiseMarkersInSupply, placeDoorToken, placeFireMarker, placeMalfunctionMarker } from './markers.js';
import { drawFromStream } from '../utils/rng.js';
import { executeCardPayment } from './cardsPayment.js';
import { advanceTurn } from './turnCycle.js';
import { drawSearchCards, placeItemToPlayer, validateSearchConditions } from './search.js';
import { executeRoomAbility } from './roomAbilities.js';
import { RED_ITEM_CARDS, YELLOW_ITEM_CARDS, GREEN_ITEM_CARDS } from '../data/itemCards.js';
import type { ItemDeckColor } from '../types/cards.js';
import type { PendingDecision } from '../types/decisions.js';

/**
 * Движок правил.
 *
 * Единственная точка, где меняется `GameState`: клиент отправляет действие,
 * движок проверяет возможность, выполняет шаг и разбирает каскад прерываний
 * до конца (tech_stack §4, GDD §3.3).
 *
 * Принцип «правила 1:1»: каждый шаг здесь имеет ссылку на страницу правил,
 * а всё, что ещё не реализовано, отклоняется с явной ошибкой — молчаливое
 * «ничего не произошло» или разыгранная наугад механика недопустимы.
 */

export type EngineErrorCode =
  | 'UNKNOWN_PLAYER'
  | 'PLAYER_IS_DEAD'
  | 'UNKNOWN_ROOM'
  | 'UNKNOWN_CORRIDOR'
  | 'MOVE_TARGET_IS_CURRENT_ROOM'
  | 'NO_OPEN_DOOR_BETWEEN_ROOMS'
  | 'ACTION_NOT_IMPLEMENTED'
  | 'DEV_ACTION_FORBIDDEN'
  | 'INTERRUPT_NOT_IMPLEMENTED'
  /** Партия уже окончена: правила запасов маркеров (стр. 17) закрыли игру. */
  | 'GAME_IS_OVER'
  /** «Осторожное движение» запрещено в Бою (стр. 13). */
  | 'CAREFUL_MOVE_IN_COMBAT'
  /** Выбранный Коридор не ведёт в отсек назначения (стр. 13). */
  | 'CAREFUL_MOVE_BAD_CHOICE'
  /** Во всех Коридорах, ведущих в отсек, уже стоят маркеры Шума (стр. 13). */
  | 'CAREFUL_MOVE_NO_FREE_CORRIDOR'
  /** Маркеров Шума в запасе не осталось: правило не описано книгой (стр. 3, 15–16). */
  | 'MARKER_SUPPLY_EXHAUSTED'
  /** Жетонов Дверей нет ни в запасе, ни среди закрытых Дверей на поле (стр. 17). */
  | 'DOOR_TOKEN_SUPPLY_EXHAUSTED'
  /** Контакт: в Коридоре уже стоит маркер Шума (стр. 15); сам Контакт — этап 4 дорожной карты. */
  | 'CONTACT_NOT_IMPLEMENTED'
  /** Перемещение Чужих по эффекту «Опасность» появится вместе с Пулом Чужих (этап 4 дорожной карты). */
  | 'INTRUDER_MOVEMENT_NOT_IMPLEMENTED'
  /** Ошибки валидатора оплаты карт (v0.3.0 Шаг 3) */
  | 'INSUFFICIENT_ACTION_CARDS'
  | 'PAYMENT_CARD_DUPLICATE'
  | 'PAYMENT_CARD_CANNOT_PAY_SELF'
  | 'PAYMENT_CARD_NOT_IN_HAND'
  | 'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST'
  /** Игрок уже спасовал в текущей Фазе Игроков (стр. 10). */
  | 'PLAYER_ALREADY_PASSED'
  /** Действие совершается не в свой ход (стр. 10). */
  | 'NOT_ACTIVE_PLAYER'
  /** Игрок не находится в Фазе Игроков. */
  | 'NOT_IN_PLAYER_PHASE'
  /** Ошибки Поиска (v0.3.0 Шаг 5) */
  | 'SEARCH_NOT_ALLOWED'
  | 'NO_ITEMS_LEFT'
  | 'SEARCH_IN_COMBAT'
  | 'UNKNOWN_DECK'
  | 'DECISION_NOT_FOUND'
  | 'INVALID_DECISION'
  | 'INVALID_DECISION_OPTION'
  /** Ошибки действий отсеков (v0.3.0 Шаг 6) */
  | 'ROOM_ABILITY_NOT_ALLOWED';

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

export interface ProcessActionOptions {
  /** Кто выполняет действие. По умолчанию — активный игрок партии. */
  actorId?: string;
  /** Разрешить отладочные действия: только dev-сборка и только локально. */
  allowDevActions?: boolean;
}

const DEV_ACTION_TYPES: readonly EngineAction['type'][] = ['DEV_TOGGLE_DOOR', 'DEV_TOGGLE_NOISE'];
const ROOM_DEFINITIONS = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

function isDevAction(action: EngineAction): boolean {
  return DEV_ACTION_TYPES.includes(action.type);
}

/**
 * Коридоры между отсеками с открытой Дверью: только по ним можно перейти
 * (стр. 14). Парные Коридоры между двумя отсеками модель пока не различает:
 * их список и номера выходов зафиксированы в пакете источника
 * (`doc/sources/data-sources.json#ship-graph-corridors`) и ждут сверки с полем.
 */
function findOpenCorridors(state: GameState, fromRoomId: RoomId, toRoomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) =>
      corridor.doorState === 'OPEN' &&
      ((corridor.fromRoomId === fromRoomId && corridor.toRoomId === toRoomId) ||
        (corridor.fromRoomId === toRoomId && corridor.toRoomId === fromRoomId)),
  );
}

/**
 * Соседние отсеки, доступные для перехода: соединены хотя бы одним
 * Коридором с открытой Дверью (стр. 14). Одно место для правила: им пользуется
 * и проверка движения в движке, и подсветка доступных отсеков в интерфейсе.
 */
export function findAdjacentOpenRoomIds(state: CorridorGraphState, fromRoomId: RoomId): RoomId[] {
  return Object.values(state.ship.corridors)
    .filter((corridor) => corridor.doorState === 'OPEN')
    .flatMap((corridor) =>
      corridor.fromRoomId === fromRoomId
        ? [corridor.toRoomId]
        : corridor.toRoomId === fromRoomId
          ? [corridor.fromRoomId]
          : [],
    );
}

/**
 * Минимум состояния, который нужен проверке соседства: только коридоры.
 * Подходит и полному `GameState`, и отфильтрованному представлению игрока,
 * поэтому правило читается из одного места и движком, и интерфейсом.
 */
export interface CorridorGraphState {
  ship: { corridors: Record<string, CorridorConnection> };
}

/** Коридор по идентификатору или ошибка: разыгрывать «действие в никуда» нельзя. */
function requireCorridor(state: GameState, corridorId: string): CorridorConnection {
  const corridor = state.ship.corridors[corridorId];

  if (!corridor) {
    throw new EngineError('UNKNOWN_CORRIDOR', `Коридора ${corridorId} нет на корабле.`);
  }

  return corridor;
}

function roomNameForLog(room: RoomState): string {
  return ROOM_DEFINITIONS.find((definition) => definition.id === room.definitionId)?.name ?? `Отсек #${room.id}`;
}

/**
 * Партия окончена: правила запасов закрывают игру, а не продолжают её
 * «как-нибудь» (стр. 17). Стек прерываний очищается: шагов после конца партии
 * не бывает.
 */
function endGame(state: GameState, reason: GameOverReason): void {
  state.meta.phase = 'GAME_OVER';
  state.meta.gameOverReason = reason;
  appendGameLog(state, { type: 'GAME_OVER', reason });
  state.interruptQueue = [];
}

export class GameEngine {
  /**
   * Применяет действие к состоянию партии и возвращает новое состояние.
   * Исходное состояние не меняется: работа идёт на immer-драфте. Если каскад
   * прерываний отклоняет шаг (например, Контакт ещё не разыгрывается), откат
   * возвращает партию к состоянию до действия целиком.
   */
  processAction(state: GameState, action: EngineAction, options: ProcessActionOptions = {}): GameState {
    const actorId = options.actorId ?? state.meta.activePlayerId;

    return produce(state, (draft) => {
      this.handleAction(draft, action, actorId, options);
      drainInterrupts(draft);
    });
  }

  /**
   * Проверка и выполнение шага — в одном месте: у каждого действия ровно одна
   * ветка, поэтому «проверили одно, выполнили другое» невозможно, а забытое
   * действие контракта отклоняется явной ошибкой в `default`.
   */
  private handleAction(state: GameState, action: EngineAction, actorId: string, options: ProcessActionOptions): void {
    if (state.meta.phase === 'GAME_OVER') {
      throw new EngineError(
        'GAME_IS_OVER',
        `Партия окончена (${state.meta.gameOverReason ?? 'причина не записана'}), действия больше не выполняются.`,
      );
    }

    if (isDevAction(action) && options.allowDevActions !== true) {
      throw new EngineError(
        'DEV_ACTION_FORBIDDEN',
        `Отладочное действие ${action.type} запрещено: разрешено только в dev-режиме.`,
      );
    }

    const player = state.players[actorId];

    if (!player) {
      throw new EngineError('UNKNOWN_PLAYER', `Действие от неизвестного персонажа: ${actorId}.`);
    }

    if (player.isDead) {
      throw new EngineError('PLAYER_IS_DEAD', `Погибший персонаж ${actorId} не может действовать.`);
    }

    if (!isDevAction(action)) {
      if (state.meta.phase !== 'PLAYER_PHASE') {
        throw new EngineError(
          'NOT_IN_PLAYER_PHASE',
          `Действия игроков разрешены только в Фазе Игроков (текущая: ${state.meta.phase}).`,
        );
      }

      if (player.hasPassed) {
        throw new EngineError(
          'PLAYER_ALREADY_PASSED',
          `Игрок ${actorId} уже спасовал в текущей Фазе Игроков и не может выполнять действия.`,
        );
      }

      if (state.meta.activePlayerId !== actorId) {
        throw new EngineError('NOT_ACTIVE_PLAYER', `Сейчас ход игрока ${state.meta.activePlayerId}, а не ${actorId}.`);
      }
    }

    switch (action.type) {
      case 'ACTION_MOVE': {
        const targetRoomId = action.payload.targetRoomId;
        const corridors = requireOpenPath(state, player.roomId, targetRoomId);

        // Стоимость базового действия «Движение» — 1 карта действия с руки (стр. 13)
        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);

        movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }

      case 'ACTION_CAREFUL_MOVE': {
        // «Осторожное движение» [2] (стр. 13): обычное Движение, но вместо
        // броска кубика Шума маркер кладётся в выбранный Коридор. Стоимость: 2 карты Действий (стр. 13).
        const targetRoomId = action.payload.targetRoomId;
        const chosen = action.payload.chosenCorridor;

        requireOpenPath(state, player.roomId, targetRoomId);
        requireCarefulMoveAllowed(state, actorId, targetRoomId, chosen);

        executeCardPayment(state, actorId, action.payload.discardCardIds, 2);

        const corridors = findOpenCorridors(state, player.roomId, targetRoomId);

        movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'CAREFUL', chosen });
        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }

      case 'DEV_TOGGLE_DOOR': {
        // Отладочный переключатель идёт тем же переходом, что и правила:
        // OPEN → CLOSED → DESTROYED, а Разрушенная Дверь — терминальное
        // состояние и «починить» её переключателем нельзя (стр. 17).
        const corridor = requireCorridor(state, action.payload.corridorId);

        if (corridor.doorState === 'OPEN') {
          const placement = placeDoorToken(state, corridor.id);

          if (placement === 'NO_TOKEN_IN_SUPPLY') {
            throw new EngineError(
              'DOOR_TOKEN_SUPPLY_EXHAUSTED',
              'Жетонов Дверей нет ни в запасе, ни среди Закрытых Дверей на поле (стр. 17).',
            );
          }
        } else if (corridor.doorState === 'CLOSED') {
          corridor.doorState = 'DESTROYED';
        }

        appendGameLog(state, {
          type: 'DEV_STATE_CHANGED',
          playerId: actorId,
          target: 'DOOR',
          corridorId: corridor.id,
          value: corridor.doorState,
        });
        return;
      }

      case 'DEV_TOGGLE_NOISE': {
        const corridor = requireCorridor(state, action.payload.corridorId);

        corridor.hasNoise = !corridor.hasNoise;
        appendGameLog(state, {
          type: 'DEV_STATE_CHANGED',
          playerId: actorId,
          target: 'NOISE',
          corridorId: corridor.id,
          value: corridor.hasNoise,
        });
        return;
      }

      case 'ACTION_PASS': {
        // Обычный пас (стр. 10, 28): игрок объявляет пас и имеет право
        // сбросить любое количество карт с руки (как карт Действий, так и карт Заражения).
        const discardIds = action.payload.discardCardIds ?? [];
        if (discardIds.length > 0) {
          const uniqueIds = new Set(discardIds);
          if (uniqueIds.size !== discardIds.length) {
            throw new EngineError('PAYMENT_CARD_DUPLICATE', 'Переданы повторяющиеся карты для сброса при пасе');
          }
          const handCardIds = new Set(player.actionDeck.hand.map((c) => c.id));
          for (const cardId of discardIds) {
            if (!handCardIds.has(cardId)) {
              throw new EngineError('PAYMENT_CARD_NOT_IN_HAND', 'Одной или нескольких сбрасываемых карт нет в руке');
            }
          }
          const remainingHand: ActionDeckCard[] = [];
          for (const card of player.actionDeck.hand) {
            if (uniqueIds.has(card.id)) {
              player.actionDeck.discard.push(card);
            } else {
              remainingHand.push(card);
            }
          }
          player.actionDeck.hand = remainingHand;
        }

        player.hasPassed = true;
        appendGameLog(state, {
          type: 'PLAYER_PASSED',
          playerId: actorId,
          discardedCount: discardIds.length,
        });
        advanceTurn(state, actorId);
        return;
      }

      case 'ACTION_SEARCH': {
        const { roomId, color } = validateSearchConditions(state, actorId);

        // Оплата: 1 карта действия с руки
        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);

        let targetColor: ItemDeckColor;
        if (color === 'WHITE') {
          if (!action.payload.chosenDeckColor) {
            state.pendingDecision = {
              id: `search-deck-${Date.now()}-${actorId}`,
              playerId: actorId,
              type: 'CHOOSE_WHITE_ROOM_DECK',
              roomId,
            };
            return;
          }
          targetColor = action.payload.chosenDeckColor;
        } else {
          targetColor = color;
        }

        const drawn = drawSearchCards(state, targetColor);
        if (drawn.length === 0) {
          throw new EngineError('NO_ITEMS_LEFT', `В колоде ${targetColor} предметов не осталось карт`);
        }

        if (drawn.length === 1) {
          const item = drawn[0]!;
          placeItemToPlayer(state, actorId, item);
          const currentRoom = state.ship.rooms[roomId]!;
          if (currentRoom.itemsCount > 0) currentRoom.itemsCount -= 1;
          appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId });
          player.actionsPerformedThisRound += 1;
          if (player.actionsPerformedThisRound >= 2) {
            advanceTurn(state, actorId);
          }
          return;
        }

        state.pendingDecision = {
          id: `search-item-${Date.now()}-${actorId}`,
          playerId: actorId,
          type: 'CHOOSE_SEARCH_ITEM',
          drawnCardIds: drawn.map((c) => c.id),
          sourceDeck: targetColor,
          roomId,
        };
        return;
      }

      case 'ACTION_RESOLVE_DECISION': {
        const decision = state.pendingDecision;
        if (!decision || decision.id !== action.payload.decisionId) {
          throw new EngineError('DECISION_NOT_FOUND', 'Активное решение не найдено или идентификатор не совпадает');
        }

        if (decision.playerId !== actorId) {
          throw new EngineError('INVALID_DECISION', 'Решение предназначено для другого игрока');
        }

        if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
          const chosenColor = action.payload.selectedOption as ItemDeckColor;
          if (!['RED', 'YELLOW', 'GREEN'].includes(chosenColor)) {
            throw new EngineError('INVALID_DECISION_OPTION', `Недопустимый цвет колоды: ${chosenColor}`);
          }
          const drawn = drawSearchCards(state, chosenColor);
          if (drawn.length === 0) {
            throw new EngineError('NO_ITEMS_LEFT', `В колоде ${chosenColor} предметов не осталось карт`);
          }
          if (drawn.length === 1) {
            const item = drawn[0]!;
            placeItemToPlayer(state, actorId, item);
            const currentRoom = state.ship.rooms[decision.roomId]!;
            if (currentRoom.itemsCount > 0) currentRoom.itemsCount -= 1;
            appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: decision.roomId });
            state.pendingDecision = null;
            player.actionsPerformedThisRound += 1;
            if (player.actionsPerformedThisRound >= 2) {
              advanceTurn(state, actorId);
            }
            return;
          }
          state.pendingDecision = {
            id: `search-item-${Date.now()}-${actorId}`,
            playerId: actorId,
            type: 'CHOOSE_SEARCH_ITEM',
            drawnCardIds: drawn.map((c) => c.id),
            sourceDeck: chosenColor,
            roomId: decision.roomId,
          };
          return;
        }

        if (decision.type === 'CHOOSE_SEARCH_ITEM') {
          const chosenCardId = action.payload.selectedOption;
          if (!decision.drawnCardIds.includes(chosenCardId)) {
            throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной карты нет среди вытянутых');
          }
          const unchosenCardId = decision.drawnCardIds.find((id) => id !== chosenCardId)!;
          const pile = state.decks.items[decision.sourceDeck];

          const deckItems =
            decision.sourceDeck === 'RED'
              ? RED_ITEM_CARDS
              : decision.sourceDeck === 'YELLOW'
                ? YELLOW_ITEM_CARDS
                : GREEN_ITEM_CARDS;

          const chosenCard = deckItems.find((c) => c.id === chosenCardId);
          const unchosenCard = deckItems.find((c) => c.id === unchosenCardId);

          if (chosenCard) {
            placeItemToPlayer(state, actorId, chosenCard);
          }
          if (unchosenCard) {
            pile.drawPile.push(unchosenCard);
          }

          const currentRoom = state.ship.rooms[decision.roomId]!;
          if (currentRoom.itemsCount > 0) {
            currentRoom.itemsCount -= 1;
          }

          appendGameLog(state, {
            type: 'SEARCH_PERFORMED',
            playerId: actorId,
            roomId: decision.roomId,
          });

          state.pendingDecision = null;
          player.actionsPerformedThisRound += 1;
          if (player.actionsPerformedThisRound >= 2) {
            advanceTurn(state, actorId);
          }
          return;
        }

        if (decision.type === 'DISCARD_HEAVY_ITEM_FOR_NEW') {
          const slotIndex = player.handSlots.findIndex(
            (slot) => slot.source === 'ITEM' && slot.card.id === action.payload.selectedOption,
          );
          if (slotIndex === -1) {
            throw new EngineError('INVALID_DECISION_OPTION', 'Указанный тяжёлый предмет не найден в руках');
          }
          const oldSlot = player.handSlots[slotIndex]!;
          if (oldSlot.source === 'ITEM') {
            const oldCard = oldSlot.card;
            if (oldCard.color !== 'BLUE') {
              state.decks.items[oldCard.color].discard.push(oldCard);
            }
          }
          const allItems = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS];
          const newCard = allItems.find((c) => c.id === decision.newItemId);
          if (newCard) {
            player.handSlots[slotIndex] = { source: 'ITEM', card: newCard };
          }
          state.pendingDecision = null;
          return;
        }

        throw new EngineError(
          'INVALID_DECISION',
          `Тип решения не поддерживается: ${(decision as PendingDecision).type}`,
        );
      }

      case 'ACTION_ROOM_ABILITY': {
        // Оплата действия отсека: ровно 2 карты действия с руки (стр. 13, 24)
        executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], 2);

        executeRoomAbility(state, actorId, action.payload);
        return;
      }

      case 'ACTION_PLAY_CARD': {
        const cardIndex = player.actionDeck.hand.findIndex((c) => c.id === action.payload.cardId);
        if (cardIndex === -1) {
          throw new EngineError('INSUFFICIENT_ACTION_CARDS', 'Разыгрываемой карты нет в руке');
        }
        const card = player.actionDeck.hand[cardIndex]!;
        if (!('characterClass' in card)) {
          throw new EngineError('CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST', 'Карту Заражения нельзя разыграть');
        }

        // Оплата стоимости карты (playCost)
        if (card.playCost > 0) {
          executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], card.playCost, card.id);
        }

        // Удаляем сыгранную карту из руки и кладём в личный сброс
        player.actionDeck.hand.splice(cardIndex, 1);
        player.actionDeck.discard.push(card);

        // Применяем специфический эффект базовых карт, если есть
        if (card.id.includes('RELOAD')) {
          // Пополнение патронов для оружия в руке
          const weaponSlot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.isWeapon);
          if (weaponSlot && weaponSlot.source === 'ITEM') {
            weaponSlot.card.ammo = Math.min((weaponSlot.card.ammo ?? 0) + 1, weaponSlot.card.maxAmmo ?? 6);
          }
        } else if (card.id.includes('REST') || card.name === 'Отдых') {
          // Просканировать карты Заражения в руке и удалить чистые
          const nextHand: ActionDeckCard[] = [];
          for (const c of player.actionDeck.hand) {
            if (!('characterClass' in c)) {
              c.isScanned = true;
              if (c.isInfected) {
                // Заражена - остаётся
                nextHand.push(c);
              }
              // Чистая отбрасывается
            } else {
              nextHand.push(c);
            }
          }
          player.actionDeck.hand = nextHand;
        } else if (card.id.includes('REPAIR')) {
          // Ремонт отсека
          const currentRoom = state.ship.rooms[player.roomId];
          if (currentRoom) {
            currentRoom.hasMalfunction = false;
          }
        } else if (card.id.includes('DEMOLITION') && action.payload.targetCorridorId) {
          const corridor = state.ship.corridors[action.payload.targetCorridorId];
          if (corridor) {
            corridor.doorState = 'DESTROYED';
          }
        }

        appendGameLog(state, {
          type: 'ACTION_CARD_PLAYED',
          playerId: actorId,
          cardId: card.id,
          cardName: card.name,
        });

        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }

      case 'ACTION_USE_ITEM': {
        const itemIndex = player.inventory.findIndex((it) => it.id === action.payload.itemId);
        let foundItem: ItemCard | null = null;

        if (itemIndex > -1) {
          foundItem = player.inventory[itemIndex] ?? null;
          if (foundItem?.isSingleUse) {
            player.inventory.splice(itemIndex, 1);
          }
        } else {
          const handSlotIndex = player.handSlots.findIndex(
            (s) => s.source === 'ITEM' && s.card.id === action.payload.itemId,
          );
          if (handSlotIndex > -1) {
            const slot = player.handSlots[handSlotIndex];
            if (slot && slot.source === 'ITEM') {
              foundItem = slot.card;
              if (foundItem.isSingleUse) {
                player.handSlots.splice(handSlotIndex, 1);
              }
            }
          }
        }

        if (!foundItem) {
          throw new EngineError('NO_ITEMS_LEFT', 'Предмет не найден в инвентаре или слотах рук');
        }

        // Оплата стоимости предмета
        if (foundItem.actionCost > 0) {
          executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], foundItem.actionCost);
        }

        // Эффекты предметов
        if (foundItem.id.includes('BANDAGES') || foundItem.id.includes('MEDKIT')) {
          if (player.lightWounds > 0) {
            player.lightWounds = 0;
          } else if (player.seriousWounds.length > 0) {
            player.seriousWounds.pop();
          }
        } else if (foundItem.id.includes('ALCOHOL')) {
          const contamIndex = player.actionDeck.hand.findIndex((c) => !('characterClass' in c));
          if (contamIndex > -1) {
            player.actionDeck.hand.splice(contamIndex, 1);
          }
        } else if (foundItem.id.includes('ENERGY_CHARGE')) {
          const weaponSlot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.isWeapon);
          if (weaponSlot && weaponSlot.source === 'ITEM') {
            weaponSlot.card.ammo = weaponSlot.card.maxAmmo;
          }
        } else if (foundItem.id.includes('SYNTHETIC_FOOD')) {
          // Взять 2 карты
          for (let i = 0; i < 2; i++) {
            if (player.actionDeck.drawPile.length > 0) {
              player.actionDeck.hand.push(player.actionDeck.drawPile.pop()!);
            }
          }
        } else if (foundItem.id.includes('CLOTHES')) {
          player.hasSlime = false;
        } else if (foundItem.id.includes('FIRE_EXTINGUISHER')) {
          const currentRoom = state.ship.rooms[player.roomId];
          if (currentRoom) {
            currentRoom.hasFire = false;
          }
        } else if (foundItem.id.includes('TOOLS') || foundItem.id.includes('DUCT_TAPE')) {
          const currentRoom = state.ship.rooms[player.roomId];
          if (currentRoom) {
            currentRoom.hasMalfunction = false;
          }
        }

        appendGameLog(state, {
          type: 'ITEM_USED',
          playerId: actorId,
          itemId: foundItem.id,
          itemName: foundItem.name,
        });

        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }
      default:
        throw new EngineError(
          'ACTION_NOT_IMPLEMENTED',
          `Действие ${action.type} объявлено контрактом, но ещё не реализовано движком (см. дорожную карту).`,
        );
    }
  }
}

/** Проверка общего для Движения и «Осторожного движения» пути (стр. 14). */
function requireOpenPath(state: GameState, fromRoomId: RoomId, targetRoomId: RoomId): CorridorConnection[] {
  if (!state.ship.rooms[targetRoomId]) {
    throw new EngineError('UNKNOWN_ROOM', `Отсека ${targetRoomId} нет на корабле.`);
  }

  if (targetRoomId === fromRoomId) {
    throw new EngineError('MOVE_TARGET_IS_CURRENT_ROOM', 'Персонаж уже находится в этом отсеке.');
  }

  const corridors = findOpenCorridors(state, fromRoomId, targetRoomId);

  if (corridors.length === 0) {
    throw new EngineError(
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
      `Отсек ${targetRoomId} не соседний с ${fromRoomId}: нет Коридора с открытой Дверью (стр. 14).`,
    );
  }

  return corridors;
}

/** Все Коридоры, ведущие в отсек, включая поле Технических Коридоров при наличии Входа (стр. 15–16). */
function corridorsLeadingInto(state: GameState, roomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

function roomHasTechnicalEntrance(roomId: RoomId): boolean {
  return (SHIP_ROOM_NODES.find((node) => node.id === roomId)?.techNumbers.length ?? 0) > 0;
}

/** Свободно ли выбранное место для маркера Шума (стр. 13, 15). */
function chosenPlaceHasNoise(state: GameState, chosen: CarefulMoveChosenCorridor, targetRoomId?: RoomId): boolean {
  if (chosen.kind === 'TECHNICAL_CORRIDOR') return state.ship.technicalCorridorNoise;

  if (chosen.kind === 'CORRIDOR_NUMBER') {
    if (!targetRoomId) return false;
    const leading = corridorsLeadingInto(state, targetRoomId);
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber),
    );
    // Свободно, если хотя бы в одном коридоре с этим номером ещё нет шума
    return matching.length > 0 && matching.every((c) => c.hasNoise);
  }

  const corridor = state.ship.corridors[chosen.corridorId];

  return corridor ? corridor.hasNoise : true;
}

/**
 * Проверки «Осторожного движения» (стр. 13): не в Бою; выбранный Коридор ведёт
 * в отсек назначения; хотя бы одно место, куда можно положить маркер, свободно.
 */
function requireCarefulMoveAllowed(
  state: GameState,
  playerId: string,
  targetRoomId: RoomId,
  chosen: CarefulMoveChosenCorridor,
): void {
  const player = state.players[playerId];
  const currentRoom = player ? state.ship.rooms[player.roomId] : undefined;

  if ((currentRoom?.occupantIntruderIds.length ?? 0) > 0) {
    throw new EngineError(
      'CAREFUL_MOVE_IN_COMBAT',
      '«Осторожное движение» нельзя выполнять, находясь в Бою (стр. 13).',
    );
  }

  const leading = corridorsLeadingInto(state, targetRoomId);

  if (chosen.kind === 'TECHNICAL_CORRIDOR') {
    if (!roomHasTechnicalEntrance(targetRoomId)) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `В отсеке ${targetRoomId} нет Входа в Технические Коридоры: туда нельзя положить маркер (стр. 16).`,
      );
    }
  } else if (chosen.kind === 'CORRIDOR_NUMBER') {
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber),
    );
    if (matching.length === 0) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `Номер коридора ${chosen.corridorNumber} не ведет в отсек ${targetRoomId} (стр. 13).`,
      );
    }
  } else if (!leading.some((corridor) => corridor.id === chosen.corridorId)) {
    throw new EngineError(
      'CAREFUL_MOVE_BAD_CHOICE',
      `Коридор ${chosen.corridorId} не ведёт в отсек ${targetRoomId} (стр. 13).`,
    );
  }

  const freeCorridor = leading.some((corridor) => !corridor.hasNoise);
  const freeTechnical = roomHasTechnicalEntrance(targetRoomId) && !state.ship.technicalCorridorNoise;

  if (!freeCorridor && !freeTechnical) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      `В каждом Коридоре, ведущем в отсек ${targetRoomId}, уже есть маркер Шума: «Осторожное движение» невозможно (стр. 13).`,
    );
  }

  if (chosenPlaceHasNoise(state, chosen, targetRoomId)) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      'Выбранный Коридор уже помечен маркером Шума: выберите другой (стр. 13).',
    );
  }
}

/**
 * Перемещение персонажа (стр. 14): миниатюра уходит в соседний отсек, откуда
 * он уходит — исчезает из списка occupants. Вход в отсек всегда завершается
 * двумя шагами, и оба оформляются прерываниями, а не побочным эффектом:
 *
 * 1. вскрытие тайла и жетона Исследования — `EXPLORE_ROOM_INTERRUPT` (только
 *    для неисследованного отсека);
 * 2. шум — `NOISE_ROLL_INTERRUPT` (бросок кубика либо маркер «Осторожного
 *    движения»; его могут отменить эффекты жетона и присутствие персонажа
 *    или Чужого в отсеке, стр. 14–15).
 */
function movePlayer(
  state: GameState,
  playerId: string,
  targetRoomId: RoomId,
  corridorId: string,
  noise: NoiseRollMode,
): void {
  const player = state.players[playerId];
  const targetRoom = state.ship.rooms[targetRoomId];

  if (!player || !targetRoom) return;

  const oldRoom = state.ship.rooms[player.roomId];

  if (oldRoom) {
    oldRoom.occupantPlayerIds = oldRoom.occupantPlayerIds.filter((id) => id !== playerId);
  }

  targetRoom.occupantPlayerIds = [...targetRoom.occupantPlayerIds, playerId];
  const wasUnexplored = !targetRoom.isExplored;
  player.roomId = targetRoomId;

  appendGameLog(state, {
    type: 'PLAYER_MOVED',
    playerId,
    fromRoomId: oldRoom?.id ?? player.roomId,
    toRoomId: targetRoomId,
    corridorId,
    mode: noise.kind === 'CAREFUL' ? 'CAREFUL' : 'NORMAL',
  });

  const nextInterrupts: InterruptEvent[] = wasUnexplored
    ? [{ type: 'EXPLORE_ROOM_INTERRUPT', playerId, roomId: targetRoomId, corridorId }]
    : [];

  state.interruptQueue = [
    ...state.interruptQueue,
    ...nextInterrupts,
    { type: 'NOISE_ROLL_INTERRUPT', playerId, roomId: targetRoomId, noise },
  ];
}

/** Разбирает стек прерываний до конца: действие считается завершённым только тогда (tech_stack §4). */
export function drainInterrupts(state: GameState): void {
  while (state.interruptQueue.length > 0) {
    // Партия может окончиться внутри каскада (взрыв корабля, разрыв обшивки):
    // оставшиеся шаги не разыгрываются.
    if (state.meta.phase === 'GAME_OVER') {
      state.interruptQueue = [];
      return;
    }

    const interrupt = state.interruptQueue.shift();

    if (!interrupt) return;

    resolveInterrupt(state, interrupt);
  }
}

/**
 * Разыгрывает одно прерывание.
 *
 * Реализованы вскрытие отсека и шум (бросок кубика и «Осторожное движение»).
 * Побег, Контакт и Внезапная атака требуют Пула Чужих, боя и колод: их разбор —
 * следующие этапы дорожной карты, поэтому движок отклоняет их явной ошибкой,
 * а не разыгрывает наугад.
 */
export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
  switch (interrupt.type) {
    case 'EXPLORE_ROOM_INTERRUPT':
      resolveExploreRoom(state, interrupt);
      return;

    case 'NOISE_ROLL_INTERRUPT':
      resolveNoiseRoll(state, interrupt);
      return;

    default:
      throw new EngineError(
        'INTERRUPT_NOT_IMPLEMENTED',
        `Прерывание ${interrupt.type} ещё не разыгрывается движком (см. дорожную карту).`,
      );
  }
}

/**
 * Вскрытие неисследованного отсека (стр. 14, шаги 1–2): тайл переворачивается,
 * раскрывается жетон Исследования, и разыгрывается его особый эффект.
 *
 * Число предметов уже лежит в отсеке (`itemsCount`) и счётчиком на поле
 * становится известным игроку — уменьшать его будет Действие «Поиск» (этап 3).
 * Эффекты «Тишина» и «Опасность» управляют шумом, поэтому их разыгрывает
 * следующее прерывание `NOISE_ROLL_INTERRUPT`, когда шум уже можно отменить.
 */
function resolveExploreRoom(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'EXPLORE_ROOM_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Прерывание вскрытия ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Прерывание вскрытия ссылается на неизвестного персонажа: ${interrupt.playerId}.`,
    );
  }

  room.isExplored = true;
  const explorationEffect = room.explorationEffect;

  appendGameLog(state, {
    type: 'ROOM_DISCOVERED',
    playerId: interrupt.playerId,
    roomId: room.id,
    roomName: roomNameForLog(room),
    category: room.category,
  });

  // Эффект вскрытия не должен затирать исходный explorationEffect тайла,
  // так как он требуется следующему прерыванию шума NOISE_ROLL_INTERRUPT.
  if (explorationEffect !== null) {
    appendGameLog(state, {
      type: 'EXPLORATION_TOKEN_REVEALED',
      playerId: interrupt.playerId,
      roomId: room.id,
      itemsCount: room.itemsCount,
      effect: explorationEffect,
    });
  }

  switch (explorationEffect) {
    case 'FIRE': {
      // Маркер Пожара в отсек; последний маркер взрывает корабль (стр. 17).
      const placement = placeFireMarker(state, interrupt.roomId);
      const outcome: GameLogEffectOutcome =
        placement === 'SHIP_EXPLODED'
          ? 'SHIP_EXPLODED'
          : placement === 'ALREADY_PRESENT'
            ? 'FIRE_ALREADY_PRESENT'
            : 'FIRE_PLACED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'FIRE',
        outcome,
      });

      if (placement === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');

      return;
    }

    case 'MALFUNCTION': {
      // Маркер Неисправности; в Улей и Комнату со Слизью его класть нельзя,
      // а последний маркер разрывает обшивку (стр. 17).
      const placement = placeMalfunctionMarker(state, interrupt.roomId);
      const outcome: GameLogEffectOutcome =
        placement === 'HULL_BREACH'
          ? 'HULL_BREACH'
          : placement === 'ALREADY_PRESENT'
            ? 'MALFUNCTION_ALREADY_PRESENT'
            : placement === 'FORBIDDEN_ROOM'
              ? 'MALFUNCTION_FORBIDDEN'
              : 'MALFUNCTION_PLACED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'MALFUNCTION',
        outcome,
      });

      if (placement === 'HULL_BREACH') endGame(state, 'HULL_BREACH');

      return;
    }

    case 'SLIME': {
      // У персонажа не больше одного маркера Слизи (стр. 17).
      const outcome: GameLogEffectOutcome = player.hasSlime ? 'SLIME_ALREADY_PRESENT' : 'SLIME_APPLIED';

      player.hasSlime = true;
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'SLIME',
        outcome,
      });
      return;
    }

    case 'DOORS': {
      const placement = closeDoorOfEntry(state, interrupt.corridorId);
      const outcome: GameLogEffectOutcome =
        placement === 'MOVED_FROM_BOARD'
          ? 'DOOR_MOVED'
          : placement === 'ALREADY_CLOSED'
            ? 'DOOR_ALREADY_CLOSED'
            : placement === 'DESTROYED'
              ? 'DOOR_DESTROYED'
              : 'DOOR_CLOSED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'DOORS',
        outcome,
      });
      return;
    }

    case 'SILENCE':
    case 'DANGER':
    case null:
      // «Тишина» и «Опасность» разыгрываются вместе с шумом,
      // а у особых отсеков жетона Исследования нет вовсе (стр. 26).
      return;
  }
}

/**
 * Эффект «Двери»: жетон Двери ставится в Коридор, через который персонаж вошёл
 * в отсек (стр. 15). Жетон, стоящий в Коридоре, означает Закрытую Дверь, а
 * Разрушенную снова закрыть нельзя (стр. 17); запас из 12 жетонов и
 * перестановка с поля учтены в `placeDoorToken`.
 */
function closeDoorOfEntry(
  state: GameState,
  corridorId: string,
): 'PLACED' | 'ALREADY_CLOSED' | 'DESTROYED' | 'MOVED_FROM_BOARD' {
  const corridor = requireCorridor(state, corridorId);
  const placement = placeDoorToken(state, corridor.id);

  if (placement === 'UNKNOWN_CORRIDOR') {
    throw new EngineError('UNKNOWN_CORRIDOR', `Коридора ${corridor.id} нет на корабле.`);
  }

  if (placement === 'NO_TOKEN_IN_SUPPLY') {
    throw new EngineError(
      'DOOR_TOKEN_SUPPLY_EXHAUSTED',
      'Жетонов Дверей нет ни в запасе, ни среди Закрытых Дверей на поле (стр. 17).',
    );
  }

  return placement;
}

/**
 * Шум после входа в отсек (стр. 15).
 *
 * Порядок разбора:
 * 1. `NOISE_ROLL_INTERRUPT` идёт следом за вскрытием отсека, поэтому хранит
 *    память об эффекте жетона; сам жетон после розыгрыша удаляется из игры.
 * 2. В отсеке есть другой Персонаж или Чужой — шума нет («ПОМНИТЕ» на стр. 15).
 * 3. Эффект «Опасность» (и «Тишина» при маркере Слизи) разыгрывается вместо
 *    броска — и при «Осторожном движении» тоже (стр. 13, 15, 17).
 * 4. «Осторожное движение» вместо броска кладёт маркер в выбранный Коридор;
 *    эффект «Тишина» этот маркер не отменяет (стр. 13).
 * 5. Иначе кубик бросается, и грань разыгрывается целиком.
 */
function resolveNoiseRoll(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'NOISE_ROLL_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Шум ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Шум ссылается на неизвестного персонажа: ${interrupt.playerId}.`);
  }

  const tokenEffect = room.explorationEffect;
  room.explorationEffect = null;

  const hasCompany =
    room.occupantPlayerIds.some((occupantId) => occupantId !== interrupt.playerId) ||
    room.occupantIntruderIds.length > 0;

  if (hasCompany) {
    appendGameLog(state, {
      type: 'NOISE_SKIPPED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      reason: 'COMPANION',
    });
    return;
  }

  if (tokenEffect === 'DANGER' || (tokenEffect === 'SILENCE' && player.hasSlime)) {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      effect: tokenEffect === 'DANGER' ? 'DANGER' : 'SILENCE',
      outcome: 'DANGER_TRIGGERED',
    });
    resolveDanger(state, interrupt.roomId, interrupt.playerId);
    return;
  }

  if (interrupt.noise.kind === 'CAREFUL') {
    placeCarefulNoiseMarker(state, interrupt.playerId, interrupt.roomId, interrupt.noise.chosen);
    return;
  }

  if (tokenEffect === 'SILENCE') {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      effect: 'SILENCE',
      outcome: 'SILENCE_RESOLVED',
    });
    appendGameLog(state, {
      type: 'NOISE_SKIPPED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      reason: 'EXPLORATION_SILENCE',
    });
    return;
  }

  const face = rollNoiseDie(state);

  appendGameLog(state, {
    type: 'NOISE_ROLLED',
    playerId: interrupt.playerId,
    roomId: interrupt.roomId,
    result: face,
  });

  applyNoiseFace(state, interrupt.playerId, interrupt.roomId, face);
}

/** Маркер Шума «Осторожного движения»: выбранный Коридор или поле Технических Коридоров (стр. 13, 16). */
function placeCarefulNoiseMarker(
  state: GameState,
  playerId: string,
  roomId: RoomId,
  chosen: CarefulMoveChosenCorridor,
): void {
  if (chosen.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      throw new EngineError(
        'CAREFUL_MOVE_NO_FREE_CORRIDOR',
        'На поле Технических Коридоров уже есть маркер Шума: выберите другой Коридор (стр. 16).',
      );
    }

    requireNoiseMarkerSupply(state);
    state.ship.technicalCorridorNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'TECHNICAL_CORRIDOR' },
      reason: 'CAREFUL',
    });
    return;
  }

  if (chosen.kind === 'CORRIDOR_NUMBER') {
    const leading = corridorsLeadingInto(state, roomId);
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, roomId).includes(chosen.corridorNumber),
    );

    if (matching.length === 0) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `Коридоров с номером ${chosen.corridorNumber} нет в отсеке ${roomId}.`,
      );
    }

    // Если коридоров с таким номером несколько - шум добавляется во все коридоры с таким номером (без дублирования Контакта, если уже есть шум)
    for (const corridor of matching) {
      if (!corridor.hasNoise) {
        requireNoiseMarkerSupply(state);
        corridor.hasNoise = true;
        appendGameLog(state, {
          type: 'NOISE_MARKER_PLACED',
          playerId,
          roomId,
          target: { kind: 'CORRIDOR', corridorId: corridor.id },
          reason: 'CAREFUL',
        });
      }
    }
    return;
  }

  const corridor = requireCorridor(state, chosen.corridorId);

  if (!corridorsLeadingInto(state, roomId).some((candidate) => candidate.id === corridor.id)) {
    throw new EngineError('CAREFUL_MOVE_BAD_CHOICE', `Коридор ${corridor.id} не ведёт в отсек ${roomId} (стр. 13).`);
  }

  if (corridor.hasNoise) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      `В Коридоре ${corridor.id} уже есть маркер Шума: выберите другой (стр. 13).`,
    );
  }

  requireNoiseMarkerSupply(state);
  corridor.hasNoise = true;
  appendGameLog(state, {
    type: 'NOISE_MARKER_PLACED',
    playerId,
    roomId,
    target: { kind: 'CORRIDOR', corridorId: corridor.id },
    reason: 'CAREFUL',
  });
}

/** Разыгрывает выпавшую грань кубика Шума (стр. 15). */
function applyNoiseFace(state: GameState, playerId: string, roomId: RoomId, face: NoiseDieFace): void {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Грань кубика Шума ссылается на неизвестного персонажа: ${playerId}.`);
  }

  if (face.kind === 'SILENCE') {
    if (player.hasSlime) {
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId,
        roomId,
        effect: 'SILENCE',
        outcome: 'DANGER_TRIGGERED',
      });
      resolveDanger(state, roomId, playerId);
    } else {
      appendGameLog(state, { type: 'NOISE_SKIPPED', playerId, roomId, reason: 'NOISE_SILENCE' });
    }

    return;
  }

  if (face.kind === 'DANGER') {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId,
      roomId,
      effect: 'DANGER',
      outcome: 'DANGER_TRIGGERED',
    });
    resolveDanger(state, roomId, playerId);
    return;
  }

  const target = findNoiseTarget(state, roomId, face.number);

  if (target.kind === 'UNMAPPED') {
    // Решение владельца проекта (17.09.2026): пока номера выходов отсеков
    // не сверены с полем (пакет источника, `ship-graph-corridors`), бросок
    // на номер, которого нет среди выходов отсека, разыгрывается как
    // «Тишина» — включая превращение Слизью в «Опасность» (стр. 17).
    appendGameLog(state, { type: 'NOISE_SKIPPED', playerId, roomId, reason: 'UNMAPPED_EXIT' });

    if (player.hasSlime) {
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId,
        roomId,
        effect: 'SILENCE',
        outcome: 'DANGER_TRIGGERED',
      });
      resolveDanger(state, roomId, playerId);
    }

    return;
  }

  placeNoiseMarker(state, playerId, roomId, target, 'ROLL');
}

/** Куда кладётся маркер Шума: Коридор с выпавшим номером или Вход в Технические Коридоры (стр. 15). */
export type NoiseTarget =
  { kind: 'TECHNICAL_CORRIDOR' } | { kind: 'CORRIDOR'; corridor: CorridorConnection } | { kind: 'UNMAPPED' };

/**
 * Ищет место для маркера Шума по выпавшему номеру.
 *
 * Коридоры считаются вместе с Техническими Коридорами, если в отсеке есть Вход
 * (стр. 15): маркер уходит на общее поле Технических Коридоров.
 */
export function findNoiseTarget(state: GameState, roomId: RoomId, number: CorridorNumber): NoiseTarget {
  const roomNode = SHIP_ROOM_NODES.find((node) => node.id === roomId);

  if (roomNode?.techNumbers.includes(number)) {
    return { kind: 'TECHNICAL_CORRIDOR' };
  }

  const corridor = corridorsLeadingInto(state, roomId).find((candidate) =>
    corridorNumbersOf(candidate, roomId).includes(number),
  );

  return corridor ? { kind: 'CORRIDOR', corridor } : { kind: 'UNMAPPED' };
}

/** Номера Коридора со стороны конкретного отсека: номер напечатан у выхода (стр. 15). */
function corridorNumbersOf(corridor: CorridorConnection, roomId: RoomId): CorridorNumber[] {
  if (corridor.fromRoomId === roomId) return corridor.fromNumbers;
  if (corridor.toRoomId === roomId) return corridor.toNumbers;

  return [];
}

/**
 * Кладёт маркер Шума. В каждом Коридоре не может быть больше одного маркера:
 * попытка положить второй означает Контакт (стр. 15), а сам Контакт — вытягивание
 * жетона Чужого и Внезапная атака — появится вместе с Пулом Чужих (этап 4
 * дорожной карты), поэтому здесь движок отклоняет шаг явной ошибкой.
 */
function placeNoiseMarker(
  state: GameState,
  playerId: string,
  roomId: RoomId,
  target: Exclude<NoiseTarget, { kind: 'UNMAPPED' }>,
  reason: GameLogNoiseReason,
): void {
  if (target.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      throw contactError('Технические Коридоры');
    }

    requireNoiseMarkerSupply(state);
    state.ship.technicalCorridorNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'TECHNICAL_CORRIDOR' },
      reason,
    });
    return;
  }

  if (target.corridor.hasNoise) {
    throw contactError(`Коридор ${target.corridor.id}`);
  }

  requireNoiseMarkerSupply(state);
  target.corridor.hasNoise = true;
  appendGameLog(state, {
    type: 'NOISE_MARKER_PLACED',
    playerId,
    roomId,
    target: { kind: 'CORRIDOR', corridorId: target.corridor.id },
    reason,
  });
}

/**
 * Пока в запасе есть маркеры Шума, правило простое (стр. 15). Что делать,
 * когда закончились все 30, книга не описывает: движок отказывает явной
 * ошибкой, а не выдумывает исход (AGENTS.md §1.3).
 */
function requireNoiseMarkerSupply(state: GameState): void {
  if (noiseMarkersInSupply(state.ship) <= 0) {
    throw new EngineError(
      'MARKER_SUPPLY_EXHAUSTED',
      'В запасе не осталось маркеров Шума: книга правил не описывает этот случай (стр. 3, 15–16).',
    );
  }
}

function contactError(place: string): EngineError {
  return new EngineError(
    'CONTACT_NOT_IMPLEMENTED',
    `Контакт: в этом месте уже стоит маркер Шума (${place}). Вытягивание жетона Чужого появится вместе с Пулом Чужих (этап 4 дорожной карты).`,
  );
}

/**
 * Эффект «Опасность» (стр. 14–15 и стр. 15): Чужой из соседнего отсека
 * перемещается сюда, а если Чужих рядом нет — по одному маркеру Шума в каждый
 * Коридор без маркера, ведущий в отсек, включая Технические Коридоры, если
 * в отсеке есть Вход. Маркеры ставятся без Контакта: занятые Коридоры просто
 * пропускаются.
 */
function resolveDanger(state: GameState, roomId: RoomId, playerId: string): void {
  const neighbours = corridorsLeadingInto(state, roomId).map((corridor) =>
    corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId,
  );
  const intrudersAround = neighbours.some(
    (neighbourId) => (state.ship.rooms[neighbourId]?.occupantIntruderIds.length ?? 0) > 0,
  );

  if (intrudersAround) {
    throw new EngineError(
      'INTRUDER_MOVEMENT_NOT_IMPLEMENTED',
      'Эффект «Опасность» требует переместить Чужого из соседнего отсека: это появится вместе с Пулом Чужих (этап 4 дорожной карты).',
    );
  }

  const freeCorridors = corridorsLeadingInto(state, roomId).filter((corridor) => !corridor.hasNoise);
  const needsTechnical = roomHasTechnicalEntrance(roomId) && !state.ship.technicalCorridorNoise;

  if (freeCorridors.length + (needsTechnical ? 1 : 0) > noiseMarkersInSupply(state.ship)) {
    throw new EngineError(
      'MARKER_SUPPLY_EXHAUSTED',
      'Эффекту «Опасность» не хватает маркеров Шума в запасе: книга правил не описывает этот случай (стр. 3, 15).',
    );
  }

  for (const corridor of freeCorridors) {
    corridor.hasNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'CORRIDOR', corridorId: corridor.id },
      reason: 'DANGER',
    });
  }

  if (needsTechnical) {
    state.ship.technicalCorridorNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'TECHNICAL_CORRIDOR' },
      reason: 'DANGER',
    });
  }
}

/**
 * Бросок кубика Шума из потока `noise`: позиция берётся из счётчика в состоянии
 * (`meta.rngDraws`), поэтому после сохранения и перезагрузки последовательность
 * продолжается, а не начинается заново (utils/rng.ts).
 */
function rollNoiseDie(state: GameState): NoiseDieFace {
  const drawIndex = state.meta.rngDraws.noise;
  const value = drawFromStream(state.meta.seed, 'noise', drawIndex);
  const faceIndex = Math.min(NOISE_DIE_FACES.length - 1, Math.floor(value * NOISE_DIE_FACES.length));

  state.meta.rngDraws.noise = drawIndex + 1;

  return NOISE_DIE_FACES[faceIndex]!;
}
