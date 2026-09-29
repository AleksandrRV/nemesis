import React from 'react';
import type { RoleSelectionMode } from '@nemesis/shared';
import { Dices, Shuffle, Swords, UserRound, Users } from 'lucide-react';
import {
  GAME_MODE_HINTS,
  GAME_MODE_LABELS,
  PLAYER_COUNTS,
  ROLE_SELECTION_HINTS,
  ROLE_SELECTION_LABELS,
  gameModeOf,
  isSeedValid,
  type LobbyConfig,
} from './lobbyModel';

interface LobbyScreenProps {
  config: LobbyConfig;
  onChange: (config: LobbyConfig) => void;
  onRerollSeed: () => void;
  onContinue: () => void;
}

const ROLE_MODES: readonly RoleSelectionMode[] = ['DRAFT', 'FREE'];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ config, onChange, onRerollSeed, onContinue }) => {
  const mode = gameModeOf(config.playerCount);
  const seedValid = isSeedValid(config.seed);
  return (
    <section
      aria-labelledby="lobby-title"
      className="flex w-full max-w-3xl flex-col gap-6 motion-safe:animate-lobby-rise"
    >
      <header className="text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-400">Подготовка миссии</span>
        <h2 id="lobby-title" className="mt-1 font-heading text-3xl tracking-[0.25em] text-white sm:text-4xl">
          ЛОББИ
        </h2>
      </header>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Экипаж</legend>
        <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Число игроков">
          {PLAYER_COUNTS.map((count) => {
            const selected = count === config.playerCount;
            return (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...config, playerCount: count })}
                className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 transition duration-200 ${
                  selected
                    ? 'scale-105 border-cyan-400 bg-cyan-950/60 text-white shadow-[0_0_24px_rgba(34,211,238,0.35)]'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span className="font-heading text-2xl leading-none">{count}</span>
                <span className="mt-1 flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: count }, (_, index) => (
                    <UserRound key={index} size={8} className={selected ? 'text-cyan-300' : 'text-slate-600'} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-slate-200">
          {mode === 'SOLO' ? (
            <Swords size={15} className="text-amber-300" aria-hidden="true" />
          ) : (
            <Users size={15} className="text-cyan-300" aria-hidden="true" />
          )}
          <b className="font-heading tracking-widest">{GAME_MODE_LABELS[mode]}</b>
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">{GAME_MODE_HINTS[mode]}</p>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Выбор Персонажей
        </legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Способ выбора Персонажей">
          {ROLE_MODES.map((roleMode) => {
            const selected = roleMode === config.roleSelection;
            return (
              <button
                key={roleMode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...config, roleSelection: roleMode })}
                className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition ${
                  selected
                    ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <span className="flex items-center gap-2 font-heading text-sm uppercase tracking-widest text-white">
                  {roleMode === 'DRAFT' ? (
                    <Shuffle size={14} aria-hidden="true" />
                  ) : (
                    <UserRound size={14} aria-hidden="true" />
                  )}
                  {ROLE_SELECTION_LABELS[roleMode]}
                  {roleMode === 'DRAFT' && (
                    <span className="rounded bg-cyan-900/70 px-1.5 py-0.5 text-[9px] tracking-wider text-cyan-200">
                      по умолчанию
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-snug text-slate-400">{ROLE_SELECTION_HINTS[roleMode]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Сид партии</legend>
        <div className="flex gap-2">
          <input
            value={config.seed}
            onChange={(event) => onChange({ ...config, seed: event.target.value })}
            aria-label="Сид партии"
            aria-invalid={!seedValid}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none transition focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={onRerollSeed}
            title="Новый случайный сид"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 text-cyan-300 transition hover:rotate-12 hover:bg-slate-800"
          >
            <Dices size={18} aria-hidden="true" />
            <span className="sr-only">Новый случайный сид</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Один сид — один и тот же стол: номера игроков, Цели, Драфт и весь корабль воспроизводятся.
        </p>
      </fieldset>

      <button
        type="button"
        disabled={!seedValid}
        onClick={onContinue}
        className="mx-auto rounded-xl bg-cyan-500 px-10 py-3 font-heading text-sm uppercase tracking-[0.3em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        Собрать экипаж
      </button>
    </section>
  );
};
