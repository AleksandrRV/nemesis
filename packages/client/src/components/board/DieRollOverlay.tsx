import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePrefersReducedMotion } from './useBoardAnimations';
import type { NoiseDieFace } from '@nemesis/shared';

interface DieRollEntry {
  sequence: number;
  roomId: number;
  result: NoiseDieFace;
  playerName: string;
}

const FACE_LABELS: Record<string, { label: string; sub: string; color: string; border: string }> = {
  '1': { label: '1', sub: 'КОРИДОР', color: 'text-cyan-200', border: 'border-cyan-400/70' },
  '2': { label: '2', sub: 'КОРИДОР', color: 'text-cyan-200', border: 'border-cyan-400/70' },
  '3': { label: '3', sub: 'КОРИДОР', color: 'text-cyan-200', border: 'border-cyan-400/70' },
  '4': { label: '4', sub: 'КОРИДОР', color: 'text-cyan-200', border: 'border-cyan-400/70' },
  SILENCE: { label: 'ТИШИНА', sub: 'ШУМ ОТМЕНЁН', color: 'text-slate-200', border: 'border-slate-500/70' },
  DANGER: { label: 'ОПАСНОСТЬ', sub: 'ПРИТЯЖЕНИЕ ЧУЖИХ', color: 'text-red-300', border: 'border-red-500/70' },
};

function faceKey(face: NoiseDieFace): string {
  if (face.kind === 'CORRIDOR') return String(face.number);
  return face.kind;
}

/**
 * Центр экрана — бросок d10 Шума (приоритет 0 — хоррор).
 * При NOISE_ROLL_INTERRUPT (фактически при появлении NOISE_ROLLED в логе)
 * показывает грань 1/2/3/4/SILENCE/DANGER с animate-die-roll 900ms.
 * Результат дублируется в GameLogPanel (noiseLabel) и вспышкой на коридоре.
 */
export const DieRollOverlay: React.FC = () => {
  const view = useGameStore((s) => s.view);
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = React.useState<DieRollEntry | null>(null);
  const lastSeenRef = React.useRef<number>(-1);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!view?.gameLog) return;
    const log = view.gameLog;
    // Находим последний NOISE_ROLLED
    for (let i = log.length - 1; i >= 0; i--) {
      const entry = log[i]!;
      if (entry.event.type === 'NOISE_ROLLED') {
        if (entry.sequence <= lastSeenRef.current) break;
        lastSeenRef.current = entry.sequence;
        const playerName = view.players[entry.event.playerId]?.name ?? entry.event.playerId;
        const next: DieRollEntry = {
          sequence: entry.sequence,
          roomId: entry.event.roomId,
          result: entry.event.result,
          playerName,
        };
        setActive(next);
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setActive(null), 2400);
        break;
      }
    }
  }, [view]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!active) return null;

  const key = faceKey(active.result);
  const visual = FACE_LABELS[key] ?? FACE_LABELS['SILENCE']!;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      {/* Затемнение фона */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] motion-reduce:bg-black/70" />

      <div
        className={`relative flex flex-col items-center gap-3 rounded-[20px] border-2 bg-slate-950 px-8 py-6 shadow-2xl ${visual.border} ${reducedMotion ? '' : 'motion-safe:animate-die-roll motion-reduce:animate-none'}`}
      >
        {/* Заголовок */}
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
            Кубик Шума • Отсек #{String(active.roomId).padStart(3, '0')} • {active.playerName}
          </div>
        </div>

        {/* Грань */}
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-2xl border bg-slate-900 text-center font-mono text-2xl font-bold leading-tight ${visual.color} ${visual.border}`}
        >
          <span className="px-2 text-center text-[22px] leading-[1.1] tracking-wide">
            {visual.label}
            <br />
            <span className="text-[10px] font-bold tracking-widest opacity-80">{visual.sub}</span>
          </span>
        </div>

        {/* Подпись */}
        <div className="text-center font-mono text-[11px] uppercase tracking-wider text-slate-400">
          Результат → журнал • вспышка на коридоре
        </div>
      </div>
    </div>
  );
};
