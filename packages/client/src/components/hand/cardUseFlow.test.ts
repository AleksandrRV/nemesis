import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type ActionCard } from '@nemesis/shared';
import {
  autoFillPayment,
  buildFlowSteps,
  initialPayment,
  paymentBlocker,
  paymentCandidates,
  reservedHandCardIds,
  targetStepBlocker,
} from './cardUseFlow';
import type { UsageVariant } from './usageTypes';

const view = filterStateForPlayer(createInitialGameState('card-use-flow'), 'player-1');
const hand = view.players['player-1']!.actionDeck.hand.filter(
  (entry): entry is ActionCard => 'characterClass' in entry,
);

const variant: UsageVariant = {
  id: 'X',
  label: 'X',
  icon: 'card',
  available: true,
  steps: [{ kind: 'HAND_CARD', title: 'Карты', min: 0, max: 3 }],
};

describe('Шаги окна розыгрыша', () => {
  it('вариант → цели → оплата → подтверждение; без цены шага оплаты нет', () => {
    expect(buildFlowSteps(variant, 1).map((step) => step.kind)).toEqual(['VARIANT', 'TARGET', 'PAYMENT', 'CONFIRM']);
    expect(buildFlowSteps(variant, 0).map((step) => step.kind)).toEqual(['VARIANT', 'TARGET', 'CONFIRM']);
    expect(buildFlowSteps(null, 1).map((step) => step.kind)).toEqual(['VARIANT']);
  });

  it('шаг целей блокируется, пока не выбрано нужное количество', () => {
    const pair = { kind: 'UNEXPLORED_ROOM' as const, title: 'Два отсека', min: 2, max: 2 };
    expect(targetStepBlocker(pair, ['1'])).toContain('ещё 1');
    expect(targetStepBlocker(pair, ['1', '2'])).toBeNull();
    expect(targetStepBlocker({ ...pair, min: 0, max: 3 }, [])).toBeNull();
  });
});

describe('Оплата в окне розыгрыша', () => {
  it('сама карта, Заражение и карты-цели эффекта в оплату не идут', () => {
    const played = hand[0]!;
    const candidates = paymentCandidates(view, { kind: 'ACTION', card: played }, [hand[1]!.id]);
    expect(candidates.find((entry) => entry.id === played.id)).toMatchObject({ selectable: false });
    expect(candidates.find((entry) => entry.id === hand[1]!.id)).toMatchObject({ selectable: false });
    expect(reservedHandCardIds(variant, [[hand[2]!.id]])).toEqual([hand[2]!.id]);
  });

  it('предзаполняет из резерва и отмеченных карт, автовыбор добирает недостающее', () => {
    const candidates = paymentCandidates(view, { kind: 'ACTION', card: hand[0]! }, []);
    expect(initialPayment(candidates, [hand[0]!.id, hand[1]!.id], 1)).toEqual([hand[1]!.id]);
    expect(autoFillPayment(candidates, [], 2)).toHaveLength(2);
    expect(paymentBlocker(candidates, [], 1)).toContain('Отметьте ещё 1');
    expect(paymentBlocker(candidates, [hand[1]!.id], 1)).toBeNull();
    expect(paymentBlocker(candidates, [], 99)).toContain('не хватает');
  });
});
