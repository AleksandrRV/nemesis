import React from 'react';
import { SHIP_ROOM_NODES, type SanitizedGameState } from '@nemesis/shared';
import { User } from 'lucide-react';
import type { BoardAnimation } from './boardAnimationModel';
import { TECH_HUB, TECH_HUB_RADIUS } from './techCorridorModel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from './intruderShapes';

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

function PlayerChip() {
  return (
    <>
      <circle r={10} fill="#00f0ff" stroke="#05070c" strokeWidth={2} />
      <User size={12} className="text-slate-950" x={-6} y={-6} />
    </>
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
/** Углы искр взлома: шесть лучей вокруг точки удара. */
const SPARK_ANGLES = [8, 72, 140, 196, 262, 318] as const;

function DoorBreachFx({ point }: { point: Point }) {
  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      aria-label="Взлом Закрытой Двери"
      className="pointer-events-none"
    >
      {/* Ударная волна: кольцо, расходящееся от точки взлома. */}
      <circle
        r={26}
        fill="none"
        stroke="#ffb700"
        strokeWidth={2.5}
        className="motion-safe:animate-door-shockwave motion-reduce:animate-none"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      {/* Искры деформации металла: разлёт по лучам. */}
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
              animationDelay: `${(index % 3) * 90}ms`,
            }}
          />
        </g>
      ))}
      {/* Вспышка деформации переборки. */}
      <g
        className="motion-safe:animate-door-breach motion-reduce:animate-none"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
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
  );
}

/** Круги на «воде» узла вентиляции: Чужой растворился в Технических Коридорах. */
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

/**
 * Слой интерполяции поверх статических гексов (Шаг 9 этапа 0.5.0): фишки
 * Персонажей и фигурки Чужих скользят по траекториям Коридоров от центра
 * исходного отсека к центру целевого, затягиваются в маячок вентиляции,
 * разрушение Закрытых Дверей сопровождается вспышкой деформации металла.
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

        if (animation.kind === 'PLAYER_MOVE') {
          const from = roomCoords.get(animation.fromRoomId);
          const to = roomCoords.get(animation.toRoomId);
          if (!from || !to) return null;
          return (
            <GlideToken
              key={animation.key}
              from={from}
              to={to}
              reducedMotion={reducedMotion}
              ariaLabel="Персонаж перемещается"
            >
              <PlayerChip />
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

        // INTRUDER_TO_TECH: фигурка стягивается к узлу Технических Коридоров,
        // растворяется в нём, и узел расходится кругами по прибытии.
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
