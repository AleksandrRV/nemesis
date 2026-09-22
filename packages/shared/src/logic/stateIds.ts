import type { GameState } from '../types/state.js';

export function allocateEntityId(state: GameState, prefix: string): string {
  const sequence = state.meta.nextEntitySequence;
  state.meta.nextEntitySequence += 1;
  return `${prefix}-${sequence}`;
}
