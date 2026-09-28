import type { ItemCard, QuestKey, SanitizedGameState, SanitizedWeaknessSlotState } from '@nemesis/shared';
import { getRoomDeckColor } from '@nemesis/shared';

export type RoomView = SanitizedGameState['ship']['rooms'][number];
type PlayerView = NonNullable<SanitizedGameState['players'][string]>;

export interface UsageContext {
  view: SanitizedGameState;
  player: PlayerView;
  room: RoomView;
  weapons: ItemCard[];
  energyWeapon: ItemCard | null;
  contaminationCount: number;
}

export function buildContext(view: SanitizedGameState): UsageContext {
  const player = view.players[view.meta.activePlayerId]!;
  const room = view.ship.rooms[player.roomId]!;
  const weapons = player.handSlots
    .filter((slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM')
    .map((slot) => slot.card)
    .filter((card) => card.isWeapon);
  const energyWeapon = weapons.find((card) => card.isEnergyWeapon === true) ?? null;
  const contaminationCount = player.actionDeck.hand.filter((entry) => !('characterClass' in entry)).length;
  return { view, player, room, weapons, energyWeapon, contaminationCount };
}

export function adjacentCorridors(ctx: UsageContext) {
  return Object.values(ctx.view.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === ctx.room.id || corridor.toRoomId === ctx.room.id,
  );
}

function otherEnd(ctx: UsageContext, corridor: ReturnType<typeof adjacentCorridors>[number]): number {
  return corridor.fromRoomId === ctx.room.id ? corridor.toRoomId : corridor.fromRoomId;
}

export function neighbourRoomIds(ctx: UsageContext): number[] {
  return [...new Set(adjacentCorridors(ctx).map((corridor) => otherEnd(ctx, corridor)))];
}

export function adjacentOpenRoomIds(ctx: UsageContext): number[] {
  return [
    ...new Set(
      adjacentCorridors(ctx)
        .filter((corridor) => corridor.doorState !== 'CLOSED')
        .map((corridor) => otherEnd(ctx, corridor)),
    ),
  ];
}

export function toggleableDoors(ctx: UsageContext, adjacentOnly: boolean) {
  const corridors = adjacentOnly ? adjacentCorridors(ctx) : Object.values(ctx.view.ship.corridors);
  return corridors.filter((corridor) => corridor.doorState !== 'DESTROYED');
}

export function engineRoomNumber(ctx: UsageContext): 1 | 2 | 3 | null {
  const match = /^ENGINE_0([123])$/.exec(ctx.room.definitionId ?? '');
  return match ? (Number(match[1]) as 1 | 2 | 3) : null;
}

export function unexploredRooms(ctx: UsageContext): RoomView[] {
  return Object.values(ctx.view.ship.rooms).filter((room) => !room.isExplored);
}

export function techRooms(ctx: UsageContext): RoomView[] {
  return Object.values(ctx.view.ship.rooms).filter(
    (room) => room.id !== ctx.room.id && room.hasTechnicalCorridorEntrance,
  );
}

export function computerRooms(ctx: UsageContext): RoomView[] {
  return Object.values(ctx.view.ship.rooms).filter((room) => room.hasComputer === true && room.hasMalfunction !== true);
}

export function yellowRooms(ctx: UsageContext): RoomView[] {
  return Object.values(ctx.view.ship.rooms).filter(
    (room) => room.id !== ctx.room.id && getRoomDeckColor(room.definitionId ?? null) === 'YELLOW',
  );
}

export function roomOccupants(ctx: UsageContext): string[] {
  return (ctx.room.occupantPlayerIds ?? []).filter((id) => {
    const occupant = ctx.view.players[id];
    return occupant !== undefined && !occupant.isDead && !occupant.hasEscapedInPod;
  });
}

export function otherOccupants(ctx: UsageContext): string[] {
  return roomOccupants(ctx).filter((id) => id !== ctx.player.id);
}

export function playersWithSignal(ctx: UsageContext): string[] {
  return Object.values(ctx.view.players)
    .filter((player) => player.hasSignalSent && !player.isDead)
    .map((player) => player.id);
}

export function livingOtherPlayers(ctx: UsageContext): string[] {
  return Object.values(ctx.view.players)
    .filter((player) => player.id !== ctx.player.id && !player.isDead)
    .map((player) => player.id);
}

export function roomDoors(ctx: UsageContext, roomId: number) {
  return Object.values(ctx.view.ship.corridors).filter(
    (corridor) =>
      (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) && corridor.doorState !== 'DESTROYED',
  );
}

export type StudyObjectKind = SanitizedWeaknessSlotState['objectKind'];

export function studyableObjectKinds(ctx: UsageContext): StudyObjectKind[] {
  const floorKinds = (ctx.room.objects ?? []).map((object) => object.kind);
  const heldKinds = roomOccupants(ctx).flatMap((id) =>
    (ctx.view.players[id]?.handSlots ?? []).flatMap((slot) => (slot.source === 'OBJECT' ? [slot.object.kind] : [])),
  );
  return [...new Set([...floorKinds, ...heldKinds])].filter((kind) =>
    ctx.view.intrudersPool.weaknessSlots.some((slot) => slot.objectKind === kind && slot.visibility === 'FACE_DOWN'),
  );
}

export function hasActiveQuestItem(ctx: UsageContext, questKey: QuestKey): boolean {
  return (ctx.player.questItems ?? []).some((quest) => quest.questKey === questKey && quest.isActivated);
}

export function hasAvailableComputer(ctx: UsageContext): boolean {
  return ctx.room.hasComputer === true && !ctx.room.hasMalfunction;
}

export function intrudersInRoom(ctx: UsageContext, roomId = ctx.room.id): string[] {
  return ctx.view.ship.rooms[roomId]?.occupantIntruderIds ?? [];
}

export function intruderRoomsNearby(ctx: UsageContext): number[] {
  return [ctx.room.id, ...neighbourRoomIds(ctx)].filter((roomId) => intrudersInRoom(ctx, roomId).length > 0);
}

export function combatWeapon(ctx: UsageContext): ItemCard | null {
  return ctx.weapons.find((weapon) => (weapon.ammo ?? 0) > 0) ?? null;
}

export function loadedEnergyWeapon(ctx: UsageContext): ItemCard | null {
  return ctx.weapons.find((weapon) => weapon.isEnergyWeapon === true && (weapon.ammo ?? 0) > 0) ?? null;
}

export function weaponReason(ctx: UsageContext): string | undefined {
  if (ctx.weapons.length === 0) return 'В слотах рук нет Оружия';
  return combatWeapon(ctx) ? undefined : `На «${ctx.weapons[0]!.name}» нет Боезапаса`;
}

export function hasDrawableCards(ctx: UsageContext): boolean {
  return ctx.player.actionDeck.drawPileCount > 0 || ctx.player.actionDeck.discardCount > 0;
}
