import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { EventCard } from '../types/cards.js';
import type { EventEffectOutcome } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { expectEngineError, putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { resolveEventCardEffect } from './eventEffects.js';
import { executeRoomAbility } from './roomAbilities.js';
import { createInitialGameState } from './setup.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

function cardById(cardId: string): EventCard {
  const card = EVENT_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Неизвестная карта Событий: ${cardId}`);
  return card;
}

/** Запускает эффект и возвращает итог из последней записи журнала. */
function outcome(state: GameState, cardId: string): EventEffectOutcome {
  resolveEventCardEffect(state, cardById(cardId));
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === 'EVENT_EFFECT_RESOLVED');
  if (!entry || entry.event.type !== 'EVENT_EFFECT_RESOLVED') throw new Error('EVENT_EFFECT_RESOLVED не в журнале');
  return entry.event.outcome;
}

function noisePlacedEvents(state: GameState) {
  return state.gameLog.flatMap((entry) => (entry.event.type === 'NOISE_MARKER_PLACED' ? [entry.event] : []));
}

describe('Шаг 7б Фазы Событий: текстовые эффекты карт (стр. 10, 26)', () => {
  it('результат эффекта публикуется записью журнала с номером раунда', () => {
    const state = freshState('fx-log');
    state.meta.currentRound = 3;

    outcome(state, 'EVT_REGENERATION');

    const entry = state.gameLog.find((candidate) => candidate.event.type === 'EVENT_EFFECT_RESOLVED')!;
    expect(entry.event.type === 'EVENT_EFFECT_RESOLVED' && entry.event.round).toBe(3);
  });

  describe('Охота', () => {
    it('Взрослые вне Боя идут в соседний отсек с Персонажем', () => {
      const state = freshState('dump'); // seed 'dump': комната 6 соединена с 7 и 11
      putPlayer(state, 'player-1', 6);
      const fromSeven = putIntruder(state, 'ADULT', 7);
      const fromEleven = putIntruder(state, 'ADULT', 11);

      const result = outcome(state, 'EVT_HUNT_1');

      expect(result).toEqual({ kind: 'HUNT', movedIntruderIds: [fromSeven, fromEleven] });
      expect(state.ship.rooms[6]!.occupantIntruderIds.sort()).toEqual([fromEleven, fromSeven].sort());
      expect(state.ship.rooms[7]!.occupantIntruderIds).toHaveLength(0);
      const moves = state.gameLog.flatMap((entry) => (entry.event.type === 'INTRUDER_MOVED' ? [entry.event] : []));
      expect(moves).toHaveLength(2);
      expect(moves.every((move) => move.toRoomId === 6)).toBe(true);
    });

    it('при выборе между двумя Персонажами — отсек с наименьшим номером', () => {
      const state = freshState('dump2', 2); // комнаты 2 и 7 — соседи отсека 6
      putPlayer(state, 'player-1', 2);
      putPlayer(state, 'player-2', 7);
      const adultId = putIntruder(state, 'ADULT', 6);

      const result = outcome(state, 'EVT_HUNT_2');

      expect(result).toEqual({ kind: 'HUNT', movedIntruderIds: [adultId] });
      expect(state.ship.rooms[2]!.occupantIntruderIds).toContain(adultId);
      expect(state.ship.rooms[7]!.occupantIntruderIds).toHaveLength(0);
    });

    it('Закрытая Дверь не пропускает преследователя', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 7);
      state.ship.corridors['6-7']!.doorState = 'CLOSED';
      const blockedId = putIntruder(state, 'ADULT', 6);
      const freeId = putIntruder(state, 'ADULT', 3); // Коридор 3-7 открыт

      const result = outcome(state, 'EVT_HUNT_1');

      expect(result).toEqual({ kind: 'HUNT', movedIntruderIds: [freeId] });
      expect(state.ship.rooms[6]!.occupantIntruderIds).toContain(blockedId);
    });

    it('Взрослая в отсеке с Персонажем (в Бою) не двигается', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 6);
      const engagedId = putIntruder(state, 'ADULT', 6);

      const result = outcome(state, 'EVT_HUNT_2');

      expect(result).toEqual({ kind: 'HUNT', movedIntruderIds: [] });
      expect(state.ship.rooms[6]!.occupantIntruderIds).toContain(engagedId);
    });
  });

  describe('Защита кладки', () => {
    it('Персонаж в Улье получает Контакт от карты События', () => {
      const state = freshState('dump'); // seed 'dump': Улей — комната 3
      putPlayer(state, 'player-1', 3);

      const result = outcome(state, 'EVT_PROTECT_NEST');

      expect(result).toEqual({ kind: 'PROTECT_NEST', contactPlayerIds: ['player-1'] });
      expect(state.interruptQueue).toEqual([
        { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 3, source: 'EVENT' },
      ]);
    });

    it('несущий Яйцо получает Контакт вне зависимости от комнаты', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 6);
      state.players['player-1']!.handSlots.push({ source: 'OBJECT', object: { id: 'egg-x', kind: 'EGG' } });

      const result = outcome(state, 'EVT_PROTECT_NEST');

      expect(result).toEqual({ kind: 'PROTECT_NEST', contactPlayerIds: ['player-1'] });
      expect(state.interruptQueue[0]!.type).toBe('CONTACT_INTERRUPT');
    });

    it('в пустом Улье и без Яиц на руках ничего не происходит', () => {
      const state = freshState('dump');

      const result = outcome(state, 'EVT_PROTECT_NEST');

      expect(result).toEqual({ kind: 'PROTECT_NEST', contactPlayerIds: [] });
      expect(state.interruptQueue).toHaveLength(0);
    });
  });

  describe('Выводок', () => {
    it('Яйцо сбрасывается с Планшета, Личинка уходит в мешок', () => {
      const state = freshState('dump');
      const larvaBefore = state.intrudersPool.bag.filter((token) => token.type === 'LARVA').length;

      const result = outcome(state, 'EVT_BROOD');

      expect(state.intrudersPool.eggsOnBoard).toBe(4);
      expect(result).toEqual({ kind: 'BROOD', eggDiscarded: true, infectedPlayerIds: [], larvaAddedToBag: true });
      expect(state.intrudersPool.bag.filter((token) => token.type === 'LARVA')).toHaveLength(larvaBefore + 1);
    });

    it('пусторукий Персонаж в Улье тянет карту Заражения, Личинка в мешок не кладётся', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 3);
      state.players['player-1']!.actionDeck.hand = [];
      const contaminationBefore = state.decks.contamination.drawPile.length;

      const result = outcome(state, 'EVT_BROOD');

      expect(result).toEqual({
        kind: 'BROOD',
        eggDiscarded: true,
        infectedPlayerIds: ['player-1'],
        larvaAddedToBag: false,
      });
      expect(state.decks.contamination.drawPile).toHaveLength(contaminationBefore - 1);
      expect(state.players['player-1']!.actionDeck.discard).toHaveLength(1);
    });

    it('Персонаж в Улье с картами на руке избегает Заражения', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 3);
      expect(state.players['player-1']!.actionDeck.hand.length).toBeGreaterThan(0);

      const result = outcome(state, 'EVT_BROOD');

      expect(result).toMatchObject({ infectedPlayerIds: [], larvaAddedToBag: true });
    });
  });

  describe('Регенерация', () => {
    it('каждый Чужой на поле сбрасывает до 2 Ран', () => {
      const state = freshState('dump');
      const threeWounds = putIntruder(state, 'ADULT', 6);
      const oneWound = putIntruder(state, 'CREEPER', 13);
      const healthy = putIntruder(state, 'ADULT', 8);
      state.intrudersPool.boardTokens.find((token) => token.id === threeWounds)!.woundsCount = 3;
      state.intrudersPool.boardTokens.find((token) => token.id === oneWound)!.woundsCount = 1;

      const result = outcome(state, 'EVT_REGENERATION');

      expect(result).toEqual({ kind: 'REGENERATION', healedIntruderIds: [threeWounds, oneWound], woundsRemoved: 3 });
      expect(state.intrudersPool.boardTokens.find((token) => token.id === threeWounds)!.woundsCount).toBe(1);
      expect(state.intrudersPool.boardTokens.find((token) => token.id === oneWound)!.woundsCount).toBe(0);
      expect(state.intrudersPool.boardTokens.find((token) => token.id === healthy)!.woundsCount).toBe(0);
    });
  });

  describe('Затаившиеся', () => {
    it('все Чужие вне Боя сняты с поля, их жетоны возвращаются в Пул, Чужие в Бою остаются', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 11);
      const hiddenId = putIntruder(state, 'ADULT', 6);
      const hiddenCreeper = putIntruder(state, 'CREEPER', 13);
      const engagedId = putIntruder(state, 'ADULT', 11);
      const bagCount = (type: string) => state.intrudersPool.bag.filter((token) => token.type === type).length;
      const adultsBefore = bagCount('ADULT');
      const creepersBefore = bagCount('CREEPER');

      const result = outcome(state, 'EVT_HIDDEN');

      expect(result).toEqual({ kind: 'HIDDEN', withdrawnIntruderIds: [hiddenId, hiddenCreeper] });
      expect(state.intrudersPool.boardTokens.map((token) => token.id)).toEqual([engagedId]);
      expect(state.ship.rooms[6]!.occupantIntruderIds).toHaveLength(0);
      expect(state.ship.rooms[13]!.occupantIntruderIds).toHaveLength(0);
      expect(bagCount('ADULT')).toBe(adultsBefore + 1);
      expect(bagCount('CREEPER')).toBe(creepersBefore + 1);
    });
  });

  describe('Созревание', () => {
    it('носитель Личинки гибнет со спавном Крипера, выжившие сканируются на ИНФЕКЦИЮ', () => {
      const state = freshState('dump2', 2); // оба персонажа в отсеке 11
      state.players['player-1']!.hasLarva = true;
      const infectedCards = state.decks.contamination.drawPile.filter((card) => card.isInfected);
      const cleanCards = state.decks.contamination.drawPile.filter((card) => !card.isInfected);
      state.decks.contamination.drawPile = [...infectedCards, ...cleanCards];

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toEqual({
        kind: 'MATURATION',
        deadPlayerIds: ['player-1'],
        creeperRoomIds: [11],
        scannedPlayerIds: ['player-2'],
        infectedPlayerIds: ['player-2'],
      });
      expect(state.players['player-1']!.isDead).toBe(true);
      expect(state.players['player-1']!.hasLarva).toBe(false);
      expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(1);
      const creeper = state.intrudersPool.boardTokens.find((token) => token.roomId === 11 && token.type === 'CREEPER');
      expect(creeper).toBeDefined();
      expect(state.players['player-2']!.hasLarva).toBe(true);
      expect(state.decks.contamination.discard).toHaveLength(4);
      expect(state.decks.contamination.drawPile).toHaveLength(23);
    });

    it('без носителей Личинки и без ИНФЕКЦИИ в четырёх картах никто не заражается', () => {
      const state = freshState('dump2', 2);
      const infectedCards = state.decks.contamination.drawPile.filter((card) => card.isInfected);
      const cleanCards = state.decks.contamination.drawPile.filter((card) => !card.isInfected);
      state.decks.contamination.drawPile = [...cleanCards, ...infectedCards];

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toEqual({
        kind: 'MATURATION',
        deadPlayerIds: [],
        creeperRoomIds: [],
        scannedPlayerIds: ['player-1', 'player-2'],
        infectedPlayerIds: [],
      });
      expect(state.decks.contamination.discard).toHaveLength(8);
    });
  });

  describe('Разгром', () => {
    it('Неисправность получает каждый отсек с крупным Чужим', () => {
      const state = freshState('dump');
      putIntruder(state, 'ADULT', 6);
      putIntruder(state, 'BREEDER', 13);
      putIntruder(state, 'CREEPER', 8); // мелкие не считаются

      const result = outcome(state, 'EVT_RAMPAGE');

      expect(result).toEqual({ kind: 'RAMPAGE', malfunctionRoomIds: [6, 13] });
      expect(state.ship.rooms[6]!.hasMalfunction).toBe(true);
      expect(state.ship.rooms[13]!.hasMalfunction).toBe(true);
      expect(state.ship.rooms[8]!.hasMalfunction).toBe(false);
    });

    it('исчерпанный запас жетонов Неисправности ведёт к Разрыву Обшивки', () => {
      const state = freshState('dump');
      for (const roomId of [2, 4, 5, 6, 7, 8, 9, 10]) state.ship.rooms[roomId]!.hasMalfunction = true;
      putIntruder(state, 'ADULT', 12);

      outcome(state, 'EVT_RAMPAGE');

      expect(state.meta.phase).toBe('GAME_OVER');
    });
  });

  describe('Запах добычи', () => {
    it('Шум в каждый пустой Коридор отсеков с Персонажами со Слизью, общие Коридоры не дублируются', () => {
      const state = freshState('dump2', 2);
      putPlayer(state, 'player-1', 11);
      putPlayer(state, 'player-2', 6);
      state.players['player-1']!.hasSlime = true;
      state.players['player-2']!.hasSlime = true;

      const result = outcome(state, 'EVT_PREY_SCENT');

      // Отсеки по возрастанию: сначала Коридоры отсека 6, затем отсека 11 (общий 6-11 — один раз)
      const expected = ['2-6', '3-6', '5-6', '6-7', '6-11', '8-11', '11-14', '11-15'];
      expect(result).toEqual({ kind: 'PREY_SCENT', noiseCorridorIds: expected });
      for (const corridorId of expected) {
        expect(state.ship.corridors[corridorId]!.hasNoise).toBe(true);
      }
      const events = noisePlacedEvents(state);
      expect(events).toHaveLength(8);
      expect(events.every((event) => event.playerId === null && event.reason === 'EVENT')).toBe(true);
    });

    it('без Персонажей со Слизью маркеры не размещаются', () => {
      const state = freshState('dump');

      const result = outcome(state, 'EVT_PREY_SCENT');

      expect(result).toEqual({ kind: 'PREY_SCENT', noiseCorridorIds: [] });
      expect(noisePlacedEvents(state)).toHaveLength(0);
    });
  });

  describe('Шум в технических коридорах', () => {
    it('первый раз маркер ставится на поле вентиляции', () => {
      const state = freshState('dump');

      const result = outcome(state, 'EVT_NOISE_TECH_CORRIDORS');

      expect(result).toEqual({ kind: 'NOISE_TECH_CORRIDORS', markerPlaced: true, rolledPlayerIds: [] });
      expect(state.ship.technicalCorridorNoise).toBe(true);
    });

    it('при занятом поле вентиляции Персонажи у входов бросают кубик Шума', () => {
      const state = freshState('dump2', 2);
      state.ship.technicalCorridorNoise = true;
      putPlayer(state, 'player-1', 4); // у обоих отсеков есть вход в тех. коридоры
      putPlayer(state, 'player-2', 2);

      const result = outcome(state, 'EVT_NOISE_TECH_CORRIDORS');

      expect(result).toEqual({
        kind: 'NOISE_TECH_CORRIDORS',
        markerPlaced: false,
        rolledPlayerIds: ['player-2', 'player-1'],
      });
      expect(state.interruptQueue).toEqual([
        { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-2', roomId: 2, noise: { kind: 'ROLL' } },
        { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 4, noise: { kind: 'ROLL' } },
      ]);
    });
  });

  describe('Улей', () => {
    it('неисследованный Улей не шумит', () => {
      const state = freshState('dump');

      const result = outcome(state, 'EVT_HIVE');

      expect(result).toEqual({ kind: 'HIVE', noiseCorridorIds: [], nestExplored: false });
      expect(noisePlacedEvents(state)).toHaveLength(0);
    });

    it('исследованный Улей получает Шум во все свои Коридоры', () => {
      const state = freshState('dump');
      state.ship.rooms[3]!.isExplored = true;

      const result = outcome(state, 'EVT_HIVE');

      expect(result).toEqual({ kind: 'HIVE', noiseCorridorIds: ['1-3', '3-6', '3-7'], nestExplored: true });
      expect(['1-3', '3-6', '3-7'].every((corridorId) => state.ship.corridors[corridorId]!.hasNoise)).toBe(true);
    });
  });

  describe('Воспламеняемый раствор', () => {
    it('первый раз маркер Пожара ложится в Криогенный Отсек', () => {
      const state = freshState('dump'); // seed 'dump': Криогенный Отсек — комната 11

      const result = outcome(state, 'EVT_FLAMMABLE_MIXTURE');

      expect(result).toEqual({ kind: 'FLAMMABLE_MIXTURE', fireRoomIds: [11], spread: false });
      expect(state.ship.rooms[11]!.hasFire).toBe(true);
    });

    it('повторно огонь распространяется в соседние отсеки, но не через Закрытую Дверь', () => {
      const state = freshState('dump');
      state.ship.rooms[11]!.hasFire = true;
      state.ship.corridors['6-11']!.doorState = 'CLOSED';

      const result = outcome(state, 'EVT_FLAMMABLE_MIXTURE');

      expect(result).toEqual({ kind: 'FLAMMABLE_MIXTURE', fireRoomIds: [8, 14, 15], spread: true });
      expect(state.ship.rooms[6]!.hasFire).toBe(false);
      expect([8, 14, 15].every((roomId) => state.ship.rooms[roomId]!.hasFire)).toBe(true);
    });
  });

  describe('Разрушающее пламя', () => {
    it('горящие отсеки ломаются, затем огонь расползается по открытым Коридорам', () => {
      const state = freshState('dump');
      state.ship.rooms[11]!.hasFire = true;
      state.ship.rooms[14]!.hasFire = true;

      const result = outcome(state, 'EVT_DESTRUCTIVE_FLAME');

      expect(result).toEqual({
        kind: 'DESTRUCTIVE_FLAME',
        malfunctionRoomIds: [11, 14],
        fireRoomIds: [6, 8, 15, 13, 17],
      });
      expect(state.ship.rooms[11]!.hasMalfunction).toBe(true);
      expect(state.ship.rooms[14]!.hasMalfunction).toBe(true);
      expect([6, 8, 15, 13, 17].every((roomId) => state.ship.rooms[roomId]!.hasFire)).toBe(true);
    });

    it('исчерпанный запас жетонов Пожара взрывает корабль', () => {
      const state = freshState('dump');
      for (const roomId of [2, 3, 4, 5, 6, 7, 8, 9]) state.ship.rooms[roomId]!.hasFire = true;
      state.ship.rooms[11]!.hasFire = true; // 9-й маркер невозможен — пожар с распространением

      outcome(state, 'EVT_DESTRUCTIVE_FLAME');

      expect(state.meta.phase).toBe('GAME_OVER');
    });

    it('уже неисправный горящий отсек не попадает в итог', () => {
      const state = freshState('dump');
      state.ship.rooms[11]!.hasFire = true;
      state.ship.rooms[11]!.hasMalfunction = true;

      const result = outcome(state, 'EVT_DESTRUCTIVE_FLAME');

      expect(result).toMatchObject({ kind: 'DESTRUCTIVE_FLAME', malfunctionRoomIds: [] });
    });
  });

  describe('Катапультирование капсулы', () => {
    it('уничтожается Капсула с наименьшим номером', () => {
      const state = freshState('dump'); // POD_A3 №3, POD_B4 №4

      const first = outcome(state, 'EVT_ESCAPE_POD_EJECTION');

      expect(first).toEqual({ kind: 'ESCAPE_POD_EJECTION', podId: 'POD_A3' });
      expect(state.ship.escapePods['POD_A3']!.isDestroyed).toBe(true);
      expect(state.ship.escapePods['POD_B4']!.isDestroyed).toBe(false);

      const second = outcome(state, 'EVT_ESCAPE_POD_EJECTION');
      expect(second).toEqual({ kind: 'ESCAPE_POD_EJECTION', podId: 'POD_B4' });

      const third = outcome(state, 'EVT_ESCAPE_POD_EJECTION');
      expect(third).toEqual({ kind: 'ESCAPE_POD_EJECTION', podId: null });
    });

    it('в разрушенную Капсулу нельзя сесть из посадочного отсека', () => {
      const state = freshState('dump'); // seed 'dump': Посадочный Отсек А — комната 9
      putPlayer(state, 'player-1', 9);
      state.ship.escapePods['POD_A3']!.isLocked = false;
      state.ship.escapePods['POD_A3']!.isDestroyed = true;

      expectEngineError(() => executeRoomAbility(state, 'player-1', {}), 'ROOM_ABILITY_NOT_ALLOWED');
    });
  });

  describe('Короткое замыкание', () => {
    it('Неисправность получают все жёлтые отсеки с Компьютером', () => {
      const state = freshState('dump'); // жёлтые с Компьютером: 4, 7, 12, 18

      const result = outcome(state, 'EVT_SHORT_CIRCUIT');

      expect(result).toEqual({ kind: 'SHORT_CIRCUIT', malfunctionRoomIds: [4, 7, 12, 18] });
      expect([4, 7, 12, 18].every((roomId) => state.ship.rooms[roomId]!.hasMalfunction)).toBe(true);
      expect(state.ship.rooms[8]!.hasMalfunction).toBe(false); // зелёная Столовая
    });
  });

  describe('Утечка охладителя', () => {
    it('неисправный Генератор взводит Самоуничтожение', () => {
      const state = freshState('dump'); // Генератор — комната 4
      state.ship.rooms[4]!.hasMalfunction = true;

      const result = outcome(state, 'EVT_COOLANT_LEAK');

      expect(result).toEqual({ kind: 'COOLANT_LEAK', selfDestructStarted: true });
      expect(state.meta.selfDestructTrackPosition).toBe(0);
    });

    it('исправный Генератор не запускает Самоуничтожение', () => {
      const state = freshState('dump');

      const result = outcome(state, 'EVT_COOLANT_LEAK');

      expect(result).toEqual({ kind: 'COOLANT_LEAK', selfDestructStarted: false });
      expect(state.meta.selfDestructTrackPosition).toBeNull();
    });
  });

  describe('Неполадка систем жизнеобеспечения', () => {
    it('Неисправность получают все зелёные отсеки', () => {
      const state = freshState('dump'); // зелёные: 8, 13, 14, 16, 17

      const result = outcome(state, 'EVT_LIFE_SUPPORT_MALFUNCTION');

      expect(result).toEqual({ kind: 'LIFE_SUPPORT_MALFUNCTION', malfunctionRoomIds: [8, 13, 14, 16, 17] });
      expect([8, 13, 14, 16, 17].every((roomId) => state.ship.rooms[roomId]!.hasMalfunction)).toBe(true);
    });
  });

  describe('Неисправность', () => {
    it('маркер ложится в исследованный отсек с наименьшим номером', () => {
      const state = freshState('dump'); // исследованы: 1, 11, 19, 20, 21

      const result = outcome(state, 'EVT_MALFUNCTION');

      expect(result).toEqual({ kind: 'MALFUNCTION', targetRoomId: 1 });
      expect(state.ship.rooms[1]!.hasMalfunction).toBe(true);
    });

    it('без исследованных отсеков маркеру некуда лечь', () => {
      const state = freshState('dump');
      for (const room of Object.values(state.ship.rooms)) room.isExplored = false;

      const result = outcome(state, 'EVT_MALFUNCTION');

      expect(result).toEqual({ kind: 'MALFUNCTION', targetRoomId: null });
      expect(Object.values(state.ship.rooms).some((room) => room.hasMalfunction)).toBe(false);
    });
  });

  describe('Открытие отсеков', () => {
    it('все Закрытые Двери открываются, Разрушенные не трогаются', () => {
      const state = freshState('dump');
      state.ship.corridors['1-2']!.doorState = 'CLOSED';
      state.ship.corridors['3-6']!.doorState = 'CLOSED';
      state.ship.corridors['1-3']!.doorState = 'DESTROYED';

      const result = outcome(state, 'EVT_OPEN_COMPARTMENTS');

      expect(result).toEqual({ kind: 'OPEN_COMPARTMENTS', openedCorridorIds: ['1-2', '3-6'] });
      expect(state.ship.corridors['1-2']!.doorState).toBe('OPEN');
      expect(state.ship.corridors['3-6']!.doorState).toBe('OPEN');
      expect(state.ship.corridors['1-3']!.doorState).toBe('DESTROYED');
    });
  });
});
