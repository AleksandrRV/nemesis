import { COMBAT_USE_LABELS, combatUseViolation, type CombatUse } from '@nemesis/shared';
import { intrudersInRoom, type UsageContext } from './usageContext';
import type { CardUsage } from './usageTypes';

export function gateByCombatUse(usage: CardUsage, combatUse: CombatUse | null, ctx: UsageContext): CardUsage {
  if (!combatUse) return usage;
  const violation = combatUseViolation(combatUse, intrudersInRoom(ctx).length > 0);
  return {
    ...usage,
    combatUse,
    badges: [...usage.badges, COMBAT_USE_LABELS[combatUse]],
    variants:
      violation === null
        ? usage.variants
        : usage.variants.map((variant) => ({ ...variant, available: false, reason: violation })),
  };
}
