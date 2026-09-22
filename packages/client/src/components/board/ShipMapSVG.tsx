import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { SHIP_ROOM_NODES } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { RoomHex } from './RoomHex';
import { CorridorEdge } from './CorridorEdge';
import { TechCorridorHub } from './TechCorridorHub';
import { VentShaftTraces } from './VentShaftTraces';
import { groupIntrudersByRoom } from './intruderMapModel';
import { lastLogSequence, newVentRetreats, type VentEcho } from './techCorridorModel';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ShipMapSVG: React.FC = () => {
  const view = useGameStore((state) => state.view);
  const selectedRoomId = useGameStore((state) => state.selectedRoomId);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const technicalCorridorsOpen = useGameStore((state) => state.technicalCorridorsOpen);
  const openTechnicalCorridors = useGameStore((state) => state.openTechnicalCorridors);

  const intrudersByRoom = React.useMemo(
    () => (view ? groupIntrudersByRoom(view.intrudersPool.boardTokens) : new Map()),
    [view],
  );

  const coordsMap = React.useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of SHIP_ROOM_NODES) {
      map.set(node.id, { x: node.x, y: node.y });
    }
    return map;
  }, []);

  // Чужие, ушедшие в вентиляцию: силуэты гаснут во тьме узла пару секунд
  // (стр. 16) — только новые записи журнала, история при монтировании не играет.
  const [ventEchoes, setVentEchoes] = React.useState<VentEcho[]>([]);
  const seenSequenceRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const gameLog = view?.gameLog;
  React.useEffect(() => {
    if (!gameLog) return;
    if (seenSequenceRef.current === null) {
      seenSequenceRef.current = lastLogSequence(gameLog);
      return;
    }
    const fresh = newVentRetreats(gameLog, seenSequenceRef.current);
    seenSequenceRef.current = lastLogSequence(gameLog);
    if (fresh.length === 0) return;
    const echoes = fresh.map((entry) => ({ key: entry.sequence, type: entry.intruderType }));
    setVentEchoes((prev) =>
      [...prev.filter((echo) => !echoes.some((next) => next.key === echo.key)), ...echoes].slice(-4),
    );
    const keys = new Set(echoes.map((echo) => echo.key));
    setTimeout(() => {
      if (mountedRef.current) setVentEchoes((prev) => prev.filter((echo) => !keys.has(echo.key)));
    }, 2600);
  }, [gameLog]);

  if (!view) return null;

  const technicalNoise = view.ship.technicalCorridorNoise;

  return (
    <div className="relative w-full h-full touch-none bg-nemesis-bg overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.7}
        maxScale={2.8}
        centerOnInit
        limitToBounds={true} // Карта больше никогда не улетит за пределы экрана
        doubleClick={{ disabled: true }} // Отключаем даблклик, ломавший позиционирование при частых кликах
        panning={{ velocityDisabled: true }} // Отключаем инерционный улёт
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Кнопки управления зумом */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-nemesis-hull/90 backdrop-blur border border-nemesis-border p-1.5 rounded-lg shadow-lg">
              <button
                onClick={() => zoomIn(0.3)}
                className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                title="Приблизить"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => zoomOut(0.3)}
                className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                title="Отдалить"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                title="Сбросить масштаб"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Зона масштабирования */}
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <svg
                viewBox="-60 0 1140 1160"
                className="w-full h-full min-w-[800px] min-h-[600px] select-none"
                onClick={() => selectRoom(null)}
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(42, 59, 84, 0.12)" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect x={-60} y={0} width={1140} height={1160} fill="url(#grid)" />

                {/* 0. Слой вентиляционных шахт: трассы к полю Технических Коридоров */}
                <VentShaftTraces hasNoise={technicalNoise} />

                {/* 1. Слой коридоров */}
                <g id="corridors-layer">
                  {Object.values(view.ship.corridors).map((corridor) => {
                    const c1 = coordsMap.get(corridor.fromRoomId);
                    const c2 = coordsMap.get(corridor.toRoomId);
                    if (!c1 || !c2) return null;

                    return (
                      <CorridorEdge key={corridor.id} corridor={corridor} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} />
                    );
                  })}
                </g>

                {/* 2. Слой комнат */}
                <g id="rooms-layer">
                  {Object.values(view.ship.rooms).map((room) => {
                    const coord = coordsMap.get(room.id);
                    if (!coord) return null;

                    return (
                      <RoomHex
                        key={room.id}
                        room={room}
                        intruders={intrudersByRoom.get(room.id) ?? []}
                        x={coord.x}
                        y={coord.y}
                        isSelected={selectedRoomId === room.id}
                        onSelect={selectRoom}
                        technicalNoise={technicalNoise}
                      />
                    );
                  })}
                </g>

                {/* 3. Поле Технических Коридоров: обособленная локация вентиляции (стр. 9, 16) */}
                <TechCorridorHub
                  hasNoise={technicalNoise}
                  isSelected={technicalCorridorsOpen}
                  echoes={ventEchoes}
                  onSelect={openTechnicalCorridors}
                />
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
