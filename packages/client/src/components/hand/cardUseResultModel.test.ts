import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import { buildCardUseResult } from './cardUseResultModel';

function makeView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('usage-model-ui'), 'player-1');
}

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
