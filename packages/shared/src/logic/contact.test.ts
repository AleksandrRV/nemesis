import { describe, expect, it } from 'vitest';

import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { drainInterrupts, EngineError, GameEngine } from './fsm.js';
import { createInitialGameState } from './setup.js';
import {
  dealLightWounds,
  dealSeriousWounds,
  drawIntruderAttackCard,
  giveContaminationCards,
  killPlayer,
  queueContact,
  resolveContactInterrupt,
  resolveSurpriseAttackInterrupt,
} from './contact.js';

const SEED = 'contact-test';

function freshState(playerCount = 1): GameState {
  return createInitialGameState(SEED, { playerCount });
}

function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
    return;
  }

  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
}

function placePlayer(state: GameState, playerId: string, roomId: RoomId): void {
  const player = state.players[playerId]!;

  for (const room of Object.values(state.ship.rooms)) {
    room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
  }

  state.ship.rooms[roomId]!.occupantPlayerIds.push(playerId);
  player.roomId = roomId;
}

function forceBagTop(state: GameState, token: IntruderToken): void {
  state.intrudersPool.bag.unshift(token);
}

function forceAttackTop(state: GameState, name: string): void {
  const pile = state.decks.intruderAttacks.drawPile;
  const index = pile.findIndex((card) => card.name === name);

  if (index === -1) throw new Error(`В колоде Атак Чужих нет карты «${name}».`);

  const [card] = pile.splice(index, 1);

  pile.unshift(card!);
}

function spawnIntruder(
  state: GameState,
  roomId: RoomId,
  type: IntruderType,
  tokenId: string,
  escapeNumber = 1,
): IntruderEntity {
  const token: IntruderToken = { id: tokenId, type, escapeNumber };
  const entity: IntruderEntity = { id: token.id, type, roomId, woundsCount: 0, token };

  state.intrudersPool.boardTokens.push(entity);
  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);

  return entity;
}

function woundSerious(state: GameState, playerId: string, count: number): void {
  const player = state.players[playerId]!;

  for (let dealt = 0; dealt < count; dealt++) {
    player.seriousWounds.push(state.decks.seriousWounds.drawPile.shift()!);
  }
}

function shrinkHand(state: GameState, playerId: string, keep: number): void {
  const deck = state.players[playerId]!.actionDeck;

  while (deck.hand.length > keep) deck.discard.push(deck.hand.pop()!);
}

function logTypes(state: GameState): string[] {
  return state.gameLog.map((entry) => entry.event.type);
}

describe('Контакт: триггер и сброс Шума (стр. 15, 18)', () => {
  it('кладёт прерывание Контакта в очередь вместо маркера', () => {
    const state = freshState();

    queueContact(state, 'player-1', 6);

    expect(state.interruptQueue).toEqual([{ type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 }]);
  });

  it('сбрасывает Шум из всех Коридоров отсека и вентиляции (стр. 18, шаг 1)', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 14);
    state.ship.technicalCorridorNoise = true;

    for (const corridor of Object.values(state.ship.corridors)) {
      corridor.hasNoise = corridor.fromRoomId === 14 || corridor.toRoomId === 14;
    }

    forceBagTop(state, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 1 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 14 });

    expect(
      Object.values(state.ship.corridors).filter(
        (corridor) => corridor.hasNoise && (corridor.fromRoomId === 14 || corridor.toRoomId === 14),
      ),
    ).toEqual([]);
    expect(state.ship.technicalCorridorNoise).toBe(false);

    const contact = state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED');

    expect(contact?.event.type).toBe('CONTACT_OCCURRED');

    if (contact?.event.type === 'CONTACT_OCCURRED') {
      expect(contact.event.clearedCorridorIds.length).toBeGreaterThan(0);
      expect(contact.event.clearedTechnical).toBe(true);
    }
  });

  it('отклоняет Контакт для неизвестного отсека и персонажа', () => {
    expectEngineError(
      () => resolveContactInterrupt(freshState(), { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 999 }),
      'UNKNOWN_ROOM',
    );
    expectEngineError(
      () => resolveContactInterrupt(freshState(), { type: 'CONTACT_INTERRUPT', playerId: 'ghost', roomId: 6 }),
      'UNKNOWN_PLAYER',
    );
  });

  it('отклоняет Контакт при пустом мешке явной ошибкой', () => {
    const state = freshState();

    state.intrudersPool.bag = [];
    expectEngineError(
      () => resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 }),
      'INTRUDER_BAG_EMPTY',
    );
  });
});

describe('Контакт: появление Чужого и Внезапная атака (стр. 18)', () => {
  it('ставит миниатюру в отсек с отложенным жетоном (стр. 18, шаги 2–3)', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    forceBagTop(state, { id: 'test-queen-1', type: 'QUEEN', escapeNumber: 1 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === 'test-queen-1');

    expect(entity).toMatchObject({ type: 'QUEEN', roomId: 6, woundsCount: 0 });
    expect(entity?.token).toEqual({ id: 'test-queen-1', type: 'QUEEN', escapeNumber: 1 });
    expect(state.ship.rooms[6]?.occupantIntruderIds).toContain('test-queen-1');
  });

  it('проверяет Внезапную атаку строгим сравнением карт руки с числом жетона (стр. 18, шаг 4)', () => {
    const triggered = freshState();

    shrinkHand(triggered, 'player-1', 3);
    forceBagTop(triggered, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
    resolveContactInterrupt(triggered, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(logTypes(triggered)).toContain('SURPRISE_ATTACK_TRIGGERED');
    expect(triggered.interruptQueue).toEqual([
      { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'test-adult-1' },
    ]);

    const equal = freshState();

    shrinkHand(equal, 'player-1', 4);
    forceBagTop(equal, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
    resolveContactInterrupt(equal, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(logTypes(equal)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
    expect(equal.interruptQueue).toEqual([]);
  });

  it('помечает первый Контакт партии флагом для сброса Целей', () => {
    const state = freshState();

    forceBagTop(state, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 1 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
    forceBagTop(state, { id: 'test-adult-2', type: 'ADULT', escapeNumber: 1 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 7 });

    const contacts = state.gameLog.filter((entry) => entry.event.type === 'CONTACT_OCCURRED');

    expect(contacts).toHaveLength(2);
    expect(contacts[0]?.event.type).toBe('CONTACT_OCCURRED');
    expect(contacts[1]?.event.type).toBe('CONTACT_OCCURRED');

    if (contacts[0]?.event.type === 'CONTACT_OCCURRED' && contacts[1]?.event.type === 'CONTACT_OCCURRED') {
      expect(contacts[0].event.isFirstContact).toBe(true);
      expect(contacts[1].event.isFirstContact).toBe(false);
    }
  });

  it('воспроизводит Контакт по сиду без подтасовок мешка и колоды', () => {
    const first = freshState();
    const second = freshState();

    resolveContactInterrupt(first, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
    resolveContactInterrupt(second, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(first).toEqual(second);
  });
});

describe('Контакт: Пустой жетон (стр. 18)', () => {
  it('возвращает жетон в мешок и шумит во все Коридоры без появления Чужого', () => {
    const state = freshState();
    const bagSize = state.intrudersPool.bag.length;
    const blanksBefore = state.intrudersPool.bag.filter((token) => token.type === 'BLANK').length;
    const leadingCount = Object.values(state.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === 6 || corridor.toRoomId === 6,
    ).length;

    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.intrudersPool.bag).toHaveLength(bagSize + 1);
    expect(state.intrudersPool.bag.filter((token) => token.type === 'BLANK')).toHaveLength(blanksBefore + 1);
    expect(
      Object.values(state.ship.corridors).filter(
        (corridor) => corridor.hasNoise && (corridor.fromRoomId === 6 || corridor.toRoomId === 6),
      ),
    ).toHaveLength(leadingCount);
    expect(logTypes(state)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
    expect(state.interruptQueue).toEqual([]);
  });

  it('последний жетон в мешке добавляет Взрослую Особь из запаса', () => {
    const state = freshState();
    const supplyAdults = state.intrudersPool.supply.filter((token) => token.type === 'ADULT').length;

    state.intrudersPool.bag = [{ id: 'blank', type: 'BLANK', escapeNumber: 0 }];
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(state.intrudersPool.bag.filter((token) => token.type === 'ADULT')).toHaveLength(1);
    expect(state.intrudersPool.bag.filter((token) => token.type === 'BLANK')).toHaveLength(1);
    expect(state.intrudersPool.supply.filter((token) => token.type === 'ADULT')).toHaveLength(supplyAdults - 1);
  });

  it('без Взрослых в запасе последний Пустой просто возвращается', () => {
    const state = freshState();

    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'ADULT');
    state.intrudersPool.bag = [{ id: 'blank', type: 'BLANK', escapeNumber: 0 }];
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(state.intrudersPool.bag).toEqual([{ id: 'blank', type: 'BLANK', escapeNumber: 0 }]);
  });

  it('Пустой срабатывает при ровно достаточном запасе: заняты все остальные Коридоры и вентиляция', () => {
    const state = freshState();

    for (const corridor of Object.values(state.ship.corridors)) {
      corridor.hasNoise = corridor.fromRoomId !== 6 && corridor.toRoomId !== 6;
    }

    state.ship.technicalCorridorNoise = true;
    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });

    expect(
      Object.values(state.ship.corridors).filter(
        (corridor) => !corridor.hasNoise && (corridor.fromRoomId === 6 || corridor.toRoomId === 6),
      ),
    ).toEqual([]);
  });
});

describe('Внезапная атака: промах и Личинка (стр. 18, 20)', () => {
  it('атака проходит мимо без символа атакующего типа', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
    forceAttackTop(state, 'Атака хвостом');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    const resolved = state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED');

    expect(resolved?.event.type).toBe('SURPRISE_ATTACK_RESOLVED');

    if (resolved?.event.type === 'SURPRISE_ATTACK_RESOLVED') {
      expect(resolved.event.hit).toBe(false);
      expect(resolved.event.outcome).toBe('MISSED');
      expect(resolved.event.attackCardName).toBe('Атака хвостом');
    }

    expect(state.players['player-1']?.lightWounds).toBe(0);
    expect(state.decks.intruderAttacks.discard).toHaveLength(1);
  });

  it('Личинка заражает без карты: уходит с поля на планшет и даёт Заражение', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'LARVA', 'test-larva-1');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.ship.rooms[6]?.occupantIntruderIds).toEqual([]);
    expect(state.players['player-1']?.hasLarva).toBe(true);
    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
    expect(state.decks.intruderAttacks.drawPile).toHaveLength(20);
    expect(state.decks.intruderAttacks.discard).toHaveLength(0);

    const resolved = state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED');

    if (resolved?.event.type === 'SURPRISE_ATTACK_RESOLVED') {
      expect(resolved.event.outcome).toBe('LARVA_INFECTION');
      expect(resolved.event.attackCardId).toBeNull();
    } else {
      throw new Error('Нет записи о разыгранной Внезапной атаке.');
    }
  });

  it('отклоняет атаку Чужого, которого нет на поле, и неизвестную карту', () => {
    expectEngineError(
      () =>
        resolveSurpriseAttackInterrupt(freshState(), {
          type: 'SURPRISE_ATTACK_INTERRUPT',
          playerId: 'player-1',
          intruderId: 'ghost',
        }),
      'UNKNOWN_INTRUDER',
    );

    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');

    state.decks.intruderAttacks.drawPile.unshift({
      id: 'UNKNOWN_ATTACK',
      name: 'Неведомая жуть',
      description: 'Карты с таким эффектом нет в коробке.',
      toughness: 1,
      hasRetreat: false,
      attackerTypes: ['ADULT'],
    });

    expectEngineError(
      () =>
        resolveSurpriseAttackInterrupt(state, {
          type: 'SURPRISE_ATTACK_INTERRUPT',
          playerId: 'player-1',
          intruderId: entity.id,
        }),
      'UNKNOWN_ATTACK_EFFECT',
    );
  });
});

describe('Внезапная атака: раны и смерть (стр. 20–21)', () => {
  it('Царапина даёт Лёгкую Травму и Заражение', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
    forceAttackTop(state, 'Царапина');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.players['player-1']?.lightWounds).toBe(1);
    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
  });

  it('Атака когтями даёт две Лёгкие Травмы и Заражение', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
    forceAttackTop(state, 'Атака когтями');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.players['player-1']?.lightWounds).toBe(2);
    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
  });

  it('третья Лёгкая Травма сбрасывает счётчик и даёт Тяжёлую', () => {
    const state = freshState();

    state.players['player-1']!.lightWounds = 2;

    const result = dealLightWounds(state, 'player-1', 1);

    expect(result).toEqual({ died: false, lightDealt: 0, seriousDealt: 1 });
    expect(state.players['player-1']?.lightWounds).toBe(0);
    expect(state.players['player-1']?.seriousWounds).toHaveLength(1);
    expect(state.decks.seriousWounds.drawPile).toHaveLength(15);
  });

  it('Укус при двух Тяжёлых убивает, при меньшем числе — ранит', () => {
    const lethal = freshState();

    placePlayer(lethal, 'player-1', 6);
    const lethalEntity = spawnIntruder(lethal, 6, 'ADULT', 'test-adult-1');

    woundSerious(lethal, 'player-1', 2);
    forceAttackTop(lethal, 'Укус');
    resolveSurpriseAttackInterrupt(lethal, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: lethalEntity.id,
    });

    expect(lethal.players['player-1']?.isDead).toBe(true);
    expect(logTypes(lethal)).toContain('PLAYER_DIED');

    const wounded = freshState();

    placePlayer(wounded, 'player-1', 6);
    const woundedEntity = spawnIntruder(wounded, 6, 'ADULT', 'test-adult-1');

    woundSerious(wounded, 'player-1', 1);
    forceAttackTop(wounded, 'Укус');
    resolveSurpriseAttackInterrupt(wounded, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: woundedEntity.id,
    });

    expect(wounded.players['player-1']?.isDead).toBe(false);
    expect(wounded.players['player-1']?.seriousWounds).toHaveLength(2);
  });

  it('Атака хвостом убивает при хотя бы одной Тяжёлой', () => {
    const lethal = freshState();

    placePlayer(lethal, 'player-1', 6);
    const lethalEntity = spawnIntruder(lethal, 6, 'QUEEN', 'test-queen-1');

    woundSerious(lethal, 'player-1', 1);
    forceAttackTop(lethal, 'Атака хвостом');
    resolveSurpriseAttackInterrupt(lethal, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: lethalEntity.id,
    });

    expect(lethal.players['player-1']?.isDead).toBe(true);

    const wounded = freshState();

    placePlayer(wounded, 'player-1', 6);
    const woundedEntity = spawnIntruder(wounded, 6, 'QUEEN', 'test-queen-1');

    forceAttackTop(wounded, 'Атака хвостом');
    resolveSurpriseAttackInterrupt(wounded, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: woundedEntity.id,
    });

    expect(wounded.players['player-1']?.seriousWounds).toHaveLength(1);
  });

  it('четвёртая Травма при трёх Тяжёлых убивает немедленно', () => {
    const light = freshState();

    woundSerious(light, 'player-1', 3);

    expect(dealLightWounds(light, 'player-1', 1).died).toBe(true);
    expect(light.players['player-1']?.isDead).toBe(true);

    const serious = freshState();

    woundSerious(serious, 'player-1', 3);

    expect(dealSeriousWounds(serious, 'player-1', 1).died).toBe(true);
    expect(serious.players['player-1']?.isDead).toBe(true);
  });

  it('смерть убирает миниатюру, кладёт Труп и сбрасывает Тяжёлые Объекты', () => {
    const state = freshState();
    const player = state.players['player-1']!;

    placePlayer(state, 'player-1', 6);
    player.handSlots.push({ source: 'OBJECT', object: { id: 'test-egg-1', kind: 'EGG' } });
    killPlayer(state, 'player-1', 'INTRUDER_ATTACK');

    expect(player.isDead).toBe(true);
    expect(player.handSlots).toEqual([]);
    expect(state.ship.rooms[6]?.occupantPlayerIds).not.toContain('player-1');
    expect(state.ship.rooms[6]?.objects).toContainEqual({
      id: 'corpse-player-1',
      kind: 'CORPSE',
      characterClass: player.characterClass,
    });
    expect(state.ship.rooms[6]?.objects).toContainEqual({ id: 'test-egg-1', kind: 'EGG' });
  });

  it('Слизь даёт маркер и Заражение', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
    forceAttackTop(state, 'Слизь');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.players['player-1']?.hasSlime).toBe(true);
    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
  });
});

describe('Внезапная атака: особые эффекты карт', () => {
  it('Трансформация меняет Крипера на Трутня из запаса', () => {
    const state = freshState();
    const supplyBreeders = state.intrudersPool.supply.filter((token) => token.type === 'BREEDER').length;

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');
    forceAttackTop(state, 'Трансформация');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.intrudersPool.boardTokens.map((candidate) => candidate.type)).toEqual(['BREEDER']);
    expect(state.intrudersPool.supply.filter((token) => token.type === 'BREEDER')).toHaveLength(supplyBreeders - 1);
    expect(state.intrudersPool.supply.map((token) => token.id)).toContain('test-creeper-1');
    expect(logTypes(state)).toContain('INTRUDER_TRANSFORMED');
    expect(state.interruptQueue).toEqual([]);
  });

  it('Трансформация при пустой руке вызывает новую Внезапную атаку Трутня', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');

    shrinkHand(state, 'player-1', 0);
    forceAttackTop(state, 'Трансформация');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.interruptQueue).toHaveLength(1);
    expect(state.interruptQueue[0]?.type).toBe('SURPRISE_ATTACK_INTERRUPT');
    expect(logTypes(state).filter((type) => type === 'SURPRISE_ATTACK_TRIGGERED')).toHaveLength(1);

    drainInterrupts(state);

    expect(logTypes(state).filter((type) => type === 'SURPRISE_ATTACK_RESOLVED')).toHaveLength(2);
    expect(state.interruptQueue).toEqual([]);
  });

  it('Трансформация без Трутней в запасе отклоняется явной ошибкой', () => {
    const state = freshState();

    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'BREEDER');
    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');
    forceAttackTop(state, 'Трансформация');

    expectEngineError(
      () =>
        resolveSurpriseAttackInterrupt(state, {
          type: 'SURPRISE_ATTACK_INTERRUPT',
          playerId: 'player-1',
          intruderId: entity.id,
        }),
      'NO_BREEDER_IN_SUPPLY',
    );
  });

  it('Ярость убивает с двумя Тяжёлыми и ранит остальных в отсеке', () => {
    const state = freshState(2);

    placePlayer(state, 'player-1', 6);
    placePlayer(state, 'player-2', 6);
    woundSerious(state, 'player-2', 2);
    const entity = spawnIntruder(state, 6, 'BREEDER', 'test-breeder-1');
    forceAttackTop(state, 'Ярость');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.players['player-1']?.isDead).toBe(false);
    expect(state.players['player-1']?.seriousWounds).toHaveLength(1);
    expect(state.players['player-2']?.isDead).toBe(true);
  });

  it('Зов приводит Чужого из мешка без Внезапной атаки', () => {
    const state = freshState();

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'QUEEN', 'test-queen-1');

    forceBagTop(state, { id: 'test-adult-9', type: 'ADULT', escapeNumber: 4 });
    shrinkHand(state, 'player-1', 0);
    forceAttackTop(state, 'Зов');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.intrudersPool.boardTokens.map((candidate) => candidate.id)).toContain('test-adult-9');
    expect(logTypes(state)).toContain('INTRUDER_CALLED');
    expect(logTypes(state)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
    expect(state.interruptQueue).toEqual([]);
  });

  it('Зов на Пустой жетон возвращает его в мешок без появления', () => {
    const state = freshState();
    const bagSize = state.intrudersPool.bag.length;

    placePlayer(state, 'player-1', 6);
    const entity = spawnIntruder(state, 6, 'QUEEN', 'test-queen-1');

    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
    forceAttackTop(state, 'Зов');
    resolveSurpriseAttackInterrupt(state, {
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: 'player-1',
      intruderId: entity.id,
    });

    expect(state.intrudersPool.bag).toHaveLength(bagSize + 1);
    expect(state.intrudersPool.boardTokens).toHaveLength(1);
  });
});

describe('Контакт: колоды, сбросы и смерть активного игрока', () => {
  it('пустая колода Атак тасуется из сброса потоком combat', () => {
    const first = freshState();
    const second = freshState();

    for (const state of [first, second]) {
      const pile = state.decks.intruderAttacks;

      pile.discard.push(...pile.drawPile.splice(0, pile.drawPile.length));
    }

    const firstCard = drawIntruderAttackCard(first);
    const secondCard = drawIntruderAttackCard(second);

    expect(firstCard.id).toBe(secondCard.id);
    expect(first.meta.rngDraws.combat).toBe(19);
    expect(first.decks.intruderAttacks.drawPile).toHaveLength(19);
    expect(first.decks.intruderAttacks.discard).toHaveLength(0);
  });

  it('пустые колода и сброс Атак, Заражения и Травм отклоняются явной ошибкой', () => {
    const attacks = freshState();

    attacks.decks.intruderAttacks.drawPile = [];
    attacks.decks.intruderAttacks.discard = [];
    expectEngineError(() => drawIntruderAttackCard(attacks), 'NO_INTRUDER_ATTACKS_LEFT');

    const contamination = freshState();

    contamination.decks.contamination.drawPile = [];
    contamination.decks.contamination.discard = [];
    expectEngineError(() => giveContaminationCards(contamination, 'player-1', 1), 'NO_CONTAMINATION_LEFT');

    const wounds = freshState();

    wounds.decks.seriousWounds.drawPile = [];
    wounds.decks.seriousWounds.discard = [];
    expectEngineError(() => dealSeriousWounds(wounds, 'player-1', 1), 'NO_SERIOUS_WOUNDS_LEFT');
  });

  it('гибель активного игрока передаёт ход дальше, соло-гибель завершает партию', () => {
    const engine = new GameEngine();

    const duel = createInitialGameState('engine-test', { playerCount: 2 });

    duel.ship.rooms[6]!.isExplored = false;
    duel.ship.rooms[6]!.explorationEffect = null;
    Object.values(duel.ship.corridors).find(
      (corridor) =>
        (corridor.fromRoomId === 6 || corridor.toRoomId === 6) &&
        (corridor.fromRoomId === 6 ? corridor.fromNumbers : corridor.toNumbers).includes(3),
    )!.hasNoise = true;
    woundSerious(duel, 'player-1', 2);
    shrinkHand(duel, 'player-1', 3);
    forceBagTop(duel, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
    forceAttackTop(duel, 'Укус');

    const afterDuel = engine.processAction(duel, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [duel.players['player-1']!.actionDeck.hand[0]!.id] },
    });

    expect(afterDuel.players['player-1']?.isDead).toBe(true);
    expect(afterDuel.players['player-1']?.hasPassed).toBe(true);
    expect(afterDuel.meta.activePlayerId).toBe('player-2');
    expect(afterDuel.meta.phase).toBe('PLAYER_PHASE');

    const solo = createInitialGameState('engine-test');

    solo.ship.rooms[6]!.isExplored = false;
    solo.ship.rooms[6]!.explorationEffect = null;
    Object.values(solo.ship.corridors).find(
      (corridor) =>
        (corridor.fromRoomId === 6 || corridor.toRoomId === 6) &&
        (corridor.fromRoomId === 6 ? corridor.fromNumbers : corridor.toNumbers).includes(3),
    )!.hasNoise = true;
    woundSerious(solo, 'player-1', 2);
    shrinkHand(solo, 'player-1', 3);
    forceBagTop(solo, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
    forceAttackTop(solo, 'Укус');

    const afterSolo = engine.processAction(solo, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [solo.players['player-1']!.actionDeck.hand[0]!.id] },
    });

    expect(afterSolo.meta.phase).toBe('GAME_OVER');
    expect(afterSolo.meta.gameOverReason).toBe('ALL_PLAYERS_DEAD');
    expect(afterSolo.interruptQueue).toEqual([]);
  });
});

describe('Сквозной бой: шум → Контакт → очередь → Останки → Побег (Шаг 8)', () => {
  const E2E_SEED = 'nemesis-e2e';

  function forceAttackTopById(state: GameState, cardId: string): void {
    const pile = state.decks.intruderAttacks.drawPile;
    const index = pile.findIndex((card) => card.id === cardId);

    if (index === -1) throw new Error(`В колоде Атак Чужих нет карты ${cardId}.`);

    const [card] = pile.splice(index, 1);

    pile.unshift(card!);
  }

  it('полный цикл боя: Контакт, очередь с убийством и Побег от Крипера', () => {
    const engine = new GameEngine();
    const state = createInitialGameState(E2E_SEED, { playerCount: 1, chosenCharacterClass: 'SOLDIER' });
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) => candidate.doorState === 'OPEN' && (candidate.fromRoomId === 11 || candidate.toRoomId === 11),
    )!;
    const target = (corridor.fromRoomId === 11 ? corridor.toRoomId : corridor.fromRoomId) as RoomId;

    state.ship.rooms[target]!.isExplored = true;

    for (const candidate of Object.values(state.ship.corridors)) {
      if (candidate.fromRoomId === target || candidate.toRoomId === target) candidate.hasNoise = true;
    }

    // 1. Повторный шум — Контакт: жетон из мешка, коридоры зачищены.
    state.intrudersPool.bag.unshift({ id: 'e2e-adult', type: 'ADULT', escapeNumber: 1 });
    forceAttackTop(state, 'Трансформация');

    let after = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: target,
        discardCardIds: [state.players['player-1']!.actionDeck.hand[0]!.id],
      },
    });

    expect(logTypes(after)).toContain('CONTACT_OCCURRED');
    expect(after.ship.rooms[target]!.occupantIntruderIds).toContain('e2e-adult');
    expect(
      Object.values(after.ship.corridors).some(
        (candidate) => (candidate.fromRoomId === target || candidate.toRoomId === target) && candidate.hasNoise,
      ),
    ).toBe(false);

    // 2. Очередь: Взрослая погибает при любом броске (бонус 2 ≥ стойкости 2 без стрелки).
    const burstPrep = structuredClone(after);

    burstPrep.players['player-1']!.actionDeck.hand.push({
      id: 'ACT_SOL_BURST_FIRE',
      characterClass: 'SOLDIER',
      name: 'Стрельба очередью',
      playCost: 0,
      description: 'e2e',
    });
    forceAttackTopById(burstPrep, 'INTRUDER_ATTACK_TAIL_1');

    after = engine.processAction(burstPrep, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: 'ACT_SOL_BURST_FIRE', targetIntruderId: 'e2e-adult', weaponSlotIndex: 0 },
    });

    expect(after.intrudersPool.deadTokens.some((token) => token.id === 'e2e-adult')).toBe(true);
    expect(after.ship.rooms[target]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(true);
    expect(logTypes(after)).toContain('INTRUDER_KILLED');

    const rifle = after.players['player-1']!.handSlots[0]!;

    expect(rifle.source === 'ITEM' ? rifle.card.ammo : -1).toBe(0);

    // 3. Побег от подоспевшего Крипера: атака в спину, уход, шум.
    const escapePrep = structuredClone(after);

    spawnIntruder(escapePrep, target, 'CREEPER', 'e2e-creeper-1');
    forceAttackTop(escapePrep, 'Царапина');

    const escaped = engine.processAction(escapePrep, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: 11,
        discardCardIds: [escapePrep.players['player-1']!.actionDeck.hand[0]!.id],
      },
    });
    const escapeTypes = logTypes(escaped);

    expect(escapeTypes).toContain('ESCAPE_ATTACK_RESOLVED');
    expect(escaped.players['player-1']!.roomId).toBe(11);
    expect(escaped.players['player-1']!.lightWounds).toBe(1);
    expect(escapeTypes.filter((type) => type === 'PLAYER_MOVED')).toHaveLength(2);
  });
});
