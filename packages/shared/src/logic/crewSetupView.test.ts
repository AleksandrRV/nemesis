import { describe, expect, it } from 'vitest';
import type { TableSeat } from '../types/crew.js';
import { expectEngineError } from '../testing/contactFixtures.js';
import { currentDraftPicker, pickRole, startCrewSetup } from './crewSetup.js';
import { crewSetupPicker, filterCrewSetupForSeat } from './crewSetupView.js';

const SEATS: TableSeat[] = [
  { seatIndex: 0, kind: 'LOCAL_HUMAN', label: 'Вы' },
  { seatIndex: 1, kind: 'BOT', label: 'Бот' },
  { seatIndex: 2, kind: 'LOCAL_HUMAN', label: 'Игрок 3' },
];

describe('Срез подготовки экипажа', () => {
  it('место видит только свои Цели, у остальных — число карт', () => {
    const setup = startCrewSetup('crew-view', SEATS, 'DRAFT');
    const [me, other] = setup.seats;
    const view = filterCrewSetupForSeat(setup, me!.playerId);
    expect(view.objectives).toEqual(setup.objectives[me!.playerId]);
    expect(view.objectiveCounts[other!.playerId]).toBe(setup.objectives[other!.playerId]!.length);
    expect(JSON.stringify(view)).not.toContain(JSON.stringify(setup.objectives[other!.playerId]));
  });

  it('карты Драфта вскрыты для всех, но выбрать из них может только текущий игрок (стр. 8, шаг 17)', () => {
    const setup = startCrewSetup('crew-view-draft', SEATS, 'DRAFT');
    const picker = currentDraftPicker(setup)!;
    const waiting = setup.seats.find((seat) => seat.playerId !== picker)!.playerId;
    expect(filterCrewSetupForSeat(setup, picker).availableRoles).toEqual(setup.offers[picker]);
    expect(filterCrewSetupForSeat(setup, waiting)).toMatchObject({
      canPick: false,
      availableRoles: [],
      currentOffer: setup.offers[picker],
    });
  });

  it('в свободном выборе боты ждут, пока выберут все люди', () => {
    let setup = startCrewSetup('crew-view-free', SEATS, 'FREE');
    const humans = setup.seats.filter((seat) => seat.kind === 'LOCAL_HUMAN').map((seat) => seat.playerId);
    expect(humans).toContain(crewSetupPicker(setup));
    setup = pickRole(setup, humans[0]!, 'CAPTAIN');
    setup = pickRole(setup, humans[1]!, 'PILOT');
    const bot = setup.seats.find((seat) => seat.kind === 'BOT')!.playerId;
    expect(crewSetupPicker(setup)).toBe(bot);
    expect(filterCrewSetupForSeat(setup, bot).availableRoles).not.toContain('CAPTAIN');
  });

  it('чужое место отклоняется явной ошибкой', () => {
    const setup = startCrewSetup('crew-view-unknown', SEATS, 'FREE');
    expectEngineError(() => filterCrewSetupForSeat(setup, 'player-9'), 'UNKNOWN_PLAYER');
  });
});
