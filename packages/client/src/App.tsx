import React from 'react';
import { useGameStore } from './store/gameStore';
import { ShipMapSVG } from './components/board/ShipMapSVG';
import { RoomInspector } from './components/inspector/RoomInspector';
import { RotateCcw, Clock, Shield } from 'lucide-react';

export const App: React.FC = () => {
  const { gameState, initNewGame } = useGameStore();

  return (
    <div className="relative w-screen h-screen bg-nemesis-bg flex flex-col overflow-hidden">
      {/* Верхний HUD */}
      <header className="h-14 bg-nemesis-hull/90 border-b border-nemesis-border px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Shield size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading tracking-widest text-white leading-none">
              NEMESIS <span className="text-cyan-400 text-sm">DIGITAL v0.1.2</span>
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              РАУНД {gameState.meta.currentRound} • ФАЗА ИГРОКОВ
            </span>
          </div>
        </div>

        {/* Трек времени и кнопка рестарта */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-xs font-mono text-slate-300">
              ВРЕМЯ: <b className="text-white">{15 - gameState.meta.timeTrackPosition}</b>
            </span>
          </div>

          <button
            onClick={() => {
              if (confirm('Начать новую игру со случайным сидом?')) {
                initNewGame();
              }
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Новая игра"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* Основная зона карты */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <ShipMapSVG />
        <RoomInspector />
      </main>
    </div>
  );
};

export default App;
