import React from 'react';
import { RotateCcw, Zap } from 'lucide-react';
import type { ActionCard, SanitizedPlayerState } from '@nemesis/shared';
import { HandCard, type HandCardPlayability } from './HandCard';
import type { CardDetailsTarget } from '../modals/CardDetailsModal';

type HandEntry = SanitizedPlayerState['actionDeck']['hand'][number];

interface BoardCardsSectionProps {
  hand: readonly HandEntry[];
  selectedCardIds: readonly string[];
  convertedCardIds: readonly string[];
  playabilityOf: (card: ActionCard) => HandCardPlayability;
  onToggle: (cardId: string) => void;
  onPlay: (card: ActionCard) => void;
  onInspect: (target: CardDetailsTarget) => void;
  onRefund: (cardId: string) => void;
  onConvert: () => void;
  onRefundAll: () => void;
}

export const BoardCardsSection: React.FC<BoardCardsSectionProps> = ({
  hand,
  selectedCardIds,
  convertedCardIds,
  playabilityOf,
  onToggle,
  onPlay,
  onInspect,
  onRefund,
  onConvert,
  onRefundAll,
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-slate-400">
        Нажмите на карту, чтобы отметить её для оплаты или сброса при Пасе. «Разыграть» открывает выбор варианта.
      </p>
      <div className="flex items-center gap-2">
        {selectedCardIds.length > 0 && (
          <button
            type="button"
            onClick={onConvert}
            title="Отложить отмеченные карты как оплату следующих Действий"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-600/70 bg-emerald-950/60 px-3 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-900/80 active:scale-95"
          >
            <Zap size={13} aria-hidden="true" /> В резерв оплаты ({selectedCardIds.length})
          </button>
        )}
        {convertedCardIds.length > 0 && (
          <button
            type="button"
            onClick={onRefundAll}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <RotateCcw size={13} aria-hidden="true" /> Вернуть резерв ({convertedCardIds.length})
          </button>
        )}
      </div>
    </div>
    {hand.length === 0 ? (
      <p className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">
        На руке нет карт. Они добираются в конце раунда.
      </p>
    ) : (
      <ul className="flex gap-3 overflow-x-auto px-1 pb-2 pt-3" aria-label="Карты на руке">
        {hand.map((card) => (
          <li key={card.id}>
            <HandCard
              card={card}
              isSelected={selectedCardIds.includes(card.id)}
              isConverted={convertedCardIds.includes(card.id)}
              playability={'characterClass' in card ? playabilityOf(card) : { playable: false }}
              onToggle={() => onToggle(card.id)}
              onPlay={() => {
                if ('characterClass' in card) onPlay(card);
              }}
              onInspect={() =>
                onInspect(
                  'characterClass' in card
                    ? { kind: 'ACTION', card }
                    : { kind: 'CONTAMINATION', card: card as Extract<typeof card, { isInfected: boolean }> },
                )
              }
              onRefund={() => onRefund(card.id)}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);
