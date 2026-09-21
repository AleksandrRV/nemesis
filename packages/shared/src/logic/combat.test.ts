import { describe, expect, it } from 'vitest';

import type { CombatDieFace } from '../data/combatDie.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
import type { GameLogEvent } from '../types/log.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import {
  combatDieWoundsForMelee,
  combatDieWoundsForShoot,
  killIntruder,
  performBurstFire,
  performMelee,
  performShoot,
  resolveIntruderWounds,
  retreatIntruder,
  validateMeleeConditions,
  validateShootConditions,
} from './combat.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine } from './fsm.js';
import { createInitialGameState } from './setup.js';

/** Оружие без особых свойств для базовых строк матрицы. */
const GENERIC_WEAPON = 'Энерговинтовка';

function freshState(seed = 'shoot-test'): GameState {
  const state = createInitialGameState(seed, { playerCount: 1 });

  // Оружие из сетапа клонируем: выстрел мутирует боезапас, а записи
  // STARTING_WEAPONS — общие объекты данных (см. тест независимости ниже).
  for (const player of Object.values(state.players)) {
    player.handSlots = player.handSlots.map((slot) =>
      slot.source === 'ITEM' ? { source: 'ITEM' as const, card: { ...slot.card } } : slot,
    );
  }

  return state;
}

function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
    return;
  }

  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
}

function placeIntruder(state: GameState, type: IntruderType, roomId: RoomId, woundsCount = 0): IntruderEntity {
  const n = state.intrudersPool.boardTokens.length + 1;
  const token: IntruderToken = { id: `token-test-${n}`, type, escapeNumber: 1 };
  const entity: IntruderEntity = { id: `intruder-test-${n}`, type, roomId, woundsCount, token };

  state.intrudersPool.boardTokens.push(entity);
  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);

  return entity;
}

function forceAttackTopById(state: GameState, cardId: string): void {
  const pile = state.decks.intruderAttacks.drawPile;
  const index = pile.findIndex((card) => card.id === cardId);

  if (index === -1) throw new Error(`В колоде Атак Чужих нет карты ${cardId}.`);

  const [card] = pile.splice(index, 1);
  pile.unshift(card!);
}

function logEvents(state: GameState): GameLogEvent[] {
  return state.gameLog.map((entry) => entry.event);
}

function closeAllDoorsExcept(state: GameState, keepCorridorId: string | null): void {
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.id !== keepCorridorId) {
      corridor.doorState = 'CLOSED';
    }
  }
}

describe('combatDieWoundsForShoot', () => {
  const cases: Array<[CombatDieFace, IntruderType, string, number]> = [
    // Промах — всегда 0.
    ['MISS', 'LARVA', GENERIC_WEAPON, 0],
    ['MISS', 'ADULT', GENERIC_WEAPON, 0],
    ['MISS', 'QUEEN', GENERIC_WEAPON, 0],
    // Хвост — только Личинка и Крипер.
    ['TAIL', 'LARVA', GENERIC_WEAPON, 1],
    ['TAIL', 'CREEPER', GENERIC_WEAPON, 1],
    ['TAIL', 'ADULT', GENERIC_WEAPON, 0],
    ['TAIL', 'BREEDER', GENERIC_WEAPON, 0],
    ['TAIL', 'QUEEN', GENERIC_WEAPON, 0],
    // Силуэты — все, кроме Трутня и Королевы.
    ['SILHOUETTES', 'LARVA', GENERIC_WEAPON, 1],
    ['SILHOUETTES', 'CREEPER', GENERIC_WEAPON, 1],
    ['SILHOUETTES', 'ADULT', GENERIC_WEAPON, 1],
    ['SILHOUETTES', 'BREEDER', GENERIC_WEAPON, 0],
    ['SILHOUETTES', 'QUEEN', GENERIC_WEAPON, 0],
    // Раны — любому.
    ['ONE_WOUND', 'LARVA', GENERIC_WEAPON, 1],
    ['ONE_WOUND', 'QUEEN', GENERIC_WEAPON, 1],
    ['TWO_WOUNDS', 'ADULT', GENERIC_WEAPON, 2],
    ['TWO_WOUNDS', 'ADULT', 'Тестовый бластер', 2],
    // Револьвер и Пистолет: [2 Раны] считаются 1 Раной.
    ['TWO_WOUNDS', 'ADULT', 'Револьвер', 1],
    ['TWO_WOUNDS', 'QUEEN', 'Пистолет', 1],
    ['ONE_WOUND', 'ADULT', 'Пистолет', 1],
    // Обрез: Силуэты считаются промахом.
    ['SILHOUETTES', 'ADULT', 'Обрез', 0],
    ['ONE_WOUND', 'ADULT', 'Обрез', 1],
    // Дробовик и Боевая винтовка: +1 Рана, если нанесена хотя бы 1.
    ['TAIL', 'CREEPER', 'Дробовик', 2],
    ['ONE_WOUND', 'ADULT', 'Дробовик', 2],
    ['TWO_WOUNDS', 'ADULT', 'Боевая винтовка', 3],
    ['MISS', 'ADULT', 'Дробовик', 0],
    ['SILHOUETTES', 'QUEEN', 'Дробовик', 0],
    // Огнемёт: минимум 1 Рана, кроме Промаха.
    ['TAIL', 'ADULT', 'Огнемёт', 1],
    ['SILHOUETTES', 'QUEEN', 'Огнемёт', 1],
    ['MISS', 'ADULT', 'Огнемёт', 0],
    ['ONE_WOUND', 'ADULT', 'Огнемёт', 1],
  ];

  it.each(cases)('грань %s по %s из «%s» наносит %i Ран(ы)', (face, targetType, weaponName, wounds) => {
    expect(combatDieWoundsForShoot(face, targetType, weaponName)).toBe(wounds);
  });
});

describe('validateShootConditions', () => {
  it('отклоняет выстрел по Чужому, которого нет на поле', () => {
    const state = freshState();

    expectEngineError(() => validateShootConditions(state, 'player-1', 'intruder-nope', 0), 'UNKNOWN_INTRUDER');
  });

  it('отклоняет выстрел по Чужому в другом отсеке', () => {
    const state = freshState();
    const playerRoom = state.players['player-1']!.roomId;
    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== playerRoom)!);
    const intruder = placeIntruder(state, 'ADULT', otherRoom);

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_TARGET_NOT_IN_ROOM');
  });

  it('отклоняет выстрел из пустого слота руки', () => {
    const state = freshState();
    const playerRoom = state.players['player-1']!.roomId;
    const intruder = placeIntruder(state, 'ADULT', playerRoom);

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 5), 'SHOOT_INVALID_WEAPON');
  });

  it('отклоняет выстрел Тяжёлым объектом и не-оружием', () => {
    const state = freshState();
    const playerRoom = state.players['player-1']!.roomId;
    const intruder = placeIntruder(state, 'ADULT', playerRoom);
    const player = state.players['player-1']!;
    const slot0 = player.handSlots[0]!;
    if (slot0.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
    const weaponCard = { ...slot0.card };

    player.handSlots[0] = { source: 'OBJECT', object: { id: 'egg-1', kind: 'EGG' } };

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');

    player.handSlots[0] = { source: 'ITEM', card: { ...weaponCard, isWeapon: false } };

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');
  });

  it('отклоняет выстрел без Боезапаса и из оружия без боезапаса в модели', () => {
    const state = freshState();
    const playerRoom = state.players['player-1']!.roomId;
    const intruder = placeIntruder(state, 'ADULT', playerRoom);
    const slot = state.players['player-1']!.handSlots[0]!;

    if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
    slot.card.ammo = 0;

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_NO_AMMO');

    slot.card.ammo = null;

    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');
  });

  it('отклоняет выстрел от неизвестного персонажа', () => {
    const state = freshState();

    expectEngineError(() => validateShootConditions(state, 'player-nope', 'intruder-1', 0), 'UNKNOWN_PLAYER');
  });
});

describe('performShoot', () => {
  it('тратит 1 Боезапас, бросает кубик и наносит Раны по маппингу грани', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const slot = player.handSlots[0]!;
    if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
    const weaponName = slot.card.name;
    const ammoBefore = slot.card.ammo!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);
    const logBefore = state.gameLog.length;

    performShoot(state, 'player-1', intruder.id, 0);

    expect(slot.card.ammo).toBe(ammoBefore - 1);
    expect(state.meta.rngDraws.combat).toBeGreaterThan(0);

    const shot = logEvents(state)[logBefore]!;
    expect(shot.type).toBe('SHOT_FIRED');
    if (shot.type !== 'SHOT_FIRED') throw new Error('Ожидалось событие SHOT_FIRED.');
    expect(shot.playerId).toBe('player-1');
    expect(shot.intruderId).toBe(intruder.id);
    expect(shot.intruderType).toBe('ADULT');
    expect(shot.weaponName).toBe(weaponName);
    expect(shot.woundsDealt).toBe(combatDieWoundsForShoot(shot.dieFace, 'ADULT', weaponName));
    expect(intruder.woundsCount).toBe(shot.woundsDealt);
  });

  it('при промахе не проверяет Стойкость, но Боезапас тратит', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`shoot-miss-${probe}`);
      const player = state.players['player-1']!;
      const slot = player.handSlots[0]!;
      if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
      const ammoBefore = slot.card.ammo!;
      const intruder = placeIntruder(state, 'ADULT', player.roomId);

      performShoot(state, 'player-1', intruder.id, 0);

      const shot = logEvents(state).find((event) => event.type === 'SHOT_FIRED');
      if (shot?.type !== 'SHOT_FIRED' || shot.woundsDealt !== 0) {
        continue;
      }

      expect(slot.card.ammo).toBe(ammoBefore - 1);
      expect(intruder.woundsCount).toBe(0);
      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
      expect(state.intrudersPool.boardTokens).toContain(intruder);
      return;
    }

    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
  });

  it('Огнемёт при [2 Ранах] отклоняется ошибкой огня без траты Боезапаса', () => {
    const flamethrower = CRAFTED_ITEM_CARDS.find((card) => card.name === 'Огнемёт');
    if (!flamethrower) throw new Error('В данных крафта нет Огнемёта.');

    for (let probe = 0; probe < 60; probe++) {
      const state = freshState(`shoot-flame-${probe}`);
      const player = state.players['player-1']!;
      player.handSlots[0] = { source: 'ITEM', card: { ...flamethrower } };
      const intruder = placeIntruder(state, 'ADULT', player.roomId);

      try {
        performShoot(state, 'player-1', intruder.id, 0);
      } catch (error) {
        expect(error).toBeInstanceOf(EngineError);
        expect((error as EngineError).code).toBe('SHOOT_FIRE_NOT_IMPLEMENTED');
        const slot = player.handSlots[0]!;
        expect(slot.source === 'ITEM' ? slot.card.ammo : null).toBe(flamethrower.ammo);
        return;
      }
    }

    throw new Error('За 60 сидов не выпали [2 Раны] — сломан кубик Боя.');
  });
});

describe('resolveIntruderWounds', () => {
  it('Личинка погибает от любой Раны без карты Стойкости', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'LARVA', player.roomId);
    const discardBefore = state.decks.intruderAttacks.discard.length;

    resolveIntruderWounds(state, intruder, 'player-1', 1);

    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
    expect(state.ship.rooms[player.roomId]!.occupantIntruderIds).not.toContain(intruder.id);
    expect(state.intrudersPool.deadTokens).toContain(intruder.token);
    expect(state.decks.intruderAttacks.discard.length).toBe(discardBefore);
    const events = logEvents(state);
    expect(events.some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
    const killed = events[events.length - 1]!;
    expect(killed.type).toBe('INTRUDER_KILLED');
    if (killed.type !== 'INTRUDER_KILLED') throw new Error('Ожидалось событие INTRUDER_KILLED.');
    expect(killed.intruderId).toBe(intruder.id);
    expect(killed.intruderType).toBe('LARVA');
  });

  it('Крипер погибает, когда суммарные Раны достигают Стойкости одной карты', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'CREEPER', player.roomId, 4);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_3'); // Стойкость 5, без отступления

    resolveIntruderWounds(state, intruder, 'player-1', 1);

    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
    expect(toughness?.type).toBe('TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.attackCards).toHaveLength(1);
    expect(toughness.attackCards[0]).toMatchObject({ toughness: 5, hasRetreat: false });
    expect(toughness.woundsTotal).toBe(5);
    expect(toughness.killed).toBe(true);
    expect(toughness.retreated).toBe(false);
    expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
  });

  it('Взрослая выживает, когда Ран меньше Стойкости', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_3'); // Стойкость 5, без отступления

    resolveIntruderWounds(state, intruder, 'player-1', 2);

    expect(intruder.woundsCount).toBe(2);
    const events = logEvents(state);
    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.killed).toBe(false);
    expect(toughness.retreated).toBe(false);
    expect(events.some((event) => event.type === 'INTRUDER_KILLED')).toBe(false);
    expect(events.some((event) => event.type === 'INTRUDER_RETREATED')).toBe(false);
    expect(state.intrudersPool.boardTokens).toContain(intruder);
  });

  it('Трутень тянет 2 карты: Стойкость суммируется', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'BREEDER', player.roomId);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_2'); // Стойкость 3
    forceAttackTopById(state, 'INTRUDER_ATTACK_BITE_3'); // Стойкость 4, обе без отступления

    resolveIntruderWounds(state, intruder, 'player-1', 6);

    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.attackCards).toHaveLength(2);
    expect(toughness.killed).toBe(false);
    expect(state.intrudersPool.boardTokens).toContain(intruder);

    resolveIntruderWounds(state, intruder, 'player-1', 1);

    const second = logEvents(state).filter((event) => event.type === 'TOUGHNESS_CHECKED')[1]!;
    if (second?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось второе событие TOUGHNESS_CHECKED.');
    expect(second.attackCards).toHaveLength(2);
  });

  it('Королева тянет 2 карты и погибает от суммарных Ран', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'QUEEN', player.roomId);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_2'); // Стойкость 3
    forceAttackTopById(state, 'INTRUDER_ATTACK_BITE_3'); // Стойкость 4

    resolveIntruderWounds(state, intruder, 'player-1', 7);

    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.attackCards).toHaveLength(2);
    expect(toughness.killed).toBe(true);
    expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
  });

  it('стрелка Отступления перекрывает смерть: Чужой сбегает вместо гибели', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'CREEPER', player.roomId);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_1'); // Стойкость 2, есть отступление

    resolveIntruderWounds(state, intruder, 'player-1', 6);

    const events = logEvents(state);
    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.retreated).toBe(true);
    expect(toughness.killed).toBe(false);
    expect(events.some((event) => event.type === 'INTRUDER_KILLED')).toBe(false);
    expect(state.intrudersPool.boardTokens).toContain(intruder);
    expect(intruder.roomId).not.toBe(player.roomId);
  });

  it('отступление без открытых дверей: Чужой остаётся, но выживает', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'CREEPER', player.roomId);
    closeAllDoorsExcept(state, null);
    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_1'); // Стойкость 2, есть отступление

    resolveIntruderWounds(state, intruder, 'player-1', 6);

    const events = logEvents(state);
    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
    expect(toughness.retreated).toBe(true);
    expect(events.some((event) => event.type === 'INTRUDER_RETREATED')).toBe(false);
    expect(intruder.roomId).toBe(player.roomId);
    expect(state.intrudersPool.boardTokens).toContain(intruder);
  });
});

describe('retreatIntruder', () => {
  it('уводит Чужого через открытую Дверь и обновляет occupants отсеков', () => {
    const state = freshState();
    const corridor = Object.values(state.ship.corridors)[0]!;
    closeAllDoorsExcept(state, corridor.id);
    const intruder = placeIntruder(state, 'ADULT', corridor.fromRoomId);

    retreatIntruder(state, intruder, 'player-1');

    expect(intruder.roomId).toBe(corridor.toRoomId);
    expect(state.ship.rooms[corridor.fromRoomId]!.occupantIntruderIds).not.toContain(intruder.id);
    expect(state.ship.rooms[corridor.toRoomId]!.occupantIntruderIds).toContain(intruder.id);
    const retreated = logEvents(state).find((event) => event.type === 'INTRUDER_RETREATED');
    if (retreated?.type !== 'INTRUDER_RETREATED') throw new Error('Ожидалось событие INTRUDER_RETREATED.');
    expect(retreated.fromRoomId).toBe(corridor.fromRoomId);
    expect(retreated.toRoomId).toBe(corridor.toRoomId);
  });

  it('детерминировано: одинаковые партии отступают в один отсек', () => {
    const runRetreat = (): RoomId => {
      const state = freshState('shoot-retreat-determinism');
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'ADULT', player.roomId);
      retreatIntruder(state, intruder, 'player-1');
      return intruder.roomId;
    };

    expect(runRetreat()).toBe(runRetreat());
  });
});

describe('killIntruder', () => {
  it('снимает миниатюру, откладывает жетон в deadTokens и пишет событие', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId, 3);

    killIntruder(state, intruder, 'player-1');

    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
    expect(state.ship.rooms[player.roomId]!.occupantIntruderIds).not.toContain(intruder.id);
    expect(state.intrudersPool.deadTokens).toContain(intruder.token);
    const killed = logEvents(state).find((event) => event.type === 'INTRUDER_KILLED');
    if (killed?.type !== 'INTRUDER_KILLED') throw new Error('Ожидалось событие INTRUDER_KILLED.');
    expect(killed.roomId).toBe(player.roomId);
    expect(killed.playerId).toBe('player-1');
  });
});

describe('ACTION_SHOOT через GameEngine', () => {
  it('оплачивает 1 карту, стреляет и засчитывает действие раунда', () => {
    const engine = new GameEngine();
    const state = freshState('shoot-action-flow');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);
    const intruderId = intruder.id;
    const handBefore = player.actionDeck.hand.length;
    const payCardId = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_SHOOT',
      payload: { targetIntruderId: intruderId, weaponSlotIndex: 0, discardCardIds: [payCardId] },
    });

    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
    expect(logEvents(next).some((event) => event.type === 'SHOT_FIRED')).toBe(true);
  });

  it('проверяет условия до оплаты: неверная цель важнее пустой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('shoot-action-order');

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_SHOOT',
          payload: { targetIntruderId: 'intruder-nope', weaponSlotIndex: 0, discardCardIds: [] },
        }),
      'UNKNOWN_INTRUDER',
    );
  });

  it('без карты оплаты отклоняется ошибкой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('shoot-action-payment');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_SHOOT',
          payload: { targetIntruderId: intruder.id, weaponSlotIndex: 0, discardCardIds: [] },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
  });
});

describe('combatDieWoundsForMelee', () => {
  const cases: Array<[CombatDieFace, IntruderType, number]> = [
    // Промах — всегда 0.
    ['MISS', 'LARVA', 0],
    ['MISS', 'ADULT', 0],
    ['MISS', 'QUEEN', 0],
    // Хвост — только Личинка и Крипер, иначе промах.
    ['TAIL', 'LARVA', 1],
    ['TAIL', 'CREEPER', 1],
    ['TAIL', 'ADULT', 0],
    ['TAIL', 'BREEDER', 0],
    ['TAIL', 'QUEEN', 0],
    // Силуэты — все, кроме Трутня и Королевы, иначе промах.
    ['SILHOUETTES', 'LARVA', 1],
    ['SILHOUETTES', 'CREEPER', 1],
    ['SILHOUETTES', 'ADULT', 1],
    ['SILHOUETTES', 'BREEDER', 0],
    ['SILHOUETTES', 'QUEEN', 0],
    // [+] и [++] наносят лишь 1 Рану любому.
    ['ONE_WOUND', 'LARVA', 1],
    ['ONE_WOUND', 'QUEEN', 1],
    ['TWO_WOUNDS', 'LARVA', 1],
    ['TWO_WOUNDS', 'ADULT', 1],
    ['TWO_WOUNDS', 'QUEEN', 1],
  ];

  it.each(cases)('грань %s по %s наносит %i Ран(у)', (face, targetType, wounds) => {
    expect(combatDieWoundsForMelee(face, targetType)).toBe(wounds);
  });
});

describe('validateMeleeConditions', () => {
  it('отклоняет атаку по Чужому, которого нет на поле', () => {
    const state = freshState();

    expectEngineError(() => validateMeleeConditions(state, 'player-1', 'intruder-nope'), 'UNKNOWN_INTRUDER');
  });

  it('отклоняет атаку по Чужому в другом отсеке', () => {
    const state = freshState();
    const playerRoom = state.players['player-1']!.roomId;
    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== playerRoom)!);
    const intruder = placeIntruder(state, 'ADULT', otherRoom);

    expectEngineError(() => validateMeleeConditions(state, 'player-1', intruder.id), 'MELEE_TARGET_NOT_IN_ROOM');
  });

  it('отклоняет атаку от неизвестного персонажа', () => {
    const state = freshState();

    expectEngineError(() => validateMeleeConditions(state, 'player-nope', 'intruder-1'), 'UNKNOWN_PLAYER');
  });
});

describe('performMelee', () => {
  it('берёт Заражение, бросает кубик и разбирает исход по маппингу грани', () => {
    const state = freshState('melee-flow');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);
    const discardBefore = player.actionDeck.discard.length;
    const woundsBefore = player.seriousWounds.length;
    const logBefore = state.gameLog.length;

    performMelee(state, 'player-1', intruder.id);

    expect(player.actionDeck.discard.length).toBe(discardBefore + 1);

    const melee = logEvents(state)[logBefore]!;
    expect(melee.type).toBe('MELEE_ATTACKED');
    if (melee.type !== 'MELEE_ATTACKED') throw new Error('Ожидалось событие MELEE_ATTACKED.');
    expect(melee.playerId).toBe('player-1');
    expect(melee.intruderId).toBe(intruder.id);
    expect(melee.woundsDealt).toBe(combatDieWoundsForMelee(melee.dieFace, 'ADULT'));
    expect(melee.contaminationDealt).toBe(1);

    if (melee.woundsDealt === 0) {
      expect(melee.seriousWoundDealt).toBe(1);
      expect(player.seriousWounds.length).toBe(woundsBefore + 1);
      expect(intruder.woundsCount).toBe(0);
    } else {
      expect(melee.seriousWoundDealt).toBe(0);
      expect(player.seriousWounds.length).toBe(woundsBefore);
      expect(intruder.woundsCount).toBe(melee.woundsDealt);
    }
  });

  it('промах наносит Тяжёлую Травму, но Заражение уже взято', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`melee-miss-${probe}`);
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'ADULT', player.roomId);
      const discardBefore = player.actionDeck.discard.length;

      performMelee(state, 'player-1', intruder.id);

      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 0) {
        continue;
      }

      expect(player.actionDeck.discard.length).toBe(discardBefore + 1);
      expect(melee.seriousWoundDealt).toBe(1);
      expect(player.seriousWounds.length).toBe(1);
      expect(intruder.woundsCount).toBe(0);
      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
      return;
    }

    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
  });

  it('иммунитет типа — тоже промах с Травмой, а не просто 0 Ран', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`melee-immune-${probe}`);
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'QUEEN', player.roomId);

      performMelee(state, 'player-1', intruder.id);

      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 0 || melee.dieFace === 'MISS') {
        continue;
      }

      // Хвост или Силуэты по Королеве: грань не задела — персонаж травмирован.
      expect(['TAIL', 'SILHOUETTES']).toContain(melee.dieFace);
      expect(melee.seriousWoundDealt).toBe(1);
      expect(player.seriousWounds.length).toBe(1);
      expect(intruder.woundsCount).toBe(0);
      return;
    }

    throw new Error('За 40 сидов не выпал иммунитет типа — сломан кубик Боя.');
  });

  it('попадание по Личинке убивает её без карты Стойкости', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`melee-larva-${probe}`);
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'LARVA', player.roomId);

      performMelee(state, 'player-1', intruder.id);

      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 1) {
        continue;
      }

      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
      expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
      expect(state.intrudersPool.boardTokens).not.toContain(intruder);
      return;
    }

    throw new Error('За 40 сидов не выпало ни одного попадания — сломан кубик Боя.');
  });

  it('без Заражения в запасах атака отклоняется до броска и журнала', () => {
    const state = freshState('melee-no-contamination');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'LARVA', player.roomId);
    state.decks.contamination.drawPile = [];
    state.decks.contamination.discard = [];
    const logBefore = state.gameLog.length;
    const drawsBefore = state.meta.rngDraws.combat;

    expectEngineError(() => performMelee(state, 'player-1', intruder.id), 'NO_CONTAMINATION_LEFT');
    expect(state.gameLog.length).toBe(logBefore);
    expect(state.meta.rngDraws.combat).toBe(drawsBefore);
  });

  it('без Тяжёлых Травм в запасах промах отклоняется после записи события', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`melee-no-wounds-${probe}`);
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'ADULT', player.roomId);
      state.decks.seriousWounds.drawPile = [];
      state.decks.seriousWounds.discard = [];
      const discardBefore = player.actionDeck.discard.length;

      try {
        performMelee(state, 'player-1', intruder.id);
      } catch (error) {
        expect(error).toBeInstanceOf(EngineError);
        expect((error as EngineError).code).toBe('NO_SERIOUS_WOUNDS_LEFT');
        // Событие уже записано, Заражение уже взято: журнал честен.
        expect(logEvents(state).some((event) => event.type === 'MELEE_ATTACKED')).toBe(true);
        expect(player.actionDeck.discard.length).toBe(discardBefore + 1);
        return;
      }
    }

    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
  });

  it('смертельная Травма: событие атаки идёт раньше гибели', () => {
    for (let probe = 0; probe < 40; probe++) {
      const state = freshState(`melee-death-${probe}`);
      const player = state.players['player-1']!;
      const intruder = placeIntruder(state, 'ADULT', player.roomId);
      player.seriousWounds.push(...state.decks.seriousWounds.drawPile.splice(0, 3));

      performMelee(state, 'player-1', intruder.id);

      const events = logEvents(state);
      const meleeIndex = events.findIndex((event) => event.type === 'MELEE_ATTACKED');
      const diedIndex = events.findIndex((event) => event.type === 'PLAYER_DIED');
      if (diedIndex === -1) {
        continue;
      }

      expect(player.isDead).toBe(true);
      expect(meleeIndex).toBeGreaterThanOrEqual(0);
      expect(meleeIndex).toBeLessThan(diedIndex);
      const melee = events[meleeIndex]!;
      if (melee.type !== 'MELEE_ATTACKED') throw new Error('Ожидалось событие MELEE_ATTACKED.');
      expect(melee.seriousWoundDealt).toBe(1);
      expect(intruder.woundsCount).toBe(0);
      return;
    }

    throw new Error('За 40 сидов персонаж ни разу не погиб — сломана Травма.');
  });
});

describe('ACTION_MELEE через GameEngine', () => {
  it('оплачивает 1 карту, атакует и засчитывает действие раунда', () => {
    const engine = new GameEngine();
    const state = freshState('melee-action-flow');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);
    const handBefore = player.actionDeck.hand.length;
    const payCardId = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MELEE',
      payload: { targetIntruderId: intruder.id, discardCardIds: [payCardId] },
    });

    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
    expect(logEvents(next).some((event) => event.type === 'MELEE_ATTACKED')).toBe(true);
  });

  it('проверяет условия до оплаты: неверная цель важнее пустой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('melee-action-order');

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MELEE',
          payload: { targetIntruderId: 'intruder-nope', discardCardIds: [] },
        }),
      'UNKNOWN_INTRUDER',
    );
  });

  it('без карты оплаты отклоняется ошибкой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('melee-action-payment');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MELEE',
          payload: { targetIntruderId: intruder.id, discardCardIds: [] },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
  });
});

describe('killIntruder: Останки на полу отсека', () => {
  it('выкладывает Останки с типом погибшего Чужого', () => {
    const state = freshState('remains-adult');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);

    killIntruder(state, intruder, 'player-1');

    const remains = state.ship.rooms[player.roomId]!.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
    expect(remains).toHaveLength(1);
    expect(remains[0]).toMatchObject({ kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' });
  });

  it('Личинка Останков не оставляет', () => {
    const state = freshState('remains-larva');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'LARVA', player.roomId);
    const objectsBefore = state.ship.rooms[player.roomId]!.objects.length;

    killIntruder(state, intruder, 'player-1');

    expect(state.ship.rooms[player.roomId]!.objects.length).toBe(objectsBefore);
  });

  it('Королева оставляет Останки, но не Яйцо: книга такого правила не знает', () => {
    const state = freshState('remains-queen');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'QUEEN', player.roomId);

    killIntruder(state, intruder, 'player-1');

    const objects = state.ship.rooms[player.roomId]!.objects;
    expect(objects.filter((object) => object.kind === 'INTRUDER_REMAINS')).toHaveLength(1);
    expect(objects.some((object) => object.kind === 'EGG')).toBe(false);
  });

  it('повторная гибель того же жетона даёт Останки с уникальным id', () => {
    const state = freshState('remains-respawn');
    const player = state.players['player-1']!;

    // Жетон возвращается в игру и гибнет снова: id сущности повторяется.
    killIntruder(state, placeIntruder(state, 'ADULT', player.roomId), 'player-1');
    killIntruder(state, placeIntruder(state, 'ADULT', player.roomId), 'player-1');

    const remains = state.ship.rooms[player.roomId]!.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
    expect(remains).toHaveLength(2);
    expect(new Set(remains.map((object) => object.id)).size).toBe(2);
  });
});

function soldierState(seed = 'burst-test'): GameState {
  return createInitialGameState(seed, { playerCount: 1, chosenCharacterClass: 'SOLDIER' });
}

describe('performBurstFire: «Стрельба очередью» (Солдат)', () => {
  it('сбрасывает весь боезапас и добавляет +1 Рану за каждые 2 ед. поверх кубика', () => {
    const state = soldierState();
    const intruder = placeIntruder(state, 'ADULT', 11);

    const { ammoSpent, bonusWounds } = performBurstFire(state, 'player-1', intruder.id, 0);
    const slot = state.players['player-1']!.handSlots[0]!;

    expect(ammoSpent).toBe(5);
    expect(bonusWounds).toBe(2);
    expect(slot.source === 'ITEM' ? slot.card.ammo : -1).toBe(0);

    const shot = logEvents(state).find((event) => event.type === 'SHOT_FIRED');

    expect(shot?.type).toBe('SHOT_FIRED');

    if (shot?.type === 'SHOT_FIRED') {
      expect(shot.woundsDealt).toBe(combatDieWoundsForShoot(shot.dieFace, 'ADULT', 'Боевая винтовка') + 2);
    }
  });

  it('убивает Личинку при любом броске: бонус гарантирует Раны', () => {
    const state = soldierState('burst-larva');
    const larva = placeIntruder(state, 'LARVA', 11);

    performBurstFire(state, 'player-1', larva.id, 0);

    expect(state.intrudersPool.deadTokens.some((token) => token.id === larva.token.id)).toBe(true);
    expect(state.ship.rooms[11]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(false);
  });

  it('требует Боевую Винтовку, а не любое оружие', () => {
    const state = createInitialGameState('burst-no-rifle', { playerCount: 1, chosenCharacterClass: 'SCOUT' });
    const intruder = placeIntruder(state, 'ADULT', 11);

    expectEngineError(() => performBurstFire(state, 'player-1', intruder.id, 0), 'BURST_FIRE_REQUIRES_RIFLE');
  });

  it('без патронов стрелять нечем: проверка раньше сброса', () => {
    const state = soldierState('burst-empty');
    const slot = state.players['player-1']!.handSlots[0]!;

    if (slot.source === 'ITEM') slot.card.ammo = 0;

    const intruder = placeIntruder(state, 'ADULT', 11);

    expectEngineError(() => performBurstFire(state, 'player-1', intruder.id, 0), 'SHOOT_NO_AMMO');
  });
});
