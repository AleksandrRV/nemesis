import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TechCorridorHub } from './TechCorridorHub';

function renderHub(props: {
  hasNoise?: boolean;
  isSelected?: boolean;
  echoes?: { key: number; type: 'ADULT' }[];
}): string {
  return renderToStaticMarkup(
    <svg>
      <TechCorridorHub
        hasNoise={props.hasNoise ?? false}
        isSelected={props.isSelected ?? false}
        echoes={props.echoes ?? []}
        onSelect={() => undefined}
      />
    </svg>,
  );
}

describe('Узел Технических Коридоров на карте', () => {
  it('подписи локации и доступность без Шума', () => {
    const html = renderHub({});

    expect(html).toContain('aria-label="Технические Коридоры"');
    expect(html).toContain('ТЕХНИЧЕСКИЕ');
    expect(html).toContain('КОРИДОРЫ');
    expect(html).toContain('ПОЛЕ ВЕНТИЛЯЦИИ • НЕДОСТУПНО ЭКИПАЖУ');
    expect(html).not.toContain('ШУМ В ВЕНТИЛЯЦИИ');
  });

  it('Шум в вентиляции: тревожная подпись, пульсация и звуковые волны', () => {
    const html = renderHub({ hasNoise: true });

    expect(html).toContain('aria-label="Технические Коридоры: Шум в вентиляции"');
    expect(html).toContain('ШУМ В ВЕНТИЛЯЦИИ');
    expect(html).toContain('motion-safe:animate-vent-alarm');
    expect(html).toContain('motion-reduce:opacity');
  });

  it('выбранный узел подсвечен, как выбранный отсек', () => {
    const html = renderHub({ isSelected: true });

    expect(html).toContain('animate-pulse');
  });

  it('уходящий в вентиляцию Чужой показан силуэтом типа', () => {
    const html = renderHub({ echoes: [{ key: 7, type: 'ADULT' }] });

    expect(html).toContain('aria-label="Чужой уходит в вентиляцию: ADULT"');
    expect(html).toContain('motion-safe:animate-vent-echo');
    expect(html).toContain('#ef4444');
  });
});
