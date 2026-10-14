import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { SELF_DESTRUCT_EXPLODES_AT } from '../data/evacuation.js';
import { corridorsAround, otherEnd } from './botGraph.js';
import type { BotMind } from './botMind.js';
import { OBJECTIVE_PROFILES, suspectedEnemies } from './botObjectives.js';
import { roundsLeft } from './botRisk.js';
import { othersSuccessWeight } from './botSocial.js';
import type { BotTuning } from './botTuning.js';

/** Ожидание в Капсуле до начала своего хода в следующей Фазе Игроков (стр. 26): к нему корабль должен уцелеть. */
function survivesUntilNextRound(view: SanitizedGameState): boolean {
  const position = view.meta.selfDestructTrackPosition;
  const explodesNext = position !== null && SELF_DESTRUCT_EXPLODES_AT - position <= 1;
  return roundsLeft(view) > 1 && !explodesNext;
}

/** Чужой в отсеке выгоняет из Капсул всех ждущих (стр. 26): рядом с отсеком ждать нельзя. */
function intrudersNear(view: SanitizedGameState, roomId: number): boolean {
  const rooms = [roomId, ...corridorsAround(view, roomId).map((corridor) => otherEnd(corridor, roomId))];
  return view.intrudersPool.boardTokens.some((token) => rooms.includes(token.roomId));
}

function wantedDead(self: SanitizedPlayerState, other: SanitizedPlayerState): boolean {
  return (self.objectives ?? []).some((card) => OBJECTIVE_PROFILES[card.id]?.targetPlayerNumber === other.orderNumber);
}

/**
 * Товарищ, ради которого стоит подождать с запуском: стоит в том же Спасательном отсеке вне Капсулы и ещё ходит в
 * этом раунде — может войти на свободное место и запустить Капсулу на двоих (стр. 26). Не подозреваемый враг и не
 * тот, кому своя Цель велит не выжить.
 */
export function companionToWait(
  view: SanitizedGameState,
  mind: BotMind,
  tuning: BotTuning,
): SanitizedPlayerState | null {
  const self = view.players[mind.botId];
  if (!self) return null;
  const enemies = suspectedEnemies(mind, view, tuning);
  return (
    Object.values(view.players).find(
      (player) =>
        player.id !== self.id &&
        player.roomId === self.roomId &&
        !player.isDead &&
        !player.hasPassed &&
        !player.boardedPodId &&
        !player.hasEscapedInPod &&
        !player.isInHibernation &&
        !enemies.includes(player.id) &&
        !wantedDead(self, player),
    ) ?? null
  );
}

/**
 * Совместный взлёт (стр. 26): сев в Капсулу со свободным местом, бот ждёт раунд, если в отсеке есть товарищ, рядом
 * нет Чужих, корабль доживёт до следующего хода и бот не равнодушен к чужому успеху. Ждёт он лишь в раунде посадки:
 * в начале своего хода в следующем раунде Капсула стартует.
 */
export function waitsForCompanion(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): boolean {
  const self = view.players[mind.botId];
  const pod = self?.boardedPodId ? view.ship.escapePods[self.boardedPodId] : undefined;
  if (!self || !pod || pod.occupantIds.length >= 2) return false;
  if (self.boardedRound !== view.meta.currentRound) return false;
  if (0.5 + othersSuccessWeight(mind.character, mind.difficulty, tuning) <= 0) return false;
  if (!survivesUntilNextRound(view) || intrudersNear(view, self.roomId)) return false;
  return companionToWait(view, mind, tuning) !== null;
}
