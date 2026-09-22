import { describe, expect, it } from 'vitest';

import type { GameLogEvent } from '@nemesis/shared';
import { INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { formatGameLog } from './gameLogModel';

function eventEntry(sequence: number, event: GameLogEvent) {
  return { id: `log-${sequence}`, sequence, event };
}

describe('gameLogModel: русские сообщения и semantic tones', () => {
  it('форматирует перемещение с названиями отсеков и Коридором', () => {
    const state = createInitialGameState('game-log-model-move');
    const view = filterStateForPlayer(state, 'player-1');
    const corridor = Object.values(view.ship.corridors).find(
      (candidate) => candidate.fromRoomId === 11 || candidate.toRoomId === 11,
    );

    expect(corridor).toBeDefined();

    view.gameLog = [
      eventEntry(1, {
        type: 'PLAYER_MOVED',
        playerId: 'player-1',
        fromRoomId: 11,
        toRoomId: corridor!.fromRoomId === 11 ? corridor!.toRoomId : corridor!.fromRoomId,
        corridorId: corridor!.id,
        mode: 'CAREFUL',
      }),
    ];

    const [entry] = formatGameLog(view);
    const message = entry!.segments.map((segment) => segment.text).join('');

    expect(message).toContain('переместился');
    expect(message).toContain(`Коридору ${corridor!.id.replace('-', '–')}`);
    expect(message).toContain('Осторожное движение');
    expect(entry!.segments.some((segment) => segment.tone === 'player' && segment.strong)).toBe(true);
    expect(entry!.segments.some((segment) => segment.tone === 'corridor' && segment.strong)).toBe(true);
  });

  it('выделяет результат кубика, эффекты и размещение Шума', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-events'), 'player-1');
    const events: GameLogEvent[] = [
      { type: 'NOISE_ROLLED', playerId: 'player-1', roomId: 11, result: { kind: 'DANGER' } },
      {
        type: 'EXPLORATION_TOKEN_REVEALED',
        playerId: 'player-1',
        roomId: 11,
        itemsCount: 2,
        effect: 'FIRE',
      },
      {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        effect: 'FIRE',
        outcome: 'FIRE_PLACED',
      },
      {
        type: 'NOISE_MARKER_PLACED',
        playerId: 'player-1',
        roomId: 11,
        target: { kind: 'TECHNICAL_CORRIDOR' },
        reason: 'DANGER',
      },
    ];
    view.gameLog = events.map((event, index) => eventEntry(index + 1, event));

    const entries = formatGameLog(view);
    const messages = entries.map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Опасность');
    expect(messages[1]).toContain('жетон Исследования');
    expect(messages[1]).toContain('Пожар');
    expect(messages[2]).toContain('маркер Пожара установлен');
    expect(messages[3]).toContain('Технические Коридоры');
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'danger')).toBe(true);
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'fire')).toBe(true);
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'noise')).toBe(true);
  });

  it('оставляет неизвестный отсек без скрытого названия', () => {
    const state = createInitialGameState('game-log-model-hidden');
    const view = filterStateForPlayer(state, 'player-1');
    const hiddenRoomId = Object.values(view.ship.rooms).find((room) => !room.isExplored)?.id;

    expect(hiddenRoomId).toBeDefined();

    view.gameLog = [
      eventEntry(1, {
        type: 'NOISE_SKIPPED',
        playerId: 'player-1',
        roomId: hiddenRoomId!,
        reason: 'COMPANION',
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain(`отсек #${String(hiddenRoomId).padStart(3, '0')}`);
    expect(view.ship.rooms[hiddenRoomId!]?.definitionId).toBeNull();
  });
});

describe('Журнал: заражение Личинкой при Контакте', () => {
  const infestationEvent = (alreadyInfested: boolean) =>
    eventEntry(1, {
      type: 'CONTACT_OCCURRED',
      playerId: 'player-1',
      roomId: 11,
      tokenType: 'LARVA',
      escapeNumber: 1,
      handCount: 3,
      intruderId: null,
      firstEncounter: false,
      surpriseAttack: false,
      source: 'NOISE',
      infestation: { alreadyInfested },
    });

  it('первая Личинка: заражение без сравнения чисел и без Внезапной атаки', () => {
    const state = createInitialGameState('log-larva-fresh');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [infestationEvent(false)];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('Личинка');
    expect(message).toContain('немедленно заражён');
    expect(message).not.toContain('Число жетона');
  });

  it('повторная Личинка: исчезает без гибели (FAQ Rules 12)', () => {
    const state = createInitialGameState('log-larva-second');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [infestationEvent(true)];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('Повторная Личинка исчезла');
    expect(message).toContain('FAQ Rules 12');
  });
});

describe('Журнал: рукопашная атака (стр. 19)', () => {
  it('сообщает цель, Заражение, травму за промах и гибель Чужого', () => {
    const state = createInitialGameState('log-melee');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [
      eventEntry(2, {
        type: 'MELEE_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        targetIntruderId: 'intruder-1',
        targetType: 'ADULT',
        dieFace: 'ONE_WOUND',
        woundsBefore: 2,
        injuries: 1,
        woundsTotal: 3,
        toughnessCards: [],
        toughnessTotal: 3,
        killed: true,
        contaminated: true,
        seriousWoundTaken: false,
        attackerDied: false,
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('атакует Взрослую особь рукопашной');
    expect(message).toContain('Карта Заражения — в сброс');
    expect(message).toContain('Чужой убит!');
  });
});

describe('Журнал: выстрел (стр. 19–20)', () => {
  it('сообщает оружие, грань кубика, Стойкость и исход', () => {
    const state = createInitialGameState('log-shoot');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [
      eventEntry(1, {
        type: 'SHOOT_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        weaponName: 'Пистолет учёного',
        ammoLeft: 2,
        targetIntruderId: 'intruder-1',
        targetType: 'ADULT',
        dieFace: 'ONE_WOUND',
        woundsBefore: 2,
        injuries: 1,
        woundsTotal: 3,
        toughnessCards: [],
        toughnessTotal: 3,
        killed: true,
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('стреляет из «Пистолет учёного»');
    expect(message).toContain('цель: Взрослая особь');
    expect(message).toContain('1 РАНА');
    expect(message).toContain('Стойкости 3');
    expect(message).toContain('Чужой убит!');
  });
});

describe('Журнал: Останки и подбор объектов (Шаг 6)', () => {
  it('INTRUDER_KILLED: Останки на полу; Личинка — без Останков', () => {
    const state = createInitialGameState('log-remains');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [
      eventEntry(3, {
        type: 'INTRUDER_KILLED',
        playerId: 'player-1',
        roomId: 11,
        targetIntruderId: 'intruder-1',
        targetType: 'ADULT',
        remainsObjectId: 'remains-9',
      }),
      eventEntry(4, {
        type: 'INTRUDER_KILLED',
        playerId: 'player-1',
        roomId: 11,
        targetIntruderId: 'intruder-2',
        targetType: 'LARVA',
        remainsObjectId: null,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('убивает Взрослую особь');
    expect(messages[0]).toContain('Жетон Останков — на полу');
    expect(messages[1]).toContain('Личинку');
    expect(messages[1]).toContain('не оставляет Останков');
  });

  it('OBJECT_PICKED_UP: кто и какой объект поднял', () => {
    const state = createInitialGameState('log-pickup');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [
      eventEntry(5, {
        type: 'OBJECT_PICKED_UP',
        playerId: 'player-1',
        roomId: 11,
        objectId: 'remains-9',
        objectKind: 'INTRUDER_REMAINS',
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('Капитан');
    expect(message).toContain('поднимает Тяжёлый объект');
    expect(message).toContain('Останки Чужого');
  });
});

describe('Журнал: атаки при Побеге (Шаг 7)', () => {
  it('ESCAPE_ATTACK_RESOLVED: попадание, промах и инфицирование Личинкой', () => {
    const state = createInitialGameState('log-escape');
    const view = filterStateForPlayer(state, 'player-1');
    view.gameLog = [
      eventEntry(6, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        intruderId: 'intruder-1',
        intruderType: 'ADULT',
        card: { ...INTRUDER_ATTACK_CARDS[0]! },
        outcome: 'HIT',
        victims: [
          { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
        ],
      }),
      eventEntry(7, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        intruderId: 'intruder-1',
        intruderType: 'CREEPER',
        card: { ...INTRUDER_ATTACK_CARDS[4]! },
        outcome: 'MISS',
        victims: [
          { playerId: 'player-1', isDead: false, lightWounds: 0, seriousWounds: 0, hasLarva: false, hasSlime: false },
        ],
      }),
      eventEntry(8, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        intruderId: 'intruder-2',
        intruderType: 'LARVA',
        card: null,
        outcome: 'INFESTATION',
        victims: [
          { playerId: 'player-1', isDead: false, lightWounds: 0, seriousWounds: 0, hasLarva: true, hasSlime: false },
        ],
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Побег: Взрослая особь атакует Капитан в спину');
    expect(messages[0]).toContain('Царапина');
    expect(messages[1]).toContain('промах, нет символа атакующего');
    expect(messages[2]).toContain('Личинка удалена с поля');
  });
});
