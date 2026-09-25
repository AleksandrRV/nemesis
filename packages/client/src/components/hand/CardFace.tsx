import React from 'react';
import type { CardUsage } from './usageTypes';
import { ACCENT_CLASSES } from './usageIcons';

export const CardFace: React.FC<{ usage: CardUsage }> = ({ usage }) => {
  const accent = ACCENT_CLASSES[usage.accent];
  return (
    <article
      aria-label={`Карта «${usage.title}»`}
      className="relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-inner"
    >
      <div className={`h-1.5 w-full ${accent.bar}`} />
      <div className="flex flex-col gap-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accent.text}`}>{usage.typeLine}</p>
            <h2 className="mt-1 font-heading text-2xl leading-tight tracking-wide text-white">{usage.title}</h2>
          </div>
          <span
            title={usage.cost === 0 ? 'Без доплаты картами' : `Доплата: сбросить ${usage.cost} карт(ы)`}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border-2 border-slate-600 ${accent.soft}`}
          >
            <span className="font-mono text-lg font-bold leading-none text-white">{usage.cost}</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400">цена</span>
          </span>
        </header>
        <p className="text-sm leading-relaxed text-slate-200">{usage.description}</p>
        {usage.badges.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Свойства карты">
            {usage.badges.map((badge) => (
              <li
                key={badge}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
              >
                {badge}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
};
