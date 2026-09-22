import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
import type { EventCard, GameLogEntry } from '@nemesis/shared';

import {
  AttackCardVisual,
  EventCardVisual,
  FireStepVisual,
  HiveTokenVisual,
  TimeTrackGauge,
} from './eventPhasePresentation';

const VIEW = filterStateForPlayer(createInitialGameState('presentation-widgets'), 'player-1');

describe('Кинематографичные виджеты презентации Фазы Событий', () => {
  it('шкала Времени: 15 делений, маркер и плавный переход ширины', () => {
    const html = renderToStaticMarkup(
      <TimeTrackGauge
        event={{ type: 'TIME_TRACK_ADVANCED', round: 2, timeTrackPosition: 3, selfDestructTrackPosition: null }}
      />,
    );

    expect(html).toContain('МАРКЕР ВРЕМЕНИ');
    expect(html).toContain('3 / 15');
    // Маркер на третьем делении, стартовая ширина — предыдущая позиция (2/15).
    expect(html).toContain('left:calc(20% - 2px)');
    expect(html).toContain('transition:width');
    // Самоуничтожение не активно — вторая шкала не рендерится.
    expect(html).not.toContain('САМОУНИЧТОЖЕНИЕ');
  });

  it('шкала Самоуничтожения появляется при активном процессе', () => {
    const html = renderToStaticMarkup(
      <TimeTrackGauge
        event={{ type: 'TIME_TRACK_ADVANCED', round: 3, timeTrackPosition: 4, selfDestructTrackPosition: 6 }}
      />,
    );

    expect(html).toContain('САМОУНИЧТОЖЕНИЕ');
    expect(html).toContain('6 / 8');
  });

  it('карта Атаки Чужих: силуэт, карта и бейдж исхода с травмами жертвы', () => {
    const event: Extract<GameLogEntry['event'], { type: 'EVENT_PHASE_ATTACK_RESOLVED' }> = {
      type: 'EVENT_PHASE_ATTACK_RESOLVED',
      playerId: 'player-1',
      roomId: 11,
      intruderId: 'adult-1',
      intruderType: 'ADULT',
      card: {
        id: 'IAT_SCRATCH_1',
        name: 'Царапина',
        description: 'Атака когтями',
        effect: 'SCRATCH',
        toughness: 3,
        hasRetreat: false,
        attackerTypes: ['ADULT'],
      },
      outcome: 'HIT',
      victims: [
        { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
      ],
    };
    const html = renderToStaticMarkup(<AttackCardVisual view={VIEW} event={event} />);

    expect(html).toContain('Взрослая особь атакует');
    expect(html).toContain('«Царапина»');
    expect(html).toContain('Стойкость 3');
    expect(html).toContain('РАНЕНИЕ');
    expect(html).toContain('Лёгкие ×1');
  });

  it('Личинка атакует без карты Атаки, промах помечается отдельно', () => {
    const event: Extract<GameLogEntry['event'], { type: 'EVENT_PHASE_ATTACK_RESOLVED' }> = {
      type: 'EVENT_PHASE_ATTACK_RESOLVED',
      playerId: 'player-1',
      roomId: 11,
      intruderId: 'larva-1',
      intruderType: 'LARVA',
      card: null,
      outcome: 'MISS',
      victims: [],
    };
    const html = renderToStaticMarkup(<AttackCardVisual view={VIEW} event={event} />);

    expect(html).toContain('Без карты Атаки — Личинка заражает');
    expect(html).toContain('ПРОМАХ');
  });

  it('карта События: номер Коридора, силуэты типов и судьба карты', () => {
    const card: EventCard = {
      id: 'EV_SHORT_CIRCUIT',
      name: 'Короткое замыкание',
      description: 'Отказы систем',
      effect: 'SHORT_CIRCUIT',
      corridorNumber: 4,
      intruderTypes: ['ADULT'],
      isDestroyedOnResolve: false,
      isReshuffledIntoDeck: false,
    };
    const html = renderToStaticMarkup(<EventCardVisual card={card} />);

    expect(html).toContain('КАРТА СОБЫТИЯ');
    expect(html).toContain('КОРИДОР 4');
    expect(html).toContain('Короткое замыкание');
    expect(html).toContain('Отказы систем');
    // Силуэт Взрослой Особи верхнего блока.
    expect(html).toContain('#ef4444');
  });

  it('карта «Подготовка» показывает любое направление и отсутствие движения', () => {
    const card: EventCard = {
      id: 'EV_PREPARATION',
      name: 'Подготовка',
      description: 'Выбор карты',
      effect: 'PREPARATION',
      corridorNumber: 'ANY',
      intruderTypes: [],
      isDestroyedOnResolve: false,
      isReshuffledIntoDeck: false,
    };
    const html = renderToStaticMarkup(<EventCardVisual card={card} />);

    expect(html).toContain('ЛЮБОЙ КОРИДОР');
    expect(html).toContain('Движения Чужих нет');
  });

  it('урон от огня считает Раны Чужим и уничтоженные Яйца', () => {
    const html = renderToStaticMarkup(<FireStepVisual wounds={2} eggsDestroyed={1} />);

    expect(html).toContain('Чужие в огне получили Ран: 2');
    expect(html).toContain('Яиц уничтожено огнём: 1');
  });

  it('жетон Улья: мешок, вытянутый жетон и текст исхода', () => {
    const html = renderToStaticMarkup(
      <HiveTokenVisual
        event={{
          type: 'HIVE_DEVELOPMENT_RESOLVED',
          round: 1,
          tokenType: 'QUEEN',
          outcome: {
            kind: 'QUEEN',
            queenPlaced: true,
            intruderId: 'queen-1',
            contactPlayerIds: ['player-1'],
            eggAdded: false,
          },
        }}
      />,
    );

    expect(html).toContain('Вытянут жетон: Королева');
    expect(html).toContain('Королева выставлена в Улей — немедленный Контакт!');
  });

  it('исход Личинки описывает обмен жетонами Пула', () => {
    const html = renderToStaticMarkup(
      <HiveTokenVisual
        event={{
          type: 'HIVE_DEVELOPMENT_RESOLVED',
          round: 1,
          tokenType: 'LARVA',
          outcome: { kind: 'LARVA', adultAdded: true },
        }}
      />,
    );

    expect(html).toContain('Вытянут жетон: Личинка');
    expect(html).toContain('Личинка убрана из Пула; в мешок добавлена Взрослая Особь.');
  });
});
