import React from 'react';
import { Check, Copy } from 'lucide-react';

import { shortSeed } from '../../utils/seed';

/** Сколько держится подтверждение копирования. */
const COPIED_FEEDBACK_MS = 1500;

interface SeedChipProps {
  /** Мастер-сид партии: полное значение копируется, короткое показывается. */
  seed: string;
}

/**
 * Сид партии в HUD.
 *
 * Сид виден игрокам по замыслу (аудит §4, P1-1): по нему воспроизводится тот же
 * стол, а в отчёте об ошибке достаточно одной строки. Это не скрытая информация
 * движка — скрыты двигатели, Координаты и чужие тайны (санитайзер).
 */
export const SeedChip: React.FC<SeedChipProps> = ({ seed }) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copySeed = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(seed);
      setCopied(true);
    } catch {
      // Буфер обмена недоступен (нет разрешения или страница без защищённого
      // соединения) — игрок видит полный сид в подсказке и может переписать его.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copySeed()}
      className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800 hover:border-cyan-700 transition"
      title={`Сид партии: ${seed}\nНажмите, чтобы скопировать`}
      aria-label={`Скопировать сид партии ${seed}`}
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-cyan-400" />}
      <span className="text-xs font-mono text-slate-300">
        {copied ? 'СИД СКОПИРОВАН' : 'СИД'} <b className="text-white">{shortSeed(seed)}</b>
      </span>
    </button>
  );
};
