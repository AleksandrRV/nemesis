import React from 'react';
import { Skull, X } from 'lucide-react';
import type { BoardObjectKind, SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';
import { INTRUDER_NAMES_RU } from '../board/intruderReference';
import { attackCardPopoverStyle } from './attackCardPresentation';
import { buildIntruderBoardModel } from './intruderBoardModel';

interface IntruderBoardModalProps {
  view: SanitizedGameState;
  onClose: () => void;
}

/**
 * Планшет Чужих — цифровой аналог планшета рядом с полем (Шаги 3–4 плана
 * `doc/intruder-board-ui.md`). Публичная информация только: составы Пула
 * без порядка, кладка, Слабости, лицевой сброс Атак, миниатюры на борту,
 * хроника из журнала.
 *
 * z-[45]: решения движка (DecisionModal, z-50) всегда поверх планшета.
 * Открыт/закрыт — локальное состояние App: F5 не воспроизводит окно.
 */
export const IntruderBoardModal: React.FC<IntruderBoardModalProps> = ({ view, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });
  const model = React.useMemo(() => buildIntruderBoardModel(view), [view]);

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
          <HiveSection model={model} />
          <BroodSection model={model} />

          <AttacksSection model={model} />

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
                        <span className="text-[10px] font-bold uppercase text-red-300 border border-red-700/70 rounded px-1.5 animate-pulse motion-reduce:animate-none">
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

/** Названия Объектов-слотов Слабостей (единый источник для секции и тестов). */
export const WEAKNESS_OBJECT_LABELS: Record<BoardObjectKind, string> = {
  CORPSE: 'Труп Персонажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

/** SVG-яйцо кладки: форма + янтарный градиент; размер задаётся контейнером. */
function EggIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nemesis-egg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C8.6 2 5.4 8.2 5.4 13.2a6.6 6.6 0 0 0 13.2 0C18.6 8.2 15.4 2 12 2z"
        fill="url(#nemesis-egg)"
        stroke="#78350f"
        strokeWidth="0.8"
      />
      <ellipse cx="9.6" cy="12" rx="1.3" ry="1.8" fill="#92400e" opacity="0.55" />
      <ellipse cx="14.2" cy="15" rx="1" ry="1.4" fill="#92400e" opacity="0.45" />
    </svg>
  );
}

function TokenChips({
  entries,
  size = 'default',
}: {
  entries: Array<{ type: keyof typeof INTRUDER_COLORS; label?: string }>;
  size?: 'default' | 'small';
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(({ type, label }) => {
        const color = INTRUDER_COLORS[type];
        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1 rounded-full border font-bold ${size === 'small' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
            style={{ borderColor: `${color}99`, color, backgroundColor: `${color}14` }}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
            {label ?? INTRUDER_NAMES_RU[type]}
          </span>
        );
      })}
    </div>
  );
}

/** A. Улей: мешок с шансами, полоса опустошения, запас, коробка, Первый Контакт. */
function HiveSection({ model }: { model: ReturnType<typeof buildIntruderBoardModel> }) {
  const bagTypes = (Object.keys(model.bagByType) as Array<keyof typeof model.bagByType>).filter(
    (type) => model.bagByType[type] > 0,
  );
  const chanceByType = new Map(model.drawChances.map((chance) => [chance.type, chance]));

  const supplyTotal =
    model.supplyByType.LARVA + model.supplyByType.CREEPER + model.supplyByType.ADULT + model.supplyByType.BREEDER + model.supplyByType.QUEEN;
  const boxTotal = model.boxByType.LARVA + model.boxByType.CREEPER + model.boxByType.ADULT + model.boxByType.BREEDER + model.boxByType.QUEEN;
  const poolTotal = model.bagTotal + supplyTotal + boxTotal;
  const bagPercent = poolTotal > 0 ? Math.round((model.bagTotal / poolTotal) * 100) : 0;

  const supplyTypes = (Object.keys(model.supplyByType) as Array<keyof typeof model.supplyByType>).filter(
    (type) => model.supplyByType[type] > 0,
  );
  const boxTypes = (Object.keys(model.boxByType) as Array<keyof typeof model.boxByType>).filter(
    (type) => model.boxByType[type] > 0,
  );

  return (
    <section aria-label="Улей" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Улей — Пул Чужих</h3>
        {model.bagTotal === 0 && (
          <span className="text-[9px] font-bold uppercase text-amber-300 border border-amber-600/70 rounded px-1.5 py-0.5 bg-amber-950/50">
            Мешок пуст
          </span>
        )}
      </div>

      {/* Мешок: фишки типов с шансом Развития Улья */}
      {bagTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {bagTypes.map((type) => {
            const chance = chanceByType.get(type);
            const color = INTRUDER_COLORS[type];
            const label = `${INTRUDER_NAMES_RU[type]} в мешке: ${model.bagByType[type]}${
              chance ? `, шанс в Развитии Улья ${chance.percent}%` : ''
            }`;
            return (
              <span
                key={type}
                title={label}
                aria-label={label}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold"
                style={{ borderColor: `${color}99`, color, backgroundColor: `${color}14` }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                {INTRUDER_NAMES_RU[type]}: {model.bagByType[type]}
                {chance && <span className="text-slate-400 font-mono font-normal">({chance.percent}%)</span>}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">Мешок пуст — Развитие Улья пропускается.</p>
      )}

      {/* Полоса опустошения мешка против всего живого Пула партии */}
      <div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
            style={{ width: `${bagPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          В мешке <b className="text-slate-300 font-mono">{model.bagTotal}</b> из{' '}
          <b className="text-slate-300 font-mono">{poolTotal}</b> жетонов Пула (запас {supplyTotal}, вышло из игры {boxTotal})
        </p>
      </div>

      {/* Запас рядом с полем */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Запас рядом с полем</p>
        {supplyTypes.length > 0 ? (
          <TokenChips
            size="small"
            entries={supplyTypes.map((type) => ({ type, label: `${INTRUDER_NAMES_RU[type]}: ${model.supplyByType[type]}` }))}
          />
        ) : (
          <p className="text-[11px] text-slate-600 italic">пусто</p>
        )}
      </div>

      {/* Вышедшие из игры */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Вышло из игры</p>
        {boxTypes.length > 0 ? (
          <TokenChips
            size="small"
            entries={boxTypes.map((type) => ({ type, label: `${INTRUDER_NAMES_RU[type]}: ${model.boxByType[type]}` }))}
          />
        ) : (
          <p className="text-[11px] text-slate-600 italic">ни одного</p>
        )}
      </div>

      {/* Первый Контакт */}
      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        Первый Контакт:
        {model.firstEncounterOccurred ? (
          <span className="font-bold text-red-300">случился</span>
        ) : (
          <span className="font-bold text-emerald-300">ещё не было</span>
        )}
      </p>
    </section>
  );
}

/** B. Кладка: 8 ячеек, занятые — живое пульсирующее яйцо. */
function BroodSection({ model }: { model: ReturnType<typeof buildIntruderBoardModel> }) {
  return (
    <section aria-label="Кладка и Слабости" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Кладка: {model.eggsOnBoard}/8</h3>
      <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`Кладка: ${model.eggsOnBoard} из 8 яиц`}>
        {Array.from({ length: 8 }, (_, index) => {
          const filled = index < model.eggsOnBoard;
          return (
            <div
              key={index}
              className={`aspect-square rounded-lg border flex items-center justify-center ${
                filled ? 'bg-amber-950/40 border-amber-500/70' : 'bg-slate-900/40 border-dashed border-slate-800'
              }`}
              aria-hidden="true"
            >
              {filled && (
                <EggIcon className="w-6 h-6 animate-pulse motion-reduce:animate-none" />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 leading-snug">
        Кладку пополняет Королева в Развитие Улья (стр. 10); яйца гибнут в Пожаре. Улей:{' '}
        {model.hive.roomId === null ? 'не обнаружен' : model.hive.explored ? 'исследован' : 'тайл лицом вниз'}.
      </p>

      {/* C. Слабости */}
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 pt-1">Слабости</h3>
      <ul className="space-y-1.5">
        {model.weaknesses.map((slot) => (
          <li
            key={slot.objectKind}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-[11px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5 min-w-0">
                {slot.objectKind === 'CORPSE' ? (
                  <Skull size={12} className="shrink-0 text-slate-500" />
                ) : slot.objectKind === 'EGG' ? (
                  <EggIcon className="w-3 h-3 shrink-0" />
                ) : (
                  <svg viewBox="0 0 96 96" className="w-3 h-3 shrink-0" aria-hidden="true">
                    <path d={INTRUDER_SHAPES.ADULT} fill="#94a3b8" />
                  </svg>
                )}
                {WEAKNESS_OBJECT_LABELS[slot.objectKind]}
              </span>
              {slot.visibility === 'REVEALED' ? (
                <span className="text-emerald-300 font-bold text-right truncate">{slot.card?.name}</span>
              ) : slot.visibility === 'FACE_DOWN' ? (
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <span
                    className="inline-block w-5 h-7 rounded-[3px] border border-emerald-800/80 align-middle"
                    style={{
                      background:
                        'repeating-linear-gradient(45deg, rgba(16,185,129,0.16) 0 3px, rgba(5,7,12,0) 3px 6px), #05070c',
                    }}
                    aria-hidden="true"
                  />
                  не изучено
                </span>
              ) : (
                <span className="text-slate-600 italic shrink-0">слот пуст</span>
              )}
            </div>
            {slot.visibility === 'REVEALED' && slot.card && (
              <p className="mt-1 text-[10px] leading-snug text-slate-500" title={slot.card.description}>
                {slot.card.description}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-500 leading-snug">
        Изучение: Действие комнаты «Лаборатория» с соответствующим Объектом в руке раскрывает Слабость (стр. 21).
      </p>
    </section>
  );
}

/** Русские метки machine-эффектов карт Атаки (для баров анатомии). */
export const ATTACK_EFFECT_LABELS: Record<string, string> = {
  SCRATCH: 'Царапина',
  BITE: 'Укус',
  CLAW_ATTACK: 'Атака когтями',
  TAIL_ATTACK: 'Атака хвостом',
  TRANSFORMATION: 'Трансформация',
  FRENZY: 'Ярость',
  SLIME: 'Слизь',
  CALL: 'Зов',
};

/** Цвета баров эффектов анатомии — те же, что на карточках классов. */
const ATTACK_EFFECT_BAR_COLORS: Record<string, string> = {
  SCRATCH: '#f87171',
  BITE: '#fb923c',
  CLAW_ATTACK: '#f472b6',
  TAIL_ATTACK: '#c084fc',
  TRANSFORMATION: '#facc15',
  FRENZY: '#ef4444',
  SLIME: '#38bdf8',
  CALL: '#a855f7',
};

/** Метки типов атакующих с цветом (для баров анатомии). */
const ANATOMY_ATTACKER_LABELS: Record<string, { label: string; color: string }> = {
  CREEPER: { label: 'Крипер', color: INTRUDER_COLORS.CREEPER },
  ADULT: { label: 'Взрослая', color: INTRUDER_COLORS.ADULT },
  BREEDER: { label: 'Трутень', color: INTRUDER_COLORS.BREEDER },
  QUEEN: { label: 'Королева', color: INTRUDER_COLORS.QUEEN },
};

/** D. Колода Атак: лицевой веер сброса + «анатомия угрозы». */
function AttacksSection({ model }: { model: ReturnType<typeof buildIntruderBoardModel> }) {
  const [openCardId, setOpenCardId] = React.useState<string | null>(null);
  const openCard = model.attackDiscardTop.find((card) => card.id === openCardId) ?? null;

  return (
    <section aria-label="Колода Атак" className="lg:col-span-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-400">Колода Атак</h3>
        {model.attackDeckCount === 0 && (
          <span
            className="text-[9px] font-bold uppercase text-amber-300 border border-amber-600/70 rounded px-1.5 py-0.5 bg-amber-950/50"
            title="Следующая проверка Стойкости перетасует сброс в колоду"
          >
            Перетасовка
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span>
          Колода: <b className="text-slate-200 font-mono">{model.attackDeckCount}</b>
        </span>
        <span>
          Сброс: <b className="text-slate-200 font-mono">{model.attackDiscardCount}</b>
        </span>
      </div>

      {/* Веер лицевого сброса: клик — поповер с полной карточкой */}
      {model.attackDiscardTop.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Сброс (лицом вверх)</p>
          <div className="relative h-24 pl-1" role="list" aria-label="Последние карты сброса">
            {model.attackDiscardTop.map((card, index) => {
              const style = attackCardPopoverStyle(card);
              const stack = index * -54;
              const tilt = (index % 2 === 0 ? 1 : -1) * (1.4 + (index % 3) * 0.5);
              return (
                <button
                  key={card.id}
                  type="button"
                  role="listitem"
                  aria-label={`${card.name}, стойкость ${card.toughness}${card.hasRetreat ? ', есть Отступление' : ''}`}
                  aria-expanded={openCardId === card.id}
                  onClick={() => setOpenCardId((current) => (current === card.id ? null : card.id))}
                  style={{ left: `${stack}px`, transform: `rotate(${tilt}deg)`, zIndex: 10 - index, borderColor: style.borderColor }}
                  className={`absolute top-0 w-18 h-24 px-1.5 py-1 rounded-lg border text-left bg-slate-900 shadow-lg shadow-black/40 transition-transform duration-150 ${
                    openCardId === card.id ? 'hover:-translate-y-1.5' : 'hover:-translate-y-2 hover:z-30'
                  }`}
                >
                  <span className="block font-mono font-bold text-sm leading-none" style={{ color: style.color }}>
                    {card.toughness}
                    <span className="block text-[7px] uppercase tracking-wider opacity-70">Стойк.</span>
                  </span>
                  <span className="block mt-1 text-[8.5px] font-bold leading-tight text-slate-200">{card.name}</span>
                  <span className="absolute bottom-1 left-1.5 flex gap-0.5" aria-hidden="true">
                    {card.attackerTypes.map((attacker) => (
                      <span key={attacker} className="h-1.5 w-1.5 rounded-full" style={{ background: INTRUDER_COLORS[attacker] }} />
                    ))}
                  </span>
                  {card.hasRetreat && (
                    <span className="absolute bottom-1 right-1 text-[10px] text-amber-400" title="Отступление">
                      ↩
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Поповер полной карточки */}
          {openCard && (
            <div
              className="mt-2 rounded-lg border bg-slate-900 p-2.5 space-y-1.5 relative"
              style={{ borderColor: attackCardPopoverStyle(openCard).borderColor }}
              role="status"
              aria-label={`Карта Атаки: ${openCard.name}`}
            >
              <button
                type="button"
                onClick={() => setOpenCardId(null)}
                className="absolute top-1.5 right-1.5 text-slate-500 hover:text-slate-300 text-[10px] px-1"
                aria-label="Закрыть карточку"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 flex-wrap pr-5">
                <span className="font-mono font-bold text-red-300 border border-red-800/70 rounded px-1.5">{openCard.toughness}</span>
                <span className="text-xs font-bold text-slate-100">{openCard.name}</span>
                <span className="text-[9px] font-bold uppercase rounded px-1.5 py-0.5" style={attackBadgeStyle(openCard)}>
                  {attackCardPopoverStyle(openCard).classLabel}
                </span>
                {openCard.hasRetreat && <span className="text-[10px] text-amber-400">↩ Отступление</span>}
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">{openCard.description}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                Атакуют:
                {openCard.attackerTypes.map((attacker) => (
                  <span key={attacker} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: INTRUDER_COLORS[attacker] }} />
                    {ANATOMY_ATTACKER_LABELS[attacker]!.label}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">Сброс пуст: Атак ещё не было.</p>
      )}

      <details className="group rounded-lg border border-slate-800 bg-slate-900/70">
        <summary className="flex items-center justify-between cursor-pointer list-none px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          <span title="Состав колоды известен (20 карт); минус видимый сброс — что ещё может выйти">
            Анатомия угрозы: {model.anatomy.remainingCount} из {model.anatomy.totalCount}
          </span>
          <span className="group-open:rotate-180 transition-transform text-slate-500">▾</span>
        </summary>
        <div className="px-2.5 pb-2.5 pt-1 space-y-2">
          <AnatomyBars
            title="По типам атакующих"
            entries={Object.entries(model.anatomy.byAttackerType).map(([type, count]) => ({
              key: type,
              count,
              label: ANATOMY_ATTACKER_LABELS[type]!.label,
              color: ANATOMY_ATTACKER_LABELS[type]!.color,
            }))}
          />
          <AnatomyBars
            title="По эффектам"
            entries={Object.entries(model.anatomy.byEffect).map(([effect, count]) => ({
              key: effect,
              count,
              label: ATTACK_EFFECT_LABELS[effect] ?? effect,
              color: ATTACK_EFFECT_BAR_COLORS[effect] ?? '#94a3b8',
            }))}
          />
        </div>
      </details>
    </section>
  );
}

/** Стиль бейджа класса на поповер-карточке. */
function attackBadgeStyle(card: Parameters<typeof attackCardPopoverStyle>[0]): React.CSSProperties {
  const { color } = attackCardPopoverStyle(card);
  return { color, border: `1px solid ${color}66`, backgroundColor: `${color}14` };
}

/** Один ряд баров анатомии: подпись, полоса, счёт. */
function AnatomyBars({ title, entries }: { title: string; entries: Array<{ key: string; count: number; label: string; color: string }> }) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
      <ul className="space-y-0.5">
        {entries.map(({ key, count, label, color }) => (
          <li key={key} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-24 shrink-0 text-slate-400 truncate" title={label}>
              {label}
            </span>
            <span className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
              <span
                className="block h-full rounded-full transition-all duration-300"
                style={{ width: `${(count / max) * 100}%`, background: color }}
              />
            </span>
            <span className={`w-5 text-right font-mono ${count > 0 ? 'text-slate-200' : 'text-slate-600'}`}>{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
