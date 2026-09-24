import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, INTRUDER_ATTACK_CARDS, type SanitizedGameState } from '@nemesis/shared';
import {
  ATTACK_DISCARD_FAN_SIZE,
  boardChangeKey,
  buildAttackAnatomy,
  buildIntruderBoardModel,
  filterBoardRooms,
  intruderSurvivalLabel,
  largestRemainderPercent,
  roomsWithinDistance,
} from './intruderBoardModel';

function makeView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('intruder-board-model'), 'player-1');
}

/** Полный состав коробки жетонов (INTRUDERS §3.1). */
const BOX_TOTAL = { BLANK: 1, LARVA: 8, CREEPER: 3, ADULT: 12, BREEDER: 2, QUEEN: 1 };

function pushLog(
  view: SanitizedGameState,
  sequence: number,
  event: Record<string, unknown>,
): void {
  view.gameLog.push({ id: `log-${sequence}`, sequence, event } as never);
}

describe('buildIntruderBoardModel: пул Чужих', () => {
  it('стартовые составы: мешок 11 жетонов, мешок + запас = полный состав коробки', () => {
    const model = buildIntruderBoardModel(makeView());

    expect(model.bagTotal).toBe(11);
    expect(model.bagByType).toEqual({ BLANK: 1, LARVA: 4, CREEPER: 1, ADULT: 4, BREEDER: 0, QUEEN: 1 });

    for (const type of Object.keys(BOX_TOTAL) as Array<keyof typeof BOX_TOTAL>) {
      expect(model.bagByType[type] + model.supplyByType[type]).toBe(BOX_TOTAL[type]);
    }
    expect(model.boxByType).toEqual({ LARVA: 0, CREEPER: 0, ADULT: 0, BREEDER: 0, QUEEN: 0 });
  });

  it('коробка: deadTokens сводятся по типам, Пустой в счёт классов не идёт', () => {
    const view = makeView();
    view.intrudersPool.deadTokens.push(
      { id: 't1', type: 'ADULT', escapeNumber: 2 },
      { id: 't2', type: 'ADULT', escapeNumber: 3 },
      { id: 't3', type: 'QUEEN', escapeNumber: 4 },
    );
    const model = buildIntruderBoardModel(view);
    expect(model.boxByType).toEqual({ LARVA: 0, CREEPER: 0, ADULT: 2, BREEDER: 0, QUEEN: 1 });
  });

  it('кладка, Первый Контакт: старт — 5 яиц, контакта не было', () => {
    const model = buildIntruderBoardModel(makeView());
    expect(model.eggsOnBoard).toBe(5);
    expect(model.firstEncounterOccurred).toBe(false);
  });

  it('Слабости: три слота с рубашками и привязкой к Объектам', () => {
    const model = buildIntruderBoardModel(makeView());
    expect(model.weaknesses).toHaveLength(3);
    expect(new Set(model.weaknesses.map((slot) => slot.objectKind))).toEqual(
      new Set(['CORPSE', 'EGG', 'INTRUDER_REMAINS']),
    );
    for (const slot of model.weaknesses) {
      expect(slot.visibility).toBe('FACE_DOWN');
      expect(slot.card).toBeNull();
    }
  });

  it('раскрытая Слабость отдаёт карту, рубашка — нет', () => {
    const view = makeView();
    const slots = view.intrudersPool.weaknessSlots;
    slots[0] = { ...slots[0]!, visibility: 'REVEALED', card: { id: 'WK_TEST', name: 'Тест', description: '', effect: 'VULNERABLE_SPOTS', isRevealed: true } } as never;
    const model = buildIntruderBoardModel(view);
    expect(model.weaknesses[0]!.visibility).toBe('REVEALED');
    expect(model.weaknesses[0]!.card?.name).toBe('Тест');
    expect(model.weaknesses[1]!.card).toBeNull();
  });
});

describe('шансы Развития Улья', () => {
  it('сумма процентов — ровно 100, порядок показа устойчив, нулевые типы скрыты', () => {
    const model = buildIntruderBoardModel(makeView());
    expect(model.drawChances.map((chance) => chance.type)).toEqual(['LARVA', 'CREEPER', 'ADULT', 'QUEEN', 'BLANK']);
    expect(model.drawChances.reduce((sum, chance) => sum + chance.percent, 0)).toBe(100);
    for (const chance of model.drawChances) {
      const exact = (chance.count * 100) / model.bagTotal;
      expect(chance.percent).toBeGreaterThanOrEqual(Math.floor(exact));
      expect(chance.percent).toBeLessThanOrEqual(Math.floor(exact) + 1);
    }
  });

  it('крупный тип не получает меньший процент', () => {
    const model = buildIntruderBoardModel(makeView());
    const adult = model.drawChances.find((chance) => chance.type === 'ADULT')!;
    const creeper = model.drawChances.find((chance) => chance.type === 'CREEPER')!;
    expect(adult.count).toBeGreaterThan(creeper.count);
    expect(adult.percent).toBeGreaterThanOrEqual(creeper.percent);
  });

  it('пустой мешок: все проценты 0 (Развитие Улья пропускается)', () => {
    const view = makeView();
    view.intrudersPool.bag = { BLANK: 0, LARVA: 0, CREEPER: 0, ADULT: 0, BREEDER: 0, QUEEN: 0 };
    const model = buildIntruderBoardModel(view);
    expect(model.bagTotal).toBe(0);
    expect(model.drawChances).toEqual([]);
  });
});

describe('largestRemainderPercent', () => {
  it('поровну поделённые типы получают 50/50', () => {
    const result = largestRemainderPercent([
      { type: 'ADULT', count: 2 },
      { type: 'LARVA', count: 2 },
    ]);
    expect(result.map((entry) => entry.percent)).toEqual([50, 50]);
  });

  it('дробные доли докидываются наибольшим остаткам (33/33/34)', () => {
    const result = largestRemainderPercent([
      { type: 'LARVA', count: 1 },
      { type: 'CREEPER', count: 1 },
      { type: 'ADULT', count: 1 },
    ]);
    expect(result.map((entry) => entry.percent).sort((a, b) => b - a)).toEqual([34, 33, 33]);
  });

  it('единственный тип — ровно 100', () => {
    const result = largestRemainderPercent([{ type: 'QUEEN', count: 3 }]);
    expect(result[0]!.percent).toBe(100);
  });
});

describe('анатомия колоды Атак', () => {
  it('чистая колода: все 20 карты могут выйти, разбивки согласованы', () => {
    const anatomy = buildAttackAnatomy(new Set());
    expect(anatomy.remainingCount).toBe(20);
    expect(anatomy.totalCount).toBe(20);
    expect(Object.values(anatomy.byEffect).reduce((sum, count) => sum + count, 0)).toBe(20);
    expect(Object.values(anatomy.byAttackerType).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
    // Состав из INTRUDERS §5: Царапина — 4 карты, Хвост — 2, Слизь — 1, Зов — 1.
    expect(anatomy.byEffect.SCRATCH).toBe(4);
    expect(anatomy.byEffect.TAIL_ATTACK).toBe(2);
    expect(anatomy.byEffect.SLIME).toBe(1);
    expect(anatomy.byEffect.CALL).toBe(1);
  });

  it('видимый сброс исключается по id', () => {
    const view = makeView();
    const scratch = INTRUDER_ATTACK_CARDS.find((card) => card.effect === 'SCRATCH')!;
    const bite = INTRUDER_ATTACK_CARDS.find((card) => card.effect === 'BITE')!;
    view.decks.intruderAttacks.discard.push(scratch, bite);
    const model = buildIntruderBoardModel(view);

    expect(model.attackDiscardCount).toBe(2);
    expect(model.attackDeckCount).toBe(20);
    expect(model.anatomy.remainingCount).toBe(18);
    expect(model.anatomy.byEffect.SCRATCH).toBe(3);
    expect(model.anatomy.byEffect.BITE).toBe(3);
  });

  it('веер сброса: не больше 8 карт, верх — последняя сброшенная', () => {
    const view = makeView();
    for (let i = 0; i < ATTACK_DISCARD_FAN_SIZE + 2; i += 1) {
      view.decks.intruderAttacks.discard.push(INTRUDER_ATTACK_CARDS[i % INTRUDER_ATTACK_CARDS.length]!);
    }
    const model = buildIntruderBoardModel(view);
    expect(model.attackDiscardTop).toHaveLength(ATTACK_DISCARD_FAN_SIZE);
    expect(model.attackDiscardTop[0]!.id).toBe(view.decks.intruderAttacks.discard.at(-1)!.id);
  });
});

describe('миниатюры на борту', () => {
  it('Чужой в комнате с Персонажем — Бой; типы в строке отсортированы', () => {
    const view = makeView();
    const playerRoomId = view.players['player-1']!.roomId;
    view.ship.rooms[playerRoomId]!.occupantIntruderIds.push('intr-1', 'intr-2');
    view.intrudersPool.boardTokens.push(
      { id: 'intr-1', type: 'ADULT', roomId: playerRoomId, woundsCount: 0 },
      { id: 'intr-2', type: 'LARVA', roomId: playerRoomId, woundsCount: 0 },
    );
    const model = buildIntruderBoardModel(view);

    expect(model.boardTotal).toBe(2);
    const row = model.boardByRoom.find((entry) => entry.roomId === playerRoomId)!;
    expect(row.inCombat).toBe(true);
    expect(row.tokens.map((token) => token.type)).toEqual(['LARVA', 'ADULT']);
    expect(row.tokens[1]!.typeName).toBe('Взрослая особь');
  });

  it('Чужой в комнате без Персонажей — не Бой; Пожар помечается', () => {
    const view = makeView();
    const targetRoom = Object.values(view.ship.rooms).find((room) => room.occupantPlayerIds.length === 0)!;
    const targetRoomId = targetRoom.id;
    view.ship.rooms[targetRoomId]!.occupantIntruderIds.push('intr-9');
    view.ship.rooms[targetRoomId]!.hasFire = true;
    view.intrudersPool.boardTokens.push({ id: 'intr-9', type: 'ADULT', roomId: targetRoomId, woundsCount: 2 });
    const model = buildIntruderBoardModel(view);

    const row = model.boardByRoom.find((entry) => entry.roomId === targetRoomId)!;
    expect(row.inCombat).toBe(false);
    expect(row.onFire).toBe(true);
    expect(row.tokens[0]!.wounds).toBe(2);
  });

  it('подавленная атака: бейдж с раундом из attackSuppression', () => {
    const view = makeView();
    view.intrudersPool.boardTokens.push({ id: 'intr-7', type: 'BREEDER', roomId: 3, woundsCount: 0 });
    view.intrudersPool.attackSuppression['intr-7'] = { round: 4, phase: 'EVENT_PHASE' };
    const model = buildIntruderBoardModel(view);

    const token = model.boardByRoom.flatMap((row) => row.tokens).find((entry) => entry.id === 'intr-7')!;
    expect(token.suppressed).toBe(true);
    expect(token.suppressedRound).toBe(4);
  });
});

describe('survivalLabel: честная оценка проверки Стойкости', () => {
  it('Личинка гибнет от одной раны без проверки', () => {
    expect(intruderSurvivalLabel('LARVA', 0)).toContain('1 Раны');
    expect(intruderSurvivalLabel('LARVA', 1)).toBe('Убита');
  });

  it('Крипер/Взрослая: стойкости карт 2..6 — границы 1 / 2 / 6 ран', () => {
    expect(intruderSurvivalLabel('ADULT', 1)).toContain('не убьёт');
    expect(intruderSurvivalLabel('CREEPER', 2)).toContain('может убить');
    expect(intruderSurvivalLabel('ADULT', 5)).toContain('может убить');
    expect(intruderSurvivalLabel('ADULT', 6)).toBe('Проверка убьёт');
  });

  it('Трутень/Королева: сумма двух карт 4..12 — границы 3 / 4 / 12 ран', () => {
    expect(intruderSurvivalLabel('QUEEN', 3)).toContain('не убьёт');
    expect(intruderSurvivalLabel('BREEDER', 4)).toContain('может убить');
    expect(intruderSurvivalLabel('QUEEN', 11)).toContain('может убить');
    expect(intruderSurvivalLabel('QUEEN', 12)).toBe('Проверка убьёт');
  });

  it('метка попадает в строку миниатюры', () => {
    const view = makeView();
    view.intrudersPool.boardTokens.push({ id: 'intr-3', type: 'ADULT', roomId: 5, woundsCount: 2 });
    const model = buildIntruderBoardModel(view);
    const token = model.boardByRoom[0]!.tokens[0]!;
    expect(token.survivalLabel).toBe(intruderSurvivalLabel('ADULT', 2));
  });
});

describe('roomsWithinDistance: BFS по открытым коридорам', () => {
  it('закрытые со всех сторон двери оставляют только стартовый отсек', () => {
    const view = makeView();
    const from = view.players['player-1']!.roomId;
    for (const corridor of Object.values(view.ship.corridors)) {
      if (corridor.doorState !== 'DESTROYED') corridor.doorState = 'CLOSED';
    }
    const reachable = roomsWithinDistance(view, from, 2);
    expect([...reachable]).toEqual([from]);
  });

  it('открытая дверь на шаге 1 добавляет соседний отсек', () => {
    const view = makeView();
    const from = view.players['player-1']!.roomId;
    const corridor = Object.values(view.ship.corridors).find(
      (entry) =>
        entry.doorState !== 'CLOSED' && (entry.fromRoomId === from || entry.toRoomId === from),
    )!;
    const neighbor = corridor.fromRoomId === from ? corridor.toRoomId : corridor.fromRoomId;

    const reachable = roomsWithinDistance(view, from, 1);
    expect(reachable.has(from)).toBe(true);
    expect(reachable.has(neighbor)).toBe(true);
  });

  it('закрытая дверь блокирует проход даже на два шага', () => {
    const view = makeView();
    const from = view.players['player-1']!.roomId;
    const corridor = Object.values(view.ship.corridors).find(
      (entry) => entry.fromRoomId === from || entry.toRoomId === from,
    )!;
    corridor.doorState = 'CLOSED';
    const neighbor = corridor.fromRoomId === from ? corridor.toRoomId : corridor.fromRoomId;

    expect(roomsWithinDistance(view, from, 2).has(neighbor)).toBe(false);
  });
});

describe('хроника улья и счётчики', () => {
  it('Контакты, гибель, яйцо и Развитие Улья попадают в хронику и счётчики', () => {
    const view = makeView();
    pushLog(view, 1, {
      type: 'CONTACT_OCCURRED',
      playerId: 'player-1',
      roomId: 3,
      tokenType: 'ADULT',
      escapeNumber: 2,
      handCount: 4,
      intruderId: 'intr-1',
      firstEncounter: true,
      surpriseAttack: false,
      source: 'NOISE',
    });
    pushLog(view, 2, {
      type: 'INTRUDER_KILLED',
      playerId: 'player-1',
      roomId: 3,
      targetIntruderId: 'intr-1',
      targetType: 'ADULT',
      remainsObjectId: 'obj-1',
    });
    pushLog(view, 3, {
      type: 'HIVE_DEVELOPMENT_RESOLVED',
      round: 2,
      tokenType: 'QUEEN',
      outcome: { kind: 'QUEEN', queenPlaced: false, intruderId: null, contactPlayerIds: [], eggAdded: true },
    });
    pushLog(view, 4, { type: 'EGG_DESTROYED_BY_FIRE', roomId: 3, objectId: 'egg-1' });

    const model = buildIntruderBoardModel(view);
    expect(model.counters.contacts).toBe(1);
    expect(model.counters.killed.ADULT).toBe(1);
    expect(model.counters.eggsAdded).toBe(1);
    expect(model.counters.eggsDestroyed).toBe(1);

    expect(model.chronicle.map((entry) => entry.kind)).toEqual(['CONTACT', 'KILL', 'HIVE', 'EGG_LOST']);
    expect(model.chronicle[0]!.tokenType).toBe('ADULT');
    expect(model.chronicle[0]!.text).toContain('Взрослая особь');
    expect(model.chronicle[0]!.text.length).toBeGreaterThan(0);
  });

  it('хроника ограничена последними записями', () => {
    const view = makeView();
    for (let i = 1; i <= 16; i += 1) {
      pushLog(view, i, {
        type: 'CONTACT_OCCURRED',
        playerId: 'player-1',
        roomId: 3,
        tokenType: 'LARVA',
        escapeNumber: 1,
        handCount: 4,
        intruderId: null,
        firstEncounter: false,
        surpriseAttack: false,
        source: 'NOISE',
      });
    }
    const model = buildIntruderBoardModel(view);
    expect(model.chronicle).toHaveLength(12);
    expect(model.chronicle[0]!.sequence).toBe(5);
    expect(model.chronicle.at(-1)!.sequence).toBe(16);
    expect(model.counters.contacts).toBe(16);
  });
});

describe('Улей и дельта-ключ', () => {
  it('Улей: пока тайл лежит лицом вниз — roomId null; после открытия считаются находящиеся', () => {
    const view = makeView();
    let model = buildIntruderBoardModel(view);
    expect(model.hive.roomId).toBeNull();
    expect(model.hive.explored).toBe(false);

    const hiveRoom = Object.values(view.ship.rooms).find((room) => room.occupantPlayerIds.length === 0)!;
    hiveRoom.definitionId = 'NEST';
    hiveRoom.isExplored = true;
    hiveRoom.occupantPlayerIds.push('player-1');
    hiveRoom.occupantIntruderIds.push('intr-5');
    view.intrudersPool.boardTokens.push({ id: 'intr-5', type: 'QUEEN', roomId: hiveRoom.id, woundsCount: 0 });

    model = buildIntruderBoardModel(view);
    expect(model.hive.roomId).toBe(hiveRoom.id);
    expect(model.hive.explored).toBe(true);
    expect(model.hive.playersInside).toBe(1);
    expect(model.hive.intrudersInside).toBe(1);
  });

  it('boardChangeKey детерминирован и реагирует на мешок, кладку и раны', () => {
    const view = makeView();
    const model = buildIntruderBoardModel(view);
    expect(boardChangeKey(model)).toBe(boardChangeKey(buildIntruderBoardModel(structuredClone(view))));

    const bagModel = buildIntruderBoardModel({
      ...structuredClone(view),
      intrudersPool: { ...structuredClone(view).intrudersPool, bag: { ...view.intrudersPool.bag, LARVA: 3 } },
    });
    expect(boardChangeKey(bagModel)).not.toBe(boardChangeKey(model));

    const eggView = structuredClone(view);
    eggView.intrudersPool.eggsOnBoard = 6;
    expect(boardChangeKey(buildIntruderBoardModel(eggView))).not.toBe(boardChangeKey(model));

    const woundView = structuredClone(view);
    woundView.intrudersPool.boardTokens.push({ id: 'intr-2', type: 'ADULT', roomId: 7, woundsCount: 1 });
    expect(boardChangeKey(buildIntruderBoardModel(woundView))).not.toBe(boardChangeKey(model));
  });

  it('модель не мутирует входное состояние', () => {
    const view = makeView();
    const before = JSON.stringify(view);

    function deepFreeze<T>(value: T): T {
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.values(value as Record<string, unknown>)) deepFreeze(key);
      }
      return value;
    }
    buildIntruderBoardModel(deepFreeze(structuredClone(view)));
    buildAttackAnatomy(new Set(view.decks.intruderAttacks.discard.map((card) => card.id)));
    roomsWithinDistance(view, view.players['player-1']!.roomId, 2);

    expect(JSON.stringify(view)).toBe(before);
  });
});

describe('фильтры «На борту» (filterBoardRooms)', () => {
  function setupBoard() {
    const view = makeView();
    const playerRoomId = view.players['player-1']!.roomId;
    // Бой у Персонажа
    view.ship.rooms[playerRoomId]!.occupantIntruderIds.push('intr-1');
    view.intrudersPool.boardTokens.push({ id: 'intr-1', type: 'ADULT', roomId: playerRoomId, woundsCount: 0 });
    // Дальний Чужой
    let farRoomId: number | null = null;
    for (const room of Object.values(view.ship.rooms)) {
      const neighborIds = Object.values(view.ship.corridors)
        .filter((c) => c.doorState !== 'CLOSED')
        .map((c) => (c.fromRoomId === playerRoomId ? c.toRoomId : c.toRoomId === playerRoomId ? c.fromRoomId : null))
        .filter((id): id is number => id !== null);
      if (!neighborIds.includes(room.id) && room.id !== playerRoomId && room.occupantPlayerIds.length === 0) {
        farRoomId = room.id;
        break;
      }
    }
    if (farRoomId !== null) {
      view.intrudersPool.boardTokens.push({ id: 'intr-2', type: 'QUEEN', roomId: farRoomId, woundsCount: 0 });
    }
    return { view, playerRoomId, farRoomId };
  }

  it('ALL — все отсеки с миниатюрами', () => {
    const { view } = setupBoard();
    const model = buildIntruderBoardModel(view);
    expect(filterBoardRooms(model, view, 'ALL')).toHaveLength(2);
  });

  it('COMBAT — только отсеки с Боем', () => {
    const { view, playerRoomId } = setupBoard();
    const model = buildIntruderBoardModel(view);
    const combat = filterBoardRooms(model, view, 'COMBAT');
    expect(combat).toHaveLength(1);
    expect(combat[0]!.roomId).toBe(playerRoomId);
    expect(combat[0]!.inCombat).toBe(true);
  });

  it('NEAR — отсеки в 2 шагах; дальняя Королева не попадает', () => {
    const { view, playerRoomId, farRoomId } = setupBoard();
    const model = buildIntruderBoardModel(view);
    const near = filterBoardRooms(model, view, 'NEAR');
    expect(near.map((row) => row.roomId)).toContain(playerRoomId);
    if (farRoomId !== null) {
      expect(near.map((row) => row.roomId)).not.toContain(farRoomId);
    }
  });
});
