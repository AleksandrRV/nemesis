import { meleeInjuriesForFace } from '../data/combatDie.js';
import type { GameState } from '../types/state.js';
import type { EngineAction } from '../types/actions.js';
import { rollCombatDie } from './combatDie.js';
import { executeCardPayment } from './cardsPayment.js';
import { EngineError, enforceRule } from './engineErrors.js';
import { attackBlock } from './actionRules.js';
import { appendGameLog } from './gameLog.js';
import { isPlayerInCombat } from './combatStatus.js';
import { requireIntruder } from './intruderPlacement.js';
import { receiveContamination, sufferSeriousWound } from './characterDamage.js';
import { checkInjuryResult, type InjuryCheckResult } from './shoot.js';
import { queueActionCompletion } from './actionCompletion.js';
import { countedCombatFace } from './weaknesses.js';

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

export { meleeInjuriesForFace };

export function executeMelee(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_MELEE' }>,
  actorId: string,
): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  const inCombat = isPlayerInCombat(state, actorId);
  enforceRule(attackBlock('MELEE', inCombat, player.roomId, inCombat ? player.roomId : null));
  const target = requireIntruder(state, action.payload.targetIntruderId);
  enforceRule(attackBlock('MELEE', inCombat, player.roomId, target.roomId));

  // Цена базового действия — 1 карта Действия (стр. 12).
  executeCardPayment(state, actorId, action.payload.discardCardIds, 1);

  // Шаг 1 процедуры (стр. 19): карта Заражения — до выбора цели и броска.
  receiveContamination(state, actorId);

  const dieFace = rollCombatDie(state);
  const countedFace = countedCombatFace(state, dieFace, target.type);
  const injuries = meleeInjuriesForFace(countedFace, target.type);
  const woundsBefore = target.woundsCount;

  let result: InjuryCheckResult = { toughnessCards: [], toughnessTotal: 0, killed: false };
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
    ...(countedFace !== dieFace ? { countedFace } : {}),
    woundsBefore,
    injuries,
    woundsTotal: woundsBefore + injuries,
    toughnessCards: result.toughnessCards,
    toughnessTotal: result.toughnessTotal,
    killed: result.killed,
    contaminated: true,
    seriousWoundTaken,
    attackerDied: player.isDead,
    ...(result.retreat ? { retreat: result.retreat } : {}),
  });
  queueActionCompletion(state, actorId);
}
