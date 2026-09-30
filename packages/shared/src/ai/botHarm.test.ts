import { describe, expect, it } from 'vitest';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState } from '../testing/contactFixtures.js';
import {
  attackAftermath,
  attackDeathChance,
  attackHarm,
  fragilityCost,
  killChance,
  meleeMissChance,
  neutralizeChance,
  shotInjuryOdds,
} from './botHarm.js';
import { BOT_TUNING } from './botTuning.js';

const view = filterStateForPlayer(contactState(), 'player-1');
const FLAMETHROWER = CRAFTED_ITEM_CARDS.find((card) => card.recipeId === 'FLAMETHROWER')!;

describe('Вред Атаки по тексту карт Атак (стр. 20)', () => {
  it('Укус и Ярость убивают при 2 Тяжёлых Травмах, Удар хвостом — уже при 1', () => {
    expect(attackAftermath({ seriousWounds: 1, lightWounds: 0 }, 'BITE')).toMatchObject({
      dead: false,
      seriousWounds: 2,
    });
    expect(attackAftermath({ seriousWounds: 2, lightWounds: 0 }, 'BITE').dead).toBe(true);
    expect(attackAftermath({ seriousWounds: 2, lightWounds: 0 }, 'FRENZY').dead).toBe(true);
    expect(attackAftermath({ seriousWounds: 0, lightWounds: 0 }, 'TAIL_ATTACK').dead).toBe(false);
    expect(attackAftermath({ seriousWounds: 1, lightWounds: 0 }, 'TAIL_ATTACK').dead).toBe(true);
  });

  it('Лёгкие Травмы: третья становится Тяжёлой, при 3 Тяжёлых любая Рана смертельна', () => {
    expect(attackAftermath({ seriousWounds: 2, lightWounds: 1 }, 'CLAW_ATTACK')).toMatchObject({
      dead: false,
      seriousWounds: 3,
      lightWounds: 0,
    });
    expect(attackAftermath({ seriousWounds: 2, lightWounds: 2 }, 'CLAW_ATTACK').dead).toBe(true);
    expect(attackAftermath({ seriousWounds: 3, lightWounds: 0 }, 'SCRATCH').dead).toBe(true);
    expect(attackAftermath({ seriousWounds: 0, lightWounds: 0 }, 'SLIME')).toMatchObject({
      dead: false,
      contaminated: true,
      slimed: true,
    });
  });

  it('чем ближе к гибели, тем дороже Атака: здоровому — доли процента смерти, израненному — больше половины', () => {
    const fresh = { seriousWounds: 0, lightWounds: 0 };
    const dying = { seriousWounds: 3, lightWounds: 0 };
    expect(attackDeathChance(fresh, 'ADULT')).toBe(0);
    expect(attackDeathChance(dying, 'ADULT')).toBeGreaterThan(0.5);
    expect(attackHarm(dying, 'ADULT', BOT_TUNING)).toBeGreaterThan(5 * attackHarm(fresh, 'ADULT', BOT_TUNING));
    expect(attackHarm(fresh, 'QUEEN', BOT_TUNING)).toBeGreaterThan(attackHarm(fresh, 'CREEPER', BOT_TUNING));
    expect(fragilityCost({ seriousWounds: 1, lightWounds: 2 }, BOT_TUNING)).toBeLessThan(
      fragilityCost({ seriousWounds: 2, lightWounds: 0 }, BOT_TUNING),
    );
  });
});

describe('Выстрел и проверка Стойкости (стр. 19–20)', () => {
  it('Личинку убивает любое попадание; без попыток шанса нет', () => {
    const odds = shotInjuryOdds(view, STARTING_WEAPONS.SOLDIER, 'LARVA');
    expect(neutralizeChance(view, 'LARVA', 0, odds, 1)).toBeCloseTo(1 - (odds.get(0) ?? 0));
    expect(neutralizeChance(view, 'ADULT', 0, odds, 0)).toBe(0);
  });

  it('Раны копятся на миниатюре: несколько выстрелов подряд и раненый Чужой — шанс выше', () => {
    const odds = shotInjuryOdds(view, STARTING_WEAPONS.SOLDIER, 'ADULT');
    const one = neutralizeChance(view, 'ADULT', 0, odds, 1);
    const three = neutralizeChance(view, 'ADULT', 0, odds, 3);
    expect(three).toBeGreaterThan(one * 2);
    expect(neutralizeChance(view, 'ADULT', 3, odds, 1)).toBeGreaterThan(one);
    expect(killChance(view, 'ADULT', 4, odds)).toBeGreaterThan(killChance(view, 'ADULT', 0, odds));
  });

  it('Огнемёт ранит на любой грани, кроме Промаха; Рукопашная по Взрослой промахивается чаще', () => {
    const odds = shotInjuryOdds(view, FLAMETHROWER, 'QUEEN');
    expect(odds.get(0)).toBeCloseTo(1 / 6);
    expect(meleeMissChance('ADULT')).toBeGreaterThan(meleeMissChance('CREEPER'));
  });
});
