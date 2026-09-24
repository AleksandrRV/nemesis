import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import {
  buildCombatPayload,
  buildUsePayload,
  getActionCardUsage,
  getItemUsage,
  getUsageTargets,
} from './cardUsageModel';
import { buildCardUseResult } from './cardUseResultModel';

function makeView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('usage-model-ui'), 'player-1');
}

type ActionCardView = Extract<
  NonNullable<SanitizedGameState['players'][string]>['actionDeck']['hand'][number],
  { characterClass: string }
>;

/** Клон карты из руки с подменённым эффектом — модель вариантов читает только effect.kind/variant. */
function cardWithEffect(view: SanitizedGameState, effect: Record<string, unknown>): ActionCardView {
  const hand = view.players['player-1']!.actionDeck.hand;
  const base = hand.find((entry): entry is ActionCardView => 'characterClass' in entry);
  if (!base) throw new Error('В фикстуре нет карты Действия');
  return { ...base, effect } as ActionCardView;
}

function makeItem(idPart: string, name = idPart) {
  return {
    id: `ITEM_TEST_${idPart}`,
    name,
    description: 'Тестовый предмет',
    color: 'GREEN' as const,
    origin: 'ROOM_DECK' as const,
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [],
    actionCost: 0,
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  };
}

describe('getActionCardUsage', () => {
  it('Перезарядка: доступна при неполном магазине, недоступна с причиной при полном', () => {
    const view = makeView();
    const weapon = view.players['player-1']!.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon,
    )!;
    weapon.card.ammo = (weapon.card.maxAmmo ?? 1) - 1;

    const card = cardWithEffect(view, { kind: 'RELOAD' });
    const usage = getActionCardUsage(card, view);

    expect(usage.variants).toHaveLength(1);
    expect(usage.variants[0]!.available).toBe(true);

    weapon.card.ammo = weapon.card.maxAmmo;

    const full = getActionCardUsage(card, view);
    expect(full.variants[0]!.available).toBe(false);
    expect(full.variants[0]!.reason).toContain('заряжен полностью');
  });

  it('Отдых: недоступен без Заражения на руке, причина объясняет', () => {
    const view = makeView();
    const card = cardWithEffect(view, { kind: 'REST' });
    const usage = getActionCardUsage(card, view);
    expect(usage.variants[0]!.available).toBe(false);
    expect(usage.variants[0]!.reason).toContain('нет карт Заражения');
  });

  it('Отставить: единственный вариант недоступен с явной причиной (карта всегда показывает окно)', () => {
    const view = makeView();
    const card = cardWithEffect(view, { kind: 'DISMISS' });
    const usage = getActionCardUsage(card, view);
    expect(usage.variants).toHaveLength(1);
    expect(usage.variants[0]!.available).toBe(false);
    expect(usage.variants[0]!.reason).toBeTruthy();
  });

  it('Разрушение: два варианта; Дверь зависит от целых дверей, Неисправность — от отсутствия маркера', () => {
    const view = makeView();
    const card = cardWithEffect(view, { kind: 'DEMOLITION' });
    const usage = getActionCardUsage(card, view);
    expect(usage.variants.map((variant) => variant.id)).toEqual(['DOOR', 'MALFUNCTION']);
    expect(usage.variants[0]!.targetKind).toBe('ADJACENT_DOOR');
    expect(usage.variants[0]!.available).toBe(true);
    expect(usage.variants[1]!.available).toBe(true);

    view.ship.rooms[view.players['player-1']!.roomId]!.hasMalfunction = true;
    const withMalfunction = getActionCardUsage(card, view);
    expect(withMalfunction.variants[1]!.available).toBe(false);
    expect(withMalfunction.variants[1]!.reason).toContain('уже стоит');
  });

  it('Поиск: недоступен в неисследованном отсеке', () => {
    const view = makeView();
    const roomId = view.players['player-1']!.roomId;
    view.ship.rooms[roomId]!.isExplored = false;
    const card = cardWithEffect(view, { kind: 'SEARCH' });
    const usage = getActionCardUsage(card, view);
    expect(usage.variants[0]!.available).toBe(false);
    expect(usage.variants[0]!.reason).toContain('не исследован');
  });
});

describe('getItemUsage', () => {
  it('Оружие: единственный вариант объясняет, что оружие стреляет в бою', () => {
    const view = makeView();
    const weapon = view.players['player-1']!.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon,
    )!;
    const usage = getItemUsage(weapon.card, view, 'HAND_SLOT');
    expect(usage.variants[0]!.available).toBe(false);
    expect(usage.variants[0]!.reason).toContain('Стрельба');
  });

  it('Аптечка: варианты лечения зависят от состояния травм', () => {
    const view = makeView();
    const medkit = makeItem('MEDKIT');
    const usage = getItemUsage(medkit, view, 'INVENTORY');
    expect(usage.variants.map((variant) => variant.id)).toEqual(['TREAT_SERIOUS', 'HEAL_TREATED', 'HEAL_LIGHT']);
    // В фикстуре травм нет — все варианты недоступны, но с причинами
    for (const variant of usage.variants) {
      expect(variant.available).toBe(false);
      expect(variant.reason).toBeTruthy();
    }
  });

  it('Планы Немезиды: подглядывание двух отсеков, шаг второй цели задан', () => {
    const view = makeView();
    const plans = makeItem('NEMESIS_PLANS');
    const usage = getItemUsage(plans, view, 'INVENTORY');
    expect(usage.variants[0]!.available).toBe(true);
    expect(usage.variants[0]!.secondTargetKind).toBe('UNEXPLORED_ROOM');

    const targets = getUsageTargets(view, 'UNEXPLORED_ROOM', 'UNEXPLORED_ROOM');
    expect(targets.first.length).toBeGreaterThan(0);
    expect(targets.second.length).toBeGreaterThan(0);
  });
});

describe('getUsageTargets', () => {
  it('Двери рядом: подпись Открыта/Закрыта и id коридора', () => {
    const view = makeView();
    const targets = getUsageTargets(view, 'ADJACENT_DOOR');
    expect(targets.first.length).toBeGreaterThan(0);
    for (const target of targets.first) {
      expect(target.id).toBeTruthy();
      expect(target.label).toContain('Дверь:');
      expect(['Открыта — закрыть', 'Закрыта — открыть']).toContain(target.sublabel);
    }
  });

  it('Приказ: первый шаг — другой Персонаж в комнате, второй — соседний отсек', () => {
    const view = makeView();
    const first = getUsageTargets(view, 'PLAYER_IN_ROOM', 'ADJACENT_ROOM');
    expect(first.first.every((target) => target.id !== 'player-1')).toBe(true);
    expect(first.second.length).toBeGreaterThan(0);
  });
});

describe('buildUsePayload / buildCombatPayload', () => {
  it('Неисправность Разрушения: option + цель без номера комнаты', () => {
    const view = makeView();
    const card = cardWithEffect(view, { kind: 'DEMOLITION' });
    const variant = getActionCardUsage(card, view).variants[1]!;
    const payload = buildUsePayload({ kind: 'ACTION', card }, variant, null, null);
    expect(payload).toMatchObject({ cardId: card.id, option: 'MALFUNCTION' });
  });

  it('Планы Немезиды: обе цели уходят в payload', () => {
    const view = makeView();
    const plans = makeItem('NEMESIS_PLANS');
    const variant = getItemUsage(plans, view, 'INVENTORY').variants[0]!;
    const payload = buildUsePayload({ kind: 'ITEM', card: plans, location: 'INVENTORY' }, variant, '11', '21');
    expect(payload).toMatchObject({ itemId: plans.id, option: 'PEEK', targetRoomId: 11, targetRoomId2: 21 });
  });

  it('Приказ: Персонаж + отсек', () => {
    const view = makeView();
    const card = cardWithEffect(view, { kind: 'ORDER' });
    const variant = getActionCardUsage(card, view).variants[0]!;
    const payload = buildUsePayload({ kind: 'ACTION', card }, variant, 'player-2', '12');
    expect(payload).toMatchObject({ cardId: card.id, targetPlayerId: 'player-2', targetRoomId: 12 });
  });

  it('Прицельный выстрел: combat-payload с оружием и целью', () => {
    const view = makeView();
    const weapon = view.players['player-1']!.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon,
    )!;
    const payload = buildCombatPayload(
      { id: 'AIMED_SHOOT', label: '', available: true, targetKind: 'INTRUDER' },
      weapon.card.id,
      'intruder-1',
      null,
    );
    expect(payload).toMatchObject({ kind: 'AIMED_SHOOT', weaponItemId: weapon.card.id, targetIntruderId: 'intruder-1' });
  });
});

describe('buildCardUseResult', () => {
  it('Отказ движка: окно результата с текстом ошибки и без строк изменений', () => {
    const view = makeView();
    const result = buildCardUseResult(view, view, 'Отдых', 'Сканировать Заражение', 'На руке нет карт Заражения');
    expect(result.error).toBeTruthy();
    expect(result.lines).toHaveLength(0);
  });

  it('Успех: дельта руки, боезапаса и новые записи журнала', () => {
    const before = makeView();
    const after = structuredClone(before) as SanitizedGameState;
    after.players['player-1']!.actionDeck.hand.pop();
    const weapon = after.players['player-1']!.handSlots.find(
      (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon,
    )!;
    weapon.card.ammo = (weapon.card.ammo ?? 0) + 1;
    after.gameLog.push({
      sequence: before.gameLog.length + 1,
      playerId: 'player-1',
      event: { type: 'ACTION_CARD_PLAYED', cardName: 'Перезарядка' } as never,
    } as never);

    const result = buildCardUseResult(before, after, 'Перезарядка', 'Перезарядить оружие');
    expect(result.error).toBeUndefined();
    expect(result.lines.some((line) => line.text.startsWith('Рука:') && line.text.includes('-1'))).toBe(true);
    expect(result.lines.some((line) => line.text.includes('Боезапас') && line.text.includes('+1'))).toBe(true);
    expect(result.logLines.some((line) => line.includes('Перезарядка'))).toBe(true);
  });

  it('Дверь и Шум: изменения коридоров попадают в результат', () => {
    const before = makeView();
    const after = structuredClone(before) as SanitizedGameState;
    const corridor = Object.values(after.ship.corridors)[0]!;
    corridor.doorState = 'DESTROYED';
    corridor.hasNoise = true;

    const result = buildCardUseResult(before, after, 'Разрушение', 'Разрушить Дверь');
    expect(result.lines.some((line) => line.text.startsWith('Дверь разрушена'))).toBe(true);
    expect(result.lines.some((line) => line.text.startsWith('Маркер Шума'))).toBe(true);
  });
});
