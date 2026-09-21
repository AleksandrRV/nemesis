import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import {
  CardTargetingForm,
  TARGETED_COMBAT_CARD_IDS,
  defaultCardSelection,
  isSelectionComplete,
  isTargetedCombatCard,
} from './CardTargetingForm';

function combatView(): SanitizedGameState {
  const state = createInitialGameState('card-targeting', { playerCount: 2 });

  state.intrudersPool.boardTokens.push({
    id: 't-adult',
    type: 'ADULT',
    roomId: 11,
    woundsCount: 1,
    token: { id: 't-adult', type: 'ADULT', escapeNumber: 4 },
  });
  state.ship.rooms[11]!.occupantIntruderIds.push('t-adult');

  return filterStateForPlayer(state, 'player-1');
}

describe('isTargetedCombatCard', () => {
  it('знает все 5 боевых карт', () => {
    for (const id of Object.values(TARGETED_COMBAT_CARD_IDS)) {
      expect(isTargetedCombatCard(id)).toBe(true);
    }

    expect(isTargetedCombatCard('ACT_SOL_SEARCH_1')).toBe(false);
  });
});

describe('defaultCardSelection', () => {
  it('стрелковым даёт особь и заряженное оружие', () => {
    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.AIMED_FIRE, combatView(), 'player-1');

    expect(defaults.targetIntruderId).toBe('t-adult');
    expect(defaults.weaponSlotIndex).toBe(0);
  });

  it('уводу даёт соседний отсек и «Я сам»', () => {
    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.BARRAGE, combatView(), 'player-1');

    expect(defaults.targetRoomId).not.toBe(11);
    expect(defaults.option).toBe('SELF');
  });

  it('адреналину даёт режим выстрела со всеми целями', () => {
    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.ADRENALINE, combatView(), 'player-1');

    expect(defaults.option).toBe('SHOOT');
    expect(defaults.targetIntruderId).toBe('t-adult');
    expect(defaults.weaponSlotIndex).toBe(0);
    expect(defaults.targetRoomId).not.toBe(11);
  });
});

describe('isSelectionComplete', () => {
  it('стрелковым нужны цель и оружие', () => {
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.BURST_FIRE, {})).toBe(false);
    expect(
      isSelectionComplete(TARGETED_COMBAT_CARD_IDS.BURST_FIRE, {
        targetIntruderId: 't-adult',
        weaponSlotIndex: 0,
      }),
    ).toBe(true);
  });

  it('уводу нужны отсек и вариант', () => {
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE, { option: 'SELF' })).toBe(false);
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE, { targetRoomId: 6, option: 'SELF' })).toBe(
      true,
    );
  });

  it('адреналин проверяет по режиму', () => {
    const shoot = { option: 'SHOOT', targetIntruderId: 't-adult', weaponSlotIndex: 0, targetRoomId: 6 };
    const escape = { option: 'ESCAPE', targetRoomId: 6 };

    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, shoot)).toBe(true);
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, escape)).toBe(true);
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, { option: 'ESCAPE' })).toBe(false);
    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, {})).toBe(false);
  });

  it('обычные карты полны всегда', () => {
    expect(isSelectionComplete('ACT_SOL_SEARCH_1', {})).toBe(true);
  });
});

describe('CardTargetingForm', () => {
  const noop = () => undefined;

  it('стрелковая карта: селекты цели и оружия', () => {
    const html = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.AIMED_FIRE}
        view={combatView()}
        playerId="player-1"
        selection={{ targetIntruderId: 't-adult', weaponSlotIndex: 0 }}
        onSelectionChange={noop}
      />,
    );

    expect(html).toContain('Цель выстрела');
    expect(html).toContain('Взрослая Особь');
    expect(html).toContain('Оружие');
    expect(html).not.toContain('Целевой отсек');
  });

  it('заградительный огонь: отсек и вариант «Я + спутник»', () => {
    const html = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.BARRAGE}
        view={combatView()}
        playerId="player-1"
        selection={{ targetRoomId: 6, option: 'SELF' }}
        onSelectionChange={noop}
      />,
    );

    expect(html).toContain('Целевой отсек');
    expect(html).toContain('Кого увести');
    expect(html).toContain('Я сам');
    expect(html).toContain('Я +');
  });

  it('подавление: без варианта «Я + спутник»', () => {
    const html = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE}
        view={combatView()}
        playerId="player-1"
        selection={{ targetRoomId: 6, option: 'SELF' }}
        onSelectionChange={noop}
      />,
    );

    expect(html).toContain('Кого увести');
    expect(html).not.toContain('Я +');
  });

  it('адреналин: секции переключаются режимом', () => {
    const view = combatView();
    const shootHtml = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.ADRENALINE}
        view={view}
        playerId="player-1"
        selection={{ option: 'SHOOT', targetIntruderId: 't-adult', weaponSlotIndex: 0 }}
        onSelectionChange={noop}
      />,
    );
    const escapeHtml = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.ADRENALINE}
        view={view}
        playerId="player-1"
        selection={{ option: 'ESCAPE', targetRoomId: 6 }}
        onSelectionChange={noop}
      />,
    );

    expect(shootHtml).toContain('Выстрел');
    expect(shootHtml).toContain('Цель выстрела');
    expect(escapeHtml).toContain('Побег');
    expect(escapeHtml).toContain('Целевой отсек');
    expect(escapeHtml).not.toContain('Цель выстрела');
  });

  it('без Чужих и пути честно пишет об этом', () => {
    const state = createInitialGameState('card-targeting-calm', { playerCount: 1 });
    const view = filterStateForPlayer(state, 'player-1');
    const html = renderToStaticMarkup(
      <CardTargetingForm
        cardId={TARGETED_COMBAT_CARD_IDS.AIMED_FIRE}
        view={view}
        playerId="player-1"
        selection={{}}
        onSelectionChange={noop}
      />,
    );

    expect(html).toContain('Нет Чужих в отсеке');
  });
});
