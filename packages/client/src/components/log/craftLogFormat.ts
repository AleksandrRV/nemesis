import type { SanitizedGameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { playerName, type GameLogSegment } from './gameLogModel';

type CraftEvent = Extract<SanitizedGameLogEvent, { type: 'ITEM_CRAFTED' }>;
type QuestEvent = Extract<SanitizedGameLogEvent, { type: 'QUEST_ACTIVATED' }>;

export function formatCraftLogEvent(event: CraftEvent, view: SanitizedGameState): GameLogSegment[] {
  return [
    { text: playerName(view, event.playerId), tone: 'player', strong: true },
    { text: ' создаёт ' },
    { text: `«${event.itemName}»`, tone: 'success', strong: true },
    { text: ` из «${event.componentNames.join('» и «')}»` },
    { text: event.viaCardName ? ` картой «${event.viaCardName}».` : '.' },
  ];
}

export function formatQuestLogEvent(event: QuestEvent, view: SanitizedGameState): GameLogSegment[] {
  return [
    { text: playerName(view, event.playerId), tone: 'player', strong: true },
    { text: ' выполняет квест и получает ' },
    { text: `«${event.itemName}»`, tone: 'warning', strong: true },
    { text: event.sacrificedItemName ? `, сбросив «${event.sacrificedItemName}».` : '.' },
  ];
}
