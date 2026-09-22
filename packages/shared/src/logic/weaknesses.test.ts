import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import type { ItemCard, WeaknessEffect } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';
import { isSurpriseAttack as contactSurprise } from './contact.js';
import { GameEngine } from './fsm.js';
import { executePickUpObject } from './heavyObjects.js';
import { combatStatusState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';

const realDraw = rng.drawFromStream;

/** Форсирует грань кубика Боя, не трогая другие потоки RNG. */
function forceCombatDie(face: CombatDieFace): void {
  const index = COMBAT_DIE_FACES.indexOf(face);
  const value = (index + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

/** Раскрывает Слабость с данным эффектом в слоте Останков (стр. 21). */
function revealWeakness(state: GameState, effect: WeaknessEffect, isRevealed = true): void {
  const template = WEAKNESS_CARDS.find((card) => card.effect === effect)!;
  const slot = state.intrudersPool.weaknessSlots.find((entry) => entry.objectKind === 'INTRUDER_REMAINS')!;
  slot.card = { ...structuredClone(template), isRevealed };
}

let weaponCounter = 0;
function giveWeapon(state: GameState, ammo: number, isEnergy: boolean, id?: string): string {
  weaponCounter += 1;
  const weapon: ItemCard = {
    id: id ?? `w-test-${weaponCounter}`,
    name: 'Испытательный пистолет',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 0,
    description: '',
    isWeapon: true,
    isEnergyWeapon: isEnergy,
    ammo,
    maxAmmo: 6,
  };
  state.players['player-1']!.handSlots.push({ source: 'ITEM', card: weapon });
  return weapon.id;
}

/** Бой: Чужой указанного типа в отсеке, верх колоды — карта без стрелки. */
function combatReady(type: GameState['intrudersPool']['boardTokens'][number]['type'] = 'ADULT', wounds = 0): GameState {
  const ready = combatStatusState('weakness-step-6');
  const roomId = ready.players['player-1']!.roomId;
  const intruderId = putIntruder(ready, type, roomId);
  const intruder = ready.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
  intruder.woundsCount = wounds;
  ready.decks.intruderAttacks = {
    drawPile: [structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!)],
    discard: [],
  };
  ready.players['player-1']!.handSlots = ready.players['player-1']!.handSlots.filter(
    (slot) => !(slot.source === 'ITEM' && slot.card.isWeapon),
  );
  const weaponId = giveWeapon(ready, 4, false);
  void weaponId;
  return ready;
}

function shoot(ready: GameState, weaponItemId?: string): GameState {
  const player = ready.players[ready.meta.activePlayerId]!;
  const resolvedWeaponId =
    weaponItemId ??
    player.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon,
    )?.card.id ??
    'w-missing';
  return new GameEngine().processAction(ready, {
    type: 'ACTION_SHOOT',
    payload: {
      weaponItemId: resolvedWeaponId,
      targetIntruderId: ready.intrudersPool.boardTokens[0]!.id,
      discardCardIds: [player.actionDeck.hand[0]!.id],
    },
  });
}

function meleeAttack(ready: GameState): GameState {
  const player = ready.players[ready.meta.activePlayerId]!;
  return new GameEngine().processAction(ready, {
    type: 'ACTION_MELEE',
    payload: {
      targetIntruderId: ready.intrudersPool.boardTokens[0]!.id,
      discardCardIds: [player.actionDeck.hand[0]!.id],
    },
  });
}

function shootEvent(state: GameState) {
  const entry = [...state.gameLog].reverse().find((item) => item.event.type === 'SHOOT_RESOLVED');
  if (!entry || entry.event.type !== 'SHOOT_RESOLVED') throw new Error('нет SHOOT_RESOLVED');
  return entry.event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Смерть Чужого: Останки (стр. 20, 22)', () => {
  it('убитый Взрослый оставляет Останки с типом; в журнале INTRUDER_KILLED', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('ADULT', 2); // 2 + 1 = 3 Раны против Стойкости 3
    const roomId = state.players[state.meta.activePlayerId]!.roomId;
    const intruderId = state.intrudersPool.boardTokens[0]!.id;

    const next = shoot(state);

    const remains = next.ship.rooms[roomId]!.objects.find((object) => object.kind === 'INTRUDER_REMAINS');
    expect(remains).toMatchObject({ kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' });
    const killed = next.gameLog.find((entry) => entry.event.type === 'INTRUDER_KILLED');
    expect(killed?.event).toMatchObject({
      type: 'INTRUDER_KILLED',
      targetIntruderId: intruderId,
      targetType: 'ADULT',
      remainsObjectId: remains!.id,
    });
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
  });

  it('Личинка не оставляет Останков (стр. 22; вердикт ревью 0.4.0)', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('LARVA');
    const roomId = state.players[state.meta.activePlayerId]!.roomId;

    const next = meleeAttack(state);

    expect(next.ship.rooms[roomId]!.objects.filter((object) => object.kind === 'INTRUDER_REMAINS')).toHaveLength(0);
    expect(next.gameLog.find((entry) => entry.event.type === 'INTRUDER_KILLED')?.event).toMatchObject({
      targetType: 'LARVA',
      remainsObjectId: null,
    });
  });

  it('смерть Королевы не создаёт Яйцо (вердикт ревью 0.4.0)', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('QUEEN', 5); // Трутень/Королева: 2 карты, сумма 5; 5 + 1 = 6 >= 5
    state.decks.intruderAttacks = {
      drawPile: [
        structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_3')!), // Стойкость 5
        structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!), // Стойкость 3
      ],
      discard: [],
    };
    const roomId = state.players[state.meta.activePlayerId]!.roomId;

    const first = shoot(state); // 5 + 1 = 6 против Стойкости 5 + 3 = 8 — выживает
    expect(shootEvent(first).killed).toBe(false);

    // Вторая атака «2 Раны» в драке даёт 1 — стреляем ещё раз «1 Рану»: 6 + 1 = 7 < 8.
    forceCombatDie('ONE_WOUND');
    const second = shoot(first);
    expect(shootEvent(second).killed).toBe(false);

    // Третья: 7 + 1 = 8 >= 8 — Королева мертва; Останки есть, Яйца нет.
    forceCombatDie('ONE_WOUND');
    const third = shoot(second);
    expect(shootEvent(third).killed).toBe(true);
    expect(third.ship.rooms[roomId]!.objects.some((object) => object.kind === 'EGG')).toBe(false);
    expect(third.ship.rooms[roomId]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(true);
  });

  it('подбор Останков [1]: объект в слот Руки, с пола удалён, оплата списана (стр. 13, 22)', () => {
    const state = combatStatusState('pickup-step-6');
    const roomId = state.players[state.meta.activePlayerId]!.roomId;
    state.ship.rooms[roomId]!.objects.push({ id: 'remains-1', kind: 'INTRUDER_REMAINS', intruderType: 'CREEPER' });
    const player = state.players[state.meta.activePlayerId]!;
    const paidId = player.actionDeck.hand[0]!.id;

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PICK_UP_OBJECT',
      payload: { objectId: 'remains-1', discardCardIds: [paidId] },
    });

    const picked = next.players[next.meta.activePlayerId]!;
    // Слот 0 — стартовый предмет, Останки легли в свободный слот.
    expect(picked.handSlots.some((slot) => slot.source === 'OBJECT' && slot.object.id === 'remains-1')).toBe(true);
    expect(picked.handSlots.find((slot) => slot.source === 'OBJECT')?.object).toMatchObject({
      kind: 'INTRUDER_REMAINS',
      intruderType: 'CREEPER',
    });
    expect(next.ship.rooms[roomId]!.objects.some((object) => object.id === 'remains-1')).toBe(false);
    expect(next.players[next.meta.activePlayerId]!.actionDeck.discard.some((card) => card.id === paidId)).toBe(true);
    expect(next.gameLog.some((entry) => entry.event.type === 'OBJECT_PICKED_UP')).toBe(true);
  });

  it('оба слота Рук заняты — HAND_SLOTS_FULL (стр. 22)', () => {
    const state = combatStatusState('pickup-full');
    const roomId = state.players[state.meta.activePlayerId]!.roomId;
    state.ship.rooms[roomId]!.objects.push({ id: 'egg-1', kind: 'EGG' });
    const player = state.players[state.meta.activePlayerId]!;
    player.handSlots = [
      { source: 'OBJECT', object: { id: 'egg-a', kind: 'EGG' } },
      { source: 'OBJECT', object: { id: 'egg-b', kind: 'EGG' } },
    ];

    expectEngineError(
      () =>
        new GameEngine().processAction(state, {
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId: 'egg-1', discardCardIds: [player.actionDeck.hand[0]!.id] },
        }),
      'HAND_SLOTS_FULL',
    );
  });

  it('неизвестный игрок — UNKNOWN_PLAYER (прямой вызов)', () => {
    const ready = combatStatusState('pickup-ghost');
    expectEngineError(
      () =>
        executePickUpObject(
          ready,
          { type: 'ACTION_PICK_UP_OBJECT', payload: { objectId: 'x', discardCardIds: [] } },
          'ghost',
        ),
      'UNKNOWN_PLAYER',
    );
  });

  it('объекта в отсеке нет — OBJECT_NOT_AVAILABLE', () => {
    const state = combatStatusState('pickup-absent');
    const player = state.players[state.meta.activePlayerId]!;

    expectEngineError(
      () =>
        new GameEngine().processAction(state, {
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId: 'ghost-object', discardCardIds: [player.actionDeck.hand[0]!.id] },
        }),
      'OBJECT_NOT_AVAILABLE',
    );
  });
});

describe('Эффекты раскрытых Слабостей (стр. 21)', () => {
  it('«Уязвимость к энергии»: энергооружие добавляет Рану, обычное — нет', () => {
    forceCombatDie('ONE_WOUND');

    const energyState = combatReady('ADULT');
    const energyId = giveWeapon(energyState, 4, true, 'w-energy');
    revealWeakness(energyState, 'ENERGY_WEAKNESS');
    expect(shootEvent(shoot(energyState, energyId)).injuries).toBe(2);

    const plainState = combatReady('ADULT');
    const plainId = giveWeapon(plainState, 4, false, 'w-plain');
    revealWeakness(plainState, 'ENERGY_WEAKNESS');
    expect(shootEvent(shoot(plainState, plainId)).injuries).toBe(1);
  });

  it('«Вид на грани вымирания»: Стойкость каждой карты снижена на 1', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('ADULT', 1); // 1 + 1 = 2 Раны
    revealWeakness(state, 'EDGE_OF_EXTINCTION'); // Стойкость 3 → 2

    expect(shootEvent(shoot(state)).killed).toBe(true);
  });

  it('«Реакция на опасность»: порог Внезапной атаки снижен на 1, но не ниже 1', () => {
    // Порог 2: 1 карта на руке — без Слабости атака внезапная, со Слабостью нет.
    const plain = combatStatusState('danger-plain');
    expect(contactSurprise(plain, { escapeNumber: 2 }, 1, 'NOISE')).toBe(true);

    const weak = combatStatusState('danger-weak');
    revealWeakness(weak, 'DANGER_REACTION');
    expect(contactSurprise(weak, { escapeNumber: 2 }, 1, 'NOISE')).toBe(false);
    // Минимум 1: порог 1 при 0 карт на руке — всё ещё Внезапная атака.
    expect(contactSurprise(weak, { escapeNumber: 1 }, 0, 'NOISE')).toBe(true);
    // «Зов» внезапной атаки не вызывает даже при нуле карт.
    expect(contactSurprise(weak, { escapeNumber: 5 }, 0, 'CALL')).toBe(false);
  });

  it('«Повадки атаки»: Укус Взрослой Особи наносит Лёгкую Травму вместо Тяжёлой', () => {
    const state = combatStatusState('bite-weak');
    revealWeakness(state, 'ATTACK_BEHAVIOR');
    const intruderId = putIntruder(state, 'ADULT', state.players['player-1']!.roomId);
    state.decks.intruderAttacks = {
      drawPile: [structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_1')!)],
      discard: [],
    };

    resolveSurpriseAttack(state, 'player-1', intruderId);

    const player = state.players['player-1']!;
    expect(player.lightWounds).toBe(1);
    expect(player.seriousWounds).toHaveLength(0);
    expect(player.isDead).toBe(false);
  });

  it('без раскрытой Слабости Укус остаётся Тяжёлой Травмой', () => {
    const state = combatStatusState('bite-plain');
    const intruderId = putIntruder(state, 'ADULT', state.players['player-1']!.roomId);
    state.decks.intruderAttacks = {
      drawPile: [structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_1')!)],
      discard: [],
    };

    resolveSurpriseAttack(state, 'player-1', intruderId);

    expect(state.players['player-1']!.seriousWounds.length).toBe(1);
  });

  it('Укус Трутня при «Повадках атаки» остаётся Тяжёлой Травмой: слабость только у Взрослых', () => {
    const state = combatStatusState('bite-breeder');
    revealWeakness(state, 'ATTACK_BEHAVIOR');
    const intruderId = putIntruder(state, 'BREEDER', state.players['player-1']!.roomId);
    state.decks.intruderAttacks = {
      drawPile: [structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_1')!)],
      discard: [],
    };

    resolveSurpriseAttack(state, 'player-1', intruderId);

    expect(state.players['player-1']!.seriousWounds.length).toBe(1);
  });

  it('нераскрытая Слабость эффекта не даёт (карта под рубашкой)', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('ADULT');
    giveWeapon(state, 4, true);
    revealWeakness(state, 'ENERGY_WEAKNESS', false);

    expect(shootEvent(shoot(state)).injuries).toBe(1);
  });
});
