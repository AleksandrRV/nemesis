/* eslint-disable react-hooks/set-state-in-effect -- кинематографичность вскрытия: typewriter и туман управляются эффектами перехода */
import React from 'react';
import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
import { Bone, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';
import { IntruderBadge } from './IntruderBadge';
import { INTRUDER_BADGE_SCALE, groupIntrudersByRoom, layoutIntruderGrid } from './intruderMapModel';

interface RoomHexProps {
  /** Отсек глазами игрока: невскрытый тайл приходит без названия и жетона (стр. 14). */
  room: SanitizedRoomState;
  /** Чужие этого отсека: публичные миниатюры и их раны (стр. 19). */
  intruders: IntruderEntity[];
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (roomId: number) => void;
  /** Шум на поле Технических Коридоров считается на всех входах вентиляции (стр. 15–16). */
  technicalNoise?: boolean;
  /** Персонажи, скользящие по анимационному слою: статический чип не дублируется (Шаг 9). */
  hiddenPlayerIds?: ReadonlySet<string>;
  /** Подсветка затронутых отсеков интерфейсом Фазы Событий (Шаг 9). */
  isHighlighted?: boolean;
  /** Этап 2B: целевая комната для движения — пульсирует сильнее выбранной */
  isMoveTarget?: boolean;
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

export const RoomHex: React.FC<RoomHexProps> = ({
  room,
  intruders,
  x,
  y,
  isSelected,
  onSelect,
  technicalNoise,
  hiddenPlayerIds,
  isHighlighted = false,
  isMoveTarget = false,
}) => {
  const radius = 45;
  const visibleOccupantCount = hiddenPlayerIds
    ? room.occupantPlayerIds.filter((playerId) => !hiddenPlayerIds.has(playerId)).length
    : room.occupantPlayerIds.length;

  const points = React.useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      pts.push(`${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [x, y, radius]);

  const intruderBadges = React.useMemo(() => groupIntrudersByRoom(intruders).get(room.id) ?? [], [intruders, room.id]);
  const gridRows = React.useMemo(() => layoutIntruderGrid(intruderBadges), [intruderBadges]);

  /** Статус Боя (стр. 18): Персонаж и Чужой в одном отсеке — тревожная рамка. */
  const inCombat = room.occupantPlayerIds.length > 0 && intruderBadges.length > 0;

  const nodeData = React.useMemo(() => SHIP_ROOM_NODES.find((node) => node.id === room.id), [room.id]);
  const techNumbers = nodeData?.techNumbers ?? [];
  const hasTechEntrance = techNumbers.length > 0;

  const nameLines = React.useMemo(() => {
    if (!room.definitionId) {
      return ['НЕИЗВЕСТНЫЙ', 'ОТСЕК'] as [string, string];
    }
    return (CANONICAL_ROOM_NAMES[room.definitionId] || [room.definitionId, '']) as [string, string];
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

  // --- Кинематографичность вскрытия: туман, переворот, typewriter ---
  const prevExploredRef = React.useRef(room.isExplored);
  const [isRevealing, setIsRevealing] = React.useState(false);
  const [typewriterActive, setTypewriterActive] = React.useState(false);
  const [displayedLines, setDisplayedLines] = React.useState<[string, string]>(() =>
    room.isExplored ? (nameLines as [string, string]) : (['', ''] as [string, string]),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Обнаружение перехода !explored -> explored (вскрытие тайла)
  React.useEffect(() => {
    const wasExplored = prevExploredRef.current;
    let timeoutId: number | undefined;

    if (!wasExplored && room.isExplored) {
      // Только что вскрыли — запускаем кинематографику
      setIsRevealing(true);
      if (!prefersReducedMotion) {
        setTypewriterActive(true);
        setDisplayedLines(['', '']);
      } else {
        setDisplayedLines(nameLines as [string, string]);
      }
      timeoutId = window.setTimeout(() => setIsRevealing(false), 680);
    } else {
      if (wasExplored !== room.isExplored) {
        prevExploredRef.current = room.isExplored;
      }
      // Если уже исследован и не в процессе typewriter — синхронизируем полное имя
      if (room.isExplored && !typewriterActive && !isRevealing) {
        setDisplayedLines(nameLines as [string, string]);
      }
      if (!room.isExplored) {
        setDisplayedLines(['', '']);
      }
      prevExploredRef.current = room.isExplored;
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [room.isExplored, nameLines, prefersReducedMotion, typewriterActive, isRevealing]);

  // Typewriter эффект: печать по буквам двух строк
  React.useEffect(() => {
    if (!typewriterActive) return;
    if (prefersReducedMotion) {
      setDisplayedLines(nameLines as [string, string]);
      setTypewriterActive(false);
      return;
    }
    const full0 = nameLines[0] ?? '';
    const full1 = nameLines[1] ?? '';
    let l0 = '';
    let l1 = '';
    let i0 = 0;
    let i1 = 0;
    let phase: 0 | 1 = 0;

    const tick = (): boolean => {
      if (phase === 0) {
        if (i0 < full0.length) {
          l0 += full0[i0]!;
          i0++;
          setDisplayedLines([l0, l1]);
          return true;
        }
        phase = 1;
        return true;
      }
      if (i1 < full1.length) {
        l1 += full1[i1]!;
        i1++;
        setDisplayedLines([l0, l1]);
        return true;
      }
      setTypewriterActive(false);
      return false;
    };

    const interval = window.setInterval(() => {
      const cont = tick();
      if (!cont) window.clearInterval(interval);
    }, 36);

    return () => window.clearInterval(interval);
  }, [typewriterActive, nameLines, prefersReducedMotion]);

  const showQuestion = !room.isExplored && !isRevealing;
  const showName = room.isExplored;

  return (
    <g
      id={`room-${room.id}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(room.id);
      }}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 select-none"
    >
      {/* --- SVG defs для тумана и сканлайна (уникальные per room) --- */}
      <defs>
        <filter id={`fog-filter-${room.id}`} x="-22%" y="-22%" width="144%" height="144%">
          <feTurbulence type="fractalNoise" baseFrequency="0.085" numOctaves={2} seed={room.id % 97} result="turb" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.06  0 0 0 0 0.12  0 0 0 0 0.22  0 0 0 0.62 0"
            in="turb"
            result="colored"
          />
          <feGaussianBlur in="colored" stdDeviation="0.9" result="blurred" />
          <feComposite in="blurred" in2="SourceGraphic" operator="over" />
        </filter>
        <clipPath id={`hex-clip-${room.id}`}>
          <polygon points={points} />
        </clipPath>
        <linearGradient id={`scan-grad-${room.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="42%" stopColor="#00f0ff" stopOpacity="0.92" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="68%" stopColor="#00f0ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`fog-vignette-${room.id}`} cx="50%" cy="50%" r="68%">
          <stop offset="62%" stopColor="#050a14" stopOpacity="0" />
          <stop offset="100%" stopColor="#050a14" stopOpacity="0.85" />
        </radialGradient>
      </defs>

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

      {/* Этап 2B: целевая комната для движения — неоновая подсветка пути + glow */}
      {isMoveTarget && (
        <>
          <polygon
            points={points}
            fill="none"
            stroke="#00f0ff"
            strokeWidth={5}
            strokeOpacity={0.72}
            className="pointer-events-none animate-pulse motion-reduce:animate-none"
            aria-label="Цель движения"
          />
          <polygon
            points={points}
            fill="none"
            stroke="#00f0ff"
            strokeWidth={11}
            strokeOpacity={0.18}
            className="pointer-events-none"
          />
        </>
      )}

      {/* Статус «В Бою»: контрастная пульсирующая рамка вокруг гекса (стр. 18) */}
      {inCombat && (
        <polygon
          points={points}
          fill="none"
          stroke="#ff4d00"
          strokeWidth="4.5"
          strokeOpacity="0.85"
          className="animate-pulse"
          aria-label="Отсек в Бою"
        />
      )}

      {/* --- Основной гекс с переворотом при вскрытии --- */}
      <g
        style={
          {
            transformOrigin: `${x}px ${y}px`,
          } as React.CSSProperties
        }
        className={isRevealing ? 'motion-safe:animate-room-flip motion-reduce:animate-none' : undefined}
      >
        <polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />

        {/* Внутренний блик для исследованных — лёгкая глубина */}
        {room.isExplored && (
          <polygon points={points} fill="url(#grid)" opacity="0.06" className="pointer-events-none" />
        )}
      </g>

      {/* Вспышка вскрытия: яркий контур, гаснущий за 620мс */}
      {isRevealing && (
        <polygon
          points={points}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={6}
          className="pointer-events-none motion-safe:animate-room-flash motion-reduce:opacity-0"
        />
      )}

      {/* --- Туман войны для неисследованных --- */}
      {!room.isExplored && !isRevealing && (
        <g className="pointer-events-none">
          {/* Базовый тёмный фон */}
          <polygon points={points} fill="#050a14" opacity="0.96" />
          {/* Шумовой туман */}
          <polygon points={points} fill="#0b1a2c" opacity="0.52" filter={`url(#fog-filter-${room.id})`} />
          {/* Диагональная штриховка «неизвестно» */}
          <polygon
            points={points}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
            strokeDasharray="4,3.5"
            opacity={0.45}
          />
          {/* Виньетка */}
          <polygon points={points} fill={`url(#fog-vignette-${room.id})`} opacity="0.9" />
          {/* Микро-точки как пыль */}
          <g opacity={0.18}>
            <circle cx={x - 12} cy={y - 8} r={0.9} fill="#38bdf8" />
            <circle cx={x + 10} cy={y + 6} r={0.7} fill="#38bdf8" />
            <circle cx={x - 4} cy={y + 14} r={0.6} fill="#475569" />
          </g>
        </g>
      )}

      {/* Dissolve тумана при вскрытии */}
      {isRevealing && (
        <g className="pointer-events-none">
          <polygon
            points={points}
            fill="#0b1a2c"
            filter={`url(#fog-filter-${room.id})`}
            className="motion-safe:animate-fog-dissolve motion-reduce:animate-none"
          />
          {/* Сканлайн — яркая линия, пробегающая по гексу 600мс */}
          <g clipPath={`url(#hex-clip-${room.id})`}>
            <rect
              x={x - 70}
              y={y - 52}
              width={18}
              height={104}
              fill={`url(#scan-grad-${room.id})`}
              className="motion-safe:animate-scanline-sweep motion-reduce:opacity-0"
              style={{ mixBlendMode: 'screen' } as React.CSSProperties}
            />
          </g>
        </g>
      )}

      {hasTechEntrance && (
        <g transform={`translate(${x}, ${y - radius + 3})`} className="pointer-events-none">
          {technicalNoise && (
            <circle
              cx={0}
              cy={0}
              r={10.5}
              fill="none"
              stroke="#ff003c"
              strokeWidth={2}
              className="motion-safe:animate-vent-alarm motion-reduce:opacity-70"
              aria-label="Шум в вентиляции"
            />
          )}
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

      {/* Название — с typewriter при вскрытии */}
      {showQuestion && (
        <text
          x={x}
          y={y + 14}
          textAnchor="middle"
          className="text-[22px] font-heading fill-slate-600 font-bold pointer-events-none"
        >
          ?
        </text>
      )}
      {showName && (
        <text
          x={x}
          y={y - 2}
          textAnchor="middle"
          className="font-mono fill-cyan-300 font-bold pointer-events-none tracking-tight text-[8px]"
        >
          <tspan x={x} dy={0}>
            {displayedLines[0]}
            {typewriterActive && displayedLines[0].length < (nameLines[0]?.length ?? 0) && (
              <tspan className="fill-cyan-100 motion-safe:animate-typewriter-cursor">▌</tspan>
            )}
          </tspan>
          <tspan x={x} dy={10}>
            {displayedLines[1]}
            {typewriterActive &&
              displayedLines[0].length >= (nameLines[0]?.length ?? 0) &&
              displayedLines[1].length < (nameLines[1]?.length ?? 0) && (
                <tspan className="fill-cyan-100 motion-safe:animate-typewriter-cursor">▌</tspan>
              )}
          </tspan>
        </text>
      )}

      {/* Индикаторы аварий */}
      <g transform={`translate(${x - 18}, ${y + 19})`} className="pointer-events-none">
        {room.hasFire && <Flame size={12} className="text-orange-500 fill-orange-500" x={0} y={0} />}
        {room.hasMalfunction && <Wrench size={12} className="text-amber-400" x={12} y={0} />}
        {room.hasComputer && room.isExplored && <Laptop size={12} className="text-cyan-400" x={24} y={0} />}
      </g>

      {/* Подсветка отсека интерфейсом Фазы Событий (Шаг 9) */}
      {isHighlighted && (
        <polygon
          points={points}
          fill="none"
          stroke="#ffb700"
          strokeWidth="5"
          strokeOpacity="0.75"
          className="pointer-events-none animate-pulse motion-reduce:animate-none"
          aria-label="Отсек подсвечен"
        />
      )}

      {/* Персонажи (скрыты, пока скользят по анимационному слою) */}
      {visibleOccupantCount > 0 && (
        <g transform={`translate(${x - 10}, ${y - 34})`} className="pointer-events-none">
          <circle cx={10} cy={10} r={10} fill="#00f0ff" stroke="#05070c" strokeWidth={2} />
          <User size={12} className="text-slate-950" x={4} y={4} />
        </g>
      )}

      {/* Чужие в отсеке */}
      {gridRows.map((row, rowIndex) => {
        const rowY = gridRows.length === 1 ? y + 22 : y + 13 + rowIndex * 17;
        return (
          <g
            key={`intruder-row-${rowIndex}`}
            transform={`translate(${x - (row.width * row.scale) / 2}, ${rowY}) scale(${row.scale})`}
          >
            {row.items.map((item) => (
              <IntruderBadge
                key={item.badge.type}
                badge={item.badge}
                x={item.x}
                y={0}
                scale={INTRUDER_BADGE_SCALE[item.badge.type]}
              />
            ))}
          </g>
        );
      })}

      {/* Объекты на полу */}
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
    </g>
  );
};
