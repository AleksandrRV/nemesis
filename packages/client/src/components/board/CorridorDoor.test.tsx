import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CorridorDoor } from './CorridorDoor';
import type { DoorState, DoorTransition, DoorTransitionKind } from './doorTransitionModel';

function render(doorState: DoorState, transition: DoorTransition | null = null): string {
  return renderToStaticMarkup(
    <svg>
      <CorridorDoor doorState={doorState} cx={100} cy={50} angleDeg={30} transition={transition} />
    </svg>,
  );
}

function transition(kind: DoorTransitionKind, from: DoorState, to: DoorState): DoorTransition {
  return { key: `door-6-11-${kind}`, corridorId: '6-11', kind, from, to };
}

describe('CorridorDoor: статичные состояния', () => {
  it('дверь стоит поперёк коридора в его локальной системе координат', () => {
    expect(render('OPEN')).toContain('transform="translate(100 50) rotate(30) scale(1.35)"');
  });

  it('Открытая: створки уехали в карманы, зелёные индикаторы', () => {
    const html = render('OPEN');
    expect(html).toContain('aria-label="Дверь открыта"');
    expect(html).toContain('translateY(-8.6px)');
    expect(html).toContain('translateY(8.6px)');
    expect(html).toContain('#34d399');
    expect(html).not.toContain('animate-door-seal-pulse');
  });

  it('Закрытая: створки сомкнуты, красный шов герметизации и запорные штифты', () => {
    const html = render('CLOSED');
    expect(html).toContain('aria-label="Дверь закрыта"');
    expect(html).toContain('translateY(0px)');
    expect(html).toContain('url(#door-hazard)');
    expect(html).toContain('animate-door-seal-pulse');
    expect(html).toContain('#ff2d55');
  });

  it('Разрушенная: створок нет, копоть, осколки, тлеющие искры', () => {
    const html = render('DESTROYED');
    expect(html).toContain('aria-label="Дверь разрушена"');
    expect(html).not.toContain('url(#door-hazard)');
    expect(html).toContain('url(#door-scorch)');
    expect(html).toContain('animate-door-ember');
    expect(html).not.toContain('animate-door-wreck-reveal');
  });
});

describe('CorridorDoor: кинематографичные переходы', () => {
  it('закрытие: удар створок, вздрагивание, вспышка шва, пыль и запирание', () => {
    const html = render('CLOSED', transition('CLOSING', 'OPEN', 'CLOSED'));
    expect(html).toContain('data-door-transition="CLOSING"');
    expect(html).toContain('animate-door-leaf-slam');
    expect(html).toContain('--door-travel:-8.6px');
    expect(html).toContain('animate-door-impact-shake');
    expect(html).toContain('animate-door-seam-flash');
    expect(html).toContain('animate-door-puff');
    expect(html).toContain('animate-door-bolt-lock');
  });

  it('открытие: штифты уходят, пар из шва, створки откатываются', () => {
    const html = render('OPEN', transition('OPENING', 'CLOSED', 'OPEN'));
    expect(html).toContain('animate-door-bolt-release');
    expect(html).toContain('animate-door-leaf-retract');
    expect(html).toContain('animation-delay:200ms');
  });

  it('взлом: напряжение и нагрев створок, затем взрыв с осколками и дымом', () => {
    const html = render('DESTROYED', transition('BREACH', 'CLOSED', 'DESTROYED'));
    expect(html).toContain('animate-door-strain');
    expect(html).toContain('animate-door-heat');
    expect(html).toContain('animate-door-blast-flash');
    expect(html).toContain('animate-door-shrapnel');
    expect(html).toContain('animate-door-spark-fly');
    expect(html).toContain('animate-door-smoke');
    expect(html).toContain('animate-door-wreck-reveal');
    expect(html).toContain('animation-delay:520ms');
  });

  it('подрыв Открытой Двери: взрыв сразу, без фазы напряжения', () => {
    const html = render('DESTROYED', transition('BLAST', 'OPEN', 'DESTROYED'));
    expect(html).toContain('animate-door-shrapnel');
    expect(html).not.toContain('animate-door-strain');
    expect(html).toContain('animation-delay:80ms');
  });
});
