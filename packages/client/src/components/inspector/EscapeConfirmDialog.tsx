import { AlertTriangle } from 'lucide-react';

interface EscapeConfirmDialogProps {
  /** Подписи Чужих в отсеке — каждый проведёт Атаку при побеге (стр. 19). */
  intruderLabels: string[];
  onConfirm: () => void;
  onCancel: () => void;
  /** «Адреналин» в руке (Шаг 8): побег с добором карты Действия. */
  adrenalineAvailable?: boolean;
  onAdrenalineEscape?: () => void;
}

/**
 * Подтверждение Побега (стр. 19; Шаг 7): обычное Движение из отсека с Чужими
 * провоцирует внеочередные атаки в спину — перед шагом каждый Чужой отсека
 * атакует убегающего (порядок — от крупных к мелким, FAQ Rules 5).
 */
export function EscapeConfirmDialog({
  intruderLabels,
  onConfirm,
  onCancel,
  adrenalineAvailable = false,
  onAdrenalineEscape,
}: EscapeConfirmDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-label="Подтверждение побега"
      className="mt-2 rounded-lg border border-red-500/70 bg-red-950/70 p-3 text-xs text-slate-100 space-y-2"
    >
      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-300">
        <AlertTriangle size={15} aria-hidden="true" /> В отсеке находятся Чужие!
      </div>
      <p className="leading-snug">
        Попытка побега спровоцирует внеочередную атаку монстров в спину: перед шагом каждый Чужой в отсеке проведёт
        Атаку (стр. 19). Если персонаж погибнет, Труп останется в этом отсеке.
      </p>
      <p className="text-[10px] text-red-200/90">
        Атакуют: {intruderLabels.join(', ')}
        {intruderLabels.length > 1 ? ' — от крупного к мелкому (FAQ Rules 5)' : ''}.
      </p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded bg-red-600 px-2 py-1.5 font-bold text-white transition hover:bg-red-500 active:scale-95"
        >
          Бежать [цена: 1]
        </button>
        <button
          type="button"
          onClick={onCancel}
          autoFocus
          className="rounded bg-slate-800 px-2 py-1.5 font-bold text-slate-200 transition hover:bg-slate-700 active:scale-95"
        >
          Остаться
        </button>
      </div>
      {adrenalineAvailable && onAdrenalineEscape && (
        <button
          type="button"
          onClick={onAdrenalineEscape}
          className="w-full rounded bg-amber-700 px-2 py-1.5 font-bold text-amber-50 transition hover:bg-amber-600 active:scale-95"
        >
          Бежать с «Адреналином» [цена: 1, взять карту]
        </button>
      )}
    </div>
  );
}
