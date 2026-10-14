import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { characterArtUrl } from '../../art/characterArt';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { CrewToken } from '../board/CrewToken';
import { RoleCard } from '../lobby/RoleCard';
import { CharacterAvatar, CharacterPortrait, CharacterSplash } from './CharacterArt';

const token = {
  playerId: 'player-1',
  characterClass: 'SCOUT' as const,
  orderNumber: 3,
  isActive: false,
  hasPassed: false,
  isInHibernation: true,
};

describe('Арт персонажей в интерфейсе (doc/art-pipeline.md §2)', () => {
  it('портрет заполняет рамку и обрезается снизу: голова в верхней трети кадра', () => {
    const html = renderToStaticMarkup(<CharacterPortrait role="PILOT" />);
    expect(html).toContain(`src="${characterArtUrl('PILOT', 'portrait')}"`);
    expect(html).toContain('object-cover object-top');
    expect(html).toContain('loading="lazy"');
  });

  it('аватар — круг в рамке цвета класса', () => {
    const html = renderToStaticMarkup(<CharacterAvatar role="SOLDIER" />);
    expect(html).toContain(`src="${characterArtUrl('SOLDIER', 'avatar')}"`);
    expect(html).toContain('rounded-full');
    expect(html).toContain(`border-color:${CREW_IDENTITIES.SOLDIER.color}`);
  });

  it('широкий кадр держит персонажа справа и выводит подпись поверх затемнения', () => {
    const html = renderToStaticMarkup(<CharacterSplash role="MECHANIC">Механик</CharacterSplash>);
    expect(html).toContain(`src="${characterArtUrl('MECHANIC', 'splash')}"`);
    expect(html).toContain('object-right');
    expect(html).toContain('aspect-video');
    expect(html).toContain('Механик');
  });

  it('карта роли в лобби — портрет класса под плашкой с названием', () => {
    const html = renderToStaticMarkup(<RoleCard role="CAPTAIN" />);
    expect(html).toContain(characterArtUrl('CAPTAIN', 'portrait'));
    expect(html).toContain(CREW_IDENTITIES.CAPTAIN.label);
  });

  it('жетон на поле — аватар в круглой маске, рамка Анабиоза пунктиром и номер игрока', () => {
    const html = renderToStaticMarkup(
      <svg>
        <CrewToken token={token} />
      </svg>,
    );
    expect(html).toContain(`href="${characterArtUrl('SCOUT', 'avatar')}"`);
    expect(html).toMatch(/<clipPath id="crew-avatar-[^"]+"/);
    expect(html).toContain('stroke-dasharray="3 2"');
    expect(html).toContain('>3</text>');
  });

  it('у двух жетонов — разные маски: id обрезки не повторяются на одном поле', () => {
    const html = renderToStaticMarkup(
      <svg>
        <CrewToken token={token} />
        <CrewToken token={{ ...token, playerId: 'player-2', orderNumber: 4 }} />
      </svg>,
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
