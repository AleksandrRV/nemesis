import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { ContactModal } from './ContactModal';
import { selectContactEntry } from './contactModalModel';

function contactView(seed: string, events: GameLogEvent[]): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState(seed), 'player-1');

  view.gameLog = events.map((event, index) => ({ id: `log-${index + 1}`, sequence: index + 1, event }));

  return view;
}

function contactEvent(overrides: Partial<Extract<GameLogEvent, { type: 'CONTACT_OCCURRED' }>> = {}): GameLogEvent {
  return {
    type: 'CONTACT_OCCURRED',
    playerId: 'player-1',
    roomId: 6,
    tokenType: 'ADULT',
    escapeNumber: 4,
    handCount: 2,
    isFirstContact: true,
    clearedCorridorIds: ['3-6'],
    clearedTechnical: false,
    ...overrides,
  };
}

function resolvedEvent(
  overrides: Partial<Extract<GameLogEvent, { type: 'SURPRISE_ATTACK_RESOLVED' }>> = {},
): GameLogEvent {
  return {
    type: 'SURPRISE_ATTACK_RESOLVED',
    playerId: 'player-1',
    intruderId: 'test-adult-1',
    intruderType: 'ADULT',
    attackCardId: 'SCRATCH_1',
    attackCardName: 'Царапина',
    hit: true,
    outcome: 'HIT_SURVIVED',
    lightWoundsDealt: 1,
    seriousWoundsDealt: 0,
    contaminationDealt: 1,
    ...overrides,
  };
}

describe('ContactModal: выбор записи для показа', () => {
  it('без Контактов модалка не выбирается', () => {
    const view = contactView('contact-select-none', [{ type: 'GAME_STARTED' }]);

    expect(selectContactEntry(view, null)).toBeNull();
  });

  it('выбирает последний Контакт и уважает отметку закрытия', () => {
    const view = contactView('contact-select-latest', [
      contactEvent({ tokenType: 'CREEPER' }),
      { type: 'GAME_STARTED' },
      contactEvent({ tokenType: 'QUEEN' }),
    ]);

    expect(selectContactEntry(view, null)?.sequence).toBe(3);
    expect(selectContactEntry(view, 3)).toBeNull();
    expect(selectContactEntry(view, 1)?.sequence).toBe(3);
  });
});

describe('ContactModal: содержимое', () => {
  it('показывает жетон, число Бегства и баннер первого Контакта', () => {
    const view = contactView('contact-modal-token', [contactEvent()]);
    const entry = selectContactEntry(view, null)!;

    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);

    expect(html).toContain('КОНТАКТ!');
    expect(html).toContain('Взрослая Особь');
    expect(html).toContain('Число Бегства 4');
    expect(html).toContain('Первый Контакт партии');
    expect(html).toContain('Маркеры Шума сброшены');
    expect(html).toContain('Понятно');
  });

  it('Пустой жетон показывается без блока Внезапной атаки', () => {
    const view = contactView('contact-modal-blank', [
      contactEvent({ tokenType: 'BLANK', escapeNumber: 0, isFirstContact: false }),
    ]);
    const entry = selectContactEntry(view, null)!;

    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);

    expect(html).toContain('Пустой');
    expect(html).toContain('Чужой не появился');
    expect(html).not.toContain('Внезапная атака');
  });

  it('попадание Внезапной атаки показывается баннером с ранами', () => {
    const view = contactView('contact-modal-hit', [contactEvent(), resolvedEvent()]);
    const entry = selectContactEntry(view, null)!;

    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);

    expect(html).toContain('Внезапная атака: попадание!');
    expect(html).toContain('Царапина');
    expect(html).toContain('1 Лёгкая Травма, 1 Заражение');
  });

  it('мимо, заражение и гибель показываются своими баннерами', () => {
    const view = contactView('contact-modal-outcomes', [
      contactEvent(),
      resolvedEvent({
        outcome: 'MISSED',
        hit: false,
        attackCardName: 'Атака хвостом',
        lightWoundsDealt: 0,
        contaminationDealt: 0,
      }),
      resolvedEvent({ outcome: 'LARVA_INFECTION', intruderType: 'LARVA', attackCardName: null }),
      resolvedEvent({ outcome: 'HIT_DIED', attackCardName: 'Укус' }),
    ]);
    const entry = selectContactEntry(view, null)!;

    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);

    expect(html).toContain('Внезапная атака — мимо!');
    expect(html).toContain('Внезапная атака: заражение!');
    expect(html).toContain('Внезапная атака: гибель!');
  });

  it('без Внезапной атаки показывается спокойный баннер', () => {
    const view = contactView('contact-modal-calm', [
      contactEvent({ escapeNumber: 1, handCount: 4, isFirstContact: false }),
    ]);
    const entry = selectContactEntry(view, null)!;

    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);

    expect(html).toContain('Внезапная атака не сработала');
  });

  it('неконтактная запись не рендерит модалку', () => {
    const view = contactView('contact-modal-other', [{ type: 'GAME_STARTED' }]);

    const html = renderToStaticMarkup(<ContactModal entry={view.gameLog[0]!} view={view} />);

    expect(html).toBe('');
  });
});
