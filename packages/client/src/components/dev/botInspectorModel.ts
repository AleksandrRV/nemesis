import type { BotInspection, InspectedCandidate, SanitizedGameState, TuningKnob } from '@nemesis/shared';
import {
  BOT_TUNING,
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
} from '@nemesis/shared';
import { CANDIDATE_KIND_LABELS } from '../bots/botLabels';
import { roomLabel } from '../log/gameLogModel';

const OBJECTIVES = [...PERSONAL_OBJECTIVE_CARDS, ...CORPORATE_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS];

export function objectiveName(cardId: string): string {
  return OBJECTIVES.find((card) => card.id === cardId)?.name ?? cardId;
}

export function candidateLabel(view: SanitizedGameState, candidate: InspectedCandidate): string {
  const kind = CANDIDATE_KIND_LABELS[candidate.kind];
  const payload = 'payload' in candidate.action ? (candidate.action.payload as Record<string, unknown>) : {};
  const target = typeof payload.targetRoomId === 'number' ? payload.targetRoomId : null;
  return target === null ? kind : `${kind} → ${roomLabel(view, target)}`;
}

export interface KnobShift {
  knob: TuningKnob;
  value: number;
}

/** Ручки, которые черты и сложность сдвинули от базы: остальные не показываются. */
export function shiftedKnobs(inspection: BotInspection): KnobShift[] {
  return (Object.keys(inspection.knobs) as TuningKnob[])
    .filter((knob) => Math.abs(inspection.knobs[knob] - BOT_TUNING.knobs[knob]) > 1e-9)
    .map((knob) => ({ knob, value: inspection.knobs[knob] }));
}

export const FACTOR_LABELS: Record<keyof InspectedCandidate['factors'], string> = {
  taskValue: 'ценность задач',
  selfRisk: '− риск себе',
  flee: '+ бегство',
  escapeAttack: '− атаки Побега',
  endTurn: '± конец хода',
  handReserve: '− запас руки',
  dangerAfter: 'опасность после',
  safety: '× безопасность',
  economy: '× экономия карт',
};
