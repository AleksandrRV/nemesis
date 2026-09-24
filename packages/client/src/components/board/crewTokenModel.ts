import type { CharacterClass, RoomId, SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';

export interface CrewTokenData {
  playerId: string;
  characterClass: CharacterClass;
  orderNumber: number;
  isActive: boolean;
  hasPassed: boolean;
  isInHibernation: boolean;
}

export interface StripSlot {
  dx: number;
}

export interface RoomTopStripLayout {
  crew: StripSlot[];
  objects: StripSlot[];
  scale: number;
}

export const CREW_TOKEN_RADIUS = 9;
export const ROOM_STRIP_OFFSET_Y = -30;
const CREW_PITCH = 20;
const OBJECT_PITCH = 18;
const STRIP_MAX_WIDTH = 64;
const MIN_ITEM_SCALE = 0.7;

export function isCrewOnBoard(player: SanitizedGameState['players'][string]): boolean {
  return !player.isDead && !player.hasEscapedInPod;
}

export function toCrewToken(view: SanitizedGameState, playerId: string): CrewTokenData | null {
  const player = view.players[playerId];
  if (!player) return null;
  return {
    playerId,
    characterClass: player.characterClass,
    orderNumber: player.orderNumber,
    isActive: view.meta.activePlayerId === playerId,
    hasPassed: player.hasPassed,
    isInHibernation: player.isInHibernation,
  };
}

export function buildCrewByRoom(
  view: SanitizedGameState,
  hiddenPlayerIds: ReadonlySet<string> = new Set(),
): Map<RoomId, CrewTokenData[]> {
  const byRoom = new Map<RoomId, CrewTokenData[]>();
  for (const [playerId, player] of Object.entries(view.players)) {
    if (!isCrewOnBoard(player) || hiddenPlayerIds.has(playerId)) continue;
    const token = toCrewToken(view, playerId);
    if (!token) continue;
    const list = byRoom.get(player.roomId) ?? [];
    list.push(token);
    byRoom.set(player.roomId, list);
  }
  for (const list of byRoom.values()) list.sort((a, b) => a.orderNumber - b.orderNumber);
  return byRoom;
}

export function paintOrder(tokens: readonly CrewTokenData[]): CrewTokenData[] {
  return [...tokens].sort((a, b) => Number(a.isActive) - Number(b.isActive));
}

export function layoutRoomTopStrip(crewCount: number, objectCount: number): RoomTopStripLayout {
  const pitches = [...Array<number>(crewCount).fill(CREW_PITCH), ...Array<number>(objectCount).fill(OBJECT_PITCH)];
  if (pitches.length === 0) return { crew: [], objects: [], scale: 1 };

  const naturalWidth = pitches.reduce((sum, pitch) => sum + pitch, 0);
  const squeeze = Math.min(1, STRIP_MAX_WIDTH / naturalWidth);
  const width = naturalWidth * squeeze;

  let cursor = -width / 2;
  const centers = pitches.map((pitch) => {
    const step = pitch * squeeze;
    const center = cursor + step / 2;
    cursor += step;
    return { dx: Number(center.toFixed(2)) };
  });

  return {
    crew: centers.slice(0, crewCount),
    objects: centers.slice(crewCount),
    scale: Math.max(MIN_ITEM_SCALE, squeeze),
  };
}

export function crewTokenLabel(
  token: Pick<CrewTokenData, 'characterClass' | 'orderNumber' | 'isActive' | 'hasPassed' | 'isInHibernation'>,
): string {
  const identity = CREW_IDENTITIES[token.characterClass];
  const status = [
    token.isActive ? 'сейчас ходит' : null,
    token.hasPassed ? 'спасовал' : null,
    token.isInHibernation ? 'в гибернации' : null,
  ].filter((part): part is string => part !== null);
  const base = `Игрок ${token.orderNumber} — ${identity.label}`;
  return status.length > 0 ? `${base} (${status.join(', ')})` : base;
}
