import React from 'react';
import type { GameLogSegment, GameLogTone } from './gameLogModel';

const TONE_CLASSES: Record<GameLogTone, string> = {
  system: 'text-white',
  player: 'text-cyan-300 font-bold',
  room: 'text-sky-300 font-bold',
  corridor: 'text-violet-300 font-bold',
  noise: 'text-orange-300 font-bold',
  fire: 'text-orange-400 font-bold',
  malfunction: 'text-amber-300 font-bold',
  slime: 'text-lime-300 font-bold',
  danger: 'text-red-300 font-bold',
  silence: 'text-slate-100 font-bold',
  door: 'text-fuchsia-300 font-bold',
  success: 'text-emerald-300 font-bold',
  warning: 'text-yellow-300 font-bold',
  error: 'text-red-200 font-bold',
};

function segmentClass(segment: GameLogSegment): string {
  return `${segment.tone ? TONE_CLASSES[segment.tone] : 'text-white'} ${segment.strong ? 'font-bold' : ''}`;
}

export function LogSegments({ segments }: { segments: readonly GameLogSegment[] }): React.ReactElement {
  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={segmentClass(segment)}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

export function LogLine({ segments }: { segments: readonly GameLogSegment[] }): React.ReactElement {
  return (
    <p className="break-words text-xs leading-5 text-slate-200">
      <LogSegments segments={segments} />
    </p>
  );
}
