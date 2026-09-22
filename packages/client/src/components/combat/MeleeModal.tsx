import React from 'react';
import { Hand, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { INTRUDER_NAMES } from '../contact/contactPresentationModel';
import { intrudersInRoom } from '../board/intruderMapModel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';

/**
 * Интерактивная панель Рукопашной атаки (Этап 0.4.0, Шаг 5, визуальная
 * часть): выбор цели в отсеке, контроль карты цены. Панель только собирает
 * публичные данные и отправляет `ACTION_MELEE`; исход определяет движок,
 * результат показывает окно события `MELEE_RESOLVED`.
 */
export function MeleeModal() {
  const view = useGameStore((state) => state.view);
  const open = useGameStore((state) => state.meleeModalOpen);
  const setOpen = useGameStore((state) => state.setMeleeModalOpen);
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

  const [targetIntruderId, setTargetIntruderId] = React.useState<string | null>(null);

  if (!open || !view) return null;

  const playerId = view.meta.activePlayerId;
  const player = view.players[playerId];
  if (!player) return null;

  const targets = intrudersInRoom(view.intrudersPool.boardTokens, player.roomId);
  const activeTarget = targets.find((intruder) => intruder.id === targetIntruderId) ?? null;
  const paymentReady = selectedCardIds.length + convertedCardIds.length >= 1;
  const canStrike = Boolean(activeTarget && paymentReady);

  const strike = () => {
    if (!activeTarget) return;
    const discardCardIds = consumePaymentCards(1);
    if (discardCardIds.length < 1) return;
    dispatch({
      type: 'ACTION_MELEE',
      payload: { targetIntruderId: activeTarget.id, discardCardIds },
    });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Панель рукопашной атаки"
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
        className="w-full max-w-lg overflow-y-auto rounded-2xl border border-orange-500/40 bg-nemesis-hull shadow-neon-cyan max-h-[calc(100dvh-2rem)]"
      >
        <header className="flex items-start justify-between border-b border-nemesis-border bg-slate-950/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-orange-300">
              <Hand size={14} aria-hidden="true" /> Бой • Отсек #{player.roomId}
            </div>
            <h2 className="mt-2 font-heading text-2xl tracking-[0.15em] text-white">РУКОПАШНАЯ АТАКА</h2>
            <p className="mt-1 text-sm text-slate-400">
              {player.name}: цена — 1 карта Действия; до броска Персонаж получает карту Заражения (стр. 19)
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть панель рукопашной атаки"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Цель в отсеке
            </legend>
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
                        ? 'border-orange-400 bg-orange-950/50 text-white'
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
              : 'Выделите 1 карту Действия на панели руки — это цена атаки.'}
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-400">
            <p>Порядок по книге (стр. 19): карта Заражения — сразу в сброс, затем кубик Боя.</p>
            <p className="mt-1">
              Промах — цель наносит Персонажу <b className="text-amber-300">1 Тяжёлую Травму</b>; грань «2 Раны» в
              рукопашной считается 1 Раной.
            </p>
          </div>

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
            onClick={strike}
            disabled={!canStrike}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
              canStrike
                ? 'bg-orange-600 text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300'
                : 'cursor-not-allowed bg-slate-800 text-slate-500'
            }`}
          >
            <Hand size={16} aria-hidden="true" /> Атаковать! [1 карта + карта Заражения → кубик Боя]
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Результат определит движок: грань кубика, Стойкость и Отступление — по книге (стр. 19–20).
          </p>
        </footer>
      </section>
    </div>
  );
}
