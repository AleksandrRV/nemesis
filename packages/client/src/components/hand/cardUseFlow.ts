import type { SanitizedGameState } from '@nemesis/shared';
import type { CardUseRequest, TargetSelection, TargetStep, UsageVariant } from './usageTypes';

export type FlowStep =
  { kind: 'VARIANT' } | { kind: 'TARGET'; index: number } | { kind: 'PAYMENT' } | { kind: 'CONFIRM' };

export interface PaymentCandidate {
  id: string;
  label: string;
  sublabel: string;
  selectable: boolean;
  reason?: string;
}

export function buildFlowSteps(variant: UsageVariant | null, cost: number): FlowStep[] {
  const steps: FlowStep[] = [{ kind: 'VARIANT' }];
  if (!variant) return steps;
  variant.steps.forEach((_, index) => steps.push({ kind: 'TARGET', index }));
  if (cost > 0) steps.push({ kind: 'PAYMENT' });
  steps.push({ kind: 'CONFIRM' });
  return steps;
}

export function flowStepTitle(step: FlowStep, variant: UsageVariant | null): string {
  switch (step.kind) {
    case 'VARIANT':
      return 'Вариант';
    case 'TARGET':
      return variant?.steps[step.index]?.title ?? 'Цель';
    case 'PAYMENT':
      return 'Оплата';
    case 'CONFIRM':
      return 'Подтверждение';
  }
}

export function stepCountHint(step: TargetStep, selected: number): string {
  if (step.max === 1) return selected === 1 ? 'Цель выбрана' : 'Выберите одну цель';
  if (step.min === step.max) return `Выбрано ${selected} из ${step.max}`;
  return `Выбрано ${selected} (можно от ${step.min} до ${step.max})`;
}

export function targetStepBlocker(step: TargetStep, selected: readonly string[]): string | null {
  if (selected.length < step.min) {
    return step.min === 1 ? 'Выберите цель' : `Нужно выбрать ещё ${step.min - selected.length}`;
  }
  if (selected.length > step.max) return `Можно выбрать не больше ${step.max}`;
  return null;
}

export function reservedHandCardIds(variant: UsageVariant | null, selection: TargetSelection): string[] {
  if (!variant) return [];
  return variant.steps.flatMap((step, index) =>
    step.kind === 'HAND_CARD' || step.kind === 'CONTAMINATION_CARD' ? [...(selection[index] ?? [])] : [],
  );
}

export function paymentCandidates(
  view: SanitizedGameState,
  request: CardUseRequest,
  reservedIds: readonly string[],
): PaymentCandidate[] {
  const player = view.players[view.meta.activePlayerId];
  if (!player) return [];
  const reserved = new Set(reservedIds);
  return player.actionDeck.hand.map((card) => {
    if (!('characterClass' in card)) {
      return {
        id: card.id,
        label: 'Карта Заражения',
        sublabel: 'Заражение',
        selectable: false,
        reason: 'Заражение нельзя сбросить в оплату',
      };
    }
    const base = { id: card.id, label: card.name, sublabel: `Цена ${card.playCost}` };
    if (request.kind === 'ACTION' && card.id === request.card.id) {
      return { ...base, selectable: false, reason: 'Эту карту вы разыгрываете' };
    }
    if (reserved.has(card.id)) return { ...base, selectable: false, reason: 'Уже выбрана как цель эффекта' };
    return { ...base, selectable: true };
  });
}

export function initialPayment(
  candidates: readonly PaymentCandidate[],
  preferredIds: readonly string[],
  cost: number,
): string[] {
  const selectable = new Set(candidates.filter((candidate) => candidate.selectable).map((candidate) => candidate.id));
  return [...new Set(preferredIds)].filter((id) => selectable.has(id)).slice(0, cost);
}

export function autoFillPayment(
  candidates: readonly PaymentCandidate[],
  current: readonly string[],
  cost: number,
): string[] {
  const chosen = [...current];
  for (const candidate of candidates) {
    if (chosen.length >= cost) break;
    if (candidate.selectable && !chosen.includes(candidate.id)) chosen.push(candidate.id);
  }
  return chosen;
}

export function paymentBlocker(
  candidates: readonly PaymentCandidate[],
  chosen: readonly string[],
  cost: number,
): string | null {
  const available = candidates.filter((candidate) => candidate.selectable).length;
  if (available < cost) return `На руке не хватает карт для оплаты: нужно ${cost}, доступно ${available}`;
  if (chosen.length < cost) return `Отметьте ещё ${cost - chosen.length} карт(ы) для сброса`;
  return null;
}
