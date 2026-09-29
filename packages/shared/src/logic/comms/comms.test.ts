import { describe, expect, it } from 'vitest';
import type { CommsDraft } from '../../types/comms.js';
import type { GameState } from '../../types/state.js';
import { contactState, expectEngineError } from '../../testing/contactFixtures.js';
import { standAt } from '../../testing/roomFixtures.js';
import { CARD_OPTION } from '../../types/cardOptions.js';
import { setEngineState } from '../cardEffectsShared.js';
import { GameEngine } from '../fsm.js';
import { filterStateForPlayer } from '../sanitizer.js';
import { commsUsageThisTurn } from './commsActions.js';
import { COMMS_SETTINGS } from './commsSettings.js';

const engine = new GameEngine();

function say(state: GameState, playerId: string, draft: CommsDraft): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = playerId;
  return engine.processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: playerId });
}

const ENGINE_CLAIM: CommsDraft = {
  kind: 'CLAIM',
  to: 'ALL',
  body: { topic: 'ENGINE_STATUS', engineNumber: 2, status: 'WORKING' },
};

describe('Рация: сообщения (план 0.8.0, В8-3-1)', () => {
  it('Заявление публично, с раундом, номером и автором, и не тратит Действий и карт', () => {
    const state = contactState(2, 'comms-claim');
    const before = state.players['player-1']!;
    const next = say(state, 'player-1', ENGINE_CLAIM);
    expect(next.comms.messages).toEqual([
      {
        id: 'comms-1',
        sequence: 1,
        round: state.meta.currentRound,
        kind: 'CLAIM',
        authorId: 'player-1',
        to: 'ALL',
        body: ENGINE_CLAIM.body,
      },
    ]);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(before.actionsPerformedThisRound);
    expect(next.players['player-1']!.actionDeck.hand).toEqual(before.actionDeck.hand);
    expect(next.meta.activePlayerId).toBe('player-1');
  });

  it('заявить можно и неправду: содержание не проверяется', () => {
    const state = contactState(2, 'comms-bluff');
    const truth = state.ship.engines[2]!.isWorking;
    const next = say(state, 'player-1', {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_STATUS', engineNumber: 2, status: truth ? 'DAMAGED' : 'WORKING' },
    });
    expect(next.comms.messages).toHaveLength(1);
  });

  it('личное сообщение тоже видно всем в срезе: Рация — разговор за столом', () => {
    const next = say(contactState(3, 'comms-private'), 'player-1', { ...ENGINE_CLAIM, to: 'player-2' });
    expect(filterStateForPlayer(next, 'player-3').comms.messages[0]?.to).toBe('player-2');
  });
});

describe('Рация: лимиты хода (Р-9, В8-3-3)', () => {
  it('3 обычных сообщения за ход, четвёртое отклоняется', () => {
    let state = contactState(2, 'comms-limit');
    for (let index = 0; index < COMMS_SETTINGS.ordinaryMessagesPerTurn; index++) {
      state = say(state, 'player-1', { kind: 'INTENT', to: 'ALL', body: { topic: 'EXPLORE' } });
    }
    expectEngineError(() => say(state, 'player-1', ENGINE_CLAIM), 'COMMS_LIMIT_REACHED');
    expect(commsUsageThisTurn(state, 'player-1').ordinary).toBe(3);
  });

  it('Просьба — отдельный лимит: не больше 1 за ход, обычные сообщения не мешают', () => {
    let state = contactState(2, 'comms-request-limit');
    state = say(state, 'player-1', { kind: 'REQUEST', to: 'ALL', body: { topic: 'CHECK_COORDINATES' } });
    state = say(state, 'player-1', ENGINE_CLAIM);
    expectEngineError(
      () => say(state, 'player-1', { kind: 'REQUEST', to: 'ALL', body: { topic: 'NO_SELF_DESTRUCT' } }),
      'COMMS_LIMIT_REACHED',
    );
  });

  it('новый ход — новые счётчики', () => {
    let state = contactState(2, 'comms-new-turn');
    for (let index = 0; index < 3; index++) state = say(state, 'player-1', ENGINE_CLAIM);
    const next = structuredClone(state);
    next.gameLog.push({
      id: 'log-turn',
      sequence: (next.gameLog.at(-1)?.sequence ?? 0) + 1,
      event: { type: 'PLAYER_TURN_STARTED', playerId: 'player-1', round: next.meta.currentRound },
    });
    expect(say(next, 'player-1', ENGINE_CLAIM).comms.messages).toHaveLength(4);
  });

  it('сообщение вне своего хода отклоняется', () => {
    const state = contactState(2, 'comms-turn');
    state.meta.activePlayerId = 'player-1';
    expectEngineError(
      () => engine.processAction(state, { type: 'ACTION_COMMS', payload: ENGINE_CLAIM }, { actorId: 'player-2' }),
      'NOT_ACTIVE_PLAYER',
    );
  });
});

describe('Рация: адресаты и цели (В8-3-5)', () => {
  it('адресат — «все» или живой Персонаж на корабле, не сам автор', () => {
    const state = contactState(2, 'comms-addressee');
    expectEngineError(() => say(state, 'player-1', { ...ENGINE_CLAIM, to: 'player-1' }), 'COMMS_INVALID_ADDRESSEE');
    expectEngineError(() => say(state, 'player-1', { ...ENGINE_CLAIM, to: 'player-9' }), 'COMMS_INVALID_ADDRESSEE');
    state.players['player-2']!.isDead = true;
    expectEngineError(() => say(state, 'player-1', { ...ENGINE_CLAIM, to: 'player-2' }), 'COMMS_INVALID_ADDRESSEE');
  });

  it.each<[string, CommsDraft]>([
    [
      'Двигатель №4',
      { kind: 'CLAIM', to: 'ALL', body: { topic: 'ENGINE_STATUS', engineNumber: 4 as 1, status: 'WORKING' } },
    ],
    ['Комната #999', { kind: 'INTENT', to: 'ALL', body: { topic: 'GO_TO_ROOM', roomId: 999 } }],
    ['выдуманный Предмет', { kind: 'CLAIM', to: 'ALL', body: { topic: 'HAS_ITEM', itemName: 'Бластер' } }],
    ['несуществующая Капсула', { kind: 'REQUEST', to: 'ALL', body: { topic: 'WAIT_IN_POD', podId: 'pod-99' } }],
    [
      'несуществующий Коридор',
      { kind: 'REQUEST', to: 'ALL', body: { topic: 'SET_DOOR', corridorId: 'x', doorState: 'OPEN' } },
    ],
    ['тип Комнаты', { kind: 'INTENT', to: 'ALL', body: { topic: 'SEEK_ROOM', definitionId: 'SPA' } }],
    ['чужое сообщение', { kind: 'REACTION', to: 'ALL', body: { topic: 'DISBELIEVE', messageId: 'comms-42' } }],
  ])('несуществующая цель — явная ошибка: %s', (_name, draft) => {
    expectEngineError(() => say(contactState(2, 'comms-targets'), 'player-1', draft), 'COMMS_UNKNOWN_TARGET');
  });

  it('«Не верю» — только на чужое Заявление', () => {
    const claimed = say(contactState(2, 'comms-disbelieve'), 'player-1', ENGINE_CLAIM);
    expectEngineError(
      () =>
        say(claimed, 'player-1', { kind: 'REACTION', to: 'ALL', body: { topic: 'DISBELIEVE', messageId: 'comms-1' } }),
      'COMMS_UNKNOWN_TARGET',
    );
    const reacted = say(claimed, 'player-2', {
      kind: 'REACTION',
      to: 'player-1',
      body: { topic: 'DISBELIEVE', messageId: 'comms-1' },
    });
    expect(reacted.comms.messages.at(-1)).toMatchObject({ kind: 'REACTION', authorId: 'player-2' });
  });

  it('системное объявление действием не отправить', () => {
    const forged = { kind: 'SYSTEM', to: 'ALL', body: { topic: 'ENGINE_ORDER_CHANGED', engineNumber: 1 } };
    expectEngineError(
      () => say(contactState(2, 'comms-forged'), 'player-1', forged as unknown as CommsDraft),
      'COMMS_FORBIDDEN',
    );
  });
});

describe('Рация: обязательное объявление о перестановке жетонов (Р-4)', () => {
  it('смена состояния Двигателя объявляется всем, без результата', () => {
    const state = contactState(2, 'comms-engine');
    standAt(state, 'player-1', 'ENGINE_02');
    const option = state.ship.engines[2]!.isWorking ? CARD_OPTION.ENGINE_DAMAGE : CARD_OPTION.ENGINE_REPAIR;
    setEngineState(state, 'player-1', option);
    expect(state.comms.messages).toEqual([
      expect.objectContaining({
        kind: 'SYSTEM',
        authorId: null,
        to: 'ALL',
        body: { topic: 'ENGINE_ORDER_CHANGED', engineNumber: 2 },
      }),
    ]);
    expect(JSON.stringify(filterStateForPlayer(state, 'player-2').comms)).not.toContain('isWorking');
  });

  it('если жетоны не переставлялись, объявления нет', () => {
    const state = contactState(2, 'comms-engine-same');
    standAt(state, 'player-1', 'ENGINE_02');
    const option = state.ship.engines[2]!.isWorking ? CARD_OPTION.ENGINE_REPAIR : CARD_OPTION.ENGINE_DAMAGE;
    setEngineState(state, 'player-1', option);
    expect(state.comms.messages).toEqual([]);
  });
});
