import type { SanitizedWeaknessSlotState } from '@nemesis/shared';

const OBJECT_KIND_LABELS: Record<SanitizedWeaknessSlotState['objectKind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

interface LaboratoryActionsProps {
  /** Типы объектов, чьи Слабости ещё под рубашкой (стр. 16, 21). */
  studyKinds: SanitizedWeaknessSlotState['objectKind'][];
  paymentReady: boolean;
  onStudy: (kind: SanitizedWeaknessSlotState['objectKind']) => void;
}

/** Лаборатория [2] «Изучите 1 объект» (стр. 16): объект на полу или в руках. */
export function LaboratoryActions({ studyKinds, paymentReady, onStudy }: LaboratoryActionsProps) {
  return (
    <div className="text-xs bg-cyan-950/30 border border-cyan-900/50 p-2 rounded space-y-1.5">
      <div className="font-semibold text-cyan-300">Лаборатория: изучение Слабости [2 карты]</div>
      {studyKinds.length === 0 ? (
        <p className="text-slate-400">
          Нет объекта для изучения или все доступные Слабости уже раскрыты (стр. 16, 21).
        </p>
      ) : (
        studyKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={!paymentReady}
            title={!paymentReady ? 'Выделите 2 карты цены на панели руки' : 'Изучить объект в Лаборатории'}
            onClick={() => onStudy(kind)}
            className={`w-full rounded px-2 py-1.5 font-semibold transition ${
              paymentReady
                ? 'bg-cyan-900/80 text-cyan-100 hover:bg-cyan-800'
                : 'cursor-not-allowed bg-slate-900 text-slate-600'
            }`}
          >
            Изучить: {OBJECT_KIND_LABELS[kind]}
          </button>
        ))
      )}
    </div>
  );
}

// Информационная панель Слабостей отсюда убрана: они показываются на Планшете
// Чужих (intruders/IntruderBoardModal.tsx, секция «Слабости»).
