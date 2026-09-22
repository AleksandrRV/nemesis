import React from 'react';
import { Flame, Skull, X } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { INTRUDER_TYPE_NAMES } from '../log/intruderLogModel';
import { buildEventPhaseBannerModel, type EventPhaseAttackSummary } from './eventPhaseBannerModel';

function attackLine(attack: EventPhaseAttackSummary): string {
  const attacker = INTRUDER_TYPE_NAMES[attack.intruderType];
  const card = attack.cardName ? `«${attack.cardName}»` : '';
  switch (attack.outcome) {
    case 'HIT':
      return `${attacker} атакует ${attack.targetName}: ${card} — попадание!`;
    case 'MISS':
      return `${attacker} атакует ${attack.targetName}: на карте ${card} нет символа атакующего — атака проходит мимо.`;
    case 'INFESTATION':
      return `${attacker} инфицирует ${attack.targetName}: карта Заражения в сброс, миниатюра — на планшет.`;
    case 'SUPPRESSED':
      return `${attacker} подавлен Зовом до конца фазы и не атакует.`;
  }
}

/**
 * Баннер Фазы Событий: показывает атаки Чужих, случившиеся в последней
 * Фазе Событий. При загрузке страницы история не проигрывается — баннер
 * появляется только на новые фазы и закрывается вручную.
 */
export const EventPhaseBanner: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const model = buildEventPhaseBannerModel(view);
  const [dismissedKey, setDismissedKey] = React.useState<number | null>(() => model?.phaseKey ?? null);

  if (!model || model.phaseKey === dismissedKey) return null;

  const hasFatalities = model.attacks.some((attack) => attack.anyVictimDead);

  return (
    <div role="alert" className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-[min(600px,100%)] rounded-xl border border-red-900/80 bg-slate-950/95 shadow-2xl shadow-red-950/50 backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-red-900/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <Flame size={16} className="shrink-0 text-red-400" />
            <span className="font-heading text-xs tracking-widest text-red-300">
              ФАЗА СОБЫТИЙ • РАУНД {model.round} • АТАКИ ЧУЖИХ
            </span>
          </div>
          <button
            onClick={() => setDismissedKey(model.phaseKey)}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Закрыть сводку Фазы Событий"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="max-h-48 space-y-1.5 overflow-y-auto px-4 py-3">
          {model.attacks.map((attack) => (
            <li key={attack.logId} className="text-xs leading-snug text-slate-200">
              <span className="text-red-300">{attackLine(attack)}</span>
              {attack.anyVictimDead && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-red-400">
                  <Skull size={12} /> Есть погибшие!
                </span>
              )}
            </li>
          ))}
        </ul>
        {hasFatalities && (
          <p className="border-t border-red-900/60 px-4 py-2 text-[11px] text-slate-400">
            Погибшие остаются Трупами в отсеке; Тяжёлые Объекты падают на пол (стр. 21).
          </p>
        )}
      </div>
    </div>
  );
};
