import {
  COORDINATE_CARDS,
  type CourseMarker,
  type Destination,
  type EndgameCharacterResult,
  type EndgameDeath,
  type EndgameReport,
  type GameOverReason,
  type SanitizedGameState,
} from '@nemesis/shared';

export type EndgameStage =
  | { kind: 'SHIP_FATE' }
  | { kind: 'ENGINES' }
  | { kind: 'COURSE' }
  | { kind: 'INFECTION'; playerId: string }
  | { kind: 'OBJECTIVES'; playerId: string }
  | { kind: 'SUMMARY' };

export const DESTINATION_LABELS: Record<Destination, string> = {
  EARTH: 'Земля',
  MARS: 'Марс',
  VENUS: 'Венера',
  DEEP_SPACE: 'Глубокий космос',
};

export const CAUSE_TITLES: Record<GameOverReason, string> = {
  HYPERSPACE_JUMP: 'Гиперпрыжок',
  SHIP_EXPLODED: 'Корабль взорвался',
  HULL_BREACH: 'Обшивка разорвана',
  NO_ACTIVE_CHARACTERS: 'На борту никого не осталось',
};

export const DEATH_LABELS: Record<EndgameDeath, string> = {
  DIED_DURING_GAME: 'Погиб на корабле',
  LEFT_ON_BOARD: 'Остался на борту при гиперпрыжке',
  SHIP_DESTROYED: 'Погиб вместе с кораблём',
  ENGINES_FAILED: 'Погиб: Двигатели неисправны',
  WRONG_COORDINATES: 'Погиб: корабль ушёл не к Земле',
  INFECTION: 'Погиб: паразит внутри',
};

export function shipFateLines(report: EndgameReport): string[] {
  const lines: string[] = [];
  if (report.finalMarker === 'SELF_DESTRUCT') {
    lines.push('Активных Персонажей не осталось: маркер Самоуничтожения переносится на череп.');
  } else if (report.finalMarker === 'TIME') {
    lines.push('Активных Персонажей не осталось: маркер Времени переносится на последнее поле.');
  }
  if (report.cause === 'HULL_BREACH')
    lines.push('Девятый маркер Неисправности разорвал обшивку — погибли все на борту.');
  else if (report.cause === 'SHIP_EXPLODED' || report.finalMarker === 'SELF_DESTRUCT') {
    lines.push('Корабль взорвался — погибли все на борту, и в Анабиозе тоже. Чужие погибли вместе с ним.');
  } else {
    lines.push('Корабль совершает гиперпрыжок: все на борту вне Камер Анабиоза погибают от перегрузок.');
  }
  return lines;
}

export function isExplosionFate(report: EndgameReport): boolean {
  return report.cause === 'SHIP_EXPLODED' || report.cause === 'HULL_BREACH' || report.finalMarker === 'SELF_DESTRUCT';
}

/** Последовательность сцен: только те проверки, которые действительно проводились (стр. 11). */
export function buildEndgameStages(report: EndgameReport): EndgameStage[] {
  const stages: EndgameStage[] = [{ kind: 'SHIP_FATE' }];
  if (report.engineCheck) stages.push({ kind: 'ENGINES' });
  if (report.courseCheck) stages.push({ kind: 'COURSE' });
  for (const character of report.characters) {
    if (character.infection) stages.push({ kind: 'INFECTION', playerId: character.playerId });
  }
  for (const character of report.characters) {
    if (character.objectiveResults.length > 0) stages.push({ kind: 'OBJECTIVES', playerId: character.playerId });
  }
  stages.push({ kind: 'SUMMARY' });
  return stages;
}

export function courseRow(cardId: string): { marker: CourseMarker; destination: Destination }[] {
  const card = COORDINATE_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) return [];
  return (['A', 'B', 'C', 'D'] as const).map((marker) => ({ marker, destination: card.destinations[marker] }));
}

export function characterOf(report: EndgameReport, playerId: string): EndgameCharacterResult | undefined {
  return report.characters.find((entry) => entry.playerId === playerId);
}

export function survivalLine(result: EndgameCharacterResult): string {
  if (result.death) return DEATH_LABELS[result.death];
  return result.escapeRoute === 'POD' ? 'Спасся в Капсуле' : 'Выжил в Анабиозе';
}

export interface PlayerStats {
  playerId: string;
  kills: number;
  shots: number;
  moves: number;
  searches: number;
  crafted: number;
  contaminations: number;
  lightWounds: number;
  seriousWounds: number;
  signalSent: boolean;
}

export interface GameStats {
  rounds: number;
  intrudersKilled: number;
  contacts: number;
  roomsDiscovered: number;
  noiseRolls: number;
  eventCards: number;
  players: PlayerStats[];
}

function eventPlayerId(event: object): string | null {
  return 'playerId' in event && typeof event.playerId === 'string' ? event.playerId : null;
}

export function buildGameStats(view: SanitizedGameState): GameStats {
  const events = view.gameLog.map((entry) => entry.event);
  const count = (type: string, playerId?: string) =>
    events.filter((event) => event.type === type && (playerId === undefined || eventPlayerId(event) === playerId))
      .length;
  const players = Object.values(view.players)
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .map((player) => ({
      playerId: player.id,
      kills: count('INTRUDER_KILLED', player.id),
      shots: count('SHOOT_RESOLVED', player.id),
      moves: count('PLAYER_MOVED', player.id),
      searches: count('SEARCH_PERFORMED', player.id),
      crafted: count('ITEM_CRAFTED', player.id),
      contaminations: count('CONTAMINATION_RECEIVED', player.id),
      lightWounds: player.lightWounds,
      seriousWounds: player.seriousWounds.length,
      signalSent: player.hasSignalSent,
    }));
  return {
    rounds: view.meta.currentRound,
    intrudersKilled: count('INTRUDER_KILLED'),
    contacts: events.filter((event) => event.type === 'CONTACT_OCCURRED' && event.tokenType !== 'BLANK').length,
    roomsDiscovered: count('ROOM_DISCOVERED'),
    noiseRolls: count('NOISE_ROLLED'),
    eventCards: count('EVENT_CARD_DRAWN'),
    players,
  };
}

export const ENDGAME_SEEN_STORAGE_PREFIX = 'nemesis:endgame-seen:';

export function isEndgameSeen(gameId: string): boolean {
  try {
    return window.sessionStorage.getItem(`${ENDGAME_SEEN_STORAGE_PREFIX}${gameId}`) === '1';
  } catch {
    return false;
  }
}

export function rememberEndgameSeen(gameId: string): void {
  try {
    window.sessionStorage.setItem(`${ENDGAME_SEEN_STORAGE_PREFIX}${gameId}`, '1');
  } catch {
    return;
  }
}
