import {
  QUEST_ACTIVATION_COST,
  questDefinition,
  questReadiness,
  sacrificeCandidates,
  type ItemCard,
  type QuestBlocker,
  type QuestDefinition,
  type QuestItemState,
  type QuestKey,
  type SanitizedGameState,
} from '@nemesis/shared';

export type QuestStatus = 'LOCKED' | 'READY' | 'ACTIVE';

export interface QuestCondition {
  id: string;
  label: string;
  met: boolean;
}

export interface QuestView {
  quest: QuestItemState;
  definition: QuestDefinition;
  status: QuestStatus;
  blocker: QuestBlocker | null;
  conditions: QuestCondition[];
  sacrificeItems: ItemCard[];
  targetRoomId: number | null;
  hint: string;
}

const BLOCKER_HINTS: Record<QuestBlocker, string> = {
  ALREADY_ACTIVE: 'Квест выполнен — Предмет в инвентаре.',
  WRONG_ROOM: 'Доберитесь до нужной комнаты.',
  ROOM_MALFUNCTION: 'Сначала устраните Неисправность в комнате.',
  NO_SACRIFICE: 'Найдите нужный Предмет Поиском.',
};

function ownerParts(view: SanitizedGameState) {
  const player = view.players[view.viewerId];
  return {
    player,
    owned: { inventory: player?.inventory ?? [], handSlots: player?.handSlots ?? [] },
    room: player ? view.ship.rooms[player.roomId] : undefined,
  };
}

function knownRoomId(view: SanitizedGameState, definitionId: string): number | null {
  return (
    Object.values(view.ship.rooms).find((room) => room.isExplored && room.definitionId === definitionId)?.id ?? null
  );
}

export function buildQuestViews(view: SanitizedGameState): QuestView[] {
  const { player, owned, room } = ownerParts(view);
  if (!player?.questItems) return [];
  const roomForCheck = room
    ? { definitionId: room.definitionId ?? null, hasMalfunction: room.hasMalfunction === true }
    : undefined;
  return player.questItems.map((quest) => {
    const definition = questDefinition(quest.questKey);
    const readiness = questReadiness(owned, roomForCheck, quest);
    const activation = definition.activation;
    const sacrificeItems = sacrificeCandidates(owned, definition);
    const conditions: QuestCondition[] =
      activation.kind === 'ROOM'
        ? [
            {
              id: 'ROOM',
              label: `Находиться в комнате «${activation.roomName}»`,
              met: room?.definitionId === activation.roomDefinitionId,
            },
            {
              id: 'WORKING',
              label: 'В комнате нет Неисправности',
              met: room?.definitionId === activation.roomDefinitionId && room.hasMalfunction !== true,
            },
          ]
        : [{ id: 'SACRIFICE', label: `Сбросить: ${activation.label}`, met: sacrificeItems.length > 0 }];
    conditions.push({
      id: 'COST',
      label: `Действие: сбросить ${QUEST_ACTIVATION_COST} карту`,
      met: player.actionDeck.hand.some((card) => 'characterClass' in card),
    });
    const status: QuestStatus = quest.isActivated ? 'ACTIVE' : readiness.ready ? 'READY' : 'LOCKED';
    return {
      quest,
      definition,
      status,
      blocker: readiness.blocker,
      conditions,
      sacrificeItems,
      targetRoomId: activation.kind === 'ROOM' ? knownRoomId(view, activation.roomDefinitionId) : null,
      hint: readiness.blocker ? BLOCKER_HINTS[readiness.blocker] : 'Все условия выполнены — квест можно активировать.',
    };
  });
}

export function questProgress(views: readonly QuestView[]): { active: number; ready: number; total: number } {
  return {
    active: views.filter((entry) => entry.status === 'ACTIVE').length,
    ready: views.filter((entry) => entry.status === 'READY').length,
    total: views.length,
  };
}

export interface QuestUnlock {
  key: string;
  questKey: QuestKey;
  sacrificedItemName?: string;
}

export function collectQuestUnlocks(view: SanitizedGameState, afterSequence: number): QuestUnlock[] {
  return view.gameLog.flatMap((entry) => {
    const event = entry.event;
    if (entry.sequence <= afterSequence || event.type !== 'QUEST_ACTIVATED') return [];
    return [
      {
        key: entry.id,
        questKey: event.questKey,
        ...(event.sacrificedItemName ? { sacrificedItemName: event.sacrificedItemName } : {}),
      },
    ];
  });
}
