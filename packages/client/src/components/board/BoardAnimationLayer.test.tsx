import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, SHIP_ROOM_NODES } from '@nemesis/shared';
import type { BoardAnimation } from './boardAnimationModel';
import { BoardAnimationLayer } from './BoardAnimationLayer';
import { ROOM_STRIP_OFFSET_Y } from './crewTokenModel';

function mapView() {
  return filterStateForPlayer(createInitialGameState('anim-layer'), 'player-1');
}

function roomPoint(roomId: number) {
  return SHIP_ROOM_NODES.find((node) => node.id === roomId)!;
}

function render(animations: BoardAnimation[], reducedMotion = false): string {
  return renderToStaticMarkup(
    <svg>
      <BoardAnimationLayer view={mapView()} animations={animations} reducedMotion={reducedMotion} />
    </svg>,
  );
}

describe('BoardAnimationLayer: плавные перемещения поверх гексов (Шаг 9)', () => {
  it('пустой слой ничего не рендерит', () => {
    expect(render([])).not.toContain('board-animation-layer');
  });

  it('Персонаж скользит своей фишкой роли от ряда экипажа исходного отсека к целевому', () => {
    const from = roomPoint(11);
    const to = roomPoint(12);
    const html = render([{ kind: 'PLAYER_MOVE', key: 'p1', playerId: 'player-1', fromRoomId: 11, toRoomId: 12 }]);

    expect(html).toContain('board-animation-layer');
    expect(html).toContain('aria-label="Персонаж перемещается: Игрок 1');
    expect(html).toContain('data-crew-number="1"');
    expect(html).toContain(`translate(${from.x}px, ${from.y + ROOM_STRIP_OFFSET_Y}px)`);
    expect(html).toContain('cubic-bezier(0.45, 0.05, 0.25, 1)');
    expect(html).not.toContain(`translate(${to.x}px, ${to.y + ROOM_STRIP_OFFSET_Y}px)`);
  });

  it('Чужой скользит по траектории Коридора силуэтом своего типа', () => {
    const from = roomPoint(6);
    const html = render([
      { kind: 'INTRUDER_MOVE', key: 'i1', intruderId: 'adult-1', intruderType: 'ADULT', fromRoomId: 6, toRoomId: 7 },
    ]);

    expect(html).toContain('aria-label="Чужой перемещается"');
    expect(html).toContain(`translate(${from.x}px, ${from.y}px)`);
    expect(html).toContain('#ef4444'); // цвет Взрослой Особи
  });

  it('уход в вентиляцию: фигурка направляется к узлу Технических Коридоров и растворяется', () => {
    const html = render([
      { kind: 'INTRUDER_TO_TECH', key: 'v1', intruderId: 'adult-2', intruderType: 'ADULT', fromRoomId: 5 },
    ]);

    expect(html).toContain('aria-label="Чужой уходит в Технические Коридоры"');
    // Растворение после прибытия: задержанный переход прозрачности в стиле.
    expect(html).toContain('opacity 420ms ease-in');
    // Узел расходится кругами по прибытии фигурки.
    expect(html).toContain('aria-label="Прибытие в Технические Коридоры"');
    expect(html).toContain('animate-hub-ripple');
  });

  it('взлом Закрытой Двери: ударная волна, искры и вспышка деформации металла', () => {
    const html = render([{ kind: 'DOOR_BREACHED', key: 'd1', corridorId: '6-11' }]);

    expect(html).toContain('aria-label="Взлом Закрытой Двери"');
    expect(html).toContain('animate-door-breach');
    expect(html).toContain('animate-door-shockwave');
    expect(html).toContain('animate-door-spark');
    const from = roomPoint(6);
    const to = roomPoint(11);
    expect(html).toContain(`translate(${(from.x + to.x) / 2}, ${(from.y + to.y) / 2})`);
  });

  it('prefers-reduced-motion: без физического смещения — старт сразу в цели, переход отключён', () => {
    const to = roomPoint(12);
    const html = render([{ kind: 'PLAYER_MOVE', key: 'p1', playerId: 'player-1', fromRoomId: 11, toRoomId: 12 }], true);

    expect(html).toContain(`translate(${to.x}px, ${to.y + ROOM_STRIP_OFFSET_Y}px)`);
    expect(html).toContain('transition:none');
    expect(html).toContain('motion-reduce:animate-token-fade');
  });
});
