import React from 'react';
import { Skull } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { hasUnseenBoardChanges } from './boardSeenState';
import { boardChangeKey, buildIntruderBoardModel } from './intruderBoardModel';

interface IntruderBoardButtonProps {
  view: SanitizedGameState;
  /** Окно планшета открыто — точка гаснет, снапшот «прочитанного» обновляется. */
  open: boolean;
  onOpen: () => void;
}

/**
 * Кнопка «Чужие» в верхнем HUD (Шаг 3 плана `doc/intruder-board-ui.md`):
 * живой бейдж — сколько миниатюр сейчас на борту, янтарная точка — улей
 * изменился с прошлого просмотра (мешок, кладка, раны, колода Атак).
 * Точка и снапшот — локальное состояние сессии: F5 всегда даёт спокойную
 * кнопку, история презентации не затрагивается.
 */
export const IntruderBoardButton: React.FC<IntruderBoardButtonProps> = ({ view, open, onOpen }) => {
  const model = React.useMemo(() => buildIntruderBoardModel(view), [view]);
  const changeKey = boardChangeKey(model);

  const [seenKey, setSeenKey] = React.useState(changeKey);
  if (open && seenKey !== changeKey) setSeenKey(changeKey);
  const hasUnseenChanges = hasUnseenBoardChanges(changeKey, seenKey, open);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative flex items-center gap-2 px-3 py-1 rounded border transition ${
        open
          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
          : 'bg-slate-900 border-emerald-800/60 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200'
      }`}
      title="Планшет Чужих: мешок, кладка, колода Атак, позиции на борту"
      aria-label={`Планшет Чужих. На борту: ${model.boardTotal}. ${hasUnseenChanges ? 'Есть изменения.' : ''}`}
      aria-haspopup="dialog"
    >
      <Skull size={14} />
      <span className="text-xs font-mono">
        ЧУЖИЕ <b className="text-white">{model.boardTotal}</b>
      </span>
      {hasUnseenChanges && (
        <span
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"
          title="Улей изменился с прошлого просмотра"
        />
      )}
    </button>
  );
};
