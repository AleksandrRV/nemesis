import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import type { ItemCard } from '../types/cards.js';
import type { IntruderEntity, IntruderType, PlayerState } from '../types/entities.js';
import type { ToughnessCheckCardSnapshot } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { drawFromStream } from '../utils/rng.js';
import { dealSeriousWounds, drawIntruderAttackCard, giveContaminationCards, removeIntruder } from './contact.js';
import { EngineError, findAdjacentOpenRoomIds } from './fsm.js';
import { appendGameLog } from './gameLog.js';

/**
 * Пистолет и Револьвер: выброшенные [2 Раны] считаются 1 Раной (текст карт оружия, стр. 22).
 * Особые свойства сопоставляются по названию — как эффекты карт Атак в `contact.ts`.
 */
const TWO_WOUNDS_COUNT_AS_ONE_WEAPONS = new Set(['Револьвер', 'Пистолет']);

/** Обрез: выброшенный символ «Силуэты» считается промахом (текст карты оружия, стр. 22). */
const SILHOUETTES_MISS_WEAPONS = new Set(['Обрез']);

/**
 * Дробовик и Боевая винтовка: каждый раз, когда нанесена хотя бы 1 Рана,
 * нанесите 1 дополнительную Рану (текст карт оружия, стр. 22).
 */
const BONUS_WOUND_WEAPONS = new Set(['Дробовик', 'Боевая винтовка']);

/**
 * Огнемёт: всегда наносит как минимум 1 Рану, кроме Промаха (текст карты оружия).
 * Второе свойство («при [2 Ранах] поместите маркер Пожара») — механика огня,
 * этап 0.5.0: бросок [2 Раны] из Огнемёта отклоняется явной ошибкой.
 */
const MINIMUM_WOUND_WEAPONS = new Set(['Огнемёт']);

/**
 * Грань кубика Боя → число Ран при Стрельбе (стр. 18) с учётом типа цели
 * и особых свойств оружия (стр. 22). Чистая функция — одно место для правила,
 * которым пользуются и движок, и тесты.
 */
export function combatDieWoundsForShoot(face: CombatDieFace, targetType: IntruderType, weaponName: string): number {
  if (face === 'MISS') {
    return 0;
  }

  if (face === 'SILHOUETTES' && SILHOUETTES_MISS_WEAPONS.has(weaponName)) {
    return 0;
  }

  let wounds: number;

  if (face === 'TWO_WOUNDS') {
    wounds = TWO_WOUNDS_COUNT_AS_ONE_WEAPONS.has(weaponName) ? 1 : 2;
  } else if (face === 'ONE_WOUND') {
    wounds = 1;
  } else if (face === 'TAIL') {
    wounds = targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
  } else {
    // SILHOUETTES: ранит всех, кроме Трутня и Королевы.
    wounds = targetType === 'BREEDER' || targetType === 'QUEEN' ? 0 : 1;
  }

  if (wounds === 0 && MINIMUM_WOUND_WEAPONS.has(weaponName)) {
    wounds = 1;
  }

  if (wounds >= 1 && BONUS_WOUND_WEAPONS.has(weaponName)) {
    wounds += 1;
  }

  return wounds;
}

/** Проверенные условия выстрела: живые ссылки на состояние для `performShoot`. */
export interface ShootConditions {
  player: PlayerState;
  intruder: IntruderEntity;
  weaponCard: ItemCard;
}

/**
 * Условия выстрела (стр. 18): цель — Чужой в том же отсеке, оружие — в руке
 * с ≥1 Боезапаса. Вызывается из fsm до оплаты, затем повторно внутри
 * `performShoot`, чтобы прямые вызовы тоже были безопасны.
 */
export function validateShootConditions(
  state: GameState,
  playerId: string,
  targetIntruderId: string,
  weaponSlotIndex: number,
): ShootConditions {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Стрельба от неизвестного персонажа: ${playerId}.`);
  }

  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === targetIntruderId);

  if (!intruder) {
    throw new EngineError('UNKNOWN_INTRUDER', `Стрельба по Чужому, которого нет на поле: ${targetIntruderId}.`);
  }

  if (intruder.roomId !== player.roomId) {
    throw new EngineError(
      'SHOOT_TARGET_NOT_IN_ROOM',
      `Стрельба возможна только по Чужому в том же отсеке: цель в отсеке ${intruder.roomId}, стрелок — в ${player.roomId} (стр. 18).`,
    );
  }

  const slot = player.handSlots[weaponSlotIndex];
  const weaponCard = slot?.source === 'ITEM' ? slot.card : undefined;

  if (!weaponCard || weaponCard.isWeapon !== true) {
    throw new EngineError(
      'SHOOT_INVALID_WEAPON',
      `В слоте руки ${weaponSlotIndex} нет Оружия: Стрельба требует Оружие в руке (стр. 18).`,
    );
  }

  if (weaponCard.ammo === null) {
    throw new EngineError(
      'SHOOT_INVALID_WEAPON',
      `«${weaponCard.name}» — не огнестрельное Оружие: стрелять из него нельзя.`,
    );
  }

  if (weaponCard.ammo < 1) {
    throw new EngineError('SHOOT_NO_AMMO', `В оружии «${weaponCard.name}» не осталось Боезапаса.`);
  }

  return { player, intruder, weaponCard };
}

/** Индекс из потока `combat`: бросок кубика и выбор направления отступления (см. `rollNoiseDie` в fsm). */
function drawCombatIndex(state: GameState, length: number): number {
  const drawIndex = state.meta.rngDraws.combat;
  const value = drawFromStream(state.meta.seed, 'combat', drawIndex);

  state.meta.rngDraws.combat = drawIndex + 1;

  return Math.min(length - 1, Math.floor(value * length));
}

export function drawCombatFace(state: GameState): CombatDieFace {
  return COMBAT_DIE_FACES[drawCombatIndex(state, COMBAT_DIE_FACES.length)]!;
}

/**
 * Выстрел целиком (стр. 18): сброс 1 Боезапаса, бросок кубика Боя,
 * нанесение Ран и проверка Стойкости. Оплату картой Действия выполняет
 * вызывающая ветка fsm до этого вызова.
 */
export function performShoot(
  state: GameState,
  playerId: string,
  targetIntruderId: string,
  weaponSlotIndex: number,
): void {
  const conditions = validateShootConditions(state, playerId, targetIntruderId, weaponSlotIndex);
  const face = drawCombatFace(state);

  applyShootFace(state, playerId, conditions, face);
}

/**
 * Огнемёт при [2 Ранах] помещает маркер Пожара в отсек — механика огня
 * (этап 0.5.0). Проверка вынесена отдельно: «Прицельный огонь» обязан
 * отклонить такой выстрел до решения о перебросе, а не внутри него.
 */
export function assertShootFaceAllowed(weaponCard: ItemCard, face: CombatDieFace): void {
  if (face === 'TWO_WOUNDS' && MINIMUM_WOUND_WEAPONS.has(weaponCard.name)) {
    throw new EngineError(
      'SHOOT_FIRE_NOT_IMPLEMENTED',
      'Огнемёт при [2 Ранах] помещает маркер Пожара в отсек — механика огня (этап 0.5.0: урон от огня резолвится в Фазе Событий).',
    );
  }
}

/**
 * Применение выпавшей грани: сброс Боезапаса, Раны (+ бонус классовых карт),
 * запись в журнал и проверка Стойкости. Отдельно от броска: «Прицельный
 * огонь» выбирает грань решением игрока, «Стрельба очередью» добавляет бонус.
 */
export function applyShootFace(
  state: GameState,
  playerId: string,
  conditions: ShootConditions,
  face: CombatDieFace,
  bonusWounds = 0,
  ammoCost = 1,
): void {
  const { player, intruder, weaponCard } = conditions;

  assertShootFaceAllowed(weaponCard, face);

  weaponCard.ammo = weaponCard.ammo! - ammoCost;

  const woundsDealt = combatDieWoundsForShoot(face, intruder.type, weaponCard.name) + bonusWounds;

  appendGameLog(state, {
    type: 'SHOT_FIRED',
    playerId,
    roomId: player.roomId,
    intruderId: intruder.id,
    intruderType: intruder.type,
    weaponId: weaponCard.id,
    weaponName: weaponCard.name,
    dieFace: face,
    woundsDealt,
  });

  if (woundsDealt > 0) {
    resolveIntruderWounds(state, intruder, playerId, woundsDealt);
  }
}

/** id Боевой Винтовки Солдата — единственного оружия «Стрельбы очередью». */
const ASSAULT_RIFLE_ITEM_ID = 'WEAPON_SOLDIER_ASSAULT_RIFLE';

/**
 * «Стрельба очередью» (Солдат): выстрел из Боевой Винтовки со сбросом ВСЕГО
 * Боезапаса вместо 1 ед.: +1 доп. Рана за каждые 2 потраченные ед. поверх
 * Ран кубика. Оплата — сама карта (playCost 0), её выполняет ветка fsm.
 */
export function performBurstFire(
  state: GameState,
  playerId: string,
  targetIntruderId: string,
  weaponSlotIndex: number,
): { ammoSpent: number; bonusWounds: number } {
  const conditions = validateShootConditions(state, playerId, targetIntruderId, weaponSlotIndex);

  if (conditions.weaponCard.id !== ASSAULT_RIFLE_ITEM_ID) {
    throw new EngineError(
      'BURST_FIRE_REQUIRES_RIFLE',
      `«Стрельба очередью» требует Боевую Винтовку в руках, а в слоте ${weaponSlotIndex} — «${conditions.weaponCard.name}».`,
    );
  }

  const ammoSpent = conditions.weaponCard.ammo!;
  const bonusWounds = Math.floor(ammoSpent / 2);

  conditions.weaponCard.ammo = 0;

  applyShootFace(state, playerId, conditions, drawCombatFace(state), bonusWounds, 0);

  return { ammoSpent, bonusWounds };
}

/**
 * Раны Чужого и проверка Стойкости (стр. 18): Личинка погибает от любой Раны
 * без карты; Крипер и Взрослая тянут 1 карту, Трутень и Королева — 2 карты
 * (Стойкость суммируется). Стрелка Отступления хотя бы на одной карте
 * перекрывает смерть: Чужой сбегает вместо гибели. Общая для Стрельбы
 * (Шаг 4) и Рукопашной (Шаг 5).
 */
export function resolveIntruderWounds(
  state: GameState,
  intruder: IntruderEntity,
  playerId: string,
  woundsDealt: number,
): void {
  intruder.woundsCount += woundsDealt;

  if (intruder.type === 'LARVA') {
    killIntruder(state, intruder, playerId);
    return;
  }

  const cardsToDraw = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;
  const attackCards: ToughnessCheckCardSnapshot[] = [];

  for (let draw = 0; draw < cardsToDraw; draw++) {
    const card = drawIntruderAttackCard(state);
    state.decks.intruderAttacks.discard.push(card);
    attackCards.push({ id: card.id, name: card.name, toughness: card.toughness, hasRetreat: card.hasRetreat });
  }

  const retreated = attackCards.some((card) => card.hasRetreat);
  const toughnessTotal = attackCards.reduce((sum, card) => sum + card.toughness, 0);
  const killed = !retreated && intruder.woundsCount >= toughnessTotal;

  appendGameLog(state, {
    type: 'TOUGHNESS_CHECKED',
    playerId,
    roomId: intruder.roomId,
    intruderId: intruder.id,
    intruderType: intruder.type,
    attackCards,
    woundsTotal: intruder.woundsCount,
    killed,
    retreated,
  });

  if (retreated) {
    retreatIntruder(state, intruder, playerId);
  } else if (killed) {
    killIntruder(state, intruder, playerId);
  }
}

/**
 * Гибель Чужого: миниатюра снимается с поля, жетон уходит в `deadTokens`,
 * на пол отсека выкладываются Останки — от любого Чужого, кроме Личинки
 * (стр. 20, 22). Яйца за Королеву книга не даёт (в коробке всего 5 жетонов
 * Яиц, все — для Улья): пункт плана про яйцо исправлен по книге.
 */
export function killIntruder(state: GameState, intruder: IntruderEntity, playerId: string): void {
  const roomId = intruder.roomId;

  removeIntruder(state, intruder);
  state.intrudersPool.deadTokens.push(intruder.token);

  appendGameLog(state, {
    type: 'INTRUDER_KILLED',
    playerId,
    roomId,
    intruderId: intruder.id,
    intruderType: intruder.type,
  });

  if (intruder.type !== 'LARVA') {
    // Счётчик смертей в id: жетон может вернуться в игру и погибнуть снова —
    // id Останков обязаны оставаться уникальными детерминированно.
    const remainsId = `remains-${intruder.id}-${state.intrudersPool.deadTokens.length}`;
    state.ship.rooms[roomId]?.objects.push({
      id: remainsId,
      kind: 'INTRUDER_REMAINS',
      intruderType: intruder.type,
    });
  }
}

/**
 * Отступление Чужого (стр. 18).
 *
 * ПРОМЕЖУТОЧНОЕ ПРАВИЛО Шага 4: по книге направление отступления задаёт
 * номер Коридора на вытянутой карте События, но колода Событий появится
 * только на этапе 0.5.0. До тех пор Чужой уходит в соседний отсек через
 * открытую Дверь, а направление выбирает поток `combat` генератора —
 * непредсказуемо для игрока и воспроизводимо по сиду партии. Вентиляция
 * как пункт назначения исключена: представления «Чужой в Технических
 * Коридорах» нет до фазы Событий. Если открытых дверей нет, Чужой остаётся
 * на месте, но выживает: стрелка Отступления уже перекрыла смерть —
 * журнал показывает `TOUGHNESS_CHECKED` с `retreated` без `INTRUDER_RETREATED`.
 */
export function retreatIntruder(state: GameState, intruder: IntruderEntity, playerId: string): void {
  const fromRoomId = intruder.roomId;
  const destinations = findAdjacentOpenRoomIds(state, fromRoomId).sort((a, b) => a - b);

  if (destinations.length === 0) {
    return;
  }

  const toRoomId = destinations[drawCombatIndex(state, destinations.length)]!;

  intruder.roomId = toRoomId;
  state.ship.rooms[fromRoomId]!.occupantIntruderIds = state.ship.rooms[fromRoomId]!.occupantIntruderIds.filter(
    (id) => id !== intruder.id,
  );
  state.ship.rooms[toRoomId]!.occupantIntruderIds.push(intruder.id);

  appendGameLog(state, {
    type: 'INTRUDER_RETREATED',
    playerId,
    intruderId: intruder.id,
    intruderType: intruder.type,
    fromRoomId,
    toRoomId,
  });
}

/**
 * Грань кубика Боя → число Ран при Рукопашной Атаке (стр. 19). Отличия от
 * стрельбы: [++] наносит лишь 1 Рану, а иммунитет типа — это промах
 * (0 Ран = промах = 1 Тяжёлая Травма атакующему, см. `performMelee`).
 */
export function combatDieWoundsForMelee(face: CombatDieFace, targetType: IntruderType): number {
  if (face === 'MISS') {
    return 0;
  }

  if (face === 'TAIL') {
    return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
  }

  if (face === 'SILHOUETTES') {
    return targetType === 'BREEDER' || targetType === 'QUEEN' ? 0 : 1;
  }

  // [+] и [++] наносят 1 Рану любому Чужому.
  return 1;
}

/** Проверенные условия рукопашной: живые ссылки на состояние для `performMelee`. */
export interface MeleeConditions {
  player: PlayerState;
  intruder: IntruderEntity;
}

/**
 * Условия Рукопашной Атаки (стр. 19): цель — Чужой в том же отсеке.
 * Оружие и патроны не требуются. Вызывается из fsm до оплаты, затем повторно
 * внутри `performMelee`, чтобы прямые вызовы тоже были безопасны.
 */
export function validateMeleeConditions(state: GameState, playerId: string, targetIntruderId: string): MeleeConditions {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Рукопашная атака от неизвестного персонажа: ${playerId}.`);
  }

  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === targetIntruderId);

  if (!intruder) {
    throw new EngineError('UNKNOWN_INTRUDER', `Рукопашная атака по Чужому, которого нет на поле: ${targetIntruderId}.`);
  }

  if (intruder.roomId !== player.roomId) {
    throw new EngineError(
      'MELEE_TARGET_NOT_IN_ROOM',
      `Рукопашная Атака возможна только по Чужому в том же отсеке: цель в отсеке ${intruder.roomId}, атакующий — в ${player.roomId} (стр. 19).`,
    );
  }

  return { player, intruder };
}

/**
 * Рукопашная Атака целиком (стр. 19): 1 Заражение в сброс, бросок кубика Боя,
 * промах — 1 Тяжёлая Травма атакующему, попадание — Раны и проверка Стойкости
 * (общая со стрельбой). Оплату картой Действия выполняет вызывающая ветка fsm
 * до этого вызова.
 *
 * Событие пишется до разбора последствий, как `SHOT_FIRED`: исход детерминирован
 * (Заражение — всегда, Травма — всегда при промахе). Если Травма оказывается
 * смертельной, следом идёт `PLAYER_DIED` — порядок повествования сохраняется.
 */
export function performMelee(state: GameState, playerId: string, targetIntruderId: string): void {
  const { player, intruder } = validateMeleeConditions(state, playerId, targetIntruderId);

  giveContaminationCards(state, playerId, 1);

  const face = drawCombatFace(state);
  const woundsDealt = combatDieWoundsForMelee(face, intruder.type);
  const missed = woundsDealt === 0;

  appendGameLog(state, {
    type: 'MELEE_ATTACKED',
    playerId,
    roomId: player.roomId,
    intruderId: intruder.id,
    intruderType: intruder.type,
    dieFace: face,
    woundsDealt,
    contaminationDealt: 1,
    seriousWoundDealt: missed ? 1 : 0,
  });

  if (missed) {
    dealSeriousWounds(state, playerId, 1);
  } else {
    resolveIntruderWounds(state, intruder, playerId, woundsDealt);
  }
}
