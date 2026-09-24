import type { CombatCardPayload, EngineAction } from '../types/actions.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { PendingDecision } from '../types/decisions.js';
import type { GameState } from '../types/state.js';
import { COMBAT_DIE_FACES } from '../data/combatDie.js';
import { drawFromStream } from '../utils/rng.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { reshuffleDiscard } from './cardPiles.js';
import { executeCardPayment } from './cardsPayment.js';
import { isPlayerInCombat } from './combatStatus.js';
import { checkInjuryResult, injuriesForFace, performShoot, type InjuryCheckResult } from './shoot.js';
import { movePlayer } from './movement.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { queueActionCompletion } from './actionCompletion.js';

/**
 * Классовые боевые карты Действий (Шаг 8 этапа 0.4.0; стр. 19, 24–28):
 *
 * - Солдат, «Стрельба очередью» — сбросьте весь Боезапас Боевой винтовки:
 *   +1 доп. Рана за каждые 2 потраченные ед. (FAQ Actions 8: Full Auto —
 *   выстрел один, весь Боезапас уходит, бонус винтовки суммируется).
 * - Солдат, «Прицельный огонь» — выполните Стрельбу; можно один раз
 *   перебросить кубик Боя. Переброс — решение по выпавшей грани.
 * - Солдат, «Заградительный огонь» — сбросьте 1 ед. Боезапаса; переместите
 *   себя и/или другого Персонажа в вашей Комнате без Атаки Чужих (стр. 19:
 *   карта изменяет правила Побега).
 * - Капитан, «Огонь на подавление» — то же, но себя ИЛИ другого (ровно один
 *   перенос).
 * - Скаут, «Адреналин» — выполните Стрельбу или Побег и возьмите карту
 *   Действия.
 *
 * Разыгрывание карты и встроенное действие атомарны: одна транзакция
 * `processAction`, цена карты (playCost 0) плюс цена встроенного действия.
 */

const AIMED_FIRE = 'ACT_SOL_AIMED_FIRE';
const BURST_FIRE = 'ACT_SOL_BURST_FIRE';
const SOLDIER_COVERING_FIRE = 'ACT_SOL_SUPPRESSIVE_FIRE';
const CAPTAIN_SUPPRESSIVE_FIRE = 'ACT_CAP_SUPPRESSIVE_FIRE';
const ADRENALINE = 'ACT_SCO_ADRENALINE';

/** Классовые боевые карты, встроенные в боевую механику движка (Шаг 8). */
export const COMBAT_ACTION_CARDS: readonly string[] = [
  AIMED_FIRE,
  BURST_FIRE,
  SOLDIER_COVERING_FIRE,
  CAPTAIN_SUPPRESSIVE_FIRE,
  ADRENALINE,
];

export function isCombatActionCard(cardId: string): boolean {
  return COMBAT_ACTION_CARDS.includes(cardId);
}

/** Списывает карту с руки в личный сброс (карта сыграна — стр. 24). */
function consumeCard(state: GameState, actorId: string, cardId: string): void {
  const player = state.players[actorId]!;
  const index = player.actionDeck.hand.findIndex((card) => 'characterClass' in card && card.id === cardId);
  if (index === -1) {
    throw new EngineError('INSUFFICIENT_ACTION_CARDS', `Карты ${cardId} нет в руке персонажа.`);
  }
  const [card] = player.actionDeck.hand.splice(index, 1);
  if (!card || !('characterClass' in card)) {
    throw new EngineError('INSUFFICIENT_ACTION_CARDS', `Карты ${cardId} нет в руке персонажа.`);
  }
  player.actionDeck.discard.push(card);
  appendGameLog(state, { type: 'ACTION_CARD_PLAYED', playerId: actorId, cardId: card.id, cardName: card.name });
}

/** Сбрасывает 1 ед. Боезапаса с Оружия в слоте Руки (карты отхода без атак). */
function spendOneAmmo(state: GameState, actorId: string, weaponItemId: string): void {
  const player = state.players[actorId]!;
  const weapon =
    player.handSlots.find(
      (candidate): candidate is Extract<typeof candidate, { source: 'ITEM' }> =>
        candidate.source === 'ITEM' && candidate.card.id === weaponItemId,
    )?.card ?? null;
  if (!weapon || !weapon.isWeapon) {
    throw new EngineError('WEAPON_NOT_AVAILABLE', 'Выбранная карта не является Оружием в слоте Руки (стр. 19).');
  }
  if (weapon.ammo === null || weapon.ammo < 1) {
    throw new EngineError('WEAPON_NO_AMMO', `На «${weapon.name}» не осталось Боезапаса.`);
  }
  weapon.ammo -= 1;
}

/** Добор карты Действия должен быть возможен: колода и сброс не пусты одновременно. */
function requireDrawableActionCard(state: GameState, actorId: string): void {
  const deck = state.players[actorId]!.actionDeck;
  if (deck.drawPile.length === 0 && deck.discard.length === 0) {
    throw new EngineError(
      'CARD_SUPPLY_EXHAUSTED',
      '«Адреналин» требует карту Действия для добора, но колода и сброс пусты.',
    );
  }
}

/** Добор 1 карты Действия («Адреналин»): колода → рука, пустая колода — через перетасовку сброса. */
export function drawOneActionCard(state: GameState, actorId: string): void {
  const deck = state.players[actorId]!.actionDeck;
  if (deck.drawPile.length === 0) reshuffleDiscard(state, deck);
  const card = deck.drawPile.shift();
  if (!card) {
    throw new EngineError('CARD_SUPPLY_EXHAUSTED', 'В колоде Действий и сбросе не осталось карт.');
  }
  deck.hand.push(card);
  appendGameLog(state, { type: 'ACTION_CARD_DRAWN', playerId: actorId });
}

/**
 * Отход без Атаки Чужих (стр. 19): каждый перенос — обычное перемещение
 * (вскрытие и Шум работают, Внеочередные атаки не проводятся — карта
 * перечислена среди изменяющих правила Побега). Лимиты: Солдат — «себя
 * и/или другого» (1–2 переноса), Капитан — «себя или другого» (ровно 1).
 * Экспортируется для карты «Приказ» (перемещение другого Персонажа).
 */
export function executeReposition(
  state: GameState,
  actorId: string,
  moves: { playerId: string; targetRoomId: number }[],
  maxMoves: number,
  label: string,
): void {
  if (moves.length < 1 || moves.length > maxMoves) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      `${label}: допустимо ${maxMoves === 1 ? 'ровно один перенос' : `от 1 до ${maxMoves}`} переносов, передано ${moves.length}.`,
    );
  }
  const actorRoomId = state.players[actorId]!.roomId;
  const seen = new Set<string>();
  for (const move of moves) {
    if (seen.has(move.playerId)) {
      throw new EngineError('INVALID_DECISION_OPTION', `${label}: персонаж указан дважды.`);
    }
    seen.add(move.playerId);
    const target = state.players[move.playerId];
    if (!target || target.isDead || target.isInHibernation || target.hasEscapedInPod) {
      throw new EngineError('UNKNOWN_PLAYER', `${label}: такого персонажа на корабле нет.`);
    }
    if (target.roomId !== actorRoomId) {
      throw new EngineError('INVALID_ATTACK_TARGET', `${label}: переносимый персонаж должен быть в комнате игрока.`);
    }
    const path = requireOpenPath(state, target.roomId, move.targetRoomId);
    movePlayer(state, move.playerId, move.targetRoomId, path[0]!.id, { kind: 'ROLL' });
  }
}

/** Разыгрывание классовой боевой карты со встроенным действием (Шаг 8). */
export function executeCombatCard(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PLAY_CARD' }>,
  actorId: string,
): void {
  const cardId = action.payload.cardId;
  const combat: CombatCardPayload | undefined = action.payload.combat;
  if (!combat) {
    throw new EngineError('INVALID_DECISION_OPTION', `Карте ${cardId} требуются параметры боевого действия.`);
  }
  const payment = action.payload.discardCardIds ?? [];

  switch (cardId) {
    case AIMED_FIRE: {
      if (combat.kind !== 'AIMED_SHOOT') {
        throw new EngineError('INVALID_DECISION_OPTION', 'Неверные параметры «Прицельного огня».');
      }
      consumeCard(state, actorId, cardId);
      performShoot(state, actorId, {
        weaponItemId: combat.weaponItemId,
        targetIntruderId: combat.targetIntruderId,
        discardCardIds: payment,
        suspendForReroll: true,
      });
      return;
    }
    case BURST_FIRE: {
      if (combat.kind !== 'BURST_SHOOT') {
        throw new EngineError('INVALID_DECISION_OPTION', 'Неверные параметры «Стрельбы очередью».');
      }
      consumeCard(state, actorId, cardId);
      performShoot(state, actorId, {
        weaponItemId: combat.weaponItemId,
        targetIntruderId: combat.targetIntruderId,
        discardCardIds: payment,
        discardAllAmmo: true,
      });
      queueActionCompletion(state, actorId);
      return;
    }
    case SOLDIER_COVERING_FIRE:
    case CAPTAIN_SUPPRESSIVE_FIRE: {
      if (combat.kind !== 'REPOSITION') {
        throw new EngineError('INVALID_DECISION_OPTION', 'Неверные параметры карты отхода.');
      }
      const label = cardId === SOLDIER_COVERING_FIRE ? '«Заградительный огонь»' : '«Огонь на подавление»';
      consumeCard(state, actorId, cardId);
      spendOneAmmo(state, actorId, combat.weaponItemId);
      executeReposition(state, actorId, combat.moves, cardId === SOLDIER_COVERING_FIRE ? 2 : 1, label);
      queueActionCompletion(state, actorId);
      return;
    }
    case ADRENALINE: {
      // Проверка добора до действия: транзакция откатывается целиком,
      // если взять карту не из чего — действие не «сгорает».
      requireDrawableActionCard(state, actorId);
      if (combat.kind === 'ADRENALINE_SHOOT') {
        consumeCard(state, actorId, cardId);
        // Добор resolves до завершения действия: карта берётся на том же ходе.
        state.interruptQueue.push({ type: 'DRAW_ACTION_CARD_INTERRUPT', playerId: actorId });
        performShoot(state, actorId, {
          weaponItemId: combat.weaponItemId,
          targetIntruderId: combat.targetIntruderId,
          discardCardIds: payment,
        });
        queueActionCompletion(state, actorId);
        return;
      }
      if (combat.kind === 'ADRENALINE_ESCAPE') {
        consumeCard(state, actorId, cardId);
        // Побег — это Движение: цена базового действия списывается как обычно (стр. 19).
        executeCardPayment(state, actorId, payment, 1);
        // Побег — по обычным правилам, с Внеочередными атаками (стр. 19);
        // добор карты — после атак и Шума, перед завершением действия.
        state.interruptQueue.push({
          type: 'ESCAPE_ATTACK_INTERRUPT',
          playerId: actorId,
          intruderIds: isPlayerInCombat(state, actorId)
            ? state.ship.rooms[state.players[actorId]!.roomId]!.occupantIntruderIds.slice()
            : [],
          targetRoomId: combat.targetRoomId,
        });
        state.interruptQueue.push({ type: 'DRAW_ACTION_CARD_INTERRUPT', playerId: actorId });
        return;
      }
      throw new EngineError('INVALID_DECISION_OPTION', 'Неверные параметры «Адреналина».');
    }
    default:
      throw new EngineError('INVALID_DECISION_OPTION', `Карта ${cardId} не является классовой боевой картой.`);
  }
}

/** Грань, которая выпадет следующей в потоке `combat` (чтение без потребления). */
function peekCombatDieFace(state: GameState): CombatDieFace {
  const value = drawFromStream(state.meta.seed, 'combat', state.meta.rngDraws.combat);
  return COMBAT_DIE_FACES[Math.floor(value * COMBAT_DIE_FACES.length)]!;
}

/**
 * Продолжение «Прицельного огня» после решения игрока (стр. 24): KEEP —
 * остаётся выпавшая грань, REROLL — новый бросок кубика Боя (стр. 18).
 * Дальше — обычная проверка Результата Атаки и завершение действия.
 */
export function resolveRerollCombatDie(
  state: GameState,
  decision: Extract<PendingDecision, { type: 'REROLL_COMBAT_DIE' }>,
  selectedOption: string,
): void {
  if (selectedOption !== 'KEEP' && selectedOption !== 'REROLL') {
    throw new EngineError('INVALID_DECISION_OPTION', 'Допустимы только варианты KEEP или REROLL.');
  }
  const rerolled = selectedOption === 'REROLL';
  const dieFace = rerolled ? peekCombatDieFace(state) : decision.firstFace;
  state.meta.rngDraws.combat += 1;
  state.pendingDecision = null;

  const target = state.intrudersPool.boardTokens.find((entry) => entry.id === decision.targetIntruderId);
  if (!target) {
    throw new EngineError('UNKNOWN_INTRUDER', 'Цель «Прицельного огня» больше не на поле.');
  }
  let injuries = injuriesForFace(dieFace, target.type);
  if (injuries > 0 && decision.weaponBonusEligible) injuries += 1;

  const result: InjuryCheckResult =
    injuries > 0
      ? checkInjuryResult(state, target.id, target.type, injuries, decision.playerId)
      : { toughnessCards: [], toughnessTotal: 0, killed: false };

  appendGameLog(state, {
    type: 'SHOOT_RESOLVED',
    playerId: decision.playerId,
    roomId: state.players[decision.playerId]!.roomId,
    weaponName: decision.weaponName,
    ammoLeft: decision.ammoLeft,
    targetIntruderId: target.id,
    targetType: target.type,
    dieFace,
    woundsBefore: decision.woundsBefore,
    injuries,
    woundsTotal: decision.woundsBefore + injuries,
    toughnessCards: result.toughnessCards,
    toughnessTotal: result.toughnessTotal,
    killed: result.killed,
    ...(rerolled ? { rerolled: true as const } : {}),
    ...(injuries > 0 && decision.weaponBonusEligible ? { rifleBonusApplied: true } : {}),
    ...(result.retreat ? { retreat: result.retreat } : {}),
  });
  queueActionCompletion(state, decision.playerId);
}
