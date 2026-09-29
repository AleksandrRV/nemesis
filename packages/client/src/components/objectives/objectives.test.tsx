import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CORPORATE_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type SanitizedGameState,
} from '@nemesis/shared';
import { BoardObjectivesSection } from './BoardObjectivesSection';
import {
  ChooseStage,
  ConfirmStage,
  FirstContactObjectiveChoice,
  SealStage,
  type StageProps,
} from './FirstContactObjectiveChoice';
import { ObjectiveBriefing, ObjectiveBriefingScene } from './ObjectiveBriefing';
import { ObjectiveCardBack, ObjectiveCardFace } from './ObjectiveCardView';
import { objectiveStage, playerNumberHint, viewerObjectives, viewerPlayer } from './objectiveModel';

function soloView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('objectives-ui'), 'player-1');
}

function duoView(): { view: SanitizedGameState; hiddenNames: string[] } {
  const state = createInitialGameState('objectives-ui-duo', { playerCount: 2 });
  return {
    view: filterStateForPlayer(state, 'player-1'),
    hiddenNames: state.players['player-2']!.objectives.map((card) => card.name),
  };
}

function stageProps(view: SanitizedGameState, selectedId: string | null = null): StageProps {
  return {
    view,
    objectives: viewerObjectives(view),
    selectedId,
    onSelect: () => undefined,
    onConfirm: () => undefined,
    onBack: () => undefined,
  };
}

const noop = () => undefined;

describe('Модель Целей в интерфейсе', () => {
  it('находит свои Цели в срезе: чужие скрыты (null), свои — 2 карты', () => {
    const { view } = duoView();

    expect(viewerPlayer(view)?.id).toBe('player-1');
    expect(viewerObjectives(view)).toHaveLength(2);
    expect(view.players['player-2']!.objectives).toBeNull();
  });

  it('этап: ожидание Первого Контакта → выбор → Цель выбрана', () => {
    const view = soloView();
    expect(objectiveStage(view)).toBe('AWAITING_FIRST_CONTACT');

    view.intrudersPool.firstEncounterOccurred = true;
    expect(objectiveStage(view)).toBe('CHOOSING');

    view.players['player-1']!.objectives = view.players['player-1']!.objectives!.slice(0, 1);
    expect(objectiveStage(view)).toBe('COMMITTED');
  });

  it('подсказывает, кто «Игрок N» на Корпоративной Цели, и честно говорит, если такого игрока нет', () => {
    const { view } = duoView();

    expect(playerNumberHint(view, 'Персонаж Игрока 2 не должен выжить.')).toBe(
      `Игрок 2 — ${view.players['player-2']!.name}`,
    );
    expect(playerNumberHint(view, 'Персонаж Игрока 5 не должен выжить.')).toBe('Игрока 5 в этой партии нет');
    expect(playerNumberHint(view, 'Корабль должен достигнуть Земли.')).toBeNull();
  });
});

describe('Карта Цели', () => {
  it('лицо: значок «N+», название, условия через «или», цитата и вид колоды', () => {
    const card = CORPORATE_OBJECTIVE_CARDS.find((candidate) => candidate.name === 'Старый спор')!;
    const html = renderToStaticMarkup(<ObjectiveCardFace card={card} />);

    expect(html).toContain('3+');
    expect(html).toContain('Старый спор');
    expect(html).toContain('Персонаж Игрока 3 не должен выжить.');
    expect(html).toContain('или');
    expect(html).toContain(card.flavorText);
    expect(html).toContain('Корпоративная');
  });

  it('Соло/Кооп Цель без значка числа игроков', () => {
    const html = renderToStaticMarkup(<ObjectiveCardFace card={SOLO_COOP_OBJECTIVE_CARDS[0]!} />);

    expect(html).toContain('соло/кооп');
    expect(html).not.toContain('+</span>');
  });

  it('рубашка не раскрывает содержание', () => {
    const html = renderToStaticMarkup(<ObjectiveCardBack kind="PERSONAL" />);

    expect(html).toContain('Цель скрыта');
    expect(html).not.toContain('Сохранить');
  });
});

describe('Брифинг Целей на старте', () => {
  it('показывает обе свои Цели и правило паузы Первого Контакта', () => {
    const view = soloView();
    const html = renderToStaticMarkup(<ObjectiveBriefingScene view={view} onClose={noop} />);

    for (const card of viewerObjectives(view)) expect(html).toContain(card.name);
    expect(html).toContain('Соло: 2 карты Соло/Кооп Целей');
    expect(html).toContain('Первая миниатюра Чужого на поле');
    expect(html).toContain('Принять брифинг');
  });

  it('на двоих — 1 Корпоративная и 1 Личная, чужие Цели в брифинг не попадают', () => {
    const { view, hiddenNames } = duoView();
    const html = renderToStaticMarkup(<ObjectiveBriefingScene view={view} onClose={noop} />);

    expect(html).toContain('1 Корпоративная и 1 Личная Цель');
    for (const name of hiddenNames) expect(html).not.toContain(name);
  });

  it('не открывается, пока занят экран, и после Первого Контакта', () => {
    const view = soloView();
    expect(renderToStaticMarkup(<ObjectiveBriefing view={view} enabled={false} />)).toBe('');

    view.intrudersPool.firstEncounterOccurred = true;
    expect(renderToStaticMarkup(<ObjectiveBriefing view={view} enabled />)).toBe('');
  });
});

describe('Первый Контакт: сцена выбора Цели', () => {
  it('начинается с тревоги и паузы игры, карты ещё не показаны', () => {
    const view = soloView();
    const html = renderToStaticMarkup(
      <FirstContactObjectiveChoice view={view} objectives={viewerObjectives(view)} onKeep={noop} />,
    );

    expect(html).toContain('Первый Контакт');
    expect(html).toContain('Игра приостановлена');
    expect(html).toContain('data-stage="ALARM"');
    expect(html).not.toContain(viewerObjectives(view)[0]!.name);
  });

  it('выбор: обе Цели — кнопки «Оставить Цель»', () => {
    const view = soloView();
    const html = renderToStaticMarkup(<ChooseStage {...stageProps(view)} />);

    for (const card of viewerObjectives(view)) expect(html).toContain(`Оставить Цель «${card.name}»`);
    expect(html).toContain('лицевой стороной вниз');
  });

  it('подтверждение: что остаётся, что уйдёт из игры, и возможность передумать', () => {
    const view = soloView();
    const [kept, dropped] = viewerObjectives(view);
    const html = renderToStaticMarkup(<ConfirmStage {...stageProps(view, kept!.id)} />);

    expect(html).toContain('Остаётся');
    expect(html).toContain('Уйдёт из игры');
    expect(html).toContain(`Оставить «${kept!.name}»?`);
    expect(html).toContain(dropped!.name);
    expect(html).toContain('Подтвердить выбор');
    expect(html).toContain('Передумать');
  });

  it('печать: выбранная Цель принята', () => {
    const view = soloView();
    const html = renderToStaticMarkup(
      <SealStage view={view} objectives={viewerObjectives(view)} selectedId={viewerObjectives(view)[0]!.id} />,
    );

    expect(html).toContain('Цель принята');
  });
});

describe('Вкладка «Цели» на планшете', () => {
  it('по умолчанию карты рубашкой вверх: содержание не видно через плечо', () => {
    const view = soloView();
    const html = renderToStaticMarkup(<BoardObjectivesSection view={view} />);

    expect(html).toContain('Показать Цели');
    expect(html).toContain('aria-pressed="false"');
    for (const card of viewerObjectives(view)) expect(html).not.toContain(card.name);
    expect(html).toContain('игра встанет на паузу');
  });
});
