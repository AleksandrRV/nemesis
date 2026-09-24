import { describe, expect, it } from 'vitest';
import {
  createInitialGameState,
  filterStateForPlayer,
  type GameLogEntry,
  type SanitizedGameState,
} from '@nemesis/shared';
import { diffBoardSnapshots, snapshotBatchBaseline } from './boardAnimationModel';
import { buildSequencedItems, getPresentationPriority } from './usePresentationSequencer';
import { usePresentationStore } from '../../store/presentationStore';

/**
 * Регрессия причинно-следственной связи презентации (ручное QA):
 * одна пачка «переход → вскрытие → бросок Шума → маркер → Контакт»
 * обязана воспроизводиться строго в игровом порядке, а не в порядке
 * слоёв диффа.
 */

function snapshot(seed = 'sequence-order'): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState(seed), 'player-1');
}

function mutate(view: SanitizedGameState, apply: (draft: SanitizedGameState) => void): SanitizedGameState {
  const draft = structuredClone(view);
  apply(draft);
  return draft;
}

function log(startSequence: number, ...events: GameLogEntry['event'][]): GameLogEntry[] {
  return events.map((event, index) => ({ id: `log-${startSequence + index}`, sequence: startSequence + index, event }));
}

const CORRIDOR_FACE = { kind: 'CORRIDOR', number: 1 } as const;

/** Полная пачка: переход в туманный отсек 12 с жетоном, броском и Контактом. */
function exploreWithNoiseAndContact() {
  const before = snapshot();
  const after = mutate(before, (draft) => {
    const corridor = Object.values(draft.ship.corridors).find(
      (candidate) => candidate.fromRoomId === 12 || candidate.toRoomId === 12,
    )!;
    draft.players['player-1']!.roomId = 12;
    draft.ship.rooms[12]!.isExplored = true;
    draft.ship.rooms[12]!.explorationEffect = 'DANGER';
    corridor.hasNoise = true;
    const startSequence = (draft.gameLog.at(-1)?.sequence ?? 0) + 1;
    draft.gameLog = [
      ...draft.gameLog,
      ...log(
        startSequence,
        {
          type: 'PLAYER_MOVED',
          playerId: 'player-1',
          fromRoomId: 11,
          toRoomId: 12,
          corridorId: corridor.id,
          mode: 'NORMAL',
        },
        { type: 'ROOM_DISCOVERED', playerId: 'player-1', roomId: 12, roomName: 'Отсек', category: 'ROOM_1' },
        { type: 'EXPLORATION_TOKEN_REVEALED', playerId: 'player-1', roomId: 12, itemsCount: 2, effect: 'DANGER' },
        { type: 'NOISE_ROLLED', playerId: 'player-1', roomId: 12, result: CORRIDOR_FACE },
        {
          type: 'NOISE_MARKER_PLACED',
          playerId: 'player-1',
          roomId: 12,
          target: { kind: 'CORRIDOR', corridorId: corridor.id },
          reason: 'ROLL',
        },
        {
          type: 'CONTACT_OCCURRED',
          playerId: 'player-1',
          roomId: 12,
          tokenType: 'ADULT',
          escapeNumber: 4,
          handCount: 2,
          intruderId: 'adult-1',
          firstEncounter: true,
          surpriseAttack: true,
          source: 'NOISE',
        },
      ),
    ];
    draft.intrudersPool.boardTokens.push({ id: 'adult-1', type: 'ADULT', roomId: 12, woundsCount: 0 });
  });
  return { before, after };
}

describe('Последовательность презентации: причинно-следственная связь', () => {
  it('переход → скан → карточка → удержка переворота → окно Шума → маркер → Контакт', () => {
    const { before, after } = exploreWithNoiseAndContact();
    const animations = diffBoardSnapshots(before, after);
    const items = buildSequencedItems(animations, after, 0);

    expect(items.map((item) => item.kind)).toEqual([
      'PLAYER_MOVE',
      'ROOM_REVEAL',
      'EXPLORATION_REVEAL',
      'REVEAL_SETTLE',
      'NOISE_ROLL',
      'NOISE_POP',
      'CONTACT_TEASE',
      'CONTACT',
    ]);

    // Секвенсы идут по порядку журнала: движение — первое звено цепочки.
    const sequences = items.map((item) => item.sequence);
    expect([...sequences].sort((a, b) => a - b)).toEqual(sequences);

    // Миниатюра Контакта помечена: до закрытия окна её нет на поле.
    const contact = items.find((item) => item.kind === 'CONTACT');
    expect(contact && contact.kind === 'CONTACT' ? contact.intruderId : null).toBe('adult-1');
  });

  it('вскрытие без жетона: скан → удержка переворота, без карточки', () => {
    const before = snapshot();
    const after = mutate(before, (draft) => {
      draft.players['player-1']!.roomId = 12;
      draft.ship.rooms[12]!.isExplored = true;
      draft.ship.rooms[12]!.explorationEffect = null;
      const startSequence = (draft.gameLog.at(-1)?.sequence ?? 0) + 1;
      draft.gameLog = [
        ...draft.gameLog,
        ...log(
          startSequence,
          { type: 'PLAYER_MOVED', playerId: 'player-1', fromRoomId: 11, toRoomId: 12, corridorId: 'c', mode: 'NORMAL' },
          { type: 'ROOM_DISCOVERED', playerId: 'player-1', roomId: 12, roomName: 'Отсек', category: 'ROOM_1' },
        ),
      ];
    });

    const items = buildSequencedItems(diffBoardSnapshots(before, after), after, 0);
    expect(items.map((item) => item.kind)).toEqual(['PLAYER_MOVE', 'ROOM_REVEAL', 'REVEAL_SETTLE']);
  });

  it('переход в уже изученный отсек: сразу скольжение, без шагов вскрытия', () => {
    const before = mutate(snapshot(), (draft) => {
      draft.ship.rooms[12]!.isExplored = true;
    });
    const after = mutate(before, (draft) => {
      draft.players['player-1']!.roomId = 12;
      const startSequence = (draft.gameLog.at(-1)?.sequence ?? 0) + 1;
      draft.gameLog = [
        ...draft.gameLog,
        ...log(startSequence, {
          type: 'PLAYER_MOVED',
          playerId: 'player-1',
          fromRoomId: 11,
          toRoomId: 12,
          corridorId: 'c',
          mode: 'NORMAL',
        }),
      ];
    });

    const items = buildSequencedItems(diffBoardSnapshots(before, after), after, 0);
    expect(items.map((item) => item.kind)).toEqual(['PLAYER_MOVE']);
  });
});

describe('Базлайн пачки: откат презентации прячет только новое', () => {
  it('маркер Шума и новая миниатюра попадают в базлайн', () => {
    const { before, after } = exploreWithNoiseAndContact();
    const baseline = snapshotBatchBaseline(before, after);

    const corridor = Object.values(after.ship.corridors).find(
      (candidate) => candidate.fromRoomId === 12 || candidate.toRoomId === 12,
    )!;
    expect(baseline.noiseCorridorIds.has(corridor.id)).toBe(true);
    expect(baseline.newIntruderIds.has('adult-1')).toBe(true);
  });

  it('шум, существовавший до пачки, в базлайн не попадает', () => {
    const before = mutate(snapshot(), (draft) => {
      const corridor = Object.values(draft.ship.corridors)[0]!;
      corridor.hasNoise = true;
    });
    const after = structuredClone(before);

    expect(snapshotBatchBaseline(before, after).noiseCorridorIds.size).toBe(0);
    expect(snapshotBatchBaseline(before, after).newIntruderIds.size).toBe(0);
  });
});

describe('Хранилище презентации: окно кубика и откат до закрытия', () => {
  it('isIdle гейтится очередью, базлайн чистится только после полной разрядки', () => {
    const store = usePresentationStore;
    store.setState({
      queue: [],
      active: null,
      lastDieRoll: null,
      contactSeen: 0,
      batchBaseline: null,
      activeBoardAnimations: [],
      activeDieRoll: null,
      activeContact: null,
      isIdle: true,
    });

    const rollAnimation = {
      kind: 'NOISE_ROLL',
      key: 'nr-12-5',
      roomId: 12,
      corridorId: 'c-1',
      isTechnical: false,
      face: CORRIDOR_FACE,
    } as const;
    const roll = {
      key: rollAnimation.key,
      sequence: 5,
      roomId: 12,
      result: CORRIDOR_FACE,
      playerName: 'Капитан',
    };

    store.getState().mergeBatchBaseline({
      noiseCorridorIds: new Set(['c-1']),
      techNoise: false,
      newIntruderIds: new Set(),
      doorStatesBefore: new Map(),
    });
    store
      .getState()
      .setQueue(() => [
        { kind: 'NOISE_ROLL', key: rollAnimation.key, sequence: 5, dieRoll: roll, animation: rollAnimation },
      ]);

    expect(store.getState().isIdle).toBe(false);

    store.getState().setActive(store.getState().queue[0]!);
    store.getState().setQueue(() => []);
    expect(store.getState().activeDieRoll).not.toBeNull();
    expect(store.getState().batchBaseline).not.toBeNull();
    expect(store.getState().isIdle).toBe(false);

    store.getState().dismissDieRoll();
    // Результат броска сохранён для подсветки коридора на шаге NOISE_POP.
    expect(store.getState().lastDieRoll).not.toBeNull();
    expect(store.getState().active).toBeNull();
    // Пачка доиграна — базлайн откатов снят.
    expect(store.getState().batchBaseline).toBeNull();
    expect(store.getState().isIdle).toBe(true);
  });

  it('приоритеты задают порядок внутри одного секвенса', () => {
    expect(getPresentationPriority('PLAYER_MOVE')).toBeLessThan(getPresentationPriority('ROOM_REVEAL'));
    expect(getPresentationPriority('REVEAL_SETTLE')).toBeLessThan(getPresentationPriority('NOISE_ROLL'));
    expect(getPresentationPriority('NOISE_ROLL')).toBeLessThan(getPresentationPriority('NOISE_POP'));
    expect(getPresentationPriority('CONTACT_TEASE')).toBeLessThan(getPresentationPriority('CONTACT'));
  });
});
