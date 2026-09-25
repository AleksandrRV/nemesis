import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type ActionCard } from '@nemesis/shared';
import { CardUseModal } from './CardUseModal';

const view = filterStateForPlayer(createInitialGameState('card-use-modal'), 'player-1');

function render(card: ActionCard): string {
  return renderToStaticMarkup(
    <CardUseModal
      view={view}
      request={{ kind: 'ACTION', card }}
      combatWeaponItemId={null}
      preferredPaymentIds={[]}
      onConfirm={() => undefined}
      onClose={() => undefined}
    />,
  );
}

const repair: ActionCard = {
  id: 'TEST_REPAIR',
  characterClass: 'PILOT',
  name: 'Ремонт',
  playCost: 1,
  description: 'Сбросьте маркер Неисправности ИЛИ Почините/Повредите Двигатель.',
  effect: { kind: 'REPAIR' },
};

describe('CardUseModal', () => {
  it('модальный диалог с превью карты, ценой и шагами розыгрыша', () => {
    const html = render(repair);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Карта Действия · Пилот');
    expect(html).toContain('Шаги розыгрыша');
    expect(html).toContain('Доплата: 1');
  });

  it('недоступные варианты заблокированы и объясняют причину', () => {
    const html = render(repair);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('Только в Машинном Отсеке');
  });
});
