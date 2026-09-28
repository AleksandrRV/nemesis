import { describe, expect, it } from 'vitest';
import {
  ACTION_CARDS,
  RED_ITEM_CARDS,
  STARTING_WEAPONS,
  createInitialGameState,
  filterStateForPlayer,
  questItemCardId,
  type ItemCard,
  type QuestKey,
  type SanitizedGameState,
} from '@nemesis/shared';
import { getItemUsage } from '../hand/itemUsage';
import { getActionCardUsage } from '../hand/actionCardUsage';
import { getStepTargets } from '../hand/usageTargets';
import { buildUsePayload } from '../hand/usagePayload';
import { formatPrivateLogEvent } from '../log/privateLogFormat';

function questView(questKey: QuestKey, seed: string): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState(seed, { playerCount: 2 }), 'player-1');
  view.players['player-1']!.questItems = [{ id: 'q-1', name: 'Квест', questKey, isActivated: true }];
  return view;
}

function questCard(): ItemCard {
  return { ...structuredClone(RED_ITEM_CARDS[0]!), id: questItemCardId('q-1'), origin: 'QUEST', color: 'QUEST' };
}

function ownRoom(view: SanitizedGameState) {
  return view.ship.rooms[view.players['player-1']!.roomId]!;
}

describe('Варианты Квестовых Предметов по скану', () => {
  it('Ключ безопасности: сначала Комната, затем Двери, которые нужно Закрыть', () => {
    const view = questView('SECURITY_KEY', 'security-ui');
    const [variant] = getItemUsage(questCard(), view, 'INVENTORY').variants;
    expect(variant!.steps.map((step) => step.kind)).toEqual(['ANY_ROOM', 'ROOM_DOORS_TO_CLOSE']);
    expect(variant!.steps[1]).toMatchObject({ min: 0 });

    const roomId = ownRoom(view).id;
    const doors = getStepTargets(view, 'ROOM_DOORS_TO_CLOSE', [], roomId);
    expect(doors.length).toBeGreaterThan(0);
    expect(getStepTargets(view, 'ROOM_DOORS_TO_CLOSE')).toEqual([]);

    const request = { kind: 'ITEM' as const, card: questCard(), location: 'INVENTORY' as const };
    expect(buildUsePayload(request, variant!, [[String(roomId)], []])).toMatchObject({
      targetRoomId: roomId,
      closedCorridorIds: [],
    });
    expect(buildUsePayload(request, variant!, [[String(roomId)], [doors[0]!.id]]).closedCorridorIds).toEqual([
      doors[0]!.id,
    ]);
  });

  it('Бортовой журнал: нужен исправный Компьютер, цель — любой другой живой Персонаж', () => {
    const view = questView('SHIP_LOG', 'ship-log-ui');
    ownRoom(view).hasComputer = false;
    expect(getItemUsage(questCard(), view, 'INVENTORY').variants[0]).toMatchObject({ available: false });

    ownRoom(view).hasComputer = true;
    ownRoom(view).hasMalfunction = false;
    const [variant] = getItemUsage(questCard(), view, 'INVENTORY').variants;
    expect(variant).toMatchObject({ id: 'SHIP_LOG', available: true });
    const targets = getStepTargets(view, 'PLAYER_ANY_OTHER').map((target) => target.id);
    expect(targets).not.toContain('player-1');
    expect(targets.length).toBe(Object.keys(view.players).length - 1);
  });

  it('Лабораторное оборудование: выбор Объекта с неизученной Слабостью', () => {
    const view = questView('LAB_EQUIPMENT', 'lab-ui');
    ownRoom(view).objects = [];
    view.intrudersPool.weaknessSlots = [{ objectKind: 'EGG', visibility: 'FACE_DOWN' }];
    expect(getItemUsage(questCard(), view, 'INVENTORY').variants[0]).toMatchObject({ available: false });

    ownRoom(view).objects = [{ id: 'egg-1', kind: 'EGG' }];
    const [variant] = getItemUsage(questCard(), view, 'INVENTORY').variants;
    expect(variant).toMatchObject({ id: 'LAB_EQUIPMENT', available: true });
    expect(getStepTargets(view, 'STUDY_OBJECT')).toEqual([{ id: 'EGG', label: 'Яйцо Чужих', icon: 'biohazard' }]);
    const request = { kind: 'ITEM' as const, card: questCard(), location: 'INVENTORY' as const };
    expect(buildUsePayload(request, variant!, [['EGG']])).toMatchObject({ targetObjectKind: 'EGG' });
  });

  it('Автозарядчик: зарядка Боевой винтовки Энергозарядом показана с ценой 0', () => {
    const view = questView('AUTOLOADER', 'autoloader-ui');
    view.players['player-1']!.handSlots = [
      { source: 'ITEM', card: { ...structuredClone(STARTING_WEAPONS.SOLDIER), ammo: 1 } },
    ];
    const charge = structuredClone(RED_ITEM_CARDS.find((card) => card.name === 'Энергозаряд')!);
    const [chargeVariant, doorVariant] = getItemUsage(charge, view, 'INVENTORY').variants;
    expect(chargeVariant).toMatchObject({ cost: 0, available: true });
    expect(doorVariant!.cost).toBeUndefined();

    view.players['player-1']!.questItems = [];
    expect(getItemUsage(charge, view, 'INVENTORY').variants[0]!.cost).toBeUndefined();
  });
});

describe('Компьютер и журнал в интерфейсе', () => {
  it('«Оценка угрозы» недоступна в Неисправной Комнате без Голографического компьютера', () => {
    const view = questView('ARMOR', 'threat-ui');
    ownRoom(view).hasComputer = true;
    ownRoom(view).hasMalfunction = true;
    const card = ACTION_CARDS.find((entry) => entry.id === 'ACT_SCI_THREAT_ASSESSMENT')!;
    expect(getActionCardUsage(card, view).variants[0]!.reason).toContain('исправным Компьютером');

    view.players['player-1']!.questItems = [{ id: 'q-1', name: 'Квест', questKey: 'HOLO_COMPUTER', isActivated: true }];
    expect(getActionCardUsage(card, view).variants[0]!.reason).toBeUndefined();
  });

  it('приватный журнал называет источник просмотра Цели', () => {
    const view = questView('SHIP_LOG', 'peek-ui');
    const text = formatPrivateLogEvent(
      {
        type: 'OBJECTIVE_PEEKED',
        playerId: 'player-1',
        targetPlayerId: 'player-2',
        source: 'SHIP_LOG',
        objectiveNames: ['Личная Цель'],
      },
      view,
    )
      .map((segment) => segment.text)
      .join('');
    expect(text).toContain('Бортовым журналом');
    expect(text).toContain('«Личная Цель»');
  });
});
