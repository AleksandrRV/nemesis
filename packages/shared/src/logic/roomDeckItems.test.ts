import { describe, expect, it } from 'vitest';
import { contactState, existingIntruder, expectEngineError } from '../testing/contactFixtures.js';
import type { ItemCard } from '../types/cards.js';
import type { CorridorNumber } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { EVENT_CARDS } from '../data/eventCards.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { getItemEffectKind } from '../data/itemEffectKinds.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import { PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { createInitialDecks } from '../data/cardsSetup.js';
import { GameEngine } from './fsm.js';
import { executeRoomAbility } from './roomAbilities.js';
import { filterStateForPlayer } from './sanitizer.js';
import { placeItemToPlayer } from './search.js';
import { findNoiseTarget } from './shipGraphQueries.js';

const ALL_ITEMS: readonly ItemCard[] = [
  ...RED_ITEM_CARDS,
  ...YELLOW_ITEM_CARDS,
  ...GREEN_ITEM_CARDS,
  ...CRAFTED_ITEM_CARDS,
];

function cardNamed(name: string): ItemCard {
  const template = ALL_ITEMS.find((item) => item.name === name);
  if (!template) throw new Error(`Нет предмета «${name}»`);
  return structuredClone(template);
}

function give(state: GameState, name: string): string {
  const item = cardNamed(name);
  state.players['player-1']!.inventory.push(item);
  return item.id;
}

function holdInHand(state: GameState, item: ItemCard): void {
  state.players['player-1']!.handSlots = [{ source: 'ITEM', card: item }];
}

function useItem(state: GameState, itemId: string, payload: Record<string, unknown> = {}): GameState {
  const payment = state.players['player-1']!.actionDeck.hand.find((card) => 'characterClass' in card)!.id;
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId, discardCardIds: [payment], ...payload },
  });
}

function playerRoom(state: GameState) {
  return state.ship.rooms[state.players['player-1']!.roomId]!;
}

function revealPhosphorus(state: GameState): void {
  const template = WEAKNESS_CARDS.find((card) => card.effect === 'PHOSPHORUS_SUSCEPTIBILITY')!;
  state.intrudersPool.weaknessSlots[0]!.card = { ...structuredClone(template), isRevealed: true };
}

function retreatIntoCorridor(state: GameState, roomId: number): void {
  const corridorNumber = ([1, 2, 3, 4] as CorridorNumber[]).find(
    (number) => findNoiseTarget(state, roomId, number).kind === 'CORRIDOR',
  )!;
  for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
  const retreatCard = structuredClone(EVENT_CARDS.find((card) => card.corridorNumber === corridorNumber)!);
  state.decks.events = { drawPile: [retreatCard], discard: [] };
  const toughness = structuredClone(
    INTRUDER_ATTACK_CARDS.find((card) => card.toughness !== null && card.toughness >= 3)!,
  );
  state.decks.intruderAttacks = { drawPile: [toughness], discard: [] };
}

describe('Химикаты: «Полностью зарядите Огнемет»', () => {
  it('заряжает Огнемет в слоте руки до предела', () => {
    const state = contactState(2, 'chemicals');
    holdInHand(state, { ...cardNamed('Огнемет'), ammo: 1 });
    const chemicals = give(state, 'Химикаты');

    const next = useItem(state, chemicals);

    const slot = next.players['player-1']!.handSlots[0]!;
    expect(slot.source === 'ITEM' && slot.card.ammo).toBe(4);
    expect(next.decks.items.YELLOW.discard.map((card) => card.id)).toEqual([chemicals]);
  });

  it('отказ без Огнемета в руках и при полном Огнемете', () => {
    const state = contactState(2, 'chemicals-reject');
    const chemicals = give(state, 'Химикаты');
    holdInHand(state, cardNamed('Прототип: винтовка'));
    expectEngineError(() => useItem(structuredClone(state), chemicals), 'WEAPON_NOT_AVAILABLE');

    holdInHand(state, cardNamed('Огнемет'));
    expectEngineError(() => useItem(state, chemicals), 'WEAPON_FULL');
  });
});

describe('Огнетушитель — Тяжелый Предмет', () => {
  it('найденный Огнетушитель занимает слот руки, а не инвентарь', () => {
    const state = contactState(2, 'extinguisher-heavy');
    state.players['player-1']!.handSlots = [];

    placeItemToPlayer(state, 'player-1', cardNamed('Огнетушитель'));

    const player = state.players['player-1']!;
    expect(player.inventory).toHaveLength(0);
    expect(player.handSlots[0]).toMatchObject({ source: 'ITEM', card: { name: 'Огнетушитель', isHeavy: true } });
  });

  it('«Восприимчивость к фосфатам»: прогнанный Огнетушителем Чужой еще и получает 1 Рану', () => {
    const state = contactState(2, 'extinguisher-phosphorus');
    const roomId = playerRoom(state).id;
    const adult = existingIntruder(state, 'ADULT', roomId);
    const extinguisher = cardNamed('Огнетушитель');
    holdInHand(state, extinguisher);
    retreatIntoCorridor(state, roomId);
    const itemId = extinguisher.id;

    const withoutWeakness = useItem(structuredClone(state), itemId, { option: 'RETREAT', targetIntruderId: adult });
    expect(withoutWeakness.intrudersPool.boardTokens.find((token) => token.id === adult)).toMatchObject({
      woundsCount: 0,
    });
    expect(withoutWeakness.intrudersPool.boardTokens.find((token) => token.id === adult)!.roomId).not.toBe(roomId);

    revealPhosphorus(state);
    const withWeakness = useItem(state, itemId, { option: 'RETREAT', targetIntruderId: adult });
    expect(withWeakness.intrudersPool.boardTokens.find((token) => token.id === adult)).toMatchObject({
      woundsCount: 1,
    });
  });
});

describe('Комната Пожарной безопасности: «Запустите Систему Пожаротушения» (стр. 24)', () => {
  function fireControlState(seed: string): { state: GameState; targetRoomId: number; adult: string } {
    const state = contactState(2, seed);
    const room = playerRoom(state);
    room.definitionId = 'FIRE_CONTROL';
    room.isExplored = true;
    room.hasMalfunction = false;
    const targetRoomId = Object.values(state.ship.rooms).find(
      (candidate) => candidate.id !== room.id && candidate.occupantPlayerIds.length === 0,
    )!.id;
    const adult = existingIntruder(state, 'ADULT', targetRoomId);
    retreatIntoCorridor(state, targetRoomId);
    return { state, targetRoomId, adult };
  }

  it('в Комнате без Пожара Чужие все равно Отступают', () => {
    const { state, targetRoomId, adult } = fireControlState('fire-control-no-fire');

    executeRoomAbility(state, 'player-1', { targetRoomId });

    expect(state.ship.rooms[targetRoomId]!.occupantIntruderIds).not.toContain(adult);
    expect(state.gameLog.some((entry) => entry.event.type === 'INTRUDER_RETREATED')).toBe(true);
  });

  it('тушит Пожар; при «Восприимчивости к фосфатам» каждый Чужой получает 1 Рану', () => {
    const { state, targetRoomId, adult } = fireControlState('fire-control-phosphorus');
    state.ship.rooms[targetRoomId]!.hasFire = true;
    revealPhosphorus(state);

    executeRoomAbility(state, 'player-1', { targetRoomId });

    expect(state.ship.rooms[targetRoomId]!.hasFire).toBe(false);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === adult)).toMatchObject({ woundsCount: 1 });
  });

  it('отказ без выбранной Комнаты', () => {
    const { state } = fireControlState('fire-control-reject');
    expectEngineError(() => executeRoomAbility(state, 'player-1', {}), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});

describe('Ключ эвакуации', () => {
  it('в Спасательном Отсеке переключает замок Капсулы этого Отсека', () => {
    const state = contactState(2, 'red-evac-key');
    const keyId = give(state, 'Ключ эвакуации');
    playerRoom(state).definitionId = 'ESCAPE_POD_A';
    const pod = Object.values(state.ship.escapePods).find((entry) => entry.section === 'A')!;

    const next = useItem(state, keyId, { targetEscapePodId: pod.id });

    expect(next.ship.escapePods[pod.id]!.isLocked).toBe(!pod.isLocked);
    expect(next.decks.items.RED.discard.map((card) => card.id)).toEqual([keyId]);
  });

  it('отказ вне Спасательного Отсека и для Капсулы другого Отсека', () => {
    const state = contactState(2, 'red-evac-key-reject');
    const keyId = give(state, 'Ключ эвакуации');
    const podB = Object.values(state.ship.escapePods).find((entry) => entry.section === 'B')!;
    expectEngineError(
      () => useItem(structuredClone(state), keyId, { targetEscapePodId: podB.id }),
      'CARD_NOT_USABLE_NOW',
    );

    playerRoom(state).definitionId = 'ESCAPE_POD_A';
    expectEngineError(() => useItem(state, keyId, { targetEscapePodId: podB.id }), 'INVALID_DECISION_OPTION');
  });
});

describe('Ключ самоуничтожения', () => {
  function keyState(seed: string): { state: GameState; keyId: string } {
    const state = contactState(2, seed);
    const keyId = give(state, 'Ключ самоуничтожения');
    playerRoom(state).hasComputer = true;
    playerRoom(state).hasMalfunction = false;
    return { state, keyId };
  }

  it('в Комнате с Компьютером запускает и останавливает Самоуничтожение', () => {
    const { state, keyId } = keyState('self-destruct-key');

    const started = useItem(structuredClone(state), keyId);
    expect(started.meta.selfDestructTrackPosition).toBe(0);
    expect(started.gameLog.at(-1)?.event).toMatchObject({ type: 'SELF_DESTRUCT_TOGGLED', isActive: true });

    state.meta.selfDestructTrackPosition = 2;
    const stopped = useItem(state, keyId);
    expect(stopped.meta.selfDestructTrackPosition).toBeNull();
  });

  it('отказы: нет Компьютера, Компьютер Неисправной Комнаты, желтое деление, запуск при Анабиозе', () => {
    const noComputer = keyState('self-destruct-no-computer');
    playerRoom(noComputer.state).hasComputer = false;
    expectEngineError(() => useItem(noComputer.state, noComputer.keyId), 'NO_COMPUTER');

    const broken = keyState('self-destruct-broken');
    playerRoom(broken.state).hasMalfunction = true;
    expectEngineError(() => useItem(broken.state, broken.keyId), 'NO_COMPUTER');

    const irreversible = keyState('self-destruct-yellow');
    irreversible.state.meta.selfDestructTrackPosition = 3;
    expectEngineError(() => useItem(irreversible.state, irreversible.keyId), 'ROOM_ABILITY_NOT_ALLOWED');

    const hibernating = keyState('self-destruct-hibernation');
    hibernating.state.players['player-2']!.isInHibernation = true;
    expectEngineError(() => useItem(hibernating.state, hibernating.keyId), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});

describe('Ключ связи', () => {
  function keyState(seed: string): { state: GameState; keyId: string } {
    const state = contactState(2, seed);
    const keyId = give(state, 'Ключ связи');
    playerRoom(state).hasComputer = true;
    playerRoom(state).hasMalfunction = false;
    state.players['player-2']!.hasSignalSent = true;
    return { state, keyId };
  }

  it('показывает карты Цели Персонажа с маркером Сигнала только владельцу ключа', () => {
    const { state, keyId } = keyState('comms-key');
    state.players['player-2']!.objectives = [
      { ...PERSONAL_OBJECTIVE_CARDS[0]!, id: 'OBJ_TEST', name: 'Испытательная цель' },
    ];

    const next = useItem(state, keyId, { targetPlayerId: 'player-2' });

    const peek = { type: 'OBJECTIVE_PEEKED', targetPlayerId: 'player-2' };
    expect(next.gameLog.at(-1)?.event).toMatchObject({ ...peek, objectiveNames: ['Испытательная цель'] });
    expect(filterStateForPlayer(next, 'player-1').gameLog.at(-1)?.event).toMatchObject({
      objectiveNames: ['Испытательная цель'],
    });
    expect(filterStateForPlayer(next, 'player-2').gameLog.at(-1)?.event).toMatchObject({
      ...peek,
      objectiveNames: null,
    });
  });

  it('отказы: нет Компьютера, у Персонажа нет маркера Сигнала, у Персонажа нет карт Целей', () => {
    const noComputer = keyState('comms-key-no-computer');
    playerRoom(noComputer.state).hasComputer = false;
    expectEngineError(() => useItem(noComputer.state, noComputer.keyId, { targetPlayerId: 'player-2' }), 'NO_COMPUTER');

    const noSignal = keyState('comms-key-no-signal');
    noSignal.state.players['player-2']!.hasSignalSent = false;
    expectEngineError(
      () => useItem(noSignal.state, noSignal.keyId, { targetPlayerId: 'player-2' }),
      'INVALID_DECISION_OPTION',
    );

    const noObjectives = keyState('comms-key-no-objectives');
    noObjectives.state.players['player-2']!.objectives = [];
    expectEngineError(
      () => useItem(noObjectives.state, noObjectives.keyId, { targetPlayerId: 'player-2' }),
      'CARD_NOT_USABLE_NOW',
    );
  });
});

describe('Одноименные карты разных колод', () => {
  it('Одежда и Энергозаряд желтой колоды действуют как карты своих двойников и уходят в свой сброс', () => {
    expect(getItemEffectKind(YELLOW_ITEM_CARDS.find((card) => card.name === 'Одежда')!)).toBe('CLOTHES');
    expect(getItemEffectKind(GREEN_ITEM_CARDS.find((card) => card.name === 'Одежда')!)).toBe('CLOTHES');
    expect(getItemEffectKind(YELLOW_ITEM_CARDS.find((card) => card.name === 'Энергозаряд')!)).toBe('ENERGY_CHARGE');
    expect(getItemEffectKind(RED_ITEM_CARDS.find((card) => card.name === 'Энергозаряд')!)).toBe('ENERGY_CHARGE');

    const state = contactState(2, 'yellow-clothes');
    state.players['player-1']!.hasSlime = true;
    const clothes = structuredClone(YELLOW_ITEM_CARDS.find((card) => card.name === 'Одежда')!);
    state.players['player-1']!.inventory.push(clothes);
    const next = useItem(state, clothes.id, { option: 'SLIME' });
    expect(next.decks.items.YELLOW.discard.map((card) => card.id)).toEqual([clothes.id]);
    expect(next.decks.items.GREEN.discard).toHaveLength(0);
  });

  it('при подготовке Энергозаряд попадает и в желтую колоду, Военные препараты — в зеленую', () => {
    const decks = createInitialDecks('item-decks');
    expect(decks.items.YELLOW.drawPile.filter((card) => card.name === 'Энергозаряд')).toHaveLength(3);
    expect(decks.items.GREEN.drawPile.filter((card) => card.name === 'Военные препараты')).toHaveLength(2);
    expect(decks.items.RED.drawPile.some((card) => card.name === 'Военные препараты')).toBe(false);
  });
});
