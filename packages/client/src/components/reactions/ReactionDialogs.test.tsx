import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ACTION_CARDS,
  CONSENT_OPTION,
  DISMISS_OPTION,
  GameEngine,
  createInitialGameState,
  filterStateForPlayer,
  findAdjacentOpenRoomIds,
  type GameState,
  type PendingDecision,
} from '@nemesis/shared';
import { formatGameLogEntry } from '../log/gameLogModel';
import { DismissWindowDialog, ReactionBanner, RepositionConsentDialog } from './ReactionDialogs';

const noop = () => undefined;
const engine = new GameEngine();

function declaredMove(): GameState {
  const state = createInitialGameState('reaction-ui', { playerCount: 2 });
  const dismiss = structuredClone(ACTION_CARDS.find((card) => card.effect.kind === 'DISMISS')!);
  dismiss.id = 'dismiss-for-player-2';
  state.players['player-2']!.actionDeck.hand.push(dismiss);
  const mover = state.players['player-1']!;
  const target = findAdjacentOpenRoomIds(state, mover.roomId)[0]!;
  return engine.processAction(state, {
    type: 'ACTION_MOVE',
    payload: { targetRoomId: target, discardCardIds: [mover.actionDeck.hand.at(-1)!.id] },
  });
}

describe('Окно «Отставить» (карта Действий)', () => {
  it('держатель карты видит объявленное Действие, текст карты и оба ответа', () => {
    const state = declaredMove();
    const view = filterStateForPlayer(state, 'player-2');
    const decision = view.pendingDecision as Extract<PendingDecision, { type: 'DISMISS_WINDOW' }>;
    expect(decision.type).toBe('DISMISS_WINDOW');
    const html = renderToStaticMarkup(<DismissWindowDialog decision={decision} view={view} onAnswer={noop} />);
    expect(html).toContain('Отставить?');
    expect(html).toContain('Перемещение');
    expect(html).toContain('оплачивает Цену отмененного Действия');
    expect(html).toContain('Сыграть «Отставить»');
    expect(html).toContain('Пропустить');
  });

  it('исполнитель видит баннер ожидания, а не чужое окно выбора', () => {
    const view = filterStateForPlayer(declaredMove(), 'player-1');
    expect(view.pendingDecision).toBeNull();
    const html = renderToStaticMarkup(<ReactionBanner view={view} />);
    expect(html).toContain('ждём ответа на «Отставить»');
  });

  it('после «Отставить» журнал называет отменённое Действие и оплаченную Цену', () => {
    const state = declaredMove();
    const answer = (current: GameState, option: string) =>
      engine.processAction(
        current,
        {
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: current.pendingDecision!.id, selectedOption: option },
        },
        { actorId: current.pendingDecision!.playerId },
      );
    let dismissed = answer(state, DISMISS_OPTION.DISMISS);
    expect(dismissed.pendingDecision?.type).toBe('DISMISS_WINDOW');
    {
      const counterView = filterStateForPlayer(dismissed, dismissed.pendingDecision!.playerId);
      const counter = counterView.pendingDecision as Extract<PendingDecision, { type: 'DISMISS_WINDOW' }>;
      const html = renderToStaticMarkup(<DismissWindowDialog decision={counter} view={counterView} onAnswer={noop} />);
      expect(html).toContain('Встречное «Отставить»?');
      dismissed = answer(dismissed, DISMISS_OPTION.ALLOW);
    }
    const view = filterStateForPlayer(dismissed, 'player-1');
    const texts = view.gameLog.map((entry) =>
      formatGameLogEntry(entry, view)
        .segments.map((segment) => segment.text)
        .join(''),
    );
    expect(texts.some((text) => text.includes('играет «Отставить»'))).toBe(true);
    expect(texts.some((text) => text.startsWith('Отставить! Перемещение') && text.includes('карт в сброс: 1'))).toBe(
      true,
    );
    expect(dismissed.players['player-1']!.roomId).toBe(state.players['player-1']!.roomId);
  });
});

describe('Согласие на перенос («Огонь на подавление», «Заградительный огонь»)', () => {
  it('переносимый видит, кто и куда его уводит, и может отказаться', () => {
    const state = createInitialGameState('reposition-ui', { playerCount: 2 });
    const target = findAdjacentOpenRoomIds(state, state.players['player-2']!.roomId)[0]!;
    const decision: Extract<PendingDecision, { type: 'REPOSITION_CONSENT' }> = {
      id: 'consent',
      playerId: 'player-2',
      type: 'REPOSITION_CONSENT',
      requesterId: 'player-1',
      targetRoomId: target,
      cardName: '«Заградительный огонь»',
    };
    const view = filterStateForPlayer(state, 'player-2');
    const html = renderToStaticMarkup(<RepositionConsentDialog decision={decision} view={view} onAnswer={noop} />);
    expect(html).toContain('«Заградительный огонь»');
    expect(html).toContain('без Атак Чужих');
    expect(html).toContain('Отойти');
    expect(html).toContain('Остаться');
    expect(CONSENT_OPTION.DECLINE).toBe('DECLINE');
  });
});
