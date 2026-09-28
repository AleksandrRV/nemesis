import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import { buildPlayerBoardSummary, boardStatuses, vitalsSummary } from './playerBoardModel';
import { PlayerBoardSummaryBar } from './PlayerBoardSummary';
import { BoardGearSection } from './BoardGearSection';
import { BoardVitalsSection } from './BoardVitalsSection';

function makeView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('player-board'), 'player-1');
}

function player(view: SanitizedGameState) {
  return view.players['player-1']!;
}

describe('Модель планшета игрока', () => {
  it('сводка: рука, колода, два Действия за ход и возможность действовать', () => {
    const view = makeView();
    const summary = buildPlayerBoardSummary(view, player(view), false);
    expect(summary.handCount).toBe(player(view).actionDeck.hand.length);
    expect(summary.actions).toEqual({ used: 0, limit: 2 });
    expect(summary.canAct).toBe(true);
  });

  it('Инъекция адреналина снимает лимит Действий на счётчике', () => {
    const view = makeView();
    player(view).hasAdrenalineRush = true;
    expect(buildPlayerBoardSummary(view, player(view), false).actions.limit).toBeNull();
  });

  it('раны: обработанные и действующие Тяжёлые Травмы считаются отдельно; с тремя — критично', () => {
    const view = makeView();
    const wound = { id: 'W', kind: 'LEG' as const, name: 'Травма ноги', description: 'эффект', isTreated: false };
    player(view).seriousWounds = [wound, { ...wound, id: 'W2', isTreated: true }, { ...wound, id: 'W3' }];
    expect(vitalsSummary(player(view))).toMatchObject({ serious: 3, treated: 1, untreated: 2, isCritical: true });
  });

  it('состояния: ход, Бой, Слизь и Личинка', () => {
    const view = makeView();
    player(view).hasSlime = true;
    player(view).hasLarva = true;
    expect(boardStatuses(view, player(view), true).map((status) => status.id)).toEqual([
      'TURN',
      'COMBAT',
      'SLIME',
      'LARVA',
    ]);
  });
});

describe('Компоненты планшета', () => {
  it('полоса сводки: роль, номер игрока, счётчики и кнопка сворачивания', () => {
    const view = makeView();
    const html = renderToStaticMarkup(
      <PlayerBoardSummaryBar
        view={view}
        player={player(view)}
        summary={buildPlayerBoardSummary(view, player(view), false)}
        isExpanded
        onToggle={() => undefined}
        onOpenVitals={() => undefined}
        trailing={null}
      />,
    );
    expect(html).toContain('Игрок 1');
    expect(html).toContain('Действий: 0 из 2');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Свернуть планшет');
  });

  it('снаряжение: оружие с боезапасом, свободная рука, пустой инвентарь и сброс тяжёлого', () => {
    const view = makeView();
    const html = renderToStaticMarkup(
      <BoardGearSection
        player={player(view)}
        canAct
        onUseItem={() => undefined}
        onInspectItem={() => undefined}
        onInspectObject={() => undefined}
        onDiscardHeavy={() => undefined}
        onCraft={() => undefined}
        canCraft={false}
      />,
    );
    expect(html).toContain('Боезапас');
    expect(html).toContain('Свободная рука');
    expect(html).toContain('Предметов нет');
    expect(html).toContain('Сбросить (без Действия, стр. 22)');
  });

  it('тяжёлый объект в руке показывается отдельной карточкой со сбросом', () => {
    const view = makeView();
    player(view).handSlots = [{ source: 'OBJECT', object: { id: 'obj-1', kind: 'CORPSE' } } as never];
    const html = renderToStaticMarkup(
      <BoardGearSection
        player={player(view)}
        canAct
        onUseItem={() => undefined}
        onInspectItem={() => undefined}
        onInspectObject={() => undefined}
        onDiscardHeavy={() => undefined}
        onCraft={() => undefined}
        canCraft={false}
      />,
    );
    expect(html).toContain('Труп');
    expect(html).toContain('Сброс');
  });

  it('состояние: счётчик Лёгких Травм, слоты Тяжёлых и правило смерти', () => {
    const view = makeView();
    player(view).lightWounds = 1;
    const html = renderToStaticMarkup(<BoardVitalsSection player={player(view)} statuses={[]} />);
    expect(html).toContain('Лёгкие Травмы');
    expect(html).toContain('Тяжёлые Травмы · 0/3');
    expect(html).toContain('любая новая Травма смертельна');
  });
});
