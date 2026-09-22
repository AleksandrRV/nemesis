import type { IntruderToken } from '@nemesis/shared';
import { INTRUDER_NAMES } from './contactPresentationModel';
import { INTRUDER_SHAPES } from '../board/intruderShapes';

export function IntruderSilhouette({ type }: { type: IntruderToken['type'] }) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={INTRUDER_NAMES[type]}
      className="h-28 w-28 text-cyan-100 drop-shadow-lg sm:h-36 sm:w-36"
    >
      <path d={INTRUDER_SHAPES[type]} fill="currentColor" />
    </svg>
  );
}
