import type {
  BotDifficulty,
  BotTraitId,
  CharacterClass,
  RateStat,
  SanitizedGameState,
  SimulatedBot,
  SimulationRecord,
  SimulationSummary,
} from '@nemesis/shared';
import { BOT_TRAITS, CHARACTERS, rateOf } from '@nemesis/shared';
import { DEATH_CAUSE_LABELS, actionTypeLabel, percent, traitLabel } from '../bots/botLabels';
import type { BarRow, Column } from '../bots/charts';
import { messageText } from '../comms/commsPhrases';
import { CAUSE_TITLES } from '../endgame/endgameModel';
import { formatGameLogEntry, playerName, type GameLogSegment } from '../log/gameLogModel';

export type SimulationMode = 'SINGLE' | 'SERIES';

export interface SimulationConfig {
  botCount: number;
  difficulty: BotDifficulty;
  seed: string;
  mode: SimulationMode;
}

export const BOT_COUNTS: readonly number[] = [1, 2, 3, 4, 5];

/** Черта попадает в график, если встретилась хотя бы в стольких партиях: меньшая выборка — шум. */
export const MIN_TRAIT_SAMPLE = 3;

export function characterName(characterClass: CharacterClass): string {
  return CHARACTERS.find((preset) => preset.characterClass === characterClass)?.name ?? characterClass;
}

export function gameOverTitle(record: Pick<SimulationRecord, 'finished' | 'gameOverReason'>): string {
  if (!record.finished) return 'Партия зависла';
  return record.gameOverReason ? CAUSE_TITLES[record.gameOverReason] : 'Партия окончена';
}

function rateRow(key: string, label: string, stat: RateStat): BarRow {
  const rate = rateOf(stat.survivals, stat.games);
  return {
    key,
    label,
    value: rate,
    display: `${percent(rate)} · ${stat.games}`,
    hint: `${label}: выжили ${stat.survivals} из ${stat.games}, победили ${stat.wins}`,
  };
}

export function deathCauseRows(summary: SimulationSummary): BarRow[] {
  return Object.entries(summary.deathCauses)
    .sort((left, right) => right[1] - left[1])
    .map(([cause, count]) => ({
      key: cause,
      label: DEATH_CAUSE_LABELS[cause as keyof typeof DEATH_CAUSE_LABELS],
      value: count,
      display: `${count} · ${percent(rateOf(count, summary.bots))}`,
    }));
}

export function gameOverRows(summary: SimulationSummary): BarRow[] {
  return Object.entries(summary.gameOverReasons)
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => ({
      key: reason,
      label: CAUSE_TITLES[reason as keyof typeof CAUSE_TITLES],
      value: count,
      display: `${count} · ${percent(rateOf(count, summary.games))}`,
    }));
}

function histogram(counts: Record<number, number>): Column[] {
  const keys = Object.keys(counts).map(Number);
  if (keys.length === 0) return [];
  const last = Math.max(...keys);
  return Array.from({ length: last }, (_, index) => ({
    key: String(index + 1),
    label: String(index + 1),
    value: counts[index + 1] ?? 0,
  }));
}

export function roundColumns(summary: SimulationSummary): Column[] {
  return histogram(summary.roundsHistogram);
}

export function deathRoundColumns(summary: SimulationSummary): Column[] {
  return histogram(summary.deathRounds);
}

export function traitRows(summary: SimulationSummary): BarRow[] {
  return BOT_TRAITS.flatMap((trait: BotTraitId) => {
    const stat = summary.byTrait[trait];
    return stat && stat.games >= MIN_TRAIT_SAMPLE ? [rateRow(trait, traitLabel(trait), stat)] : [];
  }).sort((left, right) => right.value - left.value);
}

export function moraleRows(summary: SimulationSummary): BarRow[] {
  return summary.byMorale
    .filter((band) => band.stat.games > 0)
    .map((band) => rateRow(band.label, `Мораль ${band.label}`, band.stat));
}

export function characterRows(summary: SimulationSummary): BarRow[] {
  return Object.entries(summary.byCharacter)
    .map(([characterClass, stat]) => rateRow(characterClass, characterName(characterClass as CharacterClass), stat!))
    .sort((left, right) => right.value - left.value);
}

export function actionRows(actions: Record<string, number>): BarRow[] {
  const total = Object.values(actions).reduce((sum, count) => sum + count, 0);
  return Object.entries(actions)
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => ({
      key: type,
      label: actionTypeLabel(type),
      value: count,
      display: `${count} · ${percent(rateOf(count, total))}`,
    }));
}

/** Номер партии серии «#N»: полный сид — в подсказке. */
export function seriesGameLabel(seed: string): string {
  const mark = seed.lastIndexOf('#');
  return mark < 0 ? seed : seed.slice(mark);
}

export function survivorsOf(record: SimulationRecord): SimulatedBot[] {
  return record.bots.filter((bot) => bot.outcome !== 'DIED');
}

export interface ChronicleLine {
  id: string;
  segments: GameLogSegment[];
}

export interface ChronicleRound {
  round: number;
  lines: ChronicleLine[];
}

/** Журнал партии по раундам: публичные записи в том виде, в каком их читает игрок. */
export function chronicle(view: SanitizedGameState): ChronicleRound[] {
  const rounds: ChronicleRound[] = [{ round: 1, lines: [] }];
  for (const entry of view.gameLog) {
    if (entry.event.type === 'ROUND_STARTED') rounds.push({ round: entry.event.round, lines: [] });
    rounds.at(-1)!.lines.push({ id: entry.id, segments: formatGameLogEntry(entry, view).segments });
  }
  return rounds.filter((round) => round.lines.length > 0);
}

export interface RadioLine {
  id: string;
  round: number;
  author: string;
  text: string;
}

export function radioTranscript(view: SanitizedGameState): RadioLine[] {
  return view.comms.messages.map((message) => ({
    id: message.id,
    round: message.round,
    author: message.authorId === null ? 'Корабль' : playerName(view, message.authorId),
    text: messageText(view, message),
  }));
}
