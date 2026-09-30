import React from 'react';
import type { BotOutcome } from '@nemesis/shared';
import { OUTCOME_LABELS } from '../bots/botLabels';
import { OUTCOME_STYLES } from './outcomeStyles';

export const OutcomeIcon: React.FC<{ outcome: BotOutcome; size?: number }> = ({ outcome, size = 12 }) => {
  const Icon = OUTCOME_STYLES[outcome].icon;
  return <Icon size={size} aria-hidden="true" />;
};

export const OutcomeBadge: React.FC<{ outcome: BotOutcome; detail?: string }> = ({ outcome, detail }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${OUTCOME_STYLES[outcome].badge}`}
  >
    <OutcomeIcon outcome={outcome} />
    {OUTCOME_LABELS[outcome]}
    {detail && <span className="font-normal opacity-80">· {detail}</span>}
  </span>
);
