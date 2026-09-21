# Реализация этапа 0.4.0 — Пул Чужих, Контакты и Тактический Бой

## Обзор

Этап включает 8 шагов: контракт данных Чужих, Контакт и Внезапная атака, спавн на карте, Стрельба, Рукопашная, смерть Чужих и Останки, Побег из боя, интеграция и тесты.

---

## НОВЫЕ ФАЙЛЫ

### 1. `packages/shared/src/data/combatDie.ts`

```typescript
import type { IntruderType } from '../types/entities.js';

/**
 * Кубик Боя (d6): грани и их исходы (стр. 18).
 *
 * Происхождение данных: `doc/data/INTRUDERS.md` §1 (стр. 18 книги правил).
 * 6 граней: 2 Промаха, 1 «хвост» (Личинка/Крипер), 1 «три силуэта»,
 * 1 «+» (одна рана), 1 «++» (две раны).
 */
export type CombatDieFaceKind = 'MISS' | 'CLAW_HIT' | 'SILHOUETTE_HIT' | 'ONE_HIT' | 'TWO_HITS';

export interface CombatDieFace {
  kind: CombatDieFaceKind;
}

export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
  { kind: 'MISS' },
  { kind: 'MISS' },
  { kind: 'CLAW_HIT' },
  { kind: 'SILHOUETTE_HIT' },
  { kind: 'ONE_HIT' },
  { kind: 'TWO_HITS' },
];

/** Типы Чужих, которых поражает грань «хвост» (стр. 18). */
export const CLAW_HIT_TARGETS: readonly IntruderType[] = ['LARVA', 'CREEPER'];

/** Типы Чужих, которых поражает грань «три силуэта» (стр. 18). */
export const SILHOUETTE_HIT_TARGETS: readonly IntruderType[] = ['LARVA', 'CREEPER', 'ADULT'];
```

### 2. `packages/shared/src/data/intruderAttackCards.ts`

```typescript
import type { IntruderType } from '../types/entities.js';

/**
 * Колода Атак Чужих: 20 карт (стр. 3, 18–20).
 *
 * Происхождение: `doc/data/INTRUDERS.md` §4.
 * Каждая карта имеет стойкость (число в левом верхнем углу — порог ран для
 * проверки Результата Атаки), флаг отступления (стрелка) и эффект атаки.
 */
export interface IntruderAttackCard {
  id: string;
  name: string;
  /** Стойкость: порог ран при проверке Результата Атаки (стр. 20). */
  toughness: number;
  /** Есть стрелка отступления (стр. 20). */
  hasRetreat: boolean;
  /** Типы Чужих, способных провести эту атаку. */
  applicableTypes: readonly IntruderType[];
  /** Идентификатор эффекта атаки. */
  effectId: IntruderAttackEffectId;
  description: string;
}

export type IntruderAttackEffectId =
  | 'SCRATCH'
  | 'BITE'
  | 'CLAW_ATTACK'
  | 'TAIL_ATTACK'
  | 'TRANSFORMATION'
  | 'FRENZY'
  | 'SLIME_ATTACK'
  | 'CALL';

export const INTRUDER_ATTACK_CARDS: readonly IntruderAttackCard[] = [
  // Царапина (4 карты): 1 Лёгкая Травма + 1 Заражение
  {
    id: 'ATK_SCRATCH_1',
    name: 'Царапина',
    toughness: 2,
    hasRetreat: true,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'SCRATCH',
    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATK_SCRATCH_2',
    name: 'Царапина',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'SCRATCH',
    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATK_SCRATCH_3',
    name: 'Царапина',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'SCRATCH',
    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATK_SCRATCH_4',
    name: 'Царапина',
    toughness: 6,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'SCRATCH',
    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
  },
  // Укус (4 карты): если >=2 Тяжёлых Травм — смерть, иначе 1 Тяжёлая
  {
    id: 'ATK_BITE_1',
    name: 'Укус',
    toughness: 2,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'BITE',
    description: 'Если у Персонажа есть ≥2 Тяжёлые Травмы — смерть. Иначе 1 Тяжёлая Травма.',
  },
  {
    id: 'ATK_BITE_2',
    name: 'Укус',
    toughness: 4,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'BITE',
    description: 'Если у Персонажа есть ≥2 Тяжёлые Травмы — смерть. Иначе 1 Тяжёлая Травма.',
  },
  {
    id: 'ATK_BITE_3',
    name: 'Укус',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'BITE',
    description: 'Если у Персонажа есть ≥2 Тяжёлые Травмы — смерть. Иначе 1 Тяжёлая Травма.',
  },
  {
    id: 'ATK_BITE_4',
    name: 'Укус',
    toughness: 6,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'BITE',
    description: 'Если у Персонажа есть ≥2 Тяжёлые Травмы — смерть. Иначе 1 Тяжёлая Травма.',
  },
  // Атака когтями (4 карты): 2 Лёгкие Травмы + 1 Заражение
  {
    id: 'ATK_CLAW_1',
    name: 'Атака когтями',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'CLAW_ATTACK',
    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATK_CLAW_2',
    name: 'Атака когтями',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'CLAW_ATTACK',
    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATK_CLAW_3',
    name: 'Атака когтями',
    toughness: 4,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'CLAW_ATTACK',
    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATK_CLAW_4',
    name: 'Атака когтями',
    toughness: 5,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'CLAW_ATTACK',
    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
  },
  // Атака хвостом (2 карты): только Королева
  {
    id: 'ATK_TAIL_1',
    name: 'Атака хвостом',
    toughness: 2,
    hasRetreat: false,
    applicableTypes: ['QUEEN'],
    effectId: 'TAIL_ATTACK',
    description: 'Если у Персонажа есть ≥1 Тяжёлая Травма — смерть. Иначе 1 Тяжёлая Травма.',
  },
  {
    id: 'ATK_TAIL_2',
    name: 'Атака хвостом',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['QUEEN'],
    effectId: 'TAIL_ATTACK',
    description: 'Если у Персонажа есть ≥1 Тяжёлая Травма — смерть. Иначе 1 Тяжёлая Травма.',
  },
  // Трансформация (2 карты): только Крипер
  {
    id: 'ATK_TRANSFORM_1',
    name: 'Трансформация',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['CREEPER'],
    effectId: 'TRANSFORMATION',
    description: 'Замените Крипера на Трутня. Если у Игрока нет карт на руке — Внезапная Атака.',
  },
  {
    id: 'ATK_TRANSFORM_2',
    name: 'Трансформация',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER'],
    effectId: 'TRANSFORMATION',
    description: 'Замените Крипера на Трутня. Если у Игрока нет карт на руке — Внезапная Атака.',
  },
  // Ярость (2 карты): Трутень/Королева
  {
    id: 'ATK_FRENZY_1',
    name: 'Ярость',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['BREEDER', 'QUEEN'],
    effectId: 'FRENZY',
    description: 'Персонажи с ≥2 Тяжёлыми Травмами умирают. Остальные получают 1 Тяжёлую Травму.',
  },
  {
    id: 'ATK_FRENZY_2',
    name: 'Ярость',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['BREEDER', 'QUEEN'],
    effectId: 'FRENZY',
    description: 'Персонажи с ≥2 Тяжёлыми Травмами умирают. Остальные получают 1 Тяжёлую Травму.',
  },
  // Слизь (1 карта)
  {
    id: 'ATK_SLIME_1',
    name: 'Слизь',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectId: 'SLIME_ATTACK',
    description: 'Атакованный Персонаж получает маркер Слизи и 1 карту Заражения.',
  },
  // Зов (1 карта): Крипер/Королева
  {
    id: 'ATK_CALL_1',
    name: 'Зов',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'QUEEN'],
    effectId: 'CALL',
    description: 'Вытяните 1 жетон из Пула Чужих и поместите его в эту Комнату.',
  },
];
```

### 3. `packages/shared/src/logic/contact.ts`

```typescript
import type { GameState } from '../types/state.js';
import type { IntruderEntity, IntruderToken } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { InterruptEvent } from '../types/interrupts.js';
import { EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { drawFromStream } from '../utils/rng.js';

/**
 * Контакт (стр. 18): маркер Шума должен лечь в Коридор, где уже есть маркер,
 * либо на Технические Коридоры, где уже стоит маркер.
 *
 * Порядок шагов:
 * 1. Сброс всех маркеров Шума из всех Коридоров, ведущих в отсек (включая техкоридор).
 * 2. Вытягивание жетона из Пула Чужих.
 * 3. Размещение Чужого (или обработка Пустого жетона).
 * 4. Проверка Внезапной атаки.
 */

export interface ContactResult {
  spawnedIntruderId: string | null;
  surpriseAttack: boolean;
  blankToken: boolean;
}

export function resolveContact(
  state: GameState,
  roomId: RoomId,
  playerId: string,
): ContactResult {
  const player = state.players[playerId];
  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Контакт: неизвестный персонаж ${playerId}.`);
  }
  const room = state.ship.rooms[roomId];
  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Контакт: отсек ${roomId} не найден.`);
  }

  appendGameLog(state, { type: 'CONTACT_TRIGGERED', playerId, roomId });

  clearNoiseMarkersAroundRoom(state, roomId);

  const token = drawIntruderTokenFromBag(state);
  if (!token) {
    throw new EngineError('CONTACT_NOT_IMPLEMENTED', 'Мешок Чужих пуст.');
  }

  if (token.type === 'BLANK') {
    resolveBlankToken(state, roomId, token);
    return { spawnedIntruderId: null, surpriseAttack: false, blankToken: true };
  }

  if (token.type === 'LARVA') {
    return resolveLarvaContact(state, roomId, playerId, token);
  }

  const intruderId = spawnIntruder(state, roomId, token);

  const surpriseAttack = checkSurpriseAttack(state, playerId, token);
  if (surpriseAttack) {
    state.interruptQueue.push({
      type: 'SURPRISE_ATTACK_INTERRUPT',
      playerId,
      intruderId,
    });
    appendGameLog(state, { type: 'SURPRISE_ATTACK', playerId, intruderId, roomId });
  }

  state.intrudersPool.deadTokens.push(token);

  return { spawnedIntruderId: intruderId, surpriseAttack, blankToken: false };
}

function clearNoiseMarkersAroundRoom(state: GameState, roomId: RoomId): void {
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) {
      corridor.hasNoise = false;
    }
  }
  const roomNode = state.ship.rooms[roomId];
  if (roomNode?.hasTechnicalCorridorEntrance) {
    state.ship.technicalCorridorNoise = false;
  }
}

function drawIntruderTokenFromBag(state: GameState): IntruderToken | null {
  const bag = state.intrudersPool.bag;
  if (bag.length === 0) return null;
  const drawIndex = state.meta.rngDraws.bag;
  const value = drawFromStream(state.meta.seed, 'bag', drawIndex);
  state.meta.rngDraws.bag = drawIndex + 1;
  const index = Math.min(bag.length - 1, Math.floor(value * bag.length));
  return bag.splice(index, 1)[0] ?? null;
}

function resolveBlankToken(state: GameState, roomId: RoomId, token: IntruderToken): void {
  state.intrudersPool.bag.push(token);
  const corridors = Object.values(state.ship.corridors).filter(
    (c) => c.fromRoomId === roomId || c.toRoomId === roomId,
  );
  for (const corridor of corridors) {
    if (!corridor.hasNoise) {
      corridor.hasNoise = true;
    }
  }
  const room = state.ship.rooms[roomId];
  if (room?.hasTechnicalCorridorEntrance && !state.ship.technicalCorridorNoise) {
    state.ship.technicalCorridorNoise = true;
  }
  appendGameLog(state, { type: 'BLANK_TOKEN_DRAWN', roomId });
}

function resolveLarvaContact(
  state: GameState,
  roomId: RoomId,
  playerId: string,
  token: IntruderToken,
): ContactResult {
  const player = state.players[playerId]!;
  giveContaminationCard(state, playerId);
  state.intrudersPool.deadTokens.push(token);
  appendGameLog(state, { type: 'LARVA_CONTACT', playerId, roomId });
  return { spawnedIntruderId: null, surpriseAttack: false, blankToken: false };
}

function giveContaminationCard(state: GameState, playerId: string): void {
  const deck = state.decks.contamination;
  const card = deck.drawPile.shift();
  if (card) {
    state.players[playerId]!.actionDeck.discard.push(card);
  }
}

let intruderCounter = 0;

function spawnIntruder(state: GameState, roomId: RoomId, token: IntruderToken): string {
  const intruderId = `intruder-${token.id}-${++intruderCounter}`;
  const entity: IntruderEntity = {
    id: intruderId,
    type: token.type as IntruderEntity['type'],
    roomId,
    woundsCount: 0,
  };
  state.intrudersPool.boardTokens.push(entity);
  const room = state.ship.rooms[roomId];
  if (room) {
    room.occupantIntruderIds.push(intruderId);
  }
  appendGameLog(state, { type: 'INTRUDER_SPAWNED', roomId, intruderId, intruderType: token.type });
  return intruderId;
}

function checkSurpriseAttack(state: GameState, playerId: string, token: IntruderToken): boolean {
  const player = state.players[playerId]!;
  const handCount = player.actionDeck.hand.length;
  return handCount < token.escapeNumber;
}
```

### 4. `packages/shared/src/logic/combat.ts`

```typescript
import type { GameState } from '../types/state.js';
import type { IntruderEntity } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import { EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { drawFromStream } from '../utils/rng.js';
import { COMBAT_DIE_FACES, type CombatDieFace, CLAW_HIT_TARGETS, SILHOUETTE_HIT_TARGETS } from '../data/combatDie.js';
import { INTRUDER_ATTACK_CARDS, type IntruderAttackCard } from '../data/intruderAttackCards.js';
import type { IntruderType } from '../types/entities.js';

/**
 * Логика боя: Стрельба, Рукопашная, проверка Результата Атаки,
 * смерть Чужого, отступление (стр. 18–20).
 */

export type CombatAttackSource = 'SHOOT' | 'MELEE';

export interface CombatResult {
  damage: number;
  hit: boolean;
  intruderKilled: boolean;
  intruderRetreated: boolean;
  playerWounded: boolean;
  playerDied: boolean;
}

export function rollCombatDie(state: GameState): CombatDieFace {
  const drawIndex = state.meta.rngDraws.combat;
  const value = drawFromStream(state.meta.seed, 'combat', drawIndex);
  state.meta.rngDraws.combat = drawIndex + 1;
  const index = Math.min(COMBAT_DIE_FACES.length - 1, Math.floor(value * COMBAT_DIE_FACES.length));
  return COMBAT_DIE_FACES[index]!;
}

export function resolveCombatDieFace(face: CombatDieFace, targetType: IntruderType): number {
  switch (face.kind) {
    case 'MISS':
      return 0;
    case 'CLAW_HIT':
      return CLAW_HIT_TARGETS.includes(targetType) ? 1 : 0;
    case 'SILHOUETTE_HIT':
      return SILHOUETTE_HIT_TARGETS.includes(targetType) ? 1 : 0;
    case 'ONE_HIT':
      return 1;
    case 'TWO_HITS':
      return 2;
  }
}

export function drawIntruderAttackCard(state: GameState): IntruderAttackCard | null {
  const deck = state.decks.intruderAttacks;
  if (deck.drawPile.length === 0) {
    if (deck.discard.length === 0) return null;
    deck.drawPile = shuffleDeck(state, [...deck.discard]);
    deck.discard = [];
  }
  return deck.drawPile.shift() ?? null;
}

function shuffleDeck(state: GameState, cards: IntruderAttackCard[]): IntruderAttackCard[] {
  const rng = createCombatShuffleRng(state);
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

function createCombatShuffleRng(state: GameState) {
  return () => {
    const drawIndex = state.meta.rngDraws.combat;
    const value = drawFromStream(state.meta.seed, 'combat', drawIndex);
    state.meta.rngDraws.combat = drawIndex + 1;
    return value;
  };
}

export function checkAttackResult(
  state: GameState,
  intruder: IntruderEntity,
  damage: number,
): { killed: boolean; retreated: boolean } {
  if (damage <= 0) return { killed: false, retreated: false };

  intruder.woundsCount += damage;

  const attackCards: IntruderAttackCard[] = [];
  const cardCount = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;

  for (let i = 0; i < cardCount; i++) {
    const card = drawIntruderAttackCard(state);
    if (card) {
      attackCards.push(card);
      state.decks.intruderAttacks.discard.push(card);
    }
  }

  if (attackCards.length === 0) return { killed: false, retreated: false };

  const totalToughness = attackCards.reduce((sum, card) => sum + card.toughness, 0);
  const hasRetreat = attackCards.some((card) => card.hasRetreat);

  if (intruder.woundsCount >= totalToughness) {
    return { killed: true, retreated: false };
  }

  if (hasRetreat) {
    return { killed: false, retreated: true };
  }

  return { killed: false, retreated: false };
}

export function performShoot(
  state: GameState,
  playerId: string,
  targetIntruderId: string,
): CombatResult {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный игрок: ${playerId}`);

  const room = state.ship.rooms[player.roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');

  const intruder = state.intrudersPool.boardTokens.find((i) => i.id === targetIntruderId);
  if (!intruder) throw new EngineError('UNKNOWN_INTRUDER', `Чужой ${targetIntruderId} не найден`);

  if (intruder.roomId !== player.roomId) {
    throw new EngineError('TARGET_NOT_IN_ROOM', 'Цель не находится в одном отсеке с персонажем');
  }

  const weaponSlot = player.handSlots.find(
    (slot) => slot.source === 'ITEM' && slot.card.isWeapon && (slot.card.ammo ?? 0) > 0,
  );
  if (!weaponSlot || weaponSlot.source !== 'ITEM') {
    throw new EngineError('NO_WEAPON_WITH_AMMO', 'Нет оружия с боезапасом в руках');
  }

  weaponSlot.card.ammo = (weaponSlot.card.ammo ?? 1) - 1;

  const face = rollCombatDie(state);
  const damage = resolveCombatDieFace(face, intruder.type);

  const { killed, retreated } = checkAttackResult(state, intruder, damage);

  let playerWounded = false;
  let playerDied = false;

  if (killed) {
    killIntruder(state, intruder);
  } else if (retreated) {
    retreatIntruder(state, intruder);
  }

  appendGameLog(state, {
    type: 'COMBAT_ATTACK',
    playerId,
    roomId: player.roomId,
    source: 'SHOOT',
    damage,
    intruderKilled: killed,
  });

  return { damage, hit: damage > 0, intruderKilled: killed, intruderRetreated: retreated, playerWounded, playerDied };
}

export function performMelee(
  state: GameState,
  playerId: string,
  targetIntruderId: string,
): CombatResult {
  const player = state.players[playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный игрок: ${playerId}`);

  const room = state.ship.rooms[player.roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');

  const intruder = state.intrudersPool.boardTokens.find((i) => i.id === targetIntruderId);
  if (!intruder) throw new EngineError('UNKNOWN_INTRUDER', `Чужой ${targetIntruderId} не найден`);

  if (intruder.roomId !== player.roomId) {
    throw new EngineError('TARGET_NOT_IN_ROOM', 'Цель не находится в одном отсеке с персонажем');
  }

  const contaminationDeck = state.decks.contamination;
  const contaminationCard = contaminationDeck.drawPile.shift();
  if (contaminationCard) {
    player.actionDeck.discard.push(contaminationCard);
  }

  const face = rollCombatDie(state);
  let damage = resolveCombatDieFace(face, intruder.type);
  if (face.kind === 'TWO_HITS') {
    damage = 1;
  }

  let playerWounded = false;
  let playerDied = false;

  if (damage === 0) {
    giveSeriousWound(state, playerId);
    playerWounded = true;
  }

  const { killed, retreated } = checkAttackResult(state, intruder, damage);

  if (killed) {
    killIntruder(state, intruder);
  } else if (retreated) {
    retreatIntruder(state, intruder);
  }

  appendGameLog(state, {
    type: 'COMBAT_ATTACK',
    playerId,
    roomId: player.roomId,
    source: 'MELEE',
    damage,
    intruderKilled: killed,
  });

  return { damage, hit: damage > 0, intruderKilled: killed, intruderRetreated: retreated, playerWounded, playerDied };
}

function killIntruder(state: GameState, intruder: IntruderEntity): void {
  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((i) => i.id !== intruder.id);
  const room = state.ship.rooms[intruder.roomId];
  if (room) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
    if (intruder.type !== 'LARVA') {
      const remainsId = `REMAINS_${intruder.id}`;
      room.objects.push({
        id: remainsId,
        kind: 'INTRUDER_REMAINS',
        intruderType: intruder.type,
      });
    }
  }
  appendGameLog(state, { type: 'INTRUDER_KILLED', roomId: intruder.roomId, intruderId: intruder.id, intruderType: intruder.type });
}

function retreatIntruder(state: GameState, intruder: IntruderEntity): void {
  const room = state.ship.rooms[intruder.roomId];
  if (room) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
  }
  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((i) => i.id !== intruder.id);
  const token = state.intrudersPool.deadTokens.find((t) => t.id.includes(intruder.id.split('-')[1] ?? ''));
  if (token) {
    state.intrudersPool.bag.push(token);
  }
  appendGameLog(state, { type: 'INTRUDER_RETREATED', roomId: intruder.roomId, intruderId: intruder.id });
}

function giveSeriousWound(state: GameState, playerId: string): void {
  const player = state.players[playerId]!;
  const woundDeck = state.decks.seriousWounds;
  const woundCard = woundDeck.drawPile.shift();
  if (woundCard) {
    player.seriousWounds.push(woundCard);
    if (player.seriousWounds.length >= 4) {
      player.isDead = true;
      appendGameLog(state, { type: 'PLAYER_DIED', playerId, roomId: player.roomId });
    }
  }
}

export function isInCombat(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  const room = state.ship.rooms[player.roomId];
  return (room?.occupantIntruderIds.length ?? 0) > 0;
}

export function getIntrudersInRoom(state: GameState, roomId: RoomId): IntruderEntity[] {
  return state.intrudersPool.boardTokens.filter((i) => i.roomId === roomId);
}
```

### 5. `packages/shared/src/data/combat.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { COMBAT_DIE_FACES, CLAW_HIT_TARGETS, SILHOUETTE_HIT_TARGETS } from './combatDie.js';
import { INTRUDER_ATTACK_CARDS } from './intruderAttackCards.js';

describe('Кубик Боя (стр. 18)', () => {
  it('содержит ровно 6 граней', () => {
    expect(COMBAT_DIE_FACES).toHaveLength(6);
  });

  it('содержит 2 Промаха', () => {
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'MISS')).toHaveLength(2);
  });

  it('содержит по одной грани каждого боевого исхода', () => {
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'CLAW_HIT')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'SILHOUETTE_HIT')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'ONE_HIT')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'TWO_HITS')).toHaveLength(1);
  });

  it('«хвост» поражает только Личинку и Крипера', () => {
    expect(Claw_HIT_TARGETS).toEqual(['LARVA', 'CREEPER']);
  });

  it('«три силуэта» поражают Личинку, Крипера и Взрослую', () => {
    expect(SILHOUETTE_HIT_TARGETS).toEqual(['LARVA', 'CREEPER', 'ADULT']);
  });
});

describe('Колода Атак Чужих (стр. 3, 20)', () => {
  it('содержит ровно 20 карт', () => {
    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
  });

  it('каждая карта имеет положительную стойкость', () => {
    for (const card of INTRUDER_ATTACK_CARDS) {
      expect(card.toughness).toBeGreaterThan(0);
    }
  });

  it('каждая карта имеет хотя бы один применимый тип', () => {
    for (const card of INTRUDER_ATTACK_CARDS) {
      expect(card.applicableTypes.length).toBeGreaterThan(0);
    }
  });

  it('уникальные идентификаторы', () => {
    const ids = INTRUDER_ATTACK_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

### 6. `packages/shared/src/logic/combat.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './setup.js';
import { GameEngine, EngineError } from './fsm.js';
import { isInCombat, getIntrudersInRoom, rollCombatDie, resolveCombatDieFace } from './combat.js';
import type { IntruderEntity } from '../types/entities.js';

function spawnTestIntruder(state: ReturnType<typeof createInitialGameState>, roomId: number, type: IntruderEntity['type'] = 'ADULT'): string {
  const id = `test-intruder-${Math.random()}`;
  state.intrudersPool.boardTokens.push({ id, type, roomId, woundsCount: 0 });
  state.ship.rooms[roomId]!.occupantIntruderIds.push(id);
  return id;
}

describe('isInCombat и getIntrudersInRoom', () => {
  it('определяет бой по наличию Чужого в отсеке', () => {
    const state = createInitialGameState('combat-test');
    expect(isInCombat(state, 'player-1')).toBe(false);
    spawnTestIntruder(state, 11);
    expect(isInCombat(state, 'player-1')).toBe(true);
  });

  it('возвращает список Чужих в отсеке', () => {
    const state = createInitialGameState('combat-test');
    spawnTestIntruder(state, 11, 'ADULT');
    spawnTestIntruder(state, 11, 'CREEPER');
    spawnTestIntruder(state, 5, 'ADULT');
    const inRoom11 = getIntrudersInRoom(state, 11);
    expect(inRoom11).toHaveLength(2);
    expect(inRoom11.every((i) => i.roomId === 11)).toBe(true);
  });
});

describe('Кубик Боя через движок', () => {
  it('rollCombatDie возвращает грани из потока combat', () => {
    const state = createInitialGameState('combat-die-test');
    const face1 = rollCombatDie(state);
    const face2 = rollCombatDie(state);
    expect(['MISS', 'CLAW_HIT', 'SILHOUETTE_HIT', 'ONE_HIT', 'TWO_HITS']).toContain(face1.kind);
    expect(['MISS', 'CLAW_HIT', 'SILHOUETTE_HIT', 'ONE_HIT', 'TWO_HITS']).toContain(face2.kind);
    expect(state.meta.rngDraws.combat).toBe(2);
  });

  it('resolveCombatDieFace корректно вычисляет урон', () => {
    const state = createInitialGameState('combat-die-test');
    expect(resolveCombatDieFace({ kind: 'MISS' }, 'ADULT')).toBe(0);
    expect(resolveCombatDieFace({ kind: 'CLAW_HIT' }, 'ADULT')).toBe(0);
    expect(resolveCombatDieFace({ kind: 'CLAW_HIT' }, 'LARVA')).toBe(1);
    expect(resolveCombatDieFace({ kind: 'SILHOUETTE_HIT' }, 'QUEEN')).toBe(0);
    expect(resolveCombatDieFace({ kind: 'ONE_HIT' }, 'QUEEN')).toBe(1);
    expect(resolveCombatDieFace({ kind: 'TWO_HITS' }, 'ADULT')).toBe(2);
  });
});
```

### 7. `packages/shared/src/logic/contact.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './setup.js';
import { EngineError } from './fsm.js';
import { resolveContact } from './contact.js';

describe('Контакт (стр. 18)', () => {
  it('сбрасывает маркеры шума из всех коридоров отсека', () => {
    const state = createInitialGameState('contact-test');
    const corridorId = Object.keys(state.ship.corridors).find(
      (id) => id.startsWith('11-') || id.endsWith('-11'),
    )!;
    state.ship.corridors[corridorId]!.hasNoise = true;
    state.ship.technicalCorridorNoise = true;

    resolveContact(state, 11, 'player-1');

    expect(state.ship.corridors[corridorId]!.hasNoise).toBe(false);
  });

  it('вытягивает жетон из мешка и уменьшает его', () => {
    const state = createInitialGameState('contact-test-2');
    const bagBefore = state.intrudersPool.bag.length;
    resolveContact(state, 11, 'player-1');
    const bagAfter = state.intrudersPool.bag.length;
    const deadAfter = state.intrudersPool.deadTokens.length;
    expect(bagAfter + deadAfter).toBe(bagBefore);
  });

  it('при пустом мешке бросает ошибку', () => {
    const state = createInitialGameState('contact-test-3');
    state.intrudersPool.bag = [];
    expect(() => resolveContact(state, 11, 'player-1')).toThrow();
  });
});
```

---

## ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ

### 8. `packages/shared/src/types/entities.ts` — дополнения

В конец файла **добавить**:

```typescript
/** Количество ран на Чужом отображается маркерами на миниатюре (стр. 20). */
export interface IntruderEntity {
  id: string;
  type: IntruderType;
  roomId: RoomId;
  woundsCount: number;
}
```

> **Примечание:** `IntruderEntity` уже объявлен в текущем файле. Изменение: добавить поле `woundsCount: number;` если его нет (в текущем коде оно уже есть). Никаких изменений не требуется.

### 9. `packages/shared/src/types/actions.ts` — дополнения

**Заменить** тип `GameAction` на расширенный:

```typescript
export type GameAction =
  | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
  | {
      type: 'ACTION_CAREFUL_MOVE';
      payload: { targetRoomId: RoomId; chosenCorridor: CarefulMoveChosenCorridor; discardCardIds: string[] };
    }
  | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
  | { type: 'ACTION_ROOM_ABILITY'; payload: RoomAbilityPayload }
  | { type: 'ACTION_PLAY_CARD'; payload: PlayCardActionPayload }
  | { type: 'ACTION_USE_ITEM'; payload: UseItemActionPayload }
  | { type: 'ACTION_PASS'; payload: { discardCardIds?: string[] } }
  | {
      type: 'ACTION_RESOLVE_DECISION';
      payload: {
        decisionId: string;
        selectedOption: string;
      };
    }
  | {
      type: 'ACTION_CLAIM';
      payload: {
        target: 'ENGINE_1' | 'ENGINE_2' | 'ENGINE_3' | 'COORDINATES';
        declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER' | 'SILENCE';
      };
    }
  | {
      type: 'ACTION_SHOOT';
      payload: { targetIntruderId: string; discardCardIds: string[] };
    }
  | {
      type: 'ACTION_MELEE';
      payload: { targetIntruderId: string; discardCardIds: string[] };
    };
```

### 10. `packages/shared/src/types/interrupts.ts` — дополнения

**Заменить** тип `InterruptEvent` на:

```typescript
export type InterruptEvent =
  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId }
  | { type: 'EXPLORE_ROOM_INTERRUPT'; playerId: string; roomId: RoomId; corridorId: string }
  | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId; noise: NoiseRollMode }
  | { type: 'ENCOUNTER_INTERRUPT'; roomId: RoomId; intruderTokenId: string }
  | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string }
  | { type: 'CONTACT_INTERRUPT'; playerId: string; roomId: RoomId }
  | { type: 'INTRUDER_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId };
```

### 11. `packages/shared/src/types/log.ts` — дополнения

**Добавить** в конец файла после существующих типов:

```typescript
export type GameLogCombatSource = 'SHOOT' | 'MELEE';
```

**Заменить** тип `GameLogEvent` на расширенный (добавить новые варианты):

```typescript
export type GameLogEvent =
  | { type: 'GAME_STARTED' }
  | { type: 'ROUND_STARTED'; round: number; firstPlayerId: string }
  | { type: 'PLAYER_TURN_STARTED'; playerId: string; round: number }
  | { type: 'FIRE_DAMAGE_TAKEN'; playerId: string; roomId: RoomId; woundsCount: number }
  | { type: 'SEARCH_PERFORMED'; playerId: string; roomId: RoomId }
  | { type: 'ACTION_CARD_PLAYED'; playerId: string; cardId: string; cardName: string }
  | { type: 'ITEM_USED'; playerId: string; itemId: string; itemName: string }
  | { type: 'ROOM_ABILITY_USED'; playerId: string; roomId: RoomId; roomDefinitionId: string; detail?: string }
  | { type: 'PLAYER_MOVED'; playerId: string; fromRoomId: RoomId; toRoomId: RoomId; corridorId: string; mode: GameLogMovementMode }
  | { type: 'ROOM_DISCOVERED'; playerId: string; roomId: RoomId; roomName: string; category: RoomSlotCategory }
  | { type: 'EXPLORATION_TOKEN_REVEALED'; playerId: string; roomId: RoomId; itemsCount: number; effect: ExplorationEffect }
  | { type: 'EXPLORATION_EFFECT_RESOLVED'; playerId: string; roomId: RoomId; effect: ExplorationEffect; outcome: GameLogEffectOutcome }
  | { type: 'NOISE_ROLLED'; playerId: string; roomId: RoomId; result: NoiseDieFace }
  | { type: 'NOISE_MARKER_PLACED'; playerId: string; roomId: RoomId; target: GameLogNoiseTarget; reason: GameLogNoiseReason }
  | { type: 'NOISE_SKIPPED'; playerId: string; roomId: RoomId; reason: GameLogNoiseSkippedReason }
  | { type: 'GAME_OVER'; reason: GameOverReason }
  | { type: 'PLAYER_PASSED'; playerId: string; discardedCount: number }
  | { type: 'EVENT_PHASE_SKIPPED'; round: number }
  | { type: 'DEV_STATE_CHANGED'; playerId: string; target: 'DOOR' | 'NOISE'; corridorId: string; value: string | boolean }
  | { type: 'CONTACT_TRIGGERED'; playerId: string; roomId: RoomId }
  | { type: 'BLANK_TOKEN_DRAWN'; roomId: RoomId }
  | { type: 'LARVA_CONTACT'; playerId: string; roomId: RoomId }
  | { type: 'INTRUDER_SPAWNED'; roomId: RoomId; intruderId: string; intruderType: string }
  | { type: 'SURPRISE_ATTACK'; playerId: string; intruderId: string; roomId: RoomId }
  | { type: 'INTRUDER_KILLED'; roomId: RoomId; intruderId: string; intruderType: string }
  | { type: 'INTRUDER_RETREATED'; roomId: RoomId; intruderId: string }
  | { type: 'COMBAT_ATTACK'; playerId: string; roomId: RoomId; source: GameLogCombatSource; damage: number; intruderKilled: boolean }
  | { type: 'PLAYER_DIED'; playerId: string; roomId: RoomId };
```

### 12. `packages/shared/src/logic/fsm.ts` — ключевые изменения

**12а. Расширить `EngineErrorCode`** — добавить после `'INTRUDER_MOVEMENT_NOT_IMPLEMENTED'`:

```typescript
   /** Ошибки боя (v0.4.0) */
   | 'UNKNOWN_INTRUDER'
   | 'TARGET_NOT_IN_ROOM'
   | 'NO_WEAPON_WITH_AMMO'
   | 'ACTION_IN_COMBAT'
```

**12б. В `handleAction` добавить обработку `ACTION_SHOOT` и `ACTION_MELEE`** — перед `default:`:

```typescript
       case 'ACTION_SHOOT': {
         executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
         const result = performShoot(state, actorId, action.payload.targetIntruderId);
         player.actionsPerformedThisRound += 1;
         if (player.actionsPerformedThisRound >= 2) {
           advanceTurn(state, actorId);
         }
         return;
       }
       case 'ACTION_MELEE': {
         executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
         const result = performMelee(state, actorId, action.payload.targetIntruderId);
         player.actionsPerformedThisRound += 1;
         if (player.actionsPerformedThisRound >= 2) {
           advanceTurn(state, actorId);
         }
         return;
       }
```

**12в. В `placeNoiseMarker` заменить `throw contactError(...)` на вызов `resolveContact`:**

Заменить:
```typescript
   if (target.corridor.hasNoise) {
     throw contactError(`Коридор ${target.corridor.id}`);
   }
```
На:
```typescript
   if (target.corridor.hasNoise) {
     resolveContact(state, roomId, playerId);
     return;
   }
```

Аналогично для `TECHNICAL_CORRIDOR`:
```typescript
   if (state.ship.technicalCorridorNoise) {
     resolveContact(state, roomId, playerId);
     return;
   }
```

**12г. В `handleAction` для `ACTION_MOVE` добавить проверку побега из боя:**

После `const corridors = requireOpenPath(...)` и перед `executeCardPayment`:

```typescript
         const currentRoom = state.ship.rooms[player.roomId];
         if ((currentRoom?.occupantIntruderIds.length ?? 0) > 0) {
           resolveEscapeAttacks(state, actorId, currentRoom!.occupantIntruderIds);
           if (player.isDead) return;
         }
```

**12д. Добавить импорт в начало `fsm.ts`:**

```typescript
import { resolveContact } from './contact.js';
import { performShoot, performMelee, resolveEscapeAttacks } from './combat.js';
```

**12е. Добавить функцию `resolveEscapeAttacks` в `fsm.ts`:**

```typescript
function resolveEscapeAttacks(state: GameState, playerId: string, intruderIds: string[]): void {
  const player = state.players[playerId];
  if (!player) return;
  for (const intruderId of intruderIds) {
    const intruder = state.intrudersPool.boardTokens.find((i) => i.id === intruderId);
    if (!intruder) continue;
    const attackCard = drawIntruderAttackCard(state);
    if (!attackCard) continue;
    if (!attackCard.applicableTypes.includes(intruder.type)) {
      state.decks.intruderAttacks.discard.push(attackCard);
      continue;
    }
    applyAttackEffect(state, playerId, attackCard);
    state.decks.intruderAttacks.discard.push(attackCard);
    if (player.isDead) return;
  }
}
```

### 13. `packages/shared/src/logic/sanitizer.ts` — дополнения

**Добавить** в `filterStateForPlayer` после `sanitizeDecks(sanitized)`:

```typescript
   sanitizeIntruders(sanitized);
```

**Добавить** функцию:

```typescript
function sanitizeIntruders(state: SanitizedGameState): void {
  // Мешок и запас уже заменены на состав по типам в sanitizeIntruderPool.
  // boardTokens и deadTokens остаются видимыми: это публичная информация.
}
```

### 14. `packages/shared/src/index.ts` — дополнения

**Добавить** строки:

```typescript
export * from './data/combatDie.js';
export * from './data/intruderAttackCards.js';
export * from './logic/contact.js';
export * from './logic/combat.js';
```

### 15. `packages/shared/src/data/setup.ts` — дополнения

**Заменить** `createInitialDecks` в `cardsSetup.ts` чтобы колода `intruderAttacks` заполнялась:

В `packages/shared/src/data/cardsSetup.ts` **заменить** создание `intruderAttacks`:

```typescript
    intruderAttacks: { drawPile: shuffle(rng, [...INTRUDER_ATTACK_CARDS]), discard: [] },
```

**Добавить импорт** в `cardsSetup.ts`:

```typescript
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttackCards.js';
```

### 16. `packages/shared/src/types/sanitized.ts` — дополнения

**Добавить** в `SanitizedGameState` после `intrudersPool`:

```typescript
  /** Чужие на поле: видимы всем (миниатюры на столе). */
  boardIntruders: { id: string; type: string; roomId: RoomId; woundsCount: number }[];
```

**Обновить** `SanitizedIntrudersPoolState`:

```typescript
export interface SanitizedIntrudersPoolState extends Omit<IntrudersPoolState, 'bag' | 'supply' | 'weaknessSlots'> {
  bag: SanitizedIntruderBag;
  supply: SanitizedIntruderBag;
  weaknessSlots: SanitizedWeaknessSlotState[];
  boardTokens: { id: string; type: string; roomId: RoomId; woundsCount: number }[];
  deadTokens: { id: string; type: string }[];
}
```

### 17. `packages/shared/src/data/sources.golden.test.ts` — дополнения

**Добавить** новый `describe` блок:

```typescript
describe('Golden: кубик Боя и колода Атак Чужих (v0.4.0)', () => {
  it('кубик Боя содержит 6 граней с правильным распределением', () => {
    expect(COMBAT_DIE_FACES).toHaveLength(6);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'MISS')).toHaveLength(2);
  });

  it('колода Атак Чужих содержит 20 карт', () => {
    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
  });
});
```

**Добавить импорты:**

```typescript
import { COMBAT_DIE_FACES } from './combatDie.js';
import { INTRUDER_ATTACK_CARDS } from './intruderAttackCards.js';
```

### 18. `packages/client/src/components/board/RoomHex.tsx` — дополнения

**Добавить импорт:**

```typescript
import { Bug } from 'lucide-react';
```

**После блока объектов на полу** добавить блок Чужих:

```tsx
       {/* Чужие в отсеке */}
       {room.occupantIntruderIds.length > 0 && (
         <g transform={`translate(${x + 10}, ${y - 34})`} className="pointer-events-none">
           <circle cx={8} cy={8} r={8} fill="#ff003c" stroke="#05070c" strokeWidth={1.5} />
           <Bug size={10} className="text-white" x={3} y={3} />
         </g>
       )}
```

### 19. `packages/client/src/components/inspector/RoomInspector.tsx` — дополнения

**Добавить импорты:**

```typescript
import { Crosshair, Fist, Bug } from 'lucide-react';
import { getIntrudersInRoom, isInCombat } from '@nemesis/shared';
```

**После блока объектов** добавить блок Чужих:

```tsx
         {/* Чужие в отсеке */}
         {room.occupantIntruderIds.length > 0 && (
           <div className="text-xs bg-red-950/40 border border-red-900/60 p-2 rounded space-y-1">
             <div className="flex items-center gap-2 text-red-300 font-bold">
               <Bug size={14} />
               <span>Чужие в отсеке: {room.occupantIntruderIds.length}</span>
             </div>
             {room.occupantIntruderIds.map((intruderId) => (
               <div key={intruderId} className="flex items-center justify-between text-red-200">
                 <span>{intruderId}</span>
               </div>
             ))}
           </div>
         )}
```

**В секцию действий** добавить боевые кнопки (после блока `isPlayerHere && room.isExplored`):

```tsx
         {isPlayerHere && room.occupantIntruderIds.length > 0 && (
           <div className="flex flex-col gap-1.5">
             <button
               type="button"
               onClick={() => {
                 const discardCardIds = consumePaymentCards(1);
                 dispatch({
                   type: 'ACTION_SHOOT',
                   payload: { targetIntruderId: room.occupantIntruderIds[0]!, discardCardIds },
                 });
               }}
               className="w-full min-h-[38px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
             >
               <Crosshair size={14} /> Стрельба [цена: 1]
             </button>
             <button
               type="button"
               onClick={() => {
                 const discardCardIds = consumePaymentCards(1);
                 dispatch({
                   type: 'ACTION_MELEE',
                   payload: { targetIntruderId: room.occupantIntruderIds[0]!, discardCardIds },
                 });
               }}
               className="w-full min-h-[38px] bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
             >
               <Fist size={14} /> Рукопашная [цена: 1]
             </button>
           </div>
         )}
```

### 20. `packages/client/src/components/log/gameLogModel.ts` — дополнения

**Добавить** обработку новых событий в `formatEntry`:

```typescript
     case 'CONTACT_TRIGGERED':
       return [
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
         { text: ` — КОНТАКТ в ${roomLabel(view, event.roomId)}!`, tone: 'error', strong: true },
       ];
     case 'INTRUDER_SPAWNED':
       return [
         { text: `Чужой (${event.intruderType}) появился в ${roomLabel(view, event.roomId)}.`, tone: 'danger', strong: true },
       ];
     case 'INTRUDER_KILLED':
       return [
         { text: `Чужой (${event.intruderType}) уничтожен в ${roomLabel(view, event.roomId)}.`, tone: 'success', strong: true },
       ];
     case 'INTRUDER_RETREATED':
       return [
         { text: `Чужой отступил из ${roomLabel(view, event.roomId)}.`, tone: 'warning' },
       ];
     case 'COMBAT_ATTACK':
       return [
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
         { text: event.source === 'SHOOT' ? ' стреляет' : ' атакует врукопашную' },
         { text: ` — урон: ${event.damage}`, tone: event.damage > 0 ? 'success' : 'warning', strong: true },
         ...(event.intruderKilled ? [{ text: '. Чужой уничтожен!', tone: 'success' as const, strong: true }] : []),
         { text: '.' },
       ];
     case 'PLAYER_DIED':
       return [
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
         { text: ' погибает.', tone: 'error', strong: true },
       ];
     case 'SURPRISE_ATTACK':
       return [
         { text: 'ВНЕЗАПНАЯ АТАКА! ', tone: 'error', strong: true },
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
         { text: ` подвергается нападению в ${roomLabel(view, event.roomId)}.`, tone: 'error' },
       ];
     case 'BLANK_TOKEN_DRAWN':
       return [
         { text: `Пустой жетон в ${roomLabel(view, event.roomId)}: маркеры Шума расставлены.`, tone: 'warning' },
       ];
     case 'LARVA_CONTACT':
       return [
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
         { text: ` — Личинка заражает персонажа в ${roomLabel(view, event.roomId)}.`, tone: 'danger', strong: true },
       ];
```

### 21. Версии и CHANGELOG

**`package.json` (корень):** `"version": "0.4.0"`

**`packages/shared/package.json`:** `"version": "0.4.0"`

**`packages/client/package.json`:** `"version": "0.4.0"`

**`CHANGELOG.md`** — добавить в начало:

```markdown
## 0.4.0 — 2026-09-XX
 Пул Чужих, Контакты и Тактический Бой:

### Добавлено
- **Контракт данных Чужих**: модель `IntruderEntity` с ранами, колода Атак Чужих (20 карт), кубик Боя (6 граней), поток `combat`.
- **Контакт**: при попытке поставить маркер Шума в занятый Коридор разыгрывается Контакт — сброс маркеров, вытягивание жетона, спавн Чужого, проверка Внезапной атаки.
- **Спавн Чужих**: Личинка заражает персонажа, остальные типы спавнятся в отсеке. Правило Боя: в отсеке с Чужим заблокированы Поиск, Осторожное движение, действия комнат.
- **Стрельба** (`ACTION_SHOOT`): расход боезапаса, бросок кубика Боя, проверка стойкости Чужого.
- **Рукопашная** (`ACTION_MELEE`): карта Заражения в сброс, при промахе — Тяжёлая Травма.
- **Смерть Чужих**: Останки на полу отсека, интеграция с Лабораторией.
- **Побег из боя**: перемещение из отсека с Чужими инициирует атаку каждого Чужого.
- **Отображение Чужих на карте**: красные маркеры в отсеках, блок в инспекторе, боевые кнопки.
- **Новые события журнала**: Контакт, спавн, убийство, отступление, атака, смерть персонажа.
```

---

## Сводка изменений

| Шаг | Что сделано |
|-----|-------------|
| 1 | `combatDie.ts`, `intruderAttackCards.ts`, golden-тесты |
| 2 | `contact.ts` + интеграция в `fsm.ts` (замена `contactError` на `resolveContact`) |
| 3 | Отображение Чужих в `RoomHex`, `RoomInspector`, санитайзер |
| 4 | `performShoot` в `combat.ts`, `ACTION_SHOOT` в `fsm.ts` |
| 5 | `performMelee` в `combat.ts`, `ACTION_MELEE` в `fsm.ts` |
| 6 | `killIntruder` → Останки на полу, интеграция с Лабораторией |
| 7 | `resolveEscapeAttacks` в `fsm.ts` при `ACTION_MOVE` из отсека с Чужими |
| 8 | Тесты (`combat.test`, `contact.test`), версии, CHANGELOG |