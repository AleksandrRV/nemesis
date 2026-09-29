import React from 'react';
import { useGameStore, type BotSpeed } from '../store/gameStore';
import { usePresentationStore } from '../store/presentationStore';

export const BOT_STEP_DELAY_MS: Record<BotSpeed, number> = { NORMAL: 1100, FAST: 250 };

/** Темп ботов (план 0.8.0, В8-2-5): следующий шаг — только когда анимации отыграли, с паузой между действиями. */
export function useBotPacing(enabled: boolean): void {
  const pendingBotId = useGameStore((state) => state.pendingBotId);
  const botSpeed = useGameStore((state) => state.botSpeed);
  const botStall = useGameStore((state) => state.botStall);
  const botTicks = useGameStore((state) => state.botTicks);
  const handoffTo = useGameStore((state) => state.handoffTo);
  const view = useGameStore((state) => state.view);
  const isPresentationIdle = usePresentationStore((state) => state.isIdle);

  React.useEffect(() => {
    if (!enabled || !pendingBotId || !isPresentationIdle || botStall || handoffTo) return undefined;
    const timer = window.setTimeout(() => useGameStore.getState().stepBot(), BOT_STEP_DELAY_MS[botSpeed]);
    return () => window.clearTimeout(timer);
  }, [enabled, pendingBotId, isPresentationIdle, botStall, handoffTo, botSpeed, botTicks, view]);
}
