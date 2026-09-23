import type { CorridorNumber } from '@nemesis/shared';
import type { CarefulMoveChosenCorridor } from '@nemesis/shared';

export interface CorridorChoice {
  number: CorridorNumber;
  isFree: boolean;
  count: number;
}

interface CarefulMovePanelProps {
  choices: CorridorChoice[];
  hasFreeTechnical: boolean;
  onChoose: (chosen: CarefulMoveChosenCorridor) => void;
  onCancel: () => void;
  onHoverNumber?: (num: CorridorNumber | null) => void;
  onHoverTechnical?: (hovered: boolean) => void;
}

/** Панель выбора Коридора для «Осторожного движения» — маркер Шума в выбранный Коридор (стр. 13). */
export function CarefulMovePanel({
  choices,
  hasFreeTechnical,
  onChoose,
  onCancel,
  onHoverNumber,
  onHoverTechnical,
}: CarefulMovePanelProps) {
  return (
    <div className="p-3 bg-slate-900 border border-amber-500/50 rounded-lg mb-2 space-y-2">
      <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
        <span>Выберите номер коридора для шума:</span>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">
          Отмена
        </button>
      </div>
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {choices.map((entry) => (
          <button
            key={entry.number}
            type="button"
            disabled={!entry.isFree}
            onClick={() => onChoose({ kind: 'CORRIDOR_NUMBER', corridorNumber: entry.number })}
            onMouseEnter={() => onHoverNumber?.(entry.number)}
            onMouseLeave={() => onHoverNumber?.(null)}
            onFocus={() => onHoverNumber?.(entry.number)}
            onBlur={() => onHoverNumber?.(null)}
            className={`w-full text-left px-2.5 py-1.5 rounded border text-xs flex justify-between items-center transition ${
              entry.isFree
                ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <span>
              Коридор #{entry.number} {entry.count > 1 ? `(${entry.count} коридора)` : ''}
            </span>
            <span className={`text-[10px] ${entry.isFree ? 'text-emerald-400' : 'text-rose-500'}`}>
              {entry.isFree ? 'Свободен' : 'Шум уже есть'}
            </span>
          </button>
        ))}
        {hasFreeTechnical && (
          <button
            type="button"
            onClick={() => onChoose({ kind: 'TECHNICAL_CORRIDOR' })}
            onMouseEnter={() => onHoverTechnical?.(true)}
            onMouseLeave={() => onHoverTechnical?.(false)}
            onFocus={() => onHoverTechnical?.(true)}
            onBlur={() => onHoverTechnical?.(false)}
            className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 flex justify-between items-center"
          >
            <span>Технический коридор (вентиляция)</span>
            <span className="text-[10px] text-emerald-400">Свободен</span>
          </button>
        )}
        {choices.every((entry) => !entry.isFree) && !hasFreeTechnical && (
          <div className="text-xs text-rose-400 py-1">Нет свободных номеров коридоров для шума</div>
        )}
      </div>
    </div>
  );
}
