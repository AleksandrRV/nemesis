import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { GameState } from '../types/state.js';
import { createInitialGameState } from './setup.js';
import { advanceTimeAndSelfDestruct, resolveFireDamage, runEventPhase } from './eventsPhase.js';
import { putIntruder } from '../testing/contactFixtures.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

function lastEvents(state: GameState) {
  return state.gameLog.map((entry) => entry.event);
}

/** Верх колоды Стойкости — одна конкретная карта Атаки Чужих. */
function stackToughness(state: GameState, topCardId: string): void {
  const top = structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === topCardId)!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== topCardId).map((card) => structuredClone(card));
  state.decks.intruderAttacks = { drawPile: [top, ...rest], discard: [] };
}

/** Верх колоды Событий — одна конкретная карта (её вытянет Отступление). */
function stackEvents(state: GameState, topCardId: string): void {
  const top = structuredClone(EVENT_CARDS.find((card) => card.id === topCardId)!);
  state.decks.events = {
    drawPile: [top, ...EVENT_CARDS.filter((card) => card.id !== topCardId).map((card) => structuredClone(card))],
    discard: [],
  };
}

describe('Шаг 4 Фазы Событий: Счётчики Времени и Самоуничтожения (стр. 10, 11, 24)', () => {
  it('сдвигает маркер Времени и пишет TIME_TRACK_ADVANCED', () => {
    const state = freshState('evp-time-1');

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.timeTrackPosition).toBe(1);
    expect(state.meta.selfDestructTrackPosition).toBeNull();
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'TIME_TRACK_ADVANCED', timeTrackPosition: 1, selfDestructTrackPosition: null }),
    );
  });

  it('активный маркер Самоуничтожения двигается вместе со Временем', () => {
    const state = freshState('evp-sd-move');
    state.meta.selfDestructTrackPosition = 3;

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.selfDestructTrackPosition).toBe(4);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'TIME_TRACK_ADVANCED', selfDestructTrackPosition: 4 }),
    );
  });

  it('жёлтая зона Самоуничтожения (>=6) автоматически разблокирует все Капсулы', () => {
    const state = freshState('evp-sd-unlock');
    state.meta.selfDestructTrackPosition = 5;
    expect(Object.values(state.ship.escapePods).every((pod) => pod.isLocked)).toBe(true);

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.selfDestructTrackPosition).toBe(6);
    expect(Object.values(state.ship.escapePods).every((pod) => !pod.isLocked)).toBe(true);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'ESCAPE_PODS_UNLOCKED', cause: 'SELF_DESTRUCT' }),
    );
  });

  it('повторное прохождение зоны не дублирует журнал разблокировки', () => {
    const state = freshState('evp-sd-unlock-once');
    state.meta.selfDestructTrackPosition = 6;
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.selfDestructTrackPosition).toBe(7);
    expect(lastEvents(state).filter((event) => event.type === 'ESCAPE_PODS_UNLOCKED')).toHaveLength(0);
  });

  it('череп Самоуничтожения взрывает корабль: гибнут все, включая Анабиоз', () => {
    const state = freshState('evp-sd-explode', 2);
    state.meta.selfDestructTrackPosition = 7;
    state.players['player-2']!.isInHibernation = true;

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.selfDestructTrackPosition).toBe(8);
    expect(state.players['player-1']!.isDead).toBe(true);
    expect(state.players['player-2']!.isDead).toBe(true);
    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('SHIP_EXPLODED');
  });

  it('последнее красное поле Времени — гиперпрыжок: Анабиоз выживает', () => {
    const state = freshState('evp-hyperjump', 2);
    state.meta.timeTrackPosition = TIME_TRACK_LENGTH - 1;
    state.players['player-2']!.isInHibernation = true;

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.timeTrackPosition).toBe(TIME_TRACK_LENGTH);
    expect(state.players['player-1']!.isDead).toBe(true);
    expect(state.players['player-2']!.isDead).toBe(false);
    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('HYPERSPACE_JUMP');
  });

  it('взрыв имеет приоритет: при одновременном срабатывании партия кончается Самоуничтожением', () => {
    const state = freshState('evp-explode-first');
    state.meta.selfDestructTrackPosition = 7;
    state.meta.timeTrackPosition = TIME_TRACK_LENGTH - 1;

    advanceTimeAndSelfDestruct(state);

    expect(state.meta.gameOverReason).toBe('SHIP_EXPLODED');
  });
});

describe('Шаг 6 Фазы Событий: Урон от огня (стр. 10, 20, 25)', () => {
  it('каждый Чужой в горящем отсеке получает ровно 1 Рану', () => {
    const state = freshState('evp-fire-wound');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.ship.rooms[11]!.hasFire = true;
    stackToughness(state, 'IAT_SCRATCH_2');

    resolveFireDamage(state);

    const intruder = state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
    expect(intruder.woundsCount).toBe(1);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER', roomId: 11, intruderType: 'ADULT' }),
    );
  });

  it('накопленные Раны от Стойкости: гибель в огне с Останками и без атакующего', () => {
    const state = freshState('evp-fire-death');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.woundsCount = 2;
    state.ship.rooms[11]!.hasFire = true;
    stackToughness(state, 'IAT_SCRATCH_2');

    resolveFireDamage(state);

    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)).toBeUndefined();
    expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(0);
    expect(state.ship.rooms[11]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(true);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'INTRUDER_KILLED', playerId: null, targetIntruderId: intruderId }),
    );
  });

  it('Личинка гибнет от огня без Останков', () => {
    const state = freshState('evp-fire-larva');
    const larvaId = putIntruder(state, 'LARVA', 11);
    state.ship.rooms[11]!.hasFire = true;

    resolveFireDamage(state);

    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === larvaId)).toBeUndefined();
    expect(state.ship.rooms[11]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(false);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'INTRUDER_KILLED', playerId: null, targetType: 'LARVA' }),
    );
  });

  it('стрелка Отступления: Чужой отступает по карте События, атакующего нет', () => {
    const state = freshState('evp-fire-retreat');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.ship.rooms[11]!.hasFire = true;
    stackToughness(state, 'IAT_BITE_2');
    stackEvents(state, 'EVT_HUNT_2');

    resolveFireDamage(state);

    const intruder = state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
    expect(intruder.roomId).toBe(8);
    expect(lastEvents(state)).toContainEqual(
      expect.objectContaining({ type: 'INTRUDER_RETREATED', playerId: null, roomId: 11 }),
    );
  });

  it('огонь уничтожает одно Яйцо на полу отсека после Чужих', () => {
    const state = freshState('evp-fire-egg');
    state.ship.rooms[11]!.hasFire = true;
    state.ship.rooms[11]!.objects.push({ id: 'egg-floor-1', kind: 'EGG' }, { id: 'egg-floor-2', kind: 'EGG' });

    resolveFireDamage(state);

    const eggIds = state.ship.rooms[11]!.objects.filter((object) => object.kind === 'EGG').map((o) => o.id);
    expect(eggIds).toHaveLength(1);
    expect(lastEvents(state)).toContainEqual(expect.objectContaining({ type: 'EGG_DESTROYED_BY_FIRE', roomId: 11 }));
  });

  it('отсеки без огня не трогают ни Чужих, ни Яйца', () => {
    const state = freshState('evp-fire-none');
    const intruderId = putIntruder(state, 'ADULT', 12);
    state.ship.rooms[12]!.objects.push({ id: 'egg-cold', kind: 'EGG' });

    resolveFireDamage(state);

    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.woundsCount).toBe(0);
    expect(state.ship.rooms[12]!.objects).toHaveLength(1);
    expect(lastEvents(state).some((event) => event.type === 'FIRE_DAMAGE_TAKEN_BY_INTRUDER')).toBe(false);
  });
});

describe('Оркестратор Фазы Событий: порядок Шагов книги правил (стр. 10)', () => {
  it('полный цикл: счётчики, атаки, карта Событий, Развитие Улья и новый раунд без застревания фазы', () => {
    const state = freshState('evp-orchestrator');
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.ship.rooms[11]!.hasFire = true;
    stackToughness(state, 'IAT_SCRATCH_2');
    // Персонаж вне отсека с Чужим: Боя нет, атака Шага 5 не вносит недетерминизм
    state.players['player-1']!.roomId = 12;
    state.meta.currentRound = 1;
    state.meta.phase = 'EVENT_PHASE';

    runEventPhase(state);

    const types = lastEvents(state).map((event) => event.type);
    expect(state.meta.phase).toBe('PLAYER_PHASE');
    expect(state.meta.currentRound).toBe(2);
    expect(state.meta.timeTrackPosition).toBe(1);
    expect(types.indexOf('TIME_TRACK_ADVANCED')).toBeLessThan(types.indexOf('HIVE_DEVELOPMENT_RESOLVED'));
    expect(types.indexOf('EVENT_CARD_DRAWN')).toBeLessThan(types.indexOf('HIVE_DEVELOPMENT_RESOLVED'));
    expect(types.indexOf('HIVE_DEVELOPMENT_RESOLVED')).toBeLessThan(types.indexOf('ROUND_STARTED'));
    expect(types).toContain('FIRE_DAMAGE_TAKEN_BY_INTRUDER');
    expect(types).toContain('EVENT_CARD_DRAWN');
    expect(types).toContain('ROUND_STARTED');
    expect(state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.woundsCount).toBe(1);
  });

  it('аварийный исход Шага 4 завершает партию: Шаги 5-9 не исполняются', () => {
    const state = freshState('evp-orchestrator-explode');
    state.meta.selfDestructTrackPosition = 7;
    state.meta.phase = 'EVENT_PHASE';

    runEventPhase(state);

    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('SHIP_EXPLODED');
    const types = lastEvents(state).map((event) => event.type);
    expect(types).toContain('TIME_TRACK_ADVANCED');
    expect(types).not.toContain('HIVE_DEVELOPMENT_RESOLVED');
    expect(types).not.toContain('ROUND_STARTED');
  });

  it('эффект карты Событий, уничтожающий корабль, останавливает фазу до Развития Улья', () => {
    const state = freshState('evp-orchestrator-burn');
    stackEvents(state, 'EVT_DESTRUCTIVE_FLAME');
    // Восемь маркеров Пожара — весь запас: распространение огня взрывает корабль.
    for (const roomId of [2, 3, 4, 5, 6, 7, 8, 9]) state.ship.rooms[roomId]!.hasFire = true;
    state.meta.phase = 'EVENT_PHASE';

    runEventPhase(state);

    expect(state.meta.phase).toBe('GAME_OVER');
    const types = lastEvents(state).map((event) => event.type);
    expect(types).toContain('EVENT_CARD_DRAWN');
    expect(types).not.toContain('HIVE_DEVELOPMENT_RESOLVED');
    expect(types).not.toContain('ROUND_STARTED');
  });
});
