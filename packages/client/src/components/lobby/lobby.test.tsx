import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterCrewSetupForSeat, pickRole, startCrewSetup, type TableSeat } from '@nemesis/shared';
import { CrewBriefingScreen } from './CrewBriefingScreen';
import { LobbyScreen } from './LobbyScreen';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { WaitingRoomScreen } from './WaitingRoomScreen';
import { HandoffShutter } from '../table/HandoffShutter';
import {
  PLAYER_COUNTS,
  fillWithBots,
  gameModeOf,
  initialWaitingSeats,
  tableSeatsOf,
  toggleLocalSeat,
} from './lobbyModel';

const noop = () => undefined;

const SEATS: TableSeat[] = [
  { seatIndex: 0, kind: 'LOCAL_HUMAN', label: 'Вы' },
  { seatIndex: 1, kind: 'BOT', label: 'Бот 2' },
];

describe('Лобби: режимы и места (план 0.8.0, В8-2-2, В8-2-3)', () => {
  it('1 место — Соло, 2–5 — Полукооператив; Кооператив не предлагается', () => {
    expect(PLAYER_COUNTS).toEqual([1, 2, 3, 4, 5]);
    expect(gameModeOf(1)).toBe('SOLO');
    expect(PLAYER_COUNTS.slice(1).every((count) => gameModeOf(count) === 'SEMI_COOP')).toBe(true);
    const html = renderToStaticMarkup(
      <LobbyScreen
        config={{ playerCount: 3, roleSelection: 'DRAFT', seed: 'lobby', botDifficulty: 'VETERAN' }}
        onChange={noop}
        onRerollSeed={noop}
        onContinue={noop}
        onSimulate={noop}
      />,
    );
    expect(html).toContain('Полукооператив');
    expect(html).toContain('Драфт по правилам');
    expect(html).toContain('Свободный выбор');
    expect(html).not.toContain('Кооператив<');
    expect(html).toContain('Ветеран');
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Ветеран/);
  });

  it('в Соло выбора сложности ботов нет: свободных мест не будет', () => {
    const html = renderToStaticMarkup(
      <LobbyScreen
        config={{ playerCount: 1, roleSelection: 'DRAFT', seed: 'solo', botDifficulty: 'CREW' }}
        onChange={noop}
        onRerollSeed={noop}
        onContinue={noop}
        onSimulate={noop}
      />,
    );
    expect(html).not.toContain('Сложность ботов');
    expect(html).toContain('Симуляция ботов');
  });

  it('сложность уходит только на места ботов', () => {
    const seats = toggleLocalSeat(initialWaitingSeats(3), 2);
    expect(tableSeatsOf(seats, 'NOVICE').map((seat) => seat.difficulty)).toEqual([undefined, 'NOVICE', undefined]);
  });

  it('по «Старт» свободные места становятся ботами, занятые за устройством — людьми', () => {
    const seats = toggleLocalSeat(initialWaitingSeats(4), 2);
    expect(seats.map((seat) => seat.status)).toEqual(['YOU', 'WAITING', 'LOCAL', 'WAITING']);
    expect(fillWithBots(seats).map((seat) => seat.status)).toEqual(['YOU', 'BOT', 'LOCAL', 'BOT']);
    expect(tableSeatsOf(seats).map((seat) => `${seat.kind}:${seat.label}`)).toEqual([
      'LOCAL_HUMAN:Вы',
      'BOT:Бот 2',
      'LOCAL_HUMAN:Игрок 3',
      'BOT:Бот 4',
    ]);
    expect(toggleLocalSeat(seats, 0)).toEqual(seats);
  });

  it('экран ожидания показывает «ждём / подключился / бот»', () => {
    const html = renderToStaticMarkup(
      <WaitingRoomScreen
        seats={[
          { seatIndex: 0, status: 'YOU' },
          { seatIndex: 1, status: 'WAITING' },
          { seatIndex: 2, status: 'BOT' },
        ]}
        booting={false}
        onToggleSeat={noop}
        onBack={noop}
        onStart={noop}
      />,
    );
    expect(html).toContain('подключился');
    expect(html).toContain('ждём участника');
    expect(html).toContain('Бот 3');
  });
});

describe('Подготовка экипажа в интерфейсе', () => {
  it('брифинг показывает номер Памятки и свои Цели до выбора Персонажа', () => {
    const setup = startCrewSetup('lobby-briefing', SEATS, 'DRAFT');
    const view = filterCrewSetupForSeat(setup, setup.seats[0]!.playerId);
    const html = renderToStaticMarkup(<CrewBriefingScreen setup={view} isLastBriefing onDone={noop} />);
    expect(html).toContain(`Номер игрока ${view.seats[0]!.orderNumber}`);
    for (const card of view.objectives) expect(html).toContain(card.name);
    expect(html).toContain('К выбору Персонажей');
  });

  it('Драфт: две вскрытые карты текущего игрока и таймер у того, кто выбирает', () => {
    const humans: TableSeat[] = SEATS.map((seat) => ({ ...seat, kind: 'LOCAL_HUMAN' }));
    const setup = startCrewSetup('lobby-draft-ui', humans, 'DRAFT');
    const picker = setup.pickOrder[0]!;
    const html = renderToStaticMarkup(
      <RoleSelectionScreen
        setup={filterCrewSetupForSeat(setup, picker)}
        onPick={noop}
        onTimeout={noop}
        onLaunch={noop}
      />,
    );
    expect(html.match(/aria-label="Персонаж: /g)).toHaveLength(2);
    expect(html).toContain('role="timer"');
    const waiting = setup.pickOrder[1]!;
    const waitingHtml = renderToStaticMarkup(
      <RoleSelectionScreen
        setup={filterCrewSetupForSeat(setup, waiting)}
        onPick={noop}
        onTimeout={noop}
        onLaunch={noop}
      />,
    );
    expect(waitingHtml.match(/aria-label="Персонаж: /g)).toHaveLength(2);
    expect(waitingHtml).not.toContain('role="timer"');
  });

  it('свободный выбор: занятая роль помечена владельцем и недоступна', () => {
    let setup = startCrewSetup('lobby-free-ui', SEATS, 'FREE');
    const human = setup.seats.find((seat) => seat.kind === 'LOCAL_HUMAN')!.playerId;
    setup = pickRole(setup, human, 'SOLDIER');
    const bot = setup.seats.find((seat) => seat.kind === 'BOT')!.playerId;
    const html = renderToStaticMarkup(
      <RoleSelectionScreen
        setup={filterCrewSetupForSeat(setup, human)}
        onPick={noop}
        onTimeout={noop}
        onLaunch={noop}
      />,
    );
    expect(html).toContain('Солдат — занят: Вы');
    expect(html).toContain('Бот 2 выбирает');
    expect(bot).not.toBe(human);
  });

  it('шторка передачи устройства называет следующего', () => {
    const html = renderToStaticMarkup(<HandoffShutter recipient="Игрок 3" detail="Игрок №2" onReady={noop} />);
    expect(html).toContain('ПЕРЕДАЙТЕ УСТРОЙСТВО');
    expect(html).toContain('Я — Игрок 3');
  });
});
