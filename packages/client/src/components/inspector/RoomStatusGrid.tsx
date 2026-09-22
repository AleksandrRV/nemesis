import { Flame, Laptop, Package, Wrench } from 'lucide-react';
import type { SanitizedRoomState } from '@nemesis/shared';

/** «Неизвестно» для скрытых санитайзером признаков отсека (tech_stack §3.2). */
function unknown(value: boolean | number | null): string {
  return value === null || value === undefined ? '?' : String(value);
}

interface RoomStatusGridProps {
  room: SanitizedRoomState;
}

/** Публичные статусы отсека: Предметы, Компьютер, Пожар, Поломка. */
export function RoomStatusGrid({ room }: RoomStatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
        <Package size={14} className="text-cyan-400" />
        <span className="text-slate-300">
          Предметов: <b className="text-white">{unknown(room.itemsCount)}</b>
        </span>
      </div>
      <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
        <Laptop size={14} className={room.hasComputer ? 'text-cyan-400' : 'text-slate-600'} />
        <span className="text-slate-300">
          Компьютер: <b className="text-white">{unknown(room.hasComputer)}</b>
        </span>
      </div>
      <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
        <Flame size={14} className={room.hasFire ? 'text-orange-500' : 'text-slate-600'} />
        <span className="text-slate-300">
          Пожар: <b className="text-white">{unknown(room.hasFire)}</b>
        </span>
      </div>
      <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
        <Wrench size={14} className={room.hasMalfunction ? 'text-amber-400' : 'text-slate-600'} />
        <span className="text-slate-300">
          Поломка: <b className="text-white">{unknown(room.hasMalfunction)}</b>
        </span>
      </div>
    </div>
  );
}
