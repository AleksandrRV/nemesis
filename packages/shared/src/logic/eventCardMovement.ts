import type { EventCard } from '../types/cards.js';
import type { IntruderEntity } from '../types/entities.js';
import type { CorridorNumber } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { drawSharedCard } from './cardPiles.js';
import { disposeEventCard, resolveEventCardEffect } from './eventEffects.js';
import { appendGameLog } from './gameLog.js';
import { livingPlayersInRoom, removeIntruder, returnTokenToBag } from './intruderPlacement.js';
import { findNoiseTarget } from './shipGraphQueries.js';

/**
 * Шаг 7 Фазы Событий (стр. 10): верхняя карта Событий вытягивается лицом
 * вверх, её верхний блок задаёт Движение Чужих, нижний разыгрывает
 * текстовый эффект, затем карта уходит по правилам судьбы карт.
 */
export function resolveEventCardMovement(state: GameState): void {
  const card = drawSharedCard(state, state.decks.events, 'События');
  appendGameLog(state, {
    type: 'EVENT_CARD_DRAWN',
    round: state.meta.currentRound,
    card: { ...card, intruderTypes: [...card.intruderTypes] },
  });

  playEventCard(state, card);
}

/**
 * Полный розыгрыш одной карты Событий: Движение Чужих по верхнему блоку,
 * текстовый эффект нижнего блока и судьба карты («Подготовка» вызывает
 * этот путь повторно для выбранной карты).
 */
export function playEventCard(state: GameState, card: EventCard): void {
  if (card.corridorNumber !== 'ANY') {
    moveIntrudersByCard(state, card.intruderTypes, card.corridorNumber);
  }
  if (state.meta.phase !== 'GAME_OVER') {
    resolveEventCardEffect(state, card);
  }
  if (state.meta.phase !== 'GAME_OVER') {
    disposeEventCard(state, card);
  }
}

/**
 * Перемещение всех соответствующих карте Чужих вне Боя. Закрытая Дверь
 * направления разрушается сообща: все Чужие, идущие в этот Коридор,
 * остаются в отсеке (стр. 17). Вход в Технические Коридоры снимает
 * миниатюру с поля и сбрасывает Раны (стр. 16); неисследованные отсеки
 * не раскрываются, вход в отсек с Персонажем фиксируется без Контакта
 * (стр. 15, 18).
 */
function moveIntrudersByCard(
  state: GameState,
  cardSymbols: readonly IntruderEntity['type'][],
  corridorNumber: CorridorNumber,
): void {
  const roomIds = Object.values(state.ship.rooms)
    .map((room) => room.id)
    .sort((a, b) => a - b);

  const movers = roomIds.flatMap((roomId) => {
    if (livingPlayersInRoom(state, roomId).length > 0) return [];
    return state.ship.rooms[roomId]!.occupantIntruderIds.map((intruderId) =>
      state.intrudersPool.boardTokens.find((token) => token.id === intruderId),
    ).filter((token): token is IntruderEntity => token !== undefined && cardSymbols.includes(token.type));
  });

  const plans = movers.map((intruder) => ({
    intruder,
    target: findNoiseTarget(state, intruder.roomId, corridorNumber),
  }));

  const closedCorridorIds = new Set(
    plans
      .filter((plan) => plan.target.kind === 'CORRIDOR' && plan.target.corridor.doorState === 'CLOSED')
      .map((plan) => (plan.target.kind === 'CORRIDOR' ? plan.target.corridor.id : '')),
  );

  for (const corridorId of closedCorridorIds) {
    const corridor = Object.values(state.ship.corridors).find((candidate) => candidate.id === corridorId)!;
    corridor.doorState = 'DESTROYED';
    const blockedIds = plans
      .filter((plan) => plan.target.kind === 'CORRIDOR' && plan.target.corridor.id === corridorId)
      .map((plan) => plan.intruder.id);
    appendGameLog(state, {
      type: 'INTRUDERS_BLOCKED_BY_DOOR',
      intruderIds: blockedIds,
      corridorId,
      source: 'EVENT_PHASE',
    });
  }

  for (const plan of plans) {
    const { intruder, target } = plan;
    const fromRoomId = intruder.roomId;

    if (target.kind === 'UNMAPPED') continue;

    if (target.kind === 'TECHNICAL_CORRIDOR') {
      removeIntruder(state, intruder.id);
      // Жетон спрятавшегося Чужого возвращается в Пул (стр. 18: «отложите
      // вытянутый жетон — он может вернуться в пул, если Чужой спрячется»).
      returnTokenToBag(state, intruder.type);
      appendGameLog(state, {
        type: 'INTRUDER_MOVED',
        intruderId: intruder.id,
        intruderType: intruder.type,
        fromRoomId,
        toRoomId: null,
        corridorId: null,
        corridorNumber,
        technicalCorridors: true,
      });
      continue;
    }

    if (closedCorridorIds.has(target.corridor.id)) continue;

    const toRoomId = target.corridor.fromRoomId === fromRoomId ? target.corridor.toRoomId : target.corridor.fromRoomId;
    intruder.roomId = toRoomId;
    state.ship.rooms[fromRoomId]!.occupantIntruderIds = state.ship.rooms[fromRoomId]!.occupantIntruderIds.filter(
      (id) => id !== intruder.id,
    );
    state.ship.rooms[toRoomId]!.occupantIntruderIds.push(intruder.id);
    appendGameLog(state, {
      type: 'INTRUDER_MOVED',
      intruderId: intruder.id,
      intruderType: intruder.type,
      fromRoomId,
      toRoomId,
      corridorId: target.corridor.id,
      corridorNumber,
      technicalCorridors: false,
    });
  }
}
