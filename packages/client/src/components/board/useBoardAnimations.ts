import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import {
  BOARD_ANIMATION_TTL_MS,
  CONTACT_TEASE_TTL_MS,
  EXPLORATION_ANIMATION_TTL_MS,
  NOISE_POP_TTL_MS,
  NOISE_ROLL_TTL_MS,
  diffBoardSnapshots,
  inTransitIds,
  type BoardAnimation,
} from './boardAnimationModel';

/**
 * Слой плавных перемещений (Шаг 9): при каждом новом срезе состояния находит
 * сменившие отсек фишки и держит их анимации на карте, пока они не дойдут.
 * Первый срез (загрузка страницы) историю не проигрывает.
 */
export function useBoardAnimations(view: SanitizedGameState | null): {
  animations: BoardAnimation[];
  inTransitPlayerIds: Set<string>;
  inTransitIntruderIds: Set<string>;
} {
  const previousRef = React.useRef<SanitizedGameState | null>(null);
  const mountedRef = React.useRef(true);
  const [animations, setAnimations] = React.useState<BoardAnimation[]>([]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!view) return;
    const previous = previousRef.current;
    previousRef.current = view;

    const fresh = diffBoardSnapshots(previous, view);
    if (fresh.length === 0) return;

    const freshKeys = new Set(fresh.map((animation) => animation.key));
    setAnimations((current) => [...current.filter((animation) => !freshKeys.has(animation.key)), ...fresh]);

    // Очистка по TTL: для жетонов Исследования — дольше, чтобы прочитать эффект
    for (const animation of fresh) {
      let ttl = BOARD_ANIMATION_TTL_MS;
      if (animation.kind === 'EXPLORATION_REVEAL') ttl = EXPLORATION_ANIMATION_TTL_MS;
      else if (animation.kind === 'NOISE_POP') ttl = NOISE_POP_TTL_MS;
      else if (animation.kind === 'NOISE_ROLL') ttl = NOISE_ROLL_TTL_MS;
      else if (animation.kind === 'CONTACT_TEASE') ttl = CONTACT_TEASE_TTL_MS;
      const key = animation.key;
      setTimeout(() => {
        if (!mountedRef.current) return;
        setAnimations((current) => current.filter((a) => a.key !== key));
      }, ttl);
    }
  }, [view]);

  const { playerIds, intruderIds } = inTransitIds(animations);
  return { animations, inTransitPlayerIds: playerIds, inTransitIntruderIds: intruderIds };
}

/**
 * Доступность (Шаг 9): при `prefers-reduced-motion` физическое скольжение
 * заменяется быстрым мягким растворением на месте прибытия.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}
