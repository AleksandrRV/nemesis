import React from 'react';
import type { BotDifficulty } from '@nemesis/shared';
import { BOT_DIFFICULTIES } from '@nemesis/shared';
import { BarChart3, Bot, Dices, FileText, Play, UserRound } from 'lucide-react';
import { BOT_DIFFICULTY_HINTS, BOT_DIFFICULTY_LABELS, isSeedValid } from '../lobby/lobbyModel';
import { SERIES_SIZE } from '../../services/simulation/simulationJobs';
import { BOT_COUNTS, type SimulationConfig, type SimulationMode } from './simulationModel';

interface SimulationSetupProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onRerollSeed: () => void;
  onStart: () => void;
}

const MODES: { mode: SimulationMode; title: string; hint: string; icon: typeof FileText }[] = [
  {
    mode: 'SINGLE',
    title: 'Одна партия',
    hint: 'Подробный отчёт: экипаж и характеры, мораль по раундам, доверие, хроника и эфир Рации.',
    icon: FileText,
  },
  {
    mode: 'SERIES',
    title: `${SERIES_SIZE} партий`,
    hint: 'Статистика и инфографика: выживаемость, причины гибели, длина партий, черты, ложь и обещания.',
    icon: BarChart3,
  },
];

const radioClass = (selected: boolean) =>
  `rounded-xl border-2 transition ${
    selected
      ? 'border-violet-400 bg-violet-950/50 shadow-[0_0_20px_rgba(167,139,250,0.25)]'
      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
  }`;

export const SimulationSetup: React.FC<SimulationSetupProps> = ({ config, onChange, onRerollSeed, onStart }) => {
  const seedValid = isSeedValid(config.seed);
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Что прогнать</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Вид симуляции">
          {MODES.map(({ mode, title, hint, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={config.mode === mode}
              onClick={() => onChange({ ...config, mode })}
              className={`flex flex-col gap-1 p-4 text-left ${radioClass(config.mode === mode)}`}
            >
              <span className="flex items-center gap-2 font-heading text-base uppercase tracking-widest text-white">
                <Icon size={16} aria-hidden="true" className="text-violet-300" />
                {title}
              </span>
              <span className="text-[11px] leading-snug text-slate-400">{hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Ботов за столом</legend>
        <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Число ботов">
          {BOT_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={count === config.botCount}
              onClick={() => onChange({ ...config, botCount: count })}
              className={`flex h-16 w-16 flex-col items-center justify-center ${radioClass(count === config.botCount)}`}
            >
              <span className="font-heading text-2xl leading-none text-white">{count}</span>
              <span className="mt-1 flex gap-0.5" aria-hidden="true">
                {Array.from({ length: count }, (_, index) => (
                  <Bot
                    key={index}
                    size={8}
                    className={count === config.botCount ? 'text-violet-300' : 'text-slate-600'}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-300">
          <UserRound size={13} aria-hidden="true" className="text-violet-300" />
          {config.botCount === 1
            ? 'Соло: один бот против корабля, Цели из колоды Соло/Кооперативных Целей.'
            : 'Полукооператив: у каждого бота тайные Корпоративная и Личная Цели.'}
        </p>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Сложность ботов</legend>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Сложность ботов в симуляции">
          {BOT_DIFFICULTIES.map((difficulty: BotDifficulty) => (
            <button
              key={difficulty}
              type="button"
              role="radio"
              aria-checked={difficulty === config.difficulty}
              onClick={() => onChange({ ...config, difficulty })}
              className={`flex flex-col gap-1 p-3 text-left ${radioClass(difficulty === config.difficulty)}`}
            >
              <span className="font-heading text-sm uppercase tracking-widest text-white">
                {BOT_DIFFICULTY_LABELS[difficulty]}
              </span>
              <span className="text-[11px] leading-snug text-slate-400">{BOT_DIFFICULTY_HINTS[difficulty]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Сид</legend>
        <div className="flex gap-2">
          <input
            value={config.seed}
            onChange={(event) => onChange({ ...config, seed: event.target.value })}
            aria-label="Сид симуляции"
            aria-invalid={!seedValid}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none transition focus:border-violet-400"
          />
          <button
            type="button"
            onClick={onRerollSeed}
            title="Новый случайный сид"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 text-violet-300 transition hover:rotate-12 hover:bg-slate-800"
          >
            <Dices size={18} aria-hidden="true" />
            <span className="sr-only">Новый случайный сид</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {config.mode === 'SERIES'
            ? `Партии серии получают сиды «${config.seed.trim() || '…'}#1» … «#${SERIES_SIZE}»: любую из них можно открыть подробно.`
            : 'Тот же сид, число ботов и сложность дают ту же партию.'}
        </p>
      </fieldset>

      <button
        type="button"
        disabled={!seedValid}
        onClick={onStart}
        className="mx-auto flex items-center gap-2 rounded-xl bg-violet-500 px-10 py-3 font-heading text-sm uppercase tracking-[0.3em] text-slate-950 shadow-[0_0_30px_rgba(167,139,250,0.35)] transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        <Play size={16} aria-hidden="true" /> Запустить
      </button>
    </div>
  );
};
