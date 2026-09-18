import { describe, expect, it } from 'vitest';

import * as core from './index.js';

/**
 * Контракт публичного API ядра.
 *
 * Пакет объявляет поле `exports` и собирается в dist, поэтому список
 * рантайм-экспортов — часть публичного контракта: его используют и клиент,
 * и будущий сервер. Типы в этот список не попадают (они стираются при сборке),
 * а потеря любой таблицы данных должна ловиться тестом, а не баг-репортом.
 */
const PUBLIC_RUNTIME_EXPORTS = [
  'ACTION_CARDS_BY_CHARACTER',
  'ADDITIONAL_ROOMS_2',
  'ADULT_ESCAPE_NUMBERS',
  'BAG_ADULTS_PER_PLAYER',
  'BAG_BASE_ADULT_COUNT',
  'BASE_ADULT_COUNT',
  'BASE_HAND_SIZE',
  'BASIC_ROOMS_1',
  'CABINS_HAND_SIZE',
  'CHARACTERS',
  'COMPONENT_FAMILY',
  'CONTAMINATION_CARDS',
  'CONTAMINATION_CARDS_COUNT',
  'CONTAMINATION_CARDS_INFECTED_COUNT',
  'COORDINATE_DESTINATIONS',
  'CORRIDOR_NUMBERS',
  'CRAFTED_ITEM_CARDS',
  'CRAFTING_RECIPES',
  'DEFAULT_SEED',
  'DOOR_STATES',
  'ESCAPE_POD_CAPACITY',
  'ESCAPE_POD_NUMBERS',
  'ESCAPE_PODS_BY_PLAYER_COUNT',
  'DOOR_TOKEN_SUPPLY',
  'ESCAPE_NUMBERS',
  'EXPLORATION_EFFECTS',
  'EXPLORATION_TOKENS',
  'EngineError',
  'FIRE_MARKER_SUPPLY',
  'GAME_STATE_SCHEMA_VERSION',
  'GREEN_ITEM_CARDS',
  'GameEngine',
  'HAND_SLOT_COUNT',
  'INTRUDER_SUPPLY_COMPOSITION',
  'MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS',
  'MALFUNCTION_MARKER_SUPPLY',
  'MAX_DOOR_TOKENS_PER_CORRIDOR',
  'MAX_FIRE_MARKERS_PER_ROOM',
  'MAX_MALFUNCTION_MARKERS_PER_ROOM',
  'MAX_NOISE_MARKERS_PER_CORRIDOR',
  'MAX_PLAYER_COUNT',
  'MIN_PLAYER_COUNT',
  'NOISE_DIE_FACES',
  'NOISE_MARKER_SUPPLY',
  'QUEST_ITEM_COUNT',
  'RED_ITEM_CARDS',
  'SERIOUS_WOUND_CARDS',
  'SHIP_CORRIDORS',
  'TIME_TRACK_LENGTH',
  'SHIP_ROOM_NODES',
  'SPECIAL_ROOMS',
  'STARTING_WEAPONS',
  'WEAKNESS_SLOT_COUNT',
  'WEAKNESS_SLOT_OBJECT_KINDS',
  'YELLOW_ITEM_CARDS',
  'RNG_STREAMS',
  'createActionDeckForCharacter',
  'createInitialDecks',
  'createRng',
  'createRngDraws',
  'createShuffledPile',
  'drawCardsToLimit',
  'drawFromStream',
  'drawSearchCards',
  'executeCardPayment',
  'executeRoomAbility',
  'findNextActivePlayer',
  'finishSearch',
  'getPlayerHandLimit',
  'getOrderedPlayers',
  'getRoomDeckColor',
  'isRngStream',
  'pickIndex',
  'placeItemToPlayer',
  'rollDie',
  'shuffle',
  'startNewRound',
  'streamSeed',
  'advanceTurn',
  'applyFireEndTurnEffect',
  'countFireMarkers',
  'countMalfunctionMarkers',
  'countPlacedNoiseMarkers',
  'createInitialGameState',
  'createIntruderSupply',
  'doorTokensInSupply',
  'doorTokensOnBoard',
  'drainInterrupts',
  'explorationTokenAt',
  'filterStateForPlayer',
  'findAdjacentOpenRoomIds',
  'findNoiseTarget',
  'fireMarkersInSupply',
  'malfunctionMarkersInSupply',
  'nextDoorState',
  'noiseMarkersInSupply',
  'placeDoorToken',
  'placeFireMarker',
  'placeMalfunctionMarker',
  'resolveInterrupt',
  'splitIntruderBag',
  'validatePayment',
  'validateSearchConditions',
];

describe('Публичное API ядра', () => {
  it('экспортирует через точку входа все таблицы данных', () => {
    expect(Object.keys(core).sort()).toEqual([...PUBLIC_RUNTIME_EXPORTS].sort());
  });

  it('отдаёт непустые данные по каждому экспорту', () => {
    expect(core.SHIP_ROOM_NODES.length).toBeGreaterThan(0);
    expect(core.SHIP_CORRIDORS.length).toBeGreaterThan(0);
    expect(core.BASIC_ROOMS_1.length).toBeGreaterThan(0);
    expect(core.ADDITIONAL_ROOMS_2.length).toBeGreaterThan(0);
    expect(core.SPECIAL_ROOMS.length).toBeGreaterThan(0);
    expect(core.CRAFTING_RECIPES.length).toBeGreaterThan(0);
  });

  it('объявляет версию контракта состояния', () => {
    expect(core.GAME_STATE_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });
});
