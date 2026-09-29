import React from 'react';
import { DoorOpen, Hourglass, Rocket, UserRound } from 'lucide-react';
import { podCommandsFor, type EscapePodCommand, type SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useGameStore } from '../../store/gameStore';
import { podViews } from './evacuationModel';

type ConsoleOption = { id: string; label: string; hint: string; Icon: typeof Rocket; tone: 'launch' | 'neutral' };

const COMMAND_OPTIONS: Record<EscapePodCommand, ConsoleOption> = {
  LAUNCH: {
    id: 'LAUNCH',
    label: 'Запустить Капсулу',
    hint: 'Покинуть корабль вместе со всеми в Капсуле.',
    Icon: Rocket,
    tone: 'launch',
  },
  EXIT: {
    id: 'EXIT',
    label: 'Выйти из Капсулы',
    hint: 'Без затраты Действия: вернуться в Спасательный отсек и продолжить ход.',
    Icon: DoorOpen,
    tone: 'neutral',
  },
  STAY: {
    id: 'STAY',
    label: 'Ждать дальше',
    hint: 'Остаться в Капсуле — это автоматический Пас в этом раунде.',
    Icon: Hourglass,
    tone: 'neutral',
  },
};

const DECISION_OPTIONS: ConsoleOption[] = [
  { id: 'LAUNCH', label: 'Запустить немедленно', hint: 'Покинуть корабль прямо сейчас.', Icon: Rocket, tone: 'launch' },
  {
    id: 'WAIT',
    label: 'Ждать напарника',
    hint: 'Запуск — в начале вашего хода в следующих раундах. Чужой в отсеке выбросит вас из Капсулы.',
    Icon: Hourglass,
    tone: 'neutral',
  },
];

function PodConsoleDialog({
  view,
  podId,
  options,
  onPick,
}: {
  view: SanitizedGameState;
  podId: string;
  options: ConsoleOption[];
  onPick: (id: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, {});
  const entry = podViews(view).find((candidate) => candidate.pod.id === podId);
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pod-console-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-950 shadow-[0_0_60px_rgba(251,191,36,0.18)] motion-safe:animate-modal-enter"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_60%)]"
          aria-hidden="true"
        />
        <header className="relative border-b border-amber-900/50 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">Пульт Спасательной Капсулы</p>
          <h2 id="pod-console-title" className="font-heading text-2xl tracking-[0.14em] text-white">
            КАПСУЛА №{entry?.pod.number ?? '?'} · ОТСЕК {entry?.pod.section ?? '?'}
          </h2>
          <div className="mt-2 flex gap-1.5">
            {[0, 1].map((seat) => (
              <span
                key={seat}
                className={`flex flex-1 items-center gap-1 rounded border px-2 py-1 text-[11px] ${
                  entry?.occupants[seat]
                    ? 'border-amber-500/70 bg-amber-950/40 text-amber-100'
                    : 'border-dashed border-slate-700 text-slate-500'
                }`}
              >
                <UserRound size={12} aria-hidden="true" /> {entry?.occupants[seat] ?? 'Свободное место'}
              </span>
            ))}
          </div>
        </header>
        <div className="relative flex flex-col gap-2 p-5">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onPick(option.id)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                option.tone === 'launch'
                  ? 'border-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
            >
              <option.Icon
                size={20}
                className={option.tone === 'launch' ? 'mt-0.5 text-amber-300' : 'mt-0.5 text-slate-400'}
                aria-hidden="true"
              />
              <span>
                <span className="block text-sm font-bold text-white">{option.label}</span>
                <span className="block text-xs leading-snug text-slate-400">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const EscapePodConsole: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const decision = view.pendingDecision;
  if (decision?.type === 'ESCAPE_POD_LAUNCH_CHOICE') {
    return (
      <PodConsoleDialog
        view={view}
        podId={decision.podId}
        options={DECISION_OPTIONS}
        onPick={(selectedOption) =>
          dispatch({ type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: decision.id, selectedOption } })
        }
      />
    );
  }
  const player = view.players[view.viewerId];
  if (decision || view.meta.phase !== 'PLAYER_PHASE' || !player?.boardedPodId || player.hasPassed) return null;
  const commands = podCommandsFor(view, player);
  return (
    <PodConsoleDialog
      view={view}
      podId={player.boardedPodId}
      options={commands.map((command) => COMMAND_OPTIONS[command])}
      onPick={(command) => dispatch({ type: 'ACTION_ESCAPE_POD', payload: { command: command as EscapePodCommand } })}
    />
  );
};
