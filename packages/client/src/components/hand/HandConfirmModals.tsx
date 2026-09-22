import React from 'react';
import { AlertCircle, Check, Play, X, Zap } from 'lucide-react';
import type { ActionCard } from '@nemesis/shared';

interface HandConfirmModalsProps {
  /** Карта, ожидающая подтверждения розыгрыша (null — модал закрыт). */
  pendingPlayCard: ActionCard | null;
  onCancelPlay: () => void;
  onConfirmPlay: (card: ActionCard) => void;
  showPassConfirm: boolean;
  onCancelPass: () => void;
  onConfirmPass: () => void;
  handCardsCount: number;
  convertedCount: number;
}

/**
 * Подтверждающие модалы нижней панели руки: розыгрыш карты Действия
 * (вместо системного alert) и подтверждение Паса при остатках на руке.
 */
export const HandConfirmModals: React.FC<HandConfirmModalsProps> = ({
  pendingPlayCard,
  onCancelPlay,
  onConfirmPlay,
  showPassConfirm,
  onCancelPass,
  onConfirmPass,
  handCardsCount,
  convertedCount,
}) => {
  return (
    <>
      {/* Панель подтверждения разыгрывания действия карты (без системного alert) */}
      {pendingPlayCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Play size={18} fill="currentColor" />
                <h3 className="text-base font-heading tracking-wider text-white uppercase">
                  Действие: «{pendingPlayCard.name}»
                </h3>
              </div>
              <button type="button" onClick={onCancelPlay} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Эффект карты:
              </span>
              {pendingPlayCard.description}
            </div>

            {pendingPlayCard.playCost > 0 && (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 p-2.5 rounded-lg flex items-center gap-2">
                <Zap size={14} className="shrink-0" />
                <span>
                  Для розыгрыша требуется сбросить <b>{pendingPlayCard.playCost}</b> карт(ы) / очков действия.
                </span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCancelPlay}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => onConfirmPlay(pendingPlayCard)}
                className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
              >
                <Check size={14} /> Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения Паса */}
      {showPassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-red-600/60 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 border-b border-slate-800 pb-3">
              <AlertCircle size={20} />
              <h3 className="text-lg font-heading tracking-wider text-white">ПОДТВЕРЖДЕНИЕ ПАСА</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              У вас ещё остались карты на руке ({handCardsCount}) или неиспользованные очки действия ({convertedCount}).
              Вы уверены, что хотите завершить участие в текущем раунде?
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancelPass}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirmPass}
                className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase transition"
              >
                Спасовать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
