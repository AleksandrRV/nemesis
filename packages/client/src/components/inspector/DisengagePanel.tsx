import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface DisengageWeapon {
  id: string;
  name: string;
  ammo: number;
}

export interface DisengageDestination {
  roomId: number;
}

export interface DisengageCompanion {
  playerId: string;
  name: string;
}

interface DisengagePanelProps {
  /** Доступная карта отхода: Солдат «и/или» (2 переноса) или Капитан «или» (1). */
  cardId: 'ACT_SOL_SUPPRESSIVE_FIRE' | 'ACT_CAP_SUPPRESSIVE_FIRE';
  cardName: string;
  weapons: DisengageWeapon[];
  destinations: DisengageDestination[];
  companions: DisengageCompanion[];
  onDispatch: (
    weaponId: string,
    selfTo: number | null,
    companionTo: { playerId: string; roomId: number } | null,
  ) => void;
  onCancel: () => void;
}

/**
 * Отход без Атаки Чужих классовой картой (стр. 19; Шаг 8): «Заградительный
 * огонь» переносит себя и/или другого (до 2), «Огонь на подавление» — себя
 * ИЛИ другого (ровно 1). Цена: карта + 1 ед. Боезапаса; Шум входа работает.
 */
export function DisengagePanel({
  cardId,
  cardName,
  weapons,
  destinations,
  companions,
  onDispatch,
  onCancel,
}: DisengagePanelProps) {
  const [weaponId, setWeaponId] = React.useState<string | null>(weapons[0]?.id ?? null);
  const [selfTo, setSelfTo] = React.useState<number | null>(null);
  const [companionId, setCompanionId] = React.useState<string | null>(null);
  const [companionTo, setCompanionTo] = React.useState<number | null>(null);

  const allowsTwo = cardId === 'ACT_SOL_SUPPRESSIVE_FIRE';
  const companionMove = companionId && companionTo !== null ? { playerId: companionId, roomId: companionTo } : null;
  const canDispatch = weaponId !== null && (selfTo !== null || companionMove !== null);

  return (
    <div className="rounded-lg border border-emerald-500/60 bg-emerald-950/40 p-3 text-xs text-slate-100 space-y-2">
      <div className="flex items-center justify-between font-bold uppercase tracking-wider text-emerald-300">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden="true" /> {cardName}: отход без атак
        </span>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">
          Отмена
        </button>
      </div>
      <p className="text-[10px] leading-snug text-emerald-200/90">
        Цена: карта + 1 ед. Боезапаса. Перемещение без Внеочередных атак (стр. 19); Шум входа в новый отсек — как
        обычно.
      </p>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Сбросить Боезапас с Оружия</span>
        <select
          value={weaponId ?? ''}
          onChange={(event) => setWeaponId(event.target.value || null)}
          className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
        >
          <option value="">— выберите Оружие —</option>
          {weapons.map((weapon) => (
            <option key={weapon.id} value={weapon.id} disabled={weapon.ammo < 1}>
              {weapon.name} (Боезапас: {weapon.ammo})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Мне — в соседний отсек</span>
        <select
          value={selfTo ?? ''}
          onChange={(event) => setSelfTo(event.target.value ? Number(event.target.value) : null)}
          className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
        >
          <option value="">— остаться —</option>
          {destinations.map((destination) => (
            <option key={destination.roomId} value={destination.roomId}>
              Отсек #{destination.roomId}
            </option>
          ))}
        </select>
      </label>

      {allowsTwo && companions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Перенести другого</span>
            <select
              value={companionId ?? ''}
              onChange={(event) => {
                setCompanionId(event.target.value || null);
                setCompanionTo(null);
              }}
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="">— никого —</option>
              {companions.map((companion) => (
                <option key={companion.playerId} value={companion.playerId}>
                  {companion.name}
                </option>
              ))}
            </select>
          </label>
          {companionId && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Его — в отсек</span>
              <select
                value={companionTo ?? ''}
                onChange={(event) => setCompanionTo(event.target.value ? Number(event.target.value) : null)}
                className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
              >
                <option value="">— выберите —</option>
                {destinations.map((destination) => (
                  <option key={destination.roomId} value={destination.roomId}>
                    #{destination.roomId}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canDispatch}
        onClick={() => {
          if (!canDispatch) return;
          onDispatch(weaponId!, selfTo, companionMove);
        }}
        className={`w-full rounded px-2 py-1.5 font-bold transition ${
          canDispatch
            ? 'bg-emerald-700 text-white hover:bg-emerald-600'
            : 'cursor-not-allowed bg-slate-900 text-slate-600'
        }`}
      >
        Отойти без атак [карта + 1 Боезапас]
      </button>
    </div>
  );
}
