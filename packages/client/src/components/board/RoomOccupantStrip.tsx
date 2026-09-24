import React from 'react';
import type { SanitizedRoomState } from '@nemesis/shared';
import { Bone, Egg, Skull } from 'lucide-react';
import { CrewToken } from './CrewToken';
import { ROOM_STRIP_OFFSET_Y, layoutRoomTopStrip, paintOrder, type CrewTokenData } from './crewTokenModel';

type FloorObject = SanitizedRoomState['objects'][number];

const OBJECT_COLORS: Record<FloorObject['kind'], string> = {
  CORPSE: '#ff003c',
  EGG: '#00ff66',
  INTRUDER_REMAINS: '#334155',
};

const OBJECT_LABELS: Record<FloorObject['kind'], string> = {
  CORPSE: 'Труп',
  EGG: 'Яйцо',
  INTRUDER_REMAINS: 'Останки Чужого',
};

function FloorObjectMarker({ object, x, y, scale }: { object: FloorObject; x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} role="img" aria-label={OBJECT_LABELS[object.kind]}>
      <circle r={8} fill={OBJECT_COLORS[object.kind]} stroke="#05070c" strokeWidth={1.5} />
      {object.kind === 'CORPSE' && <Skull size={10} className="text-white" x={-5} y={-5} />}
      {object.kind === 'EGG' && <Egg size={10} className="text-slate-950" x={-5} y={-5} />}
      {object.kind === 'INTRUDER_REMAINS' && <Bone size={10} className="text-white" x={-5} y={-5} />}
    </g>
  );
}

export const RoomOccupantStrip: React.FC<{
  x: number;
  y: number;
  crew: readonly CrewTokenData[];
  objects: readonly FloorObject[];
}> = ({ x, y, crew, objects }) => {
  const layout = layoutRoomTopStrip(crew.length, objects.length);
  if (layout.crew.length === 0 && layout.objects.length === 0) return null;
  const stripY = y + ROOM_STRIP_OFFSET_Y;
  const slotByPlayer = new Map(crew.map((token, index) => [token.playerId, layout.crew[index]!.dx]));

  return (
    <g className="pointer-events-none" aria-label="Экипаж и объекты в отсеке">
      {objects.map((object, index) => (
        <FloorObjectMarker
          key={object.id}
          object={object}
          x={x + layout.objects[index]!.dx}
          y={stripY}
          scale={layout.scale}
        />
      ))}
      {paintOrder(crew).map((token) => (
        <CrewToken
          key={token.playerId}
          token={token}
          x={x + (slotByPlayer.get(token.playerId) ?? 0)}
          y={stripY}
          scale={layout.scale}
        />
      ))}
    </g>
  );
};
