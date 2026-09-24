import React from 'react';
import { AlertCircle } from 'lucide-react';

interface HandConfirmModalsProps {
  showPassConfirm: boolean;
  onCancelPass: () => void;
  onConfirmPass: () => void;
  handCardsCount: number;
  convertedCount: number;
}

/**
 * Подтверждение Паса при остатках на руке (розыгрыш карт уведён в CardUseModal).
 */
export const HandConfirmModals: React.FC<HandConfirmModalsProps> = ({
  showPassConfirm,
  onCancelPass,
  onConfirmPass,
  handCardsCount,
  convertedCount,
}) => {
  return (
    <>
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
