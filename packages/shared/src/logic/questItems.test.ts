import { describe, expect, it } from 'vitest';
import { contactState, existingIntruder, expectEngineError } from '../testing/contactFixtures.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { QUEST_DEFINITIONS, questItemCardId, type QuestKey } from '../data/questItems.js';
import { YELLOW_ITEM_CARDS, RED_ITEM_CARDS } from '../data/itemCards.js';
import { GameEngine } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';
import { performIntruderAttack } from './intruderAttacks.js';
import { buildQuestItemCard } from './questItems.js';

function giveQuest(state: GameState, questKey: QuestKey, isActivated = false): string {
  const id = `player-1-quest-${questKey}`;
  const name = QUEST_DEFINITIONS.find((entry) => entry.key === questKey)!.name;
  const quest = { id, name, isActivated, questKey };
  state.players['player-1']!.questItems = [quest];
  if (isActivated) state.players['player-1']!.inventory.push(buildQuestItemCard(quest));
  return id;
}

function setRoom(state: GameState, definitionId: string): number {
  const room = state.ship.rooms[state.players['player-1']!.roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  return room.id;
}

function payment(state: GameState): string[] {
  return [state.players['player-1']!.actionDeck.hand.find((card) => 'characterClass' in card)!.id];
}

function activate(state: GameState, questItemId: string, sacrificeItemId?: string): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_ACTIVATE_QUEST',
    payload: { questItemId, discardCardIds: payment(state), ...(sacrificeItemId ? { sacrificeItemId } : {}) },
  });
}

function item(prefix: string, pool: readonly ItemCard[]): ItemCard {
  return structuredClone(pool.find((entry) => entry.id.startsWith(prefix))!);
}

function useQuestItem(state: GameState, questItemId: string, payload: Record<string, unknown>): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId: questItemCardId(questItemId), discardCardIds: payment(state), ...payload },
  });
}

describe('Квестовые Предметы: подготовка (стр. 8, шаг E)', () => {
  it('каждый Персонаж получает 2 квеста своей роли, неактивные', () => {
    const state = contactState(3, 'quest-setup');
    for (const player of Object.values(state.players)) {
      expect(player.questItems).toHaveLength(2);
      expect(player.questItems.every((quest) => !quest.isActivated)).toBe(true);
      const own = QUEST_DEFINITIONS.filter((entry) => entry.characterClass === player.characterClass).map(
        (entry) => entry.key,
      );
      expect(player.questItems.map((quest) => quest.questKey)).toEqual(own);
    }
    expect(QUEST_DEFINITIONS).toHaveLength(12);
  });

  it('чужие квесты скрыты в срезе игрока', () => {
    const state = contactState(2, 'quest-secret');
    expect(filterStateForPlayer(state, 'player-1').players['player-2']!.questItems).toBeNull();
    expect(filterStateForPlayer(state, 'player-1').players['player-1']!.questItems).toHaveLength(2);
  });
});

describe('Активация квеста [1]', () => {
  it('квест в комнате: вне нужной комнаты — отказ, в ней — Предмет в инвентаре', () => {
    const state = contactState(2, 'quest-room');
    const questId = giveQuest(state, 'SECURITY_KEY');
    setRoom(state, 'STORAGE');
    expectEngineError(() => activate(structuredClone(state), questId), 'CARD_NOT_USABLE_NOW');
    setRoom(state, 'COCKPIT');
    const next = activate(state, questId);
    const player = next.players['player-1']!;
    expect(player.questItems[0]!.isActivated).toBe(true);
    expect(player.inventory.find((entry) => entry.id === questItemCardId(questId))).toMatchObject({
      origin: 'QUEST',
      color: 'QUEST',
    });
    expect(player.actionsPerformedThisRound).toBe(1);
    expect(next.gameLog.map((entry) => entry.event).find((event) => event.type === 'QUEST_ACTIVATED')).toMatchObject({
      questKey: 'SECURITY_KEY',
      itemName: 'Ключ безопасности',
    });
    expectEngineError(() => activate(next, questId), 'CARD_NOT_USABLE_NOW');
  });

  it('Неисправность в комнате блокирует активацию', () => {
    const state = contactState(2, 'quest-malfunction');
    const questId = giveQuest(state, 'SECURITY_KEY');
    setRoom(state, 'COCKPIT');
    state.ship.rooms[state.players['player-1']!.roomId]!.hasMalfunction = true;
    expectEngineError(() => activate(state, questId), 'CARD_NOT_USABLE_NOW');
  });

  it('квест со сбросом: нужный Предмет уходит в сброс своей колоды', () => {
    const state = contactState(2, 'quest-sacrifice');
    const questId = giveQuest(state, 'ARMOR');
    const tools = item('ITEM_YEL_TOOLS_', YELLOW_ITEM_CARDS);
    const charge = item('ITEM_RED_ENERGY_CHARGE_', RED_ITEM_CARDS);
    state.players['player-1']!.inventory.push(tools, charge);
    expectEngineError(() => activate(structuredClone(state), questId), 'INVALID_DECISION_OPTION');
    expectEngineError(() => activate(structuredClone(state), questId, charge.id), 'INVALID_DECISION_OPTION');
    const next = activate(state, questId, tools.id);
    expect(next.decks.items.YELLOW.discard.some((entry) => entry.id === tools.id)).toBe(true);
    const names = next.players['player-1']!.inventory.map((entry) => entry.name);
    expect(names).toContain('Броня');
    expect(names).toContain(charge.name);
    expect(names).not.toContain(tools.name);
  });
});

describe('Эффекты активированных Квестовых Предметов', () => {
  it('Броня одноразово гасит Атаку Чужого', () => {
    const state = contactState(2, 'quest-armor');
    giveQuest(state, 'ARMOR', true);
    const intruderId = existingIntruder(state, 'ADULT', state.players['player-1']!.roomId);
    const events: unknown[] = [];
    performIntruderAttack(state, 'player-1', intruderId, (payload) => events.push(payload));
    expect(events[0]).toMatchObject({ outcome: 'SUPPRESSED', armorBlocked: true });
    expect(state.players['player-1']!.inventory.some((entry) => entry.name === 'Броня')).toBe(false);
  });

  it('Ключ безопасности закрывает все открытые Двери выбранной комнаты', () => {
    const state = contactState(2, 'quest-security');
    const questId = giveQuest(state, 'SECURITY_KEY', true);
    const roomId = state.players['player-1']!.roomId;
    const next = useQuestItem(state, questId, { targetRoomId: roomId });
    const doors = Object.values(next.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
    );
    expect(doors.every((corridor) => corridor.doorState !== 'OPEN')).toBe(true);
  });

  it('Плазменная горелка заваривает Разрушенную Дверь', () => {
    const state = contactState(2, 'quest-torch');
    const questId = giveQuest(state, 'PLASMA_TORCH', true);
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (entry) => entry.fromRoomId === roomId || entry.toRoomId === roomId,
    )!;
    corridor.doorState = 'DESTROYED';
    const next = useQuestItem(state, questId, { targetCorridorId: corridor.id });
    expect(next.ship.corridors[corridor.id]!.doorState).toBe('CLOSED');
  });

  it('Ключ эвакуации переключает замок Капсулы своего Спасательного отсека', () => {
    const state = contactState(2, 'quest-evac');
    const questId = giveQuest(state, 'EVACUATION_KEY', true);
    setRoom(state, 'ESCAPE_POD_A');
    const pod = Object.values(state.ship.escapePods).find((entry) => entry.section === 'A')!;
    const locked = pod.isLocked;
    const next = useQuestItem(state, questId, { targetEscapePodId: pod.id });
    expect(next.ship.escapePods[pod.id]!.isLocked).toBe(!locked);
  });

  it('Голографический компьютер: «Оценка угрозы» вне комнаты с Компьютером', () => {
    const state = contactState(2, 'quest-holo');
    giveQuest(state, 'HOLO_COMPUTER', true);
    state.ship.rooms[state.players['player-1']!.roomId]!.hasComputer = false;
    const card: ActionCard = {
      id: 'TEST_THREAT',
      characterClass: 'SCIENTIST',
      name: 'Оценка угрозы',
      playCost: 0,
      description: '',
      effect: { kind: 'THREAT_ASSESSMENT' },
    };
    state.players['player-1']!.actionDeck.hand.push(card);
    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: card.id, option: 'KEEP_TOP' },
    });
    expect(next.gameLog.at(-1)?.event).toMatchObject({ type: 'EVENT_PEEKED' });
  });

  it('пассивный и ещё не поддержанный эффекты объясняют, почему их не применить', () => {
    const state = contactState(2, 'quest-passive');
    const questId = giveQuest(state, 'HOLO_COMPUTER', true);
    expectEngineError(() => useQuestItem(structuredClone(state), questId, {}), 'CARD_NOT_USABLE_NOW');
  });
});
