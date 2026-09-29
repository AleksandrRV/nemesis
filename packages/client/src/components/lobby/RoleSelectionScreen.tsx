import React from 'react';
import { CHARACTERS, type CharacterClass, type SanitizedCrewSetup } from '@nemesis/shared';
import { Bot, Rocket, Timer } from 'lucide-react';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { RoleCard, RoleCardBack, type RoleCardState } from './RoleCard';
import { ROLE_PICK_SECONDS, ROLE_SELECTION_LABELS, seatByPlayer } from './lobbyModel';

const TAKE_ANIMATION_MS = 700;

interface RoleSelectionScreenProps {
  setup: SanitizedCrewSetup;
  onPick: (role: CharacterClass) => void;
  onTimeout: () => void;
  onLaunch: () => void;
}

function useCountdown(active: boolean, onExpire: () => void): number {
  const [startedAt] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(startedAt);
  const expire = React.useRef(onExpire);
  React.useEffect(() => {
    expire.current = onExpire;
  });
  React.useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick - startedAt >= ROLE_PICK_SECONDS * 1000) {
        window.clearInterval(timer);
        expire.current();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);
  return Math.max(0, ROLE_PICK_SECONDS - Math.floor((now - startedAt) / 1000));
}

const TimerRing: React.FC<{ secondsLeft: number }> = ({ secondsLeft }) => {
  const circumference = 2 * Math.PI * 22;
  const urgent = secondsLeft <= 10;
  return (
    <div role="timer" aria-label={`Осталось ${secondsLeft} с`} className="relative h-14 w-14">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r="22" className="fill-none stroke-slate-800" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r="22"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - secondsLeft / ROLE_PICK_SECONDS)}
          className={`fill-none transition-[stroke-dashoffset] duration-1000 ease-linear ${urgent ? 'stroke-red-400' : 'stroke-cyan-400'}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-sm ${urgent ? 'text-red-300 motion-safe:animate-pulse' : 'text-white'}`}
      >
        {secondsLeft}
      </span>
    </div>
  );
};

const PickOrderTrack: React.FC<{ setup: SanitizedCrewSetup }> = ({ setup }) => (
  <ol aria-label="Очередь выбора" className="flex flex-wrap justify-center gap-2">
    {setup.pickOrder.map((playerId) => {
      const seat = seatByPlayer(setup, playerId)!;
      const role = setup.roles[playerId];
      const current = setup.currentPicker === playerId;
      const identity = role ? CREW_IDENTITIES[role] : null;
      return (
        <li
          key={playerId}
          aria-current={current ? 'step' : undefined}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition ${
            current
              ? 'scale-105 border-cyan-400 bg-cyan-950/70 text-white shadow-[0_0_16px_rgba(34,211,238,0.4)]'
              : 'border-slate-800 bg-slate-950/70 text-slate-400'
          }`}
        >
          <span className="font-heading text-sm text-white">{seat.orderNumber}</span>
          {seat.kind === 'BOT' && <Bot size={12} className="text-violet-300" aria-hidden="true" />}
          <span>{seat.label}</span>
          {identity && (
            <span
              className="flex items-center gap-1 font-semibold motion-safe:animate-token-pop"
              style={{ color: identity.color }}
            >
              <identity.Icon size={12} aria-hidden="true" /> {identity.label}
            </span>
          )}
        </li>
      );
    })}
  </ol>
);

const CrewManifest: React.FC<{ setup: SanitizedCrewSetup; onLaunch: () => void }> = ({ setup, onLaunch }) => (
  <div className="flex flex-col items-center gap-6 motion-safe:animate-lobby-rise">
    <h3 className="font-heading text-2xl tracking-[0.3em] text-white">ЭКИПАЖ СОБРАН</h3>
    <div className="flex flex-wrap justify-center gap-3">
      {[...setup.seats]
        .sort((left, right) => left.orderNumber - right.orderNumber)
        .map((seat, index) => (
          <div key={seat.playerId} className="flex flex-col items-center gap-1.5">
            <RoleCard role={setup.roles[seat.playerId]!} state="SHOWN" compact dealDelayMs={index * 160} />
            <span className="text-[11px] text-slate-300">
              №{seat.orderNumber} · {seat.label}
            </span>
          </div>
        ))}
    </div>
    <button
      type="button"
      onClick={onLaunch}
      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-10 py-3 font-heading text-sm uppercase tracking-[0.3em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.4)] transition hover:bg-cyan-400"
    >
      <Rocket size={16} aria-hidden="true" /> На борт
    </button>
  </div>
);

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ setup, onPick, onTimeout, onLaunch }) => {
  if (setup.isReady) return <CrewManifest setup={setup} onLaunch={onLaunch} />;
  const turnKey = `${setup.currentPicker}-${Object.values(setup.roles).filter(Boolean).length}`;
  return (
    <section
      aria-labelledby="roles-title"
      className="flex w-full max-w-5xl flex-col items-center gap-5 motion-safe:animate-lobby-rise"
    >
      <header className="text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-400">
          {ROLE_SELECTION_LABELS[setup.roleSelection]}
        </span>
        <h2 id="roles-title" className="mt-1 font-heading text-2xl tracking-[0.2em] text-white sm:text-3xl">
          ВЫБОР ПЕРСОНАЖА
        </h2>
      </header>
      <PickOrderTrack setup={setup} />
      <PickPanel key={turnKey} setup={setup} onPick={onPick} onTimeout={onTimeout} />
    </section>
  );
};

const PickPanel: React.FC<Omit<RoleSelectionScreenProps, 'onLaunch'>> = ({ setup, onPick, onTimeout }) => {
  const [chosen, setChosen] = React.useState<CharacterClass | null>(null);
  const picker = seatByPlayer(setup, setup.currentPicker);
  const secondsLeft = useCountdown(setup.canPick && chosen === null, onTimeout);

  const choose = (role: CharacterClass) => {
    if (chosen) return;
    setChosen(role);
    window.setTimeout(() => onPick(role), TAKE_ANIMATION_MS);
  };

  const takenBy = (role: CharacterClass) => {
    const owner = Object.entries(setup.roles).find(([, taken]) => taken === role)?.[0];
    return owner ? seatByPlayer(setup, owner)?.label : undefined;
  };
  const cardState = (role: CharacterClass): RoleCardState => {
    if (takenBy(role)) return 'TAKEN';
    if (!setup.canPick) return 'SHOWN';
    if (chosen === null) return 'OPEN';
    return chosen === role ? 'CHOSEN' : 'RETURNING';
  };
  const draftCards =
    setup.roleSelection === 'DRAFT' ? setup.currentOffer : CHARACTERS.map((preset) => preset.characterClass);

  return (
    <>
      <div className="flex min-h-[4rem] items-center gap-4">
        {picker && (
          <p className="text-center text-sm text-slate-200" aria-live="polite">
            {setup.canPick ? (
              <>
                <b className="text-cyan-200">{picker.label}</b>, ваш выбор
                {setup.roleSelection === 'DRAFT' ? ': оставьте одну карту, вторая вернётся в колоду.' : '.'}
              </>
            ) : (
              <span className="flex items-center gap-2">
                <Bot size={16} className="text-violet-300" aria-hidden="true" />
                {picker.label} выбирает
                <span className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-violet-300 motion-safe:animate-bot-thinking"
                      style={{ animationDelay: `${dot * 160}ms` }}
                    />
                  ))}
                </span>
              </span>
            )}
          </p>
        )}
        {setup.canPick && chosen === null && (
          <span className="flex items-center gap-2 text-[11px] text-slate-400">
            <TimerRing secondsLeft={secondsLeft} />
            <span className="flex max-w-[9rem] items-center gap-1">
              <Timer size={12} aria-hidden="true" /> Не успеете — роль выпадет случайно
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 [perspective:1000px]">
        {draftCards.length === 0 && <RoleCardBack />}
        {draftCards.map((role, index) => (
          <RoleCard
            key={role}
            role={role}
            state={cardState(role)}
            takenBy={takenBy(role)}
            dealDelayMs={index * 140}
            compact={setup.roleSelection === 'FREE'}
            onPick={setup.canPick ? () => choose(role) : undefined}
          />
        ))}
      </div>
    </>
  );
};
