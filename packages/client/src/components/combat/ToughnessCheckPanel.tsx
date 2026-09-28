import type { IntruderAttackCard } from '@nemesis/shared';
import { toughnessCardLabel, toughnessSummary } from './toughnessPresentation';

interface ToughnessCheckPanelProps {
  cards: readonly IntruderAttackCard[];
  toughnessTotal: number | null;
}

export function ToughnessCheckPanel({ cards, toughnessTotal }: ToughnessCheckPanelProps) {
  if (cards.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-900/80 bg-slate-950/70 p-4 motion-safe:animate-contact-card motion-reduce:animate-none">
      <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-red-300">
        Проверка Стойкости (стр. 20)
      </div>
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex items-center justify-between gap-2 border-b border-slate-800 py-1.5 text-sm last:border-b-0"
        >
          <span className="text-slate-200">{card.name}</span>
          <span className="shrink-0 font-mono text-xs text-amber-300">{toughnessCardLabel(card)}</span>
        </div>
      ))}
      <div className="mt-2 text-xs text-slate-400">{toughnessSummary(toughnessTotal)}</div>
    </div>
  );
}
