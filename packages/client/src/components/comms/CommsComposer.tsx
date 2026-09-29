import React from 'react';
import type { CommsAddressee, SanitizedGameState } from '@nemesis/shared';
import { ChevronDown, Send, Users } from 'lucide-react';
import { draftText } from './commsPhrases';
import {
  COMPOSER_CATEGORY_LABELS,
  DESTINATION_OPTIONS,
  ITEM_NEED_OPTIONS,
  MARKER_OPTIONS,
  buildComposerDraft,
  corridorOptions,
  itemOptions,
  missingFields,
  playerOptions,
  podOptions,
  roomOptions,
  roomTypeOptions,
  topicsOf,
  type ComposerCategory,
  type ComposerField,
  type ComposerOption,
  type ComposerTopic,
  type ComposerValues,
} from './composerModel';
import { useCommsSender } from './useCommsSender';

const FIELD_LABELS: Record<ComposerField, string> = {
  engine: 'Двигатель',
  engineStatus: 'Состояние',
  engineDeed: 'Что сделал',
  marker: 'Маркер Курса',
  destination: 'Пункт назначения',
  toEarth: 'Куда ведёт Курс',
  room: 'Комната',
  roomType: 'Тип Комнаты',
  item: 'Предмет',
  itemNeed: 'Что нужно',
  pod: 'Капсула',
  player: 'Игрок',
  corridor: 'Коридор',
  doorState: 'Дверь',
};

type ChipOptions = ComposerOption<string | number>[];

function chipOptions(field: ComposerField, view: SanitizedGameState): { options: ChipOptions; asSelect: boolean } {
  switch (field) {
    case 'engine':
      return { options: [1, 2, 3].map((value) => ({ value, label: `№${value}` })), asSelect: false };
    case 'engineStatus':
      return {
        options: [
          { value: 'WORKING', label: 'Исправен' },
          { value: 'DAMAGED', label: 'Сломан' },
        ],
        asSelect: false,
      };
    case 'engineDeed':
      return {
        options: [
          { value: 'REPAIRED', label: 'Починил' },
          { value: 'DAMAGED', label: 'Повредил' },
          { value: 'UNTOUCHED', label: 'Не трогал' },
        ],
        asSelect: false,
      };
    case 'marker':
      return { options: MARKER_OPTIONS, asSelect: false };
    case 'destination':
      return { options: DESTINATION_OPTIONS, asSelect: false };
    case 'toEarth':
      return {
        options: [
          { value: 'YES', label: 'К Земле' },
          { value: 'NO', label: 'Не к Земле' },
        ],
        asSelect: false,
      };
    case 'doorState':
      return {
        options: [
          { value: 'OPEN', label: 'Открыть' },
          { value: 'CLOSED', label: 'Закрыть' },
        ],
        asSelect: false,
      };
    case 'itemNeed':
      return { options: ITEM_NEED_OPTIONS, asSelect: false };
    case 'player':
      return { options: playerOptions(view), asSelect: false };
    case 'pod':
      return { options: podOptions(view), asSelect: false };
    case 'room':
      return { options: roomOptions(view), asSelect: true };
    case 'roomType':
      return { options: roomTypeOptions(), asSelect: true };
    case 'item':
      return { options: itemOptions(), asSelect: true };
    case 'corridor':
      return { options: corridorOptions(view), asSelect: true };
  }
}

function FieldPicker({
  field,
  view,
  values,
  onChange,
}: {
  field: ComposerField;
  view: SanitizedGameState;
  values: ComposerValues;
  onChange: (values: ComposerValues) => void;
}) {
  const { options, asSelect } = chipOptions(field, view);
  const current = values[field];
  const set = (value: string | number | undefined) => onChange({ ...values, [field]: value });
  return (
    <div className="space-y-1 motion-safe:animate-step-enter">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{FIELD_LABELS[field]}</span>
      {asSelect ? (
        <select
          aria-label={FIELD_LABELS[field]}
          value={current === undefined ? '' : String(current)}
          onChange={(event) => {
            const option = options.find((entry) => String(entry.value) === event.target.value);
            set(option?.value);
          }}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
        >
          <option value="">— выберите —</option>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
              {option.hint ? ` · ${option.hint}` : ''}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={FIELD_LABELS[field]}>
          {options.map((option) => {
            const active = current === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set(active ? undefined : option.value)}
                title={option.hint}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  active
                    ? 'scale-105 border-cyan-400 bg-cyan-900/60 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CATEGORIES: readonly ComposerCategory[] = ['CLAIM', 'INTENT', 'REQUEST'];

/** Конструктор фраз (В8-4-2): категория → фраза → предмет → адресат → «Отправить», без свободного текста. */
export const CommsComposer: React.FC<{ view: SanitizedGameState; onSent: () => void }> = ({ view, onSent }) => {
  const sender = useCommsSender(view);
  const [category, setCategory] = React.useState<ComposerCategory>('CLAIM');
  const [topic, setTopic] = React.useState<ComposerTopic | null>(null);
  const [values, setValues] = React.useState<ComposerValues>({});
  const [to, setTo] = React.useState<CommsAddressee>('ALL');

  const pickCategory = (next: ComposerCategory) => {
    setCategory(next);
    setTopic(null);
    setValues({});
  };
  const pickTopic = (next: ComposerTopic) => {
    setTopic(next);
    setValues({});
  };

  const draft = topic ? buildComposerDraft(topic, values, to) : null;
  const left = category === 'REQUEST' ? sender.requestsLeft : sender.ordinaryLeft;
  const blocked = !sender.canSpeakNow ? 'Говорить можно в свой ход.' : left === 0 ? 'Лимит этого хода исчерпан.' : null;

  const send = () => {
    if (!draft || blocked) return;
    sender.send([draft]);
    setTopic(null);
    setValues({});
    onSent();
  };

  return (
    <section
      aria-label="Конструктор фраз"
      className="space-y-3 border-t border-cyan-500/30 bg-slate-950 px-4 py-3 motion-safe:animate-step-enter"
    >
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1" role="tablist">
        {CATEGORIES.map((entry) => {
          const active = entry === category;
          const limit = entry === 'REQUEST' ? sender.requestsLeft : sender.ordinaryLeft;
          return (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickCategory(entry)}
              className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                active ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {COMPOSER_CATEGORY_LABELS[entry]}
              <span className={`rounded px-1 text-[9px] ${active ? 'bg-slate-950/20' : 'bg-slate-800'}`}>{limit}</span>
            </button>
          );
        })}
      </div>

      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {topicsOf(category).map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={topic?.id === entry.id}
            onClick={() => pickTopic(entry)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              topic?.id === entry.id
                ? 'border-cyan-400 bg-cyan-950 text-cyan-100'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {topic && (
        <div key={topic.id} className="space-y-2">
          {topic.fields(values).map((field) => (
            <FieldPicker key={field} field={field} view={view} values={values} onChange={setValues} />
          ))}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Users size={10} aria-hidden="true" /> Кому
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: 'ALL', label: 'Всем' }, ...playerOptions(view)].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={to === option.value}
                  onClick={() => setTo(option.value)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    to === option.value
                      ? 'border-violet-400 bg-violet-900/60 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative min-h-9 flex-1 rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100">
          {draft ? (
            <span key={draftText(view, draft)} className="motion-safe:animate-step-enter">
              {draftText(view, draft)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500">
              <ChevronDown size={12} aria-hidden="true" />
              {topic
                ? `Выберите: ${missingFields(topic, values)
                    .map((field) => FIELD_LABELS[field].toLowerCase())
                    .join(', ')}`
                : 'Выберите фразу'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!draft || blocked !== null}
          title={blocked ?? 'Отправить в эфир'}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-cyan-500 px-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Send size={13} aria-hidden="true" /> В эфир
        </button>
      </div>
      {blocked && <p className="text-[11px] text-amber-300/90">{blocked}</p>}
    </section>
  );
};
