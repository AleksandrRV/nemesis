import type { RoomAbilityPayload } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { requirePlayer } from './cardEffectsShared.js';
import { EngineError } from './engineErrors.js';
import { hasContaminationInHand, scanHandAndRemoveClean } from './infectionScanner.js';

function requireScannableHand(state: GameState, actorId: string): void {
  if (!hasContaminationInHand(state, actorId)) {
    throw new EngineError('NO_CONTAMINATION', 'На руке нет карт Заражения — сканировать нечего.');
  }
}

/** Столовая [2] (стр. 25): вылечить 1 Лёгкую Травму, по желанию — скан руки. */
export function snackInCanteen(state: GameState, actorId: string, payload: RoomAbilityPayload): string {
  const player = requirePlayer(state, actorId);
  const heals = player.lightWounds > 0;
  if (!heals && !payload.scanContamination) {
    throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Лёгких Травм нет — перекусить можно только ради скана руки.');
  }
  if (payload.scanContamination) requireScannableHand(state, actorId);
  if (heals) player.lightWounds -= 1;
  if (payload.scanContamination) scanHandAndRemoveClean(state, actorId, 'CANTEEN');
  return [
    heals ? 'Вылечена 1 Лёгкая Травма' : null,
    payload.scanContamination ? 'карты Заражения на руке просканированы' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('; ');
}

/** Душевая [2] (стр. 25): сбросить Слизь, по желанию — скан руки. */
export function takeShower(state: GameState, actorId: string, payload: RoomAbilityPayload): string {
  const player = requirePlayer(state, actorId);
  const washesSlime = player.hasSlime;
  if (!washesSlime && !payload.scanContamination) {
    throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Слизи нет — принять душ можно только ради скана руки.');
  }
  if (payload.scanContamination) requireScannableHand(state, actorId);
  player.hasSlime = false;
  if (payload.scanContamination) scanHandAndRemoveClean(state, actorId, 'SHOWER');
  return [
    washesSlime ? 'Маркер Слизи смыт' : null,
    payload.scanContamination ? 'карты Заражения на руке просканированы' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('; ');
}
