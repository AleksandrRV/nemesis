import type { IntruderBadgeModel } from './intruderMapModel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from './intruderShapes';

const INTRUDER_NAMES_RU: Record<IntruderBadgeModel['type'], string> = {
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

interface IntruderBadgeProps {
  badge: IntruderBadgeModel;
  x: number;
  y: number;
}

/**
 * Бейдж Чужих в узле отсека: цветной силуэт типа, число миниатюр и суммарные
 * раны. Появился на карте — значит движок разместил миниатюру в отсеке;
 * скрытых данных бейдж не содержит (состав отсеков и раны публичны, стр. 19).
 */
export function IntruderBadge({ badge, x, y }: IntruderBadgeProps) {
  const color = INTRUDER_COLORS[badge.type];
  const label = `${INTRUDER_NAMES_RU[badge.type]}: ${badge.count} шт., ран ${badge.wounds}`;

  return (
    <g transform={`translate(${x}, ${y})`} aria-label={label} className="pointer-events-none">
      <rect
        x={0}
        y={0}
        width={badge.wounds > 0 ? 40 : 26}
        height={15}
        rx={4}
        fill="#05070c"
        stroke={color}
        strokeWidth={1.2}
        strokeOpacity={0.9}
      />
      <svg x={2} y={1.5} width={12} height={12} viewBox="0 0 96 96" role="img" aria-hidden="true">
        <path d={INTRUDER_SHAPES[badge.type]} fill={color} />
      </svg>
      {badge.count > 1 && (
        <text x={17} y={11.5} className="fill-slate-200 font-mono text-[9px] font-bold">
          ×{badge.count}
        </text>
      )}
      {badge.wounds > 0 && (
        <>
          <circle cx={badge.count > 1 ? 28 : 20} cy={7.5} r={4.6} fill="#7f1d1d" stroke="#f87171" strokeWidth={0.8} />
          <text
            x={badge.count > 1 ? 28 : 20}
            y={10.3}
            textAnchor="middle"
            className="fill-red-200 font-mono text-[7px] font-bold"
          >
            {badge.wounds}
          </text>
        </>
      )}
    </g>
  );
}
