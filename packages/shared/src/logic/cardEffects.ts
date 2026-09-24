import type { EngineAction } from '../types/actions.js';
import type { ActionCard, ItemCard, ItemDeckColor } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import type { RoomId, RoomState } from '../types/rooms.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { movePlayer } from './movement.js';
import { performPass } from './turnCycle.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { drawOneActionCard, executeReposition } from './classCombatCards.js';
import { checkInjuryResult } from './shoot.js';
import { sufferLightWounds, receiveContamination } from './characterDamage.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { requireIntruder } from './intruderPlacement.js';
import { validateSearchConditions, drawSearchCards, placeItemToPlayer, getRoomDeckColor } from './search.js';
import { finishSearch } from './searchActions.js';
import { reshuffleDiscard } from './cardPiles.js';
import { allocateEntityId } from './stateIds.js';
import type { ExplorationEffect } from '../types/rooms.js';

/**
 * Машинные эффекты карт Действий и Предметов (Этап «Карты работают»).
 *
 * `executePlayCard`/`executeUseItem` разбирают карту до `effect.kind` и
 * вызывают отсюда соответствующую реализацию. Каждая проверка выполнимости
 * бросает `EngineError` с текстом на русском — клиент показывает его как
 * причину, почему карту нельзя использовать. Тексты причин дублируются в
 * клиентской модели `cardUsageModel.ts`, чтобы кнопка блокировалась до
 * отправки действия.
 */

function requirePlayer(state: GameState, actorId: string) {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}`);
  return player;
}

function requireRoom(state: GameState, actorId: string): RoomState {
  const player = requirePlayer(state, actorId);
  const room = state.ship.rooms[player.roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Отсек персонажа не найден на карте.');
  return room;
}

function adjacentCorridorsOfRoom(state: GameState, roomId: RoomId) {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

/** Открыть/закрыть дверь: коридор рядом (или любой), дверь не разрушена. */
function toggleDoor(state: GameState, actorId: string, corridorId: string | undefined, adjacentOnly: boolean): void {
  const room = requireRoom(state, actorId);
  if (!corridorId) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран коридор с Дверью.');
  }
  const corridor = state.ship.corridors[corridorId];
  if (!corridor) throw new EngineError('UNKNOWN_CORRIDOR', 'Такого коридора нет на карте.');
  if (adjacentOnly && corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Дверь можно открыть/закрыть только в коридоре вашей комнаты.');
  }
  if (corridor.doorState === 'DESTROYED') {
    throw new EngineError('DOOR_DESTROYED', 'Эта Дверь уже разрушена — открывать и закрывать её нельзя.');
  }
  corridor.doorState = corridor.doorState === 'CLOSED' ? 'OPEN' : 'CLOSED';
}

/** «Почините/Повредите Двигатель» — только в Машинном Отсеке ENGINE_01..03. */
function toggleEngine(state: GameState, actorId: string): void {
  const room = requireRoom(state, actorId);
  const match = /^ENGINE_0([123])$/.exec(room.definitionId ?? '');
  if (!match) {
    throw new EngineError(
      'ENGINE_NOT_HERE',
      '«Починить/Повредить Двигатель» можно только в Машинном Отсеке (ENGINE_01–ENGINE_03).',
    );
  }
  const engineNumber = Number(match[1]) as 1 | 2 | 3;
  const engine = state.ship.engines[engineNumber];
  if (!engine) throw new EngineError('UNKNOWN_ENGINE', `Двигатель №${engineNumber} не найден.`);
  engine.isWorking = !engine.isWorking;
  appendGameLog(state, {
    type: 'ENGINE_TOGGLED',
    playerId: actorId,
    roomId: room.id,
    engineNumber,
    isWorking: engine.isWorking,
  });
}

/** Сброс маркера Неисправности из своей комнаты. */
function fixRoomMalfunction(state: GameState, actorId: string): void {
  const room = requireRoom(state, actorId);
  if (!room.hasMalfunction) {
    throw new EngineError('NO_MALFUNCTION', 'В вашем отсеке нет маркера Неисправности.');
  }
  room.hasMalfunction = false;
}

/** «Посмотрите оборот Неисследованной Комнаты»: информация — в журнал. */
function peekRoom(state: GameState, actorId: string, roomId: RoomId | undefined, withEffect: boolean): void {
  if (roomId === undefined) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран отсек для подглядывания.');
  }
  const room = state.ship.rooms[roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
  if (room.isExplored) {
    throw new EngineError('ROOM_ALREADY_EXPLORED', 'Этот отсек уже исследован — смотреть его оборот незачем.');
  }
  const roomName = `Отсек #${roomId}`;
  appendGameLog(state, {
    type: 'ROOM_PEEKED',
    playerId: actorId,
    roomId,
    roomName,
    effect: withEffect ? (room.explorationEffect as ExplorationEffect | null) : null,
    itemsCount: room.itemsCount,
    peekCount: 1,
  });
}

function weaponInHandSlots(state: GameState, actorId: string) {
  const player = requirePlayer(state, actorId);
  const slot = player.handSlots.find(
    (candidate): candidate is Extract<typeof candidate, { source: 'ITEM' }> =>
      candidate.source === 'ITEM' && candidate.card.isWeapon,
  );
  return slot?.card ?? null;
}

function energyWeaponInHandSlots(state: GameState, actorId: string) {
  const player = requirePlayer(state, actorId);
  const slot = player.handSlots.find(
    (candidate): candidate is Extract<typeof candidate, { source: 'ITEM' }> =>
      candidate.source === 'ITEM' && candidate.card.isWeapon && candidate.card.isEnergyWeapon === true,
  );
  return slot?.card ?? null;
}

/** Поиск по правилам отсека (карта «Поиск»): цвет задаёт отсек, без оплаты базового действия. */
function performRoomSearch(state: GameState, actorId: string, chosenDeckColor?: ItemDeckColor): void {
  const { roomId, color } = validateSearchConditions(state, actorId);
  const targetColor = color === 'WHITE' ? chosenDeckColor : color;
  if (color === 'WHITE' && !targetColor) {
    throw new EngineError('INVALID_DECISION_OPTION', 'В белом отсеке выберите цвет колоды Предметов.');
  }
  const drawn = drawSearchCards(state, targetColor!);
  if (drawn.length === 0) {
    throw new EngineError('NO_ITEMS_LEFT', `В колоде ${targetColor} не осталось карт Предметов.`);
  }
  if (drawn.length === 1) {
    const placed = placeItemToPlayer(state, actorId, drawn[0]!, roomId);
    if (!placed) return; // руки заняты — ждёт решение DISCARD_HEAVY
    finishSearch(state, actorId, roomId);
    return;
  }
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    cards: drawn,
    sourceDeck: targetColor!,
    roomId,
  };
}

/** «Мародерство»: счётчик предметов уменьшается даже на нуле, колода — на выбор. */
function performScavenge(state: GameState, actorId: string, chosenDeckColor?: ItemDeckColor): void {
  const room = requireRoom(state, actorId);
  if (!chosenDeckColor) {
    throw new EngineError('INVALID_DECISION_OPTION', '«Мародерство» требует выбрать цвет колоды Предметов.');
  }
  const drawn = drawSearchCards(state, chosenDeckColor);
  if (drawn.length === 0) {
    throw new EngineError('NO_ITEMS_LEFT', `В колоде ${chosenDeckColor} не осталось карт Предметов.`);
  }
  // «Уменьшите число предметов на 1 (даже если 0)» — счётчик уходит ниже нуля.
  room.itemsCount -= 1;
  if (drawn.length === 1) {
    const placed = placeItemToPlayer(state, actorId, drawn[0]!, room.id);
    if (!placed) return;
    appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: room.id });
    return;
  }
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    cards: drawn,
    sourceDeck: chosenDeckColor,
    roomId: room.id,
  };
  appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: room.id });
}

/** Все живые Персонажи в комнате добирают карту («Мотивация»). */
function motivateRoom(state: GameState, actorId: string): void {
  const room = requireRoom(state, actorId);
  const occupants = room.occupantPlayerIds.filter((id) => {
    const occupant = state.players[id];
    return occupant && !occupant.isDead && !occupant.hasEscapedInPod;
  });
  for (const occupantId of occupants) {
    const deck = state.players[occupantId]!.actionDeck;
    if (deck.drawPile.length === 0 && deck.discard.length === 0) continue;
    drawOneActionCard(state, occupantId);
  }
}

/** Перемещение через Технические Коридоры: без Шума, вскрытие срабатывает. */
function moveViaTechnicalCorridors(state: GameState, actorId: string, targetRoomId: RoomId | undefined): void {
  const player = requirePlayer(state, actorId);
  const room = requireRoom(state, actorId);
  if (!room.hasTechnicalCorridorEntrance) {
    throw new EngineError('NO_TECH_ENTRANCE', 'В вашем отсеке нет Входа в Технические Коридоры.');
  }
  if (targetRoomId === undefined) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран отсек назначения.');
  }
  const target = state.ship.rooms[targetRoomId];
  if (!target) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
  if (targetRoomId === room.id) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
  }
  if (!target.hasTechnicalCorridorEntrance) {
    throw new EngineError('NO_TECH_ENTRANCE', 'В отсеке назначения нет Входа в Технические Коридоры.');
  }
  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== actorId);
  target.occupantPlayerIds.push(actorId);
  player.roomId = targetRoomId;
  if (!target.isExplored) {
    state.interruptQueue.push({ type: 'EXPLORE_ROOM_INTERRUPT', playerId: actorId, roomId: targetRoomId, corridorId: '' });
  }
}

/** Приманка / Дымовая граната: Чужие из соседних комнат уходят в выбранную соседнюю. */
function herdIntruders(state: GameState, actorId: string, targetRoomId: RoomId | undefined): void {
  const room = requireRoom(state, actorId);
  if (targetRoomId === undefined) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран отсек, куда уходят Чужие.');
  }
  const target = state.ship.rooms[targetRoomId];
  if (!target) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
  const neighbours = adjacentCorridorsOfRoom(state, room.id).map((corridor) =>
    corridor.fromRoomId === room.id ? corridor.toRoomId : corridor.fromRoomId,
  );
  if (!neighbours.includes(targetRoomId)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Отсек должен быть соседним с вашей комнатой.');
  }
  const movingFrom = new Set<number>([...neighbours, room.id]);
  for (const token of [...state.intrudersPool.boardTokens]) {
    if (!movingFrom.has(token.roomId) || token.roomId === targetRoomId) continue;
    const from = state.ship.rooms[token.roomId];
    token.roomId = targetRoomId;
    if (from) from.occupantIntruderIds = from.occupantIntruderIds.filter((id) => id !== token.id);
    target.occupantIntruderIds.push(token.id);
  }
}

/** «Оценка угрозы»: верхняя карта Событий — оставить сверху или под низ. */
function threatAssessment(state: GameState, actorId: string, option: string | undefined): void {
  const room = requireRoom(state, actorId);
  if (!room.hasComputer) {
    throw new EngineError('NO_COMPUTER', '«Оценка угрозы» работает только в комнате с Компьютером.');
  }
  const pile = state.decks.events;
  if (pile.drawPile.length === 0 && pile.discard.length === 0) {
    throw new EngineError('CARD_SUPPLY_EXHAUSTED', 'Колода Событий пуста.');
  }
  if (pile.drawPile.length === 0) reshuffleDiscard(state, pile);
  const top = pile.drawPile[0]!;
  if (option === 'MOVE_BOTTOM') {
    pile.drawPile.shift();
    pile.drawPile.push(top);
  }
  appendGameLog(state, {
    type: 'EVENT_PEEKED',
    playerId: actorId,
    cardName: top.name,
    placed: option === 'MOVE_BOTTOM' ? 'BOTTOM' : 'TOP',
  });
}

function discardInventoryItem(state: GameState, actorId: string, itemId: string | undefined): ItemCard {
  const player = requirePlayer(state, actorId);
  if (!itemId) throw new EngineError('INVALID_DECISION_OPTION', 'Не выбран Предмет для сброса.');
  const index = player.inventory.findIndex((item) => item.id === itemId);
  if (index === -1) {
    throw new EngineError('NO_ITEMS_LEFT', 'Выбранный Предмет не найден в инвентаре.');
  }
  const [item] = player.inventory.splice(index, 1);
  return item!;
}

/* ------------------------------------------------------------------ */
/* Карты Действий                                                      */
/* ------------------------------------------------------------------ */

/**
 * Применяет эффект разыгранной карты Действия по `effect.kind`.
 * Карта уже списана с руки и оплачена; здесь — только эффект и его проверки.
 */
export function applyActionCardEffect(
  state: GameState,
  actorId: string,
  card: ActionCard,
  payload: Extract<EngineAction, { type: 'ACTION_PLAY_CARD' }>['payload'],
): void {
  switch (card.effect.kind) {
    case 'RELOAD': {
      const weapon = weaponInHandSlots(state, actorId);
      if (!weapon) {
        throw new EngineError('WEAPON_NOT_AVAILABLE', 'В слотах рук нет Оружия: нечего перезаряжать.');
      }
      if (weapon.ammo !== null && weapon.maxAmmo !== null && weapon.ammo >= weapon.maxAmmo) {
        throw new EngineError('WEAPON_FULL', `«${weapon.name}» уже заряжен полностью (${weapon.ammo}/${weapon.maxAmmo}).`);
      }
      if (weapon.ammo !== null) {
        weapon.ammo = Math.min(weapon.ammo + card.effect.ammoGain, weapon.maxAmmo ?? weapon.ammo + card.effect.ammoGain);
      }
      return;
    }
    case 'ORDER': {
      if (!payload.targetPlayerId) {
        throw new EngineError('INVALID_DECISION_OPTION', '«Приказ»: выберите Персонажа в вашей комнате.');
      }
      if (payload.targetPlayerId === actorId) {
        throw new EngineError('INVALID_DECISION_OPTION', '«Приказ» перемещает другого Персонажа, не вас.');
      }
      if (!payload.targetRoomId) {
        throw new EngineError('INVALID_DECISION_OPTION', '«Приказ»: выберите соседний отсек для перемещения.');
      }
      executeReposition(state, actorId, [{ playerId: payload.targetPlayerId, targetRoomId: payload.targetRoomId }], 1, '«Приказ»');
      return;
    }
    case 'MOTIVATION':
      motivateRoom(state, actorId);
      return;
    case 'BASIC_REPAIR':
    case 'REPAIR':
    case 'FAST_REPAIR': {
      if (payload.option === 'ENGINE') {
        toggleEngine(state, actorId);
        return;
      }
      fixRoomMalfunction(state, actorId);
      return;
    }
    case 'DISMISS':
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        '«Отставить» отменяет Действия других Игроков в вашей комнате — одновременные действия ещё не реализованы.',
      );
    case 'STEEL_NERVES':
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        '«Стальные нервы» сбрасываются во время Внезапной Атаки — карта сработает сама, когда Чужой атакует внезапно.',
      );
    case 'SEARCH':
      performRoomSearch(state, actorId, payload.targetDeckColor);
      return;
    case 'SCAVENGE':
      performScavenge(state, actorId, payload.targetDeckColor);
      return;
    case 'REST': {
      const player = requirePlayer(state, actorId);
      const contamination = player.actionDeck.hand.filter((entry) => !('characterClass' in entry));
      if (contamination.length === 0) {
        throw new EngineError('NO_CONTAMINATION', 'На руке нет карт Заражения — «Отдых» нечего сканировать.');
      }
      const nextHand: typeof player.actionDeck.hand = [];
      let infected = false;
      for (const entry of player.actionDeck.hand) {
        if (!('characterClass' in entry)) {
          entry.isScanned = true;
          if (entry.isInfected) {
            infected = true;
            nextHand.push(entry);
          }
          continue;
        }
        nextHand.push(entry);
      }
      player.actionDeck.hand = nextHand;
      if (infected) {
        // При Инфекции — возьмите Личинку (стр. 25); повторная Личинка
        // исчезает без гибели, оставляя карту Заражения (FAQ Rules 12).
        if (player.hasLarva) {
          receiveContamination(state, actorId);
        } else {
          player.hasLarva = true;
        }
      }
      return;
    }
    case 'DEMOLITION': {
      if (payload.option === 'MALFUNCTION') {
        const room = requireRoom(state, actorId);
        if (room.hasMalfunction) {
          throw new EngineError('MALFUNCTION_PRESENT', 'В вашем отсеке уже стоит маркер Неисправности.');
        }
        room.hasMalfunction = true;
        return;
      }
      const room = requireRoom(state, actorId);
      if (!payload.targetCorridorId) {
        throw new EngineError('INVALID_DECISION_OPTION', '«Разрушение»: выберите Дверь в коридоре вашей комнаты.');
      }
      const corridor = state.ship.corridors[payload.targetCorridorId];
      if (!corridor) throw new EngineError('UNKNOWN_CORRIDOR', 'Такого коридора нет на карте.');
      if (corridor.fromRoomId !== room.id && corridor.toRoomId !== room.id) {
        throw new EngineError('INVALID_DECISION_OPTION', 'Разрушить Дверь можно только в коридоре вашей комнаты.');
      }
      if (corridor.doorState === 'DESTROYED') {
        throw new EngineError('DOOR_DESTROYED', 'Эта Дверь уже разрушена.');
      }
      corridor.doorState = 'DESTROYED';
      return;
    }
    case 'SHIP_KNOWLEDGE': {
      if (payload.option === 'DOOR') {
        toggleDoor(state, actorId, payload.targetCorridorId, true);
        return;
      }
      peekRoom(state, actorId, payload.targetRoomId, true);
      return;
    }
    case 'COMPUTER_SKILLS': {
      if (payload.option === 'ROOM_ACTION') {
        throw new EngineError(
          'CARD_NOT_USABLE_NOW',
          'Бесплатные Действия комнат будут доступны на этапе комнат — сейчас используйте вариант с Дверью.',
        );
      }
      toggleDoor(state, actorId, payload.targetCorridorId, false);
      return;
    }
    case 'PILOTING':
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        '«Пилотирование» даёт бесплатное Действие комнаты или проверку Координат — механики появятся на этапе целей.',
      );
    case 'OLD_FRIEND':
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        '«Старый друг» даёт бесплатное Действие исправной комнаты без Компьютера — механика бесплатных действий ещё не реализована.',
      );
    case 'INTRANET':
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        '«Интранет» даёт бесплатное Действие другой комнаты с Компьютером — механика бесплатных действий ещё не реализована.',
      );
    case 'ACCESS_DENIED': {
      const room = requireRoom(state, actorId);
      if (!room.hasComputer) {
        throw new EngineError('NO_COMPUTER', '«Отказ в доступе» работает только в комнате с Компьютером.');
      }
      if (payload.option === 'ROOM_ACTION') {
        throw new EngineError(
          'CARD_NOT_USABLE_NOW',
          'Бесплатные Действия комнат будут доступны на этапе комнат — сейчас используйте маркер Неисправности.',
        );
      }
      const targetRoomId = payload.targetRoomId;
      if (targetRoomId === undefined) {
        throw new EngineError('INVALID_DECISION_OPTION', 'Выберите комнату с Компьютером для маркера Неисправности.');
      }
      const target = state.ship.rooms[targetRoomId];
      if (!target) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
      if (!target.hasComputer) {
        throw new EngineError('NO_COMPUTER', 'В выбранном отсеке нет Компьютера.');
      }
      if (target.hasMalfunction) {
        throw new EngineError('MALFUNCTION_PRESENT', 'В выбранном отсеке уже стоит маркер Неисправности.');
      }
      target.hasMalfunction = true;
      return;
    }
    case 'THREAT_ASSESSMENT':
      threatAssessment(state, actorId, payload.option);
      return;
    case 'TECH_CORRIDORS': {
      moveViaTechnicalCorridors(state, actorId, payload.targetRoomId);
      // «…и спасуйте»: Пас сразу после перемещения (стр. 24).
      performPass(state, actorId);
      return;
    }
    case 'RECONNAISSANCE': {
      const room = requireRoom(state, actorId);
      if (payload.targetRoomId === undefined) {
        throw new EngineError('INVALID_DECISION_OPTION', '«Разведка»: выберите соседний отсек.');
      }
      if (payload.targetRoomId === room.id) {
        throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
      }
      const path = requireOpenPath(state, room.id, payload.targetRoomId);
      movePlayer(state, actorId, payload.targetRoomId, path[0]!.id, { kind: 'NONE' });
      return;
    }
    case 'PYROTECHNIC': {
      const room = requireRoom(state, actorId);
      if (payload.option === 'EXTINGUISH') {
        if (!room.hasFire) {
          throw new EngineError('NO_FIRE', 'В вашем отсеке нет маркера Пожара.');
        }
        room.hasFire = false;
        return;
      }
      // Поместить маркер Пожара ценой сброса любого Предмета (стр. 24).
      discardInventoryItem(state, actorId, payload.targetItemId);
      if (room.hasFire) {
        throw new EngineError('FIRE_PRESENT', 'В вашем отсеке уже горит Пожар.');
      }
      room.hasFire = true;
      return;
    }
    case 'INGENUITY': {
      // «Смекалка»: Неисправность ИЛИ Двигатель ИЛИ Создание Предмета (стр. 24).
      if (payload.option === 'ENGINE') {
        toggleEngine(state, actorId);
        return;
      }
      if (payload.option === 'CRAFT') {
        throw new EngineError(
          'CARD_NOT_USABLE_NOW',
          'Создание Предмета картой выполняется базовым Действием [1] на панели инвентаря.',
        );
      }
      fixRoomMalfunction(state, actorId);
      return;
    }
    case 'SUPPRESSIVE_FIRE':
    case 'BURST_FIRE':
    case 'AIMED_FIRE':
    case 'ADRENALINE':
      // Боевые карты разбираются в executeCombatCard — сюда не доходят.
      throw new EngineError('INVALID_DECISION_OPTION', `Боевая карта «${card.name}» требует боевых параметров.`);
    default: {
      const unknownKind: never = card.effect;
      throw new EngineError(
        'ACTION_NOT_IMPLEMENTED',
        `Эффект карты «${card.name}» (kind: ${(unknownKind as { kind: string }).kind}) ещё не реализован.`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Предметы                                                            */
/* ------------------------------------------------------------------ */

/**
 * Применяет эффект Предмета по его печатному тексту (id-префиксы данных).
 * Предмет ещё не списан: одноразовость списывает вызывающий код.
 */
export function applyItemEffect(
  state: GameState,
  actorId: string,
  item: ItemCard,
  payload: Extract<EngineAction, { type: 'ACTION_USE_ITEM' }>['payload'],
): void {
  const id = item.id;

  if (id.includes('ENERGY_CHARGE')) {
    // «Полностью зарядите 1 Энергооружие ИЛИ Откройте/Закройте 1 Дверь в Коридоре вашей Комнаты».
    if (payload.option === 'DOOR') {
      toggleDoor(state, actorId, payload.targetCorridorId, true);
      return;
    }
    const weapon = energyWeaponInHandSlots(state, actorId);
    if (!weapon) {
      throw new EngineError('WEAPON_NOT_AVAILABLE', 'В слотах рук нет Энергооружия (стр. 22).');
    }
    if (weapon.maxAmmo !== null && (weapon.ammo ?? 0) >= weapon.maxAmmo) {
      throw new EngineError('WEAPON_FULL', `«${weapon.name}» уже заряжен полностью.`);
    }
    weapon.ammo = weapon.maxAmmo;
    return;
  }

  if (id.includes('EXTENDED_MAGAZINE')) {
    const weapon = energyWeaponInHandSlots(state, actorId);
    if (!weapon) {
      throw new EngineError('WEAPON_NOT_AVAILABLE', 'Магазин крепится к Энергооружию в слоте руки.');
    }
    weapon.ammo = (weapon.ammo ?? 0) + 2;
    weapon.maxAmmo = (weapon.maxAmmo ?? 0) + 2;
    return;
  }

  if (id.includes('GRENADE') && !id.includes('SMOKE')) {
    // «Выберите 1 Чужого в вашей или соседней Комнате: 2 Раны; все в этой комнате — 1 Рану».
    if (!payload.targetRoomId) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выберите комнату с Чужим для броска Гранаты.');
    }
    const target = state.ship.rooms[payload.targetRoomId];
    if (!target) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
    const playerRoom = requireRoom(state, actorId);
    if (payload.targetRoomId !== playerRoom.id) {
      const neighbours = adjacentCorridorsOfRoom(state, playerRoom.id).map((corridor) =>
        corridor.fromRoomId === playerRoom.id ? corridor.toRoomId : corridor.fromRoomId,
      );
      if (!neighbours.includes(payload.targetRoomId)) {
        throw new EngineError('INVALID_DECISION_OPTION', 'Гранату можно бросить только в свою или соседнюю комнату.');
      }
    }
    const intruderId = target.occupantIntruderIds[0];
    if (!intruderId) {
      throw new EngineError('UNKNOWN_INTRUDER', 'В выбранной комнате нет Чужого.');
    }
    const intruder = requireIntruder(state, intruderId);
    const result = checkInjuryResult(state, intruderId, intruder.type, 2, actorId);
    for (const occupantId of target.occupantPlayerIds) {
      const occupant = state.players[occupantId];
      if (!occupant || occupant.isDead) continue;
      sufferLightWounds(state, occupantId, 1);
    }
    if (result.killed) return;
    return;
  }

  if (id.includes('SMOKE_GRENADE') || id.includes('DECOY')) {
    herdIntruders(state, actorId, payload.targetRoomId);
    return;
  }

  if (id.includes('RECON_DRONE')) {
    peekRoom(state, actorId, payload.targetRoomId, true);
    return;
  }

  if (id.includes('MILITARY_STIMULANTS')) {
    // «Сбросьте с руки любое количество карт (включая Заражение) и возьмите то же количество + 1».
    const player = requirePlayer(state, actorId);
    const discardIds = payload.targetCardIds ?? [];
    if (discardIds.length === 0) {
      throw new EngineError(
        'INVALID_DECISION_OPTION',
        'Отметьте карты на панели руки, которые сбросите («Военные препараты»).',
      );
    }
    const unique = new Set(discardIds);
    const handCardIds = new Set(player.actionDeck.hand.map((card) => card.id));
    for (const cardId of discardIds) {
      if (!handCardIds.has(cardId)) {
        throw new EngineError('PAYMENT_CARD_NOT_IN_HAND', 'Одной из карт для сброса нет на руке.');
      }
    }
    const remaining: typeof player.actionDeck.hand = [];
    for (const card of player.actionDeck.hand) {
      if (unique.has(card.id)) player.actionDeck.discard.push(card);
      else remaining.push(card);
    }
    player.actionDeck.hand = remaining;
    for (let drawn = 0; drawn < discardIds.length + 1; drawn += 1) {
      const deck = player.actionDeck;
      if (deck.drawPile.length === 0 && (deck.discard.length === 0 || drawn > 0)) break;
      if (deck.drawPile.length === 0) reshuffleDiscard(state, deck);
      const card = deck.drawPile.shift();
      if (!card) break;
      deck.hand.push(card);
    }
    return;
  }

  if (id.includes('DUCT_TAPE')) {
    // «Сбросьте маркер Неисправности ИЛИ Почините/Повредите Двигатель ИЛИ соедините 2 Тяжёлых предмета».
    if (payload.option === 'ENGINE') {
      toggleEngine(state, actorId);
      return;
    }
    if (payload.option === 'COMBINE_HEAVY') {
      throw new EngineError(
        'CARD_NOT_USABLE_NOW',
        'Объединение тяжёлых предметов в один слот появится на этапе инвентаря.',
      );
    }
    fixRoomMalfunction(state, actorId);
    return;
  }

  if (id.includes('TOOLS')) {
    // «Сбросьте маркер Неисправности ИЛИ Почините/Повредите Двигатель ИЛИ Откройте/Закройте 1 Дверь».
    if (payload.option === 'ENGINE') {
      toggleEngine(state, actorId);
      return;
    }
    if (payload.option === 'DOOR') {
      toggleDoor(state, actorId, payload.targetCorridorId, false);
      return;
    }
    fixRoomMalfunction(state, actorId);
    return;
  }

  if (id.includes('FIRE_EXTINGUISHER')) {
    // «Сбросьте маркер Пожара из вашей Комнаты ИЛИ заставьте 1 Чужого Отступить».
    if (payload.option === 'RETREAT') {
      const room = requireRoom(state, actorId);
      const intruderId = room.occupantIntruderIds[0];
      if (!intruderId) {
        throw new EngineError('UNKNOWN_INTRUDER', 'В вашей комнате нет Чужого — заставить отступить некого.');
      }
      resolveIntruderRetreat(state, intruderId, null);
      return;
    }
    const room = requireRoom(state, actorId);
    if (!room.hasFire) {
      throw new EngineError('NO_FIRE', 'В вашем отсеке нет маркера Пожара.');
    }
    room.hasFire = false;
    return;
  }

  if (id.includes('TECH_CORRIDOR_PLANS')) {
    moveViaTechnicalCorridors(state, actorId, payload.targetRoomId);
    return;
  }

  if (id.includes('SPACE_SUIT')) {
    // «Если вы в Жёлтой Комнате, сбросьте все карты Действия с руки и переместитесь в любую другую Жёлтую».
    const player = requirePlayer(state, actorId);
    const room = requireRoom(state, actorId);
    if (getRoomDeckColor(room.definitionId) !== 'YELLOW') {
      throw new EngineError('WRONG_ROOM_COLOR', 'Скафандр работает только в Жёлтой комнате.');
    }
    if (payload.targetRoomId === undefined) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другую Жёлтую комнату.');
    }
    const target = state.ship.rooms[payload.targetRoomId];
    if (!target) throw new EngineError('UNKNOWN_ROOM', 'Такого отсека нет на карте.');
    if (getRoomDeckColor(target.definitionId) !== 'YELLOW') {
      throw new EngineError('WRONG_ROOM_COLOR', 'Отсек назначения не Жёлтый.');
    }
    if (target.id === room.id) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выберите другой отсек: вы уже в нём.');
    }
    const remaining: typeof player.actionDeck.hand = [];
    let discarded = 0;
    for (const card of player.actionDeck.hand) {
      if ('characterClass' in card) {
        player.actionDeck.discard.push(card);
        discarded += 1;
        continue;
      }
      remaining.push(card);
    }
    player.actionDeck.hand = remaining;
    room.occupantPlayerIds = room.occupantPlayerIds.filter((entry) => entry !== actorId);
    target.occupantPlayerIds.push(actorId);
    player.roomId = target.id;
    if (!target.isExplored) {
      state.interruptQueue.push({
        type: 'EXPLORE_ROOM_INTERRUPT',
        playerId: actorId,
        roomId: target.id,
        corridorId: '',
      });
    }
    appendGameLog(state, { type: 'ITEM_USED', playerId: actorId, itemId: item.id, itemName: item.name });
    appendGameLog(state, { type: 'PLAYER_PASSED', playerId: actorId, discardedCount: 0 });
    return;
  }

  if (id.includes('NEMESIS_PLANS')) {
    // «Посмотрите обороты 2 Неисследованных Комнат (не глядя на жетоны Исследования)».
    const first = payload.targetRoomId;
    if (first === undefined) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выберите первый отсек для подглядывания.');
    }
    peekRoom(state, actorId, first, false);
    if (payload.targetRoomId2 !== undefined && payload.targetRoomId2 !== first) {
      peekRoom(state, actorId, payload.targetRoomId2, false);
    }
    return;
  }

  if (id.includes('BANDAGES') || id.includes('MEDKIT')) {
    // Бинты: «Обработайте 1 Тяжёлую Травму ИЛИ вылечите все Лёгкие Травмы».
    // Аптечка: «…ИЛИ Вылечите 1 Обработанную Тяжёлую Травму».
    // Без явного варианта выбираем первую применимую цель: Тяжёлая → Лёгкие.
    const player = requirePlayer(state, actorId);
    if (payload.option === 'HEAL_TREATED') {
      const index = player.seriousWounds.findIndex((wound) => wound.isTreated);
      if (index === -1) {
        throw new EngineError('NO_WOUNDS', 'Обработанных Тяжёлых Травм нет — вылечивать нечего.');
      }
      const [healed] = player.seriousWounds.splice(index, 1);
      if (healed) state.decks.seriousWounds.discard.push({ ...healed, isTreated: true });
      return;
    }
    if (payload.option === 'HEAL_LIGHT') {
      if (player.lightWounds <= 0) {
        throw new EngineError('NO_WOUNDS', 'Лёгких Травм нет — лечить нечего.');
      }
      player.lightWounds = 0;
      return;
    }
    const untreated = player.seriousWounds.find((wound) => !wound.isTreated);
    if (untreated) {
      untreated.isTreated = true;
      return;
    }
    if (player.lightWounds > 0) {
      player.lightWounds = 0;
      return;
    }
    throw new EngineError('NO_WOUNDS', 'Травм нет — лечить нечего.');
  }

  if (id.includes('ALCOHOL')) {
    // «Просканируйте и удалите 1 карту Заражения с руки. Если была Инфекция, возьмите 1 карту Заражения».
    const player = requirePlayer(state, actorId);
    const index = player.actionDeck.hand.findIndex((card) => !('characterClass' in card));
    if (index === -1) {
      throw new EngineError('NO_CONTAMINATION', 'На руке нет карт Заражения.');
    }
    const [removed] = player.actionDeck.hand.splice(index, 1);
    if (!removed || 'characterClass' in removed) return;
    removed.isScanned = true;
    player.actionDeck.discard.push(removed);
    if (removed.isInfected) {
      // «Если была Инфекция, возьмите 1 карту Заражения» — из колоды Заражения.
      const fresh = state.decks.contamination.drawPile.shift();
      if (fresh) player.actionDeck.hand.push(fresh);
    }
    return;
  }

  if (id.includes('CLOTHES')) {
    // «Сбросьте маркер Слизи ИЛИ Обработайте 1 Тяжёлую Травму».
    // Без явного варианта сперва снимаем Слизь, иначе обрабатываем Травму.
    const player = requirePlayer(state, actorId);
    if (payload.option === 'TREAT_SERIOUS') {
      const untreated = player.seriousWounds.find((wound) => !wound.isTreated);
      if (!untreated) {
        throw new EngineError('NO_WOUNDS', 'Необработанных Тяжёлых Травм нет.');
      }
      untreated.isTreated = true;
      return;
    }
    if (player.hasSlime) {
      player.hasSlime = false;
      return;
    }
    const untreated = player.seriousWounds.find((wound) => !wound.isTreated);
    if (!untreated) {
      throw new EngineError('NO_SLIME', 'На планшете нет ни Слизи, необработанных Тяжёлых Травм тоже нет.');
    }
    untreated.isTreated = true;
    return;
  }

  if (id.includes('ADRENALINE')) {
    throw new EngineError(
      'CARD_NOT_USABLE_NOW',
      '«Инъекция адреналина» (безлимит Действий до Паса) появится на этапе боевой доработки.',
    );
  }

  if (id.includes('SYNTHETIC_FOOD')) {
    const player = requirePlayer(state, actorId);
    const deck = player.actionDeck;
    if (deck.drawPile.length === 0 && deck.discard.length === 0) {
      throw new EngineError('CARD_SUPPLY_EXHAUSTED', 'Колода Действий и сброс пусты — брать нечего.');
    }
    for (let drawn = 0; drawn < 2; drawn += 1) {
      if (deck.drawPile.length === 0) reshuffleDiscard(state, deck);
      const card = deck.drawPile.shift();
      if (!card) break;
      deck.hand.push(card);
    }
    return;
  }

  throw new EngineError(
    'CARD_NOT_USABLE_NOW',
    `Эффект Предмета «${item.name}» в этой версии ещё не реализован — карта показывается, но применять её некуда.`,
  );
}
