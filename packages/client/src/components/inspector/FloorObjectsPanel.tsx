import { AlertCircle } from 'lucide-react';
import type { BoardObject } from '@nemesis/shared';

const BOARD_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

interface FloorObjectsPanelProps {
  objects: readonly BoardObject[];
  isPlayerHere: boolean;
  hasFreeHandSlot: boolean;
  paymentReady: boolean;
  onPickUp: (objectId: string) => void;
}

/** Тяжёлые объекты на полу отсека и действие «Поднять [1]» (стр. 22; Шаг 6). */
export function FloorObjectsPanel({
  objects,
  isPlayerHere,
  hasFreeHandSlot,
  paymentReady,
  onPickUp,
}: FloorObjectsPanelProps) {
  return (
    <>
      {objects.map((object) => {
        const canPickUp = isPlayerHere && hasFreeHandSlot && paymentReady;
        return (
          <div
            key={object.id}
            className="text-xs bg-red-950/30 border border-red-900/50 p-2 rounded flex items-center gap-2 text-rose-300"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">
              На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b>
            </span>
            {isPlayerHere && (
              <button
                type="button"
                disabled={!canPickUp}
                title={
                  !hasFreeHandSlot
                    ? 'Оба слота Рук заняты (стр. 22)'
                    : !paymentReady
                      ? 'Выделите карту цены на панели руки'
                      : 'Поднять Тяжёлый объект [1] (стр. 22)'
                }
                onClick={() => onPickUp(object.id)}
                className={`shrink-0 rounded px-2 py-1 font-semibold transition ${
                  canPickUp
                    ? 'bg-rose-900/80 text-rose-100 hover:bg-rose-800'
                    : 'cursor-not-allowed bg-slate-900 text-slate-600'
                }`}
              >
                Поднять [1]
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
