import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
import { roomIntruders } from '../../utils/roomIntruders';
import { INTRUDER_TYPE_LABELS } from '../../utils/labels';

/** Боевые карты с наведением (id из data/actionCards.ts, v0.4.0 Шаг 8). */
export const TARGETED_COMBAT_CARD_IDS = {
  BURST_FIRE: 'ACT_SOL_BURST_FIRE',
  AIMED_FIRE: 'ACT_SOL_AIMED_FIRE',
  BARRAGE: 'ACT_SOL_SUPPRESSIVE_FIRE',
  SUPPRESSIVE_FIRE: 'ACT_CAP_SUPPRESSIVE_FIRE',
  ADRENALINE: 'ACT_SCO_ADRENALINE',
} as const;

const TARGETED_ID_SET: ReadonlySet<string> = new Set(Object.values(TARGETED_COMBAT_CARD_IDS));

export function isTargetedCombatCard(cardId: string): boolean {
  return TARGETED_ID_SET.has(cardId);
}

export interface CardTargetSelection {
  targetIntruderId?: string;
  weaponSlotIndex?: number;
  targetRoomId?: number;
  option?: string;
}

function roomName(view: SanitizedGameState, roomId: number): string {
  const room = view.ship.rooms[roomId];
  const def =
    (room
      ? (SPECIAL_ROOMS.find((d) => d.id === room.definitionId) ??
        BASIC_ROOMS_1.find((d) => d.id === room.definitionId) ??
        ADDITIONAL_ROOMS_2.find((d) => d.id === room.definitionId))
      : null) ?? null;

  return def ? `${def.name} (#${roomId})` : `Отсек #${roomId}`;
}

/** Разумные defaults: первая особь, первое заряженное оружие, первый сосед, «Я сам»/«Выстрел». */
export function defaultCardSelection(cardId: string, view: SanitizedGameState, playerId: string): CardTargetSelection {
  const player = view.players[playerId];

  if (!player) return {};

  const intruders = roomIntruders(view, player.roomId);
  const weaponIndex = player.handSlots.findIndex(
    (slot) => slot.source === 'ITEM' && slot.card.isWeapon === true && (slot.card.ammo ?? 0) > 0,
  );
  const rooms = findAdjacentOpenRoomIds(view, player.roomId);
  const shootDefaults: CardTargetSelection = {
    ...(intruders[0] ? { targetIntruderId: intruders[0].id } : {}),
    ...(weaponIndex >= 0 ? { weaponSlotIndex: weaponIndex } : {}),
  };
  const roomDefault: CardTargetSelection = rooms[0] !== undefined ? { targetRoomId: rooms[0] } : {};

  switch (cardId) {
    case TARGETED_COMBAT_CARD_IDS.BURST_FIRE:
    case TARGETED_COMBAT_CARD_IDS.AIMED_FIRE:
      return shootDefaults;

    case TARGETED_COMBAT_CARD_IDS.BARRAGE:
    case TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE:
      return { ...roomDefault, option: 'SELF' };

    case TARGETED_COMBAT_CARD_IDS.ADRENALINE:
      return { ...shootDefaults, ...roomDefault, option: 'SHOOT' };

    default:
      return {};
  }
}

/** Полнота наведения: кнопка «Подтвердить» без неё неактивна (движок — истина в последней инстанции). */
export function isSelectionComplete(cardId: string, selection: CardTargetSelection): boolean {
  switch (cardId) {
    case TARGETED_COMBAT_CARD_IDS.BURST_FIRE:
    case TARGETED_COMBAT_CARD_IDS.AIMED_FIRE:
      return selection.targetIntruderId !== undefined && selection.weaponSlotIndex !== undefined;

    case TARGETED_COMBAT_CARD_IDS.BARRAGE:
    case TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE:
      return selection.targetRoomId !== undefined && selection.option !== undefined;

    case TARGETED_COMBAT_CARD_IDS.ADRENALINE:
      if (selection.option === 'SHOOT') {
        return selection.targetIntruderId !== undefined && selection.weaponSlotIndex !== undefined;
      }

      if (selection.option === 'ESCAPE') {
        return selection.targetRoomId !== undefined;
      }

      return false;

    default:
      return true;
  }
}

interface CardTargetingFormProps {
  cardId: string;
  view: SanitizedGameState;
  playerId: string;
  selection: CardTargetSelection;
  onSelectionChange: (selection: CardTargetSelection) => void;
}

const SELECT_CLASS =
  'w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none';

const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1';

export const CardTargetingForm: React.FC<CardTargetingFormProps> = ({
  cardId,
  view,
  playerId,
  selection,
  onSelectionChange,
}) => {
  const player = view.players[playerId];

  if (!player) return null;

  const intruders = roomIntruders(view, player.roomId);
  const weapons = player.handSlots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.source === 'ITEM' && slot.card.isWeapon === true);
  const rooms = findAdjacentOpenRoomIds(view, player.roomId);
  const room = view.ship.rooms[player.roomId];
  const companions = (room?.occupantPlayerIds ?? []).filter((id) => id !== playerId && !view.players[id]?.isDead);
  const allowBoth = cardId === TARGETED_COMBAT_CARD_IDS.BARRAGE;
  const isMoveCard =
    cardId === TARGETED_COMBAT_CARD_IDS.BARRAGE || cardId === TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE;
  const isAdrenaline = cardId === TARGETED_COMBAT_CARD_IDS.ADRENALINE;
  const adrenalineMode = selection.option === 'ESCAPE' ? 'ESCAPE' : 'SHOOT';

  const shootSection = (
    <>
      <div>
        <span className={LABEL_CLASS}>Цель выстрела</span>
        <select
          aria-label="Цель выстрела"
          className={SELECT_CLASS}
          value={selection.targetIntruderId ?? ''}
          onChange={(event) => onSelectionChange({ ...selection, targetIntruderId: event.target.value || undefined })}
        >
          {intruders.length === 0 && <option value="">Нет Чужих в отсеке</option>}
          {intruders.map((intruder) => (
            <option key={intruder.id} value={intruder.id}>
              {INTRUDER_TYPE_LABELS[intruder.type]} (Ран: {intruder.woundsCount})
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className={LABEL_CLASS}>Оружие</span>
        <select
          aria-label="Оружие"
          className={SELECT_CLASS}
          value={selection.weaponSlotIndex ?? ''}
          onChange={(event) =>
            onSelectionChange({
              ...selection,
              weaponSlotIndex: event.target.value === '' ? undefined : Number(event.target.value),
            })
          }
        >
          {weapons.length === 0 && <option value="">Нет оружия в руках</option>}
          {weapons.map(({ slot, index }) => (
            <option key={index} value={index}>
              {slot.source === 'ITEM' ? `${slot.card.name} (патроны: ${slot.card.ammo ?? 0})` : ''}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const roomSection = (
    <div>
      <span className={LABEL_CLASS}>Целевой отсек</span>
      <select
        aria-label="Целевой отсек"
        className={SELECT_CLASS}
        value={selection.targetRoomId ?? ''}
        onChange={(event) =>
          onSelectionChange({
            ...selection,
            targetRoomId: event.target.value === '' ? undefined : Number(event.target.value),
          })
        }
      >
        {rooms.length === 0 && <option value="">Нет пути через открытую Дверь</option>}
        {rooms.map((roomId) => (
          <option key={roomId} value={roomId}>
            {roomName(view, roomId)}
          </option>
        ))}
      </select>
    </div>
  );

  const whoSection = (
    <div>
      <span className={LABEL_CLASS}>Кого увести</span>
      <select
        aria-label="Кого увести"
        className={SELECT_CLASS}
        value={selection.option ?? 'SELF'}
        onChange={(event) => onSelectionChange({ ...selection, option: event.target.value })}
      >
        <option value="SELF">Я сам</option>
        {companions.map((id) => (
          <option key={`other-${id}`} value={`OTHER:${id}`}>
            {view.players[id]?.name ?? id} (я остаюсь)
          </option>
        ))}
        {allowBoth &&
          companions.map((id) => (
            <option key={`both-${id}`} value={`BOTH:${id}`}>
              Я + {view.players[id]?.name ?? id}
            </option>
          ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-2.5 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">Наведение карты</span>
      {isAdrenaline && (
        <div>
          <span className={LABEL_CLASS}>Режим</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectionChange({ ...selection, option: 'SHOOT' })}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${adrenalineMode === 'SHOOT' ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
            >
              Выстрел
            </button>
            <button
              type="button"
              onClick={() => onSelectionChange({ ...selection, option: 'ESCAPE' })}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${adrenalineMode === 'ESCAPE' ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
            >
              Побег
            </button>
          </div>
        </div>
      )}
      {isMoveCard && (
        <>
          {roomSection}
          {whoSection}
        </>
      )}
      {isAdrenaline && adrenalineMode === 'SHOOT' && shootSection}
      {isAdrenaline && adrenalineMode === 'ESCAPE' && roomSection}
      {!isMoveCard && !isAdrenaline && shootSection}
    </div>
  );
};
