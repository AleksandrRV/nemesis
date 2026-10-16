import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type ContactPresentationEvent } from '@nemesis/shared';
import { INTRUDER_PORTRAIT_FOCUS_Y, intruderArtUrl } from '../../art/intruderArt';
import { INTRUDER_COLORS } from '../board/intruderShapes';
import { IntruderBadge } from '../board/IntruderBadge';
import { ContactModal } from '../contact/ContactModal';
import { IntruderBoardModal } from '../intruders/IntruderBoardModal';
import { buildIntruderBoardModel, countOnBoardByType } from '../intruders/intruderBoardModel';
import { IntruderPortraitArt, IntruderSplashArt, IntruderTokenArt } from './IntruderArt';

const makeView = () => filterStateForPlayer(createInitialGameState('intruder-art'), 'player-1');

const CONTACT: ContactPresentationEvent = {
  type: 'CONTACT_OCCURRED',
  playerId: 'player-1',
  roomId: 6,
  tokenType: 'QUEEN',
  escapeNumber: 4,
  handCount: 5,
  intruderId: 'intruder-1',
  firstEncounter: false,
  surpriseAttack: false,
  source: 'NOISE',
};

const renderContact = (event: ContactPresentationEvent) =>
  renderToStaticMarkup(
    <ContactModal entry={{ id: 'log-2', sequence: 2, event }} view={makeView()} onClose={() => undefined} />,
  );

describe('Арт Чужих в интерфейсе (doc/art-pipeline.md §2)', () => {
  it('значок — круг в рамке цвета типа с подписью для чтения с экрана', () => {
    const html = renderToStaticMarkup(<IntruderTokenArt type="CREEPER" label="Крипер" />);
    expect(html).toContain(`src="${intruderArtUrl('CREEPER', 'token')}"`);
    expect(html).toContain('rounded-full');
    expect(html).toContain(`border-color:${INTRUDER_COLORS.CREEPER}`);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Крипер"');
  });

  it('у пустого жетона нет файла: значок остаётся векторным силуэтом', () => {
    const html = renderToStaticMarkup(<IntruderTokenArt type="BLANK" />);
    expect(html).not.toContain('<img');
    expect(html).toContain('<path');
    expect(html).toContain('aria-hidden="true"');
  });

  it('портрет заполняет рамку и обрезается вокруг головы: у Личинки фокус ниже, чем у Королевы', () => {
    const html = renderToStaticMarkup(<IntruderPortraitArt type="BREEDER" />);
    expect(html).toContain(`src="${intruderArtUrl('BREEDER', 'portrait')}"`);
    expect(html).toContain('object-cover');
    expect(html).toContain(`object-position:50% ${INTRUDER_PORTRAIT_FOCUS_Y.BREEDER}`);
    expect(parseFloat(INTRUDER_PORTRAIT_FOCUS_Y.LARVA)).toBeGreaterThan(parseFloat(INTRUDER_PORTRAIT_FOCUS_Y.QUEEN));
    expect(html).toContain('loading="lazy"');
  });

  it('кинематограф 16:9 закрывает по 10% кадра сверху и снизу и держит содержимое поверх', () => {
    const html = renderToStaticMarkup(<IntruderSplashArt type="LARVA">поверх</IntruderSplashArt>);
    expect(html).toContain(`src="${intruderArtUrl('LARVA', 'splash')}"`);
    expect(html).toContain('aspect-video');
    expect(html.match(/h-\[10%\] bg-black/g)).toHaveLength(2);
    expect(html).toContain('поверх');
  });
});

describe('Арт Чужих на своих местах', () => {
  it('окно Контакта показывает кинематограф Чужого и число Внезапной атаки поверх кадра', () => {
    const html = renderContact(CONTACT);
    expect(html).toContain(`src="${intruderArtUrl('QUEEN', 'splash')}"`);
    expect(html).toContain('aria-label="Королева"');
    expect(html).toContain('Число Внезапной атаки: 4');
    expect(html).toContain('motion-safe:animate-contact-reveal');
  });

  it('Пустой жетон в окне Контакта остаётся векторным: кадра Чужого нет', () => {
    const html = renderContact({ ...CONTACT, tokenType: 'BLANK', intruderId: null, escapeNumber: 0 });
    expect(html).not.toContain('art/intruders/');
    expect(html).toContain('<path');
  });

  it('бейдж на карте берёт значок типа под круглой маской с уникальным id', () => {
    const html = renderToStaticMarkup(
      <svg>
        <IntruderBadge badge={{ type: 'ADULT', count: 2, wounds: 1 }} x={0} y={0} />
        <IntruderBadge badge={{ type: 'ADULT', count: 1, wounds: 0 }} x={40} y={0} />
      </svg>,
    );
    expect(html).toContain(`href="${intruderArtUrl('ADULT', 'token')}"`);
    const clipIds = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
    expect(clipIds).toHaveLength(2);
    expect(new Set(clipIds).size).toBe(2);
    expect(html).toContain(`clip-path="url(#${clipIds[0]})"`);
    expect(html).toContain('aria-label="Взрослая особь: 2 шт., ран 1"');
  });

  it('планшет Чужих показывает портреты всех пяти видов и число миниатюр каждого на борту', () => {
    const view = makeView();
    view.intrudersPool.boardTokens.push(
      { id: 'intr-1', type: 'ADULT', roomId: 3, woundsCount: 0 },
      { id: 'intr-2', type: 'ADULT', roomId: 7, woundsCount: 1 },
      { id: 'intr-3', type: 'QUEEN', roomId: 7, woundsCount: 0 },
    );
    expect(countOnBoardByType(buildIntruderBoardModel(view))).toEqual({
      LARVA: 0,
      CREEPER: 0,
      ADULT: 2,
      BREEDER: 0,
      QUEEN: 1,
    });
    const html = renderToStaticMarkup(<IntruderBoardModal view={view} onClose={() => undefined} />);
    expect(html).toContain('aria-label="Виды Чужих"');
    for (const type of ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const) {
      expect(html).toContain(`src="${intruderArtUrl(type, 'portrait')}"`);
    }
    expect(html).toContain('на борту: 2');
    expect(html).toContain('на борту: 1');
    expect(html).toContain(`src="${intruderArtUrl('QUEEN', 'token')}"`);
  });
});
