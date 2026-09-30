import { COMBAT_DIE_FACES, injuriesForFace, meleeInjuriesForFace, type CombatDieFace } from '../data/combatDie.js';
import { ACTION_CARD_COMBAT_USE } from '../data/combatUse.js';
import type { IntruderType } from '../types/entities.js';
import type { ActionCard, ItemDeckColor } from '../types/cards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { EngineNumber } from '../types/state.js';
import {
  attackBlock,
  carefulMoveBlock,
  getRoomDeckColor,
  isPlayerInCombat,
  loadedHandWeapon,
  pickUpBlock,
  searchBlock,
} from '../logic/actionRules.js';
import { podCommandsFor } from '../logic/podQueries.js';
import { escapeCost, mustDropHeavyForArmWound } from '../logic/seriousWoundEffects.js';
import { corridorsLeadingInto, findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import { effect, paidCandidate, type Candidate, type CandidateContext } from './botCandidates.js';
import { cardValue, handOf, unscannedContamination } from './botHand.js';
import type { BotMind } from './botMind.js';
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

/** Ожидаемые Раны по граням кубика Боя (стр. 18–19): бот не знает, что выпадет, но знает кубик. */
function expectedWounds(injuries: (face: CombatDieFace, type: IntruderType) => number, type: IntruderType): number {
  return COMBAT_DIE_FACES.reduce((sum, face) => sum + injuries(face, type), 0) / COMBAT_DIE_FACES.length;
}

function withAttack(candidate: Candidate | null, wounds: number, selfRisk: number): Candidate | null {
  return candidate ? { ...candidate, quality: Math.min(1, wounds), selfRisk } : null;
}

/** Рукопашная (стр. 19): Заражение всегда, промах по типу цели — Тяжёлая Травма. */
function meleeRisk(type: IntruderType, tuning: BotTuning): number {
  const misses = COMBAT_DIE_FACES.filter((face) => meleeInjuriesForFace(face, type) === 0).length;
  return (misses / COMBAT_DIE_FACES.length) * tuning.risk.seriousWound + tuning.risk.contamination;
}

function attacks(context: CandidateContext): Candidate[] {
  const { view, self, inCombat, tuning } = context;
  const targets = view.intrudersPool.boardTokens.filter(
    (token) => attackBlock('SHOOT', inCombat, self.roomId, token.roomId) === null,
  );
  const weapons = self.handSlots.flatMap((slot) =>
    slot.source === 'ITEM' && loadedHandWeapon(self, slot.card.id).block === null ? [slot.card.id] : [],
  );
  const fight = effect('FIGHT', { roomId: self.roomId });
  return targets
    .flatMap((target) => [
      ...weapons.map((weaponItemId) =>
        withAttack(
          paidCandidate(
            context,
            'SHOOT',
            1,
            (discardCardIds) => ({
              type: 'ACTION_SHOOT',
              payload: { weaponItemId, targetIntruderId: target.id, discardCardIds },
            }),
            [fight],
          ),
          expectedWounds(injuriesForFace, target.type),
          0,
        ),
      ),
      withAttack(
        paidCandidate(
          context,
          'MELEE',
          1,
          (discardCardIds) => ({
            type: 'ACTION_MELEE',
            payload: { targetIntruderId: target.id, discardCardIds },
          }),
          [fight],
        ),
        expectedWounds(meleeInjuriesForFace, target.type),
        meleeRisk(target.type, tuning),
      ),
    ])
    .filter((candidate): candidate is Candidate => candidate !== null);
}

function objects(context: CandidateContext): Candidate[] {
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
  const drops = self.handSlots.flatMap((slot, handSlotIndex): Candidate[] =>
    slot.source === 'OBJECT'
      ? [
          {
            action: { type: 'ACTION_DISCARD_HEAVY_ITEM', payload: { handSlotIndex } },
            kind: 'DROP',
            effects: [effect('DROP_OBJECT', { objectKind: slot.object.kind })],
            roomId: self.roomId,
            spent: 0,
          },
        ]
      : [],
  );
  return [...pickUps.filter((candidate): candidate is Candidate => candidate !== null), ...drops];
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
  if (mustDropHeavyForArmWound(self)) return objects(context).filter((candidate) => candidate.kind === 'DROP');
  return [
    ...moves(context),
    ...carefulMoves(context),
    ...search(context),
    ...attacks(context),
    ...objects(context),
    ...roomActionCandidates(context, tasks, mind.coordinates.cardId !== null),
    ...repairCards(context),
    ...restCards(context),
    ...exchanges(context, tasks),
    pass(context),
  ];
}
