import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PERSONAL_OBJECTIVE_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type EndgameReport,
  type SanitizedGameState,
} from '@nemesis/shared';
import { EndgameCinematic, EndgameStageView } from './EndgameCinematic';
import { EndgameSummary } from './EndgameSummary';
import { buildEndgameStages, buildGameStats, courseRow, shipFateLines, survivalLine } from './endgameModel';

const objective = PERSONAL_OBJECTIVE_CARDS[0]!;
const noop = () => undefined;

function jumpReport(): EndgameReport {
  return {
    cause: 'HYPERSPACE_JUMP',
    finalMarker: null,
    shipDestroyed: false,
    destinationReached: 'EARTH',
    engineCheck: { engines: { 1: true, 2: false, 3: true }, failedCount: 1, shipExploded: false },
    courseCheck: { coordinateCardId: 'COORDINATES_5', courseMarker: 'B', destination: 'EARTH' },
    facts: { hiveDestroyed: false, queenKilled: false, allRoomsExplored: false, studiedObjectKinds: [] },
    characters: [
      {
        playerId: 'player-1',
        escapeRoute: 'HIBERNATION',
        death: 'INFECTION',
        infection: {
          hadLarva: false,
          scannedCount: 2,
          infectedFound: true,
          drawn: ['ACTION', 'CONTAMINATION', 'ACTION', 'ACTION'],
          survived: false,
        },
        objectiveResults: [],
        isWinner: false,
      },
      {
        playerId: 'player-2',
        escapeRoute: 'POD',
        death: null,
        infection: { hadLarva: false, scannedCount: 1, infectedFound: false, drawn: null, survived: true },
        objectiveResults: [{ objective, metConditionIndex: 0 }],
        isWinner: true,
      },
    ],
  };
}

function finishedView(report: EndgameReport): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState('endgame-ui', { playerCount: 2 }), 'player-1');
  return { ...view, meta: { ...view.meta, phase: 'GAME_OVER', gameOverReason: report.cause }, endgame: report };
}

describe('Модель финала', () => {
  it('сцены идут в порядке стр. 11: судьба корабля, Двигатели, Курс, Заражение, Цели, итоги', () => {
    const report = jumpReport();
    report.characters[0]!.infection = null;
    expect(buildEndgameStages(report).map((stage) => stage.kind)).toEqual([
      'SHIP_FATE',
      'ENGINES',
      'COURSE',
      'INFECTION',
      'OBJECTIVES',
      'SUMMARY',
    ]);
  });

  it('при взрыве без проверок остаются только судьба корабля и итоги', () => {
    const report: EndgameReport = {
      ...jumpReport(),
      cause: 'SHIP_EXPLODED',
      shipDestroyed: true,
      destinationReached: null,
      engineCheck: null,
      courseCheck: null,
      characters: jumpReport().characters.map((entry) => ({
        ...entry,
        death: 'SHIP_DESTROYED' as const,
        infection: null,
        objectiveResults: [],
        isWinner: false,
      })),
    };
    expect(buildEndgameStages(report).map((stage) => stage.kind)).toEqual(['SHIP_FATE', 'SUMMARY']);
    expect(shipFateLines(report).join(' ')).toContain('Корабль взорвался');
    expect(survivalLine(report.characters[0]!)).toBe('Погиб вместе с кораблём');
  });

  it('перенос маркера при пустом корабле попадает в рассказ о судьбе корабля', () => {
    const lines = shipFateLines({ ...jumpReport(), cause: 'NO_ACTIVE_CHARACTERS', finalMarker: 'TIME' });
    expect(lines[0]).toContain('маркер Времени');
    expect(lines[1]).toContain('гиперпрыжок');
  });

  it('карта Координат раскладывается на 4 маркера Курса', () => {
    expect(courseRow('COORDINATES_5').map((entry) => entry.marker)).toEqual(['A', 'B', 'C', 'D']);
    expect(courseRow('UNKNOWN')).toEqual([]);
  });

  it('статистика считает раунды и строки по игрокам в порядке хода', () => {
    const stats = buildGameStats(finishedView(jumpReport()));
    expect(stats.players.map((entry) => entry.playerId)).toEqual(['player-1', 'player-2']);
    expect(stats.rounds).toBeGreaterThanOrEqual(1);
  });
});

describe('Экран финала', () => {
  it('сцены Двигателей, Курса, Заражения и Целей показывают результат проверки', () => {
    const report = jumpReport();
    const view = finishedView(report);
    const render = (stage: Parameters<typeof EndgameStageView>[0]['stage']) =>
      renderToStaticMarkup(<EndgameStageView view={view} report={report} stage={stage} />);

    expect(render({ kind: 'ENGINES' })).toContain('Двигатель 2: Неисправен');
    expect(render({ kind: 'COURSE' })).toContain('Курс B: Земля');
    const infection = render({ kind: 'INFECTION', playerId: 'player-1' });
    expect(infection).toContain('Найдена ИНФЕКЦИЯ');
    expect(infection).toContain('паразит вырвался наружу');
    const objectives = render({ kind: 'OBJECTIVES', playerId: 'player-2' });
    expect(objectives).toContain(objective.name);
    expect(objectives).toContain('Выполнена');
  });

  it('ролик открывается с судьбы корабля и предлагает пропустить к итогам', () => {
    const report = jumpReport();
    const html = renderToStaticMarkup(
      <EndgameCinematic view={finishedView(report)} report={report} onNewGame={noop} onClose={noop} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Гиперпрыжок');
    expect(html).toContain('Пропустить к итогам');
  });

  it('итоги: победитель, Цель, путь спасения и кнопка новой партии', () => {
    const report = jumpReport();
    const html = renderToStaticMarkup(
      <EndgameSummary
        view={finishedView(report)}
        report={report}
        onNewGame={noop}
        onViewBoard={noop}
        onReplay={noop}
      />,
    );
    expect(html).toContain('Есть победитель');
    expect(html).toContain(`Цель «${objective.name}»`);
    expect(html).toContain('Спасся в Капсуле');
    expect(html).toContain('Погиб: паразит внутри');
    expect(html).toContain('Новая партия');
  });

  it('итоги без выживших объявляют, что никто не выжил', () => {
    const report = jumpReport();
    for (const entry of report.characters) {
      entry.death = 'SHIP_DESTROYED';
      entry.isWinner = false;
    }
    const html = renderToStaticMarkup(
      <EndgameSummary
        view={finishedView(report)}
        report={report}
        onNewGame={noop}
        onViewBoard={noop}
        onReplay={noop}
      />,
    );
    expect(html).toContain('Никто не выжил');
    expect(html).toContain('Погиб вместе с кораблём');
  });
});
