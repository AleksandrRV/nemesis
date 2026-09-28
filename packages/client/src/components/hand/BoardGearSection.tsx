import React from 'react';
import { Hammer, Hand, Info, Package, Play, Trash2 } from 'lucide-react';
import { COMPONENT_META } from '../crafting/craftingLabels';
import {
  handSlotCapacity,
  mustDropHeavyForArmWound,
  type BoardObject,
  type ItemCard,
  type SanitizedPlayerState,
} from '@nemesis/shared';
import { ACCENT_CLASSES } from './usageIcons';
import { HAND_SLOT_COUNT } from './playerBoardModel';

const OBJECT_NAMES: Record<BoardObject['kind'], string> = {
  CORPSE: 'Труп',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

interface BoardGearSectionProps {
  player: SanitizedPlayerState;
  canAct: boolean;
  onUseItem: (item: ItemCard, location: 'INVENTORY' | 'HAND_SLOT') => void;
  onInspectItem: (item: ItemCard, location: 'INVENTORY' | 'HAND_SLOT') => void;
  onInspectObject: (object: BoardObject) => void;
  onDiscardHeavy: (handSlotIndex: number) => void;
  onCraft: () => void;
  canCraft: boolean;
}

function ComponentSymbols({ item }: { item: ItemCard }) {
  if (item.componentSymbols.length === 0) return null;
  return (
    <span className="flex gap-1" aria-label="Синие символы Компонентов">
      {item.componentSymbols.map((component) => {
        const meta = COMPONENT_META[component];
        return (
          <span
            key={component}
            title={`Компонент: ${meta.label}`}
            className="flex h-5 w-5 items-center justify-center rounded border border-sky-500/70 bg-sky-950/80 text-sky-300"
          >
            <meta.Icon size={11} aria-hidden="true" />
          </span>
        );
      })}
    </span>
  );
}

function AmmoTrack({ item }: { item: ItemCard }) {
  if (item.maxAmmo === null) return null;
  const ammo = item.ammo ?? 0;
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Боезапас ${ammo} из ${item.maxAmmo}`}>
      {Array.from({ length: item.maxAmmo }, (_, index) => (
        <span key={index} className={`h-2 w-1.5 rounded-sm ${index < ammo ? 'bg-amber-400' : 'bg-slate-700'}`} />
      ))}
      <span className="ml-1 font-mono text-[10px] text-slate-400">
        {ammo}/{item.maxAmmo}
      </span>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  tone = 'default',
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
      : tone === 'danger'
        ? 'border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-300'
        : 'border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-8 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export const BoardGearSection: React.FC<BoardGearSectionProps> = ({
  player,
  canAct,
  onUseItem,
  onInspectItem,
  onInspectObject,
  onDiscardHeavy,
  onCraft,
  canCraft,
}) => {
  const inventory = player.inventory ?? [];
  const capacity = handSlotCapacity(player);
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section aria-labelledby="gear-hands" className="flex flex-col gap-2">
        <h3
          id="gear-hands"
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
        >
          <Hand size={12} aria-hidden="true" /> Руки · {player.handSlots.length}/{capacity}
        </h3>
        {mustDropHeavyForArmWound(player) && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-2 text-xs text-red-200">
            «Травма руки»: остался 1 слот руки — бросьте один из Тяжелых Предметов/Объектов, иначе действовать нельзя.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: HAND_SLOT_COUNT }, (_, index) => {
            const slot = player.handSlots[index];
            if (!slot && index >= capacity) {
              return (
                <div
                  key={index}
                  className="flex h-28 w-56 items-center justify-center rounded-xl border border-dashed border-red-900 bg-red-950/20 text-xs italic text-red-300"
                >
                  Рука недоступна: «Травма руки»
                </div>
              );
            }
            if (!slot) {
              return (
                <div
                  key={index}
                  className="flex h-28 w-56 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs italic text-slate-600"
                >
                  Свободная рука
                </div>
              );
            }
            if (slot.source === 'OBJECT') {
              return (
                <article
                  key={index}
                  className="flex h-28 w-56 flex-col justify-between rounded-xl border border-amber-700/60 bg-amber-950/20 p-3"
                >
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Тяжёлый объект</p>
                    <p className="text-sm font-bold text-amber-100">{OBJECT_NAMES[slot.object.kind]}</p>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <IconButton label="Подробнее об объекте" onClick={() => onInspectObject(slot.object)}>
                      <Info size={13} />
                    </IconButton>
                    <IconButton
                      label="Сбросить на пол отсека (без Действия, стр. 22)"
                      tone="danger"
                      onClick={() => onDiscardHeavy(index)}
                    >
                      <Trash2 size={13} /> Сброс
                    </IconButton>
                  </div>
                </article>
              );
            }
            const accent = ACCENT_CLASSES[slot.card.color];
            return (
              <article
                key={index}
                className="relative flex h-28 w-56 flex-col justify-between overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 pt-3.5"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} aria-hidden="true" />
                <div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${accent.text}`}>
                    {slot.card.isWeapon ? 'Оружие' : 'Тяжёлый предмет'}
                  </p>
                  <p className="truncate text-sm font-bold text-white">{slot.card.name}</p>
                  <AmmoTrack item={slot.card} />
                </div>
                <div className="flex justify-end gap-1.5">
                  <IconButton label="Подробнее" onClick={() => onInspectItem(slot.card, 'HAND_SLOT')}>
                    <Info size={13} />
                  </IconButton>
                  <IconButton
                    label="Сбросить (без Действия, стр. 22)"
                    tone="danger"
                    onClick={() => onDiscardHeavy(index)}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                  {!slot.card.isWeapon && (
                    <IconButton
                      label={`Использовать · цена ${slot.card.actionCost}`}
                      tone="primary"
                      disabled={!canAct}
                      onClick={() => onUseItem(slot.card, 'HAND_SLOT')}
                    >
                      <Play size={11} fill="currentColor" /> {slot.card.actionCost}
                    </IconButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="gear-inventory" className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="gear-inventory"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
          >
            <Package size={12} aria-hidden="true" /> Инвентарь · {inventory.length}
          </h3>
          <button
            type="button"
            onClick={onCraft}
            disabled={!canAct}
            title={
              canCraft
                ? 'Создание Предмета [1]: сбросить 2 Предмета с синими символами'
                : 'Открыть чертежи Создаваемых Предметов'
            }
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              canCraft
                ? 'border-sky-400 bg-sky-950/70 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.3)] hover:bg-sky-900'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-600'
            }`}
          >
            <Hammer size={13} aria-hidden="true" /> Создать предмет
          </button>
        </div>
        {inventory.length === 0 ? (
          <p className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-700 px-4 text-center text-xs text-slate-500">
            Предметов нет. Их находят Поиском в исследованных отсеках.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {inventory.map((item) => {
              const accent = ACCENT_CLASSES[item.color];
              return (
                <li
                  key={item.id}
                  className="relative flex h-28 w-48 flex-col justify-between overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 pt-3.5"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${accent.text}`}>
                      {item.isSingleUse ? 'Одноразовый' : 'Многоразовый'}
                    </p>
                    <p className="line-clamp-2 text-[13px] font-bold leading-tight text-white">{item.name}</p>
                  </div>
                  <ComponentSymbols item={item} />
                  <div className="flex justify-end gap-1.5">
                    <IconButton label="Подробнее" onClick={() => onInspectItem(item, 'INVENTORY')}>
                      <Info size={13} />
                    </IconButton>
                    <IconButton
                      label={`Использовать · цена ${item.actionCost}`}
                      tone="primary"
                      disabled={!canAct}
                      onClick={() => onUseItem(item, 'INVENTORY')}
                    >
                      <Play size={11} fill="currentColor" /> {item.actionCost}
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
