import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import type { ContactPresentationEvent, GameLogEntry } from '@nemesis/shared';
import { ContactModal } from './ContactModal';
import { IntruderSilhouette } from './IntruderSilhouette';
import { initialContactSequence, nextContactPresentation } from './contactPresentationModel';
import { ContactOverlay } from './ContactOverlay';
import { formatGameLog } from '../log/gameLogModel';

const CONTACT: ContactPresentationEvent = {
  type: 'CONTACT_OCCURRED',
  playerId: 'player-1',
  roomId: 6,
  tokenType: 'ADULT',
  escapeNumber: 4,
  handCount: 3,
  intruderId: 'intruder-1',
  firstEncounter: true,
  surpriseAttack: true,
  source: 'NOISE',
};
const ATTACK: ContactPresentationEvent = {
  type: 'SURPRISE_ATTACK_RESOLVED',
  playerId: 'player-1',
  roomId: 6,
  intruderId: 'intruder-1',
  intruderType: 'ADULT',
  card: INTRUDER_ATTACK_CARDS[0]!,
  outcome: 'HIT',
  victims: [
    { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
  ],
};

const view = () => filterStateForPlayer(createInitialGameState('contact-modal'), 'player-1');
function render(event: ContactPresentationEvent): string {
  return renderToStaticMarkup(
    <ContactModal entry={{ id: 'log-2', sequence: 2, event }} view={view()} onClose={() => undefined} />,
  );
}

describe('Окно побега — атака в спину (ESCAPE_ATTACK_RESOLVED)', () => {
  const ESCAPE: ContactPresentationEvent = {
    type: 'ESCAPE_ATTACK_RESOLVED',
    playerId: 'player-1',
    roomId: 11,
    intruderId: 'intruder-1',
    intruderType: 'ADULT',
    card: INTRUDER_ATTACK_CARDS[4]!,
    outcome: 'MISS',
    victims: [
      { playerId: 'player-1', isDead: false, lightWounds: 0, seriousWounds: 0, hasLarva: false, hasSlime: false },
    ],
  };

  it('заголовок побега, префис порядка атак и текст промаха', () => {
    const html = render(ESCAPE);

    expect(html).toContain('ПОБЕГ — АТАКА В СПИНУ');
    expect(html).toContain('каждый Чужой провёл Атаку в спину');
    expect(html).toContain('FAQ Rules 5');
    expect(html).toContain('Промах: на карте нет символа этого Чужого');
  });

  it('запись побега входит в очередь боевых окон', () => {
    const entry = { id: 'log-9', sequence: 9, event: ESCAPE } as GameLogEntry;
    expect(nextContactPresentation([entry], 0)?.event.type).toBe('ESCAPE_ATTACK_RESOLVED');
    expect(initialContactSequence([entry])).toBe(8);
  });
});

describe('Окно рукопашной атаки (MELEE_RESOLVED)', () => {
  const MELEE_MISS: ContactPresentationEvent = {
    type: 'MELEE_RESOLVED',
    playerId: 'player-1',
    roomId: 6,
    targetIntruderId: 'intruder-1',
    targetType: 'ADULT',
    dieFace: 'MISS',
    woundsBefore: 0,
    injuries: 0,
    woundsTotal: 0,
    toughnessCards: [],
    toughnessTotal: 0,
    killed: false,
    contaminated: true,
    seriousWoundTaken: true,
    attackerDied: false,
  };

  it('промах: карта Заражения, ответная Тяжёлая Травма, без проверки Стойкости', () => {
    const html = render(MELEE_MISS);
    expect(html).toContain('РУКОПАШНАЯ АТАКА');
    expect(html).toContain('Карта Заражения вытянута в сброс');
    expect(html).toContain('Тяжёлая Травма: +1');
    expect(html).toContain('ПРОМАХ — ТЯЖЁЛАЯ ТРАВМА');
    expect(html).not.toContain('Проверка Стойкости');
  });

  it('гибель Чужого врукопашную и выживание без травм', () => {
    const kill = render({
      ...MELEE_MISS,
      dieFace: 'ONE_WOUND',
      injuries: 1,
      woundsTotal: 3,
      toughnessCards: [
        {
          id: 'IAT_SCRATCH_2',
          name: 'Царапание',
          description: '',
          effect: 'SCRATCH',
          toughness: 3,
          hasRetreat: false,
          attackerTypes: ['CREEPER', 'ADULT'],
        },
      ],
      toughnessTotal: 3,
      seriousWoundTaken: false,
      killed: true,
    });
    expect(kill).toContain('ЧУЖОЙ УБИТ ВРУЧНУЮ!');
    expect(kill).toContain('Проверка Стойкости');
    expect(kill).toContain('Без Травм');

    const survive = render({
      ...MELEE_MISS,
      dieFace: 'TAIL',
      injuries: 1,
      woundsTotal: 1,
      seriousWoundTaken: false,
    });
    expect(survive).toContain('Чужой выжил');
    expect(survive).not.toContain('Тяжёлая Травма: +1');
  });
});

describe('Окно выстрела (SHOOT_RESOLVED)', () => {
  const SHOT_KILL: ContactPresentationEvent = {
    type: 'SHOOT_RESOLVED',
    playerId: 'player-1',
    roomId: 6,
    weaponName: 'Пистолет учёного',
    ammoLeft: 2,
    targetIntruderId: 'intruder-1',
    targetType: 'ADULT',
    dieFace: 'ONE_WOUND',
    woundsBefore: 2,
    injuries: 1,
    woundsTotal: 3,
    toughnessCards: [
      {
        id: 'IAT_SCRATCH_2',
        name: 'Царапание',
        description: '',
        effect: 'SCRATCH',
        toughness: 3,
        hasRetreat: false,
        attackerTypes: ['CREEPER', 'ADULT'],
      },
    ],
    toughnessTotal: 3,
    killed: true,
  };

  it('показывает грань кубика, оружие, карту Стойкости и гибель Чужого', () => {
    const html = render(SHOT_KILL);
    expect(html).toContain('ВЫСТРЕЛ');
    expect(html).toContain('Кубик Боя: 1 РАНА');
    expect(html).toContain('Пистолет учёного');
    expect(html).toContain('Боезапас: 2');
    expect(html).toContain('Проверка Стойкости');
    expect(html).toContain('Стойкость 3');
    expect(html).toContain('Раны: 2 → 3');
    expect(html).toContain('ЧУЖОЙ УБИТ!');
    expect(html).toContain('жетон Останков Чужого — на полу отсека');
  });

  it('выживший Чужой: раны остаются на миниатюре', () => {
    const html = render({
      ...SHOT_KILL,
      dieFace: 'TAIL',
      injuries: 0,
      woundsTotal: 2,
      toughnessCards: [],
      toughnessTotal: 0,
      killed: false,
    });
    expect(html).toContain('Чужой выжил');
    expect(html).not.toContain('ЧУЖОЙ УБИТ!');
  });
});

describe('Окно Контакта: заражение Личинкой', () => {
  const INFESTATION: ContactPresentationEvent = {
    type: 'CONTACT_OCCURRED',
    playerId: 'player-1',
    roomId: 6,
    tokenType: 'LARVA',
    escapeNumber: 1,
    handCount: 3,
    intruderId: null,
    firstEncounter: false,
    surpriseAttack: false,
    source: 'NOISE',
    infestation: { alreadyInfested: false },
  };

  it('показывает заражение вместо сравнения чисел: без бейджа Внезапной атаки', () => {
    const html = render(INFESTATION);
    expect(html).toContain('КОНТАКТ!');
    expect(html).toContain('ЗАРАЖЕНИЕ!');
    expect(html).toContain('Карта Заражения — в личный сброс, Личинка — на планшет');
    expect(html).not.toContain('Число Внезапной атаки');
    expect(html).not.toContain('Карт после оплаты');
    expect(html).not.toContain('ВНЕЗАПНАЯ АТАКА!');
  });

  it('повторная Личинка: исчезает без гибели, объяснение по FAQ Rules 12', () => {
    const html = render({ ...INFESTATION, infestation: { alreadyInfested: true } });
    expect(html).toContain('ПОВТОРНАЯ ЛИЧИНКА');
    expect(html).toContain('Новая Личинка исчезает');
  });
});

describe('Окно Контакта и атаки', () => {
  it('показывает факты движка, силуэт, число и предупреждение; анимация учитывает reduced motion', () => {
    const html = render(CONTACT);
    expect(html).toContain('КОНТАКТ!');
    expect(html).toContain('Взрослая особь');
    expect(html).toContain('Число Внезапной атаки: 4');
    expect(html).toContain('Карт после оплаты');
    expect(html).toContain('ВНЕЗАПНАЯ АТАКА!');
    expect(html).toContain('Первый Чужой на поле');
    expect(html).toContain('motion-safe:animate-contact-reveal');
    expect(html).toContain('motion-reduce:animate-none');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Продолжить');
  });

  it('не пересчитывает Внезапную атаку на клиенте, даже если текущая рука уже изменилась', () => {
    const state = view();
    state.players['player-1']!.actionDeck.handCount = 6;
    const html = renderToStaticMarkup(
      <ContactModal entry={{ id: 'log-2', sequence: 2, event: CONTACT }} view={state} onClose={() => undefined} />,
    );
    expect(html).toContain('ВНЕЗАПНАЯ АТАКА!');
    expect(html).toContain('>3<');
  });

  it('у Пустого жетона нет числа Внезапной атаки, выдуманной миниатюры и первого столкновения', () => {
    const html = render({
      ...CONTACT,
      tokenType: 'BLANK',
      intruderId: null,
      escapeNumber: 0,
      firstEncounter: false,
      surpriseAttack: false,
    });
    expect(html).toContain('Пустой жетон');
    expect(html).toContain('Жетон возвращён в мешок');
    expect(html).not.toContain('Число Внезапной атаки:');
    expect(html).not.toContain('ВНЕЗАПНАЯ АТАКА!');
    expect(html).not.toContain('Первый Чужой на поле');
  });

  it('показывает открытую карту Атаки и фактические Травмы', () => {
    const html = render(ATTACK);
    expect(html).toContain('Царапина');
    expect(html).toContain('Лёгкие Травмы: 1');
    expect(html).toContain('motion-safe:animate-contact-card');
    expect(html).not.toContain('isInfected');
  });

  it('промах не выдаётся за выполненный эффект карты', () => {
    const html = render({ ...ATTACK, outcome: 'MISS' });
    expect(html).toContain('Промах');
    expect(html).toContain('Эффект карты не применяется');
    expect(html).not.toContain(ATTACK.card!.description);
  });

  it('явно сообщает о гибели и об атаке Личинки без карты', () => {
    expect(render({ ...ATTACK, victims: [{ ...ATTACK.victims[0]!, isDead: true }] })).toContain('ПЕРСОНАЖ ПОГИБ');
    const html = render({ ...ATTACK, intruderType: 'LARVA', card: null, outcome: 'INFESTATION' });
    expect(html).toContain('Личинка: инфицирование');
    expect(html).toContain('личный сброс');
  });

  it.each(['BLANK', 'LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const)('имеет доступный SVG для %s', (type) => {
    const html = renderToStaticMarkup(<IntruderSilhouette type={type} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label=');
    expect(html).toContain('<path');
  });
});

describe('Порядок публичных событий и перезагрузка интерфейса', () => {
  const log: GameLogEntry[] = [
    { id: 'log-1', sequence: 1, event: { type: 'GAME_STARTED' } },
    { id: 'log-2', sequence: 2, event: CONTACT },
    { id: 'log-3', sequence: 3, event: { type: 'CONTAMINATION_RECEIVED', playerId: 'player-1' } },
    { id: 'log-4', sequence: 4, event: ATTACK },
  ];

  it('показывает Контакт и результаты атак в порядке движка, без новой генерации исхода', () => {
    expect(nextContactPresentation(log, 1)?.id).toBe('log-2');
    expect(nextContactPresentation(log, 2)?.id).toBe('log-4');
    expect(nextContactPresentation(log, 4)).toBeNull();
    expect(initialContactSequence(log)).toBe(1);
  });

  it('после загрузки показывает последний Контакт, а не всю старую историю', () => {
    const history = [...log, { id: 'log-5', sequence: 5, event: { ...CONTACT, firstEncounter: false } }];
    expect(initialContactSequence(history)).toBe(4);
    const state = view();
    state.gameLog = history;
    expect(renderToStaticMarkup(<ContactOverlay view={state} />)).toContain('КОНТАКТ!');
  });

  it('новая партия не показывает фиктивный Контакт', () => {
    expect(renderToStaticMarkup(<ContactOverlay view={view()} />)).toBe('');
    expect(initialContactSequence([])).toBe(0);
  });

  it('журнал отображает публичный Контакт и атаку без доступа к полному состоянию', () => {
    const state = view();
    state.gameLog = log;
    const text = formatGameLog(state)
      .flatMap((entry) => entry.segments.map((segment) => segment.text))
      .join('');
    expect(text).toContain('Число жетона 4');
    expect(text).toContain('Царапина');
    expect(text).not.toContain('isInfected');
  });
});
