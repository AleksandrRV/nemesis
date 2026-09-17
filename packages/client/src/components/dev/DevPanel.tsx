import React from 'react';
import { TIME_TRACK_LENGTH } from '@nemesis/shared';
import { Bug, Copy, Dices, Volume2, VolumeX, X } from 'lucide-react';

import { useGameStore } from '../../store/gameStore';
import { GAME_MODE_LABELS, PHASE_LABELS } from '../../utils/labels';
import { IS_DEV } from '../../utils/env';
import { DOOR_CYCLE_HINT, buildCorridorRows, buildDiagnostics } from './devPanelModel';

interface DevPanelProps {
  onClose: () => void;
}

/** Строка диагностики: подпись и значение. */
const DiagnosticRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-slate-200 text-right">{children}</dd>
  </>
);

/**
 * Dev-панель: инструменты разработки, которых не должно быть в игровом интерфейсе
 * Панель — инструмент разработки, а не часть игры: в продакшн-сборке её нет.
 *
 * Панель существует только в dev-сборке (`IS_DEV`): в продакшн-сборке
 * `import.meta.env.DEV` равен false, панель не отрисовывается, а движок к тому же
 * отклонит отладочные действия — защиты две и они независимы.
 *
 * Показывает и меняет панель только то, что уже прошло фильтр скрытой информации:
 * это инструмент разработки, а не лазейка к данным партии.
 */
export const DevPanel: React.FC<DevPanelProps> = ({ onClose }) => {
  const view = useGameStore((state) => state.view);
  const dispatch = useGameStore((state) => state.dispatch);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const [seed, setSeed] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  if (!IS_DEV || !view) return null;

  const rows = buildCorridorRows(view);
  const diagnostics = buildDiagnostics(view);
  const doors = `${diagnostics.doors.open} / ${diagnostics.doors.closed} / ${diagnostics.doors.destroyed}`;

  const copySeed = (): void => {
    void navigator.clipboard
      ?.writeText(diagnostics.seed)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };

  return (
    <aside
      aria-label="Инструменты разработки"
      className="absolute left-4 bottom-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)] max-h-[70vh] flex flex-col bg-slate-950/95 backdrop-blur border border-cyan-900/60 rounded-xl shadow-2xl font-mono text-[11px]"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cyan-900/60">
        <span className="flex items-center gap-2 text-cyan-300 font-bold tracking-wider">
          <Bug size={14} /> DEV-ПАНЕЛЬ
        </span>
        <span className="text-slate-500">только dev-сборка</span>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          title="Закрыть dev-панель"
        >
          <X size={14} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Диагностика партии */}
        <section>
          <h3 className="text-cyan-400 uppercase tracking-wider mb-1.5">Партия</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <DiagnosticRow label="сид">{diagnostics.seed}</DiagnosticRow>
            <DiagnosticRow label="партия">{diagnostics.gameId}</DiagnosticRow>
            <DiagnosticRow label="схема">v{diagnostics.schemaVersion}</DiagnosticRow>
            <DiagnosticRow label="режим">{GAME_MODE_LABELS[diagnostics.gameMode]}</DiagnosticRow>
            <DiagnosticRow label="фаза">{PHASE_LABELS[diagnostics.phase]}</DiagnosticRow>
            <DiagnosticRow label="раунд">{diagnostics.round}</DiagnosticRow>
            <DiagnosticRow label="активный">
              {diagnostics.activePlayerName} ({diagnostics.activePlayerId})
            </DiagnosticRow>
            <DiagnosticRow label="время">
              {diagnostics.timeTrackPosition} / {TIME_TRACK_LENGTH}
            </DiagnosticRow>
          </dl>
          <button
            onClick={copySeed}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-800 hover:border-cyan-700 hover:text-cyan-300 text-slate-300"
          >
            <Copy size={12} /> {copied ? 'сид скопирован' : 'скопировать сид'}
          </button>
        </section>

        {/* Срез партии: видно, что фильтр скрытой информации действительно работает */}
        <section>
          <h3 className="text-cyan-400 uppercase tracking-wider mb-1.5">Срез состояния</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <DiagnosticRow label="отсеки">
              вскрыто {diagnostics.rooms - diagnostics.unexploredRooms} из {diagnostics.rooms}
            </DiagnosticRow>
            <DiagnosticRow label="коридоры">{diagnostics.corridors}</DiagnosticRow>
            <DiagnosticRow label="шум">{diagnostics.noiseMarkers}</DiagnosticRow>
            <DiagnosticRow label="двери (о/з/р)">{doors}</DiagnosticRow>
            <DiagnosticRow label="двигатели">{diagnostics.unknownEngines} неизвестно</DiagnosticRow>
            <DiagnosticRow label="координаты">{diagnostics.coordinatesHidden ? 'скрыты' : 'известны'}</DiagnosticRow>
            <DiagnosticRow label="чужие тайны">{diagnostics.hiddenSecrets} скрыто</DiagnosticRow>
          </dl>
        </section>

        {/* Новая партия с заданным сидом — для повторяемых проверок */}
        <section>
          <h3 className="text-cyan-400 uppercase tracking-wider mb-1.5">Новая партия</h3>
          <div className="flex gap-1.5">
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="сид"
              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-cyan-700 focus:outline-none"
            />
            <button
              onClick={() => startNewGame(seed.trim() || undefined)}
              className="px-2 py-1.5 rounded border border-slate-800 hover:border-cyan-700 hover:text-cyan-300 text-slate-300"
              title="Начать партию с этим сидом"
            >
              начать
            </button>
            <button
              onClick={() => {
                setSeed('');
                startNewGame();
              }}
              className="px-2 py-1.5 rounded border border-slate-800 hover:border-cyan-700 hover:text-cyan-300 text-slate-300"
              title="Начать партию со случайным сидом"
            >
              <Dices size={12} />
            </button>
          </div>
        </section>

        {/* Переключатели дверей и шума: в игровом интерфейсе их нет */}
        <section>
          <h3 className="text-cyan-400 uppercase tracking-wider mb-1.5">Коридоры</h3>
          <p className="text-slate-500 mb-2">цикл Двери: {DOOR_CYCLE_HINT}</p>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-1.5">
                <span className="w-14 shrink-0 text-slate-400">
                  {row.fromRoomId}–{row.toRoomId}
                </span>
                <button
                  onClick={() => dispatch({ type: 'DEV_TOGGLE_DOOR', payload: { corridorId: row.id } })}
                  className="flex-1 text-left px-2 py-1 rounded border border-slate-800 hover:border-cyan-700 hover:text-cyan-300 text-slate-300"
                  title={`Дверь ${row.doorLabel}: переключить в «${row.nextDoorLabel}»`}
                >
                  дверь: {row.doorLabel} → {row.nextDoorLabel}
                </button>
                <button
                  onClick={() => dispatch({ type: 'DEV_TOGGLE_NOISE', payload: { corridorId: row.id } })}
                  className={`px-2 py-1 rounded border text-left ${
                    row.hasNoise
                      ? 'border-orange-800 text-orange-300'
                      : 'border-slate-800 text-slate-400 hover:border-cyan-700 hover:text-cyan-300'
                  }`}
                  title={row.hasNoise ? 'Убрать маркер шума' : 'Положить маркер шума'}
                >
                  {row.hasNoise ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
};
