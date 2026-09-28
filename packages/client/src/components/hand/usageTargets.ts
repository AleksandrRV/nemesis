import type { ItemDeckColor, SanitizedGameState } from '@nemesis/shared';
import { playerName, roomLabel } from '../log/gameLogModel';
import { INTRUDER_TYPE_NAMES } from '../log/intruderLogModel';
import {
  adjacentCorridors,
  adjacentOpenRoomIds,
  buildContext,
  computerRooms,
  intruderRoomsNearby,
  intrudersInRoom,
  neighbourRoomIds,
  otherOccupants,
  roomOccupants,
  techRooms,
  toggleableDoors,
  unexploredRooms,
  yellowRooms,
  type UsageContext,
} from './usageContext';
import type { UsageTarget, UsageTargetKind } from './usageTypes';

const DECK_LABELS: Record<ItemDeckColor, string> = {
  RED: 'Красная колода',
  YELLOW: 'Жёлтая колода',
  GREEN: 'Зелёная колода',
};

function roomTarget(ctx: UsageContext, roomId: number, sublabel?: string): UsageTarget {
  return {
    id: String(roomId),
    label: roomId === ctx.room.id ? `${roomLabel(ctx.view, roomId)} — ваш отсек` : roomLabel(ctx.view, roomId),
    icon: 'room',
    sublabel,
  };
}

function doorTargets(ctx: UsageContext, adjacentOnly: boolean): UsageTarget[] {
  return toggleableDoors(ctx, adjacentOnly).map((corridor) => ({
    id: corridor.id,
    label: `${roomLabel(ctx.view, corridor.fromRoomId)} ⇄ ${roomLabel(ctx.view, corridor.toRoomId)}`,
    sublabel: corridor.doorState === 'CLOSED' ? 'Закрыта — будет открыта' : 'Открыта — будет закрыта',
    icon: 'door',
  }));
}

function intruderTarget(ctx: UsageContext, intruderId: string, roomId: number): UsageTarget {
  const token = ctx.view.intrudersPool.boardTokens.find((entry) => entry.id === intruderId);
  const wounds = token?.woundsCount ?? 0;
  return {
    id: intruderId,
    label: token ? INTRUDER_TYPE_NAMES[token.type] : 'Чужой',
    sublabel: wounds > 0 ? `Ран: ${wounds}` : undefined,
    icon: 'intruder',
    group: roomId === ctx.room.id ? 'Ваш отсек' : roomLabel(ctx.view, roomId),
  };
}

function handCardTargets(ctx: UsageContext, contaminationOnly: boolean): UsageTarget[] {
  return ctx.player.actionDeck.hand
    .filter((entry) => !contaminationOnly || !('characterClass' in entry))
    .map((entry) => {
      if ('characterClass' in entry) {
        return { id: entry.id, label: entry.name, sublabel: `Цена ${entry.playCost}`, icon: 'card' as const };
      }
      const status = entry.isScanned ? (entry.isInfected ? 'Инфекция' : 'Стерильна') : 'Не просканирована';
      return { id: entry.id, label: 'Карта Заражения', sublabel: status, icon: 'biohazard' as const };
    });
}

function escapePodTargets(ctx: UsageContext): UsageTarget[] {
  const section =
    ctx.room.definitionId === 'ESCAPE_POD_A' ? 'A' : ctx.room.definitionId === 'ESCAPE_POD_B' ? 'B' : null;
  return Object.values(ctx.view.ship.escapePods)
    .filter((pod) => pod.section === section && !pod.isDestroyed)
    .map((pod) => ({
      id: pod.id,
      label: `Капсула №${pod.number}`,
      sublabel: pod.isLocked ? 'Заблокирована — будет разблокирована' : 'Разблокирована — будет заблокирована',
      icon: 'lock' as const,
    }));
}

function buildTargets(ctx: UsageContext, kind: UsageTargetKind): UsageTarget[] {
  switch (kind) {
    case 'ADJACENT_DOOR':
      return doorTargets(ctx, true);
    case 'ANY_DOOR':
      return doorTargets(ctx, false);
    case 'ADJACENT_DOOR_ANY_STATE':
      return adjacentCorridors(ctx).map((corridor) => ({
        id: corridor.id,
        label: `${roomLabel(ctx.view, corridor.fromRoomId)} ⇄ ${roomLabel(ctx.view, corridor.toRoomId)}`,
        sublabel:
          corridor.doorState === 'DESTROYED'
            ? 'Разрушена — будет заварена (Закрыта)'
            : corridor.doorState === 'CLOSED'
              ? 'Закрыта — будет открыта'
              : 'Открыта — будет закрыта',
        icon: 'door' as const,
      }));
    case 'ESCAPE_POD':
      return escapePodTargets(ctx);
    case 'ANY_ROOM':
      return Object.values(ctx.view.ship.rooms)
        .filter((room) => room.isExplored)
        .map((room) => roomTarget(ctx, room.id));
    case 'ADJACENT_ROOM':
      return adjacentOpenRoomIds(ctx).map((roomId) => roomTarget(ctx, roomId));
    case 'NEIGHBOUR_ROOM':
      return neighbourRoomIds(ctx).map((roomId) =>
        roomTarget(
          ctx,
          roomId,
          intrudersInRoom(ctx, roomId).length > 0 ? `Чужих: ${intrudersInRoom(ctx, roomId).length}` : undefined,
        ),
      );
    case 'PLAYER_OTHER_IN_ROOM':
      return otherOccupants(ctx).map((id) => ({ id, label: playerName(ctx.view, id), icon: 'player' }));
    case 'PLAYER_IN_ROOM_OR_SELF':
      return roomOccupants(ctx).map((id) => ({
        id,
        label: id === ctx.player.id ? `${playerName(ctx.view, id)} — вы` : playerName(ctx.view, id),
        icon: 'player',
      }));
    case 'INTRUDER_IN_ROOM':
      return intrudersInRoom(ctx).map((id) => intruderTarget(ctx, id, ctx.room.id));
    case 'INTRUDER_NEARBY':
      return intruderRoomsNearby(ctx).flatMap((roomId) =>
        intrudersInRoom(ctx, roomId).map((id) => intruderTarget(ctx, id, roomId)),
      );
    case 'INTRUDER_ROOM':
      return intruderRoomsNearby(ctx).map((roomId) =>
        roomTarget(ctx, roomId, `Чужих: ${intrudersInRoom(ctx, roomId).length}`),
      );
    case 'UNEXPLORED_ROOM':
      return unexploredRooms(ctx).map((room) => roomTarget(ctx, room.id, 'Неисследован'));
    case 'TECH_ROOM':
      return techRooms(ctx).map((room) => roomTarget(ctx, room.id, 'Вход в Технические Коридоры'));
    case 'COMPUTER_ROOM':
      return computerRooms(ctx).map((room) => roomTarget(ctx, room.id, 'Компьютер'));
    case 'YELLOW_ROOM':
      return yellowRooms(ctx).map((room) => roomTarget(ctx, room.id, 'Жёлтый отсек'));
    case 'DECK_COLOR':
      return (['RED', 'YELLOW', 'GREEN'] as const)
        .filter((color) => ctx.view.decks.items[color].drawPileCount > 0)
        .map((color) => ({
          id: color,
          label: DECK_LABELS[color],
          sublabel: `${ctx.view.decks.items[color].drawPileCount} карт`,
          icon: 'deck',
        }));
    case 'INVENTORY_ITEM':
      return (ctx.player.inventory ?? []).map((entry) => ({ id: entry.id, label: entry.name, icon: 'item' }));
    case 'HAND_CARD':
      return handCardTargets(ctx, false);
    case 'CONTAMINATION_CARD':
      return handCardTargets(ctx, true);
  }
}

export function getStepTargets(
  view: SanitizedGameState,
  kind: UsageTargetKind,
  excludeIds: readonly string[] = [],
): UsageTarget[] {
  const excluded = new Set(excludeIds);
  return buildTargets(buildContext(view), kind).filter((target) => !excluded.has(target.id));
}
