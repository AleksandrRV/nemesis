import type { CardPile, IntruderAttackCard } from '../types/cards.js';
import type { IntruderEntity, IntruderToken, PlayerState } from '../types/entities.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { PlayerDeathCause } from '../types/log.js';
import type { CorridorConnection, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { createRng, shuffle, type RngStream } from '../utils/rng.js';
import { EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { noiseMarkersInSupply } from './markers.js';

export function queueContact(state: GameState, playerId: string, roomId: RoomId): void {
  state.interruptQueue.push({ type: 'CONTACT_INTERRUPT', playerId, roomId });
}

export function resolveContactInterrupt(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'CONTACT_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Контакт ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Контакт ссылается на неизвестного персонажа: ${interrupt.playerId}.`);
  }

  const clearedCorridorIds = clearContactNoise(state, interrupt.roomId);
  const clearedTechnical = clearTechnicalNoise(state, interrupt.roomId);
  const token = state.intrudersPool.bag.shift();

  if (!token) {
    throw new EngineError('INTRUDER_BAG_EMPTY', 'Пул Чужих пуст: вытягивать жетон Контакта не из чего.');
  }

  const handCount = player.actionDeck.hand.length;
  const isFirstContact = !state.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED');

  if (token.type === 'BLANK') {
    resolveBlankToken(state, interrupt.playerId, interrupt.roomId, token);
    appendGameLog(state, {
      type: 'CONTACT_OCCURRED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      tokenType: 'BLANK',
      escapeNumber: token.escapeNumber,
      handCount,
      isFirstContact,
      clearedCorridorIds,
      clearedTechnical,
    });
    return;
  }

  const entity: IntruderEntity = {
    id: token.id,
    type: token.type,
    roomId: interrupt.roomId,
    woundsCount: 0,
    token,
  };

  state.intrudersPool.boardTokens.push(entity);
  room.occupantIntruderIds.push(entity.id);
  appendGameLog(state, {
    type: 'CONTACT_OCCURRED',
    playerId: interrupt.playerId,
    roomId: interrupt.roomId,
    tokenType: token.type,
    escapeNumber: token.escapeNumber,
    handCount,
    isFirstContact,
    clearedCorridorIds,
    clearedTechnical,
  });

  if (handCount < token.escapeNumber) {
    appendGameLog(state, {
      type: 'SURPRISE_ATTACK_TRIGGERED',
      playerId: interrupt.playerId,
      intruderId: entity.id,
      intruderType: entity.type,
      handCount,
      escapeNumber: token.escapeNumber,
    });
    state.interruptQueue.push({
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId: interrupt.playerId,
      intruderId: entity.id,
    });
  }
}

export function resolveSurpriseAttackInterrupt(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'SURPRISE_ATTACK_INTERRUPT' }>,
): void {
  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Внезапная атака ссылается на неизвестного персонажа: ${interrupt.playerId}.`,
    );
  }

  const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === interrupt.intruderId);

  if (!entity) {
    throw new EngineError(
      'UNKNOWN_INTRUDER',
      `Внезапная атака ссылается на Чужого, которого нет на поле: ${interrupt.intruderId}.`,
    );
  }

  resolveIntruderAttackOnPlayer(state, player, entity, 'SURPRISE_ATTACK_RESOLVED');
}

/**
 * Одна Атака Чужих по персонажу (стр. 20): общая процедура Внезапной атаки
 * и внеочередной атаки при Побеге. Личинка заражает без карты, остальные
 * тянут карту Атаки: есть символ атакующего — эффект, иначе промах.
 */
function resolveIntruderAttackOnPlayer(
  state: GameState,
  player: PlayerState,
  entity: IntruderEntity,
  eventType: 'SURPRISE_ATTACK_RESOLVED' | 'ESCAPE_ATTACK_RESOLVED',
): void {
  if (entity.type === 'LARVA') {
    infectWithLarva(state, player, entity);
    appendGameLog(state, {
      type: eventType,
      playerId: player.id,
      intruderId: entity.id,
      intruderType: entity.type,
      attackCardId: null,
      attackCardName: null,
      hit: true,
      outcome: 'LARVA_INFECTION',
      lightWoundsDealt: 0,
      seriousWoundsDealt: 0,
      contaminationDealt: 1,
    });
    return;
  }

  const card = drawIntruderAttackCard(state);

  if (!card.attackerTypes.includes(entity.type)) {
    state.decks.intruderAttacks.discard.push(card);
    appendGameLog(state, {
      type: eventType,
      playerId: player.id,
      intruderId: entity.id,
      intruderType: entity.type,
      attackCardId: card.id,
      attackCardName: card.name,
      hit: false,
      outcome: 'MISSED',
      lightWoundsDealt: 0,
      seriousWoundsDealt: 0,
      contaminationDealt: 0,
    });
    return;
  }

  const dealt = applyAttackCardEffect(state, player, entity, card);

  state.decks.intruderAttacks.discard.push(card);
  appendGameLog(state, {
    type: eventType,
    playerId: player.id,
    intruderId: entity.id,
    intruderType: entity.type,
    attackCardId: card.id,
    attackCardName: card.name,
    hit: true,
    outcome: dealt.died ? 'HIT_DIED' : 'HIT_SURVIVED',
    lightWoundsDealt: dealt.light,
    seriousWoundsDealt: dealt.serious,
    contaminationDealt: dealt.contamination,
  });
}

/**
 * Побег (стр. 19): перед выходом из отсека убегающего по очереди атакует
 * каждый Чужой в нём — той же процедурой, что Внезапная атака (стр. 20).
 * Атакуют особи из снимка на начало Побега: призванный «Зовом» новичок
 * в этом Побеге уже не атакует. Снимок несёт прерывание ESCAPE_ATTACK_INTERRUPT;
 * без него (прямой вызов) снимок снимается с поля. Если персонаж погибает,
 * цикл прерывается, а перемещение отменяет вызывающий код: Труп остаётся в отсеке.
 */
export function resolveEscapeAttacks(state: GameState, playerId: string, attackerIds?: readonly string[]): void {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Побег ссылается на неизвестного персонажа: ${playerId}.`);
  }

  const roomId = player.roomId;
  const snapshot =
    attackerIds ??
    state.intrudersPool.boardTokens.filter((entity) => entity.roomId === roomId).map((entity) => entity.id);

  for (const intruderId of snapshot) {
    if (player.isDead) return;

    const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);

    if (!entity || entity.roomId !== roomId) continue;

    resolveIntruderAttackOnPlayer(state, player, entity, 'ESCAPE_ATTACK_RESOLVED');
  }
}

export interface WoundResult {
  died: boolean;
  lightDealt: number;
  seriousDealt: number;
}

export function dealLightWounds(state: GameState, playerId: string, count: number): WoundResult {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Травма ссылается на неизвестного персонажа: ${playerId}.`);
  }

  let lightDealt = 0;
  let seriousDealt = 0;

  for (let dealt = 0; dealt < count; dealt++) {
    if (player.isDead) break;

    if (player.seriousWounds.length >= 3) {
      killPlayer(state, playerId, 'INTRUDER_ATTACK');
      return { died: true, lightDealt, seriousDealt };
    }

    if (player.lightWounds >= 2) {
      player.lightWounds = 0;
      const serious = dealSeriousWounds(state, playerId, 1);

      seriousDealt += serious.seriousDealt;

      if (serious.died) return { died: true, lightDealt, seriousDealt };
    } else {
      player.lightWounds += 1;
      lightDealt += 1;
    }
  }

  return { died: false, lightDealt, seriousDealt };
}

export function dealSeriousWounds(state: GameState, playerId: string, count: number): WoundResult {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Травма ссылается на неизвестного персонажа: ${playerId}.`);
  }

  let seriousDealt = 0;

  for (let dealt = 0; dealt < count; dealt++) {
    if (player.isDead) break;

    if (player.seriousWounds.length >= 3) {
      killPlayer(state, playerId, 'INTRUDER_ATTACK');
      return { died: true, lightDealt: 0, seriousDealt };
    }

    player.seriousWounds.push(drawSeriousWound(state));
    seriousDealt += 1;
  }

  return { died: false, lightDealt: 0, seriousDealt };
}

export function giveContaminationCards(state: GameState, playerId: string, count: number): number {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Заражение ссылается на неизвестного персонажа: ${playerId}.`);
  }

  for (let dealt = 0; dealt < count; dealt++) {
    const pile = state.decks.contamination;

    if (pile.drawPile.length === 0) {
      if (pile.discard.length === 0) {
        throw new EngineError(
          'NO_CONTAMINATION_LEFT',
          'Колода и сброс Заражения пусты: книгу правил этот случай не описывает.',
        );
      }

      reshuffleDiscard(state, pile, 'combat');
    }

    player.actionDeck.discard.push(pile.drawPile.shift()!);
  }

  return count;
}

export function drawIntruderAttackCard(state: GameState): IntruderAttackCard {
  const pile = state.decks.intruderAttacks;

  if (pile.drawPile.length === 0) {
    if (pile.discard.length === 0) {
      throw new EngineError(
        'NO_INTRUDER_ATTACKS_LEFT',
        'Колода и сброс Атак Чужих пусты: книгу правил этот случай не описывает.',
      );
    }

    reshuffleDiscard(state, pile, 'combat');
  }

  return pile.drawPile.shift()!;
}

export function killPlayer(state: GameState, playerId: string, cause: PlayerDeathCause): void {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Смерть ссылается на неизвестного персонажа: ${playerId}.`);
  }

  const room = state.ship.rooms[player.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Персонаж ${playerId} погиб в несуществующем отсеке ${player.roomId}.`);
  }

  player.isDead = true;
  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
  room.objects.push({ id: `corpse-${playerId}`, kind: 'CORPSE', characterClass: player.characterClass });

  for (const slot of player.handSlots) {
    if (slot.source === 'OBJECT') room.objects.push(slot.object);
  }

  player.handSlots = [];
  appendGameLog(state, { type: 'PLAYER_DIED', playerId, roomId: room.id, cause });
}

function corridorsLeadingInto(state: GameState, roomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

function clearContactNoise(state: GameState, roomId: RoomId): string[] {
  const cleared: string[] = [];

  for (const corridor of corridorsLeadingInto(state, roomId)) {
    if (corridor.hasNoise) {
      corridor.hasNoise = false;
      cleared.push(corridor.id);
    }
  }

  return cleared;
}

function clearTechnicalNoise(state: GameState, roomId: RoomId): boolean {
  const room = state.ship.rooms[roomId];

  if (!room?.hasTechnicalCorridorEntrance || !state.ship.technicalCorridorNoise) return false;

  state.ship.technicalCorridorNoise = false;

  return true;
}

function resolveBlankToken(state: GameState, playerId: string, roomId: RoomId, token: IntruderToken): void {
  if (state.intrudersPool.bag.length === 0) {
    const adultIndex = state.intrudersPool.supply.findIndex((candidate) => candidate.type === 'ADULT');

    if (adultIndex !== -1) {
      const [adult] = state.intrudersPool.supply.splice(adultIndex, 1);

      state.intrudersPool.bag.push(adult!);
    }
  }

  state.intrudersPool.bag.push(token);
  reshuffleBag(state);

  const targets = corridorsLeadingInto(state, roomId).filter((corridor) => !corridor.hasNoise);

  if (targets.length > noiseMarkersInSupply(state.ship)) {
    throw new EngineError(
      'MARKER_SUPPLY_EXHAUSTED',
      'Пустому жетону не хватает маркеров Шума в запасе: книга правил не описывает этот случай (стр. 3, 15).',
    );
  }

  for (const corridor of targets) {
    corridor.hasNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'CORRIDOR', corridorId: corridor.id },
      reason: 'BLANK',
    });
  }
}

function reshuffleDiscard<T>(state: GameState, pile: CardPile<T>, stream: RngStream): void {
  const items = pile.discard;

  pile.discard = [];

  if (items.length <= 1) {
    pile.drawPile.push(...items);
    return;
  }

  const rng = createRng(state.meta.seed, stream);

  for (let burned = 0; burned < state.meta.rngDraws[stream]; burned++) rng();

  pile.drawPile.push(...shuffle(rng, items));
  state.meta.rngDraws[stream] += items.length - 1;
}

function reshuffleBag(state: GameState): void {
  const bag = state.intrudersPool.bag;

  if (bag.length <= 1) return;

  const rng = createRng(state.meta.seed, 'bag');

  for (let burned = 0; burned < state.meta.rngDraws.bag; burned++) rng();

  state.intrudersPool.bag = shuffle(rng, bag);
  state.meta.rngDraws.bag += bag.length - 1;
}

function drawSeriousWound(state: GameState): PlayerState['seriousWounds'][number] {
  const pile = state.decks.seriousWounds;

  if (pile.drawPile.length === 0) {
    if (pile.discard.length === 0) {
      throw new EngineError(
        'NO_SERIOUS_WOUNDS_LEFT',
        'Колода и сброс Тяжёлых Травм пусты: книгу правил этот случай не описывает.',
      );
    }

    reshuffleDiscard(state, pile, 'combat');
  }

  return pile.drawPile.shift()!;
}

/** Снятие миниатюры с поля: из пула на поле и из списка occupants отсека. */
export function removeIntruder(state: GameState, entity: IntruderEntity): void {
  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((candidate) => candidate.id !== entity.id);

  const room = state.ship.rooms[entity.roomId];

  if (room) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== entity.id);
  }
}

function infectWithLarva(state: GameState, player: PlayerState, entity: IntruderEntity): void {
  removeIntruder(state, entity);
  state.intrudersPool.supply.push(entity.token);
  player.hasLarva = true;
  giveContaminationCards(state, player.id, 1);
}

interface AttackDamage {
  died: boolean;
  light: number;
  serious: number;
  contamination: number;
}

function applyAttackCardEffect(
  state: GameState,
  player: PlayerState,
  entity: IntruderEntity,
  card: IntruderAttackCard,
): AttackDamage {
  switch (card.name) {
    case 'Царапина': {
      const wounds = dealLightWounds(state, player.id, 1);
      const contamination = wounds.died ? 0 : giveContaminationCards(state, player.id, 1);

      return { died: wounds.died, light: wounds.lightDealt, serious: wounds.seriousDealt, contamination };
    }

    case 'Укус': {
      if (player.seriousWounds.length >= 2) {
        killPlayer(state, player.id, 'INTRUDER_ATTACK');
        return { died: true, light: 0, serious: 0, contamination: 0 };
      }

      const wounds = dealSeriousWounds(state, player.id, 1);

      return { died: wounds.died, light: 0, serious: wounds.seriousDealt, contamination: 0 };
    }

    case 'Атака когтями': {
      const wounds = dealLightWounds(state, player.id, 2);
      const contamination = wounds.died ? 0 : giveContaminationCards(state, player.id, 1);

      return { died: wounds.died, light: wounds.lightDealt, serious: wounds.seriousDealt, contamination };
    }

    case 'Атака хвостом': {
      if (player.seriousWounds.length >= 1) {
        killPlayer(state, player.id, 'INTRUDER_ATTACK');
        return { died: true, light: 0, serious: 0, contamination: 0 };
      }

      const wounds = dealSeriousWounds(state, player.id, 1);

      return { died: wounds.died, light: 0, serious: wounds.seriousDealt, contamination: 0 };
    }

    case 'Трансформация': {
      transformCreeper(state, player, entity);
      return { died: false, light: 0, serious: 0, contamination: 0 };
    }

    case 'Ярость':
      return applyFury(state, player, entity);

    case 'Слизь': {
      player.hasSlime = true;
      const contamination = giveContaminationCards(state, player.id, 1);

      return { died: false, light: 0, serious: 0, contamination };
    }

    case 'Зов': {
      callIntruder(state, entity.roomId);
      return { died: false, light: 0, serious: 0, contamination: 0 };
    }

    default:
      throw new EngineError(
        'UNKNOWN_ATTACK_EFFECT',
        `Карта Атаки Чужих «${card.name}» не имеет разбора эффекта в движке.`,
      );
  }
}

function applyFury(state: GameState, player: PlayerState, entity: IntruderEntity): AttackDamage {
  const room = state.ship.rooms[entity.roomId];
  let died = false;
  let serious = 0;

  for (const occupantId of [...(room?.occupantPlayerIds ?? [])]) {
    const occupant = state.players[occupantId];

    if (!occupant || occupant.isDead) continue;

    if (occupant.seriousWounds.length >= 2) {
      killPlayer(state, occupantId, 'INTRUDER_ATTACK');

      if (occupantId === player.id) died = true;
    } else {
      const wounds = dealSeriousWounds(state, occupantId, 1);

      if (occupantId === player.id) {
        died = wounds.died;
        serious += wounds.seriousDealt;
      }
    }
  }

  return { died, light: 0, serious, contamination: 0 };
}

function transformCreeper(state: GameState, player: PlayerState, entity: IntruderEntity): void {
  const breederIndex = state.intrudersPool.supply.findIndex((candidate) => candidate.type === 'BREEDER');

  if (breederIndex === -1) {
    throw new EngineError(
      'NO_BREEDER_IN_SUPPLY',
      'Трансформация требует Трутня из запаса рядом с полем, но оба Трутня уже в игре.',
    );
  }

  removeIntruder(state, entity);
  state.intrudersPool.supply.push(entity.token);

  const [breederToken] = state.intrudersPool.supply.splice(breederIndex, 1);
  const breeder: IntruderEntity = {
    id: breederToken!.id,
    type: 'BREEDER',
    roomId: entity.roomId,
    woundsCount: 0,
    token: breederToken!,
  };

  state.intrudersPool.boardTokens.push(breeder);
  state.ship.rooms[entity.roomId]?.occupantIntruderIds.push(breeder.id);
  appendGameLog(state, {
    type: 'INTRUDER_TRANSFORMED',
    roomId: entity.roomId,
    oldIntruderId: entity.id,
    newIntruderId: breeder.id,
  });

  if (player.actionDeck.hand.length === 0) {
    appendGameLog(state, {
      type: 'SURPRISE_ATTACK_TRIGGERED',
      playerId: player.id,
      intruderId: breeder.id,
      intruderType: 'BREEDER',
      handCount: 0,
      escapeNumber: breederToken!.escapeNumber,
    });
    state.interruptQueue.push({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId: player.id, intruderId: breeder.id });
  }
}

function callIntruder(state: GameState, roomId: RoomId): void {
  const room = state.ship.rooms[roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Зов ссылается на несуществующий отсек ${roomId}.`);
  }

  const token = state.intrudersPool.bag.shift();

  if (!token) {
    throw new EngineError('INTRUDER_BAG_EMPTY', 'Пул Чужих пуст: Зову некого вытягивать.');
  }

  if (token.type === 'BLANK') {
    state.intrudersPool.bag.push(token);
    reshuffleBag(state);
    appendGameLog(state, { type: 'INTRUDER_CALLED', roomId, intruderId: null, tokenType: 'BLANK' });
    return;
  }

  const entity: IntruderEntity = { id: token.id, type: token.type, roomId, woundsCount: 0, token };

  state.intrudersPool.boardTokens.push(entity);
  room.occupantIntruderIds.push(entity.id);
  appendGameLog(state, { type: 'INTRUDER_CALLED', roomId, intruderId: entity.id, tokenType: token.type });
}
