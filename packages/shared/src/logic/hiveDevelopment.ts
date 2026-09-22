import type { HiveDevelopmentOutcome } from '../types/log.js';
import type { IntruderToken } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { drawFromStream } from '../utils/rng.js';
import { isPlayerInCombat } from './combatStatus.js';
import { appendGameLog } from './gameLog.js';
import { livingPlayersInRoom, placeIntruder, returnTokenToBag } from './intruderPlacement.js';
import { getOrderedPlayers } from './turnCycle.js';

/** Планшет Чужих вмещает 8 жетонов Яиц (стр. 31, Развитие Улья). */
export const HIVE_EGG_CAPACITY = 8;

/**
 * Шаг 8 Фазы Событий — Развитие Улья (стр. 10, шаг 8; стр. 31): из мешка
 * Пула Чужих потоком `bag` вытягивается ровно 1 жетон и разыгрывается по
 * типу. Пустой мешок честно пропускается журналом — тянуть нечего.
 */
export function resolveHiveDevelopment(state: GameState): void {
  const bag = state.intrudersPool.bag;
  if (bag.length === 0) {
    appendGameLog(state, {
      type: 'HIVE_DEVELOPMENT_SKIPPED',
      round: state.meta.currentRound,
      reason: 'EMPTY_BAG',
    });
    return;
  }

  const value = drawFromStream(state.meta.seed, 'bag', state.meta.rngDraws.bag);
  state.meta.rngDraws.bag += 1;
  const token = bag.splice(Math.floor(value * bag.length), 1)[0]!;

  const outcome = resolveHiveToken(state, token);

  appendGameLog(state, {
    type: 'HIVE_DEVELOPMENT_RESOLVED',
    round: state.meta.currentRound,
    tokenType: token.type,
    outcome,
  });
}

/**
 * Розыгрыш вытянутого жетона (стр. 31). Личинка и Крипер удаляются из Пула
 * «в коробку»; Взрослая, Трутень, Королева и Пустой возвращаются в мешок.
 */
function resolveHiveToken(state: GameState, token: IntruderToken): HiveDevelopmentOutcome {
  switch (token.type) {
    case 'LARVA':
      // Жетон Личинки исчезает из Пула; взамен в мешок приходит Взрослая.
      return { kind: 'LARVA', adultAdded: returnTokenToBag(state, 'ADULT') };
    case 'CREEPER':
      // Жетон Крипера исчезает из Пула; взамен в мешок приходит Трутень.
      return { kind: 'CREEPER', breederAdded: returnTokenToBag(state, 'BREEDER') };
    case 'ADULT':
      state.intrudersPool.bag.push(token);
      return { kind: 'ADULT', rolledPlayerIds: queueNoiseRollsOutsideCombat(state) };
    case 'BREEDER':
      state.intrudersPool.bag.push(token);
      return { kind: 'BREEDER', rolledPlayerIds: queueNoiseRollsOutsideCombat(state) };
    case 'QUEEN':
      state.intrudersPool.bag.push(token);
      return resolveQueenToken(state);
    case 'BLANK':
      state.intrudersPool.bag.push(token);
      return { kind: 'BLANK', adultAdded: returnTokenToBag(state, 'ADULT') };
  }
}

/**
 * Все живые Персонажи вне Боя бросают кубик Шума по очереди ходов
 * (стр. 31: Взрослая Особь и Трутень). Персонажи в Бою бросок игнорируют.
 */
function queueNoiseRollsOutsideCombat(state: GameState): string[] {
  const rolledPlayerIds: string[] = [];
  for (const player of getOrderedPlayers(state)) {
    if (isPlayerInCombat(state, player.id)) continue;
    rolledPlayerIds.push(player.id);
    state.interruptQueue.push({
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: player.id,
      roomId: player.roomId,
      noise: { kind: 'ROLL' },
    });
  }
  return rolledPlayerIds;
}

/**
 * Королева (стр. 31): Персонаж в Улье — миниатюра Королевы туда и немедленный
 * Контакт с источником `EVENT`; иначе 1 жетон Яйца на Планшет Чужих (вместимость
 * 8). Жетон Королевы всегда возвращается в мешок.
 */
function resolveQueenToken(state: GameState): HiveDevelopmentOutcome {
  const nest = Object.values(state.ship.rooms).find((room) => room.definitionId === 'NEST');
  const occupants = nest ? livingPlayersInRoom(state, nest.id) : [];

  if (occupants.length > 0) {
    const queen = placeIntruder(state, 'QUEEN', nest!.id);
    for (const playerId of occupants) {
      state.interruptQueue.push({
        type: 'CONTACT_INTERRUPT',
        playerId,
        roomId: nest!.id,
        source: 'EVENT',
      });
    }
    return { kind: 'QUEEN', queenPlaced: true, intruderId: queen.id, contactPlayerIds: occupants, eggAdded: false };
  }

  let eggAdded = false;
  if (state.intrudersPool.eggsOnBoard < HIVE_EGG_CAPACITY) {
    state.intrudersPool.eggsOnBoard += 1;
    eggAdded = true;
  }
  return { kind: 'QUEEN', queenPlaced: false, intruderId: null, contactPlayerIds: [], eggAdded };
}
