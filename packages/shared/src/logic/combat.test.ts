import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { createInitialGameState, filterStateForPlayer } from '../index.js';
import { findAdjacentOpenRoomIds, GameEngine } from './fsm.js';
import { existingIntruder, expectEngineError } from '../testing/contactFixtures.js';

import * as rng from '../utils/rng.js';

const realDraw = rng.drawFromStream;

afterEach(() => {
  vi.restoreAllMocks();
});

/** Форсирует грань кубика Боя, не трогая другие потоки RNG. */
function forceCombatDie(face: CombatDieFace): void {
  const index = COMBAT_DIE_FACES.indexOf(face);
  const value = (index + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

/** Верх колоды Атак: карты Стойкости без Отступления (выстрелу не нужна карта События). */
function stackToughnessDeck(state: GameState, copies: number): void {
  const scratch2 = () => structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== 'IAT_SCRATCH_2').map((card) => structuredClone(card));
  state.decks.intruderAttacks = { drawPile: [...Array.from({ length: copies }, scratch2), ...rest], discard: [] };
}

/** Оплата из руки активного персонажа. */
function payIds(state: GameState, count: number): string[] {
  return state.players[state.meta.activePlayerId]!.actionDeck.hand.slice(0, count).map((card) => card.id);
}

function weaponOf(state: GameState): string {
  const slot = state.players['player-1']!.handSlots.find((candidate) => candidate.source === 'ITEM');
  if (!slot || slot.source !== 'ITEM') throw new Error('нет оружия в слоте Руки');
  return slot.card.id;
}

function slotAmmo(state: GameState, weaponId: string): number {
  const slot = state.players['player-1']!.handSlots.find(
    (candidate): candidate is Extract<typeof candidate, { source: 'ITEM' }> =>
      candidate.source === 'ITEM' && candidate.card.id === weaponId,
  );
  if (!slot) throw new Error('оружие не найдено');
  return slot.card.ammo ?? 0;
}

function slotAmmoSet(state: GameState, weaponId: string, ammo: number): void {
  const slot = state.players['player-1']!.handSlots.find(
    (candidate): candidate is Extract<typeof candidate, { source: 'ITEM' }> =>
      candidate.source === 'ITEM' && candidate.card.id === weaponId,
  );
  if (!slot) throw new Error('оружие не найдено');
  slot.card.ammo = ammo;
}

type CombatFactEvent = Extract<
  GameState['gameLog'][number]['event'],
  { type: 'SHOOT_RESOLVED' | 'MELEE_RESOLVED' | 'INTRUDER_KILLED' }
>;

function lastFact<T extends CombatFactEvent['type']>(
  state: GameState,
  type: T,
): Extract<CombatFactEvent, { type: T }> | undefined {
  const entry = [...state.gameLog].reverse().find((item) => item.event.type === type);
  return entry?.event as Extract<CombatFactEvent, { type: T }> | undefined;
}

function act(state: GameState, action: EngineAction): GameState {
  return new GameEngine().processAction(state, action, { actorId: 'player-1' });
}

/** Голая партия: Капитан в Криогенном отсеке с револьвером (6 ед. Боезапаса). */
function freshState(): GameState {
  // Копия снимает Immer-freeze: сценарию нужно собрать обстановку руками.
  return structuredClone(createInitialGameState('combat-integration'));
}

describe('Сквозной бой (Шаг 8: интеграция)', () => {
  it('вход к Чужому → выстрелы → гибель → Останки → подбор → отход без атак', () => {
    const state = freshState();
    const intruderId = existingIntruder(state, 'ADULT', 6);
    stackToughnessDeck(state, 3);

    // 1. Вход в занятый отсек: Бой без нового Контакта (стр. 18).
    const inCombat = act(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [payIds(state, 1)[0]!] },
    });
    expect(inCombat.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED')).toBe(false);
    expect(inCombat.ship.rooms[6]!.occupantIntruderIds).toContain(intruderId);

    // 2. Три выстрела по «1 Ране»: 1 < 3, 2 < 3, 3 ≥ 3 — убит на третьем (стр. 20).
    const weaponId = weaponOf(inCombat);
    let current = inCombat;
    for (const expectedWounds of [1, 2, 3]) {
      forceCombatDie('ONE_WOUND');
      current = act(current, {
        type: 'ACTION_SHOOT',
        payload: { weaponItemId: weaponId, targetIntruderId: intruderId, discardCardIds: [payIds(current, 1)[0]!] },
      });
      expect(lastFact(current, 'SHOOT_RESOLVED')?.woundsTotal).toBe(expectedWounds);
    }
    expect(current.intrudersPool.boardTokens).toHaveLength(0);
    const killed = lastFact(current, 'INTRUDER_KILLED');
    expect(killed?.remainsObjectId).toBeTruthy();

    // 3. Подбор Останков [1]: жетон — в свободный слот Руки (стр. 22).
    const handBefore = current.players['player-1']!.handSlots.length;
    current = act(current, {
      type: 'ACTION_PICK_UP_OBJECT',
      payload: { objectId: killed!.remainsObjectId!, discardCardIds: [payIds(current, 1)[0]!] },
    });
    expect(current.players['player-1']!.handSlots.length).toBe(handBefore + 1);
    expect(current.players['player-1']!.handSlots.at(-1)).toMatchObject({ source: 'OBJECT' });

    // 4. «Огонь на подавление»: отход в соседний отсек без Атаки Чужих (стр. 19).
    const suppressive = structuredClone(
      ACTION_CARDS_BY_CHARACTER.CAPTAIN.find((card) => card.id === 'ACT_CAP_SUPPRESSIVE_FIRE')!,
    );
    // Результат processAction заморожен Immer — снимаем freeze копией.
    current = structuredClone(current);
    current.players['player-1']!.actionDeck.hand.push(suppressive);
    const destination = findAdjacentOpenRoomIds(current, 6)[0]!;
    const ammoBefore = slotAmmo(current, weaponId);
    current = act(current, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_CAP_SUPPRESSIVE_FIRE',
        combat: {
          kind: 'REPOSITION',
          weaponItemId: weaponId,
          moves: [{ playerId: 'player-1', targetRoomId: destination }],
        },
      },
    });

    expect(current.players['player-1']!.roomId).toBe(destination);
    expect(slotAmmo(current, weaponId)).toBe(ammoBefore - 1);
    expect(current.gameLog.some((entry) => entry.event.type === 'ESCAPE_ATTACK_RESOLVED')).toBe(false);
  });

  it('Стрельба без Боезапаса отклоняется честно, партия не меняется', () => {
    const state = freshState();
    const intruderId = existingIntruder(state, 'ADULT', 11);
    const weaponId = weaponOf(state);
    state.players['player-1']!.actionDeck.hand = [];
    slotAmmoSet(state, weaponId, 0);

    expectEngineError(
      () =>
        act(state, {
          type: 'ACTION_SHOOT',
          payload: { weaponItemId: weaponId, targetIntruderId: intruderId, discardCardIds: [] },
        }),
      'WEAPON_NO_AMMO',
    );
    expect(state.intrudersPool.boardTokens[0]!.woundsCount).toBe(0);
  });

  it('Рукопашная: гарантированное Заражение до броска, промах бьёт Тяжёлой Травмой (стр. 19)', () => {
    const state = freshState();
    const intruderId = existingIntruder(state, 'ADULT', 11);
    forceCombatDie('MISS');

    const next = act(state, {
      type: 'ACTION_MELEE',
      payload: { targetIntruderId: intruderId, discardCardIds: [payIds(state, 1)[0]!] },
    });

    expect(next.players['player-1']!.seriousWounds).toHaveLength(1);
    expect(next.players['player-1']!.actionDeck.discard.some((card) => !('characterClass' in card))).toBe(true);
    expect(lastFact(next, 'MELEE_RESOLVED')).toMatchObject({
      contaminated: true,
      seriousWoundTaken: true,
      injuries: 0,
    });
  });

  it('Защита информации: наружу — только число карт Атак и состав мешка, лог — свершившиеся факты', () => {
    const state = freshState();
    const intruderId = existingIntruder(state, 'ADULT', 11);
    stackToughnessDeck(state, 2);
    forceCombatDie('ONE_WOUND');
    const next = act(state, {
      type: 'ACTION_SHOOT',
      payload: { weaponItemId: weaponOf(state), targetIntruderId: intruderId, discardCardIds: [payIds(state, 1)[0]!] },
    });

    const view = filterStateForPlayer(next, 'player-1');

    // Порядок колоды Атак не раскрыт никому — только число закрытых карт;
    // сброс лежит лицом вверх (стр. 9, шаг 11) — свершившиеся факты боя.
    expect('drawPile' in view.decks.intruderAttacks).toBe(false);
    expect(typeof view.decks.intruderAttacks.drawPileCount).toBe('number');
    for (const card of view.decks.intruderAttacks.discard) {
      expect(card.name).toBeTypeOf('string');
    }

    // Мешок и запас жетонов — только состав по типам, без порядка и чисел.
    for (const value of Object.values(view.intrudersPool.bag)) {
      expect(Number.isInteger(value)).toBe(true);
    }

    // Вытянутые карты Стойкости лежали лицом вверх (стр. 20) — они публичны.
    expect(lastFact(next, 'SHOOT_RESOLVED')?.toughnessCards.every((card) => card.toughness > 0)).toBe(true);
  });
});
