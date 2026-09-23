import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';

/**
 * Шаг 8: интерфейс классовых боевых карт — режимы ShootModal, панель отхода
 * без атак, переброс «Прицельного огня» и «Адреналин» в диалоге побега.
 * Node-среда: статичная разметка, стор подменяется hook-функцией.
 */
const storeHolder: { state: Record<string, unknown> } = { state: {} };
vi.mock('../../store/gameStore', () => {
  const useGameStore = (selector: (state: Record<string, unknown>) => unknown) => selector(storeHolder.state);
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set = (
    state: Record<string, unknown>,
  ) => {
    storeHolder.state = state;
  };
  return { useGameStore };
});

import { DecisionModal } from '../modals/DecisionModal';
import { ShootModal } from '../combat/ShootModal';
import { DisengagePanel } from './DisengagePanel';
import { EscapeConfirmDialog } from './EscapeConfirmDialog';

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

function viewWithCombat(seed: string, handCardIds: string[]): SanitizedGameState {
  const raw = createInitialGameState(seed);
  const player = raw.players['player-1']!;
  raw.intrudersPool.boardTokens.push({ id: 'adult-ui', type: 'ADULT', roomId: player.roomId, woundsCount: 0 });
  raw.ship.rooms[player.roomId]!.occupantIntruderIds.push('adult-ui');
  for (const cardId of handCardIds) {
    player.actionDeck.hand.push({
      id: cardId,
      characterClass: cardId.startsWith('ACT_SOL') ? 'SOLDIER' : cardId.startsWith('ACT_CAP') ? 'CAPTAIN' : 'SCOUT',
      name: 'Тестовая карта',
      playCost: 0,
      description: '',
      effect: { kind: 'BURST_FIRE', variant: 'SOLDIER' },
    } as never);
  }
  return filterStateForPlayer(raw, 'player-1');
}

describe('ShootModal: режимы классовых карт (Шаг 8)', () => {
  function setup(handCardIds: string[]): string {
    const view = viewWithCombat('shoot-modes', handCardIds);
    storeHolder.state = {
      view,
      shootModalOpen: true,
      setShootModalOpen: () => undefined,
      selectedCardIds: [],
      convertedCardIds: [],
      consumePaymentCards: () => [],
      dispatch: () => undefined,
      rejection: null,
    };
    return render(<ShootModal />);
  }

  it('без классовых карт — только базовый режим, остальные закрыты', () => {
    const html = setup([]);
    expect(html).toContain('Режим выстрела');
    expect(html).toContain('Стрельба очередью');
    expect(html).toContain('Карты нет в руке');
  });

  it('карты в руке открывают свои режимы', () => {
    const html = setup(['ACT_SOL_AIMED_FIRE', 'ACT_SOL_BURST_FIRE', 'ACT_SCO_ADRENALINE']);
    expect(html).toContain('Прицельный огонь');
    expect(html).toContain('Стрельба очередью');
    expect(html).toContain('Адреналин');
    expect(html).not.toContain('Карты нет в руке');
  });
});

describe('DecisionModal: переброс кубика «Прицельного огня»', () => {
  it('показывает выпавшую грань и оба решения', () => {
    storeHolder.state = { dispatch: () => undefined, view: null };
    const html = render(
      <DecisionModal
        decision={{
          id: 'reroll-1',
          playerId: 'player-1',
          type: 'REROLL_COMBAT_DIE',
          firstFace: 'ONE_WOUND',
          weaponName: 'Пистолет учёного',
          ammoLeft: 4,
          targetIntruderId: 'adult-ui',
          woundsBefore: 0,
          weaponBonusEligible: false,
        }}
      />,
    );

    expect(html).toContain('ПРИЦЕЛЬНЫЙ ОГОНЬ: ПЕРЕБРОС?');
    expect(html).toContain('1 РАНА');
    expect(html).toContain('Перебросить');
    expect(html).toContain('Оставить грань');
  });
});

describe('DisengagePanel: отход без атак', () => {
  it('выбор оружия, направления и (у Солдата) перенос другого персонажа', () => {
    const html = render(
      <DisengagePanel
        cardId="ACT_SOL_SUPPRESSIVE_FIRE"
        cardName="Заградительный огонь"
        weapons={[{ id: 'w-1', name: 'Боевая винтовка', ammo: 3 }]}
        destinations={[{ roomId: 6 }, { roomId: 14 }]}
        companions={[{ playerId: 'player-2', name: 'Пилот' }]}
        onDispatch={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain('Заградительный огонь: отход без атак');
    expect(html).toContain('Боевая винтовка (Боезапас: 3)');
    expect(html).toContain('Отсек #6');
    expect(html).toContain('Перенести другого');
    expect(html).toContain('Отойти без атак [карта + 1 Боезапас]');
    // Ничего не выбрано — отправка заблокирована.
    expect(html).toContain('disabled');
  });

  it('у Капитана поле переноса другого персонажа отсутствует', () => {
    const html = render(
      <DisengagePanel
        cardId="ACT_CAP_SUPPRESSIVE_FIRE"
        cardName="Огонь на подавление"
        weapons={[{ id: 'w-1', name: 'Револьвер', ammo: 2 }]}
        destinations={[{ roomId: 6 }]}
        companions={[{ playerId: 'player-2', name: 'Пилот' }]}
        onDispatch={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).not.toContain('Перенести другого');
  });
});

describe('EscapeConfirmDialog: «Адреналин» при побеге (Шаг 8)', () => {
  it('карта в руке добавляет вариант побега с добором', () => {
    const html = render(
      <EscapeConfirmDialog
        intruderLabels={['Взрослая особь']}
        onConfirm={() => undefined}
        onCancel={() => undefined}
        adrenalineAvailable
        onAdrenalineEscape={() => undefined}
      />,
    );

    expect(html).toContain('Бежать с «Адреналином» [цена: 1, взять карту]');
  });

  it('без карты — только базовые варианты', () => {
    const html = render(
      <EscapeConfirmDialog
        intruderLabels={['Взрослая особь']}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).not.toContain('Адреналином');
  });
});
