import type { BotOutcome } from '@nemesis/shared';
import { Shield, Skull, Trophy } from 'lucide-react';
import { STATUS_SWATCHES } from '../bots/chartPalette';

/** Исход — статус, а не серия: свой цвет, значок и подпись, цвет никогда не говорит один. */
export const OUTCOME_STYLES: Record<BotOutcome, { swatch: string; icon: typeof Trophy; badge: string }> = {
  WON: { swatch: STATUS_SWATCHES.good, icon: Trophy, badge: 'border-[#0ca30c]/60 bg-[#0ca30c]/15 text-emerald-100' },
  SURVIVED: {
    swatch: STATUS_SWATCHES.warning,
    icon: Shield,
    badge: 'border-[#fab219]/60 bg-[#fab219]/15 text-amber-100',
  },
  DIED: { swatch: STATUS_SWATCHES.critical, icon: Skull, badge: 'border-[#d03b3b]/60 bg-[#d03b3b]/15 text-red-100' },
};
