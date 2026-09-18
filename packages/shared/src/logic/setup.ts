import type { CharacterPreset } from '../data/setup.js';
import type { EscapePodState, PlayerState } from '../types/entities.js';
import type { ExplorationEffect, ExplorationToken, RoomId, RoomState } from '../types/rooms.js';
import type { GameMode, GameState } from '../types/state.js';
import { createActionDeckForCharacter, createInitialDecks } from '../data/cardsSetup.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
import { createIntruderSupply, splitIntruderBag } from '../data/intruderPool.js';
import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from '../data/shipGraph.js';
import {
  CHARACTERS,
  COORDINATE_DESTINATIONS,
  ESCAPE_PODS_BY_PLAYER_COUNT,
  ESCAPE_POD_NUMBERS,
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  QUEST_ITEM_COUNT,
  WEAKNESS_SLOT_OBJECT_KINDS,
} from '../data/setup.js';
import { GAME_STATE_SCHEMA_VERSION } from '../types/state.js';
import { createInitialGameLog } from './gameLog.js';
import { createRng, createRngDraws, shuffle } from '../utils/rng.js';

export const DEFAULT_SEED = 'nemesis-default-seed';

/** Отсек, в котором экипаж пробуждается от гибернации (стр. 8, шаг 20). */
const START_ROOM_ID: RoomId = 11;

/** Особые отсеки напечатаны на поле, поэтому всегда открыты (GDD §2.1, стр. 5). */
const SPECIAL_ROOM_DEFINITIONS: Record<number, string> = {
  1: 'COCKPIT',
  11: 'HIBERNATORIUM',
  19: 'ENGINE_03',
  20: 'ENGINE_02',
  21: 'ENGINE_01',
};

/** Синий жетон Трупа члена экипажа в Криогенном отсеке (стр. 8, шаг 20). */
const START_CORPSE_ID = 'CORPSE_BLUE';

/** Номера Машинных отсеков: каждому соответствует пара жетонов двигателя (стр. 6, шаг 8). */
const ENGINE_NUMBERS = [1, 2, 3] as const;

/**
 * Слоты Слабостей на Планшете Чужих: три карты из восьми, по одной на каждый
 * тип Объекта — Труп, Яйцо и Останки (стр. 6, шаг 9; стр. 21). Состав карт
 * появится вместе с данными о колодах, поэтому слоты создаются пустыми.
 */
function createWeaknessSlots(): GameState['intrudersPool']['weaknessSlots'] {
  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind) => ({ objectKind, card: null }));
}

/**
 * Спасательные отсеки: капсулы выкладываются Заблокированными стороной вверх,
 * капсула под наименьшим номером идёт в отсек «А», следующая — в «В»,
 * оставшиеся — поочерёдно (книга правил, стр. 6, шаг 7).
 */
function createEscapePods(playerCount: number, podNumbers: number[]): Record<string, EscapePodState> {
  const podCount = ESCAPE_PODS_BY_PLAYER_COUNT[playerCount] ?? ESCAPE_PODS_BY_PLAYER_COUNT[MIN_PLAYER_COUNT] ?? 2;
  const chosen = podNumbers.slice(0, podCount).sort((a, b) => a - b);

  return chosen.reduce<Record<string, EscapePodState>>((pods, number, index) => {
    const section = index % 2 === 0 ? 'A' : 'B';
    const id = `POD_${section}${number}`;

    pods[id] = { id, number, section, isLocked: true, occupantIds: [] };
    return pods;
  }, {});
}

function createPlayer(playerId: string, preset: CharacterPreset, orderNumber: number, seed: string): PlayerState {
  const actionDeckCards = createActionDeckForCharacter(preset.characterClass, seed, orderNumber);
  const startingWeapon = STARTING_WEAPONS[preset.characterClass];
  const handSlots = startingWeapon ? [{ source: 'ITEM' as const, card: startingWeapon }] : [];

  const initialHand = actionDeckCards.slice(0, 5);
  const initialDrawPile = actionDeckCards.slice(5);

  return {
    id: playerId,
    name: preset.name,
    characterClass: preset.characterClass,
    orderNumber,
    roomId: START_ROOM_ID,
    actionDeck: { drawPile: initialDrawPile, hand: initialHand, discard: [] },
    handSlots,
    inventory: [],
    questItems: Array.from({ length: QUEST_ITEM_COUNT }, (_, index) => ({
      id: `${playerId}-quest-${index + 1}`,
      name: `Квестовый предмет №${index + 1}`,
      isActivated: false,
    })),
    lightWounds: 0,
    seriousWounds: [],
    objectives: [],
    hasSlime: false,
    hasSignalSent: false,
    isInHibernation: false,
    hasEscapedInPod: false,
    isDead: false,
    hasPassed: false,
    actionsPerformedThisRound: 0,
    inspectedEngines: [],
    inspectedCoordinates: false,
  };
}

/**
 * Берёт жетон Исследования по порядку раздачи.
 *
 * На 16 неособых отсеков нужно 16 жетонов из пула в 20 (стр. 6, шаг 4).
 * Выход за пределы пула означает расхождение данных, а не штатную ситуацию:
 * партия должна упасть с понятной ошибкой вместо молчаливой подмены данных.
 */
export function explorationTokenAt(pool: ExplorationToken[], index: number): ExplorationToken {
  const token = pool[index];

  if (!token) {
    throw new Error(`Не хватает жетонов Исследования: нужен жетон №${index + 1}, а в пуле их ${pool.length}.`);
  }

  return token;
}

export interface InitialGameOptions {
  /** Число игроков: определяет состав мешка и число Спасательных Капсул. */
  playerCount?: number;
  /** Идентификатор партии; по умолчанию выводится из сида. */
  gameId?: string;
}

/** Базовая игра полукооперативная; режим Соло — партия на одного игрока (стр. 27). */
function resolveGameMode(playerCount: number): GameMode {
  return playerCount === MIN_PLAYER_COUNT ? 'SOLO' : 'SEMI_COOP';
}

/** Число игроков должно укладываться в отведённые партии границы: данные на это и рассчитаны. */
function validatePlayerCount(playerCount: number): number {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {
    throw new Error(
      `Недопустимое число игроков: ${playerCount}. Партия собирается на ${MIN_PLAYER_COUNT}–${MAX_PLAYER_COUNT} игроков.`,
    );
  }

  return playerCount;
}

/**
 * Создаёт партию по книге правил (стр. 6–8).
 *
 * Функция детерминирована: одинаковый сид даёт одинаковое состояние, включая
 * порядок обращения к генератору. Идентификатор партии выводится из сида, если
 * не передан явно, — это сохраняет воспроизводимость тестов.
 */
export function createInitialGameState(seed: string = DEFAULT_SEED, options: InitialGameOptions = {}): GameState {
  const playerCount = validatePlayerCount(options.playerCount ?? MIN_PLAYER_COUNT);
  // Поток `layout`: тайлы, жетоны Исследования, номера капсул и пункты
  // назначения тасуются одной последовательностью, отдельной от броском Шума и
  // колод (utils/rng.ts). Перемешивание — общее для проекта.
  const rng = createRng(seed, 'layout');

  const shuffledRooms1 = shuffle(rng, BASIC_ROOMS_1);
  const shuffledRooms2 = shuffle(rng, ADDITIONAL_ROOMS_2).slice(0, 5);
  // Жетонов в коробке 20 (стр. 3), неособых отсеков 16: тасуем весь пул и
  // раздаём по одному на отсек, оставшиеся 4 в партии не участвуют
  // (стр. 6, шаг 4).
  const explorationPool = shuffle(rng, EXPLORATION_TOKENS);
  const podNumbers = shuffle(rng, ESCAPE_POD_NUMBERS);
  const destinations = shuffle(rng, COORDINATE_DESTINATIONS);

  // Пул Чужих — 27 жетонов из коробки (стр. 3): мешок собирается по правилу
  // подготовки (стр. 6, шаг 10), остальные жетоны лежат рядом с полем и войдут
  // в игру позже. Мешок тасуется своим потоком (`bag`): порядок вытягивания
  // скрыт от игроков (санитайзер отдаёт наружу только состав), а посторонний
  // бросок в другом потоке этот порядок не сдвигает (utils/rng.ts).
  const { bag: bagTokens, supply: intruderSupply } = splitIntruderBag(createIntruderSupply(), playerCount);
  const intruderBag = shuffle(createRng(seed, 'bag'), bagTokens);

  const playerIds = Array.from({ length: playerCount }, (_, index) => `player-${index + 1}`);
  const players = playerIds.reduce<Record<string, PlayerState>>((acc, playerId, index) => {
    acc[playerId] = createPlayer(playerId, CHARACTERS[index] ?? CHARACTERS[0]!, index + 1, seed);
    return acc;
  }, {});

  const rooms: Record<RoomId, RoomState> = {} as Record<RoomId, RoomState>;

  let room1Idx = 0;
  let room2Idx = 0;
  let tokenIdx = 0;

  /**
   * Жетоны Исследования выкладываются на все неособые отсеки без остатка
   * (стр. 6, шаг 4). Число предметов и особый эффект едут вместе: эффект
   * разыгрывается при вскрытии тайла (стр. 14–15), поэтому отсек хранит оба.
   */
  function drawExplorationToken(): ExplorationToken {
    return explorationTokenAt(explorationPool, tokenIdx++);
  }

  for (const node of SHIP_ROOM_NODES) {
    let definitionId: string | null = null;
    let isExplored = false;
    let itemsCount = 0;
    let hasComputer = false;
    let explorationEffect: ExplorationEffect | null = null;

    if (node.category === 'SPECIAL') {
      isExplored = true;
      definitionId = SPECIAL_ROOM_DEFINITIONS[node.id] ?? null;
      hasComputer = node.id === 1;
    } else if (node.category === 'ROOM_1') {
      const def = shuffledRooms1[room1Idx++]!;
      const token = drawExplorationToken();

      definitionId = def.id;
      hasComputer = def.hasComputer;
      itemsCount = token.itemsCount;
      explorationEffect = token.effect;
    } else if (node.category === 'ROOM_2') {
      const def = shuffledRooms2[room2Idx++]!;
      const token = drawExplorationToken();

      definitionId = def.id;
      hasComputer = def.hasComputer;
      itemsCount = token.itemsCount;
      explorationEffect = token.effect;
    }

    rooms[node.id] = {
      id: node.id,
      definitionId,
      category: node.category,
      isExplored,
      itemsCount: isExplored ? 0 : itemsCount,
      hasComputer,
      hasFire: false,
      hasMalfunction: false,
      hasDecompressionToken: false,

      // Источник истины: технический коридор существует
      // только при наличии реального номера входа.
      hasTechnicalCorridorEntrance: node.techNumbers.length > 0,

      occupantPlayerIds: node.id === START_ROOM_ID ? [...playerIds] : [],
      occupantIntruderIds: [],
      objects: node.id === START_ROOM_ID ? [{ id: START_CORPSE_ID, kind: 'CORPSE', characterClass: null }] : [],

      // У особых отсеков жетона Исследования нет: они напечатаны на поле
      // и считаются исследованными с начала партии (стр. 26).
      explorationEffect: isExplored ? null : explorationEffect,
    };
  }

  const corridors = SHIP_CORRIDORS.reduce(
    (acc, corridor) => {
      acc[corridor.id] = { ...corridor };
      return acc;
    },
    {} as GameState['ship']['corridors'],
  );

  // Каждый Машинный отсек получает пару жетонов: один Исправный, один
  // Неисправный. Верхний показывает истину, поэтому храним один флаг (стр. 26).
  const engines = ENGINE_NUMBERS.reduce(
    (acc, engineNumber) => {
      acc[engineNumber] = { isWorking: rng() > 0.5 };
      return acc;
    },
    {} as GameState['ship']['engines'],
  );

  return {
    meta: {
      schemaVersion: GAME_STATE_SCHEMA_VERSION,
      gameId: options.gameId ?? `game-${seed}`,
      seed,
      gameMode: resolveGameMode(playerCount),
      currentRound: 1,
      phase: 'PLAYER_PHASE',
      activePlayerId: playerIds[0]!,
      firstPlayerId: playerIds[0]!,
      timeTrackPosition: 0,
      selfDestructTrackPosition: null,

      // Счётчики потоков случайности начинают с нуля: расклад уже прочитал
      // `layout`, но он читается только при подготовке стола, поэтому
      // восстановление партии идёт от мастер-сида (utils/rng.ts).
      rngDraws: createRngDraws(),
      gameOverReason: null,
    },

    ship: {
      rooms,
      corridors,
      technicalCorridorNoise: false,
      engines,
      coordinates: {
        // Случайная карта Координат из пула (стр. 6, шаг 5).
        destination: destinations[0] ?? 'EARTH',
        currentCourseMarker: 'B',
      },
      escapePods: createEscapePods(playerCount, podNumbers),
    },

    intrudersPool: {
      bag: intruderBag,
      supply: intruderSupply,
      boardTokens: [],
      deadTokens: [],
      eggsOnBoard: 5,
      weaknessSlots: createWeaknessSlots(),
    },

    decks: createInitialDecks(seed),

    players,

    claimsLog: [],
    gameLog: createInitialGameLog(),
    interruptQueue: [],
    pendingDecision: null,
  };
}
