import React from 'react';
import type { CharacterClass } from '@nemesis/shared';
import { characterArtUrl } from '../../art/characterArt';
import { useArtFallback } from '../../art/useArtFallback';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';

const RoleIcon: React.FC<{ role: CharacterClass; size: number }> = ({ role, size }) => {
  const identity = CREW_IDENTITIES[role];
  return <identity.Icon size={size} color={identity.color} aria-hidden="true" />;
};

interface PortraitProps {
  role: CharacterClass;
  iconSize?: number;
  className?: string;
}

/** Портрет 3:4 во всю площадь родителя; голова в верхней трети кадра, поэтому обрезка — снизу. */
export const CharacterPortrait: React.FC<PortraitProps> = ({ role, iconSize = 40, className = '' }) => {
  const src = characterArtUrl(role, 'portrait');
  const { failed, onError } = useArtFallback(src);
  if (failed) {
    return (
      <span
        data-art-fallback="portrait"
        className={`flex h-full w-full items-center justify-center bg-slate-950 ${className}`}
      >
        <RoleIcon role={role} size={iconSize} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={onError}
      className={`h-full w-full select-none object-cover object-top ${className}`}
    />
  );
};

interface AvatarProps {
  role: CharacterClass;
  className?: string;
  iconSize?: number;
  ring?: boolean;
}

/** Круглый аватар в рамке цвета класса: Рация, досье, итоги партии. */
export const CharacterAvatar: React.FC<AvatarProps> = ({
  role,
  className = 'h-10 w-10',
  iconSize = 18,
  ring = true,
}) => {
  const identity = CREW_IDENTITIES[role];
  const src = characterArtUrl(role, 'avatar');
  const { failed, onError } = useArtFallback(src);
  return (
    <span
      aria-hidden="true"
      style={ring ? { borderColor: identity.color } : undefined}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ${ring ? 'border-2' : ''} ${className}`}
    >
      {failed ? (
        <RoleIcon role={role} size={iconSize} />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={onError}
          className="h-full w-full select-none object-cover"
        />
      )}
    </span>
  );
};

interface SplashProps {
  role: CharacterClass;
  /** Пропорции рамки: 16:9 — целиком, ниже — кадр обрезается сверху и снизу по центру. */
  aspect?: 'aspect-video' | 'aspect-[16/7]';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Широкий кадр 16:9 с затемнением слева и снизу: персонаж — в правой половине, текст — поверх тёмной левой трети.
 * Без файла остаётся только градиент цвета класса.
 */
export const CharacterSplash: React.FC<SplashProps> = ({ role, aspect = 'aspect-video', className = '', children }) => {
  const identity = CREW_IDENTITIES[role];
  const src = characterArtUrl(role, 'splash');
  const { failed, onError } = useArtFallback(src);
  return (
    <div
      style={{ borderColor: identity.color }}
      className={`relative ${aspect} w-full overflow-hidden rounded-2xl border bg-slate-950 ${className}`}
    >
      {!failed && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={onError}
          className="absolute inset-0 h-full w-full select-none object-cover object-right"
        />
      )}
      <span
        aria-hidden="true"
        style={{ backgroundColor: identity.color }}
        className={`absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl ${failed ? 'opacity-30' : 'opacity-15'}`}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/50 to-transparent"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent" />
      <div className="relative flex h-full flex-col justify-end p-4 sm:p-6">{children}</div>
    </div>
  );
};
