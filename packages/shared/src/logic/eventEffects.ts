import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import type { EventCard } from '../types/cards.js';
import type { EventEffectOutcome } from '../types/log.js';
import type { RoomId, RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { drawFromStream, pickIndex, shuffle } from '../utils/rng.js';
import { drawSharedCard } from './cardPiles.js';
import { killPlayer, receiveContamination } from './characterDamage.js';
import { endGame } from './gameEnd.js';
import { appendGameLog } from './gameLog.js';
import { livingPlayersInRoom, placeIntruder, removeIntruder, returnTokenToBag } from './intruderPlacement.js';
import { placeFireMarker, placeMalfunctionMarker } from './markers.js';
import { requireNoiseMarkerSupply } from './noiseMarkers.js';
import { corridorNumbersOf, corridorsLeadingInto } from './shipGraphQueries.js';
import { allocateEntityId } from './stateIds.js';
import { getOrderedPlayers } from './turnCycle.js';

const ALL_ROOM_DEFINITIONS = [...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS];

function cardsRng(state: GameState): number {
  const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
  state.meta.rngDraws.cards += 1;
  return value;
}

/**
 * Судьба карты Событий после розыгрыша (стр. 10, `doc/data/EVENTS.md`):
 * карты с пометкой «Удалите карту, замешайте сброс» удаляются из игры, а
 * сброс замешивается под оставшуюся колоду через поток `cards`;
 * «Неисправность» замешивается обратно в колоду; остальные уходят
 * в публичный сброс.
 */
export function disposeEventCard(state: GameState, card: EventCard): void {
  const pile = state.decks.events;

  if (card.isDestroyedOnResolve) {
    if (pile.discard.length > 0) {
      const reshuffled = shuffle(() => cardsRng(state), pile.discard);
      pile.drawPile = [...pile.drawPile, ...reshuffled];
      pile.discard = [];
    }
    return;
  }

  if (card.isReshuffledIntoDeck) {
    const position = pickIndex(() => cardsRng(state), pile.drawPile.length + 1);
    pile.drawPile.splice(position, 0, card);
    return;
  }

  pile.discard.push(card);
}

/**
 * Текстовый эффект карты События (стр. 10, шаг 7): исполняется после
 * Движения Чужих. Каждый эффект завершается публичной записью
 * `EVENT_EFFECT_RESOLVED` с итогами для журнала.
 */
export function resolveEventCardEffect(state: GameState, card: EventCard): void {
  let outcome: EventEffectOutcome;
  switch (card.effect) {
    case 'HUNT':
      outcome = resolveHunt(state);
      break;
    case 'PROTECT_NEST':
      outcome = resolveProtectNest(state);
      break;
    case 'BROOD':
      outcome = resolveBrood(state);
      break;
    case 'REGENERATION':
      outcome = resolveRegeneration(state);
      break;
    case 'HIDDEN':
      outcome = resolveHidden(state);
      break;
    case 'MATURATION':
      outcome = resolveMaturation(state);
      break;
    case 'RAMPAGE':
      outcome = resolveMalfunctionRooms(state, roomsWithLargeIntruders(state), 'RAMPAGE');
      break;
    case 'PREPARATION':
      outcome = resolvePreparation(state);
      break;
    case 'PREY_SCENT':
      outcome = resolvePreyScent(state);
      break;
    case 'NOISE_TECH_CORRIDORS':
      outcome = resolveNoiseTechCorridors(state);
      break;
    case 'HIVE':
      outcome = resolveHiveNoise(state);
      break;
    case 'FLAMMABLE_MIXTURE':
      outcome = resolveFlammableMixture(state);
      break;
    case 'DESTRUCTIVE_FLAME':
      outcome = resolveDestructiveFlame(state);
      break;
    case 'ESCAPE_POD_EJECTION':
      outcome = resolveEscapePodEjection(state);
      break;
    case 'SHORT_CIRCUIT':
      outcome = resolveMalfunctionRooms(state, roomsOfColor(state, 'YELLOW', true), 'SHORT_CIRCUIT');
      break;
    case 'COOLANT_LEAK':
      outcome = resolveCoolantLeak(state);
      break;
    case 'LIFE_SUPPORT_MALFUNCTION':
      outcome = resolveMalfunctionRooms(state, roomsOfColor(state, 'GREEN', false), 'LIFE_SUPPORT_MALFUNCTION');
      break;
    case 'MALFUNCTION':
      outcome = resolveSingleMalfunction(state);
      break;
    case 'OPEN_COMPARTMENTS':
      outcome = resolveOpenCompartments(state);
      break;
  }

  appendGameLog(state, {
    type: 'EVENT_EFFECT_RESOLVED',
    round: state.meta.currentRound,
    cardId: card.id,
    effect: card.effect,
    outcome,
  });
}

function sortedRooms(state: GameState): RoomState[] {
  return Object.values(state.ship.rooms).sort((a, b) => a.id - b.id);
}

function definitionOf(room: RoomState) {
  return room.definitionId === null ? null : (ALL_ROOM_DEFINITIONS.find((def) => def.id === room.definitionId) ?? null);
}

function roomByDefinition(state: GameState, definitionId: string): RoomState | undefined {
  return sortedRooms(state).find((room) => room.definitionId === definitionId);
}

function roomsOfColor(state: GameState, color: string, requireComputer: boolean): RoomId[] {
  return sortedRooms(state)
    .filter((room) => {
      const definition = definitionOf(room);
      if (!definition || definition.color !== color) return false;
      return !requireComputer || definition.hasComputer;
    })
    .map((room) => room.id);
}

function roomsWithLargeIntruders(state: GameState): RoomId[] {
  const roomIds = new Set<RoomId>();
  for (const intruder of state.intrudersPool.boardTokens) {
    if (intruder.type === 'ADULT' || intruder.type === 'BREEDER' || intruder.type === 'QUEEN') {
      roomIds.add(intruder.roomId);
    }
  }
  return [...roomIds].sort((a, b) => a - b);
}

/** Не проходит через Закрытые Двери: огонь и преследователи их не минуют. */
function openNeighbourRoomIds(state: GameState, roomId: RoomId): RoomId[] {
  return corridorsLeadingInto(state, roomId)
    .filter((corridor) => corridor.doorState !== 'CLOSED')
    .map((corridor) => (corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId));
}

/** «Охота»: Взрослые вне Боя идут в соседний отсек с Персонажем, при выборе — меньший номер. */
function resolveHunt(state: GameState): EventEffectOutcome {
  const movedIntruderIds: string[] = [];

  for (const room of sortedRooms(state)) {
    if (livingPlayersInRoom(state, room.id).length > 0) continue;
    const intruderIds = [...room.occupantIntruderIds];

    for (const intruderId of intruderIds) {
      const intruder = state.intrudersPool.boardTokens.find((token) => token.id === intruderId);
      if (!intruder || intruder.type !== 'ADULT' || intruder.roomId !== room.id) continue;

      let bestCorridorId: string | null = null;
      let bestRoomId: RoomId | null = null;
      for (const corridor of corridorsLeadingInto(state, room.id)) {
        if (corridor.doorState === 'CLOSED') continue;
        const targetRoomId = corridor.fromRoomId === room.id ? corridor.toRoomId : corridor.fromRoomId;
        if (livingPlayersInRoom(state, targetRoomId).length === 0) continue;
        if (bestRoomId === null || targetRoomId < bestRoomId) {
          bestRoomId = targetRoomId;
          bestCorridorId = corridor.id;
        }
      }
      if (bestRoomId === null || bestCorridorId === null) continue;

      intruder.roomId = bestRoomId;
      room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruderId);
      state.ship.rooms[bestRoomId]!.occupantIntruderIds.push(intruderId);
      movedIntruderIds.push(intruderId);
      const corridor = state.ship.corridors[bestCorridorId]!;
      appendGameLog(state, {
        type: 'INTRUDER_MOVED',
        intruderId,
        intruderType: intruder.type,
        fromRoomId: room.id,
        toRoomId: bestRoomId,
        corridorId: bestCorridorId,
        corridorNumber: corridorNumbersOf(corridor, room.id)[0]!,
        technicalCorridors: false,
      });
    }
  }

  return { kind: 'HUNT', movedIntruderIds };
}

/** «Защита кладки»: Контакт для Персонажей в Улье и несущих Яйцо. */
function resolveProtectNest(state: GameState): EventEffectOutcome {
  const nest = roomByDefinition(state, 'NEST');
  const contactPlayerIds: string[] = [];

  for (const player of Object.values(state.players).sort((a, b) => a.orderNumber - b.orderNumber)) {
    if (player.isDead || player.isInHibernation || player.hasEscapedInPod) continue;
    const inNest = nest !== undefined && player.roomId === nest.id;
    const carriesEgg = player.handSlots.some((slot) => slot.source === 'OBJECT' && slot.object.kind === 'EGG');
    if (!inNest && !carriesEgg) continue;
    contactPlayerIds.push(player.id);
    state.interruptQueue.push({
      type: 'CONTACT_INTERRUPT',
      playerId: player.id,
      roomId: player.roomId,
      source: 'EVENT',
    });
  }

  return { kind: 'PROTECT_NEST', contactPlayerIds };
}

/** «Выводок»: Яйцо с Планшета, Заражение пусторуким в Улье, иначе Личинка в мешок. */
function resolveBrood(state: GameState): EventEffectOutcome {
  let eggDiscarded = false;
  if (state.intrudersPool.eggsOnBoard > 0) {
    state.intrudersPool.eggsOnBoard -= 1;
    eggDiscarded = true;
  }

  const infectedPlayerIds: string[] = [];
  const nest = roomByDefinition(state, 'NEST');
  if (nest) {
    for (const playerId of livingPlayersInRoom(state, nest.id)) {
      if (state.players[playerId]!.actionDeck.hand.length > 0) continue;
      receiveContamination(state, playerId);
      infectedPlayerIds.push(playerId);
    }
  }

  const larvaAddedToBag = infectedPlayerIds.length === 0 ? returnTokenToBag(state, 'LARVA') : false;
  return { kind: 'BROOD', eggDiscarded, infectedPlayerIds, larvaAddedToBag };
}

/** «Регенерация»: каждый Чужой на поле сбрасывает до 2 Ран. */
function resolveRegeneration(state: GameState): EventEffectOutcome {
  const healedIntruderIds: string[] = [];
  let woundsRemoved = 0;
  for (const intruder of state.intrudersPool.boardTokens) {
    const removed = Math.min(2, intruder.woundsCount);
    if (removed === 0) continue;
    intruder.woundsCount -= removed;
    woundsRemoved += removed;
    healedIntruderIds.push(intruder.id);
  }
  return { kind: 'REGENERATION', healedIntruderIds, woundsRemoved };
}

/** «Затаившиеся»: все Чужие вне Боя сняты с поля, их жетоны возвращаются в Пул. */
function resolveHidden(state: GameState): EventEffectOutcome {
  const withdrawnIntruderIds: string[] = [];
  for (const room of sortedRooms(state)) {
    if (livingPlayersInRoom(state, room.id).length > 0) continue;
    for (const intruderId of [...room.occupantIntruderIds]) {
      const intruder = state.intrudersPool.boardTokens.find((token) => token.id === intruderId);
      if (!intruder) continue;
      const intruderType = intruder.type;
      removeIntruder(state, intruderId);
      returnTokenToBag(state, intruderType);
      withdrawnIntruderIds.push(intruderId);
    }
  }
  return { kind: 'HIDDEN', withdrawnIntruderIds };
}

/**
 * «Созревание»: носители Личинки гибнут со спавном Крипера (стр. 21),
 * затем каждый выживший на борту тянет 4 карты Заражения — вытянувший
 * ИНФЕКЦИЮ получает Личинку; карты уходят в сброс колоды Заражения.
 */
function resolveMaturation(state: GameState): EventEffectOutcome {
  const deadPlayerIds: string[] = [];
  const creeperRoomIds: RoomId[] = [];

  for (const player of Object.values(state.players).sort((a, b) => a.orderNumber - b.orderNumber)) {
    if (!player.hasLarva || player.isDead || player.hasEscapedInPod) continue;
    const roomId = player.roomId;
    player.hasLarva = false;
    killPlayer(state, player.id);
    deadPlayerIds.push(player.id);
    placeIntruder(state, 'CREEPER', roomId);
    creeperRoomIds.push(roomId);
  }

  const scannedPlayerIds: string[] = [];
  const infectedPlayerIds: string[] = [];
  for (const player of Object.values(state.players).sort((a, b) => a.orderNumber - b.orderNumber)) {
    if (player.isDead || player.hasEscapedInPod) continue;
    scannedPlayerIds.push(player.id);
    const drawn = [0, 1, 2, 3].map(() => drawSharedCard(state, state.decks.contamination, 'Заражение'));
    if (drawn.some((card) => card.isInfected) && !player.hasLarva) {
      player.hasLarva = true;
      infectedPlayerIds.push(player.id);
    }
    state.decks.contamination.discard.push(...drawn);
  }

  return { kind: 'MATURATION', deadPlayerIds, creeperRoomIds, scannedPlayerIds, infectedPlayerIds };
}

/** Общее размещение Неисправностей: Разгром, Короткое замыкание, Жизнеобеспечение. */
function resolveMalfunctionRooms(
  state: GameState,
  roomIds: RoomId[],
  kind: 'RAMPAGE' | 'SHORT_CIRCUIT' | 'LIFE_SUPPORT_MALFUNCTION',
): EventEffectOutcome {
  const malfunctionRoomIds: RoomId[] = [];
  for (const roomId of roomIds) {
    const placement = placeMalfunctionMarker(state, roomId);
    if (placement === 'PLACED') malfunctionRoomIds.push(roomId);
    if (placement === 'HULL_BREACH') {
      endGame(state, 'HULL_BREACH');
      break;
    }
  }
  return { kind, malfunctionRoomIds };
}

/** «Подготовка»: Первый Игрок выбирает одну из трёх вытянутых карт для розыгрыша. */
function resolvePreparation(state: GameState): EventEffectOutcome {
  const cards = [0, 1, 2].map(() => drawSharedCard(state, state.decks.events, 'События'));
  const ordered = getOrderedPlayers(state);
  const decider = ordered.find((player) => player.id === state.meta.firstPlayerId) ?? ordered[0]!;
  state.pendingDecision = {
    id: allocateEntityId(state, 'event-card-choice'),
    playerId: decider.id,
    type: 'CHOOSE_EVENT_CARD',
    cards,
  };
  return { kind: 'PREPARATION', decisionPlayerId: decider.id };
}

function placeEventNoiseOnCorridor(state: GameState, roomId: RoomId, corridorId: string): void {
  requireNoiseMarkerSupply(state);
  state.ship.corridors[corridorId]!.hasNoise = true;
  appendGameLog(state, {
    type: 'NOISE_MARKER_PLACED',
    playerId: null,
    roomId,
    target: { kind: 'CORRIDOR', corridorId },
    reason: 'EVENT',
  });
}

/** «Запах добычи»: Шум во все пустые Коридоры отсеков, где есть Персонажи со Слизью. */
function resolvePreyScent(state: GameState): EventEffectOutcome {
  const slimeRoomIds = sortedRooms(state)
    .filter((room) => room.occupantPlayerIds.some((playerId) => state.players[playerId]?.hasSlime))
    .map((room) => room.id);

  const noiseCorridorIds: string[] = [];
  for (const roomId of slimeRoomIds) {
    for (const corridor of corridorsLeadingInto(state, roomId)) {
      if (corridor.hasNoise || noiseCorridorIds.includes(corridor.id)) continue;
      placeEventNoiseOnCorridor(state, roomId, corridor.id);
      noiseCorridorIds.push(corridor.id);
    }
  }
  return { kind: 'PREY_SCENT', noiseCorridorIds };
}

/** «Шум в тех. коридорах»: маркер на поле вентиляции либо броски Шума у входов. */
function resolveNoiseTechCorridors(state: GameState): EventEffectOutcome {
  if (!state.ship.technicalCorridorNoise) {
    requireNoiseMarkerSupply(state);
    state.ship.technicalCorridorNoise = true;
    return { kind: 'NOISE_TECH_CORRIDORS', markerPlaced: true, rolledPlayerIds: [] };
  }

  const rolledPlayerIds: string[] = [];
  for (const room of sortedRooms(state)) {
    if (!room.hasTechnicalCorridorEntrance) continue;
    for (const playerId of livingPlayersInRoom(state, room.id)) {
      rolledPlayerIds.push(playerId);
      state.interruptQueue.push({
        type: 'NOISE_ROLL_INTERRUPT',
        playerId,
        roomId: room.id,
        noise: { kind: 'ROLL' },
      });
    }
  }
  return { kind: 'NOISE_TECH_CORRIDORS', markerPlaced: false, rolledPlayerIds };
}

/** «Улей»: Шум во все пустые Коридоры вокруг исследованного Улья. */
function resolveHiveNoise(state: GameState): EventEffectOutcome {
  const nest = roomByDefinition(state, 'NEST');
  if (!nest || !nest.isExplored) {
    return { kind: 'HIVE', noiseCorridorIds: [], nestExplored: false };
  }

  const noiseCorridorIds: string[] = [];
  for (const corridor of corridorsLeadingInto(state, nest.id)) {
    if (corridor.hasNoise) continue;
    placeEventNoiseOnCorridor(state, nest.id, corridor.id);
    noiseCorridorIds.push(corridor.id);
  }
  return { kind: 'HIVE', noiseCorridorIds, nestExplored: true };
}

/** «Воспламеняемый раствор»: Пожар в Криогенный Отсек, при повторе — распространение. */
function resolveFlammableMixture(state: GameState): EventEffectOutcome {
  const cryo = roomByDefinition(state, 'HIBERNATORIUM');
  if (!cryo) return { kind: 'FLAMMABLE_MIXTURE', fireRoomIds: [], spread: false };

  if (!cryo.hasFire) {
    const placement = placeFireMarker(state, cryo.id);
    if (placement === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');
    return { kind: 'FLAMMABLE_MIXTURE', fireRoomIds: [cryo.id], spread: false };
  }

  const { placed, exploded } = spreadFireFrom(state, [cryo.id]);
  if (exploded) endGame(state, 'SHIP_EXPLODED');
  return { kind: 'FLAMMABLE_MIXTURE', fireRoomIds: placed, spread: true };
}

/** «Разрушающее пламя»: Неисправность в горящие отсеки и распространение огня. */
function resolveDestructiveFlame(state: GameState): EventEffectOutcome {
  const burningRoomIds = sortedRooms(state)
    .filter((room) => room.hasFire)
    .map((room) => room.id);

  const malfunctionRoomIds: RoomId[] = [];
  for (const roomId of burningRoomIds) {
    const placement = placeMalfunctionMarker(state, roomId);
    if (placement === 'PLACED') malfunctionRoomIds.push(roomId);
    if (placement === 'HULL_BREACH') {
      endGame(state, 'HULL_BREACH');
      return { kind: 'DESTRUCTIVE_FLAME', malfunctionRoomIds, fireRoomIds: [] };
    }
  }

  const { placed, exploded } = spreadFireFrom(state, burningRoomIds);
  if (exploded) endGame(state, 'SHIP_EXPLODED');
  return { kind: 'DESTRUCTIVE_FLAME', malfunctionRoomIds, fireRoomIds: placed };
}

/** Распространение огня по соседним отсекам: Закрытые Двери не пропускают огонь. */
function spreadFireFrom(state: GameState, roomIds: RoomId[]): { placed: RoomId[]; exploded: boolean } {
  const placed: RoomId[] = [];
  for (const roomId of roomIds) {
    for (const targetRoomId of openNeighbourRoomIds(state, roomId)) {
      const placement = placeFireMarker(state, targetRoomId);
      if (placement === 'PLACED') placed.push(targetRoomId);
      if (placement === 'SHIP_EXPLODED') return { placed, exploded: true };
    }
  }
  return { placed, exploded: false };
}

/** «Катапультирование капсулы»: уничтожение Капсулы с наименьшим номером. */
function resolveEscapePodEjection(state: GameState): EventEffectOutcome {
  const pods = Object.values(state.ship.escapePods).sort((a, b) => a.number - b.number);
  const pod = pods.find((candidate) => !candidate.isDestroyed);
  if (pod) pod.isDestroyed = true;
  return { kind: 'ESCAPE_POD_EJECTION', podId: pod?.id ?? null };
}

/** «Утечка охладителя»: неисправный Генератор взводит Самоуничтожение. */
function resolveCoolantLeak(state: GameState): EventEffectOutcome {
  const generator = roomByDefinition(state, 'GENERATOR');
  const started = generator !== undefined && generator.hasMalfunction && state.meta.selfDestructTrackPosition === null;
  if (started) state.meta.selfDestructTrackPosition = 0;
  return { kind: 'COOLANT_LEAK', selfDestructStarted: started };
}

/** «Неисправность»: маркер в исследованный отсек с наименьшим номером. */
function resolveSingleMalfunction(state: GameState): EventEffectOutcome {
  const target = sortedRooms(state).find((room) => room.isExplored);
  if (!target) return { kind: 'MALFUNCTION', targetRoomId: null };
  const placement = placeMalfunctionMarker(state, target.id);
  if (placement === 'HULL_BREACH') endGame(state, 'HULL_BREACH');
  return { kind: 'MALFUNCTION', targetRoomId: target.id };
}

/** «Открытие отсеков»: все Закрытые Двери становятся Открытыми, Разрушенные не трогаем. */
function resolveOpenCompartments(state: GameState): EventEffectOutcome {
  const openedCorridorIds: string[] = [];
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.doorState !== 'CLOSED') continue;
    corridor.doorState = 'OPEN';
    openedCorridorIds.push(corridor.id);
  }
  return { kind: 'OPEN_COMPARTMENTS', openedCorridorIds };
}
