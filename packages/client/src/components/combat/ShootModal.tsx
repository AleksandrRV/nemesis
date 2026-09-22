import React from 'react';
import { Crosshair, X, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { INTRUDER_NAMES } from '../contact/contactPresentationModel';
import { intrudersInRoom } from '../board/intruderMapModel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';

/**
 * Интерактивная панель выстрела (Этап 4, Шаг 4, визуальная часть): выбор
 * Оружия в слотах Рук и цели в отсеке. Панель только собирает публичные
 * данные и отправляет `ACTION_SHOOT`; исход определяет движок, результат
 * показывает окно события `SHOOT_RESOLVED`.
 */
export function ShootModal() {
  const view = useGameStore((state) => state.view);
  const open = useGameStore((state) => state.shootModalOpen);
  const setOpen = useGameStore((state) => state.setShootModalOpen);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const convertedCardIds = useGameStore((state) => state.convertedCardIds);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);

  const closeButton = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    closeButton.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  const [weaponItemId, setWeaponItemId] = React.useState<string | null>(null);
  const [targetIntruderId, setTargetIntruderId] = React.useState<string | null>(null);
  // Классовые боевые карты в руке (Шаг 8): режим выстрела — базовый или картой.
  const [mode, setMode] = React.useState<'BASIC' | 'AIMED' | 'BURST' | 'ADRENALINE'>('BASIC');

  if (!open || !view) return null;

  const playerId = view.meta.activePlayerId;
  const player = view.players[playerId];
  if (!player) return null;

  const weapons = player.handSlots.flatMap((slot) => (slot.source === 'ITEM' && slot.card.isWeapon ? [slot.card] : []));
  const targets = intrudersInRoom(view.intrudersPool.boardTokens, player.roomId);

  const activeWeapon = weapons.find((weapon) => weapon.id === weaponItemId) ?? null;
  const usableWeapon = activeWeapon && (activeWeapon.ammo ?? 0) >= 1 ? activeWeapon : null;
  const activeTarget = targets.find((intruder) => intruder.id === targetIntruderId) ?? null;
  const paymentReady = selectedCardIds.length + convertedCardIds.length >= 1;
  const canFire = Boolean(usableWeapon && activeTarget && paymentReady);

  const handCardIds = player.actionDeck.hand.map((card) => card.id);
  const hasAimed = handCardIds.includes('ACT_SOL_AIMED_FIRE');
  const hasBurst = handCardIds.includes('ACT_SOL_BURST_FIRE');
  const hasAdrenaline = handCardIds.includes('ACT_SCO_ADRENALINE');
  const modes: { id: 'BASIC' | 'AIMED' | 'BURST' | 'ADRENALINE'; label: string; hint: string; owned: boolean }[] = [
    { id: 'BASIC', label: 'Стрельба', hint: 'базовое действие (стр. 19)', owned: true },
    { id: 'AIMED', label: 'Прицельный огонь', hint: 'переброс кубика (карта Солдата)', owned: hasAimed },
    {
      id: 'BURST',
      label: 'Стрельба очередью',
      hint: 'весь Боезапас, +1 Рана / 2 ед. (карта Солдата)',
      owned: hasBurst,
    },
    { id: 'ADRENALINE', label: 'Адреналин', hint: 'выстрел и добор карты (карта Скаута)', owned: hasAdrenaline },
  ];
  const activeMode = modes.find((entry) => entry.id === mode) ?? modes[0]!;
  // Бустерный режим требует свою карту в руке; при её исчезновении — базовый.
  const effectiveMode = activeMode.owned ? activeMode.id : 'BASIC';

  const fire = () => {
    if (!usableWeapon || !activeTarget) return;
    const discardCardIds = consumePaymentCards(1);
    if (discardCardIds.length < 1) return;
    const shoot = { weaponItemId: usableWeapon.id, targetIntruderId: activeTarget.id };
    dispatch(
      effectiveMode === 'BASIC'
        ? { type: 'ACTION_SHOOT', payload: { ...shoot, discardCardIds } }
        : {
            type: 'ACTION_PLAY_CARD',
            payload: {
              cardId:
                effectiveMode === 'AIMED'
                  ? 'ACT_SOL_AIMED_FIRE'
                  : effectiveMode === 'BURST'
                    ? 'ACT_SOL_BURST_FIRE'
                    : 'ACT_SCO_ADRENALINE',
              discardCardIds,
              combat:
                effectiveMode === 'ADRENALINE'
                  ? { kind: 'ADRENALINE_SHOOT', ...shoot }
                  : effectiveMode === 'BURST'
                    ? { kind: 'BURST_SHOOT', ...shoot }
                    : { kind: 'AIMED_SHOOT', ...shoot },
            },
          },
    );
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Панель выстрела"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === 'Tab') {
            event.preventDefault();
            closeButton.current?.focus();
          }
        }}
        className="w-full max-w-lg overflow-y-auto rounded-2xl border border-red-500/40 bg-nemesis-hull shadow-neon-cyan max-h-[calc(100dvh-2rem)]"
      >
        <header className="flex items-start justify-between border-b border-nemesis-border bg-slate-950/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-red-300">
              <Crosshair size={14} aria-hidden="true" /> Бой • Отсек #{player.roomId}
            </div>
            <h2 className="mt-2 font-heading text-2xl tracking-[0.15em] text-white">ВЫСТРЕЛ</h2>
            <p className="mt-1 text-sm text-slate-400">
              {player.name}: цена — 1 карта Действия и 1 ед. Боезапаса (стр. 19)
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть панель выстрела"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Оружие в слоте Руки
            </legend>
            {weapons.length === 0 && (
              <p className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-400">
                В слотах Рук нет Оружия — стрелять нечем (стр. 19).
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {weapons.map((weapon) => {
                const empty = (weapon.ammo ?? 0) < 1;
                const selected = weapon.id === activeWeapon?.id;
                return (
                  <button
                    key={weapon.id}
                    type="button"
                    disabled={empty}
                    onClick={() => setWeaponItemId(weapon.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? 'border-red-400 bg-red-950/50 text-white'
                        : empty
                          ? 'cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600'
                          : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {weapon.isEnergyWeapon && <Zap size={13} className="text-cyan-300" aria-hidden="true" />}
                      <span className="font-semibold">{weapon.name}</span>
                    </span>
                    <span className="font-mono text-xs">
                      {empty ? 'нет боезапаса' : `Боезапас: ${weapon.ammo}/${weapon.maxAmmo ?? '?'}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Режим выстрела
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {modes.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  disabled={!entry.owned}
                  title={entry.owned ? entry.hint : 'Карты нет в руке (Шаг 8: классовые карты)'}
                  onClick={() => setMode(entry.id)}
                  aria-pressed={effectiveMode === entry.id}
                  className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                    effectiveMode === entry.id
                      ? 'border-red-400 bg-red-950/50 text-white'
                      : entry.owned
                        ? 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500'
                        : 'cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600'
                  }`}
                >
                  {entry.label}
                  <span className="block text-[9px] font-normal text-slate-500">{entry.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">Цель в отсеке</legend>
            <div className="flex flex-col gap-1.5">
              {targets.map((intruder) => {
                const selected = intruder.id === activeTarget?.id;
                return (
                  <button
                    key={intruder.id}
                    type="button"
                    onClick={() => setTargetIntruderId(intruder.id)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? 'border-red-400 bg-red-950/50 text-white'
                        : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        viewBox="0 0 96 96"
                        className="h-5 w-5"
                        role="img"
                        aria-label={INTRUDER_NAMES[intruder.type]}
                      >
                        <path d={INTRUDER_SHAPES[intruder.type]} fill={INTRUDER_COLORS[intruder.type]} />
                      </svg>
                      <span className="font-semibold">{INTRUDER_NAMES[intruder.type]}</span>
                    </span>
                    <span className="font-mono text-xs">
                      {intruder.woundsCount > 0 ? `Ран: ${intruder.woundsCount}` : 'без ран'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p
            className={`rounded-lg border p-3 text-sm ${paymentReady ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-amber-800 bg-amber-950/30 text-amber-200'}`}
          >
            {paymentReady
              ? 'Карта цены выделена на панели руки.'
              : 'Выделите 1 карту Действия на панели руки — это цена выстрела.'}
          </p>

          {rejection && (
            <div
              role="alert"
              className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-3 text-xs text-amber-200"
            >
              {rejection}
            </div>
          )}
        </div>

        <footer className="border-t border-nemesis-border px-5 py-4">
          <button
            type="button"
            onClick={fire}
            disabled={!canFire}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
              canFire
                ? 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300'
                : 'cursor-not-allowed bg-slate-800 text-slate-500'
            }`}
          >
            <Crosshair size={16} aria-hidden="true" /> Огонь! [1 карта + 1 Боезапас → кубик Боя]
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Результат определит движок: грань кубика, Стойкость и Отступление — по книге (стр. 18–20).
          </p>
        </footer>
      </section>
    </div>
  );
}
