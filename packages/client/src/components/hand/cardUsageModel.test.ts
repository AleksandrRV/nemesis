import { describe, expect, it } from 'vitest';
import {
  CARD_OPTION,
  CRAFTED_ITEM_CARDS,
  GREEN_ITEM_CARDS,
  RED_ITEM_CARDS,
  YELLOW_ITEM_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type ActionCard,
  type ItemCard,
  type SanitizedGameState,
} from '@nemesis/shared';
import {
  buildCombatPayload,
  buildUsePayload,
  getActionCardUsage,
  getItemUsage,
  getStepTargets,
} from './cardUsageModel';

function makeView(players = 1): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('usage-model-ui', { playerCount: players }), 'player-1');
}

function card(effect: ActionCard['effect'], playCost = 0): ActionCard {
  return { id: `TEST_${effect.kind}`, characterClass: 'CAPTAIN', name: effect.kind, playCost, description: '', effect };
}

function item(prefix: string): ItemCard {
  const found = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS, ...CRAFTED_ITEM_CARDS].find((entry) =>
    entry.id.startsWith(prefix),
  );
  if (!found) throw new Error(prefix);
  return structuredClone(found);
}

function moveTo(view: SanitizedGameState, definitionId: string): number {
  const room = Object.values(view.ship.rooms).find((entry) => entry.definitionId === definitionId)!;
  for (const entry of Object.values(view.ship.rooms))
    entry.occupantPlayerIds = entry.occupantPlayerIds.filter((id) => id !== 'player-1');
  room.occupantPlayerIds.push('player-1');
  view.players['player-1']!.roomId = room.id;
  return room.id;
}

describe('Варианты карт Действий', () => {
  it('ремонт: отдельные варианты «починить» и «повредить» Двигатель, только в Машинном Отсеке', () => {
    const view = makeView();
    const away = getActionCardUsage(card({ kind: 'REPAIR' }), view).variants;
    expect(away.map((variant) => variant.id)).toEqual(['FIX_ROOM', 'ENGINE_REPAIR', 'ENGINE_DAMAGE']);
    expect(away[1]!.available).toBe(false);
    moveTo(view, 'ENGINE_01');
    const engine = getActionCardUsage(card({ kind: 'REPAIR' }), view).variants;
    expect(engine[1]).toMatchObject({ available: true, option: CARD_OPTION.ENGINE_REPAIR });
    expect(engine[2]!.label).toContain('№1');
  });

  it('«Оценка угрозы» передаёт движку выбор «под низ»', () => {
    const view = makeView();
    const threat = card({ kind: 'THREAT_ASSESSMENT' });
    const bottom = getActionCardUsage(threat, view).variants.find((variant) => variant.id === 'MOVE_BOTTOM')!;
    expect(buildUsePayload({ kind: 'ACTION', card: threat }, bottom, [])).toMatchObject({ option: 'MOVE_BOTTOM' });
  });

  it('«Пиротехник»: тушение и поджог отправляют разные варианты; поджог требует Предмет', () => {
    const view = makeView();
    const pyro = card({ kind: 'PYROTECHNIC' }, 1);
    const [extinguish, place] = getActionCardUsage(pyro, view).variants;
    expect(buildUsePayload({ kind: 'ACTION', card: pyro }, extinguish!, [])).toMatchObject({ option: 'EXTINGUISH' });
    expect(place!.steps[0]!.kind).toBe('INVENTORY_ITEM');
    expect(buildUsePayload({ kind: 'ACTION', card: pyro }, place!, [['ITEM_X']])).toMatchObject({
      option: 'PLACE_FIRE',
      targetItemId: 'ITEM_X',
    });
  });

  it('«Приказ»: цепочка Персонаж → отсек попадает в payload', () => {
    const view = makeView();
    const order = card({ kind: 'ORDER' });
    const variant = getActionCardUsage(order, view).variants[0]!;
    expect(variant.steps.map((step) => step.kind)).toEqual(['PLAYER_OTHER_IN_ROOM', 'ADJACENT_ROOM']);
    expect(buildUsePayload({ kind: 'ACTION', card: order }, variant, [['player-2'], ['12']])).toMatchObject({
      targetPlayerId: 'player-2',
      targetRoomId: 12,
    });
  });

  it('«Перезарядка» Капитана недоступна, если Револьвер уже заряжен полностью', () => {
    const view = makeView();
    const reload = card({ kind: 'RELOAD', ammoGain: 1, weaponHint: 'REVOLVER' });
    const slot = view.players['player-1']!.handSlots.find((entry) => entry.source === 'ITEM');
    if (slot?.source === 'ITEM') slot.card.ammo = slot.card.maxAmmo;
    const variant = getActionCardUsage(reload, view).variants[0]!;
    expect(variant.available).toBe(false);
  });

  it('боевые карты строят combat-payload из выбранных целей', () => {
    const view = makeView();
    const variant = {
      id: 'AIMED_SHOOT',
      label: '',
      icon: 'ammo' as const,
      available: true,
      steps: [],
      combat: 'AIMED_SHOOT' as const,
    };
    expect(buildCombatPayload(variant, 'W1', [['intruder-1']])).toEqual({
      kind: 'AIMED_SHOOT',
      weaponItemId: 'W1',
      targetIntruderId: 'intruder-1',
    });
    expect(buildCombatPayload(variant, 'W1', [])).toBeNull();
    expect(view.players['player-1']).toBeTruthy();
  });
});

describe('Варианты Предметов', () => {
  it('Огнетушитель: Отступление выбирает конкретного Чужого', () => {
    const view = makeView();
    const extinguisher = item('ITEM_YEL_FIRE_EXTINGUISHER_');
    const retreat = getItemUsage(extinguisher, view, 'INVENTORY').variants.find((variant) => variant.id === 'RETREAT')!;
    expect(retreat.steps[0]!.kind).toBe('INTRUDER_IN_ROOM');
    expect(
      buildUsePayload({ kind: 'ITEM', card: extinguisher, location: 'INVENTORY' }, retreat, [['intr-7']]),
    ).toMatchObject({
      option: 'RETREAT',
      targetIntruderId: 'intr-7',
    });
  });

  it('Планы «Немезиды»: один шаг с выбором ровно двух отсеков', () => {
    const view = makeView();
    const plans = item('ITEM_YEL_NEMESIS_PLANS_');
    const variant = getItemUsage(plans, view, 'INVENTORY').variants[0]!;
    expect(variant.steps[0]).toMatchObject({ kind: 'UNEXPLORED_ROOM', min: 2, max: 2 });
    expect(
      buildUsePayload({ kind: 'ITEM', card: plans, location: 'INVENTORY' }, variant, [['11', '21']]),
    ).toMatchObject({
      targetRoomId: 11,
      targetRoomId2: 21,
    });
  });

  it('Бинты не предлагают лечить Обработанную Травму, Аптечка — предлагает', () => {
    const view = makeView();
    expect(getItemUsage(item('ITEM_GRE_BANDAGES_'), view, 'INVENTORY').variants.map((variant) => variant.id)).toEqual([
      'TREAT_SERIOUS',
      'HEAL_LIGHT',
    ]);
    expect(getItemUsage(item('ITEM_GRE_MEDKIT_'), view, 'INVENTORY').variants.map((variant) => variant.id)).toEqual([
      'TREAT_SERIOUS',
      'HEAL_TREATED',
      'HEAL_LIGHT',
    ]);
  });

  it('Военные препараты разрешают сбросить 0 карт', () => {
    const view = makeView();
    const variant = getItemUsage(item('ITEM_RED_MILITARY_STIMULANTS_'), view, 'INVENTORY').variants[0]!;
    expect(variant.steps[0]!.min).toBe(0);
  });

  it('создаваемые Предметы больше не помечены «не реализовано»', () => {
    const view = makeView(2);
    for (const prefix of ['CRAFTED_ANTIDOTE_', 'CRAFTED_TASER_', 'CRAFTED_MOLOTOV_']) {
      const variants = getItemUsage(item(prefix), view, 'INVENTORY').variants;
      expect(variants.some((variant) => variant.id === 'UNKNOWN')).toBe(false);
    }
  });

  it('оружие объясняет, что стреляет Действием «Стрельба»', () => {
    const view = makeView();
    const slot = view.players['player-1']!.handSlots.find((entry) => entry.source === 'ITEM')!;
    if (slot.source !== 'ITEM') throw new Error('нет оружия');
    const variant = getItemUsage(slot.card, view, 'HAND_SLOT').variants[0]!;
    expect(variant.available).toBe(false);
    expect(variant.reason).toContain('Стрельба');
  });
});

describe('Цели шагов', () => {
  it('Двери рядом подписаны действием, которое с ними произойдёт', () => {
    const view = makeView();
    const targets = getStepTargets(view, 'ADJACENT_DOOR');
    expect(targets.length).toBeGreaterThan(0);
    expect(targets[0]!.sublabel).toMatch(/будет (открыта|закрыта)/);
  });

  it('Чужие рядом сгруппированы по отсекам и названы по типу', () => {
    const view = makeView();
    const roomId = view.players['player-1']!.roomId;
    view.intrudersPool.boardTokens.push({ id: 'intr-1', type: 'BREEDER', roomId, woundsCount: 1 });
    view.ship.rooms[roomId]!.occupantIntruderIds.push('intr-1');
    const [target] = getStepTargets(view, 'INTRUDER_NEARBY');
    expect(target).toMatchObject({ id: 'intr-1', label: 'Трутень', group: 'Ваш отсек', sublabel: 'Ран: 1' });
  });
});
