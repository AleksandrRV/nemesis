import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GREEN_ITEM_CARDS,
  SERIOUS_WOUND_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type SanitizedGameState,
  type SeriousWoundKind,
} from '@nemesis/shared';
import { buildPlayerBoardSummary } from './playerBoardModel';
import { getItemUsage } from './itemUsage';
import { BoardGearSection } from './BoardGearSection';

function viewWith(...kinds: SeriousWoundKind[]): SanitizedGameState {
  const state = createInitialGameState('wounds-ui');
  state.players['player-1']!.seriousWounds = kinds.map((kind) => ({
    ...structuredClone(SERIOUS_WOUND_CARDS.find((card) => card.kind === kind)!),
  }));
  return filterStateForPlayer(state, 'player-1');
}

function me(view: SanitizedGameState) {
  return view.players['player-1']!;
}

describe('Тяжелые Травмы в интерфейсе', () => {
  it('«Травма спины»: лимит руки 4 на планшете', () => {
    const view = viewWith('BACK');
    expect(buildPlayerBoardSummary(view, me(view), false).handLimit).toBe(4);
  });

  it('«Травма кисти»: цена Предмета в окне розыгрыша +1', () => {
    const view = viewWith('HAND');
    const bandages = structuredClone(GREEN_ITEM_CARDS.find((card) => card.name === 'Бинты')!);
    expect(getItemUsage(bandages, view, 'INVENTORY').cost).toBe(2);
    expect(getItemUsage(bandages, viewWith(), 'INVENTORY').cost).toBe(1);
  });

  it('«Травма руки»: второй слот заблокирован, при двух Тяжелых — требование бросить', () => {
    const view = viewWith('ARM');
    const render = () =>
      renderToStaticMarkup(
        <BoardGearSection
          player={me(view)}
          canAct
          onUseItem={() => undefined}
          onInspectItem={() => undefined}
          onInspectObject={() => undefined}
          onDiscardHeavy={() => undefined}
          onCraft={() => undefined}
          canCraft={false}
        />,
      );

    expect(render()).toContain('Рука недоступна: «Травма руки»');
    expect(render()).toContain('Руки · 1/1');

    me(view).handSlots.push({ source: 'OBJECT', object: { id: 'egg-ui', kind: 'EGG' } });
    expect(render()).toContain('бросьте один из Тяжелых');
    expect(buildPlayerBoardSummary(view, me(view), false).statuses.map((status) => status.id)).toContain('HEAVY_DROP');
  });
});
