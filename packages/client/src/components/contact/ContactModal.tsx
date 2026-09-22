import { useEffect, useId, useRef } from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import type { ContactPresentationEntry } from './contactPresentationModel';
import { INTRUDER_NAMES } from './contactPresentationModel';
import { IntruderSilhouette } from './IntruderSilhouette';
import { COMBAT_DIE_PRESENTATION } from '../combat/shootPresentation';

interface ContactModalProps {
  entry: ContactPresentationEntry;
  view: SanitizedGameState;
  onClose: () => void;
}

export function ContactModal({ entry, view, onClose }: ContactModalProps) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const event = entry.event;
  const isContact = event.type === 'CONTACT_OCCURRED';
  const isShoot = event.type === 'SHOOT_RESOLVED';
  const isMelee = event.type === 'MELEE_RESOLVED';
  const isEscape = event.type === 'ESCAPE_ATTACK_RESOLVED';
  const type = isContact ? event.tokenType : isShoot || isMelee ? event.targetType : event.intruderType;
  const playerName = view.players[event.playerId]?.name ?? event.playerId;

  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [entry.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            event.preventDefault();
            closeButton.current?.focus();
          }
        }}
        className="w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-500/40 bg-nemesis-hull shadow-neon-cyan max-h-[calc(100dvh-2rem)]"
      >
        <header className="border-b border-nemesis-border bg-slate-950/60 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-300">
            <ShieldAlert size={14} aria-hidden="true" /> Система обнаружения • Отсек #{event.roomId}
          </div>
          <h2 id={titleId} className="mt-2 font-heading text-2xl tracking-[0.15em] text-white">
            {isContact
              ? 'КОНТАКТ!'
              : isShoot
                ? 'ВЫСТРЕЛ'
                : isMelee
                  ? 'РУКОПАШНАЯ АТАКА'
                  : isEscape
                    ? 'ПОБЕГ — АТАКА В СПИНУ'
                    : 'ВНЕЗАПНАЯ АТАКА'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{playerName}</p>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-900/50 via-slate-950 to-slate-900 shadow-neon-cyan motion-safe:animate-contact-reveal motion-reduce:animate-none sm:h-48 sm:w-48">
              <IntruderSilhouette type={type} />
              {isContact && type !== 'BLANK' && !event.infestation && (
                <div
                  aria-label={`Число Внезапной атаки: ${event.escapeNumber}`}
                  className="absolute bottom-0 right-1 flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/70 bg-slate-950 font-mono text-2xl font-bold text-amber-300"
                >
                  {event.escapeNumber}
                </div>
              )}
            </div>
            <h3 className="text-center font-heading text-xl uppercase tracking-wider text-cyan-100">
              {INTRUDER_NAMES[type]}
            </h3>
          </div>

          {isContact ? (
            <>
              {event.tokenType === 'BLANK' ? (
                <p className="rounded-lg border border-slate-700 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-300">
                  Никого. Жетон возвращён в мешок. Все ведущие в отсек Коридоры, включая доступную вентиляцию, снова
                  отмечены Шумом.
                </p>
              ) : event.infestation ? (
                <div
                  role="alert"
                  className={`rounded-lg border p-4 text-sm leading-relaxed ${
                    event.infestation.alreadyInfested
                      ? 'border-amber-500/70 bg-amber-950/40 text-amber-100'
                      : 'border-emerald-500/60 bg-emerald-950/40 text-emerald-100'
                  }`}
                >
                  <div className="font-bold uppercase tracking-wider">
                    {event.infestation.alreadyInfested ? 'ПОВТОРНАЯ ЛИЧИНКА' : 'ЗАРАЖЕНИЕ!'}
                  </div>
                  <p className="mt-1">
                    {event.infestation.alreadyInfested
                      ? 'Новая Личинка исчезает: на планшете остаётся прежняя, но персонаж получает ещё одну карту Заражения в личный сброс (FAQ Rules 12).'
                      : 'Личинка прыгнула на персонажа: миниатюра в отсек не ставится. Карта Заражения — в личный сброс, Личинка — на планшет (стр. 18, 20).'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <div className="font-mono text-2xl text-amber-300">{event.escapeNumber}</div>
                    <div className="mt-1 text-xs text-slate-400">Число на жетоне</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <div className="font-mono text-2xl text-cyan-200">{event.handCount}</div>
                    <div className="mt-1 text-xs text-slate-400">Карт после оплаты</div>
                  </div>
                </div>
              )}
              {event.surpriseAttack ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/70 bg-red-950/70 p-4 text-red-100 motion-safe:animate-contact-warning motion-reduce:animate-none"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={18} aria-hidden="true" /> ВНЕЗАПНАЯ АТАКА!
                  </div>
                  <p className="mt-1 text-sm">Карт на руке меньше числа на жетоне. Появившийся Чужой атакует.</p>
                </div>
              ) : (
                event.tokenType !== 'BLANK' &&
                !event.infestation && (
                  <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                    {event.source === 'CALL'
                      ? 'Зов: новый Чужой не проводит Внезапную атаку и не атакует в текущей фазе.'
                      : 'Вы готовы к встрече. Внезапной атаки нет.'}
                  </p>
                )
              )}
              {event.firstEncounter && (
                <p className="text-sm leading-relaxed text-amber-200">
                  Первый Чужой на поле. Если у игрока две Цели, он должен тайно оставить одну до продолжения Контакта.
                </p>
              )}
            </>
          ) : isShoot ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div
                  role="img"
                  aria-label={`Кубик Боя: ${COMBAT_DIE_PRESENTATION[event.dieFace].label}`}
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-slate-950 text-center font-mono text-lg font-bold leading-tight text-amber-300 motion-safe:animate-die-roll motion-reduce:animate-none"
                >
                  {COMBAT_DIE_PRESENTATION[event.dieFace].label}
                </div>
                <p className="text-center text-sm text-slate-400">{COMBAT_DIE_PRESENTATION[event.dieFace].hint}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <div className="text-sm font-semibold text-white">
                    {event.weaponName}
                    {event.rerolled ? ' • переброс' : ''}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Боезапас: {event.ammoLeft}
                    {event.burstAmmoSpent ? ` • очередью сброшено ${event.burstAmmoSpent}` : ''}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <div className="text-sm font-semibold text-white">{INTRUDER_NAMES[event.targetType]}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Раны: {event.woundsBefore} → {event.woundsTotal}
                  </div>
                </div>
              </div>

              {event.toughnessCards.length > 0 && (
                <div className="rounded-xl border border-red-900/80 bg-slate-950/70 p-4 motion-safe:animate-contact-card motion-reduce:animate-none">
                  <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-red-300">
                    Проверка Стойкости (стр. 20)
                  </div>
                  {event.toughnessCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-800 py-1.5 text-sm last:border-b-0"
                    >
                      <span className="text-slate-200">{card.name}</span>
                      <span className="shrink-0 font-mono text-xs text-amber-300">
                        Стойкость {card.toughness}
                        {card.hasRetreat ? ' • Отступление' : ''}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 text-xs text-slate-400">Сумма Стойкости: {event.toughnessTotal}</div>
                </div>
              )}

              {event.killed ? (
                <div
                  role="alert"
                  className="rounded-lg border border-emerald-500/70 bg-emerald-950/50 p-4 text-emerald-100"
                >
                  <div className="font-bold">{event.targetType === 'LARVA' ? 'ЛИЧИНКА УБИТА' : 'ЧУЖОЙ УБИТ!'}</div>
                  <p className="mt-1 text-sm">
                    {event.targetType === 'LARVA'
                      ? '1 Раны достаточно, чтобы убить Личинку: карта Атаки не вытягивается, Останков нет (стр. 20, 22).'
                      : `Ран ${event.woundsTotal} не меньше Стойкости ${event.toughnessTotal}. Миниатюра снята, жетон Останков Чужого — на полу отсека (стр. 20), карта Атаки — в сброс.`}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Чужой выжил: Ран {event.woundsTotal} против Стойкости {event.toughnessTotal}. Раны остаются на
                  миниатюре до следующей успешной атаки (стр. 20).
                </p>
              )}
            </div>
          ) : isMelee ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div
                  role="img"
                  aria-label={`Кубик Боя: ${COMBAT_DIE_PRESENTATION[event.dieFace].label}`}
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-orange-400/70 bg-slate-950 text-center font-mono text-lg font-bold leading-tight text-orange-300 motion-safe:animate-die-roll motion-reduce:animate-none"
                >
                  {COMBAT_DIE_PRESENTATION[event.dieFace].label}
                </div>
                <p className="text-center text-sm text-slate-400">{COMBAT_DIE_PRESENTATION[event.dieFace].hint}</p>
              </div>

              <div
                role="status"
                className="rounded-lg border border-lime-900/80 bg-lime-950/30 p-3 text-sm text-lime-200"
              >
                Карта Заражения вытянута в сброс до броска — Персонаж заражён (стр. 19, шаг 1).
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <div className="text-sm font-semibold text-white">{INTRUDER_NAMES[event.targetType]}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Раны: {event.woundsBefore} → {event.woundsTotal}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <div className="text-sm font-semibold text-white">{playerName}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {event.seriousWoundTaken ? 'Тяжёлая Травма: +1' : 'Без Травм'}
                  </div>
                </div>
              </div>

              {event.toughnessCards.length > 0 && (
                <div className="rounded-xl border border-red-900/80 bg-slate-950/70 p-4 motion-safe:animate-contact-card motion-reduce:animate-none">
                  <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-red-300">
                    Проверка Стойкости (стр. 20)
                  </div>
                  {event.toughnessCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-800 py-1.5 text-sm last:border-b-0"
                    >
                      <span className="text-slate-200">{card.name}</span>
                      <span className="shrink-0 font-mono text-xs text-amber-300">
                        Стойкость {card.toughness}
                        {card.hasRetreat ? ' • Отступление' : ''}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 text-xs text-slate-400">Сумма Стойкости: {event.toughnessTotal}</div>
                </div>
              )}

              {event.killed ? (
                <div
                  role="alert"
                  className="rounded-lg border border-emerald-500/70 bg-emerald-950/50 p-4 text-emerald-100"
                >
                  <div className="font-bold">
                    {event.targetType === 'LARVA' ? 'ЛИЧИНКА УБИТА' : 'ЧУЖОЙ УБИТ ВРУЧНУЮ!'}
                  </div>
                  <p className="mt-1 text-sm">
                    {event.targetType === 'LARVA'
                      ? '1 Раны достаточно, чтобы убить Личинку: карта Атаки не вытягивается, Останков нет (стр. 20, 22).'
                      : `Ран ${event.woundsTotal} не меньше Стойкости ${event.toughnessTotal}. Миниатюра снята, жетон Останков Чужого — на полу отсека (стр. 20), карта Атаки — в сброс.`}
                  </p>
                </div>
              ) : event.seriousWoundTaken ? (
                <div role="alert" className="rounded-lg border border-red-600/70 bg-red-950/50 p-4 text-red-100">
                  <div className="font-bold">ПРОМАХ — ТЯЖЁЛАЯ ТРАВМА</div>
                  <p className="mt-1 text-sm">
                    Атакованный Чужой немедленно наносит Персонажу 1 Тяжёлую Травму
                    {event.attackerDied
                      ? '. Раны несовместимы с жизнью — Персонаж мёртв (стр. 21).'
                      : ' (стр. 19, 21).'}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Чужой выжил: Ран {event.woundsTotal} против Стойкости {event.toughnessTotal}. Раны остаются на
                  миниатюре до следующей успешной атаки (стр. 20).
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 motion-safe:animate-contact-card motion-reduce:animate-none">
              {isEscape && (
                <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                  Персонаж покидал отсек с Чужими: перед шагом каждый Чужой провёл Атаку в спину, от крупного к мелкому
                  (стр. 19, FAQ Rules 5).
                </p>
              )}
              <div className="rounded-xl border border-red-900/80 bg-slate-950/70 p-4">
                <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-red-300">Результат атаки</div>
                <h3 className="font-heading text-lg text-white">
                  {event.card?.name ?? (event.outcome === 'INFESTATION' ? 'Личинка: инфицирование' : 'Атака подавлена')}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {event.outcome === 'MISS'
                    ? 'Промах: на карте нет символа этого Чужого. Эффект карты не применяется.'
                    : event.outcome === 'INFESTATION'
                      ? 'Личинка снята с поля. Персонаж получает одну карту Заражения в личный сброс. Личинка на планшете не означает раскрытия инфекции на картах.'
                      : event.outcome === 'SUPPRESSED'
                        ? 'Эффект Зова запрещает этой особи атаковать в текущей фазе.'
                        : event.card?.description}
                </p>
              </div>
              {event.victims.map((victim) => (
                <div key={victim.playerId} className="rounded-lg border border-slate-700 p-3 text-sm">
                  <div className="font-semibold text-white">
                    {view.players[victim.playerId]?.name ?? victim.playerId}
                  </div>
                  {victim.isDead ? (
                    <div role="alert" className="mt-1 font-bold text-red-400">
                      ПЕРСОНАЖ ПОГИБ
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-300">
                      Лёгкие Травмы: {victim.lightWounds} • Тяжёлые: {victim.seriousWounds}
                      {victim.hasLarva ? ' • Личинка на планшете' : ''}
                      {victim.hasSlime ? ' • Слизь' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="border-t border-nemesis-border px-5 py-4 sm:px-7">
          <button
            ref={closeButton}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            Продолжить <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Результат уже определён движком. Анимация не меняет исход.
          </p>
        </footer>
      </section>
    </div>
  );
}
