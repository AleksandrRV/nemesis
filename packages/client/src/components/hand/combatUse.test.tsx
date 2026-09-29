import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ACTION_CARDS,
  CRAFTED_ITEM_CARDS,
  RED_ITEM_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type SanitizedGameState,
} from '@nemesis/shared';
import { getActionCardUsage } from './actionCardUsage';
import { getItemUsage } from './itemUsage';
import { CombatUseBadge } from './CombatUseBadge';

function view(withIntruder: boolean): SanitizedGameState {
  const snapshot = filterStateForPlayer(createInitialGameState('combat-use-ui'), 'player-1');
  if (withIntruder) snapshot.ship.rooms[snapshot.players['player-1']!.roomId]!.occupantIntruderIds = ['intruder-x'];
  return snapshot;
}

const card = (id: string) => structuredClone(ACTION_CARDS.find((entry) => entry.id === id)!);

describe('Символы «Только в Бою / вне Боя» в интерфейсе', () => {
  it('«Отдых» в Бою: все варианты закрыты с причиной, бейдж «Только вне Боя»', () => {
    const usage = getActionCardUsage(card('ACT_CAP_REST'), view(true));

    expect(usage.combatUse).toBe('OUT_OF_COMBAT');
    expect(usage.badges).toContain('Только вне Боя');
    expect(usage.variants.every((variant) => !variant.available)).toBe(true);
    expect(usage.variants[0]!.reason).toContain('в вашем отсеке Чужой');
  });

  it('«Огонь на подавление» вне Боя закрыт, в Бою не блокируется символом', () => {
    const calm = getActionCardUsage(card('ACT_CAP_SUPPRESSIVE_FIRE'), view(false));
    expect(calm.variants.every((variant) => !variant.available)).toBe(true);
    expect(calm.variants[0]!.reason).toContain('Только в Бою');

    const fighting = getActionCardUsage(card('ACT_CAP_SUPPRESSIVE_FIRE'), view(true));
    expect(fighting.variants.some((variant) => variant.reason?.includes('Только в Бою'))).toBe(false);
  });

  it('карта без символа не получает бейдж', () => {
    const usage = getActionCardUsage(card('ACT_CAP_DEMOLITION'), view(true));

    expect(usage.combatUse).toBeUndefined();
    expect(usage.badges.some((badge) => badge.startsWith('Только'))).toBe(false);
  });

  it('Антидот в Бою и Дымовая граната вне Боя закрыты символом', () => {
    const antidote = structuredClone(CRAFTED_ITEM_CARDS.find((item) => item.recipeId === 'ANTIDOTE')!);
    const smoke = structuredClone(RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_SMOKE_GRENADE_'))!);

    expect(getItemUsage(antidote, view(true), 'INVENTORY').variants.every((variant) => !variant.available)).toBe(true);
    expect(getItemUsage(smoke, view(false), 'INVENTORY').variants.every((variant) => !variant.available)).toBe(true);
  });

  it('значок: подпись для экранного диктора, перечёркивание у «вне Боя»', () => {
    expect(renderToStaticMarkup(<CombatUseBadge combatUse="OUT_OF_COMBAT" />)).toContain('aria-label="Только вне Боя"');
    expect(renderToStaticMarkup(<CombatUseBadge combatUse="IN_COMBAT" />)).toContain('aria-label="Только в Бою"');
    expect(renderToStaticMarkup(<CombatUseBadge combatUse={null} />)).toBe('');
  });
});
