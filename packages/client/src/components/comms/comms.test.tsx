import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GameEngine,
  createInitialGameState,
  filterStateForPlayer,
  type CommsDraft,
  type GameState,
} from '@nemesis/shared';
import { formatGameLogEntry } from '../log/gameLogModel';
import { EngineBroadcastScene } from './EngineBroadcast';
import { RadioDrawer } from './RadioPanel';
import { buildCommsFeed, commsUsageView, lastSystemAnnouncement } from './commsFeedModel';
import { messageText } from './commsPhrases';

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (state: { dispatch: () => void }) => unknown) => selector({ dispatch: () => undefined }),
}));

const engine = new GameEngine();

function say(state: GameState, playerId: string, draft: CommsDraft): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = playerId;
  return engine.processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: playerId });
}

function radioTable(): GameState {
  let state = createInitialGameState('radio-ui', { playerCount: 3 });
  state = say(state, 'player-1', {
    kind: 'CLAIM',
    to: 'ALL',
    body: { topic: 'ENGINE_STATUS', engineNumber: 1, status: 'DAMAGED' },
  });
  state = say(state, 'player-1', { kind: 'REQUEST', to: 'player-2', body: { topic: 'CHECK_ENGINE', engineNumber: 1 } });
  state = say(state, 'player-3', {
    kind: 'REACTION',
    to: 'player-1',
    body: { topic: 'DISBELIEVE', messageId: 'comms-1' },
  });
  return state;
}

describe('Рация в интерфейсе: фразы и лента', () => {
  it('каждое сообщение читается как реплика, «не верю» цитирует Заявление', () => {
    const view = filterStateForPlayer(radioTable(), 'player-2');
    const texts = view.comms.messages.map((message) => messageText(view, message));
    expect(texts).toEqual(['Двигатель №1 сломан.', 'Проверьте Двигатель №1.', 'Не верю: «Двигатель №1 сломан.»']);
  });

  it('реплика бота звучит в интонации его фразы, а смысл остаётся текстом сообщения (В8-8-2)', () => {
    const state = say(createInitialGameState('radio-voice', { playerCount: 3 }), 'player-2', {
      kind: 'INTENT',
      to: 'ALL',
      body: { topic: 'GO_TO_HIBERNATION' },
      phraseId: 'INTENT_NERVOUS_1',
    });
    const view = filterStateForPlayer(state, 'player-1');
    const text = messageText(view, view.comms.messages.at(-1)!);
    expect(text).toBe('Я… я пошёл. Иду в Анабиоз.');
    const html = renderToStaticMarkup(<RadioDrawer view={view} seenSequence={0} onClose={() => undefined} />);
    expect(html).toContain('Я… я пошёл. Иду в Анабиоз.');
  });

  it('Просьба к зрителю в его ход предлагает «Помогу» и «Не могу»; ответы видны под Просьбой', () => {
    const state = structuredClone(radioTable());
    state.meta.activePlayerId = 'player-2';
    const view = filterStateForPlayer(state, 'player-2');
    const request = buildCommsFeed(view)[0]!.items.find((item) => item.kind === 'REQUEST')!;
    expect(request.request?.canAnswer).toBe(true);
    expect(request.isForViewer).toBe(true);
    const html = renderToStaticMarkup(<RadioDrawer view={view} seenSequence={0} onClose={() => undefined} />);
    expect(html).toContain('Помогу');
    expect(html).toContain('Не могу');
    expect(html).toContain('Ваш ход в эфире');

    const answered = say(state, 'player-2', {
      kind: 'ANSWER',
      body: { topic: 'ANSWER', requestId: 'comms-2', answer: 'WILL_HELP' },
    });
    const after = buildCommsFeed(filterStateForPlayer(answered, 'player-1'))[0]!.items.find(
      (item) => item.kind === 'REQUEST',
    )!;
    expect(after.request?.answers).toEqual([
      expect.objectContaining({ willHelp: true, commitment: expect.objectContaining({ status: 'OPEN' }) }),
    ]);
  });

  it('вне своего хода отвечать нельзя, лимиты показываются только в свой ход', () => {
    const view = filterStateForPlayer(radioTable(), 'player-2');
    expect(commsUsageView(view).canSpeak).toBe(false);
    const html = renderToStaticMarkup(<RadioDrawer view={view} seenSequence={99} onClose={() => undefined} />);
    expect(html).toContain('Говорить и отвечать можно в свой ход');
    expect(html).not.toContain('>Помогу<');
  });

  it('пустой эфир — подсказка вместо пустоты', () => {
    const view = filterStateForPlayer(createInitialGameState('radio-empty'), 'player-1');
    expect(renderToStaticMarkup(<RadioDrawer view={view} seenSequence={0} onClose={() => undefined} />)).toContain(
      'В эфире тишина',
    );
  });
});

describe('Системное объявление о перестановке жетонов (Р-4)', () => {
  it('сцена называет Двигатель, но не раскрывает новое состояние', () => {
    const html = renderToStaticMarkup(<EngineBroadcastScene engineNumber={3} onClose={() => undefined} />);
    expect(html).toContain('ЖЕТОНЫ ДВИГАТЕЛЯ №3 ПЕРЕСТАВЛЕНЫ');
    expect(html).not.toMatch(/Исправен|Неисправен/);
  });

  it('лента берёт последнее объявление корабля', () => {
    const state = structuredClone(radioTable());
    state.comms.messages.push({
      id: 'comms-9',
      sequence: 9,
      logSequence: 0,
      round: 1,
      kind: 'SYSTEM',
      authorId: null,
      to: 'ALL',
      body: { topic: 'ENGINE_ORDER_CHANGED', engineNumber: 2 },
    });
    const view = filterStateForPlayer(state, 'player-2');
    expect(lastSystemAnnouncement(view)?.body.engineNumber).toBe(2);
    expect(buildCommsFeed(view)[0]!.items.at(-1)).toMatchObject({ kind: 'SYSTEM', authorName: 'Корабль' });
  });
});

describe('Журнал: поступки и обещания', () => {
  it('Дверь, Пожар и исход обещания пишутся понятной строкой', () => {
    const state = createInitialGameState('radio-log', { playerCount: 2 });
    const corridorId = Object.keys(state.ship.corridors)[0]!;
    state.gameLog.push(
      {
        id: 'a',
        sequence: 90,
        event: { type: 'DOOR_CHANGED', playerId: 'player-1', corridorId, from: 'OPEN', to: 'CLOSED' },
      },
      { id: 'b', sequence: 91, event: { type: 'FIRE_EXTINGUISHED', playerId: 'player-1', roomId: 11 } },
      {
        id: 'c',
        sequence: 92,
        event: {
          type: 'COMMITMENT_RESOLVED',
          commitmentId: 'x',
          helperId: 'player-2',
          requesterId: 'player-1',
          status: 'BROKEN',
        },
      },
    );
    const view = filterStateForPlayer(state, 'player-1');
    const text = (sequence: number) =>
      formatGameLogEntry(
        view.gameLog.find((entry) => entry.sequence === sequence)!,
        view,
      )
        .segments.map((segment) => segment.text)
        .join('');
    expect(text(90)).toContain('закрывает Дверь: Коридор');
    expect(text(91)).toContain('тушит Пожар');
    expect(text(92)).toContain('нарушает обещание');
  });
});
