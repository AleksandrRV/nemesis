import type { SanitizedGameState } from '../types/sanitized.js';
import type { BotTask } from './botTasks.js';
import type { BotTuning } from './botTuning.js';

/**
 * Задача, которую держит неисправная Комната: её Действие выполняется только там (стр. 17, 25), а другой исправной
 * открытой Комнаты нужного типа нет.
 */
function blockedBy(view: SanitizedGameState, entry: BotTask, definitionId: string): boolean {
  const kinds = entry.place.definitionIds ?? [];
  if (entry.kind === 'FIX_MALFUNCTION' || (entry.place.roomIds?.length ?? 0) > 0 || !kinds.includes(definitionId)) {
    return false;
  }
  return !Object.values(view.ship.rooms).some(
    (room) => room.definitionId !== null && kinds.includes(room.definitionId) && room.hasMalfunction === false,
  );
}

/**
 * Ремонт ключевой Комнаты (стр. 17) наследует ценность самой весомой задачи, которую неисправность закрывает:
 * Пожарная служба — тушение, Контроль шлюзов — Капсулы, Медпункт и Операционная — лечение, Криогенный отсек — Анабиоз.
 */
export function withRepairValue(view: SanitizedGameState, tasks: readonly BotTask[], tuning: BotTuning): BotTask[] {
  return tasks.map((entry) => {
    const roomId = entry.kind === 'FIX_MALFUNCTION' ? entry.detail.roomId : undefined;
    const definitionId = roomId === undefined ? null : view.ship.rooms[roomId]?.definitionId;
    if (!definitionId) return entry;
    const blocked = tasks.filter((other) => blockedBy(view, other, definitionId));
    if (blocked.length === 0) return entry;
    const inherited = Math.max(...blocked.map((other) => other.weight)) * tuning.tactics.repairInheritance;
    return { ...entry, weight: entry.weight + inherited };
  });
}
