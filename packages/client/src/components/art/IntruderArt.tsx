import React from 'react';
import type { IntruderToken } from '@nemesis/shared';
import { INTRUDER_PORTRAIT_FOCUS_Y, hasIntruderArt, intruderArtUrl, type IntruderArtSlot } from '../../art/intruderArt';
import { useArtFallback } from '../../art/useArtFallback';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';

type IntruderKind = IntruderToken['type'];

function useIntruderArt(type: IntruderKind, slot: IntruderArtSlot) {
  const src = hasIntruderArt(type) ? intruderArtUrl(type, slot) : '';
  const { failed, onError } = useArtFallback(src);
  return { src, onError, vector: !src || failed };
}

function a11y(label: string | undefined): React.HTMLAttributes<HTMLElement> {
  return label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
}

export const IntruderGlyph: React.FC<{ type: IntruderKind; className?: string; color?: string }> = ({
  type,
  className = 'h-full w-full',
  color = INTRUDER_COLORS[type],
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <path d={INTRUDER_SHAPES[type]} fill={color} />
  </svg>
);

const ArtImage: React.FC<{ src: string; onError: () => void; className: string; style?: React.CSSProperties }> = ({
  src,
  onError,
  className,
  style,
}) => (
  <img
    style={style}
    src={src}
    alt=""
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={onError}
    className={`select-none ${className}`}
  />
);

interface TokenProps {
  type: IntruderKind;
  label?: string;
  className?: string;
}

/** Круглый значок в рамке цвета типа: списки целей, отсеки, Фаза Событий. */
export const IntruderTokenArt: React.FC<TokenProps> = ({ type, label, className = 'h-6 w-6' }) => {
  const art = useIntruderArt(type, 'token');
  return (
    <span
      {...a11y(label)}
      data-intruder-art="token"
      style={{ borderColor: INTRUDER_COLORS[type] }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-slate-950 ${className}`}
    >
      {art.vector ? (
        <IntruderGlyph type={type} className="h-3/4 w-3/4" />
      ) : (
        <ArtImage src={art.src} onError={art.onError} className="h-full w-full object-cover" />
      )}
    </span>
  );
};

/** Портрет 3:4 во всю площадь родителя; в кадре другой формы обрезается вокруг головы Чужого. */
export const IntruderPortraitArt: React.FC<TokenProps> = ({ type, label, className = '' }) => {
  const art = useIntruderArt(type, 'portrait');
  return (
    <span {...a11y(label)} className={`relative block h-full w-full overflow-hidden bg-slate-950 ${className}`}>
      {art.vector ? (
        <span className="flex h-full w-full items-center justify-center p-[15%]">
          <IntruderGlyph type={type} />
        </span>
      ) : (
        <ArtImage
          src={art.src}
          onError={art.onError}
          style={hasIntruderArt(type) ? { objectPosition: `50% ${INTRUDER_PORTRAIT_FOCUS_Y[type]}` } : undefined}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
};

interface SplashProps {
  type: IntruderKind;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Кинематограф 16:9: полосы по 10% сверху и снизу закрывают кромки кадра (doc/art-pipeline.md §2). */
export const IntruderSplashArt: React.FC<SplashProps> = ({ type, label, className = '', children }) => {
  const art = useIntruderArt(type, 'splash');
  const color = INTRUDER_COLORS[type];
  return (
    <div
      {...a11y(label)}
      data-intruder-art={art.vector ? 'splash-vector' : 'splash'}
      style={{ borderColor: color }}
      className={`relative aspect-video w-full overflow-hidden rounded-xl border bg-slate-950 ${className}`}
    >
      {art.vector ? (
        <span
          style={{ backgroundImage: `radial-gradient(circle at center, ${color}33, transparent 65%)` }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <IntruderGlyph type={type} className="h-1/2 w-1/2 drop-shadow-lg" />
        </span>
      ) : (
        <ArtImage src={art.src} onError={art.onError} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.75)_100%)]"
      />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[10%] bg-black" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[10%] bg-black" />
      {children}
    </div>
  );
};
