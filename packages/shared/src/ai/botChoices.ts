import { getItemEffectKind } from '../data/itemEffectKinds.js';
import type { GameAction } from '../types/actions.js';
import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import type { PendingDecision } from '../types/decisions.js';
import { CONSENT_OPTION, DISMISS_OPTION, EXCHANGE_OPTION } from '../types/decisionOptions.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import type { BotMind } from './botMind.js';
import { planObjective } from './botObjectivePlanner.js';
import { roomThreat, roundsLeft } from './botRisk.js';
import { trustIn } from './botSocial.js';
import type { BotTuning } from './botTuning.js';

const HEALING_ITEMS = new Set(['BANDAGES', 'MEDKIT']);

function answer(decision: PendingDecision, selectedOption: string): GameAction {
  return { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: decision.id, selectedOption } };
}

function hasLoadedWeapon(self: SanitizedPlayerState): boolean {
  return self.handSlots.some((slot) => slot.source === 'ITEM' && slot.card.isWeapon && (slot.card.ammo ?? 0) > 0);
}

/** Ценность Предмета для бота сейчас: оружие без оружия, лечение с ранами, Тяжёлое — только если есть место. */
export function itemValue(item: ItemCard, self: SanitizedPlayerState): number {
  const kind = getItemEffectKind(item);
  let value = 1;
  if (item.isWeapon) value += hasLoadedWeapon(self) ? 1 : 3;
  if (kind !== null && HEALING_ITEMS.has(kind)) value += self.lightWounds + self.seriousWounds.length > 0 ? 2 : 0.5;
  if (item.componentSymbols.length > 0) value += 0.3;
  if (item.isHeavy && self.handSlots.length >= 2) value -= 1.5;
  return value;
}

function bestItemId(cards: readonly ItemCard[], self: SanitizedPlayerState): string | undefined {
  return [...cards].sort((left, right) => itemValue(right, self) - itemValue(left, self))[0]?.id;
}

function whiteRoomDeck(view: SanitizedGameState, self: SanitizedPlayerState): ItemDeckColor | undefined {
  const order: ItemDeckColor[] = hasLoadedWeapon(self) ? ['GREEN', 'YELLOW', 'RED'] : ['RED', 'YELLOW', 'GREEN'];
  return order.find((color) => view.decks.items[color].drawPileCount > 0);
}

/** Цель при Первом Контакте (стр. 12): та, что ближе к выполнению по планировщику. */
function chosenObjective(view: SanitizedGameState, mind: BotMind, ids: readonly string[], tuning: BotTuning) {
  const cards = (view.players[mind.botId]?.objectives ?? []).filter((card) => ids.includes(card.id));
  const ranked = cards
    .map((card) => ({ id: card.id, proximity: planObjective(view, mind, card, 1, tuning)?.proximity ?? 0 }))
    .sort((left, right) => right.proximity - left.proximity);
  return ranked[0]?.id ?? ids[0];
}

function exchangeAnswer(
  mind: BotMind,
  decision: Extract<PendingDecision, { type: 'EXCHANGE_CONSENT' }>,
  tuning: BotTuning,
) {
  const lines = decision.exchange.lines;
  const gives = lines.filter((line) => line.fromPlayerId === mind.botId);
  const receives = lines.filter((line) => line.toPlayerId === mind.botId);
  if (gives.length === 0) return EXCHANGE_OPTION.ACCEPT;
  const promised = mind.ownPromises.some(
    (promise) =>
      promise.sincere && promise.topic === 'NEED_ITEM' && promise.requesterId === decision.exchange.initiatorId,
  );
  const model = mind.players[decision.exchange.initiatorId];
  const trusted = model ? trustIn(model, tuning) > 0.6 : false;
  return promised || (receives.length >= gives.length && trusted) ? EXCHANGE_OPTION.ACCEPT : EXCHANGE_OPTION.DECLINE;
}

function repositionAnswer(
  view: SanitizedGameState,
  mind: BotMind,
  decision: Extract<PendingDecision, { type: 'REPOSITION_CONSENT' }>,
  tuning: BotTuning,
) {
  const self = view.players[mind.botId];
  if (!self) return CONSENT_OPTION.DECLINE;
  const safer = roomThreat(view, decision.targetRoomId, tuning) <= roomThreat(view, self.roomId, tuning);
  return safer ? CONSENT_OPTION.ACCEPT : CONSENT_OPTION.DECLINE;
}

function podAnswer(view: SanitizedGameState, mind: BotMind): string {
  const waiting = mind.ownPromises.some(
    (promise) => promise.sincere && promise.topic === 'WAIT_IN_POD' && !view.players[promise.requesterId]?.boardedPodId,
  );
  return waiting && roundsLeft(view) > 2 ? 'WAIT' : 'LAUNCH';
}

function discardForHeavy(self: SanitizedPlayerState, incoming: ItemCard): string | undefined {
  const held = self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : []));
  return [...held].sort((left, right) => itemValue(left, self) - itemValue(right, self))[0]?.id ?? incoming.id;
}

/** Ответы на обязательные решения (В8-7-8) по срезу и памяти бота. */
export function decideChoice(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): GameAction | null {
  const decision = view.pendingDecision;
  if (!decision || view.pendingDecisionPlayerId !== mind.botId) return null;
  const self = view.players[mind.botId];
  if (!self) return null;
  switch (decision.type) {
    case 'CHOOSE_OBJECTIVE': {
      const id = chosenObjective(view, mind, decision.objectiveIds, tuning);
      return id ? answer(decision, id) : null;
    }
    case 'REPOSITION_CONSENT':
      return answer(decision, repositionAnswer(view, mind, decision, tuning));
    case 'DISMISS_WINDOW':
      return answer(decision, DISMISS_OPTION.ALLOW);
    case 'EXCHANGE_CONSENT':
      return answer(decision, exchangeAnswer(mind, decision, tuning));
    case 'STEEL_NERVES_OFFER':
      return answer(decision, 'USE_STEEL_NERVES');
    case 'ESCAPE_POD_LAUNCH_CHOICE':
      return answer(decision, podAnswer(view, mind));
    case 'REROLL_COMBAT_DIE':
      return answer(decision, decision.firstFace === 'MISS' ? 'REROLL' : 'KEEP');
    case 'CHOOSE_SEARCH_ITEM':
    case 'CHOOSE_STORAGE_ITEM': {
      const id = bestItemId(decision.cards, self);
      return id ? answer(decision, id) : null;
    }
    case 'CHOOSE_WHITE_ROOM_DECK': {
      const color = whiteRoomDeck(view, self);
      return color ? answer(decision, color) : null;
    }
    case 'CHOOSE_ENERGY_WEAPON': {
      const weakest = self.handSlots
        .flatMap((slot) => (slot.source === 'ITEM' && decision.weaponIds.includes(slot.card.id) ? [slot.card] : []))
        .sort((left, right) => (left.ammo ?? 0) - (right.ammo ?? 0))[0];
      return answer(decision, weakest?.id ?? decision.weaponIds[0]!);
    }
    case 'DISCARD_HEAVY_ITEM_FOR_NEW': {
      const id = discardForHeavy(self, decision.newItem);
      return id ? answer(decision, id) : null;
    }
    case 'ROOM_FIRE_CONTROL_TARGET':
    case 'ROOM_GENERATOR_ACTION':
    case 'CHOOSE_REST_CONTAMINATION_DISCARD':
      return null;
  }
}
