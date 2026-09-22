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

interface WeaknessSlotsPanelProps {
  slots: readonly SanitizedWeaknessSlotState[];
}

/** Планшет Чужих: слоты Слабостей (стр. 21) — рубашка анонимна, изученные открыты. */
export function WeaknessSlotsPanel({ slots }: WeaknessSlotsPanelProps) {
  return (
    <div className="text-xs bg-slate-950/60 border border-slate-800 p-2 rounded space-y-1">
      <div className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Слабости Чужих (Планшет)</div>
      {slots.map((slot) => (
        <div key={slot.objectKind} className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-slate-500">{OBJECT_KIND_LABELS[slot.objectKind]}:</span>
          {slot.visibility === 'REVEALED' ? (
            <span className="text-right text-emerald-300">
              <b>{slot.card.name}</b>
              <span className="block text-[10px] leading-snug text-slate-400">{slot.card.description}</span>
            </span>
          ) : slot.visibility === 'FACE_DOWN' ? (
            <span className="text-slate-400">не изучено</span>
          ) : (
            <span className="text-slate-600">пусто</span>
          )}
        </div>
      ))}
    </div>
  );
}
