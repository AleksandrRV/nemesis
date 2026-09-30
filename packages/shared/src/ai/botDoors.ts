import { ACTION_CARD_COMBAT_USE, ITEM_COMBAT_USE } from '../data/combatUse.js';
import { getItemEffectKind } from '../data/itemEffectKinds.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { CorridorConnection, RoomId } from '../types/rooms.js';
import { itemUseSurcharge } from '../logic/seriousWoundEffects.js';
import { effect, paidCandidate, type Candidate, type CandidateContext } from './botCandidates.js';
import { cardValue, handOf } from './botHand.js';

function closedDoorsHere(context: CandidateContext): CorridorConnection[] {
  const here = context.self.roomId;
  return Object.values(context.view.ship.corridors).filter(
    (corridor) => corridor.doorState === 'CLOSED' && (corridor.fromRoomId === here || corridor.toRoomId === here),
  );
}

function beyond(context: CandidateContext, corridor: CorridorConnection): RoomId {
  return corridor.fromRoomId === context.self.roomId ? corridor.toRoomId : corridor.fromRoomId;
}

function allowedNow(context: CandidateContext, rule: 'IN_COMBAT' | 'OUT_OF_COMBAT' | null): boolean {
  return rule === null || (rule === 'IN_COMBAT') === context.inCombat;
}

function demolitions(context: CandidateContext, corridor: CorridorConnection): Candidate[] {
  return handOf(context.view, context.botId)
    .filter((card) => card.effect.kind === 'DEMOLITION' && allowedNow(context, ACTION_CARD_COMBAT_USE.DEMOLITION))
    .slice(0, 1)
    .flatMap((card) => {
      const candidate = paidCandidate(
        context,
        'CARD',
        card.playCost,
        (discardCardIds) => ({
          type: 'ACTION_PLAY_CARD',
          payload: { cardId: card.id, targetCorridorId: corridor.id, discardCardIds },
        }),
        [effect('BREAK_DOOR', { corridorId: corridor.id })],
        context.self.roomId,
        [card.id],
      );
      return candidate
        ? [
            {
              ...candidate,
              spent: candidate.spent + cardValue(card, context.tuning),
              cardsUsed: (candidate.cardsUsed ?? 0) + 1,
              opensTo: beyond(context, corridor),
            },
          ]
        : [];
    });
}

/** Инструменты и Энергозаряд открывают Дверь в Коридоре своей Комнаты (стр. 22–23). */
function doorItems(context: CandidateContext, corridor: CorridorConnection): Candidate[] {
  const slots = context.self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : []));
  return [...(context.self.inventory ?? []), ...slots]
    .filter((item) => {
      const kind = getItemEffectKind(item);
      return (kind === 'TOOLS' || kind === 'ENERGY_CHARGE') && allowedNow(context, ITEM_COMBAT_USE[kind]);
    })
    .slice(0, 1)
    .flatMap((item) => {
      const candidate = paidCandidate(
        context,
        'ITEM',
        item.actionCost + itemUseSurcharge(context.self),
        (discardCardIds) => ({
          type: 'ACTION_USE_ITEM',
          payload: { itemId: item.id, option: CARD_OPTION.DOOR, targetCorridorId: corridor.id, discardCardIds },
        }),
        [effect('BREAK_DOOR', { corridorId: corridor.id })],
      );
      return candidate ? [{ ...candidate, opensTo: beyond(context, corridor) }] : [];
    });
}

/** Закрытая Дверь на пути (стр. 17): снести её «Разрушением» или открыть Предметом, чтобы пройти дальше. */
export function doorCandidates(context: CandidateContext): Candidate[] {
  return closedDoorsHere(context).flatMap((corridor) => [
    ...demolitions(context, corridor),
    ...doorItems(context, corridor),
  ]);
}
