import type { EscapePodCommand } from '../types/actions.js';
import type { PlayerState } from '../types/entities.js';
import type { GameMeta } from '../types/state.js';

/** Чистые запросы о Спасательных Капсулах: читают только публичные поля и годятся и движку, и ботам. */
export function isPlayerInPod(player: Pick<PlayerState, 'boardedPodId'>): boolean {
  return typeof player.boardedPodId === 'string';
}

/** Запустить Капсулу можно с раунда, следующего за посадкой (стр. 11); выйти или ждать — всегда. */
export function podCommandsFor(
  state: { meta: Pick<GameMeta, 'currentRound'> },
  player: Pick<PlayerState, 'boardedPodId' | 'boardedRound'>,
): EscapePodCommand[] {
  if (!isPlayerInPod(player)) return [];
  const commands: EscapePodCommand[] = ['EXIT', 'STAY'];
  if ((player.boardedRound ?? state.meta.currentRound) < state.meta.currentRound) commands.unshift('LAUNCH');
  return commands;
}
