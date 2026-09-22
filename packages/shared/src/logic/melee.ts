import type { IntruderAttackCard } from '../types/cards.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import type { EngineAction } from '../types/actions.js';
import { rollCombatDie } from './combatDie.js';
import { executeCardPayment } from './cardsPayment.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { isPlayerInCombat } from './combatStatus.js';
import { requireIntruder } from './intruderPlacement.js';
import { receiveContamination, sufferSeriousWound } from './characterDamage.js';
import { checkInjuryResult } from './shoot.js';
import { queueActionCompletion } from './actionCompletion.js';

/**
 * Базовое действие «Рукопашная атака» (стр. 19). Порядок процедуры:
 * 1) Персонаж вытягивает 1 карту Заражения и кладёт её в свой сброс карт
 *    Действия — заражение неизбежно до броска;
 * 2) выбирает 1 Чужого в своём отсеке;
 * 3) бросает кубик Боя: грань сопоставляется с типом цели, как в Стрельбе,
 *    но «2 Раны» считается 1 Раной; промах (включая грань не по типу цели)
 *    — цель немедленно наносит Персонажу 1 Тяжёлую Травму (стр. 19, 21).
 * Затем — общая проверка Результата Атаки (стр. 20).
 */

/** Сколько Ран наносит грань кубика Боя в Рукопашной атаке (стр. 19). */
export function meleeInjuriesForFace(face: CombatDieFace, targetType: IntruderType): number {
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
      // «Вы наносите цели 1 Рану (да, лишь 1!)» — стр. 19.
      return 1;
  }
}

export function executeMelee(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_MELEE' }>,
  actorId: string,
): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  if (!isPlayerInCombat(state, actorId)) {
    throw new EngineError(
      'MELEE_NOT_IN_COMBAT',
      '«Рукопашная атака» выполняется, только когда Персонаж находится в Бою (стр. 12, 19).',
    );
  }

  const target = requireIntruder(state, action.payload.targetIntruderId);
  if (target.roomId !== player.roomId) {
    throw new EngineError(
      'INVALID_ATTACK_TARGET',
      'Атаковать рукопашной можно только Чужих из собственного отсека (стр. 19).',
    );
  }

  // Цена базового действия — 1 карта Действия (стр. 12).
  executeCardPayment(state, actorId, action.payload.discardCardIds, 1);

  // Шаг 1 процедуры (стр. 19): карта Заражения — до выбора цели и броска.
  receiveContamination(state, actorId);

  const dieFace = rollCombatDie(state);
  const injuries = meleeInjuriesForFace(dieFace, target.type);
  const woundsBefore = target.woundsCount;

  let result = { toughnessCards: [] as IntruderAttackCard[], toughnessTotal: 0, killed: false };
  let seriousWoundTaken = false;
  if (injuries > 0) {
    result = checkInjuryResult(state, target.id, target.type, injuries, actorId);
  } else {
    // Промах: атакованный Чужой немедленно наносит 1 Тяжёлую Травму (стр. 19);
    // третья Тяжёлая Травма убивает Персонажа (стр. 21).
    seriousWoundTaken = true;
    sufferSeriousWound(state, actorId);
  }

  appendGameLog(state, {
    type: 'MELEE_RESOLVED',
    playerId: actorId,
    roomId: player.roomId,
    targetIntruderId: target.id,
    targetType: target.type,
    dieFace,
    woundsBefore,
    injuries,
    woundsTotal: woundsBefore + injuries,
    toughnessCards: result.toughnessCards,
    toughnessTotal: result.toughnessTotal,
    killed: result.killed,
    contaminated: true,
    seriousWoundTaken,
    attackerDied: player.isDead,
  });
  queueActionCompletion(state, actorId);
}
