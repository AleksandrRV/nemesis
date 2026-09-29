import type { ExchangeTransfer, SanitizedGameState } from '@nemesis/shared';
import { handSlotCapacity } from '@nemesis/shared';

type PlayerView = NonNullable<SanitizedGameState['players'][string]>;

export interface ExchangeEntryView {
  id: string;
  label: string;
  sublabel: string;
  isHeavy: boolean;
  ammo: number;
}

export const EXCHANGE_COST = 1;

const OBJECT_LABELS = { CORPSE: 'Труп', EGG: 'Яйцо Чужих', INTRUDER_REMAINS: 'Останки Чужого' } as const;

const COLOR_LABELS: Record<string, string> = {
  RED: 'Красный',
  YELLOW: 'Жёлтый',
  GREEN: 'Зелёный',
  BLUE: 'Создаваемый',
  QUEST: 'Квестовый',
};

export function exchangePartners(view: SanitizedGameState, selfId: string): PlayerView[] {
  const self = view.players[selfId];
  if (!self) return [];
  return Object.values(view.players)
    .filter(
      (player) =>
        player.id !== selfId &&
        player.roomId === self.roomId &&
        !player.isDead &&
        !player.isInHibernation &&
        !player.hasEscapedInPod,
    )
    .sort((left, right) => left.orderNumber - right.orderNumber);
}

function handSlotEntries(player: PlayerView): ExchangeEntryView[] {
  return player.handSlots.map((slot) =>
    slot.source === 'OBJECT'
      ? {
          id: slot.object.id,
          label: OBJECT_LABELS[slot.object.kind],
          sublabel: 'Объект в руках',
          isHeavy: true,
          ammo: 0,
        }
      : {
          id: slot.card.id,
          label: slot.card.name,
          sublabel: slot.card.isWeapon ? `В руках · Боезапас ${slot.card.ammo ?? 0}` : 'В руках',
          isHeavy: true,
          ammo: slot.card.isWeapon ? (slot.card.ammo ?? 0) : 0,
        },
  );
}

export function giveableEntries(player: PlayerView): ExchangeEntryView[] {
  const inventory = (player.inventory ?? [])
    .filter((card) => card.color !== 'QUEST')
    .map((card) => ({
      id: card.id,
      label: card.name,
      sublabel: `Инвентарь · ${COLOR_LABELS[card.color] ?? card.color}`,
      isHeavy: card.isHeavy,
      ammo: 0,
    }));
  return [...handSlotEntries(player), ...inventory];
}

/** Инвентарь партнёра скрыт (стр. 22): просить можно только то, что у него в руках. */
export function requestableEntries(partner: PlayerView): ExchangeEntryView[] {
  return handSlotEntries(partner);
}

export function buildTransfers(
  selfId: string,
  partnerId: string,
  giveIds: readonly string[],
  takeIds: readonly string[],
): ExchangeTransfer[] {
  return [
    ...giveIds.map((entryId) => ({ fromPlayerId: selfId, toPlayerId: partnerId, entryId })),
    ...takeIds.map((entryId) => ({ fromPlayerId: partnerId, toPlayerId: selfId, entryId })),
  ];
}

function freeSlotsAfter(player: PlayerView, outgoing: number, incoming: number): number {
  return handSlotCapacity(player) - (player.handSlots.length - outgoing + incoming);
}

export function exchangeBlocker(
  self: PlayerView,
  partner: PlayerView,
  give: readonly ExchangeEntryView[],
  take: readonly ExchangeEntryView[],
): string | null {
  if (give.length === 0 && take.length === 0) return 'Отметьте, что отдаёте или о чём просите';
  const giveHeavy = give.filter((entry) => entry.isHeavy).length;
  const takeHeavy = take.filter((entry) => entry.isHeavy).length;
  if (freeSlotsAfter(self, giveHeavy, takeHeavy) < 0) return 'У вас не хватит свободных слотов Рук';
  if (freeSlotsAfter(partner, takeHeavy, giveHeavy) < 0) return `У ${partner.name} не хватит свободных слотов Рук`;
  return null;
}
