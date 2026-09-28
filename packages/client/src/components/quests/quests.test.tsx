import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RED_ITEM_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  questItemCardId,
  type QuestKey,
  type SanitizedGameState,
} from '@nemesis/shared';
import { buildQuestViews, collectQuestUnlocks, questProgress } from './questBoardModel';
import { QuestDossier } from './QuestDossier';
import { QuestActivationModal } from './QuestActivationModal';
import { QuestUnlockScene } from './QuestUnlockCinematic';
import { getItemUsage } from '../hand/itemUsage';
import { formatQuestLogEvent } from '../log/craftLogFormat';

function makeView(questKey: QuestKey, isActivated = false): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState('quests-ui'), 'player-1');
  view.players['player-1']!.questItems = [{ id: 'q-1', name: 'Квест', questKey, isActivated }];
  return view;
}

function standIn(view: SanitizedGameState, definitionId: string): void {
  const room = view.ship.rooms[view.players['player-1']!.roomId]!;
  room.definitionId = definitionId;
  room.hasMalfunction = false;
}

describe('Модель квестов планшета', () => {
  it('квест в комнате: вне комнаты — закрыт с подсказкой, в комнате — готов', () => {
    const view = makeView('SECURITY_KEY');
    const locked = buildQuestViews(view)[0]!;
    expect(locked.status).toBe('LOCKED');
    expect(locked.conditions[0]).toMatchObject({ label: 'Находиться в комнате «Мостик»', met: false });
    expect(locked.hint).toContain('Доберитесь');
    standIn(view, 'COCKPIT');
    expect(buildQuestViews(view)[0]!.status).toBe('READY');
    expect(questProgress(buildQuestViews(view))).toEqual({ active: 0, ready: 1, total: 1 });
  });

  it('квест со сбросом готов, когда в инвентаре есть нужный Предмет', () => {
    const view = makeView('FLASHLIGHT');
    expect(buildQuestViews(view)[0]!.status).toBe('LOCKED');
    const charge = structuredClone(RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_ENERGY_CHARGE_'))!);
    view.players['player-1']!.inventory = [charge];
    const ready = buildQuestViews(view)[0]!;
    expect(ready.status).toBe('READY');
    expect(ready.sacrificeItems.map((item) => item.id)).toEqual([charge.id]);
  });

  it('активированный квест — Предмет с вариантами использования', () => {
    const view = makeView('SECURITY_KEY', true);
    expect(buildQuestViews(view)[0]!.status).toBe('ACTIVE');
    const card = {
      ...structuredClone(RED_ITEM_CARDS[0]!),
      id: questItemCardId('q-1'),
      origin: 'QUEST' as const,
      color: 'QUEST' as const,
    };
    const variants = getItemUsage(card, view, 'INVENTORY').variants;
    expect(variants[0]).toMatchObject({ id: 'SECURITY', available: true });
    expect(variants[0]!.steps[0]!.kind).toBe('ANY_ROOM');
  });

  it('пассивный квестовый Предмет объясняет, что применять его не нужно', () => {
    const view = makeView('AUTOLOADER', true);
    const card = {
      ...structuredClone(RED_ITEM_CARDS[0]!),
      id: questItemCardId('q-1'),
      origin: 'QUEST' as const,
      color: 'QUEST' as const,
    };
    expect(getItemUsage(card, view, 'INVENTORY').variants[0]!.reason).toContain('Пассивный');
  });
});

describe('Интерфейс квестов', () => {
  it('досье готового квеста подсвечено и предлагает активацию', () => {
    const view = makeView('SECURITY_KEY');
    standIn(view, 'COCKPIT');
    const html = renderToStaticMarkup(
      <QuestDossier
        quest={buildQuestViews(view)[0]!}
        canAct
        onActivate={() => undefined}
        onShowRoom={() => undefined}
      />,
    );
    expect(html).toContain('animate-quest-ready-glow');
    expect(html).toContain('КВЕСТ');
    expect(html).toContain('Ключ безопасности');
    expect(html).toContain('Награда');
    expect(html).not.toContain('disabled=""');
  });

  it('окно активации показывает условие, награду, сброс Предмета и оплату', () => {
    const view = makeView('FLASHLIGHT');
    view.players['player-1']!.inventory = [
      structuredClone(RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_ENERGY_CHARGE_'))!),
    ];
    const html = renderToStaticMarkup(
      <QuestActivationModal
        view={view}
        quest={buildQuestViews(view)[0]!}
        preferredPaymentIds={[]}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Станет Предметом');
    expect(html).toContain('Какой Предмет сбросить');
    expect(html).toContain('Энергозаряд');
    expect(html).toContain('Карты для оплаты');
  });

  it('кинематографичная сцена: печать, разворот карты и появление Предмета', () => {
    const html = renderToStaticMarkup(
      <QuestUnlockScene
        unlock={{ key: 'k', questKey: 'ARMOR', sacrificedItemName: 'Инструменты' }}
        onDone={() => undefined}
      />,
    );
    expect(html).toContain('animate-quest-seal-crack');
    expect(html).toContain('animate-quest-turn-away');
    expect(html).toContain('animate-quest-item-reveal');
    expect(html).toContain('КВЕСТ ВЫПОЛНЕН');
    expect(html).toContain('«Инструменты» сброшен');
  });

  it('новые записи активации попадают в очередь сцен, журнал называет награду', () => {
    const view = makeView('ARMOR');
    view.gameLog = [
      ...view.gameLog,
      {
        id: 'log-q',
        sequence: 999,
        event: {
          type: 'QUEST_ACTIVATED',
          playerId: 'player-1',
          questItemId: 'q-1',
          questKey: 'ARMOR',
          itemName: 'Броня',
        },
      },
    ];
    expect(collectQuestUnlocks(view, 998).map((unlock) => unlock.questKey)).toEqual(['ARMOR']);
    const text = formatQuestLogEvent(view.gameLog.at(-1)!.event as never, view)
      .map((segment) => segment.text)
      .join('');
    expect(text).toContain('«Броня»');
  });
});
