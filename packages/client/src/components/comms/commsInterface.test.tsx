import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GameEngine,
  createInitialGameState,
  filterStateForPlayer,
  type CommsDraft,
  type GameState,
} from '@nemesis/shared';
import { ShipIntelSceneView } from '../rooms/ShipIntelCinematic';
import { CommsComposer } from './CommsComposer';
import { CommsInbox } from './CommsInbox';
import { DossierView } from './PlayerDossierPanel';
import { COMPOSER_TOPICS, buildComposerDraft, type ComposerValues } from './composerModel';
import { buildPlayerDossier } from './dossierModel';
import { buildInbox } from './inboxModel';
import { mapBubbles } from './speechBubbleModel';

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (state: object) => unknown) =>
    selector({ dispatch: () => undefined, selectRoom: () => undefined, seating: [] }),
}));

const engine = new GameEngine();

function say(state: GameState, playerId: string, draft: CommsDraft): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = playerId;
  return engine.processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: playerId });
}

function activeFor(state: GameState, playerId: string): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = playerId;
  return table;
}

describe('Досье (В8-4-6): только открытая информация', () => {
  it('не показывает чужие Предметы, Цели и руку — только цвета рубашек и число карт', () => {
    const state = createInitialGameState('dossier-hidden', { playerCount: 2 });
    const secret = state.decks.items.YELLOW.drawPile.find((card) => !card.isHeavy)!;
    state.players['player-2']!.inventory = [secret];
    const view = filterStateForPlayer(state, 'player-1');
    const dossier = buildPlayerDossier(view, 'player-2')!;
    const html = renderToStaticMarkup(<DossierView dossier={dossier} onClose={() => undefined} />);
    expect(dossier.inventoryColors).toEqual(['YELLOW']);
    expect(dossier.handCount).toBe(state.players['player-2']!.actionDeck.hand.length);
    expect(html).not.toContain(secret.name);
    for (const card of state.players['player-2']!.objectives) expect(html).not.toContain(card.name);
    for (const card of state.players['player-2']!.actionDeck.hand) {
      if ('name' in card) expect(html).not.toContain(card.name);
    }
  });

  it('Заявление сверяется с вашей проверкой: подтверждено или противоречит', () => {
    let state = createInitialGameState('dossier-marks', { playerCount: 2 });
    const truth = state.ship.engines[1]!.isWorking;
    state.players['player-1']!.inspectedEngines = [1];
    state = say(state, 'player-2', {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_STATUS', engineNumber: 1, status: truth ? 'WORKING' : 'DAMAGED' },
    });
    state = say(state, 'player-2', {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_STATUS', engineNumber: 1, status: truth ? 'DAMAGED' : 'WORKING' },
    });
    const marks = buildPlayerDossier(filterStateForPlayer(state, 'player-1'), 'player-2')!.statements.map(
      (entry) => entry.mark,
    );
    expect(marks).toEqual(['CONTRADICTED', 'CONFIRMED']);
    const blind = buildPlayerDossier(filterStateForPlayer(state, 'player-2'), 'player-2')!;
    expect(blind.isViewer).toBe(true);
  });

  it('перестановка жетонов после Заявления учитывается: сверка идёт с состоянием на момент слов', () => {
    let state = createInitialGameState('dossier-toggle', { playerCount: 2 });
    const truth = state.ship.engines[2]!.isWorking;
    state.players['player-1']!.inspectedEngines = [2];
    state = say(state, 'player-2', {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_STATUS', engineNumber: 2, status: truth ? 'WORKING' : 'DAMAGED' },
    });
    const toggled = structuredClone(state);
    toggled.ship.engines[2]!.isWorking = !truth;
    toggled.comms.messages.push({
      id: 'comms-9',
      sequence: 9,
      round: 1,
      kind: 'SYSTEM',
      authorId: null,
      to: 'ALL',
      body: { topic: 'ENGINE_ORDER_CHANGED', engineNumber: 2 },
    });
    expect(buildPlayerDossier(filterStateForPlayer(toggled, 'player-1'), 'player-2')!.statements[0]!.mark).toBe(
      'CONFIRMED',
    );
  });

  it('нарушенное обещание помечено в истории', () => {
    let state = say(createInitialGameState('dossier-promise', { playerCount: 2 }), 'player-1', {
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'NO_SELF_DESTRUCT' },
    });
    state = structuredClone(
      say(state, 'player-2', { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'WILL_HELP' } }),
    );
    state.comms.commitments[0]!.status = 'BROKEN';
    const dossier = buildPlayerDossier(filterStateForPlayer(state, 'player-1'), 'player-2')!;
    expect(dossier.statements[0]!.mark).toBe('PROMISE_BROKEN');
    expect(renderToStaticMarkup(<DossierView dossier={dossier} onClose={() => undefined} />)).toContain(
      'обещание нарушено',
    );
  });
});

describe('Окно Заявления после Проверки (В8-4-4)', () => {
  it('после Проверки Двигателя — «Исправен», «Сломан» и «Промолчать»', () => {
    const view = filterStateForPlayer(createInitialGameState('claim-window', { playerCount: 2 }), 'player-1');
    const html = renderToStaticMarkup(
      <ShipIntelSceneView
        scene={{ kind: 'ENGINES', key: 'k', source: 'ENGINE_ROOM', engines: [{ engineNumber: 2, isWorking: true }] }}
        view={view}
        onDone={() => undefined}
      />,
    );
    expect(html).toContain('Заявить: Исправен');
    expect(html).toContain('Заявить: Сломан');
    expect(html).toContain('Промолчать');
    expect(html).toContain('видели');
  });

  it('после перестановки жетонов окно напоминает, что корабль уже объявил, и предлагает рассказать о ремонте', () => {
    const view = filterStateForPlayer(
      activeFor(createInitialGameState('claim-toggle', { playerCount: 2 }), 'player-2'),
      'player-1',
    );
    const html = renderToStaticMarkup(
      <ShipIntelSceneView
        scene={{ kind: 'ENGINE_TOGGLED', key: 'k', engineNumber: 3, isWorking: false, orderChanged: true }}
        view={view}
        onDone={() => undefined}
      />,
    );
    expect(html).toContain('корабль уже объявил');
    expect(html).toContain('Я повредил');
    expect(html).toContain('Заявить в свой ход');
  });

  it('Координаты: выбор пункта назначения для маркера', () => {
    const state = createInitialGameState('claim-coordinates', { playerCount: 2 });
    const view = filterStateForPlayer(state, 'player-1');
    const html = renderToStaticMarkup(
      <ShipIntelSceneView
        scene={{ kind: 'COORDINATES', key: 'k', cardId: state.ship.coordinates.cardId }}
        view={view}
        onDone={() => undefined}
      />,
    );
    for (const label of ['Земля', 'Марс', 'Венера']) expect(html).toContain(label);
  });
});

describe('«Входящие» (В8-4-3)', () => {
  it('Просьбы к вам и ко всем, без своих, отвеченных и отложенных', () => {
    let state = createInitialGameState('inbox', { playerCount: 3 });
    state = say(state, 'player-2', { kind: 'REQUEST', to: 'player-1', body: { topic: 'CHECK_COORDINATES' } });
    state = say(state, 'player-3', { kind: 'REQUEST', to: 'player-2', body: { topic: 'NO_SELF_DESTRUCT' } });
    state = say(state, 'player-1', { kind: 'REQUEST', to: 'ALL', body: { topic: 'EXTINGUISH', roomId: 11 } });
    const view = filterStateForPlayer(activeFor(state, 'player-1'), 'player-1');
    expect(buildInbox(view, [], []).map((item) => item.key)).toEqual(['comms-1']);
    expect(buildInbox(view, ['comms-1'], [])).toEqual([]);
    const html = renderToStaticMarkup(<CommsInbox view={view} enabled />);
    expect(html).toContain('ВХОДЯЩИЕ');
    expect(html).toContain('лично вам');
    for (const label of ['Помогу', 'Не могу', 'Позже']) expect(html).toContain(label);
  });

  it('истекающее обещание и отложенное Заявление тоже во «Входящих»', () => {
    let state = say(createInitialGameState('inbox-promise', { playerCount: 2 }), 'player-2', {
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'CHECK_COORDINATES' },
    });
    state = structuredClone(
      say(state, 'player-1', { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'WILL_HELP' } }),
    );
    state.meta.currentRound = state.comms.commitments[0]!.expiresAtRound;
    const view = filterStateForPlayer(state, 'player-1');
    const queued: CommsDraft = { kind: 'CLAIM', to: 'ALL', body: { topic: 'NOT_INFECTED' } };
    expect(buildInbox(view, [], [queued]).map((item) => item.kind)).toEqual(['QUEUED', 'COMMITMENT']);
  });

  it('вне своего хода «Входящие» не показываются', () => {
    const state = say(createInitialGameState('inbox-closed', { playerCount: 2 }), 'player-2', {
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'CHECK_COORDINATES' },
    });
    expect(renderToStaticMarkup(<CommsInbox view={filterStateForPlayer(state, 'player-1')} enabled />)).toBe('');
  });
});

const SAMPLE_VALUES: ComposerValues = {
  engine: 1,
  engineStatus: 'WORKING',
  engineDeed: 'UNTOUCHED',
  marker: 'B',
  destination: 'MARS',
  toEarth: 'NO',
  room: 11,
  roomType: 'ARMORY',
  item: 'Энергозаряд',
  itemNeed: 'SPECIFIC',
  player: 'player-2',
  doorState: 'CLOSED',
};

describe('Конструктор фраз (В8-4-2)', () => {
  it('каждая фраза каталога собирается и принимается движком', () => {
    const base = createInitialGameState('composer-all', { playerCount: 2 });
    const values: ComposerValues = {
      ...SAMPLE_VALUES,
      pod: Object.keys(base.ship.escapePods)[0]!,
      corridor: Object.keys(base.ship.corridors)[0]!,
    };
    for (const topic of COMPOSER_TOPICS) {
      const draft = buildComposerDraft(topic, values, 'ALL')!;
      expect(draft, topic.id).not.toBeNull();
      expect(() => say(base, 'player-1', draft), topic.id).not.toThrow();
    }
  });

  it('пока не выбраны все поля, отправлять нечего; «конкретный Предмет» требует названия', () => {
    const needItem = COMPOSER_TOPICS.find((topic) => topic.id === 'need-item')!;
    expect(buildComposerDraft(needItem, { itemNeed: 'SPECIFIC' }, 'ALL')).toBeNull();
    expect(buildComposerDraft(needItem, { itemNeed: 'WEAPON' }, 'ALL')).toEqual({
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'NEED_ITEM', need: 'WEAPON' },
    });
  });

  it('в свой ход показывает категории с остатком лимита', () => {
    const view = filterStateForPlayer(
      activeFor(createInitialGameState('composer-ui', { playerCount: 2 }), 'player-1'),
      'player-1',
    );
    const html = renderToStaticMarkup(<CommsComposer view={view} onSent={() => undefined} />);
    for (const label of ['Заявление', 'Намерение', 'Просьба', 'Выберите фразу', 'В эфир'])
      expect(html).toContain(label);
  });
});

describe('Пузыри реплик на карте (В8-4-5)', () => {
  it('реплика висит над Комнатой автора, несколько реплик — ярусами, длинные обрезаны', () => {
    let state = createInitialGameState('bubbles', { playerCount: 2 });
    state = say(state, 'player-1', { kind: 'INTENT', to: 'ALL', body: { topic: 'EXPLORE' } });
    state = say(state, 'player-1', {
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'NEED_ITEM', need: 'SPECIFIC', itemName: 'Энергозаряд' },
    });
    const view = filterStateForPlayer(state, 'player-2');
    const coords = new Map([[view.players['player-1']!.roomId, { x: 100, y: 200 }]]);
    const bubbles = mapBubbles(view, view.comms.messages, coords);
    expect(bubbles.map((bubble) => bubble.y)).toEqual([142, 104]);
    expect(bubbles[0]!.text).toBe('Иду исследовать корабль.');
    expect(bubbles.every((bubble) => bubble.text.length <= 34)).toBe(true);
  });
});
