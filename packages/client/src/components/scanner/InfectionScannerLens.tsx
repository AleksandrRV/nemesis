import React from 'react';
import { Biohazard, ScanLine } from 'lucide-react';
import { buildCodeField, type ScanResultView } from './scannerCodeField';

export type ScannerPhase = 'IDLE' | 'SCANNING' | 'REVEALED';

interface InfectionScannerLensProps {
  cardId: string;
  result: ScanResultView;
  phase: ScannerPhase;
  size?: 'md' | 'lg';
}

const INK_CLASSES = {
  DECOY: 'text-[#ff4040]',
  CODE: 'text-[#2b1640]',
} as const;

function NoiseLayer({ strong }: { strong: boolean }) {
  const filterId = `scanner-noise-${React.useId().replace(/:/g, '')}`;
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full mix-blend-screen ${
        strong ? 'motion-safe:animate-scanner-noise-fade' : 'opacity-[0.14]'
      }`}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3">
          <animate
            attributeName="seed"
            values="1;7;3;11;5;2;9"
            dur="0.6s"
            repeatCount="indefinite"
            calcMode="discrete"
          />
        </feTurbulence>
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.25  0 0 0 0 0.25  0 0 0 1.4 -0.35" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

function verdictCopy(result: ScanResultView): { label: string; className: string } {
  if (result === 'INFECTED') return { label: 'ИНФЕКЦИЯ', className: 'border-red-500 bg-red-950/90 text-red-200' };
  if (result === 'CLEAN')
    return { label: 'ИНФЕКЦИИ НЕТ', className: 'border-emerald-500 bg-emerald-950/90 text-emerald-200' };
  return { label: 'НЕТ ДАННЫХ', className: 'border-slate-500 bg-slate-900/90 text-slate-300' };
}

export const InfectionScannerLens: React.FC<InfectionScannerLensProps> = ({ cardId, result, phase, size = 'md' }) => {
  const field = buildCodeField(cardId, phase === 'IDLE' ? 'UNKNOWN' : result);
  const lensVisible = phase !== 'IDLE';
  const revealed = phase === 'REVEALED';
  const verdict = verdictCopy(result);
  const glyphSize = size === 'lg' ? 'text-[15px] sm:text-[17px]' : 'text-[11px]';
  const width = size === 'lg' ? 'w-[17rem] sm:w-[19rem]' : 'w-56';

  return (
    <figure
      className={`relative ${width} select-none`}
      aria-label={
        revealed
          ? `Карта Заражения под Красным Сканером: ${verdict.label}`
          : phase === 'SCANNING'
            ? 'Идёт сканирование карты Заражения'
            : 'Карта Заражения: не просканирована'
      }
      data-scan-phase={phase}
      data-scan-result={revealed ? result : 'HIDDEN'}
    >
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-fuchsia-900 bg-gradient-to-b from-fuchsia-950 to-[#1a0620] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
            <Biohazard size={13} aria-hidden="true" /> Заражение
          </span>
          <span className="font-mono text-[9px] text-fuchsia-400/70">{cardId.slice(-6).toUpperCase()}</span>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-[#f1e7e3] px-2 py-2 shadow-inner">
          <div
            className={`grid gap-y-0.5 font-mono font-bold leading-none ${glyphSize}`}
            style={{ gridTemplateColumns: `repeat(${field[0]!.length}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {field.flatMap((row, rowIndex) =>
              row.map((glyph, columnIndex) => (
                <span
                  key={`${rowIndex}-${columnIndex}`}
                  className={`text-center ${INK_CLASSES[glyph.ink]} ${
                    revealed && glyph.isWord ? 'motion-safe:animate-scanner-glitch' : ''
                  }`}
                >
                  {glyph.char}
                </span>
              )),
            )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,64,64,0.22)_0px,rgba(255,64,64,0.22)_2px,transparent_2px,transparent_5px)]"
          />

          {lensVisible && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 overflow-hidden bg-red-600 mix-blend-multiply ${
                phase === 'SCANNING' ? 'motion-safe:animate-scanner-lens-in' : ''
              }`}
            >
              <div className="absolute inset-0 motion-safe:animate-scanner-flicker" />
            </div>
          )}
          {lensVisible && (
            <>
              <NoiseLayer strong={phase === 'SCANNING'} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-red-300/50 to-transparent motion-safe:animate-scanner-scanline motion-reduce:hidden"
              />
            </>
          )}
          {!lensVisible && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-fuchsia-950/10">
              <span className="flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                <ScanLine size={12} aria-hidden="true" /> Кодированное поле
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[9px] uppercase tracking-widest text-fuchsia-400/70">
          <span>Красный Сканер</span>
          <span>{revealed ? 'Анализ завершён' : phase === 'SCANNING' ? 'Анализ…' : 'Ожидание'}</span>
        </div>
      </div>
      {revealed && (
        <div className="mt-3 flex justify-center">
          <span
            className={`rounded-lg border-2 px-4 py-1 font-heading text-xl tracking-[0.2em] shadow-2xl motion-safe:animate-scanner-stamp ${verdict.className}`}
            style={{ animationDelay: '250ms' }}
          >
            {verdict.label}
          </span>
        </div>
      )}
    </figure>
  );
};
