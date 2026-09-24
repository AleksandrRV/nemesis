/* eslint-disable max-lines -- кинематографичный слой с множеством FX: дверь, шум, контакт, исследование */
import React from 'react';
import { SHIP_ROOM_NODES, type ExplorationEffect, type NoiseDieFace, type SanitizedGameState } from '@nemesis/shared';
import { AlertTriangle, Droplet, Flame, Package, VolumeX, Wrench, DoorOpen, type LucideIcon } from 'lucide-react';
import type { BoardAnimation } from './boardAnimationModel';
import { TECH_HUB, TECH_HUB_RADIUS } from './techCorridorModel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from './intruderShapes';
import { DOOR_BLAST_DELAY_MS } from './doorTransitionModel';
import { CrewToken } from './CrewToken';
import { crewTokenLabel, toCrewToken } from './crewTokenModel';
import { ROOM_STRIP_OFFSET_Y } from './crewTokenModel';

interface Point {
  x: number;
  y: number;
}

interface BoardAnimationLayerProps {
  view: SanitizedGameState;
  animations: readonly BoardAnimation[];
  /** `prefers-reduced-motion`: скольжение заменяется мягким растворением. */
  reducedMotion: boolean;
}

/** Естественное ускорение/замедление прохода по траектории Коридора. */
const GLIDE_EASING = 'cubic-bezier(0.45, 0.05, 0.25, 1)';
const GLIDE_MS = 750;

/**
 * Токен, плавно скользящий из исходной точки в целевую. При включённом
 * режиме сниженного движения скольжения нет — быстрое растворение в цели.
 */
function GlideToken({
  from,
  to,
  reducedMotion,
  fadeAfterArrival,
  ariaLabel,
  children,
}: {
  from: Point;
  to: Point;
  reducedMotion: boolean;
  /** Затягивание в вентиляцию: после прибытия фигурка растворяется в узле. */
  fadeAfterArrival?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const [departed, setDeparted] = React.useState(reducedMotion);

  React.useEffect(() => {
    if (reducedMotion) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDeparted(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const target = departed ? to : from;
  const scale = departed && fadeAfterArrival ? 0.3 : 1;
  const opacity = departed && fadeAfterArrival ? 0 : 1;

  return (
    <g
      aria-label={ariaLabel}
      className={reducedMotion ? 'motion-reduce:animate-token-fade' : undefined}
      style={{
        transform: `translate(${target.x}px, ${target.y}px) scale(${scale})`,
        transition: reducedMotion
          ? 'none'
          : `transform ${GLIDE_MS}ms ${GLIDE_EASING}, opacity 420ms ease-in ${fadeAfterArrival ? Math.round(GLIDE_MS * 0.65) : 0}ms`,
        opacity,
      }}
    >
      {children}
    </g>
  );
}

function IntruderFigure({ type }: { type: keyof typeof INTRUDER_SHAPES }) {
  return (
    <svg x={-11} y={-11} width={22} height={22} viewBox="0 0 96 96" role="img" aria-hidden="true">
      <path d={INTRUDER_SHAPES[type]} fill={INTRUDER_COLORS[type]} stroke="#05070c" strokeWidth={2} />
    </svg>
  );
}

/** Вспышка деформации и взлома металла на переборке разрушенной Двери. */
const SPARK_ANGLES = [8, 72, 140, 196, 262, 318] as const;
const BREACH_FX_DELAY = `${DOOR_BLAST_DELAY_MS.BREACH}ms`;

function DoorBreachFx({ point }: { point: Point }) {
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      aria-label="Взлом Закрытой Двери"
      className="pointer-events-none"
    >
      <g className="motion-safe:animate-door-fx-gate">
        <circle
          r={26}
          fill="none"
          stroke="#ffb700"
          strokeWidth={2.5}
          className="motion-safe:animate-door-shockwave motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: BREACH_FX_DELAY }}
        />
        {SPARK_ANGLES.map((angle, index) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <line
              x1={0}
              y1={-12}
              x2={0}
              y2={-24}
              stroke="#ff5500"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="motion-safe:animate-door-spark motion-reduce:animate-none"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
                animationDelay: `${DOOR_BLAST_DELAY_MS.BREACH + (index % 3) * 90}ms`,
              }}
            />
          </g>
        ))}
        <g
          className="motion-safe:animate-door-breach motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: BREACH_FX_DELAY }}
        >
          <circle r={11} fill="none" stroke="#ff5500" strokeWidth={3} />
          <circle r={4.5} fill="#ffb700" />
          <path
            d="M -17 -6 L -9 -2 M 17 -6 L 9 -2 M -15 9 L -8 4 M 15 9 L 8 4"
            stroke="#ff5500"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      </g>
    </g>
  );
}

function VentHubRipple({ animationKey }: { animationKey: string }) {
  return (
    <g key={`${animationKey}-ripple`} aria-label="Прибытие в Технические Коридоры" className="pointer-events-none">
      <circle
        cx={TECH_HUB.x}
        cy={TECH_HUB.y}
        r={TECH_HUB_RADIUS}
        fill="none"
        stroke="#ff003c"
        strokeWidth={2.5}
        className="motion-safe:animate-hub-ripple motion-reduce:animate-none"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </g>
  );
}

// --- Этап 2: Жетон Исследования — мини-карта с эффектом ---

interface EffectVisual {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: LucideIcon;
  flicker?: boolean;
}

const EXPLORATION_VISUALS: Record<ExplorationEffect, EffectVisual> = {
  FIRE: { label: 'ПОЖАР', color: '#ff7a18', bg: '#1e1210', border: '#ff5500', Icon: Flame, flicker: true },
  MALFUNCTION: { label: 'ПОЛОМКА', color: '#ffbf1a', bg: '#1e1a0f', border: '#ffb700', Icon: Wrench },
  SLIME: { label: 'СЛИЗЬ', color: '#34ff8a', bg: '#0d1e14', border: '#00ff66', Icon: Droplet },
  DOORS: { label: 'ДВЕРИ', color: '#b8a6ff', bg: '#171222', border: '#8b6bff', Icon: DoorOpen },
  DANGER: { label: 'ОПАСНОСТЬ', color: '#ff3b5c', bg: '#1e0f14', border: '#ff003c', Icon: AlertTriangle },
  SILENCE: { label: 'ТИШИНА', color: '#94a3b8', bg: '#121a2a', border: '#334155', Icon: VolumeX },
};

function ExplorationRevealFx({
  point,
  effect,
  itemsCount,
  reducedMotion,
}: {
  point: Point;
  effect: ExplorationEffect;
  itemsCount: number;
  reducedMotion: boolean;
}) {
  const visual = EXPLORATION_VISUALS[effect];
  const Icon = visual.Icon;

  // ВАЖНО: анимация выезда карточки висит на ВНУТРЕННЕЙ группе. CSS-анимация
  // transform перекрывает SVG-атрибут transform той же группы — карточка
  // улетала в начало координат (левый верхний угол карты) на всё время анимации.
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      aria-label={`Жетон Исследования: ${visual.label}`}
      className="pointer-events-none"
    >
      <circle
        r={42}
        fill={visual.border}
        opacity={0.14}
        className={visual.flicker ? 'motion-safe:animate-flame-flicker' : undefined}
      />

      <g
        className={reducedMotion ? undefined : 'motion-safe:animate-exploration-reveal motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
      >
        <g transform="translate(-46, -30)">
          <rect
            x={0}
            y={0}
            width={92}
            height={60}
            rx={9}
            fill={visual.bg}
            stroke={visual.border}
            strokeWidth={1.6}
            opacity={0.98}
          />
          <rect
            x={3}
            y={3}
            width={86}
            height={54}
            rx={6}
            fill="none"
            stroke={visual.border}
            strokeOpacity={0.22}
            strokeWidth={1}
          />

          <g transform="translate(36, 8)">
            <circle cx={10} cy={10} r={12} fill="#05070c" stroke={visual.border} strokeWidth={1.2} opacity={0.9} />
            <Icon size={14} x={3} y={3} className={visual.flicker ? 'motion-safe:animate-flame-flicker' : undefined} />
          </g>

          <text
            x={46}
            y={38}
            textAnchor="middle"
            className="font-bold tracking-wider"
            style={{ fontSize: '7.5px', fill: visual.color, fontFamily: 'Share Tech Mono, monospace' }}
          >
            {visual.label}
          </text>

          <g transform="translate(46, 44)">
            <rect x={-22} y={0} width={44} height={12} rx={6} fill="#05070c" stroke="#1e293b" strokeWidth={1} />
            <g transform="translate(-14, 2)">
              <Package size={8} className="text-slate-400" />
            </g>
            <text
              x={6}
              y={8.5}
              textAnchor="middle"
              style={{ fontSize: '7px', fill: '#cbd5e1', fontFamily: 'Share Tech Mono, monospace' }}
              className="font-bold"
            >
              {itemsCount} ПРЕДМ.
            </text>
          </g>
        </g>
      </g>

      <circle
        r={28}
        fill="none"
        stroke={visual.border}
        strokeWidth={1.5}
        opacity={0.55}
        className="motion-safe:animate-token-pop motion-reduce:opacity-0"
      />
    </g>
  );
}

function RoomRevealFx({ point, reducedMotion }: { point: Point; reducedMotion: boolean }) {
  // Скан-пинг по туману: двойное радарное кольцо + вспышка центра.
  // Комната ещё под туманом — имя и иконки появятся позже, на перевороте.
  return (
    <g transform={`translate(${point.x}, ${point.y})`} className="pointer-events-none" aria-label="Сканирование отсека">
      <circle
        r={48}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={2.5}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-door-shockwave motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <circle
        r={40}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={1.2}
        strokeOpacity={0.6}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-noise-ripple motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: '260ms' } as React.CSSProperties}
      />
      <circle
        r={8}
        fill="#00f0ff"
        opacity={0.9}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-token-pop'}
      />
    </g>
  );
}

function NoisePopFx({ point, reducedMotion }: { point: Point; reducedMotion: boolean }) {
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      className="pointer-events-none"
      aria-label="Маркер Шума установлен"
    >
      {[20, 28, 36].map((waveRadius, index) => (
        <circle
          key={waveRadius}
          r={waveRadius}
          fill="none"
          stroke="#ff5500"
          strokeWidth={2}
          strokeOpacity={0.8 - index * 0.22}
          className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-vent-alarm motion-reduce:opacity-0'}
          style={{ animationDelay: `${index * 140}ms` } as React.CSSProperties}
        />
      ))}
      <circle
        r={18}
        fill="none"
        stroke="#ffaa00"
        strokeWidth={2.5}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-noise-ripple motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <g
        className={reducedMotion ? '' : 'motion-safe:animate-token-pop motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
      >
        <circle r={11} fill="#ff5500" stroke="#05070c" strokeWidth={1.5} opacity={0.95} />
        <circle r={8.5} fill="#ff5500" stroke="#ffaa00" strokeWidth={1.5} />
      </g>
    </g>
  );
}

function NoiseRollFlashFx({
  point,
  face,
  reducedMotion,
}: {
  point: Point;
  face: NoiseDieFace;
  reducedMotion: boolean;
}) {
  const isDanger = face.kind === 'DANGER';
  const isSilence = face.kind === 'SILENCE';
  const color = isDanger ? '#ff003c' : isSilence ? '#94a3b8' : '#ffb700';
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      className="pointer-events-none"
      aria-label={`Бросок Шума: ${face.kind}`}
    >
      <circle
        r={24}
        fill="none"
        stroke={color}
        strokeWidth={3}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-noise-flash motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <circle
        r={14}
        fill={color}
        opacity={0.22}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-token-pop motion-reduce:opacity-0'}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        className="font-mono font-bold fill-white pointer-events-none"
        style={{ fontSize: '10px' }}
      >
        {face.kind === 'CORRIDOR' ? String(face.number) : face.kind === 'DANGER' ? '!' : '—'}
      </text>
    </g>
  );
}

function ContactTeaseFx({ point, reducedMotion }: { point: Point; reducedMotion: boolean }) {
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      className="pointer-events-none"
      aria-label="Контакт! Дубликат Шума"
    >
      <circle
        r={52}
        fill="none"
        stroke="#ff003c"
        strokeWidth={3}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-door-shockwave motion-reduce:animate-none'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <circle
        r={36}
        fill="none"
        stroke="#ff003c"
        strokeWidth={2}
        strokeOpacity={0.6}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-noise-ripple motion-reduce:animate-none'}
      />
      <circle
        r={10}
        fill="#ff003c"
        opacity={0.85}
        className={reducedMotion ? 'opacity-0' : 'motion-safe:animate-token-pop'}
      />
    </g>
  );
}

/**
 * Слой интерполяции поверх статических гексов (Шаг 9 этапа 0.5.0 + Этап 2 + Этап C):
 * фишки скользят, вскрытие тайлов и жетоны Исследования получают кинематографику,
 * Шум — pop + ripple + вспышка броска, дубликат — контакт-тизер.
 */
export const BoardAnimationLayer: React.FC<BoardAnimationLayerProps> = ({ view, animations, reducedMotion }) => {
  const roomCoords = React.useMemo(() => {
    const map = new Map<number, Point>();
    for (const node of SHIP_ROOM_NODES) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, []);

  const corridorMidpoints = React.useMemo(() => {
    const map = new Map<string, Point>();
    for (const corridor of Object.values(view.ship.corridors)) {
      const from = roomCoords.get(corridor.fromRoomId);
      const to = roomCoords.get(corridor.toRoomId);
      if (!from || !to) continue;
      map.set(corridor.id, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
    }
    return map;
  }, [view, roomCoords]);

  if (animations.length === 0) return null;

  return (
    <g id="board-animation-layer" className="pointer-events-none">
      {animations.map((animation) => {
        if (animation.kind === 'DOOR_BREACHED') {
          const midpoint = corridorMidpoints.get(animation.corridorId);
          if (!midpoint) return null;
          return <DoorBreachFx key={animation.key} point={midpoint} />;
        }

        if (animation.kind === 'NOISE_POP') {
          const point = animation.isTechnical
            ? { x: TECH_HUB.x, y: TECH_HUB.y }
            : animation.corridorId
              ? corridorMidpoints.get(animation.corridorId)
              : null;
          if (!point) return null;
          return <NoisePopFx key={animation.key} point={point} reducedMotion={reducedMotion} />;
        }

        if (animation.kind === 'NOISE_ROLL') {
          const point = animation.corridorId
            ? corridorMidpoints.get(animation.corridorId)
            : animation.isTechnical
              ? { x: TECH_HUB.x, y: TECH_HUB.y }
              : roomCoords.get(animation.roomId);
          if (!point) return null;
          return (
            <NoiseRollFlashFx key={animation.key} point={point} face={animation.face} reducedMotion={reducedMotion} />
          );
        }

        if (animation.kind === 'CONTACT_TEASE') {
          const point = roomCoords.get(animation.roomId);
          if (!point) return null;
          return <ContactTeaseFx key={animation.key} point={point} reducedMotion={reducedMotion} />;
        }

        if (animation.kind === 'PLAYER_MOVE') {
          const from = roomCoords.get(animation.fromRoomId);
          const to = roomCoords.get(animation.toRoomId);
          const token = toCrewToken(view, animation.playerId);
          if (!from || !to || !token) return null;
          return (
            <GlideToken
              key={animation.key}
              from={{ x: from.x, y: from.y + ROOM_STRIP_OFFSET_Y }}
              to={{ x: to.x, y: to.y + ROOM_STRIP_OFFSET_Y }}
              reducedMotion={reducedMotion}
              ariaLabel={`Персонаж перемещается: ${crewTokenLabel(token)}`}
            >
              <CrewToken token={token} showActiveRing={false} />
            </GlideToken>
          );
        }

        if (animation.kind === 'INTRUDER_MOVE') {
          const from = roomCoords.get(animation.fromRoomId);
          const to = roomCoords.get(animation.toRoomId);
          if (!from || !to) return null;
          return (
            <GlideToken
              key={animation.key}
              from={from}
              to={to}
              reducedMotion={reducedMotion}
              ariaLabel="Чужой перемещается"
            >
              <IntruderFigure type={animation.intruderType} />
            </GlideToken>
          );
        }

        if (animation.kind === 'ROOM_REVEAL') {
          const point = roomCoords.get(animation.roomId);
          if (!point) return null;
          return <RoomRevealFx key={animation.key} point={point} reducedMotion={reducedMotion} />;
        }

        if (animation.kind === 'EXPLORATION_REVEAL') {
          const point = roomCoords.get(animation.roomId);
          if (!point) return null;
          const shifted = { x: point.x, y: point.y - 2 };
          return (
            <ExplorationRevealFx
              key={animation.key}
              point={shifted}
              effect={animation.effect}
              itemsCount={animation.itemsCount}
              reducedMotion={reducedMotion}
            />
          );
        }

        // INTRUDER_TO_TECH
        const from = roomCoords.get(animation.fromRoomId);
        if (!from) return null;
        return (
          <React.Fragment key={animation.key}>
            <GlideToken
              from={from}
              to={{ x: TECH_HUB.x, y: TECH_HUB.y }}
              reducedMotion={reducedMotion}
              fadeAfterArrival
              ariaLabel="Чужой уходит в Технические Коридоры"
            >
              <IntruderFigure type={animation.intruderType} />
            </GlideToken>
            <VentHubRipple animationKey={animation.key} />
          </React.Fragment>
        );
      })}
    </g>
  );
};
