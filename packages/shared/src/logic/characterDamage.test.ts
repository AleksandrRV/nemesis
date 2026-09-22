import { describe, expect, it } from 'vitest';
import { contactState, giveSeriousWounds } from '../testing/contactFixtures.js';
import { killPlayer, sufferLightWounds, sufferSeriousWound } from './characterDamage.js';
import { applyFireEndTurnEffect } from './turnCycle.js';

describe('Травмы и смерть (стр. 12, 21; FAQ Rules 23–24)', () => {
  it('третья Лёгкая Травма превращается в Тяжёлую, оставшийся урон не теряется', () => {
    const state = contactState();
    const player = state.players['player-1']!;
    player.lightWounds = 2;
    sufferLightWounds(state, player.id, 2);
    expect(player.lightWounds).toBe(1);
    expect(player.seriousWounds).toHaveLength(1);
    expect(player.seriousWounds[0]?.isTreated).toBe(false);
  });

  it.each(['LIGHT', 'SERIOUS'] as const)('при трёх обработанных Тяжёлых новая %s Травма сразу убивает', (kind) => {
    const state = contactState();
    const player = state.players['player-1']!;
    giveSeriousWounds(state, player.id, 3, true);
    const before = [...state.decks.seriousWounds.drawPile];
    if (kind === 'LIGHT') sufferLightWounds(state, player.id, 1);
    else sufferSeriousWound(state, player.id);
    expect(player.isDead).toBe(true);
    expect(player.seriousWounds).toHaveLength(3);
    expect(state.decks.seriousWounds.drawPile).toEqual(before);
  });

  it('обрабатывает смерть между двумя Лёгкими Травмами одного эффекта', () => {
    const state = contactState();
    const player = state.players['player-1']!;
    giveSeriousWounds(state, player.id, 2);
    player.lightWounds = 2;
    sufferLightWounds(state, player.id, 2);
    expect(player.seriousWounds).toHaveLength(3);
    expect(player.lightWounds).toBe(0);
    expect(player.isDead).toBe(true);
  });

  it('первая смерть разблокирует капсулы; следующая не отменяет их повторную блокировку', () => {
    const state = contactState(2);
    killPlayer(state, 'player-1');
    expect(Object.values(state.ship.escapePods).every((pod) => !pod.isLocked)).toBe(true);
    const pod = Object.values(state.ship.escapePods)[0]!;
    pod.isLocked = true;
    killPlayer(state, 'player-2');
    expect(pod.isLocked).toBe(true);
    expect(state.gameLog.filter((entry) => entry.event.type === 'ESCAPE_PODS_UNLOCKED')).toHaveLength(1);
  });

  it('сбрасывает только Тяжёлые Объекты, не превращает карты Предметов в объекты на полу', () => {
    const state = contactState();
    const player = state.players['player-1']!;
    const egg = { id: 'carried-egg', kind: 'EGG' as const };
    player.handSlots.push({ source: 'OBJECT', object: egg });
    player.inventory.push(state.decks.items.RED.drawPile.shift()!);
    const before = state.ship.rooms[11]!.objects.length;
    killPlayer(state, player.id);
    killPlayer(state, player.id);
    expect(state.ship.rooms[11]!.objects).toHaveLength(before + 2);
    expect(state.ship.rooms[11]!.objects).toContainEqual(egg);
    expect(
      state.ship.rooms[11]!.objects.filter((object) => object.kind === 'CORPSE' && object.characterClass !== null),
    ).toHaveLength(1);
    expect(player.handSlots).toEqual([]);
    expect(player.inventory).toEqual([]);
    expect(state.ship.rooms[11]!.occupantPlayerIds).not.toContain(player.id);
    expect(state.gameLog.filter((entry) => entry.event.type === 'PLAYER_DIED')).toHaveLength(1);
  });

  it('в кооперативном режиме сохраняет Предметы погибшего для возможности оживления (FAQ Rules 17)', () => {
    const state = contactState();
    state.meta.gameMode = 'COOP';
    const player = state.players['player-1']!;
    const weapon = player.handSlots[0]!;
    const item = state.decks.items.RED.drawPile.shift()!;
    player.inventory = [item];
    player.handSlots.push({ source: 'OBJECT', object: { id: 'egg', kind: 'EGG' } });
    killPlayer(state, player.id);
    expect(player.handSlots).toEqual([weapon]);
    expect(player.inventory).toEqual([item]);
  });

  it('урон от Пожара проходит через те же пороги Травм, без четвёртой Лёгкой', () => {
    const state = contactState();
    const player = state.players['player-1']!;
    state.ship.rooms[11]!.hasFire = true;
    player.lightWounds = 2;
    applyFireEndTurnEffect(state, player.id);
    expect(player.lightWounds).toBe(0);
    expect(player.seriousWounds).toHaveLength(1);
  });
});
