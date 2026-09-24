import React from 'react';
import { X } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { INTRUDER_COLORS } from '../board/intruderShapes';
import { INTRUDER_NAMES_RU } from '../board/intruderReference';
import { buildIntruderBoardModel } from './intruderBoardModel';

interface IntruderBoardModalProps {
  view: SanitizedGameState;
  onClose: () => void;
}

/**
 * Планшет Чужих — цифровой аналог планшета рядом с полем (Шаг 3: каркас
 * окна и секции на данных модели; Шаги 4–6 доводят визуал секций).
 * Публичная информация только: составы Пула без порядка, кладка, Слабости,
 * лицевой сброс Атак, миниатюры на борту, хроника из журнала.
 *
 * z-[45]: решения движка (DecisionModal, z-50) всегда поверх планшета.
 * Открыт/закрыт — локальное состояние App: F5 не воспроизводит окно.
 */
export const IntruderBoardModal: React.FC<IntruderBoardModalProps> = ({ view, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });
  const model = React.useMemo(() => buildIntruderBoardModel(view), [view]);

  const bagTypes = (Object.keys(model.bagByType) as Array<keyof typeof model.bagByType>).filter(
    (type) => model.bagByType[type] > 0,
  );
  const chanceByType = new Map(model.drawChances.map((chance) => [chance.type, chance]));

  return (
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Планшет Чужих"
        className="w-full max-w-5xl max-h-[88vh] overflow-y-auto bg-slate-900 border border-emerald-800/70 rounded-2xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.15)] space-y-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-heading tracking-widest text-emerald-300 uppercase">Планшет Чужих</h2>
            <span className="text-[10px] font-mono text-slate-400">
              РАУНД {view.meta.currentRound} • Жетонов в мешке: <b className="text-slate-200">{model.bagTotal}</b>
              {model.bagTotal === 0 && ' — Развитие Улья пропускается'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Закрыть планшет Чужих"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* A. Улей */}
          <section aria-label="Улей" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Улей — Пул Чужих</h3>
            <div className="flex flex-wrap gap-1.5">
              {bagTypes.map((type) => (
                <span
                  key={type}
                  title={`${INTRUDER_NAMES_RU[type]} в мешке: ${model.bagByType[type]}${
                    chanceByType.get(type) ? ` — шанс ${chanceByType.get(type)!.percent}%` : ''
                  }`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold"
                  style={{ borderColor: INTRUDER_COLORS[type], color: INTRUDER_COLORS[type] }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: INTRUDER_COLORS[type] }} />
                  {INTRUDER_NAMES_RU[type]}: {model.bagByType[type]}
                  {chanceByType.get(type) && (
                    <span className="text-slate-400 font-mono">({chanceByType.get(type)!.percent}%)</span>
                  )}
                </span>
              ))}
              {bagTypes.length === 0 && <span className="text-xs text-slate-500 italic">Мешок пуст</span>}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <dt>Запас рядом с полем:</dt>
              <dd className="text-right text-slate-200 font-mono">
                {model.supplyByType.LARVA + model.supplyByType.CREEPER + model.supplyByType.ADULT + model.supplyByType.BREEDER + model.supplyByType.QUEEN}
              </dd>
              <dt>Вышло из игры:</dt>
              <dd className="text-right text-slate-200 font-mono">
                {model.boxByType.LARVA + model.boxByType.CREEPER + model.boxByType.ADULT + model.boxByType.BREEDER + model.boxByType.QUEEN}
              </dd>
              <dt>Первый Контакт:</dt>
              <dd className={`text-right font-bold ${model.firstEncounterOccurred ? 'text-red-300' : 'text-emerald-300'}`}>
                {model.firstEncounterOccurred ? 'случился' : 'ещё не было'}
              </dd>
            </dl>
          </section>

          {/* B. Кладка + C. Слабости */}
          <section aria-label="Кладка и Слабости" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Кладка: {model.eggsOnBoard}/8
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-lg border flex items-center justify-center ${
                    index < model.eggsOnBoard
                      ? 'bg-amber-950/50 border-amber-500/70 text-amber-300'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                  aria-label={index < model.eggsOnBoard ? 'Яйцо' : 'Пустая ячейка кладки'}
                >
                  {index < model.eggsOnBoard && <span className="text-sm">🥚</span>}
                </div>
              ))}
            </div>

            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 pt-1">Слабости</h3>
            <ul className="space-y-1.5">
              {model.weaknesses.map((slot) => (
                <li
                  key={slot.objectKind}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-[11px] flex items-center justify-between gap-2"
                >
                  <span className="text-slate-400">
                    {slot.objectKind === 'CORPSE' ? 'Труп Персонажа' : slot.objectKind === 'EGG' ? 'Яйцо Чужих' : 'Останки Чужого'}
                  </span>
                  {slot.visibility === 'REVEALED' ? (
                    <span className="text-emerald-300 font-bold text-right">{slot.card?.name}</span>
                  ) : slot.visibility === 'FACE_DOWN' ? (
                    <span className="text-slate-500">рубашка</span>
                  ) : (
                    <span className="text-slate-600 italic">пусто</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* D. Колода Атак */}
          <section aria-label="Колода Атак" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-400">Колода Атак</h3>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>
                Колода: <b className="text-slate-200 font-mono">{model.attackDeckCount}</b>
              </span>
              <span>
                Сброс: <b className="text-slate-200 font-mono">{model.attackDiscardCount}</b>
              </span>
            </div>
            {model.attackDiscardTop.length > 0 ? (
              <ul className="space-y-1">
                {model.attackDiscardTop.slice(0, 5).map((card) => (
                  <li
                    key={card.id}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-[11px] flex items-center gap-2"
                  >
                    <span className="font-mono font-bold text-red-300 border border-red-800/70 rounded px-1">{card.toughness}</span>
                    <span className="text-slate-200 truncate">{card.name}</span>
                    {card.hasRetreat && <span className="text-amber-400" title="Отступление">↩</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">Сброс пуст: Атак ещё не было.</p>
            )}
            <p className="text-[10px] text-slate-500">
              Могут выйти: <b className="text-slate-300 font-mono">{model.anatomy.remainingCount}</b> из {model.anatomy.totalCount}
            </p>
          </section>

          {/* E. На борту */}
          <section aria-label="На борту" className="lg:col-span-8 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              На борту: {model.boardTotal}
            </h3>
            {model.boardByRoom.length === 0 ? (
              <p className="text-xs text-slate-500 italic">На борту чисто.</p>
            ) : (
              <ul className="space-y-2">
                {model.boardByRoom.map((room) => (
                  <li key={room.roomId} className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900/70">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-200 font-bold">{room.roomLabel}</span>
                      {room.inCombat && (
                        <span className="text-[10px] font-bold uppercase text-red-300 border border-red-700/70 rounded px-1.5 animate-pulse">
                          В Бою
                        </span>
                      )}
                      {room.onFire && <span className="text-[10px] font-bold uppercase text-orange-300">Пожар</span>}
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {room.tokens.map((token) => (
                        <li key={token.id} className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: INTRUDER_COLORS[token.type] }} />
                          <span className="text-slate-200">{token.typeName}</span>
                          <span className="font-mono">ран: {token.wounds}</span>
                          <span className="text-slate-500">— {token.survivalLabel}</span>
                          {token.suppressed && (
                            <span className="text-[10px] text-sky-300 border border-sky-800/70 rounded px-1">
                              Подавлена (раунд {token.suppressedRound})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-slate-500">
              Улей: {model.hive.roomId === null ? 'не обнаружен' : model.hive.explored ? 'исследован' : 'тайл лицом вниз'}
              {model.hive.playersInside > 0 && ` • Персонажей внутри: ${model.hive.playersInside}`}
              {model.hive.intrudersInside > 0 && ` • Чужих внутри: ${model.hive.intrudersInside}`}
            </p>
          </section>

          {/* F. Хроника улья */}
          <section aria-label="Хроника улья" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Хроника улья</h3>
            {model.chronicle.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Записей пока нет.</p>
            ) : (
              <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {model.chronicle
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li key={entry.sequence} className="text-[11px] text-slate-400 leading-snug flex gap-1.5">
                      {entry.tokenType && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0 mt-1"
                          style={{ background: INTRUDER_COLORS[entry.tokenType] }}
                        />
                      )}
                      <span className="min-w-0">{entry.text}</span>
                    </li>
                  ))}
              </ul>
            )}
            <p className="text-[10px] text-slate-500">
              Контактов: <b className="text-slate-300 font-mono">{model.counters.contacts}</b> • Яиц добавлено:{' '}
              <b className="text-slate-300 font-mono">{model.counters.eggsAdded}</b> / уничтожено:{' '}
              <b className="text-slate-300 font-mono">{model.counters.eggsDestroyed}</b>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
