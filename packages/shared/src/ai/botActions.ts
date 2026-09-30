import { ACTION_CARD_COMBAT_USE } from '../data/combatUse.js';
import type { ActionCard, ItemDeckColor } from '../types/cards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { EngineNumber } from '../types/state.js';
import {
  carefulMoveBlock,
  getRoomDeckColor,
  isPlayerInCombat,
  pickUpBlock,
  searchBlock,
} from '../logic/actionRules.js';
import { podCommandsFor } from '../logic/podQueries.js';
import { escapeCost, mustDropHeavyForArmWound } from '../logic/seriousWoundEffects.js';
import { corridorsLeadingInto, findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import { effect, paidCandidate, type Candidate, type CandidateContext } from './botCandidates.js';
import { cardValue, handOf, unscannedContamination } from './botHand.js';
import type { BotMind } from './botMind.js';
import { combatCandidates } from './botCombatActions.js';
import { doorCandidates } from './botDoors.js';
import { craftCandidates, itemCandidates } from './botItemActions.js';
import { roomActionCandidates } from './botRoomActions.js';
import type { BotTask } from './botTasks.js';
import type { BotTuning } from './botTuning.js';

const REPAIR_CARDS = new Set(['BASIC_REPAIR', 'REPAIR', 'FAST_REPAIR']);
const CAREFUL_MOVE_COST = 2;
const SEARCH_DECK_PREFERENCE: readonly ItemDeckColor[] = ['RED', 'YELLOW', 'GREEN'];

function moves(context: CandidateContext): Candidate[] {
  const { view, self, inCombat } = context;
  const cost = inCombat ? escapeCost(self) : 1;
  return findAdjacentOpenRoomIds(view, self.roomId).flatMap((targetRoomId) => {
    const candidate = paidCandidate(
      context,
      inCombat ? 'ESCAPE' : 'MOVE',
      cost,
      (discardCardIds) => ({ type: 'ACTION_MOVE', payload: { targetRoomId, discardCardIds } }),
      view.ship.rooms[targetRoomId]?.isExplored === false ? [effect('EXPLORE', { roomId: targetRoomId })] : [],
      targetRoomId,
    );
    return candidate ? [candidate] : [];
  });
}

/** Осторожно — в свободный Коридор, ведущий в отсек назначения; цена — 2 карты (стр. 13). */
function carefulMoves(context: CandidateContext): Candidate[] {
  const { view, self, inCombat } = context;
  if (inCombat) return [];
  return findAdjacentOpenRoomIds(view, self.roomId).flatMap((targetRoomId) => {
    const corridor = corridorsLeadingInto(view, targetRoomId).find(
      (entry) => carefulMoveBlock(view, inCombat, targetRoomId, { kind: 'CORRIDOR', corridorId: entry.id }) === null,
    );
    if (!corridor) return [];
    const candidate = paidCandidate(
      context,
      'CAREFUL_MOVE',
      CAREFUL_MOVE_COST,
      (discardCardIds) => ({
        type: 'ACTION_CAREFUL_MOVE',
        payload: { targetRoomId, chosenCorridor: { kind: 'CORRIDOR', corridorId: corridor.id }, discardCardIds },
      }),
      view.ship.rooms[targetRoomId]?.isExplored === false ? [effect('EXPLORE', { roomId: targetRoomId })] : [],
      targetRoomId,
    );
    return candidate ? [candidate] : [];
  });
}

function search(context: CandidateContext): Candidate[] {
  const { view, room, inCombat } = context;
  if (searchBlock(room, inCombat)) return [];
  const white = getRoomDeckColor(room.definitionId) === 'WHITE';
  const chosenDeckColor = white
    ? SEARCH_DECK_PREFERENCE.find((color) => view.decks.items[color].drawPileCount > 0)
    : undefined;
  if (white && !chosenDeckColor) return [];
  const candidate = paidCandidate(
    context,
    'SEARCH',
    1,
    (discardCardIds) => ({
      type: 'ACTION_SEARCH',
      payload: { discardCardIds, ...(chosenDeckColor ? { chosenDeckColor } : {}) },
    }),
    [effect('SEARCH')],
  );
  return candidate ? [candidate] : [];
}

function objects(context: CandidateContext, tasks: readonly BotTask[]): Candidate[] {
  const { self, room } = context;
  const pickUps = room.objects
    .filter((object) => pickUpBlock(self, room, object.id) === null)
    .map((object) =>
      paidCandidate(
        context,
        'PICK_UP',
        1,
        (discardCardIds) => ({
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId: object.id, discardCardIds },
        }),
        [effect('PICK_UP', { objectKind: object.kind, objectId: object.id })],
      ),
    );
  return [...pickUps.filter((candidate): candidate is Candidate => candidate !== null), ...drops(context, tasks)];
}

function wantsDrop(tasks: readonly BotTask[], objectKind: string): boolean {
  return tasks.some((entry) => entry.kind === 'DROP_OBJECT' && (entry.detail.objectKind ?? objectKind) === objectKind);
}

/**
 * Сброс из Рук ничего не стоит: Объект бот бросает, только когда этого требует задача (Труп в Операционной);
 * при Тяжёлой Травме «Рука» — любой лишний, и Предмет тоже. Иначе бот поднимал бы и бросал Объект по кругу.
 */
function drops(context: CandidateContext, tasks: readonly BotTask[] | 'FORCED'): Candidate[] {
  const { self } = context;
  return self.handSlots.flatMap((slot, handSlotIndex): Candidate[] => {
    const forced = tasks === 'FORCED';
    if (!forced && (slot.source !== 'OBJECT' || !wantsDrop(tasks, slot.object.kind))) return [];
    return [
      {
        action: { type: 'ACTION_DISCARD_HEAVY_ITEM', payload: { handSlotIndex } },
        kind: 'DROP',
        effects: slot.source === 'OBJECT' ? [effect('DROP_OBJECT', { objectKind: slot.object.kind })] : [],
        roomId: self.roomId,
        spent: slot.source === 'OBJECT' ? 0 : 1,
      },
    ];
  });
}

function engineNumberOf(definitionId: string | null): EngineNumber | null {
  const match = /^ENGINE_0([123])$/.exec(definitionId ?? '');
  return match ? (Number(match[1]) as EngineNumber) : null;
}

function cardCandidate(
  context: CandidateContext,
  card: ActionCard,
  option: string | undefined,
  effects: Candidate['effects'],
): Candidate | null {
  const candidate = paidCandidate(
    context,
    'CARD',
    card.playCost,
    (discardCardIds) => ({
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: card.id, ...(option === undefined ? {} : { option }), discardCardIds },
    }),
    effects,
    context.room.id,
    [card.id],
  );
  return candidate
    ? {
        ...candidate,
        spent: candidate.spent + cardValue(card, context.tuning),
        cardsUsed: (candidate.cardsUsed ?? 0) + 1,
      }
    : null;
}

function playableOutOfCombat(context: CandidateContext, card: ActionCard): boolean {
  return !(context.inCombat && ACTION_CARD_COMBAT_USE[card.effect.kind] === 'OUT_OF_COMBAT');
}

/** Карты ремонта (стр. 24): починить или повредить Двигатель в Машинном Отсеке, сбросить Неисправность. */
function repairCards(context: CandidateContext): Candidate[] {
  const { view, botId, room } = context;
  const engineNumber = engineNumberOf(room.definitionId);
  return handOf(view, botId)
    .filter((card) => REPAIR_CARDS.has(card.effect.kind) && playableOutOfCombat(context, card))
    .flatMap((card) => {
      const options: (Candidate | null)[] = [];
      if (engineNumber !== null) {
        options.push(
          cardCandidate(context, card, CARD_OPTION.ENGINE_REPAIR, [effect('REPAIR_ENGINE', { engineNumber })]),
        );
        options.push(
          cardCandidate(context, card, CARD_OPTION.ENGINE_DAMAGE, [effect('DAMAGE_ENGINE', { engineNumber })]),
        );
      }
      if (room.hasMalfunction)
        options.push(
          cardCandidate(context, card, CARD_OPTION.FIX_ROOM, [effect('FIX_MALFUNCTION', { roomId: room.id })]),
        );
      return options.filter((candidate): candidate is Candidate => candidate !== null);
    });
}

/** «Перезарядка» (стр. 24): Боезапас Оружию, названному на карте, если оно в руке и не полное. */
function reloadCards(context: CandidateContext): Candidate[] {
  const weapons = context.self.handSlots.flatMap((slot) =>
    slot.source === 'ITEM' && slot.card.isWeapon ? [slot.card] : [],
  );
  return handOf(context.view, context.botId)
    .filter((card) => card.effect.kind === 'RELOAD' && playableOutOfCombat(context, card))
    .filter((card) => {
      const hint = card.effect.kind === 'RELOAD' ? card.effect.weaponHint : undefined;
      const weapon = hint === undefined ? weapons[0] : weapons.find((entry) => entry.id.includes(hint));
      return weapon !== undefined && weapon.ammo !== null && weapon.ammo < (weapon.maxAmmo ?? 0);
    })
    .map((card) => cardCandidate(context, card, undefined, [effect('RELOAD')]))
    .filter((candidate): candidate is Candidate => candidate !== null);
}

/** «Отдых» (стр. 20): скан карт Заражения на руке — играется, только когда они есть. */
function restCards(context: CandidateContext): Candidate[] {
  if (unscannedContamination(context.view, context.botId) === 0) return [];
  return handOf(context.view, context.botId)
    .filter((card) => card.effect.kind === 'REST' && playableOutOfCombat(context, card))
    .map((card) => cardCandidate(context, card, undefined, [effect('SCAN_HAND')]))
    .filter((candidate): candidate is Candidate => candidate !== null);
}

function exchanges(context: CandidateContext, tasks: readonly BotTask[]): Candidate[] {
  const { self, room, inCombat } = context;
  if (inCombat) return [];
  const gifts = tasks.filter((entry) => entry.kind === 'GIVE_ITEM' && entry.detail.playerId);
  const item = self.inventory?.[0] ?? null;
  if (!item) return [];
  return gifts
    .filter((entry) => room.occupantPlayerIds.includes(entry.detail.playerId!))
    .map((entry) =>
      paidCandidate(
        context,
        'EXCHANGE',
        1,
        (discardCardIds) => ({
          type: 'ACTION_EXCHANGE',
          payload: {
            discardCardIds,
            transfers: [{ fromPlayerId: self.id, toPlayerId: entry.detail.playerId!, entryId: item.id }],
          },
        }),
        [effect('GIVE_ITEM', { playerId: entry.detail.playerId })],
      ),
    )
    .filter((candidate): candidate is Candidate => candidate !== null);
}

function podCommands(context: CandidateContext): Candidate[] {
  const { view, self } = context;
  return podCommandsFor(view, self).map((command) => ({
    action: { type: 'ACTION_ESCAPE_POD', payload: { command } },
    kind: 'POD',
    effects: command === 'LAUNCH' ? [effect('LAUNCH_POD')] : command === 'STAY' ? [effect('STAY_IN_POD')] : [],
    roomId: self.roomId,
    spent: 0,
  }));
}

function pass(context: CandidateContext): Candidate {
  return {
    action: { type: 'ACTION_PASS', payload: {} },
    kind: 'PASS',
    effects: [],
    roomId: context.self.roomId,
    spent: 0,
  };
}

/** Можно ли боту сейчас ходить: его ход в Фазе Игроков, он на борту, не спасовал и решений не ждут. */
export function isBotsTurn(view: SanitizedGameState, botId: string): boolean {
  const self = view.players[botId];
  return (
    view.meta.phase === 'PLAYER_PHASE' &&
    view.meta.activePlayerId === botId &&
    view.pendingDecision === null &&
    view.pendingDecisionPlayerId === null &&
    self !== undefined &&
    !self.isDead &&
    !self.hasPassed &&
    !self.isInHibernation &&
    !self.hasEscapedInPod
  );
}

/**
 * Генератор допустимых Действий по срезу (В8-7-1): правила — те же предикаты `actionRules`, что проверяет
 * движок; оплата — самые дешёвые для бота карты руки. Пас есть всегда.
 */
export function generateCandidates(
  view: SanitizedGameState,
  mind: BotMind,
  tasks: readonly BotTask[],
  tuning: BotTuning,
): Candidate[] {
  const self = view.players[mind.botId];
  const room = self ? view.ship.rooms[self.roomId] : undefined;
  if (!self || !room || !isBotsTurn(view, mind.botId)) return [];
  const context: CandidateContext = {
    view,
    botId: mind.botId,
    self,
    room,
    inCombat: isPlayerInCombat(view, mind.botId),
    tuning,
  };
  if (self.boardedPodId) return podCommands(context);
  if (mustDropHeavyForArmWound(self)) return drops(context, 'FORCED');
  return [
    ...moves(context),
    ...carefulMoves(context),
    ...search(context),
    ...combatCandidates(context),
    ...objects(context, tasks),
    ...roomActionCandidates(context, tasks, mind.coordinates.cardId !== null),
    ...repairCards(context),
    ...restCards(context),
    ...reloadCards(context),
    ...itemCandidates(context),
    ...craftCandidates(context),
    ...doorCandidates(context),
    ...exchanges(context, tasks),
    pass(context),
  ];
}
