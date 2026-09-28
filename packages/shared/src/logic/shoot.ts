import type { IntruderAttackCard } from '../types/cards.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import type { EngineAction } from '../types/actions.js';
import { rollCombatDie } from './combatDie.js';
import { executeCardPayment } from './cardsPayment.js';
import { drawSharedCard, reshuffleDiscard } from './cardPiles.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { isPlayerInCombat } from './combatStatus.js';
import { placeIntruderRemains, removeIntruder, requireIntruder } from './intruderPlacement.js';
import { countedCombatFace, isWeaknessRevealed } from './weaknesses.js';
import { hasRetreatArrow } from '../data/intruderAttacks.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { queueActionCompletion } from './actionCompletion.js';
import { allocateEntityId } from './stateIds.js';
import type { IntruderRetreatRecord } from '../types/contact.js';
import type { RoomId } from '../types/rooms.js';
import { placeFireMarker } from './markers.js';
import { endGame } from './gameEnd.js';

/**
 * Базовое действие «Стрельба» [1] (стр. 19; символ действия на стр. 714
 * транскрипта — «Оружие, занимающее слот Руки»).
 *
 * Порядок выстрела: Оружие из слота Руки с хотя бы 1 ед. Боезапаса, цель —
 * Чужой в одном отсеке со стрелком; сбрасывается 1 ед. Боезапаса и 1 карта
 * Действия (цена базового действия), бросается кубик Боя (стр. 18–19).
 * Грань сопоставляется с типом цели: «Хвост» ранит Личинку и Крипера,
 * «Силуэты» — Личинку, Крипера и Взрослую Особь, «1 Рана» и «2 Раны» ранят
 * любого. Затем — проверка Результата Атаки (стр. 20).
 */

/** Сколько Ран наносит грань кубика Боя цели указанного типа (стр. 19). */
export function injuriesForFace(face: CombatDieFace, targetType: IntruderType): number {
  switch (face) {
    case 'MISS':
      return 0;
    case 'TAIL':
      return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
    case 'SILHOUETTES':
      return targetType === 'LARVA' || targetType === 'CREEPER' || targetType === 'ADULT' ? 1 : 0;
    case 'ONE_WOUND':
      return 1;
    case 'TWO_WOUNDS':
      return 2;
  }
}

/** Оружие должно занимать слот Руки (стр. 19, действие [1]). */
function requireHandWeapon(
  state: GameState,
  playerId: string,
  weaponItemId: string,
  discardAllAmmo: boolean,
): { name: string; ammoLeft: number; isEnergy: boolean; burstAmmoSpent?: number } {
  const player = state.players[playerId]!;
  const slot = player.handSlots.find((candidate) => candidate.source === 'ITEM' && candidate.card.id === weaponItemId);
  const weapon = slot && slot.source === 'ITEM' ? slot.card : null;

  if (!weapon || !weapon.isWeapon) {
    throw new EngineError(
      'WEAPON_NOT_AVAILABLE',
      'Выбранная карта не занимает слот Руки или не является Оружием (стр. 19).',
    );
  }
  if (weapon.ammo === null || weapon.ammo < 1) {
    throw new EngineError('WEAPON_NO_AMMO', `На «${weapon.name}» не осталось Боезапаса (стр. 19).`);
  }

  if (discardAllAmmo) {
    // «Стрельба очередью» (Шаг 8): сбрасывается весь Боезапас — включая
    // ед., потраченную на сам выстрел (FAQ Actions 8: Full Auto).
    const spent = weapon.ammo;
    weapon.ammo = 0;
    return { name: weapon.name, ammoLeft: 0, isEnergy: weapon.isEnergyWeapon ?? false, burstAmmoSpent: spent };
  }

  weapon.ammo -= 1;

  return { name: weapon.name, ammoLeft: weapon.ammo, isEnergy: weapon.isEnergyWeapon ?? false };
}

/** Итог проверки Результата Атаки (стр. 20): карты Стойкости, гибель или Отступление. */
export interface InjuryCheckResult {
  toughnessCards: IntruderAttackCard[];
  /** null — среди вытянутых карт есть стрелка Отступления: стойкость не сравнивается. */
  toughnessTotal: number | null;
  killed: boolean;
  /** Стрелка Отступления у выжившего: разыгранное направление по колоде Событий. */
  retreat?: IntruderRetreatRecord;
}

/**
 * Проверка Результата Атаки (стр. 20): Личинке и Яйцу хватает 1 Раны (без
 * карты), Криперу и Взрослой Особи вытягивается 1 карта Атаки, Трутню и
 * Королеве — 2 карты с суммированием Стойкости. Стрелка Отступления стоит на
 * карте вместо числа: если она есть хотя бы на одной вытянутой карте, Чужой
 * Отступает и не может быть убит этой проверкой (решение В-1,
 * `doc/fix-plan-scans.md`). Иначе Чужой убит, когда Раны не меньше суммы.
 * Общая процедура для Стрельбы, Рукопашной атаки и Урона от Огня.
 */
export function checkInjuryResult(
  state: GameState,
  intruderId: string,
  targetType: IntruderType,
  injuries: number,
  /** null — атакующего нет: так Раны наносит огонь Фазы Событий (стр. 10, шаг 6). */
  attackerId: string | null,
): InjuryCheckResult {
  if (targetType === 'LARVA') {
    // Личинка: 1 Раны достаточно, «удалите их миниатюры с поля» — без
    // Останков и без карты Атаки (стр. 20, 22; вердикт ревью 0.4.0).
    const roomId = requireIntruder(state, intruderId).roomId;
    removeIntruder(state, intruderId);
    appendGameLog(state, {
      type: 'INTRUDER_KILLED',
      playerId: attackerId,
      roomId,
      targetIntruderId: intruderId,
      targetType,
      remainsObjectId: null,
    });
    return { toughnessCards: [], toughnessTotal: 0, killed: true };
  }

  const intruder = requireIntruder(state, intruderId);
  intruder.woundsCount += injuries;

  const cardsNeeded = targetType === 'BREEDER' || targetType === 'QUEEN' ? 2 : 1;
  const pile = state.decks.intruderAttacks;
  const toughnessCards: IntruderAttackCard[] = [];
  for (let drawn = 0; drawn < cardsNeeded; drawn += 1) {
    const card = drawSharedCard(state, pile, 'Атаки Чужих');
    toughnessCards.push({ ...card, attackerTypes: [...card.attackerTypes] });
  }
  // Карты проверки Стойкости выкладываются лицом вверх и после сравнения
  // уходят в сброс; пустая колода перетасовывается сразу (стр. 20).
  for (const card of toughnessCards) pile.discard.push(card);
  reshuffleDiscard(state, pile);

  if (toughnessCards.some(hasRetreatArrow)) {
    const retreat = resolveIntruderRetreat(state, intruderId, attackerId);
    return { toughnessCards, toughnessTotal: null, killed: false, retreat };
  }

  const toughnessTotal = printedToughnessTotal(state, toughnessCards);
  const killed = intruder.woundsCount >= toughnessTotal;

  if (killed) {
    // Смерть Чужого: миниатюра удаляется, жетон Останков — на пол отсека
    // (стр. 20). Смерть Королевы Яйцо не создаёт (вердикт ревью 0.4.0:
    // Яйца появляются на Планшете только в Фазу Событий, стр. 10).
    const roomId = intruder.roomId;
    const remains = placeIntruderRemains(state, intruderId);
    removeIntruder(state, intruderId);
    appendGameLog(state, {
      type: 'INTRUDER_KILLED',
      playerId: attackerId,
      roomId,
      targetIntruderId: intruderId,
      targetType,
      remainsObjectId: remains.id,
    });
    return { toughnessCards, toughnessTotal, killed: true };
  }

  return { toughnessCards, toughnessTotal, killed: false };
}

/** Сумма напечатанных стойкостей; «Вид на грани вымирания» снижает каждую на 1 (стр. 21). */
function printedToughnessTotal(state: GameState, toughnessCards: readonly IntruderAttackCard[]): number {
  const extinctionPenalty = isWeaknessRevealed(state, 'EDGE_OF_EXTINCTION') ? 1 : 0;
  return toughnessCards.reduce((sum, card) => sum + (card.toughness ?? 0) - extinctionPenalty, 0);
}

/** Параметры выстрела: базовое действие и классовые карты (Шаг 8). */
export interface ShootParams {
  weaponItemId: string;
  targetIntruderId: string;
  discardCardIds: string[];
  /** «Стрельба очередью»: сбросить весь Боезапас оружия, +1 Рана за каждые 2 ед. */
  discardAllAmmo?: boolean;
  /** «Прицельный огонь»: перед проверкой Ран приостановить игру вопросом о перебросе. */
  suspendForReroll?: boolean;
}

/** Название Боевой винтовки (стартовое Оружие Солдата, startingItems). */
export const ASSAULT_RIFLE_NAME = 'Боевая винтовка';
export const FLAMETHROWER_NAME = 'Огнемёт';

export function weaponFaceInjuries(face: CombatDieFace, targetType: IntruderType, weaponName: string): number {
  const base = injuriesForFace(face, targetType);
  if (weaponName === FLAMETHROWER_NAME && face !== 'MISS') return Math.max(1, base);
  return base;
}

export function igniteFromWeapon(state: GameState, weaponName: string, face: CombatDieFace, roomId: RoomId): boolean {
  if (weaponName !== FLAMETHROWER_NAME || face !== 'TWO_WOUNDS') return false;
  const room = state.ship.rooms[roomId];
  if (!room || room.hasFire) return false;
  const placement = placeFireMarker(state, roomId);
  if (placement === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');
  return placement === 'PLACED' || placement === 'SHIP_EXPLODED';
}

/**
 * Бонус оружия при ≥1 Ране от выстрела: Боевая винтовка всегда добавляет
 * 1 Рану (описание предмета); «Уязвимость к энергии» добавляет 1 Рану
 * Энергооружию (doc/data/WEAKNESSES.md). Взаимоисключимы: винтовка не
 * Энергооружие, поэтому максимум один бонус на выстрел.
 */
function weaponBonusInjuries(state: GameState, weapon: { name: string; isEnergy: boolean }, base: number): number {
  if (base <= 0) return 0;
  if (weapon.name === ASSAULT_RIFLE_NAME) return 1;
  if (weapon.isEnergy && isWeaknessRevealed(state, 'ENERGY_WEAKNESS')) return 1;
  return 0;
}

/**
 * Ядро Стрельбы (стр. 19) — общее для базового действия и классовых карт
 * (Шаг 8: «Прицельный огонь», «Стрельба очередью», «Адреналин»).
 * Завершение действия (счёт действий, смена хода) остаётся за вызывающей
 * стороной: «Адреналин» ставит добор карты перед завершением.
 */
export function performShoot(state: GameState, actorId: string, params: ShootParams): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  if (!isPlayerInCombat(state, actorId)) {
    throw new EngineError(
      'SHOOT_NOT_IN_COMBAT',
      '«Стрельба» выполняется, только когда Персонаж находится в Бою (стр. 12, 19).',
    );
  }

  const target = requireIntruder(state, params.targetIntruderId);
  if (target.roomId !== player.roomId) {
    throw new EngineError('INVALID_ATTACK_TARGET', 'Стрелять можно только в Чужих из собственного отсека (стр. 19).');
  }

  const weapon = requireHandWeapon(state, actorId, params.weaponItemId, params.discardAllAmmo ?? false);
  executeCardPayment(state, actorId, params.discardCardIds, 1);

  const dieFace = rollCombatDie(state);
  const countedFace = countedCombatFace(state, dieFace, target.type);
  const baseInjuries = weaponFaceInjuries(countedFace, target.type, weapon.name);
  const bonus = weaponBonusInjuries(state, weapon, baseInjuries);
  const burstAmmoSpent = weapon.burstAmmoSpent ?? 0;
  // «Стрельба очередью»: +1 доп. Рана за каждые 2 потраченные ед. Боезапаса.
  const burstBonus = Math.floor(burstAmmoSpent / 2);
  const injuries = baseInjuries + bonus + burstBonus;
  const woundsBefore = target.woundsCount;

  if (params.suspendForReroll) {
    // «Прицельный огонь»: решение о перебросе принимается по выпавшей грани
    // (стр. 18: кубик Боя бросается открыто). Оплата, Боезапас и первый
    // бросок уже применены; транзакция продолжится решением игрока.
    state.pendingDecision = {
      id: allocateEntityId(state, 'reroll-combat-die'),
      playerId: actorId,
      type: 'REROLL_COMBAT_DIE',
      firstFace: dieFace,
      weaponName: weapon.name,
      ammoLeft: weapon.ammoLeft,
      targetIntruderId: target.id,
      woundsBefore,
      weaponBonusEligible:
        weapon.name === ASSAULT_RIFLE_NAME || (weapon.isEnergy && isWeaknessRevealed(state, 'ENERGY_WEAKNESS')),
    };
    return;
  }

  const result: InjuryCheckResult =
    injuries > 0
      ? checkInjuryResult(state, target.id, target.type, injuries, actorId)
      : { toughnessCards: [], toughnessTotal: 0, killed: false };
  const fireStarted = igniteFromWeapon(state, weapon.name, countedFace, player.roomId);

  appendGameLog(state, {
    type: 'SHOOT_RESOLVED',
    playerId: actorId,
    roomId: player.roomId,
    weaponName: weapon.name,
    ammoLeft: weapon.ammoLeft,
    targetIntruderId: target.id,
    targetType: target.type,
    dieFace,
    ...(countedFace !== dieFace ? { countedFace } : {}),
    woundsBefore,
    injuries,
    woundsTotal: woundsBefore + injuries,
    toughnessCards: result.toughnessCards,
    toughnessTotal: result.toughnessTotal,
    killed: result.killed,
    ...(burstAmmoSpent > 0 ? { burstAmmoSpent } : {}),
    ...(bonus > 0 ? { rifleBonusApplied: weapon.name === ASSAULT_RIFLE_NAME } : {}),
    ...(result.retreat ? { retreat: result.retreat } : {}),
    ...(fireStarted ? { fireStarted: true as const } : {}),
  });
}

/** Базовое действие «Стрельба» [1] (стр. 19). */
export function executeShoot(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_SHOOT' }>,
  actorId: string,
): void {
  performShoot(state, actorId, {
    weaponItemId: action.payload.weaponItemId,
    targetIntruderId: action.payload.targetIntruderId,
    discardCardIds: action.payload.discardCardIds,
  });
  queueActionCompletion(state, actorId);
}
