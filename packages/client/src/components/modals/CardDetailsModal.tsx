import React from 'react';
import type { ActionCard, ActionDeckCard, ItemCard } from '@nemesis/shared';
import { X, Play, Zap, AlertTriangle, Sparkles } from 'lucide-react';

export type CardDetailsTarget =
  | { kind: 'ACTION'; card: ActionCard }
  | { kind: 'CONTAMINATION'; card: Extract<ActionDeckCard, { isInfected: boolean }> }
  | { kind: 'ITEM'; card: ItemCard };

interface CardDetailsModalProps {
  target: CardDetailsTarget;
  onClose: () => void;
  onPlay?: () => void;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ target, onClose, onPlay }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <header className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              {target.kind === 'ACTION'
                ? `КАРТА ДЕЙСТВИЯ [${target.card.characterClass}]`
                : target.kind === 'ITEM'
                  ? `ПРЕДМЕТ [${target.card.color}]`
                  : 'КАРТА ЗАРАЖЕНИЯ'}
            </span>
            <h3 className="text-xl font-heading text-white tracking-wider mt-0.5">
              {target.kind === 'CONTAMINATION' ? 'Карта Заражения' : target.card.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 text-xs">
          {/* Свойства / Бейджи */}
          <div className="flex flex-wrap gap-2">
            {target.kind === 'ACTION' && (
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold flex items-center gap-1">
                <Zap size={13} /> Стоимость розыгрыша: {target.card.playCost}
              </span>
            )}

            {target.kind === 'ITEM' && (
              <>
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold flex items-center gap-1">
                  <Zap size={13} /> Стоимость: {target.card.actionCost}
                </span>
                {target.card.isHeavy && (
                  <span className="px-2 py-1 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 font-bold">
                    Тяжёлый предмет (занимает руку)
                  </span>
                )}
                {target.card.isSingleUse && (
                  <span className="px-2 py-1 rounded bg-purple-950/60 border border-purple-600/50 text-purple-300 font-bold">
                    Одноразовый
                  </span>
                )}
                {target.card.isWeapon && (
                  <span className="px-2 py-1 rounded bg-red-950/60 border border-red-600/50 text-red-300 font-bold">
                    Оружие • Боезапас: {target.card.ammo}/{target.card.maxAmmo}
                  </span>
                )}
                {target.card.componentSymbols && target.card.componentSymbols.length > 0 && (
                  <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 font-bold flex items-center gap-1">
                    <Sparkles size={12} /> Компоненты: {target.card.componentSymbols.join(', ')}
                  </span>
                )}
              </>
            )}

            {target.kind === 'CONTAMINATION' && (
              <span className="px-2.5 py-1 rounded bg-purple-950/60 border border-purple-600/50 text-purple-300 font-bold flex items-center gap-1">
                <AlertTriangle size={13} />
                {target.card.isScanned
                  ? target.card.isInfected
                    ? 'ИНФЕКЦИЯ ОБНАРУЖЕНА'
                    : 'СТЕРИЛЬНО'
                  : 'НЕ ПРОСКАНИРОВАНО'}
              </span>
            )}
          </div>

          {/* Описание эффекта */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 leading-relaxed text-slate-300 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Текст эффекта / Инструкция:
            </span>
            <p className="text-sm text-slate-100">
              {target.kind === 'CONTAMINATION'
                ? 'Карта Заражения засоряет колоду действий персонажа. Её нельзя использовать для оплаты действий или конвертировать в очки действий. Для проверки и очистки используйте действие отсека «Хирургия», карту «Отдых» или предмет «Алкоголь».'
                : target.card.description}
            </p>
          </div>
        </div>

        <footer className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Закрыть
          </button>
          {onPlay && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPlay();
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              <Play size={13} fill="currentColor" /> Использовать
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
