import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { lastCommsSequence } from './commsFeedModel';
import { BUBBLE_LIFETIME_MS, mapBubbles, type MapBubble } from './speechBubbleModel';

const Bubble: React.FC<{ bubble: MapBubble }> = ({ bubble }) => (
  <g transform={`translate(${bubble.x}, ${bubble.y})`} role="note" aria-label={bubble.text}>
    <g
      className="motion-safe:animate-bubble-life"
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
    >
      <rect
        x={-bubble.width / 2}
        y={-30}
        width={bubble.width}
        height={32}
        rx={13}
        fill="rgba(2,6,23,0.92)"
        stroke={bubble.color}
        strokeWidth={1.5}
      />
      <path d="M -8 2 L 0 12 L 8 2 Z" fill="rgba(2,6,23,0.92)" stroke={bubble.color} strokeWidth={1.5} />
      <rect x={-9} y={-1} width={18} height={4} fill="rgba(2,6,23,0.92)" />
      <text textAnchor="middle" y={-9} className="fill-slate-100 text-[15px] font-semibold">
        {bubble.text}
      </text>
    </g>
  </g>
);

export const SpeechBubbleLayer: React.FC<{
  view: SanitizedGameState;
  coords: ReadonlyMap<number, { x: number; y: number }>;
}> = ({ view, coords }) => {
  const [baseline] = React.useState(() => lastCommsSequence(view));
  const [expired, setExpired] = React.useState<ReadonlySet<string>>(() => new Set());
  const timers = React.useRef(new Map<string, number>());
  const fresh = view.comms.messages.filter((message) => message.sequence > baseline && !expired.has(message.id));

  React.useEffect(() => {
    for (const message of fresh) {
      if (timers.current.has(message.id)) continue;
      const timer = window.setTimeout(
        () => setExpired((current) => new Set([...current, message.id])),
        BUBBLE_LIFETIME_MS,
      );
      timers.current.set(message.id, timer);
    }
  }, [fresh]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const bubbles = mapBubbles(view, fresh, coords);
  if (bubbles.length === 0) return null;
  return (
    <g id="speech-bubbles-layer" className="pointer-events-none">
      {bubbles.map((bubble) => (
        <Bubble key={bubble.id} bubble={bubble} />
      ))}
    </g>
  );
};
