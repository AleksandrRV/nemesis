import { describe, expect, it } from 'vitest';
import { contactState, expectEngineError } from '../testing/contactFixtures.js';
import { activate, giveQuest, item, payment, setRoom, useQuestItem } from '../testing/questFixtures.js';
import type { ActionCard, ItemCard, ObjectiveCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { questDefinition, questItemCardId } from '../data/questItems.js';
import { RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import { CORPORATE_OBJECTIVE_CARDS, PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { GameEngine } from './fsm.js';

function giveObjectives(state: GameState, playerId: string): ObjectiveCard[] {
  const objectives: ObjectiveCard[] = [
    { ...PERSONAL_OBJECTIVE_CARDS[0]!, id: `${playerId}-personal`, name: 'Личная Цель' },
    { ...CORPORATE_OBJECTIVE_CARDS[0]!, id: `${playerId}-corporate`, name: 'Корпоративная Цель' },
  ];
  state.players[playerId]!.objectives = objectives;
  return objectives;
}

function computerRoom(state: GameState, hasMalfunction = false): void {
  const room = state.ship.rooms[state.players['player-1']!.roomId]!;
  room.hasComputer = true;
  room.hasMalfunction = hasMalfunction;
}

function faceDownEggWeakness(state: GameState): void {
  state.intrudersPool.weaknessSlots = [
    { objectKind: 'EGG', card: { ...structuredClone(WEAKNESS_CARDS[0]!), isRevealed: false } },
  ];
}

function inventoryIds(state: GameState): string[] {
  return state.players['player-1']!.inventory.map((entry) => entry.id);
}

describe('Бортовой журнал (квест Капитана, cards_additional.pdf стр. 15–18)', () => {
  it('в Комнате с Компьютером показывает Цели любого Персонажа и сбрасывается', () => {
    const state = contactState(2, 'ship-log');
    const questId = giveQuest(state, 'SHIP_LOG', true);
    computerRoom(state);
    giveObjectives(state, 'player-2');

    const next = useQuestItem(state, questId, { targetPlayerId: 'player-2' });

    expect(next.gameLog.at(-1)?.event).toMatchObject({
      type: 'OBJECTIVE_PEEKED',
      source: 'SHIP_LOG',
      targetPlayerId: 'player-2',
      objectiveNames: ['Личная Цель', 'Корпоративная Цель'],
    });
    expect(inventoryIds(next)).not.toContain(questItemCardId(questId));
  });

  it('без маркера Сигнала у цели тоже работает, в отличие от Ключа связи', () => {
    const state = contactState(2, 'ship-log-signal');
    const questId = giveQuest(state, 'SHIP_LOG', true);
    computerRoom(state);
    giveObjectives(state, 'player-2');
    state.players['player-2']!.hasSignalSent = false;

    expect(useQuestItem(state, questId, { targetPlayerId: 'player-2' }).gameLog.at(-1)?.event).toMatchObject({
      type: 'OBJECTIVE_PEEKED',
    });
  });

  it('без Компьютера, в Неисправной Комнате и без цели — отказ', () => {
    const state = contactState(2, 'ship-log-refusals');
    const questId = giveQuest(state, 'SHIP_LOG', true);
    giveObjectives(state, 'player-2');
    state.ship.rooms[state.players['player-1']!.roomId]!.hasComputer = false;
    expectEngineError(
      () => useQuestItem(structuredClone(state), questId, { targetPlayerId: 'player-2' }),
      'NO_COMPUTER',
    );

    computerRoom(state, true);
    expectEngineError(
      () => useQuestItem(structuredClone(state), questId, { targetPlayerId: 'player-2' }),
      'NO_COMPUTER',
    );

    computerRoom(state);
    expectEngineError(() => useQuestItem(structuredClone(state), questId, {}), 'INVALID_DECISION_OPTION');
    state.players['player-2']!.isDead = true;
    expectEngineError(
      () => useQuestItem(structuredClone(state), questId, { targetPlayerId: 'player-2' }),
      'INVALID_DECISION_OPTION',
    );
  });
});

describe('Лабораторное оборудование (квест Учёного)', () => {
  it('изучает Слабость Объекта в Комнате Персонажа и сбрасывается', () => {
    const state = contactState(2, 'lab-equipment');
    const questId = giveQuest(state, 'LAB_EQUIPMENT', true);
    faceDownEggWeakness(state);
    state.ship.rooms[state.players['player-1']!.roomId]!.objects.push({ id: 'egg-lab', kind: 'EGG' });

    const next = useQuestItem(state, questId, { targetObjectKind: 'EGG' });

    expect(next.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
    expect(inventoryIds(next)).not.toContain(questItemCardId(questId));
  });

  it('работает вне Лаборатории, но без Объекта или с уже изученной Слабостью — отказ', () => {
    const state = contactState(2, 'lab-equipment-refusals');
    const questId = giveQuest(state, 'LAB_EQUIPMENT', true);
    faceDownEggWeakness(state);
    setRoom(state, 'STORAGE');
    expectEngineError(() => useQuestItem(structuredClone(state), questId, {}), 'CARD_NOT_USABLE_NOW');
    expectEngineError(
      () => useQuestItem(structuredClone(state), questId, { targetObjectKind: 'EGG' }),
      'CARD_NOT_USABLE_NOW',
    );

    state.ship.rooms[state.players['player-1']!.roomId]!.objects.push({ id: 'egg-lab', kind: 'EGG' });
    state.intrudersPool.weaknessSlots[0]!.card!.isRevealed = true;
    expectEngineError(() => useQuestItem(state, questId, { targetObjectKind: 'EGG' }), 'WEAKNESS_ALREADY_REVEALED');
  });
});

describe('Ключ безопасности: выбор, какие Двери Закрыть, а какие Открыть', () => {
  function doorsOf(state: GameState, roomId: number) {
    return Object.values(state.ship.corridors).filter(
      (corridor) =>
        (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) && corridor.doorState !== 'DESTROYED',
    );
  }

  it('перечисленные Двери Закрываются, остальные Открываются', () => {
    const state = contactState(2, 'security-choice');
    const questId = giveQuest(state, 'SECURITY_KEY', true);
    const roomId = state.players['player-1']!.roomId;
    const [first, ...rest] = doorsOf(state, roomId);
    for (const corridor of rest) corridor.doorState = 'CLOSED';

    const next = useQuestItem(state, questId, { targetRoomId: roomId, closedCorridorIds: [first!.id] });

    expect(next.ship.corridors[first!.id]!.doorState).toBe('CLOSED');
    for (const corridor of rest) expect(next.ship.corridors[corridor.id]!.doorState).toBe('OPEN');
    expect(inventoryIds(next)).not.toContain(questItemCardId(questId));
  });

  it('пустой список Открывает все Двери, чужая Дверь в списке — отказ', () => {
    const state = contactState(2, 'security-open');
    const questId = giveQuest(state, 'SECURITY_KEY', true);
    const roomId = state.players['player-1']!.roomId;
    for (const corridor of doorsOf(state, roomId)) corridor.doorState = 'CLOSED';
    const foreign = Object.values(state.ship.corridors).find(
      (corridor) => corridor.fromRoomId !== roomId && corridor.toRoomId !== roomId,
    )!;
    expectEngineError(
      () => useQuestItem(structuredClone(state), questId, { targetRoomId: roomId, closedCorridorIds: [foreign.id] }),
      'INVALID_DECISION_OPTION',
    );

    const next = useQuestItem(state, questId, { targetRoomId: roomId, closedCorridorIds: [] });

    expect(doorsOf(next, roomId).every((corridor) => corridor.doorState === 'OPEN')).toBe(true);
  });
});

describe('Автозарядчик: Энергозаряд для Боевой винтовки стоит 0', () => {
  function soldierWithCharge(seed: string): { state: GameState; charge: ItemCard } {
    const state = contactState(2, seed);
    const rifle = { ...structuredClone(STARTING_WEAPONS.SOLDIER), ammo: 1 };
    const charge = item('ITEM_RED_ENERGY_CHARGE_', RED_ITEM_CARDS);
    state.players['player-1']!.handSlots = [{ source: 'ITEM', card: rifle }];
    state.players['player-1']!.inventory.push(charge);
    return { state, charge };
  }

  function charge(state: GameState, chargeId: string, discardCardIds: string[], option = 'CHARGE'): GameState {
    return new GameEngine().processAction(state, {
      type: 'ACTION_USE_ITEM',
      payload: { itemId: chargeId, discardCardIds, option },
    });
  }

  it('с Автозарядчиком Боевая винтовка заряжается без сброса карт', () => {
    const { state, charge: energy } = soldierWithCharge('autoloader-free');
    giveQuest(state, 'AUTOLOADER', true);
    const handBefore = state.players['player-1']!.actionDeck.hand.length;

    const next = charge(state, energy.id, []);

    expect(next.players['player-1']!.handSlots[0]).toMatchObject({ card: { ammo: 5 } });
    expect(next.players['player-1']!.actionDeck.hand).toHaveLength(handBefore);
  });

  it('без Автозарядчика и для варианта с Дверью цена прежняя — 1 карта', () => {
    const { state, charge: energy } = soldierWithCharge('autoloader-paid');
    expectEngineError(() => charge(structuredClone(state), energy.id, []), 'INSUFFICIENT_ACTION_CARDS');

    giveQuest(state, 'AUTOLOADER', true);
    const roomId = state.players['player-1']!.roomId;
    const door = Object.values(state.ship.corridors).find(
      (corridor) => (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) && corridor.doorState === 'OPEN',
    )!;
    expectEngineError(
      () =>
        new GameEngine().processAction(structuredClone(state), {
          type: 'ACTION_USE_ITEM',
          payload: { itemId: energy.id, discardCardIds: [], option: 'DOOR', targetCorridorId: door.id },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
  });

  it('активация Автозарядчика прибавляет 1 к максимальному Боезапасу Боевой винтовки', () => {
    const { state } = soldierWithCharge('autoloader-activation');
    const questId = giveQuest(state, 'AUTOLOADER');
    setRoom(state, 'ARMORY');

    const next = activate(state, questId);

    expect(next.players['player-1']!.handSlots[0]).toMatchObject({ card: { maxAmmo: 6 } });
  });
});

describe('Тяжёлые Квестовые Предметы: Голографический компьютер', () => {
  it('Голографический компьютер при активации занимает слот руки', () => {
    const state = contactState(2, 'holo-heavy');
    const questId = giveQuest(state, 'HOLO_COMPUTER');
    setRoom(state, 'GENERATOR');
    state.players['player-1']!.handSlots = [];

    const next = activate(state, questId);

    expect(questDefinition('HOLO_COMPUTER').isHeavy).toBe(true);
    expect(next.players['player-1']!.handSlots[0]).toMatchObject({
      source: 'ITEM',
      card: { id: questItemCardId(questId), isHeavy: true },
    });
    expect(inventoryIds(next)).not.toContain(questItemCardId(questId));
  });

  it('при занятых руках решение о сбросе кладёт в руку сам Квестовый Предмет', () => {
    const state = contactState(2, 'holo-heavy-decision');
    const questId = giveQuest(state, 'HOLO_COMPUTER');
    setRoom(state, 'GENERATOR');
    const heavy = [
      item('ITEM_YEL_FIRE_EXTINGUISHER_1', YELLOW_ITEM_CARDS),
      item('ITEM_YEL_FIRE_EXTINGUISHER_2', YELLOW_ITEM_CARDS),
    ];
    state.players['player-1']!.handSlots = heavy.map((card) => ({ source: 'ITEM', card }));

    const pending = activate(state, questId);
    const decision = pending.pendingDecision;
    expect(decision).toMatchObject({ type: 'DISCARD_HEAVY_ITEM_FOR_NEW', newItem: { id: questItemCardId(questId) } });

    const next = new GameEngine().processAction(pending, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: decision!.id, selectedOption: heavy[0]!.id },
    });

    expect(next.players['player-1']!.handSlots.map((slot) => (slot.source === 'ITEM' ? slot.card.id : null))).toContain(
      questItemCardId(questId),
    );
  });

  it('Голографический компьютер в руке позволяет «Оценку угрозы» в Неисправной Комнате', () => {
    const state = contactState(2, 'holo-in-hand');
    giveQuest(state, 'HOLO_COMPUTER', true);
    const player = state.players['player-1']!;
    const holo = player.inventory.pop()!;
    player.handSlots = [{ source: 'ITEM', card: holo }];
    computerRoom(state, true);
    const card = threatAssessmentCard();
    player.actionDeck.hand.push(card);

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: card.id, option: 'KEEP_TOP' },
    });

    expect(next.gameLog.at(-1)?.event).toMatchObject({ type: 'EVENT_PEEKED' });
  });
});

function threatAssessmentCard(): ActionCard {
  return {
    id: 'TEST_THREAT',
    characterClass: 'SCIENTIST',
    name: 'Оценка угрозы',
    playCost: 0,
    description: '',
    effect: { kind: 'THREAT_ASSESSMENT' },
  };
}

describe('Компьютер Неисправной Комнаты недоступен (стр. 17, 24)', () => {
  it('«Оценка угрозы» без Голографического компьютера — отказ', () => {
    const state = contactState(2, 'threat-malfunction');
    computerRoom(state, true);
    const card = threatAssessmentCard();
    state.players['player-1']!.actionDeck.hand.push(card);
    expectEngineError(
      () =>
        new GameEngine().processAction(state, {
          type: 'ACTION_PLAY_CARD',
          payload: { cardId: card.id, option: 'KEEP_TOP' },
        }),
      'NO_COMPUTER',
    );
  });

  it('«Отказ в доступе» — отказ', () => {
    const state = contactState(2, 'access-malfunction');
    computerRoom(state, true);
    const target = Object.values(state.ship.rooms).find(
      (room) => room.hasComputer && !room.hasMalfunction && room.id !== state.players['player-1']!.roomId,
    )!;
    const card: ActionCard = {
      id: 'TEST_ACCESS',
      characterClass: 'SCIENTIST',
      name: 'Отказ в доступе',
      playCost: 0,
      description: '',
      effect: { kind: 'ACCESS_DENIED' },
    };
    state.players['player-1']!.actionDeck.hand.push(card);
    expectEngineError(
      () =>
        new GameEngine().processAction(state, {
          type: 'ACTION_PLAY_CARD',
          payload: { cardId: card.id, option: 'MALFUNCTION', targetRoomId: target.id },
        }),
      'NO_COMPUTER',
    );
  });
});

describe('Цена и одноразовость Квестовых Предметов по скану', () => {
  it('Фонарик стоит 2 карты: одной недостаточно', () => {
    const state = contactState(2, 'flashlight-cost');
    const questId = giveQuest(state, 'FLASHLIGHT', true);
    expect(questDefinition('FLASHLIGHT').actionCost).toBe(2);
    expect(payment(state)).toHaveLength(1);
    expectEngineError(() => useQuestItem(state, questId, {}), 'INSUFFICIENT_ACTION_CARDS');
  });

  it('Плазменная горелка многоразовая: остаётся после применения', () => {
    const state = contactState(2, 'torch-reusable');
    const questId = giveQuest(state, 'PLASMA_TORCH', true);
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (entry) => entry.fromRoomId === roomId || entry.toRoomId === roomId,
    )!;
    const next = useQuestItem(state, questId, { targetCorridorId: corridor.id });
    expect(inventoryIds(next)).toContain(questItemCardId(questId));
  });

  it('Датчик движения, Интерком и Система орбитального маневрирования отклоняются явной ошибкой', () => {
    for (const questKey of ['MOTION_SENSOR', 'INTERCOM', 'ORBITAL_MANEUVERING'] as const) {
      const state = contactState(2, `pending-${questKey}`);
      const questId = giveQuest(state, questKey, true);
      const player = state.players['player-1']!;
      const card = [
        ...player.inventory,
        ...player.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : [])),
      ];
      expect(card.some((entry) => entry.id === questItemCardId(questId))).toBe(true);
      expectEngineError(() => useQuestItem(state, questId, {}), 'CARD_NOT_USABLE_NOW');
    }
  });
});
