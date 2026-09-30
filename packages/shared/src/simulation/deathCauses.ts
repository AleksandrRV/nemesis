import type { EndgameDeath } from '../types/endgame.js';
import type { GameLogEntry, GameLogEvent } from '../types/log.js';
import type { DeathCause } from './simulationTypes.js';

/** Сколько соседних записей журнала смотреть вокруг гибели: урон пишется рядом с ней. */
const CAUSE_WINDOW = 4;

const ENDGAME_CAUSES: Record<Exclude<EndgameDeath, 'DIED_DURING_GAME'>, DeathCause> = {
  LEFT_ON_BOARD: 'LEFT_ON_BOARD',
  SHIP_DESTROYED: 'SHIP_DESTROYED',
  ENGINES_FAILED: 'ENGINES_FAILED',
  WRONG_COORDINATES: 'WRONG_COORDINATES',
  INFECTION: 'INFECTION',
};

function causeOf(event: GameLogEvent, playerId: string): DeathCause | null {
  switch (event.type) {
    case 'SURPRISE_ATTACK_RESOLVED':
      return event.playerId === playerId ? 'SURPRISE_ATTACK' : null;
    case 'ESCAPE_ATTACK_RESOLVED':
      return event.playerId === playerId ? 'ESCAPE_ATTACK' : null;
    case 'EVENT_PHASE_ATTACK_RESOLVED':
      return event.playerId === playerId ? 'EVENT_ATTACK' : null;
    case 'MELEE_RESOLVED':
      return event.playerId === playerId ? 'MELEE' : null;
    case 'FIRE_DAMAGE_TAKEN':
      return event.playerId === playerId ? 'FIRE' : null;
    case 'BLEEDING_WOUND_TAKEN':
      return event.playerId === playerId ? 'BLEEDING' : null;
    case 'DECOMPRESSION_RESOLVED':
      return event.killedPlayerIds.includes(playerId) ? 'DECOMPRESSION' : null;
    case 'CONTAMINATION_SCANNED':
      return event.playerId === playerId ? 'INFECTION' : null;
    case 'EVENT_EFFECT_RESOLVED':
      return 'EVENT';
    default:
      return null;
  }
}

/** Причина гибели во время партии: ближайшее к записи о гибели событие урона этого Персонажа. */
export function deathCauseInLog(log: readonly GameLogEntry[], deathIndex: number, playerId: string): DeathCause {
  for (let distance = 1; distance <= CAUSE_WINDOW; distance++) {
    for (const index of [deathIndex + distance, deathIndex - distance]) {
      const entry = log[index];
      const cause = entry ? causeOf(entry.event, playerId) : null;
      if (cause) return cause;
    }
  }
  return 'OTHER';
}

export function deathCauseAtEndgame(death: EndgameDeath): DeathCause | null {
  return death === 'DIED_DURING_GAME' ? null : ENDGAME_CAUSES[death];
}

export interface LoggedDeath {
  cause: DeathCause;
  round: number;
}

/** Все гибели во время партии с раундом: раунд — по последнему `ROUND_STARTED` перед записью. */
export function deathsInLog(log: readonly GameLogEntry[]): Map<string, LoggedDeath> {
  const deaths = new Map<string, LoggedDeath>();
  let round = 1;
  log.forEach((entry, index) => {
    if (entry.event.type === 'ROUND_STARTED') round = entry.event.round;
    if (entry.event.type === 'PLAYER_DIED' && !deaths.has(entry.event.playerId)) {
      deaths.set(entry.event.playerId, { cause: deathCauseInLog(log, index, entry.event.playerId), round });
    }
  });
  return deaths;
}
