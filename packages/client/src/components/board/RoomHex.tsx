import React from 'react';
import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
import { Bone, Bug, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';

import { INTRUDER_TYPE_COLORS, INTRUDER_TYPE_LABELS } from '../../utils/labels';

interface RoomHexProps {
  /** Отсек глазами игрока: невскрытый тайл приходит без названия и жетона (стр. 14). */
  room: SanitizedRoomState;
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (roomId: number) => void;
  /** Особи Чужих в отсеке: значок красится по типу, счётчик показывает раны. */
  intruders: IntruderEntity[];
}

const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
  COCKPIT: ['МОСТИК', 'КОРАБЛЯ'],
  HIBERNATORIUM: ['КРИОГЕННЫЙ', 'ОТСЕК'],
  ENGINE_01: ['МАШИННЫЙ', 'ОТСЕК #01'],
  ENGINE_02: ['МАШИННЫЙ', 'ОТСЕК #02'],
  ENGINE_03: ['МАШИННЫЙ', 'ОТСЕК #03'],
  ARMORY: ['ОРУЖЕЙНЫЙ', 'СКЛАД'],
  COMM_ROOM: ['РАДИОРУБКА', 'СВЯЗИ'],
  INFIRMARY: ['МЕДИЦИНСКИЙ', 'ЛАЗАРЕТ'],
  LABORATORY: ['НАУЧНАЯ', 'ЛАБОРАТОРИЯ'],
  GENERATOR: ['ГЕНЕРАТОР', 'ЭНЕРГИИ'],
  ESCAPE_POD_A: ['СПАСАТЕЛЬНЫЙ', 'ОТСЕК А'],
  ESCAPE_POD_B: ['СПАСАТЕЛЬНЫЙ', 'ОТСЕК В'],
  FIRE_CONTROL: ['ПОЖАРНАЯ', 'БЕЗОПАСНОСТЬ'],
  NEST: ['ГНЕЗДО', 'ЧУЖИХ (УЛЕЙ)'],
  STORAGE: ['ОТСЕК', 'ХРАНЕНИЯ'],
  SURGERY: ['ХИРУРГИЯ /', 'ОПЕРАЦИОННАЯ'],
  AIRLOCK_CONTROL: ['КОНТРОЛЬ', 'ШЛЮЗОВ'],
  CABINS: ['ЖИЛЫЕ', 'КАЮТЫ'],
  CANTEEN: ['СТОЛОВАЯ', 'ЭКИПАЖА'],
  COMMAND_CENTER: ['ЦЕНТР', 'УПРАВЛЕНИЯ'],
  ENGINE_CONTROL: ['МАШИННОЕ', 'ОТДЕЛЕНИЕ'],
  HATCH_CONTROL: ['БЛОКИРОВКА', 'КАПСУЛ'],
  OBSERVATION_ROOM: ['КОМНАТА', 'НАБЛЮДЕНИЯ'],
  SLIME_ROOM: ['КОМНАТА', 'СО СЛИЗЬЮ'],
  SHOWER: ['ДУШЕВАЯ', 'ЭКИПАЖА'],
};

export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSelect, intruders }) => {
  const radius = 45;

  const points = React.useMemo(() => {
    const pts: string[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);

      pts.push(`${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`);
    }

    return pts.join(' ');
  }, [x, y, radius]);

  const nodeData = React.useMemo(() => SHIP_ROOM_NODES.find((node) => node.id === room.id), [room.id]);

  const techNumbers = nodeData?.techNumbers ?? [];
  const hasTechEntrance = techNumbers.length > 0;

  const nameLines = React.useMemo(() => {
    if (!room.definitionId) {
      return ['НЕИЗВЕСТНЫЙ', 'ОТСЕК'];
    }

    return CANONICAL_ROOM_NAMES[room.definitionId] || [room.definitionId, ''];
  }, [room.definitionId]);

  const strokeColor = isSelected
    ? '#00f0ff'
    : room.category === 'SPECIAL'
      ? '#f59e0b'
      : room.isExplored
        ? '#38bdf8'
        : '#1e293b';

  const fillColor = isSelected
    ? '#0d2238'
    : room.category === 'SPECIAL'
      ? '#1c1917'
      : room.isExplored
        ? '#071322'
        : '#050a14';

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(room.id);
      }}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 select-none"
    >
      {isSelected && (
        <polygon
          points={points}
          fill="none"
          stroke="#00f0ff"
          strokeWidth="6"
          strokeOpacity="0.4"
          className="animate-pulse"
        />
      )}

      <polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />

      {hasTechEntrance && (
        <g transform={`translate(${x}, ${y - radius + 3})`} className="pointer-events-none">
          <circle cx={0} cy={0} r={6.5} fill="#ff003c" stroke="#05070c" strokeWidth={1.5} />

          <polygon points="-2.5,1.5 0,-2.5 2.5,1.5" fill="white" />

          <g transform="translate(9, 3)">
            <rect
              x={-2}
              y={-8}
              width={techNumbers.length > 1 ? 16 : 10}
              height={10}
              rx={2}
              fill="#05070c"
              stroke="#ff003c"
              strokeWidth={1}
            />

            <text
              x={techNumbers.length > 1 ? 6 : 3}
              y={-1}
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-red-400 font-bold"
            >
              {techNumbers.join(',')}
            </text>
          </g>
        </g>
      )}

      {/* Номер комнаты */}
      <text
        x={x}
        y={room.isExplored ? y - 18 : y - 6}
        textAnchor="middle"
        className="text-[10px] font-mono fill-slate-400 font-bold pointer-events-none"
      >
        {String(room.id).padStart(3, '0')}
      </text>

      {/* Название */}
      {room.isExplored ? (
        <text
          x={x}
          y={y - 2}
          textAnchor="middle"
          className="font-mono fill-cyan-300 font-bold pointer-events-none tracking-tight text-[8px]"
        >
          <tspan x={x} dy={0}>
            {nameLines[0]}
          </tspan>
          <tspan x={x} dy={10}>
            {nameLines[1]}
          </tspan>
        </text>
      ) : (
        <text
          x={x}
          y={y + 14}
          textAnchor="middle"
          className="text-[22px] font-heading fill-slate-600 font-bold pointer-events-none"
        >
          ?
        </text>
      )}

      {/* Индикаторы аварий */}
      <g transform={`translate(${x - 18}, ${y + 19})`} className="pointer-events-none">
        {room.hasFire && <Flame size={12} className="text-orange-500 fill-orange-500" x={0} y={0} />}

        {room.hasMalfunction && <Wrench size={12} className="text-amber-400" x={12} y={0} />}

        {room.hasComputer && room.isExplored && <Laptop size={12} className="text-cyan-400" x={24} y={0} />}
      </g>

      {/* Персонажи */}
      {room.occupantPlayerIds.length > 0 && (
        <g transform={`translate(${x - 10}, ${y - 34})`} className="pointer-events-none">
          <circle cx={10} cy={10} r={10} fill="#00f0ff" stroke="#05070c" strokeWidth={2} />

          <User size={12} className="text-slate-950" x={4} y={4} />
        </g>
      )}

      {/* Объекты на полу: Труп, Яйцо, Останки (стр. 22) */}
      {room.objects.map((object, index) => {
        const offset = 10 + index * 20;

        return (
          <g key={object.id} transform={`translate(${x + offset}, ${y - 34})`} className="pointer-events-none">
            <circle
              cx={8}
              cy={8}
              r={8}
              fill={object.kind === 'CORPSE' ? '#ff003c' : object.kind === 'EGG' ? '#00ff66' : '#334155'}
              stroke="#05070c"
              strokeWidth={1.5}
            />

            {object.kind === 'CORPSE' && <Skull size={10} className="text-white" x={3} y={3} />}
            {object.kind === 'EGG' && <Egg size={10} className="text-slate-950" x={3} y={3} />}
            {object.kind === 'INTRUDER_REMAINS' && <Bone size={10} className="text-white" x={3} y={3} />}
          </g>
        );
      })}

      {/* Чужие в отсеке: значок по типу особи, счётчик — полученные раны */}
      {intruders.length > 0 && (
        <g className="pointer-events-none">
          {intruders.map((entity, index) => {
            const colors = INTRUDER_TYPE_COLORS[entity.type];
            const cx = x + (index - (intruders.length - 1) / 2) * 19;
            const cy = y + 34;

            return (
              <g key={entity.id} transform={`translate(${cx}, ${cy})`}>
                <title>{`${INTRUDER_TYPE_LABELS[entity.type]} — ран: ${entity.woundsCount}`}</title>
                <circle cx={0} cy={0} r={8} fill={colors.fill} stroke="#05070c" strokeWidth={1.5} />
                <Bug size={11} x={-5.5} y={-5.5} style={{ color: colors.ink }} />
                {entity.woundsCount > 0 && (
                  <g>
                    <circle cx={7} cy={-7} r={5} fill="#ff003c" stroke="#05070c" strokeWidth={1} />
                    <text x={7} y={-4.5} textAnchor="middle" className="text-[7px] font-mono fill-white font-bold">
                      {entity.woundsCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};
