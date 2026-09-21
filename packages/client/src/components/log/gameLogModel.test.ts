import { describe, expect, it } from 'vitest';

import type { GameLogEvent } from '@nemesis/shared';
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
describe('gameLogModel: Контакт и Внезапная атака', () => {
  it('форматирует Контакт с жетоном, первым флагом и сбросом Шума', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-contact'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'CONTACT_OCCURRED',
        playerId: 'player-1',
        roomId: 6,
        tokenType: 'QUEEN',
        escapeNumber: 4,
        handCount: 2,
        isFirstContact: true,
        clearedCorridorIds: ['3-6'],
        clearedTechnical: true,
      }),
    ];

    const [entry] = formatGameLog(view);
    const message = entry!.segments.map((segment) => segment.text).join('');

    expect(message).toContain('КОНТАКТ');
    expect(message).toContain('Королева');
    expect(message).toContain('число Бегства 4');
    expect(message).toContain('Первый Контакт партии');
    expect(message).toContain('Маркеры Шума сброшены (включая Технические Коридоры)');
    expect(entry!.segments.some((segment) => segment.tone === 'danger' && segment.strong)).toBe(true);
  });

  it('форматирует Пустой жетон и причину шума от него', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-blank'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'CONTACT_OCCURRED',
        playerId: 'player-1',
        roomId: 6,
        tokenType: 'BLANK',
        escapeNumber: 0,
        handCount: 5,
        isFirstContact: false,
        clearedCorridorIds: [],
        clearedTechnical: false,
      }),
      eventEntry(2, {
        type: 'NOISE_MARKER_PLACED',
        playerId: 'player-1',
        roomId: 6,
        target: { kind: 'CORRIDOR', corridorId: '3-6' },
        reason: 'BLANK',
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Пустой');
    expect(messages[0]).not.toContain('Первый Контакт партии');
    expect(messages[1]).toContain('Пустой жетон');
  });

  it('форматирует триггер и все исходы Внезапной атаки', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-surprise'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'SURPRISE_ATTACK_TRIGGERED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        handCount: 2,
        escapeNumber: 4,
      }),
      eventEntry(2, {
        type: 'SURPRISE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'TAIL_1',
        attackCardName: 'Атака хвостом',
        hit: false,
        outcome: 'MISSED',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 0,
      }),
      eventEntry(3, {
        type: 'SURPRISE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'SCRATCH_1',
        attackCardName: 'Царапина',
        hit: true,
        outcome: 'HIT_SURVIVED',
        lightWoundsDealt: 1,
        seriousWoundsDealt: 0,
        contaminationDealt: 1,
      }),
      eventEntry(4, {
        type: 'SURPRISE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-larva-1',
        intruderType: 'LARVA',
        attackCardId: null,
        attackCardName: null,
        hit: true,
        outcome: 'LARVA_INFECTION',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 1,
      }),
      eventEntry(5, {
        type: 'SURPRISE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'BITE_1',
        attackCardName: 'Укус',
        hit: true,
        outcome: 'HIT_DIED',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 0,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('ВНЕЗАПНАЯ АТАКА');
    expect(messages[0]).toContain('Взрослая Особь');
    expect(messages[1]).toContain('Мимо');
    expect(messages[2]).toContain('пережил Внезапную атаку («Царапина»): 1 Лёгкая Травма, 1 Заражение.');
    expect(messages[3]).toContain('заражает');
    expect(messages[4]).toContain('погибает от Внезапной атаки («Укус»)!');
  });

  it('форматирует все исходы внеочередной атаки при Побеге', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-escape'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'TAIL_1',
        attackCardName: 'Атака хвостом',
        hit: false,
        outcome: 'MISSED',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 0,
      }),
      eventEntry(2, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'SCRATCH_1',
        attackCardName: 'Царапина',
        hit: true,
        outcome: 'HIT_SURVIVED',
        lightWoundsDealt: 1,
        seriousWoundsDealt: 0,
        contaminationDealt: 1,
      }),
      eventEntry(3, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-larva-1',
        intruderType: 'LARVA',
        attackCardId: null,
        attackCardName: null,
        hit: true,
        outcome: 'LARVA_INFECTION',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 1,
      }),
      eventEntry(4, {
        type: 'ESCAPE_ATTACK_RESOLVED',
        playerId: 'player-1',
        intruderId: 'test-adult-1',
        intruderType: 'ADULT',
        attackCardId: 'BITE_1',
        attackCardName: 'Укус',
        hit: true,
        outcome: 'HIT_DIED',
        lightWoundsDealt: 0,
        seriousWoundsDealt: 0,
        contaminationDealt: 0,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Мимо');
    expect(messages[0]).toContain('убегающего');
    expect(messages[1]).toContain('пережил атаку в спину («Царапина»): 1 Лёгкая Травма, 1 Заражение.');
    expect(messages[2]).toContain('заражает убегающего');
    expect(messages[3]).toContain('погибает при Побеге («Укус»)!');
  });

  it('форматирует Трансформацию, Зов и гибель персонажа', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-specials'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'INTRUDER_TRANSFORMED',
        roomId: 6,
        oldIntruderId: 'test-creeper-1',
        newIntruderId: 'test-breeder-1',
      }),
      eventEntry(2, {
        type: 'INTRUDER_CALLED',
        roomId: 6,
        intruderId: 'test-adult-9',
        tokenType: 'ADULT',
      }),
      eventEntry(3, { type: 'INTRUDER_CALLED', roomId: 6, intruderId: null, tokenType: 'BLANK' }),
      eventEntry(4, { type: 'PLAYER_DIED', playerId: 'player-1', roomId: 6, cause: 'INTRUDER_ATTACK' }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Трансформация');
    expect(messages[0]).toContain('Крипер становится Трутнем');
    expect(messages[1]).toContain('появляется');
    expect(messages[1]).toContain('Взрослая Особь');
    expect(messages[2]).toContain('никто не пришёл');
    expect(messages[3]).toContain('погибает');
    expect(messages[3]).toContain('Труп остаётся в отсеке');
  });

  it('форматирует завершение партии гибелью всех персонажей', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-all-dead'), 'player-1');

    view.gameLog = [eventEntry(1, { type: 'GAME_OVER', reason: 'ALL_PLAYERS_DEAD' })];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('ПАРТИЯ ЗАВЕРШЕНА');
    expect(message).toContain('погибли все персонажи');
  });
});

describe('gameLogModel: Стрельба и Стойкость', () => {
  it('форматирует выстрел, проверку Стойкости, гибель и отступление', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-shoot'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'SHOT_FIRED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'ADULT',
        weaponId: 'w-1',
        weaponName: 'Пистолет',
        dieFace: 'ONE_WOUND',
        woundsDealt: 1,
      }),
      eventEntry(2, {
        type: 'TOUGHNESS_CHECKED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'ADULT',
        attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 2, hasRetreat: false }],
        woundsTotal: 1,
        killed: false,
        retreated: false,
      }),
      eventEntry(3, {
        type: 'SHOT_FIRED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'ADULT',
        weaponId: 'w-1',
        weaponName: 'Пистолет',
        dieFace: 'MISS',
        woundsDealt: 0,
      }),
      eventEntry(4, {
        type: 'INTRUDER_KILLED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'ADULT',
      }),
      eventEntry(5, {
        type: 'INTRUDER_RETREATED',
        playerId: 'player-1',
        intruderId: 'i-2',
        intruderType: 'CREEPER',
        fromRoomId: 1,
        toRoomId: 2,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('стреляет из «Пистолет»');
    expect(messages[0]).toContain('1 Рана');
    expect(messages[0]).toContain('Ран нанесено: 1');
    expect(messages[1]).toContain('Проверка Стойкости');
    expect(messages[1]).toContain('«Царапина» (Стойкость 2)');
    expect(messages[1]).toContain('Чужой выживает.');
    expect(messages[2]).toContain('Промах');
    expect(messages[3]).toContain('убивает');
    expect(messages[4]).toContain('отступить');
  });

  it('показывает отступление и гибель в проверке Стойкости', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-toughness'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'TOUGHNESS_CHECKED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'CREEPER',
        attackCards: [{ id: 'a-1', name: 'Укус', toughness: 2, hasRetreat: true }],
        woundsTotal: 6,
        killed: false,
        retreated: true,
      }),
      eventEntry(2, {
        type: 'TOUGHNESS_CHECKED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-2',
        intruderType: 'BREEDER',
        attackCards: [
          { id: 'a-2', name: 'Царапина', toughness: 3, hasRetreat: false },
          { id: 'a-3', name: 'Укус', toughness: 4, hasRetreat: false },
        ],
        woundsTotal: 7,
        killed: true,
        retreated: false,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('отступление!');
    expect(messages[0]).toContain('Чужой отступает!');
    expect(messages[1]).toContain(' + ');
    expect(messages[1]).toContain('Чужой убит!');
  });

  it('форматирует рукопашную с ценой и промахом', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-melee'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'MELEE_ATTACKED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'CREEPER',
        dieFace: 'TAIL',
        woundsDealt: 1,
        contaminationDealt: 1,
        seriousWoundDealt: 0,
      }),
      eventEntry(2, {
        type: 'MELEE_ATTACKED',
        playerId: 'player-1',
        roomId: 1,
        intruderId: 'i-1',
        intruderType: 'ADULT',
        dieFace: 'MISS',
        woundsDealt: 0,
        contaminationDealt: 1,
        seriousWoundDealt: 1,
      }),
    ];

    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('атакует врукопашную');
    expect(messages[0]).toContain('Хвост');
    expect(messages[0]).toContain('Заражение: +1');
    expect(messages[1]).toContain('промах');
    expect(messages[1]).toContain('Тяжёлая Травма: +1');
  });

  it('форматирует подбор Тяжёлого Объекта', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-pickup'), 'player-1');

    view.gameLog = [
      eventEntry(1, {
        type: 'OBJECT_PICKED_UP',
        playerId: 'player-1',
        roomId: 1,
        objectId: 'remains-1',
        objectKind: 'INTRUDER_REMAINS',
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain('подбирает');
    expect(message).toContain('Останки Чужого');
  });
});
