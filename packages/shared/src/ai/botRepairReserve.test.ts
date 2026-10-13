import { describe, expect, it } from 'vitest';
import type { ActionCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { BOT, actionCardOfKind, botTable, handOf, rankedFor } from '../testing/botTacticsFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import { cardValue, paymentFor, paymentWorth, REPAIR_CARD_KINDS } from './botHand.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';

const RESERVE = BOT_TUNING.hand.repairReserveFrom;
const careless: BotTuning = { ...BOT_TUNING, hand: { ...BOT_TUNING.hand, repairReserveFrom: 99 } };

/** На руке бота карта Ремонта и базовая карта Поиска — обе стоят одинаково, пока Ремонт не нужен. */
function repairInHand(seed: string, broken: number): { state: GameState; repairId: string } {
  const state = botTable(seed);
  const deck = state.players[BOT]!.actionDeck;
  const own = [...deck.hand, ...deck.drawPile, ...deck.discard].filter((card) => 'effect' in card) as ActionCard[];
  const repair = own.find((card) => REPAIR_CARD_KINDS.has(card.effect.kind))!;
  const search = own.find((card) => card.effect.kind === 'SEARCH')!;
  deck.drawPile = deck.drawPile.filter((card) => card !== repair && card !== search);
  deck.discard = deck.discard.filter((card) => card !== repair && card !== search);
  handOf(state, [repair, search], 2);
  const rooms = Object.values(state.ship.rooms).filter((room) => room.isExplored);
  for (const room of rooms.slice(0, broken)) room.hasMalfunction = true;
  return { state, repairId: repair.id };
}

describe('Карта Ремонта в оплате, пока на борту много Неисправностей (стр. 11, 17)', () => {
  it('ниже порога Неисправностей карта Ремонта — базовая; с порога — стоит как боевая', () => {
    const repair = actionCardOfKind('BASIC_REPAIR');
    const below = filterStateForPlayer(repairInHand('reserve-below', RESERVE - 1).state, BOT);
    const broken = filterStateForPlayer(repairInHand('reserve-broken', RESERVE).state, BOT);
    expect(paymentWorth(below, repair, BOT_TUNING)).toBe(cardValue(repair, BOT_TUNING));
    expect(paymentWorth(broken, repair, BOT_TUNING)).toBe(BOT_TUNING.hand.cardValue.COMBAT);
  });

  it('с Неисправностью на борту бот платит другой картой, даже базовой «Карте Ремонта» (стр. 13)', () => {
    const { state, repairId } = repairInHand('reserve-pay', RESERVE);
    const view = filterStateForPlayer(state, BOT);
    expect(paymentFor(view, BOT, 1, BOT_TUNING)).not.toContain(repairId);
    const basic = actionCardOfKind('BASIC_REPAIR');
    const search = actionCardOfKind('SEARCH');
    expect(paymentWorth(view, basic, BOT_TUNING)).toBeGreaterThan(paymentWorth(view, search, BOT_TUNING));
    expect(paymentWorth(view, basic, careless)).toBe(paymentWorth(view, search, careless));
  });

  it('если другой карты нет, бережёная карта всё же идёт в оплату', () => {
    const { state, repairId } = repairInHand('reserve-last', RESERVE);
    expect(paymentFor(filterStateForPlayer(state, BOT), BOT, 2, BOT_TUNING)).toContain(repairId);
  });

  it('запас не дорожит самим Ремонтом: розыгрыш карты Ремонта стоит столько же', () => {
    const { state } = repairInHand('reserve-play', 0);
    const broken = standAt(state, BOT, 'LABORATORY');
    state.ship.rooms[broken]!.hasMalfunction = true;
    const fix = (tuning: BotTuning) =>
      rankedFor(state, tuning).find((entry) =>
        entry.candidate.effects.some((produced) => produced.kind === 'FIX_MALFUNCTION'),
      )!;
    expect(fix(BOT_TUNING).candidate.spent).toBe(fix(careless).candidate.spent);
  });
});
