import type { GameState, RoomState, RoomId, ExplorationToken } from '@nemesis/shared';
import { BASIC_ROOMS_1, ADDITIONAL_ROOMS_2, SHIP_ROOM_NODES, SHIP_CORRIDORS } from '@nemesis/shared';
import seedrandom from 'seedrandom';

export function createInitialGameState(seed = 'nemesis-default-seed'): GameState {
  const rng = seedrandom(seed);

  // 1. Перемешивание массива через сид
  function shuffle<T>(array: T[]): T[] {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = temp;
    }

    return arr;
  }

  // 2. Распределение комнат
  const shuffledRooms1 = shuffle(BASIC_ROOMS_1);
  const shuffledRooms2 = shuffle(ADDITIONAL_ROOMS_2).slice(0, 5);

  // Пул жетонов исследования (стр. 6 правил)
  const explorationPool: ExplorationToken[] = shuffle([
    { itemsCount: 4, effect: 'MALFUNCTION' },
    { itemsCount: 3, effect: 'FIRE' },
    { itemsCount: 3, effect: 'SLIME' },
    { itemsCount: 2, effect: 'SILENCE' },
    { itemsCount: 2, effect: 'DOORS' },
    { itemsCount: 2, effect: 'DANGER' },
    { itemsCount: 1, effect: 'MALFUNCTION' },
    { itemsCount: 1, effect: 'FIRE' },
    { itemsCount: 1, effect: 'SILENCE' },
    { itemsCount: 4, effect: 'DOORS' },
    { itemsCount: 2, effect: 'MALFUNCTION' },
    { itemsCount: 2, effect: 'FIRE' },
    { itemsCount: 3, effect: 'DANGER' },
    { itemsCount: 2, effect: 'SILENCE' },
    { itemsCount: 1, effect: 'DOORS' },
    { itemsCount: 1, effect: 'SLIME' },
  ]);

  const rooms: Record<RoomId, RoomState> = {} as Record<RoomId, RoomState>;

  let room1Idx = 0;
  let room2Idx = 0;
  let tokenIdx = 0;

  for (const node of SHIP_ROOM_NODES) {
    let definitionId: string | null = null;
    let isExplored = false;
    let itemsCount = 0;
    let hasComputer = false;

    if (node.category === 'SPECIAL') {
      isExplored = true;

      if (node.id === 1) definitionId = 'COCKPIT';
      else if (node.id === 11) definitionId = 'HIBERNATORIUM';
      else if (node.id === 19) definitionId = 'ENGINE_03';
      else if (node.id === 20) definitionId = 'ENGINE_02';
      else if (node.id === 21) definitionId = 'ENGINE_01';

      hasComputer = node.id === 1;
    } else if (node.category === 'ROOM_1') {
      const def = shuffledRooms1[room1Idx++]!;
      definitionId = def.id;
      hasComputer = def.hasComputer;
      itemsCount = explorationPool[tokenIdx++]?.itemsCount ?? 2;
    } else if (node.category === 'ROOM_2') {
      const def = shuffledRooms2[room2Idx++]!;
      definitionId = def.id;
      hasComputer = def.hasComputer;
      itemsCount = explorationPool[tokenIdx++]?.itemsCount ?? 2;
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
      hasSlime: false,
      hasDecompressionToken: false,

      // Источник истины: технический коридор существует
      // только при наличии реального номера входа.
      hasTechnicalCorridorEntrance: node.techNumbers.length > 0,

      occupantPlayerIds: node.id === 11 ? ['player-1'] : [],
      occupantIntruderIds: [],
      droppedObjectIds: node.id === 11 ? ['CORPSE_BLUE'] : [],
    };
  }

  // 3. Подготовка коридоров
  const corridors = SHIP_CORRIDORS.reduce(
    (acc, corridor) => {
      acc[corridor.id] = { ...corridor };
      return acc;
    },
    {} as GameState['ship']['corridors'],
  );

  return {
    meta: {
      seed,
      gameMode: 'SOLO',
      currentRound: 1,
      phase: 'PLAYER_PHASE',
      activePlayerId: 'player-1',
      firstPlayerId: 'player-1',
      timeTrackPosition: 0,
      selfDestructTrackPosition: null,
    },

    ship: {
      rooms,
      corridors,
      technicalCorridorNoise: false,

      engines: {
        1: {
          topWorking: rng() > 0.5,
          bottomWorking: rng() > 0.5,
        },
        2: {
          topWorking: rng() > 0.5,
          bottomWorking: rng() > 0.5,
        },
        3: {
          topWorking: rng() > 0.5,
          bottomWorking: rng() > 0.5,
        },
      },

      coordinates: {
        destination: 'EARTH',
        currentCourseMarker: 'B',
      },

      escapePods: {
        POD_A1: {
          id: 'POD_A1',
          section: 'A',
          isLocked: true,
          occupantIds: [],
        },
        POD_A2: {
          id: 'POD_A2',
          section: 'A',
          isLocked: true,
          occupantIds: [],
        },
        POD_B1: {
          id: 'POD_B1',
          section: 'B',
          isLocked: true,
          occupantIds: [],
        },
        POD_B2: {
          id: 'POD_B2',
          section: 'B',
          isLocked: true,
          occupantIds: [],
        },
      },
    },

    intrudersPool: {
      bag: [
        { id: 'blank', type: 'BLANK', escapeNumber: 0 },
        { id: 'larva-1', type: 'LARVA', escapeNumber: 1 },
        { id: 'larva-2', type: 'LARVA', escapeNumber: 1 },
        { id: 'larva-3', type: 'LARVA', escapeNumber: 1 },
        { id: 'larva-4', type: 'LARVA', escapeNumber: 1 },
        { id: 'creeper-1', type: 'CREEPER', escapeNumber: 1 },
        { id: 'queen-1', type: 'QUEEN', escapeNumber: 4 },
        { id: 'adult-1', type: 'ADULT', escapeNumber: 2 },
        { id: 'adult-2', type: 'ADULT', escapeNumber: 3 },
        { id: 'adult-3', type: 'ADULT', escapeNumber: 4 },
        { id: 'adult-4', type: 'ADULT', escapeNumber: 4 },
      ],
      boardEntities: [],
      deadEntities: [],
      eggsCountOnBoard: 5,
    },

    players: {
      'player-1': {
        id: 'player-1',
        name: 'Капитан',
        characterClass: 'CAPTAIN',
        orderNumber: 1,
        roomId: 11,
        handCardsCount: 5,
        lightWounds: 0,
        seriousWounds: [],
        hasSlime: false,
        hasSignalSent: false,
        isInHibernation: false,
        hasEscapedInPod: false,
        isDead: false,
        hasPassed: false,
        actionsPerformedThisRound: 0,
        inspectedEngines: [],
        inspectedCoordinates: false,
      },
    },

    claimsLog: [],
  };
}
