import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine } from './fsm.js';
import type { GameState } from '../types/state.js';
import type { ItemCard } from '../types/cards.js';
import { executeRoomAbility } from './roomAbilities.js';
import { expectEngineError } from '../testing/contactFixtures.js';

const SEED = 'room-ability-tests';

function setupState(): GameState {
  return createInitialGameState(SEED);
}

function giveHand(state: GameState, playerId: string, count: number = 5) {
  const player = state.players[playerId]!;
  while (player.actionDeck.hand.length < count) {
    player.actionDeck.hand.push({
      id: `test-card-${player.actionDeck.hand.length}`,
      name: 'Test Card',
      characterClass: player.characterClass,
      playCost: 1,
      description: 'Test',
    });
  }
}

describe('Действия комнат (Room Abilities)', () => {
  it('отклоняет действие комнаты, если в комнате неисправность', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.hasMalfunction = true;

    expect(() => {
      executeRoomAbility(state, 'player-1', {});
    }).toThrowError(/неисправный отсек/);
  });

  it('отклоняет действие комнаты, если персонаж находится в бою', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.occupantIntruderIds = ['adult-1'];

    expect(() => {
      executeRoomAbility(state, 'player-1', {});
    }).toThrowError(/Бою с Чужими/);
  });

  it('отклоняет действие комнаты, если отсек не исследован', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = false;

    expect(() => {
      executeRoomAbility(state, 'player-1', {});
    }).toThrowError(/неисследованный отсек/);
  });

  it('оружейная (ARMORY): перезаряжает энергетическое оружие на 2 патрона до максимума', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.hasMalfunction = false;

    const energyRifle: ItemCard = {
      id: 'scout-energy-rifle',
      name: 'Энергетическая винтовка',
      color: 'RED',
      origin: 'STARTING',
      isHeavy: true,
      isSingleUse: false,
      componentSymbols: [],
      actionCost: 1,
      description: 'Энергооружие',
      isWeapon: true,
      isEnergyWeapon: true,
      ammo: 1,
      maxAmmo: 3,
    };

    player.handSlots = [
      {
        source: 'ITEM',
        card: energyRifle,
      },
    ];

    executeRoomAbility(state, 'player-1', {});

    const equippedWeapon = (player.handSlots[0] as { source: 'ITEM'; card: ItemCard }).card;
    expect(equippedWeapon.ammo).toBe(3);
  });

  it('оружейная (ARMORY): отклоняет перезарядку при отсутствии энергооружия в руках', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.hasMalfunction = false;

    const conventionalPistol: ItemCard = {
      id: 'pistol',
      name: 'Пистолет',
      color: 'RED',
      origin: 'STARTING',
      isHeavy: true,
      isSingleUse: false,
      componentSymbols: [],
      actionCost: 1,
      description: 'Пистолет',
      isWeapon: true,
      isEnergyWeapon: false,
      ammo: 1,
      maxAmmo: 4,
    };

    player.handSlots = [
      {
        source: 'ITEM',
        card: conventionalPistol,
      },
    ];

    expect(() => {
      executeRoomAbility(state, 'player-1', {});
    }).toThrowError(/У персонажа нет энергооружия в руках/);
  });

  it('комната связи (COMM_ROOM): отправляет сигнал бедствия', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 2;
    const room = state.ship.rooms[2]!;
    room.isExplored = true;
    room.definitionId = 'COMM_ROOM';
    room.hasMalfunction = false;
    player.hasSignalSent = false;

    executeRoomAbility(state, 'player-1', {});

    expect(player.hasSignalSent).toBe(true);
  });

  it('медотсек (INFIRMARY): перевязывает тяжелые раны, лечит перевязанную или лечит все легкие раны', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 3;
    const room = state.ship.rooms[3]!;
    room.isExplored = true;
    room.definitionId = 'INFIRMARY';
    room.hasMalfunction = false;

    // 1. TREAT_SERIOUS
    player.lightWounds = 2;
    player.seriousWounds = [
      { id: 'w-1', name: 'Рана руки', isTreated: false, description: 'Штраф к руке' },
      { id: 'w-2', name: 'Рана ноги', isTreated: false, description: 'Штраф к ноге' },
    ];

    executeRoomAbility(state, 'player-1', {
      option: 'TREAT_SERIOUS',
    });

    expect(player.seriousWounds[0]!.isTreated).toBe(true);
    expect(player.seriousWounds[1]!.isTreated).toBe(true);

    // 2. HEAL_SERIOUS
    executeRoomAbility(state, 'player-1', {
      option: 'HEAL_SERIOUS',
    });

    expect(player.seriousWounds).toHaveLength(1);

    // 3. HEAL_LIGHT
    executeRoomAbility(state, 'player-1', {
      option: 'HEAL_LIGHT',
    });

    expect(player.lightWounds).toBe(0);
  });

  it('генератор (GENERATOR): запускает и останавливает самоуничтожение', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 4;
    const room = state.ship.rooms[4]!;
    room.isExplored = true;
    room.definitionId = 'GENERATOR';
    room.hasMalfunction = false;

    state.meta.selfDestructTrackPosition = null;

    // Запуск
    executeRoomAbility(state, 'player-1', {});
    expect(state.meta.selfDestructTrackPosition).toBe(0);

    // Остановка
    executeRoomAbility(state, 'player-1', {});
    expect(state.meta.selfDestructTrackPosition).toBeNull();

    // Нельзя остановить если position >= 6
    state.meta.selfDestructTrackPosition = 6;
    expect(() => {
      executeRoomAbility(state, 'player-1', {});
    }).toThrowError(/необратимой зоне/);
  });

  it('пожарная система (FIRE_CONTROL): тушит пожар в выбранном отсеке', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 5;
    const room = state.ship.rooms[5]!;
    room.isExplored = true;
    room.definitionId = 'FIRE_CONTROL';
    room.hasMalfunction = false;

    const targetRoom = state.ship.rooms[9]!;
    targetRoom.hasFire = true;

    executeRoomAbility(state, 'player-1', {
      targetRoomId: 9,
    });

    expect(targetRoom.hasFire).toBe(false);
  });

  it('хирургический отсек (SURGERY): сканирует карты заражения, удаляет зараженные, наносит 1 легкую рану и завершает ход', () => {
    const state = setupState();
    // Добавим второго игрока, чтобы пас player-1 не закрывал весь раунд
    state.players['player-2'] = {
      ...state.players['player-1']!,
      id: 'player-2',
      orderNumber: 2,
      hasPassed: false,
    };
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 6;
    const room = state.ship.rooms[6]!;
    room.isExplored = true;
    room.definitionId = 'SURGERY';
    room.hasMalfunction = false;

    player.lightWounds = 0;
    player.actionDeck.hand = [
      { id: 'c-1', isScanned: false, isInfected: true },
      { id: 'c-2', isScanned: false, isInfected: false },
    ];

    executeRoomAbility(state, 'player-1', {});

    expect(player.lightWounds).toBe(1);
    expect(player.hasPassed).toBe(true);
    // clean card c-2 is in drawPile
    expect(player.actionDeck.drawPile.some((c) => c.id === 'c-2')).toBe(true);
    // infected card c-1 is purged
    expect(player.actionDeck.drawPile.some((c) => c.id === 'c-1')).toBe(false);
  });

  it('гнездо (NEST): берет яйцо в руки', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 7;
    const room = state.ship.rooms[7]!;
    room.isExplored = true;
    room.definitionId = 'NEST';
    room.hasMalfunction = false;

    state.intrudersPool.eggsOnBoard = 5;
    player.handSlots = [];

    executeRoomAbility(state, 'player-1', {});

    expect(state.intrudersPool.eggsOnBoard).toBe(4);
    expect(player.handSlots[0]?.source).toBe('OBJECT');
  });

  it('кабины спасательных капсул (ESCAPE_POD_A): вход в открытую капсулу', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 8;
    const room = state.ship.rooms[8]!;
    room.isExplored = true;
    room.definitionId = 'ESCAPE_POD_A';
    room.hasMalfunction = false;

    state.ship.escapePods = {
      'pod-1': {
        id: 'pod-1',
        number: 1,
        section: 'A',
        isLocked: false,
        isDestroyed: false,
        occupantIds: [],
      },
    };

    executeRoomAbility(state, 'player-1', {});

    expect(state.ship.escapePods['pod-1']!.occupantIds).toContain('player-1');
    expect(player.hasEscapedInPod).toBe(true);
  });

  it('лаборатория (LABORATORY): изучает объект в руках, объект не удаляется (стр. 16)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;
    if (!room.occupantPlayerIds.includes('player-1')) room.occupantPlayerIds.push('player-1');

    player.handSlots = [
      {
        source: 'OBJECT',
        object: { id: 'egg-test', kind: 'EGG' },
      },
    ];

    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'EGG',
        card: {
          id: 'weakness-1',
          name: 'Слабость яиц',
          description: 'Слабость',
          effect: 'DANGER_REACTION',
          isRevealed: false,
        },
      },
    ];

    executeRoomAbility(state, 'player-1', {
      targetObjectKind: 'EGG',
    });

    // Объект остаётся в руке: «Объект не удаляется из игры после исследования».
    expect(player.handSlots).toHaveLength(1);
    expect(state.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
  });

  it('лаборатория: изучает объект с пола, без объекта в руках (стр. 16; сценарий D8)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;
    if (!room.occupantPlayerIds.includes('player-1')) room.occupantPlayerIds.push('player-1');
    room.objects.push({ id: 'remains-floor', kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' });

    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'INTRUDER_REMAINS',
        card: {
          id: 'weakness-r',
          name: 'Уязвимость к энергии',
          description: 'Слабость',
          effect: 'ENERGY_WEAKNESS',
          isRevealed: false,
        },
      },
    ];

    executeRoomAbility(state, 'player-1', { targetObjectKind: 'INTRUDER_REMAINS' });

    expect(room.objects).toHaveLength(1); // объект остался на полу
    expect(state.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
  });

  it('лаборатория: без объекта в отсеке и в руках — отказ (стр. 16)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;
    if (!room.occupantPlayerIds.includes('player-1')) room.occupantPlayerIds.push('player-1');
    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'EGG',
        card: { id: 'weakness-e', name: 'Слабость', description: '', effect: 'FIRE_WEAKNESS', isRevealed: false },
      },
    ];

    expectEngineError(
      () => executeRoomAbility(state, 'player-1', { targetObjectKind: 'EGG' }),
      'ROOM_ABILITY_NOT_ALLOWED',
    );
  });

  it('лаборатория: уже изученная Слабость не раскрывается повторно', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;
    if (!room.occupantPlayerIds.includes('player-1')) room.occupantPlayerIds.push('player-1');
    player.handSlots = [{ source: 'OBJECT', object: { id: 'egg-2', kind: 'EGG' } }];
    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'EGG',
        card: { id: 'weakness-done', name: 'Слабость', description: '', effect: 'FIRE_WEAKNESS', isRevealed: true },
      },
    ];

    expectEngineError(
      () => executeRoomAbility(state, 'player-1', { targetObjectKind: 'EGG' }),
      'WEAKNESS_ALREADY_REVEALED',
    );
  });

  it('лаборатория: discardObjectAfterStudy сбрасывает объект с руки на пол (стр. 16)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;
    if (!room.occupantPlayerIds.includes('player-1')) room.occupantPlayerIds.push('player-1');
    player.handSlots = [{ source: 'OBJECT', object: { id: 'egg-3', kind: 'EGG' } }];
    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'EGG',
        card: { id: 'weakness-drop', name: 'Слабость', description: '', effect: 'FIRE_WEAKNESS', isRevealed: false },
      },
    ];

    executeRoomAbility(state, 'player-1', { targetObjectKind: 'EGG', discardObjectAfterStudy: true });

    expect(player.handSlots).toHaveLength(0);
    expect(room.objects.some((object) => object.id === 'egg-3')).toBe(true);
    expect(state.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
  });

  it('GameEngine: корректно списывает 2 карты действия за ACTION_ROOM_ABILITY', () => {
    const engine = new GameEngine();
    const state = setupState();
    const player = state.players['player-1']!;

    player.roomId = 2;
    const room = state.ship.rooms[2]!;
    room.isExplored = true;
    room.definitionId = 'COMM_ROOM';
    room.hasMalfunction = false;
    player.hasSignalSent = false;

    const initialHandLength = player.actionDeck.hand.length;
    const cardsToDiscard = [player.actionDeck.hand[0]!.id, player.actionDeck.hand[1]!.id];

    const next = engine.processAction(state, {
      type: 'ACTION_ROOM_ABILITY',
      payload: {
        discardCardIds: cardsToDiscard,
      },
    });

    expect(next.players['player-1']!.hasSignalSent).toBe(true);
    expect(next.players['player-1']!.actionDeck.hand.length).toBe(initialHandLength - 2);
    expect(next.players['player-1']!.actionDeck.discard.length).toBe(2);
  });

  it('NEST: id генерация через allocateEntityId без коллизий (Шаг 6, долг 16)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 7;
    const room = state.ship.rooms[7]!;
    room.isExplored = true;
    room.definitionId = 'NEST';
    room.hasMalfunction = false;
    state.intrudersPool.eggsOnBoard = 5;
    player.handSlots = [];

    executeRoomAbility(state, 'player-1', {});
    const firstId = (player.handSlots[0] as { source: 'ITEM'; card: never } | { source: 'OBJECT'; object: { id: string } }).source === 'OBJECT'
      ? (player.handSlots[0] as { source: 'OBJECT'; object: { id: string } }).object.id
      : '';

    // Второе взятие — id должен быть другим
    player.handSlots = [];
    state.intrudersPool.eggsOnBoard = 4;
    executeRoomAbility(state, 'player-1', {});

    const secondId = (player.handSlots[0] as { source: 'OBJECT'; object: { id: string } }).object.id;
    expect(firstId).not.toBe(secondId);
    expect(firstId.startsWith('egg-')).toBe(true);
  });

  it('SURGERY: чистые карты замешиваются потоком cards (Шаг 6, долг 17)', () => {
    const state = setupState();
    state.players['player-2'] = {
      ...state.players['player-1']!,
      id: 'player-2',
      orderNumber: 2,
      hasPassed: false,
    };
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 6;
    const room = state.ship.rooms[6]!;
    room.isExplored = true;
    room.definitionId = 'SURGERY';
    room.hasMalfunction = false;

    const beforeCardsDraws = state.meta.rngDraws.cards;
    player.actionDeck.hand = [
      { id: 'clean-1', isScanned: false, isInfected: false },
      { id: 'clean-2', isScanned: false, isInfected: false },
      { id: 'infected-1', isScanned: false, isInfected: true },
    ];
    player.actionDeck.drawPile = [];

    executeRoomAbility(state, 'player-1', {});

    // Чистые карты должны быть в drawPile и перемешаны, rngDraws.cards должен увеличиться
    expect(player.actionDeck.drawPile).toHaveLength(2);
    expect(state.meta.rngDraws.cards).toBeGreaterThan(beforeCardsDraws);
    expect(player.actionDeck.drawPile.some((c) => c.id === 'clean-1')).toBe(true);
    expect(player.actionDeck.drawPile.some((c) => c.id === 'clean-2')).toBe(true);
  });

  it('ARMORY: выбор оружия при нескольких энергостволах (Шаг 6, долг 18)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.hasMalfunction = false;

    const rifle1: ItemCard = {
      id: 'energy-rifle-1',
      name: 'Энерговинтовка 1',
      color: 'RED',
      origin: 'STARTING',
      isHeavy: true,
      isSingleUse: false,
      componentSymbols: [],
      actionCost: 1,
      description: 'Энерго',
      isWeapon: true,
      isEnergyWeapon: true,
      ammo: 1,
      maxAmmo: 4,
    };
    const rifle2: ItemCard = {
      id: 'energy-rifle-2',
      name: 'Энерговинтовка 2',
      color: 'RED',
      origin: 'STARTING',
      isHeavy: true,
      isSingleUse: false,
      componentSymbols: [],
      actionCost: 1,
      description: 'Энерго',
      isWeapon: true,
      isEnergyWeapon: true,
      ammo: 0,
      maxAmmo: 4,
    };

    player.handSlots = [
      { source: 'ITEM', card: rifle1 },
      { source: 'ITEM', card: rifle2 },
    ];

    executeRoomAbility(state, 'player-1', {});

    expect(state.pendingDecision?.type).toBe('CHOOSE_ENERGY_WEAPON');
    if (state.pendingDecision?.type === 'CHOOSE_ENERGY_WEAPON') {
      expect(state.pendingDecision.weaponIds).toContain('energy-rifle-1');
      expect(state.pendingDecision.weaponIds).toContain('energy-rifle-2');
    }
  });

  it('LABORATORY: сброс чужого объекта — объект может быть у любого, но сбрасывать может только владелец после изучения (Шаг 6, долг 19)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('lab-discard-test', { playerCount: 2 });
    const player1 = state.players['player-1']!;
    const player2 = state.players['player-2']!;

    // Оба в лаборатории
    const labRoom = Object.values(state.ship.rooms).find((r) => r.definitionId === 'LABORATORY')!;
    labRoom.isExplored = true;
    labRoom.hasMalfunction = false;
    player1.roomId = labRoom.id;
    player2.roomId = labRoom.id;
    labRoom.occupantPlayerIds = ['player-1', 'player-2'];

    // Яйцо у player-2
    player2.handSlots = [{ source: 'OBJECT', object: { id: 'egg-p2', kind: 'EGG' } }];
    player1.handSlots = [];

    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'EGG',
        card: { id: 'weakness-egg', name: 'Слабость', description: '', effect: 'FIRE_WEAKNESS', isRevealed: false },
      },
    ];

    const payCardIds = [player1.actionDeck.hand[0]!.id, player1.actionDeck.hand[1]!.id];
    const s1 = engine.processAction(state, {
      type: 'ACTION_ROOM_ABILITY',
      payload: { targetObjectKind: 'EGG', discardCardIds: payCardIds },
    });

    // Изучение прошло, хотя объект у другого игрока
    expect(s1.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
    // Объект остался у player-2, а не сброшен
    expect(s1.players['player-2']?.handSlots).toHaveLength(1);

    // Второй сценарий: player-2 изучает и сбрасывает свой объект
    const state2 = createInitialGameState('lab-discard-test2', { playerCount: 2 });
    const p1_2 = state2.players['player-1']!;
    const p2_2 = state2.players['player-2']!;
    const labRoom2 = Object.values(state2.ship.rooms).find((r) => r.definitionId === 'LABORATORY')!;
    labRoom2.isExplored = true;
    labRoom2.hasMalfunction = false;
    p1_2.roomId = labRoom2.id;
    p2_2.roomId = labRoom2.id;
    labRoom2.occupantPlayerIds = ['player-1', 'player-2'];
    p2_2.handSlots = [{ source: 'OBJECT', object: { id: 'egg-p2-2', kind: 'EGG' } }];
    state2.intrudersPool.weaknessSlots = [
      { objectKind: 'EGG', card: { id: 'weakness-egg2', name: 'Слабость', description: '', effect: 'FIRE_WEAKNESS', isRevealed: false } },
    ];

    const pay2 = [p2_2.actionDeck.hand[0]!.id, p2_2.actionDeck.hand[1]!.id];
    state2.meta.activePlayerId = 'player-2';
    const s2 = engine.processAction(state2, {
      type: 'ACTION_ROOM_ABILITY',
      payload: { targetObjectKind: 'EGG', discardObjectAfterStudy: true, discardCardIds: pay2 },
    });

    expect(s2.players['player-2']?.handSlots).toHaveLength(0);
    expect(s2.ship.rooms[labRoom2.id]?.objects.some((o) => o.id === 'egg-p2-2')).toBe(true);
  });

  it('ESCAPE_POD: посадка в уничтоженную капсулу запрещена (Шаг 6, долг 20)', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 8;
    const room = state.ship.rooms[8]!;
    room.isExplored = true;
    room.definitionId = 'ESCAPE_POD_A';
    room.hasMalfunction = false;

    state.ship.escapePods = {
      'pod-destroyed': {
        id: 'pod-destroyed',
        number: 1,
        section: 'A',
        isLocked: false,
        isDestroyed: true,
        occupantIds: [],
      },
    };

    expectEngineError(() => executeRoomAbility(state, 'player-1', {}), 'ROOM_ABILITY_NOT_ALLOWED');
  });

  it('атомарность: при ROOM_ABILITY_NOT_ALLOWED состояние полностью откатывается (Шаг 8, долг 27)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('atomicity-room-test');
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    // Комната с неисправностью
    player.roomId = 1;
    const room = state.ship.rooms[1]!;
    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.hasMalfunction = true;
    room.hasFire = false;
    room.occupantIntruderIds = [];

    const snapshot = JSON.stringify(state);

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_ROOM_ABILITY',
          payload: { discardCardIds: [player.actionDeck.hand[0]!.id, player.actionDeck.hand[1]!.id] },
        }),
      'ROOM_ABILITY_NOT_ALLOWED',
    );

    // Состояние не изменилось
    expect(JSON.stringify(state)).toBe(snapshot);

    // Теперь бой
    room.hasMalfunction = false;
    room.occupantIntruderIds = ['intruder-1'];
    state.intrudersPool.boardTokens = [{ id: 'intruder-1', type: 'ADULT', roomId: 1, woundsCount: 0 }];

    const snapshot2 = JSON.stringify(state);

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_ROOM_ABILITY',
          payload: { discardCardIds: [player.actionDeck.hand[0]!.id, player.actionDeck.hand[1]!.id] },
        }),
      'ROOM_ABILITY_NOT_ALLOWED',
    );

    expect(JSON.stringify(state)).toBe(snapshot2);
  });

});
