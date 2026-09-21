import React from 'react';
import type { GameLogEvent, RoomId, SanitizedGameState } from '@nemesis/shared';
import { Crosshair, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { INTRUDER_TYPE_LABELS } from '../../utils/labels';
import { roomIntruders } from '../../utils/roomIntruders';
import { CombatResultView } from './CombatResultView';

interface ShootModalProps {
  roomId: RoomId;
  onClose: () => void;
}

interface WeaponOption {
  slotIndex: number;
  name: string;
  ammo: number | null;
  maxAmmo: number | null;
}

/** Оружие в руках активного игрока — только из него можно стрелять (стр. 18). */
function weaponOptions(view: SanitizedGameState, playerId: string): WeaponOption[] {
  const player = view.players[playerId];

  if (!player) return [];

  return player.handSlots.flatMap((slot, slotIndex) =>
    slot.source === 'ITEM' && slot.card.isWeapon
      ? [{ slotIndex, name: slot.card.name, ammo: slot.card.ammo, maxAmmo: slot.card.maxAmmo }]
      : [],
  );
}

/**
 * Модалка Стрельбы [1] (стр. 18): выбор оружия и цели, затем результат
 * выстрела из журнала партии. Оплата — выбранные карты руки, как у остальных
 * действий; результат читается из новых записей журнала после отправки.
 */
export const ShootModal: React.FC<ShootModalProps> = ({ roomId, onClose }) => {
  const view = useGameStore((state) => state.view);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);

  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);
  const [logStart, setLogStart] = React.useState<number | null>(null);

  if (!view) return null;

  const activePlayerId = view.meta.activePlayerId;
  const weapons = weaponOptions(view, activePlayerId);
  const targets = roomIntruders(view, roomId);
  const resultEvents: GameLogEvent[] =
    logStart === null ? [] : view.gameLog.slice(logStart).map((entry) => entry.event);

  const handleFire = () => {
    if (selectedWeapon === null || selectedTarget === null) return;

    const discardCardIds = consumePaymentCards(1);
    setLogStart(view.gameLog.length);
    dispatch({
      type: 'ACTION_SHOOT',
      payload: {
        targetIntruderId: selectedTarget,
        weaponSlotIndex: selectedWeapon,
        discardCardIds,
      },
    });
  };

  const handleAgain = () => {
    setLogStart(null);
    setSelectedTarget(null);
  };

  const hasPaymentSelected = selectedCardIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 text-red-400 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Crosshair size={20} />
            <h3 className="text-lg font-heading tracking-wider text-white">СТРЕЛЬБА</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {logStart === null ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Оружие в руках:</p>
              {weapons.length === 0 && (
                <p className="text-xs text-slate-500">Нет оружия в руках — стрелять не из чего.</p>
              )}
              <div className="flex flex-col gap-1.5">
                {weapons.map((weapon) => {
                  const hasAmmo = (weapon.ammo ?? 0) > 0;
                  const isSelected = selectedWeapon === weapon.slotIndex;
                  return (
                    <button
                      key={weapon.slotIndex}
                      type="button"
                      disabled={!hasAmmo}
                      onClick={() => setSelectedWeapon(weapon.slotIndex)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : hasAmmo
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span>{weapon.name}</span>
                      <span>
                        Боезапас: {weapon.ammo ?? '—'}/{weapon.maxAmmo ?? '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Цель в отсеке:</p>
              {targets.length === 0 && <p className="text-xs text-slate-500">Целей в отсеке не осталось.</p>}
              <div className="flex flex-col gap-1.5">
                {targets.map((target) => {
                  const isSelected = selectedTarget === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedTarget(target.id)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{INTRUDER_TYPE_LABELS[target.type]}</span>
                      <span>Ран: {target.woundsCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!hasPaymentSelected && (
              <p className="text-xs text-amber-300">Выберите 1 карту оплаты в руке: без неё выстрел будет отклонён.</p>
            )}

            <button
              type="button"
              disabled={selectedWeapon === null || selectedTarget === null}
              onClick={handleFire}
              className="w-full min-h-[40px] bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg text-sm active:scale-95 transition"
            >
              Огонь [цена: 1]
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {resultEvents.length === 0 && !rejection && (
              <p className="text-xs text-slate-400">Результат обрабатывается…</p>
            )}

            {resultEvents.length === 0 && rejection && (
              <div className="space-y-3">
                <p className="text-xs text-rose-400">Выстрел отклонён: {rejection}</p>
                <button
                  type="button"
                  onClick={handleAgain}
                  className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                >
                  Назад к выбору
                </button>
              </div>
            )}

            <CombatResultView view={view} events={resultEvents} />

            {resultEvents.length > 0 && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAgain}
                  className="flex-1 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                >
                  Ещё выстрел [цена: 1]
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[36px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
