import React from 'react';
import type { CorridorNumber } from '@nemesis/shared';
import type { CorridorChoice } from '../inspector/CarefulMovePanel';
import type { CarefulMoveChosenCorridor } from '@nemesis/shared';
import { TECH_HUB } from './techCorridorModel';
import { Volume2, X } from 'lucide-react';

interface CarefulMoveOverlayProps {
  targetRoomId: number;
  targetX: number;
  targetY: number;
  choices: CorridorChoice[];
  hasFreeTechnical: boolean;
  hoveredNumber: CorridorNumber | null;
  hoveredTechnical: boolean;
  corridors: Array<{
    id: string;
    fromRoomId: number;
    toRoomId: number;
    fromNumbers: readonly number[];
    toNumbers: readonly number[];
    hasNoise: boolean;
    mx: number;
    my: number;
    noiseX: number;
    noiseY: number;
  }>;
  onChoose: (chosen: CarefulMoveChosenCorridor) => void;
  onCancel: () => void;
  onHoverNumber: (num: CorridorNumber | null) => void;
  onHoverTechnical: (hovered: boolean) => void;
}

export const CarefulMoveOverlay: React.FC<CarefulMoveOverlayProps> = ({
  targetRoomId,
  targetX,
  targetY,
  choices,
  hasFreeTechnical,
  hoveredNumber,
  hoveredTechnical,
  corridors,
  onChoose,
  onCancel,
  onHoverNumber,
  onHoverTechnical,
}) => {
  // Панель рядом с целевым гексом — смещение вправо-вверх, чтобы не перекрывать гекс
  const panelX = targetX + 72;
  const panelY = targetY - 86;
  const panelWidth = 184;
  const panelHeight = 24 + choices.length * 28 + (hasFreeTechnical ? 32 : 0) + 28;

  return (
    <g id={`careful-overlay-${targetRoomId}`} className="select-none">
      {/* Стрелки к коридорам */}
      {choices.map((choice) => {
        const relevant = corridors.filter((c) => {
          const nums = c.fromRoomId === targetRoomId ? c.fromNumbers : c.toNumbers;
          return nums.includes(choice.number);
        });
        return relevant.map((corr) => {
          const isHovered = hoveredNumber === choice.number;
          const isFree = choice.isFree;
          return (
            <g key={`${choice.number}-${corr.id}`} className="pointer-events-none">
              <line
                x1={panelX + 12}
                y1={panelY + 22 + choices.findIndex((ch) => ch.number === choice.number) * 28}
                x2={corr.noiseX}
                y2={corr.noiseY}
                stroke={isHovered ? (isFree ? '#ffb700' : '#ff3b5c') : '#475569'}
                strokeOpacity={isHovered ? 0.85 : 0.22}
                strokeWidth={isHovered ? 1.8 : 1}
                strokeDasharray={isHovered ? undefined : '4,4'}
                className={isHovered ? 'motion-safe:animate-pulse' : undefined}
              />
              {/* Наконечник стрелки */}
              <circle
                cx={corr.noiseX}
                cy={corr.noiseY}
                r={isHovered ? 3.5 : 2}
                fill={isHovered ? (isFree ? '#ffb700' : '#ff3b5c') : '#475569'}
                opacity={isHovered ? 0.9 : 0.5}
              />
            </g>
          );
        });
      })}

      {hasFreeTechnical && (
        <g className="pointer-events-none">
          <line
            x1={panelX + 12}
            y1={panelY + 22 + choices.length * 28 + 6}
            x2={TECH_HUB.x - 20}
            y2={TECH_HUB.y - 20}
            stroke={hoveredTechnical ? '#ffb700' : '#475569'}
            strokeOpacity={hoveredTechnical ? 0.85 : 0.22}
            strokeWidth={hoveredTechnical ? 1.8 : 1}
            strokeDasharray={hoveredTechnical ? undefined : '4,4'}
            className={hoveredTechnical ? 'motion-safe:animate-pulse' : undefined}
          />
          <circle
            cx={TECH_HUB.x - 20}
            cy={TECH_HUB.y - 20}
            r={hoveredTechnical ? 3.5 : 2}
            fill={hoveredTechnical ? '#ffb700' : '#475569'}
            opacity={hoveredTechnical ? 0.9 : 0.5}
          />
        </g>
      )}

      {/* Фон панели */}
      <g transform={`translate(${panelX}, ${panelY})`}>
        <rect
          x={0}
          y={0}
          width={panelWidth}
          height={panelHeight}
          rx={10}
          fill="#0e1420"
          stroke="#ffb700"
          strokeOpacity={0.55}
          strokeWidth={1.6}
          className="drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
        />
        <rect
          x={1}
          y={1}
          width={panelWidth - 2}
          height={panelHeight - 2}
          rx={9}
          fill="none"
          stroke="#ffb700"
          strokeOpacity={0.12}
        />

        {/* Заголовок */}
        <text x={12} y={16} className="font-mono fill-amber-300 font-bold text-[10px] tracking-wider">
          ШУМ → КОРИДОР
        </text>
        <g
          transform={`translate(${panelWidth - 22}, 4)`}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <rect x={0} y={0} width={18} height={18} rx={4} fill="#1e293b" />
          <X size={12} x={3} y={3} className="text-slate-400" />
        </g>

        {/* Кнопки выбора */}
        {choices.map((choice, idx) => {
          const isHovered = hoveredNumber === choice.number;
          return (
            <g
              key={choice.number}
              transform={`translate(8, ${24 + idx * 28})`}
              className={`${choice.isFree ? 'cursor-pointer' : 'cursor-not-allowed'} motion-safe:animate-step-enter`}
              style={{ animationDelay: `${idx * 80}ms` } as React.CSSProperties}
              onMouseEnter={() => onHoverNumber(choice.number)}
              onMouseLeave={() => onHoverNumber(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (!choice.isFree) return;
                onChoose({ kind: 'CORRIDOR_NUMBER', corridorNumber: choice.number });
              }}
            >
              <rect
                x={0}
                y={0}
                width={panelWidth - 16}
                height={22}
                rx={6}
                fill={isHovered ? (choice.isFree ? '#1c1917' : '#1f1214') : '#060a12'}
                stroke={isHovered ? (choice.isFree ? '#ffb700' : '#ff3b5c') : choice.isFree ? '#334155' : '#1e293b'}
                strokeWidth={isHovered ? 1.4 : 1}
              />
              <text
                x={10}
                y={14}
                className={`font-mono font-bold text-[10px] ${choice.isFree ? 'fill-slate-200' : 'fill-slate-600'}`}
              >
                #{choice.number} {choice.count > 1 ? `×${choice.count}` : ''}
              </text>
              <text
                x={panelWidth - 26}
                y={14}
                textAnchor="end"
                className={`font-mono text-[8px] font-bold ${choice.isFree ? 'fill-emerald-400' : 'fill-rose-500'}`}
              >
                {choice.isFree ? '◉ СВОБ' : '✕ ЗАНЯТ'}
              </text>
              {isHovered && (
                <g transform={`translate(${panelWidth - 44}, 6)`} className="pointer-events-none">
                  <Volume2 size={10} className={`${choice.isFree ? 'text-amber-300' : 'text-rose-400'}`} />
                </g>
              )}
            </g>
          );
        })}

        {hasFreeTechnical && (
          <g
            transform={`translate(8, ${24 + choices.length * 28 + 4})`}
            className="cursor-pointer motion-safe:animate-step-enter"
            style={{ animationDelay: `${choices.length * 80}ms` } as React.CSSProperties}
            onMouseEnter={() => onHoverTechnical(true)}
            onMouseLeave={() => onHoverTechnical(false)}
            onClick={(e) => {
              e.stopPropagation();
              onChoose({ kind: 'TECHNICAL_CORRIDOR' });
            }}
          >
            <rect
              x={0}
              y={0}
              width={panelWidth - 16}
              height={22}
              rx={6}
              fill={hoveredTechnical ? '#1c1917' : '#060a12'}
              stroke={hoveredTechnical ? '#ffb700' : '#334155'}
              strokeWidth={hoveredTechnical ? 1.4 : 1}
            />
            <text x={10} y={14} className="font-mono fill-amber-300 font-bold text-[9px]">
              ВЕНТИЛЯЦИЯ
            </text>
            <text
              x={panelWidth - 26}
              y={14}
              textAnchor="end"
              className="font-mono fill-emerald-400 font-bold text-[8px]"
            >
              ◉ СВОБ
            </text>
          </g>
        )}

        {choices.every((c) => !c.isFree) && !hasFreeTechnical && (
          <text x={12} y={24 + choices.length * 28 + 14} className="font-mono fill-rose-400 text-[9px]">
            Нет свободных коридоров
          </text>
        )}
      </g>
    </g>
  );
};
