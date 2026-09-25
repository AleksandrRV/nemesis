import type { SanitizedGameState } from '@nemesis/shared';
import { formatGameLogEntry, roomLabel } from '../log/gameLogModel';

/**
 * Результат использования карты: дельта «до/после» по планшету игрока и кораблю
 * плюс новые записи журнала. Показывается в обязательном окне результата.
 */

export interface CardUseResultLine {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface CardUseResult {
  title: string;
  variantLabel: string;
  /** Текст отказа движка — окно результата в режиме ошибки. */
  error?: string;
  lines: CardUseResultLine[];
  logLines: string[];
}

function handOf(state: SanitizedGameState, playerId: string) {
  return state.players[playerId]?.actionDeck.hand ?? [];
}

function inventoryNames(state: SanitizedGameState, playerId: string): string[] {
  return (state.players[playerId]?.inventory ?? []).map((item) => item.name);
}

function weaponAmmo(state: SanitizedGameState, playerId: string): { name: string; ammo: number } | null {
  const player = state.players[playerId];
  if (!player) return null;
  for (const slot of player.handSlots) {
    if (slot.source === 'ITEM' && slot.card.isWeapon) {
      return { name: slot.card.name, ammo: slot.card.ammo ?? 0 };
    }
  }
  return null;
}

function seriousWoundCount(state: SanitizedGameState, playerId: string): number {
  return state.players[playerId]?.seriousWounds.length ?? 0;
}

function delta(before: number, after: number): string {
  const diff = after - before;
  if (diff === 0) return String(after);
  return `${before} → ${after} (${diff > 0 ? '+' : ''}${diff})`;
}

/** Строит описание результата после успешного действия (или ошибки движка). */
export function buildCardUseResult(
  before: SanitizedGameState,
  after: SanitizedGameState,
  title: string,
  variantLabel: string,
  error?: string,
): CardUseResult {
  const result: CardUseResult = { title, variantLabel, error, lines: [], logLines: [] };
  if (error) return result;

  const playerId = after.meta.activePlayerId;
  const beforePlayer = before.players[playerId];
  const afterPlayer = after.players[playerId];
  if (!beforePlayer || !afterPlayer) return result;

  // Рука
  const beforeHand = handOf(before, playerId).length;
  const afterHand = handOf(after, playerId).length;
  if (beforeHand !== afterHand) {
    result.lines.push({
      text: `Рука: ${delta(beforeHand, afterHand)}`,
      tone: afterHand > beforeHand ? 'good' : 'neutral',
    });
  }

  // Боезапас оружия
  const beforeWeapon = weaponAmmo(before, playerId);
  const afterWeapon = weaponAmmo(after, playerId);
  if (beforeWeapon && afterWeapon && beforeWeapon.ammo !== afterWeapon.ammo) {
    result.lines.push({
      text: `Боезапас «${afterWeapon.name}»: ${delta(beforeWeapon.ammo, afterWeapon.ammo)}`,
      tone: afterWeapon.ammo > beforeWeapon.ammo ? 'good' : 'neutral',
    });
  }

  // Инвентарь
  const beforeItems = inventoryNames(before, playerId);
  const afterItems = inventoryNames(after, playerId);
  for (const name of afterItems) {
    if (!beforeItems.includes(name)) result.lines.push({ text: `Получен Предмет: «${name}»`, tone: 'good' });
  }
  for (const name of beforeItems) {
    if (!afterItems.includes(name)) result.lines.push({ text: `Предмет израсходован: «${name}»`, tone: 'neutral' });
  }

  // Раны / состояние
  const beforeLight = beforePlayer.lightWounds;
  const afterLight = afterPlayer.lightWounds;
  if (beforeLight !== afterLight) {
    result.lines.push({
      text: `Лёгкие Раны: ${delta(beforeLight, afterLight)}`,
      tone: afterLight > beforeLight ? 'bad' : 'good',
    });
  }
  const beforeSerious = seriousWoundCount(before, playerId);
  const afterSerious = seriousWoundCount(after, playerId);
  if (beforeSerious !== afterSerious) {
    result.lines.push({
      text: `Тяжёлые Травмы: ${delta(beforeSerious, afterSerious)}`,
      tone: afterSerious > beforeSerious ? 'bad' : 'good',
    });
  }
  if (!beforePlayer.hasLarva && afterPlayer.hasLarva) {
    result.lines.push({ text: 'Инфекция: в организм попала Личинка', tone: 'bad' });
  }
  if (beforePlayer.hasSlime && !afterPlayer.hasSlime) {
    result.lines.push({ text: 'Маркер Слизи снят', tone: 'good' });
  }
  if (!beforePlayer.hasPassed && afterPlayer.hasPassed) {
    result.lines.push({ text: 'Вы спасовали — ход завершён', tone: 'neutral' });
  }

  // Перемещение
  if (beforePlayer.roomId !== afterPlayer.roomId) {
    result.lines.push({
      text: `Перемещение: ${roomShort(before, beforePlayer.roomId)} → ${roomShort(after, afterPlayer.roomId)}`,
      tone: 'neutral',
    });
  }

  // Двери и Шум в коридорах
  for (const [corridorId, afterCorridor] of Object.entries(after.ship.corridors)) {
    const beforeCorridor = before.ship.corridors[corridorId];
    if (!beforeCorridor) continue;
    if (beforeCorridor.doorState !== afterCorridor.doorState) {
      const label = `${roomShort(after, afterCorridor.fromRoomId)} ⇄ ${roomShort(after, afterCorridor.toRoomId)}`;
      const stateLabel =
        afterCorridor.doorState === 'DESTROYED'
          ? 'Дверь разрушена'
          : afterCorridor.doorState === 'CLOSED'
            ? `Дверь закрыта (${label})`
            : `Дверь открыта (${label})`;
      result.lines.push({ text: stateLabel, tone: afterCorridor.doorState === 'DESTROYED' ? 'bad' : 'neutral' });
    }
    if (!beforeCorridor.hasNoise && afterCorridor.hasNoise) {
      result.lines.push({
        text: `Маркер Шума: ${roomShort(after, afterCorridor.fromRoomId)} ⇄ ${roomShort(after, afterCorridor.toRoomId)}`,
        tone: 'bad',
      });
    }
  }

  // Комнаты: исследование, Пожар, Неисправность
  for (const afterRoom of Object.values(after.ship.rooms)) {
    const beforeRoom = before.ship.rooms[afterRoom.id];
    if (!beforeRoom) continue;
    if (!beforeRoom.isExplored && afterRoom.isExplored) {
      result.lines.push({ text: `Отсек исследован: ${roomShort(after, afterRoom.id)}`, tone: 'good' });
    }
    if (beforeRoom.hasFire !== afterRoom.hasFire && afterRoom.hasFire != null) {
      result.lines.push({
        text: afterRoom.hasFire
          ? `Пожар: ${roomShort(after, afterRoom.id)}`
          : `Пожар потушен: ${roomShort(after, afterRoom.id)}`,
        tone: afterRoom.hasFire ? 'bad' : 'good',
      });
    }
    if (beforeRoom.hasMalfunction !== afterRoom.hasMalfunction && afterRoom.hasMalfunction != null) {
      result.lines.push({
        text: afterRoom.hasMalfunction
          ? `Неисправность: ${roomShort(after, afterRoom.id)}`
          : `Неисправность устранена: ${roomShort(after, afterRoom.id)}`,
        tone: afterRoom.hasMalfunction ? 'bad' : 'good',
      });
    }
  }

  // Новые записи журнала — что именно произошло
  const newEntries = after.gameLog.slice(before.gameLog.length);
  for (const entry of newEntries) {
    const formatted = formatGameLogEntry(entry, after);
    const text = formatted.segments.map((segment) => segment.text).join('');
    if (text.trim().length > 0) result.logLines.push(text);
  }

  return result;
}

function roomShort(state: SanitizedGameState, roomId: number): string {
  const room = state.ship.rooms[roomId];
  if (room?.isExplored && room.definitionId) return roomLabel(state, roomId);
  return `отсек #${String(roomId).padStart(3, '0')}`;
}
