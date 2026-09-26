import React from 'react';
import type { ActionCard, ActionDeckCard, BoardObject, ItemCard } from '@nemesis/shared';
import { AlertTriangle, Play, Sparkles, X, Zap } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';

export type CardDetailsTarget =
  | { kind: 'ACTION'; card: ActionCard }
  | { kind: 'CONTAMINATION'; card: Extract<ActionDeckCard, { isInfected: boolean }> }
  | { kind: 'ITEM'; card: ItemCard }
  | { kind: 'OBJECT'; object: BoardObject };

interface CardDetailsModalProps {
  target: CardDetailsTarget;
  onClose: () => void;
  onPlay?: () => void;
}

const ITEM_COLOR_LABELS: Record<ItemCard['color'], string> = {
  RED: 'Красная колода',
  YELLOW: 'Жёлтая колода',
  GREEN: 'Зелёная колода',
  BLUE: 'Создаваемый предмет',
};

const OBJECT_TEXT: Record<BoardObject['kind'], { name: string; text: string }> = {
  CORPSE: {
    name: 'Труп',
    text: 'Тяжёлый объект: занимает руку. Его можно сбросить на пол отсека без Действия (стр. 22).',
  },
  EGG: {
    name: 'Яйцо Чужих',
    text: 'Тяжёлый объект: занимает руку. Его можно сбросить на пол отсека без Действия (стр. 22).',
  },
  INTRUDER_REMAINS: {
    name: 'Останки Чужого',
    text: 'Тяжёлый объект: занимает руку. Останки изучают в Лаборатории; сбросить их можно без Действия (стр. 22).',
  },
};

const CONTAMINATION_TEXT =
  'Карта Заражения засоряет колоду Действий. Её нельзя разыграть или сбросить в оплату. Проверить и очистить её помогают «Отдых», Алкоголь, Антидот и Действия отсеков (Хирургия).';

function header(target: CardDetailsTarget): { eyebrow: string; title: string } {
  switch (target.kind) {
    case 'ACTION':
      return {
        eyebrow: `Карта Действия · ${CREW_IDENTITIES[target.card.characterClass].label}`,
        title: target.card.name,
      };
    case 'ITEM':
      return { eyebrow: `Предмет · ${ITEM_COLOR_LABELS[target.card.color]}`, title: target.card.name };
    case 'CONTAMINATION':
      return { eyebrow: 'Заражение', title: 'Карта Заражения' };
    case 'OBJECT':
      return { eyebrow: 'Тяжёлый объект', title: OBJECT_TEXT[target.object.kind].name };
  }
}

function bodyText(target: CardDetailsTarget): string {
  if (target.kind === 'CONTAMINATION') return CONTAMINATION_TEXT;
  if (target.kind === 'OBJECT') return OBJECT_TEXT[target.object.kind].text;
  return target.card.description;
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${tone}`}>
      {children}
    </span>
  );
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ target, onClose, onPlay }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });
  const { eyebrow, title } = header(target);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-details-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-cyan-500/50 bg-slate-900 shadow-[0_0_50px_rgba(6,182,212,0.2)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">{eyebrow}</p>
            <h3 id="card-details-title" className="mt-0.5 font-heading text-2xl tracking-wider text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {target.kind === 'ACTION' && (
              <Badge tone="border-slate-700 bg-slate-800 text-cyan-300">
                <Zap size={12} /> Доплата: {target.card.playCost}
              </Badge>
            )}
            {target.kind === 'ITEM' && (
              <>
                <Badge tone="border-slate-700 bg-slate-800 text-cyan-300">
                  <Zap size={12} /> Цена: {target.card.actionCost}
                </Badge>
                {target.card.isHeavy && (
                  <Badge tone="border-amber-600/50 bg-amber-950/60 text-amber-300">Тяжёлый — занимает руку</Badge>
                )}
                <Badge tone="border-purple-600/50 bg-purple-950/60 text-purple-300">
                  {target.card.isSingleUse ? 'Одноразовый' : 'Многоразовый'}
                </Badge>
                {target.card.isWeapon && (
                  <Badge tone="border-red-600/50 bg-red-950/60 text-red-300">
                    Оружие · Боезапас {target.card.ammo ?? 0}/{target.card.maxAmmo ?? '—'}
                  </Badge>
                )}
                {target.card.componentSymbols.length > 0 && (
                  <Badge tone="border-emerald-600/50 bg-emerald-950/60 text-emerald-300">
                    <Sparkles size={12} /> Компоненты: {target.card.componentSymbols.join(', ')}
                  </Badge>
                )}
              </>
            )}
            {target.kind === 'CONTAMINATION' && (
              <Badge tone="border-purple-600/50 bg-purple-950/60 text-purple-300">
                <AlertTriangle size={12} />
                {target.card.isScanned
                  ? target.card.isInfected
                    ? 'Инфекция обнаружена'
                    : 'Стерильна'
                  : 'Не просканирована'}
              </Badge>
            )}
          </div>
          <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-100">
            {bodyText(target)}
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2.5 border-t border-slate-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            Закрыть
          </button>
          {onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-cyan-400 active:scale-95"
            >
              <Play size={13} fill="currentColor" /> {target.kind === 'ACTION' ? 'Разыграть' : 'Использовать'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
