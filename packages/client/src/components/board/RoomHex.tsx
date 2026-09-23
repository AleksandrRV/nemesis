/* eslint-disable react-hooks/set-state-in-effect -- кинематографичность вскрытия: typewriter и туман управляются эффектами перехода */
import React from 'react';
import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
import { Bone, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';
import { IntruderBadge } from './IntruderBadge';
import { INTRUDER_BADGE_SCALE, groupIntrudersByRoom, layoutIntruderGrid } from './intruderMapModel';

interface RoomHexProps {
  room: SanitizedRoomState;
  intruders: IntruderEntity[];
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (roomId: number) => void;
  technicalNoise?: boolean;
  hiddenPlayerIds?: ReadonlySet<string>;
  isHighlighted?: boolean;
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

  // --- Исправленная логика вскрытия: последовательная, без зацикливания ---
  const prevExploredRef = React.useRef(room.isExplored);
  const timeoutsRef = React.useRef<number[]>([]);
  const [revealStage, setRevealStage] = React.useState<'idle' | 'fog' | 'scan' | 'name' | 'icons' | 'done'>(() =>
    room.isExplored ? 'done' : 'idle',
  );
  const [isRevealing, setIsRevealing] = React.useState(false);
  const [typewriterActive, setTypewriterActive] = React.useState(false);
  const [iconsVisible, setIconsVisible] = React.useState(room.isExplored);
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

  // Основной триггер вскрытия — только при переходе false → true, без зацикливания
  React.useEffect(() => {
    const wasExplored = prevExploredRef.current;
    const clearAll = (): void => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };

    if (!wasExplored && room.isExplored) {
      prevExploredRef.current = true;
      clearAll();

      if (prefersReducedMotion) {
        setDisplayedLines(nameLines as [string, string]);
        setIconsVisible(true);
        setRevealStage('done');
        setIsRevealing(false);
        setTypewriterActive(false);
        return undefined;
      }

      // Старт последовательности: туман → скан → имя → иконки
      setIsRevealing(true);
      setRevealStage('fog');
      setIconsVisible(false);
      setDisplayedLines(['', '']);
      setTypewriterActive(false);

      const t1 = window.setTimeout(() => setRevealStage('scan'), 240);
      const t2 = window.setTimeout(() => {
        setRevealStage('name');
        setTypewriterActive(true);
      }, 780);

      const t3 = window.setTimeout(() => {
        setIsRevealing(false);
        setRevealStage('done');
        setIconsVisible(true);
        setDisplayedLines(nameLines as [string, string]);
      }, 2600);

      timeoutsRef.current = [t1, t2, t3];
      return () => {
        clearAll();
      };
    }

    if (wasExplored && !room.isExplored) {
      prevExploredRef.current = false;
      clearAll();
      setRevealStage('idle');
      setIsRevealing(false);
      setTypewriterActive(false);
      setDisplayedLines(['', '']);
      setIconsVisible(false);
      return undefined;
    }

    if (room.isExplored && !isRevealing && !typewriterActive) {
      if (revealStage === 'done' || revealStage === 'idle') {
        setDisplayedLines(nameLines as [string, string]);
        setIconsVisible(true);
        if (revealStage === 'idle') setRevealStage('done');
      }
    }
    if (!room.isExplored) {
      setDisplayedLines(['', '']);
      if (revealStage !== 'idle') setRevealStage('idle');
    }
    prevExploredRef.current = room.isExplored;
    return undefined;
  }, [room.isExplored, nameLines, prefersReducedMotion]);

  // Typewriter — побуквенный показ
  React.useEffect(() => {
    if (!typewriterActive) return;
    if (prefersReducedMotion) {
      setDisplayedLines(nameLines as [string, string]);
      setTypewriterActive(false);
      setIconsVisible(true);
      setRevealStage('icons');
      const t = window.setTimeout(() => {
        setIsRevealing(false);
        setRevealStage('done');
      }, 300);
      timeoutsRef.current.push(t);
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
      return false;
    };

    const interval = window.setInterval(() => {
      const cont = tick();
      if (!cont) {
        window.clearInterval(interval);
        setTypewriterActive(false);
        setIconsVisible(true);
        setRevealStage('icons');
        const t = window.setTimeout(() => {
          setIsRevealing(false);
          setRevealStage('done');
        }, 420);
        timeoutsRef.current.push(t);
      }
    }, 34);

    return () => window.clearInterval(interval);
  }, [typewriterActive, nameLines, prefersReducedMotion]);

  const showQuestion = !room.isExplored && revealStage === 'idle';
  const showName = room.isExplored;

  // Уникальные сиды для шума тумана
  const fogSeed1 = room.id % 97;
  const fogSeed2 = (room.id * 37) % 97;

  return (
    <g
      id={`room-${room.id}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(room.id);
      }}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 select-none"
    >
      <defs>
        {/* --- Туман войны: органичный, точно по форме гекса, без квадратных границ --- */}
        <filter id={`fog-noise-1-${room.id}`} x="-32%" y="-32%" width="164%" height="164%">
          <feTurbulence type="fractalNoise" baseFrequency="0.072 0.11" numOctaves={3} seed={fogSeed1} result="noise" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.06  0 0 0 0 0.11  0 0 0 0 0.22  0 0 0 0.58 0"
            in="noise"
            result="colored"
          />
          <feGaussianBlur in="colored" stdDeviation="1.15" result="blurred" />
          <feComposite in="blurred" in2="SourceAlpha" operator="in" result="masked" />
        </filter>
        <filter id={`fog-noise-2-${room.id}`} x="-28%" y="-28%" width="156%" height="156%">
          <feTurbulence type="fractalNoise" baseFrequency="0.11 0.065" numOctaves={2} seed={fogSeed2} result="noise" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.09  0 0 0 0 0.18  0 0 0 0 0.32  0 0 0 0.38 0"
            in="noise"
            result="colored"
          />
          <feGaussianBlur in="colored" stdDeviation="0.9" result="blurred" />
          <feComposite in="blurred" in2="SourceAlpha" operator="in" result="masked" />
        </filter>
        {/* Drop shadow для исследованных */}
        <filter id={`room-shadow-${room.id}`} x="-24%" y="-24%" width="148%" height="148%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3.2" floodColor="#000" floodOpacity="0.55" />
        </filter>
        {/* Inner shadow для неизведанных */}
        <filter id={`room-inner-shadow-${room.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dx="0" dy="2" />
          <feGaussianBlur stdDeviation="3.5" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#000" floodOpacity="0.72" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
        <clipPath id={`hex-clip-${room.id}`}>
          <polygon points={points} />
        </clipPath>
        <linearGradient id={`scan-grad-${room.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="28%" stopColor="#00f0ff" stopOpacity="0.15" />
          <stop offset="44%" stopColor="#00f0ff" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.9" />
          <stop offset="78%" stopColor="#00f0ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`fog-vignette-${room.id}`} cx="50%" cy="50%" r="72%">
          <stop offset="48%" stopColor="#050a14" stopOpacity="0" />
          <stop offset="76%" stopColor="#050a14" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#050a14" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id={`fog-soft-edge-${room.id}`} cx="50%" cy="50%" r="68%">
          <stop offset="0%" stopColor="#0b1a2c" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#0b1a2c" stopOpacity="0.82" />
          <stop offset="84%" stopColor="#0b1a2c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0b1a2c" stopOpacity="0" />
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

      <g
        style={
          {
            transformOrigin: `${x}px ${y}px`,
          } as React.CSSProperties
        }
        className={
          revealStage === 'fog' ? 'motion-safe:animate-room-flip motion-reduce:animate-none' : undefined
        }
      >
        <polygon
          points={points}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          filter={room.isExplored ? `url(#room-shadow-${room.id})` : `url(#room-inner-shadow-${room.id})`}
          style={
            !room.isExplored
              ? ({ filter: `url(#room-inner-shadow-${room.id}) brightness(0.6)` } as React.CSSProperties)
              : undefined
          }
        />

        {room.isExplored && (
          <polygon points={points} fill="url(#grid)" opacity="0.06" className="pointer-events-none" />
        )}
      </g>

      {revealStage === 'fog' && (
        <polygon
          points={points}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={6}
          className="pointer-events-none motion-safe:animate-room-flash motion-reduce:opacity-0"
        />
      )}

      {/* --- Туман войны: кинематографичный, гекс-форма, мягкие края, лёгкая анимация --- */}
      {!room.isExplored && revealStage === 'idle' && (
        <g className="pointer-events-none">
          <polygon points={points} fill="#050a14" opacity="0.98" />
          <g clipPath={`url(#hex-clip-${room.id})`}>
            <rect x={x - 60} y={y - 60} width={120} height={120} fill="#050a14" />
            <g
              className="motion-safe:animate-fog-drift motion-reduce:animate-none"
              style={{ transformOrigin: `${x}px ${y}px` } as React.CSSProperties}
            >
              <rect
                x={x - 62}
                y={y - 62}
                width={124}
                height={124}
                fill="#0b1a2c"
                opacity={0.58}
                filter={`url(#fog-noise-1-${room.id})`}
                className="motion-safe:animate-fog-pulse"
              />
            </g>
            <g
              className="motion-safe:animate-fog-drift motion-reduce:animate-none"
              style={
                {
                  transformOrigin: `${x}px ${y}px`,
                  animationDelay: '1.3s',
                  animationDuration: '7.8s',
                } as React.CSSProperties
              }
            >
              <rect
                x={x - 60}
                y={y - 60}
                width={120}
                height={120}
                fill="#1a2a44"
                opacity={0.32}
                filter={`url(#fog-noise-2-${room.id})`}
              />
            </g>
            <rect
              x={x - 60}
              y={y - 60}
              width={120}
              height={120}
              fill={`url(#fog-vignette-${room.id})`}
              opacity={0.9}
            />
            <rect
              x={x - 60}
              y={y - 60}
              width={120}
              height={120}
              fill={`url(#fog-soft-edge-${room.id})`}
              opacity={0.55}
              style={{ mixBlendMode: 'soft-light' } as React.CSSProperties}
            />
          </g>
          <polygon
            points={points}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.15}
            strokeDasharray="4,3.5"
            opacity={0.32}
            className="motion-safe:animate-fog-idle"
          />
          <g opacity={0.24} className="motion-safe:animate-fog-idle motion-reduce:opacity-20">
            <circle cx={x - 12} cy={y - 8} r={0.9} fill="#38bdf8" />
            <circle cx={x + 10} cy={y + 6} r={0.7} fill="#38bdf8" />
            <circle cx={x - 4} cy={y + 14} r={0.6} fill="#475569" />
          </g>
        </g>
      )}

      {/* Фаза исчезания тумана — кинематографичное растворение */}
      {revealStage === 'fog' && (
        <g className="pointer-events-none">
          <g clipPath={`url(#hex-clip-${room.id})`} className="motion-safe:animate-fog-dissolve">
            <rect x={x - 60} y={y - 60} width={120} height={120} fill="#050a14" />
            <rect
              x={x - 62}
              y={y - 62}
              width={124}
              height={124}
              fill="#0b1a2c"
              opacity={0.72}
              filter={`url(#fog-noise-1-${room.id})`}
            />
            <rect
              x={x - 60}
              y={y - 60}
              width={120}
              height={120}
              fill="#1a2a44"
              opacity={0.42}
              filter={`url(#fog-noise-2-${room.id})`}
            />
          </g>
        </g>
      )}

      {/* Фаза сканирования — одиночный проход, без зацикливания */}
      {revealStage === 'scan' && (
        <g clipPath={`url(#hex-clip-${room.id})`} className="pointer-events-none">
          <rect
            x={x - 72}
            y={y - 54}
            width={22}
            height={108}
            fill={`url(#scan-grad-${room.id})`}
            className="motion-safe:animate-scanline-sweep motion-reduce:opacity-0"
            style={{ mixBlendMode: 'screen' } as React.CSSProperties}
          />
          {/* Дополнительный мягкий след сканирования */}
          <rect
            x={x - 72}
            y={y - 54}
            width={42}
            height={108}
            fill="#00f0ff"
            opacity={0.06}
            className="motion-safe:animate-scanline-sweep motion-reduce:opacity-0"
            style={{ mixBlendMode: 'screen', animationDelay: '80ms', animationDuration: '820ms' } as React.CSSProperties}
          />
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

      <text
        x={x}
        y={room.isExplored ? y - 18 : y - 6}
        textAnchor="middle"
        className="text-[10px] font-mono fill-slate-400 font-bold pointer-events-none"
      >
        {String(room.id).padStart(3, '0')}
      </text>

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

      {/* Иконки — анимированное появление после typewriter */}
      <g transform={`translate(${x - 18}, ${y + 19})`} className="pointer-events-none">
        {room.hasFire && (
          <g
            className={
              iconsVisible && (revealStage === 'icons' || revealStage === 'done')
                ? 'motion-safe:animate-room-icon-pop'
                : iconsVisible
                  ? ''
                  : 'opacity-0'
            }
            style={{ animationDelay: '0ms' } as React.CSSProperties}
          >
            <Flame size={12} className="text-orange-500 fill-orange-500" x={0} y={0} />
          </g>
        )}
        {room.hasMalfunction && (
          <g
            className={
              iconsVisible && (revealStage === 'icons' || revealStage === 'done')
                ? 'motion-safe:animate-room-icon-pop'
                : iconsVisible
                  ? ''
                  : 'opacity-0'
            }
            style={{ animationDelay: '90ms' } as React.CSSProperties}
          >
            <Wrench size={12} className="text-amber-400" x={12} y={0} />
          </g>
        )}
        {room.hasComputer && room.isExplored && (
          <g
            className={
              iconsVisible && (revealStage === 'icons' || revealStage === 'done')
                ? 'motion-safe:animate-room-icon-pop'
                : iconsVisible
                  ? ''
                  : 'opacity-0'
            }
            style={{ animationDelay: '180ms' } as React.CSSProperties}
          >
            <Laptop size={12} className="text-cyan-400" x={24} y={0} />
          </g>
        )}
      </g>

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

      {visibleOccupantCount > 0 && (
        <g transform={`translate(${x - 10}, ${y - 34})`} className="pointer-events-none">
          <circle cx={10} cy={10} r={10} fill="#00f0ff" stroke="#05070c" strokeWidth={2} />
          <User size={12} className="text-slate-950" x={4} y={4} />
        </g>
      )}

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
