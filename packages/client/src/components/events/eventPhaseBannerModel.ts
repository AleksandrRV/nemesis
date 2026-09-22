import type { IntruderType, RoomId, SanitizedGameState } from '@nemesis/shared';

export type EventPhaseAttackOutcome = 'HIT' | 'MISS' | 'INFESTATION' | 'SUPPRESSED';

export interface EventPhaseAttackSummary {
  logId: string;
  roomId: RoomId;
  intruderType: IntruderType;
  targetName: string;
  outcome: EventPhaseAttackOutcome;
  cardName: string | null;
  anyVictimDead: boolean;
}

export interface EventPhaseBannerModel {
  /** Запись сдвига счётчиков — устойчивый ключ конкретной Фазы Событий. */
  phaseKey: number;
  round: number;
  attacks: EventPhaseAttackSummary[];
}

/**
 * Окно последней Фазы Событий: от записи сдвига счётчиков (`Шаг 4`) до
 * начала следующего раунда. Пустая фаза (без атак Чужих) баннер не
 * заслуживает — возвращает `null`.
 */
export function buildEventPhaseBannerModel(view: SanitizedGameState): EventPhaseBannerModel | null {
  const log = view.gameLog;
  let phaseIndex = -1;
  let phaseKey = 0;
  let round = 0;
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index]!.event;
    if (event.type === 'TIME_TRACK_ADVANCED') {
      phaseIndex = index;
      phaseKey = log[index]!.sequence;
      round = event.round;
      break;
    }
  }
  if (phaseIndex === -1) return null;

  const attacks: EventPhaseAttackSummary[] = [];
  for (let index = phaseIndex + 1; index < log.length; index += 1) {
    const entry = log[index]!;
    if (entry.event.type === 'ROUND_STARTED') break;
    if (entry.event.type !== 'EVENT_PHASE_ATTACK_RESOLVED') continue;
    const event = entry.event;
    attacks.push({
      logId: entry.id,
      roomId: event.roomId,
      intruderType: event.intruderType,
      targetName: view.players[event.playerId]?.name ?? event.playerId,
      outcome: event.outcome,
      cardName: event.card?.name ?? null,
      anyVictimDead: event.victims.some((victim) => victim.isDead),
    });
  }
  if (attacks.length === 0) return null;

  return { phaseKey, round, attacks };
}
