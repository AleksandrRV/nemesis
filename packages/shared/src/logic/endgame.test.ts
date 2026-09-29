import { describe, expect, it } from 'vitest';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
} from '../data/objectiveCards.js';
import { SELF_DESTRUCT_EXPLODES_AT } from '../data/evacuation.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { ActionDeckCard, ObjectiveCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { endGame } from './gameEnd.js';
import { FINAL_INFECTION_DRAW } from './endgame.js';
import { filterStateForPlayer } from './sanitizer.js';
import { createInitialGameState } from './setup.js';

const objective = (id: string): ObjectiveCard =>
  structuredClone(
    [...PERSONAL_OBJECTIVE_CARDS, ...CORPORATE_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS].find(
      (card) => card.id === id,
    )!,
  );

function table(seed: string, playerCount = 2): GameState {
  const state = createInitialGameState(seed, { playerCount });
  for (const engine of Object.values(state.ship.engines)) engine.isWorking = true;
  state.ship.coordinates = { cardId: 'COORDINATES_5', currentCourseMarker: 'B' };
  for (const player of Object.values(state.players)) {
    player.objectives = [objective('OBJ_PERSONAL_SAVE_PROPERTY')];
  }
  return state;
}

function leaveBoard(state: GameState, playerId: string, route: 'POD' | 'HIBERNATION'): void {
  const player = state.players[playerId]!;
  const room = state.ship.rooms[player.roomId]!;
  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
  if (route === 'POD') player.hasEscapedInPod = true;
  else player.isInHibernation = true;
}

function result(state: GameState, playerId: string) {
  return state.endgame!.characters.find((entry) => entry.playerId === playerId)!;
}

const contamination = (id: string, isInfected: boolean): ActionDeckCard => ({ id, isInfected, isScanned: false });

describe('Финальный Валидатор: судьба корабля (стр. 11)', () => {
  it('гиперпрыжок: оставшиеся на борту гибнут, Анабиоз и Капсула доходят до проверок', () => {
    const state = table('endgame-jump', 3);
    leaveBoard(state, 'player-2', 'HIBERNATION');
    leaveBoard(state, 'player-3', 'POD');
    state.meta.timeTrackPosition = TIME_TRACK_LENGTH;

    endGame(state, 'HYPERSPACE_JUMP');

    expect(state.endgame!.characters.map((entry) => entry.death)).toEqual(['LEFT_ON_BOARD', null, null]);
    expect(state.endgame!.engineCheck).toMatchObject({ failedCount: 0, shipExploded: false });
    expect(state.endgame!.courseCheck).toMatchObject({ destination: 'EARTH', courseMarker: 'B' });
    expect(state.endgame!.characters.filter((entry) => entry.isWinner).map((entry) => entry.playerId)).toEqual([
      'player-2',
      'player-3',
    ]);
  });

  it('никого не осталось без Самоуничтожения: маркер Времени — на последнее поле, прыжок', () => {
    const state = table('endgame-no-active');
    leaveBoard(state, 'player-1', 'HIBERNATION');
    leaveBoard(state, 'player-2', 'POD');

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(state.meta.timeTrackPosition).toBe(TIME_TRACK_LENGTH);
    expect(state.endgame).toMatchObject({ finalMarker: 'TIME', shipDestroyed: false, destinationReached: 'EARTH' });
  });

  it('никого не осталось при запущенном Самоуничтожении: череп, взрыв убивает и Анабиоз', () => {
    const state = table('endgame-no-active-sd');
    state.meta.selfDestructTrackPosition = 4;
    leaveBoard(state, 'player-1', 'HIBERNATION');
    leaveBoard(state, 'player-2', 'POD');

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(state.meta.selfDestructTrackPosition).toBe(SELF_DESTRUCT_EXPLODES_AT);
    expect(state.endgame).toMatchObject({ finalMarker: 'SELF_DESTRUCT', shipDestroyed: true, engineCheck: null });
    expect(result(state, 'player-1').death).toBe('SHIP_DESTROYED');
    expect(result(state, 'player-2').death).toBeNull();
  });

  it('взрыв корабля: без Проверок Двигателей и Курса, Королева на поле считается убитой', () => {
    const state = table('endgame-explosion');
    leaveBoard(state, 'player-2', 'POD');
    state.intrudersPool.boardTokens.push({ id: 'queen-x', type: 'QUEEN', roomId: 3, woundsCount: 0 });
    state.players['player-2']!.hasSignalSent = true;
    state.players['player-2']!.objectives = [objective('OBJ_PERSONAL_BIG_HUNT')];

    endGame(state, 'SHIP_EXPLODED');

    expect(state.endgame).toMatchObject({ shipDestroyed: true, engineCheck: null, courseCheck: null });
    expect(state.endgame!.facts.queenKilled).toBe(true);
    expect(result(state, 'player-2').objectiveResults[0]!.metConditionIndex).toBe(0);
  });

  it('повторный вызов окончания игры не перезаписывает итоги', () => {
    const state = table('endgame-twice');
    leaveBoard(state, 'player-1', 'POD');
    endGame(state, 'NO_ACTIVE_CHARACTERS');
    const report = structuredClone(state.endgame);

    endGame(state, 'SHIP_EXPLODED');

    expect(state.endgame).toEqual(report);
    expect(state.meta.gameOverReason).toBe('NO_ACTIVE_CHARACTERS');
  });
});

describe('Проверки Двигателей и Курса (стр. 11, шаги 1–2)', () => {
  it('2 Неисправных Двигателя из 3: корабль взрывается, Анабиоз гибнет, Капсула — нет', () => {
    const state = table('endgame-engines');
    state.ship.engines[1].isWorking = false;
    state.ship.engines[3].isWorking = false;
    leaveBoard(state, 'player-1', 'HIBERNATION');
    leaveBoard(state, 'player-2', 'POD');

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(state.endgame!.engineCheck).toEqual({
      engines: { 1: false, 2: true, 3: false },
      failedCount: 2,
      shipExploded: true,
    });
    expect(state.endgame!.courseCheck).toBeNull();
    expect(result(state, 'player-1').death).toBe('ENGINES_FAILED');
    expect(result(state, 'player-2').death).toBeNull();
    expect(state.endgame!.shipDestroyed).toBe(true);
  });

  it('1 Неисправный Двигатель корабль не взрывает', () => {
    const state = table('endgame-one-engine');
    state.ship.engines[2].isWorking = false;
    leaveBoard(state, 'player-1', 'HIBERNATION');

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(state.endgame!.engineCheck).toMatchObject({ failedCount: 1, shipExploded: false });
    expect(result(state, 'player-1').death).toBeNull();
  });

  it('Курс не на Землю: Анабиоз гибнет, кроме владельца «Карантина» при Марсе', () => {
    const state = table('endgame-mars', 3);
    state.ship.coordinates = { cardId: 'COORDINATES_5', currentCourseMarker: 'D' };
    leaveBoard(state, 'player-1', 'HIBERNATION');
    leaveBoard(state, 'player-2', 'HIBERNATION');
    leaveBoard(state, 'player-3', 'POD');
    state.players['player-2']!.objectives = [objective('OBJ_PERSONAL_QUARANTINE')];

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(state.endgame!.courseCheck!.destination).toBe('MARS');
    expect(result(state, 'player-1').death).toBe('WRONG_COORDINATES');
    expect(result(state, 'player-2')).toMatchObject({ death: null, isWinner: true });
    expect(result(state, 'player-3').death).toBeNull();
  });
});

describe('Проверка Заражения (стр. 11, шаг 3)', () => {
  it('без ИНФЕКЦИИ и Личинки: только сканирование, карты не тянутся', () => {
    const state = table('endgame-clean');
    leaveBoard(state, 'player-1', 'POD');
    state.players['player-1']!.actionDeck.discard.push(contamination('C-1', false));

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(result(state, 'player-1').infection).toEqual({
      hadLarva: false,
      scannedCount: 1,
      infectedFound: false,
      drawn: null,
      survived: true,
    });
  });

  it('ИНФЕКЦИЯ найдена: колода замешивается, 4 карты; карта Заражения среди них — гибель', () => {
    const state = table('endgame-infected');
    leaveBoard(state, 'player-1', 'POD');
    const deck = state.players['player-1']!.actionDeck;
    deck.hand = [];
    deck.discard = [];
    deck.drawPile = [
      contamination('I-1', true),
      ...Array.from({ length: 6 }, (_, i) => contamination(`C-${i}`, false)),
    ];
    const cardsBefore = state.meta.rngDraws.cards;

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    const check = result(state, 'player-1');
    expect(check.infection).toMatchObject({ infectedFound: true, survived: false });
    expect(check.infection!.drawn).toHaveLength(FINAL_INFECTION_DRAW);
    expect(check.death).toBe('INFECTION');
    expect(check.objectiveResults).toEqual([]);
    expect(state.meta.rngDraws.cards).toBeGreaterThan(cardsBefore);
  });

  it('Личинка: сканирование пропускается, сразу 4 карты; без Заражения среди них — выжил', () => {
    const state = table('endgame-larva');
    leaveBoard(state, 'player-1', 'POD');
    const player = state.players['player-1']!;
    player.hasLarva = true;
    player.actionDeck.discard.push(contamination('I-1', true));
    player.actionDeck.hand = player.actionDeck.hand.filter((card) => 'characterClass' in card);
    player.actionDeck.discard = [];

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(result(state, 'player-1').infection).toEqual({
      hadLarva: true,
      scannedCount: 0,
      infectedFound: false,
      drawn: ['ACTION', 'ACTION', 'ACTION', 'ACTION'],
      survived: true,
    });
  });

  it('расклад проверки воспроизводим по сиду', () => {
    const run = () => {
      const state = table('endgame-seeded');
      leaveBoard(state, 'player-1', 'POD');
      state.players['player-1']!.hasLarva = true;
      state.players['player-1']!.actionDeck.discard.push(contamination('I-1', true), contamination('I-2', false));
      endGame(state, 'NO_ACTIVE_CHARACTERS');
      return state.endgame;
    };
    expect(run()).toEqual(run());
  });
});

describe('Проверка Целей (стр. 11, шаг 4)', () => {
  it('«Выждать момент для атаки»: Игрок 1 не выжил — победа второго', () => {
    const state = table('endgame-bide');
    leaveBoard(state, 'player-2', 'POD');
    state.players['player-2']!.objectives = [objective('OBJ_CORPORATE_BIDE_YOUR_TIME')];
    state.players['player-1']!.isDead = true;

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(result(state, 'player-1').death).toBe('DIED_DURING_GAME');
    expect(result(state, 'player-2')).toMatchObject({ isWinner: true });
    expect(result(state, 'player-2').objectiveResults[0]!.metConditionIndex).toBe(0);
  });

  it('без Первого Контакта обе Цели на руках: хватает любой из двух (решение владельца)', () => {
    const state = table('endgame-two');
    leaveBoard(state, 'player-1', 'POD');
    state.players['player-1']!.objectives = [
      objective('OBJ_CORPORATE_AB_OVO'),
      objective('OBJ_PERSONAL_SAVE_PROPERTY'),
    ];

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(result(state, 'player-1').objectiveResults.map((entry) => entry.metConditionIndex)).toEqual([null, 0]);
    expect(result(state, 'player-1').isWinner).toBe(true);
  });

  it('«Хламовщик» требует Капсулы и 7 Предметов; «Моя прелесть» — Сигнала и Яйца в руках', () => {
    const state = table('endgame-items');
    leaveBoard(state, 'player-1', 'POD');
    leaveBoard(state, 'player-2', 'HIBERNATION');
    const scavenger = state.players['player-1']!;
    scavenger.objectives = [objective('OBJ_PERSONAL_SCAVENGER')];
    const item = scavenger.handSlots.find((slot) => slot.source === 'ITEM')!;
    if (item.source !== 'ITEM') throw new Error('Нужен Предмет в руке');
    scavenger.inventory = Array.from({ length: 6 }, (_, i) => ({ ...item.card, id: `copy-${i}` }));
    const precious = state.players['player-2']!;
    precious.objectives = [objective('OBJ_CORPORATE_MY_PRECIOUS')];
    precious.hasSignalSent = true;
    precious.handSlots = [{ source: 'OBJECT', object: { id: 'egg-1', kind: 'EGG' } }];

    endGame(state, 'NO_ACTIVE_CHARACTERS');

    expect(result(state, 'player-1').isWinner).toBe(true);
    expect(result(state, 'player-2').isWinner).toBe(true);
  });

  it('проигравший тоже видит вскрытые Цели выживших; Цели погибших остаются скрыты', () => {
    const state = table('endgame-reveal');
    leaveBoard(state, 'player-2', 'POD');
    state.players['player-1']!.isDead = true;

    endGame(state, 'NO_ACTIVE_CHARACTERS');
    const view = filterStateForPlayer(state, 'player-1');

    expect(view.endgame!.characters[1]!.objectiveResults[0]!.objective.name).toBe('Сохранить имущество');
    expect(view.endgame!.characters[0]!.objectiveResults).toEqual([]);
    expect(view.players['player-2']!.objectives).toBeNull();
  });
});
