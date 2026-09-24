import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import { IntruderBoardButton } from './IntruderBoardButton';
import { IntruderBoardModal } from './IntruderBoardModal';

function makeView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('intruder-board-ui'), 'player-1');
}

describe('IntruderBoardButton', () => {
  it('показывает число миниатюр на борту и подпись доступа к планшету', () => {
    const view = makeView();
    view.intrudersPool.boardTokens.push(
      { id: 'intr-1', type: 'ADULT', roomId: 3, woundsCount: 1 },
      { id: 'intr-2', type: 'QUEEN', roomId: 7, woundsCount: 0 },
    );

    const html = renderToStaticMarkup(<IntruderBoardButton view={view} open={false} onOpen={() => {}} />);

    expect(html).toContain('ЧУЖИЕ');
    expect(html).toContain('>2<');
    expect(html).toContain('Планшет Чужих');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('без изменений улья янтарной точки нет', () => {
    const html = renderToStaticMarkup(<IntruderBoardButton view={makeView()} open={false} onOpen={() => {}} />);
    expect(html).not.toContain('bg-amber-400');
  });
});

describe('IntruderBoardModal', () => {
  it('каркас: все шесть секций на данных модели', () => {
    const html = renderToStaticMarkup(<IntruderBoardModal view={makeView()} onClose={() => {}} />);

    expect(html).toContain('Планшет Чужих');
    expect(html).toContain('РАУНД 1');
    expect(html).toContain('Жетонов в мешке');
    expect(html).toContain('Улей — Пул Чужих');
    expect(html).toContain('Кладка: 5/8');
    expect(html).toContain('Слабости');
    expect(html).toContain('Лаборатория');
    expect(html).toContain('Колода Атак');
    expect(html).toContain('Сброс пуст: Атак ещё не было');
    expect(html).toContain('На борту');
    expect(html).toContain('На борту чисто');
    expect(html).toContain('Хроника улья');
    expect(html).toContain('Записей пока нет');
  });

  it('состав мешка с шансами, состояние Улья и(dialog)-семантика', () => {
    const view = makeView();
    const html = renderToStaticMarkup(<IntruderBoardModal view={view} onClose={() => {}} />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    // Стартовый мешок: Королева 1 шт. (единственная), Личинки 4 — проценты из модели
    expect(html).toContain('Королева: 1');
    expect(html).toContain('(9%)'); // 1/11 → floor 9, наибольший остаток
    expect(html).toContain('Первый Контакт');
    expect(html).toContain('ещё не было');
    expect(html).toContain('Труп Персонажа');
    expect(html).toContain('не изучено');
  });

  it('секции Улей/Кладка/Слабости: полоса опустшения, коробка, пустые ячейки, раскрытая карта', () => {
    const view = makeView();
    view.intrudersPool.deadTokens.push({ id: 'd1', type: 'ADULT', escapeNumber: 2 });
    view.intrudersPool.weaknessSlots[0] = {
      objectKind: 'CORPSE',
      visibility: 'REVEALED',
      card: {
        id: 'WK_T',
        name: 'Уязвимые места',
        description: 'Силуэты считаются за 1 Рану.',
        effect: 'VULNERABLE_SPOTS',
        isRevealed: true,
      },
    } as never;

    const html = renderToStaticMarkup(<IntruderBoardModal view={view} onClose={() => {}} />);

    // Полоса опустшения: мешок 11, запас 16, коробка 1 → всего 28
    expect(html).toContain('В мешке');
    expect(html).toContain('11</b> из');
    expect(html).toContain('28</b> жетонов Пула');
    expect(html).toContain('(запас 16, вышло из игры 1)');
    // Коробка с разбивкой
    expect(html).toContain('Взрослая особь: 1');
    // Кладка: 5 занятых яиц + 3 пустых пунктирных ячейки
    expect(html).toContain('Кладка: 5/8');
    expect(html).toContain('border-dashed');
    // Слабости: раскрытая карта с описанием, остальные рубашки
    expect(html).toContain('Уязвимые места');
    expect(html).toContain('Силуэты считаются за 1 Рану.');
    expect(html).toContain('не изучено');
    // Подсказка про Лабораторию
    expect(html).toContain('«Лаборатория»');
  });

  it('пустой мешок: бейдж МЕШОК ПУСТ и честный текст пропуска Развития Улья', () => {
    const view = makeView();
    view.intrudersPool.bag = { BLANK: 0, LARVA: 0, CREEPER: 0, ADULT: 0, BREEDER: 0, QUEEN: 0 };
    const html = renderToStaticMarkup(<IntruderBoardModal view={view} onClose={() => {}} />);

    expect(html).toContain('Мешок пуст');
    expect(html).toContain('Развитие Улья пропускается');
  });

  it('миниатюры на борту с Боем, ранами и подавлением', () => {
    const view = makeView();
    const playerRoomId = view.players['player-1']!.roomId;
    view.ship.rooms[playerRoomId]!.occupantIntruderIds.push('intr-1');
    view.intrudersPool.boardTokens.push({ id: 'intr-1', type: 'BREEDER', roomId: playerRoomId, woundsCount: 2 });
    view.intrudersPool.attackSuppression['intr-1'] = { round: 3, phase: 'PLAYER_PHASE' };

    const html = renderToStaticMarkup(<IntruderBoardModal view={view} onClose={() => {}} />);

    expect(html).toContain('На борту: 1');
    expect(html).toContain('В Бою');
    expect(html).toContain('Трутень');
    expect(html).toContain('ран: 2');
    expect(html).toContain('Подавлена (раунд 3)');
  });
});
