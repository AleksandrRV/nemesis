import React from 'react';
import { CheckCircle2, ScrollText, X, XCircle } from 'lucide-react';
import type { CardUseResult } from './cardUseResultModel';

/**
 * Обязательное окно результата использования карты: что изменилось на планшете
 * и корабле + новые записи журнала. Закрывается только кнопкой «Закрыть».
 * Состояние окна живёт в локальном состоянии панели — при F5 не воспроизводится.
 */

interface CardResultModalProps {
  result: CardUseResult;
  onClose: () => void;
}

export const CardResultModal: React.FC<CardResultModalProps> = ({ result, onClose }) => {
  const isError = Boolean(result.error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md bg-slate-900 border rounded-2xl p-5 shadow-2xl flex flex-col space-y-3 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
          isError ? 'border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.18)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-start gap-2">
            {isError ? (
              <XCircle size={22} className="text-red-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={22} className="text-emerald-400 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block">
                {isError ? 'Движок отклонил действие' : 'Карта использована'}
              </span>
              <h3 className="text-lg font-heading text-white tracking-wider">
                {result.title}
                {result.variantLabel && <span className="text-slate-400 font-normal"> — {result.variantLabel}</span>}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </header>

        {isError && (
          <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2.5 leading-relaxed">
            {result.error}
          </p>
        )}

        {result.lines.length > 0 && (
          <ul className="space-y-1.5">
            {result.lines.map((line, index) => (
              <li
                key={index}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  line.tone === 'good'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : line.tone === 'bad'
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                {line.text}
              </li>
            ))}
          </ul>
        )}

        {result.logLines.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ScrollText size={12} /> Журнал
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 space-y-1 max-h-44 overflow-y-auto">
              {result.logLines.map((line, index) => (
                <p key={index} className="text-[11px] text-slate-400 leading-snug">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {!isError && result.lines.length === 0 && result.logLines.length === 0 && (
          <p className="text-xs text-slate-400">Действие выполнено.</p>
        )}

        <footer className="pt-1 flex items-center justify-end border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-heading font-bold uppercase tracking-wider transition"
          >
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
};
