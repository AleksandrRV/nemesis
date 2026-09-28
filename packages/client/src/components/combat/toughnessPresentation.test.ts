import { describe, expect, it } from 'vitest';
import { INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import {
  RETREAT_ARROW_LABEL,
  countedFaceText,
  survivalText,
  toughnessCardLabel,
  toughnessGlyph,
  toughnessSummary,
} from './toughnessPresentation';

const arrowCard = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_4')!;
const numberCard = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_3')!;

describe('Подписи карты проверки Стойкости (стр. 20)', () => {
  it('карта с числом показывает Стойкость', () => {
    expect(toughnessCardLabel(numberCard)).toBe('Стойкость 6');
    expect(toughnessGlyph(numberCard)).toBe('6');
  });

  it('карта со стрелкой показывает стрелку вместо числа', () => {
    expect(toughnessCardLabel(arrowCard)).toBe(RETREAT_ARROW_LABEL);
    expect(toughnessGlyph(arrowCard)).toBe('➜');
  });
});

describe('Итог проверки Стойкости', () => {
  it('с суммой — сравнение Ран со Стойкостью', () => {
    expect(toughnessSummary(8)).toBe('Сумма Стойкости: 8');
    expect(survivalText(3, 8)).toContain('Ран 3 против Стойкости 8');
  });

  it('со стрелкой — без суммы и с Отступлением', () => {
    expect(toughnessSummary(null)).toContain('не сравниваются');
    expect(survivalText(3, null)).toContain('Чужой выжил и Отступает');
    expect(survivalText(3, null)).not.toContain('против Стойкости');
  });
});

describe('Засчитанная грань кубика Боя', () => {
  it('поясняет подмену «Уязвимыми местами» и молчит без неё', () => {
    expect(countedFaceText('ONE_WOUND')).toContain('«Уязвимые места»');
    expect(countedFaceText(undefined)).toBeNull();
  });
});
