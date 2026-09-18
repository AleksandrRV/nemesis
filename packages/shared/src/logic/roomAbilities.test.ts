import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine } from './fsm.js';
import type { GameState } from '../types/state.js';
import type { ItemCard } from '../types/cards.js';
import { executeRoomAbility } from './roomAbilities.js';

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
        occupantIds: [],
      },
    };

    executeRoomAbility(state, 'player-1', {});

    expect(state.ship.escapePods['pod-1']!.occupantIds).toContain('player-1');
    expect(player.hasEscapedInPod).toBe(true);
  });

  it('лаборатория (LABORATORY): изучает объект и раскрывает карту слабости', () => {
    const state = setupState();
    const player = state.players['player-1']!;
    giveHand(state, 'player-1', 4);

    player.roomId = 9;
    const room = state.ship.rooms[9]!;
    room.isExplored = true;
    room.definitionId = 'LABORATORY';
    room.hasMalfunction = false;

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
          isRevealed: false,
        },
      },
    ];

    executeRoomAbility(state, 'player-1', {
      targetObjectKind: 'EGG',
    });

    expect(player.handSlots).toHaveLength(0);
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
});
