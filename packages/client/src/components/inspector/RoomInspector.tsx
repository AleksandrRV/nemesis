import React from 'react';
import type { BoardObject } from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { X, Flame, Wrench, Laptop, Package, User, Footprints, Eye, AlertCircle } from 'lucide-react';

/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
const BOARD_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

export const RoomInspector: React.FC = () => {
  const { gameState, selectedRoomId, selectRoom, exploreRoom, movePlayer } = useGameStore();

  if (!selectedRoomId) return null;

  const room = gameState.ship.rooms[selectedRoomId];
  if (!room) return null;

  const roomDef =
    SPECIAL_ROOMS.find((r) => r.id === room.definitionId) ||
    BASIC_ROOMS_1.find((r) => r.id === room.definitionId) ||
    ADDITIONAL_ROOMS_2.find((r) => r.id === room.definitionId) ||
    null;

  const isPlayerHere = room.occupantPlayerIds.includes('player-1');

  return (
    <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
      {/* Шапка инспектора */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
              ОТСЕК #{String(room.id).padStart(3, '0')}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {room.category === 'SPECIAL' ? 'ОСОБАЯ' : room.category === 'ROOM_1' ? 'ОСНОВНАЯ «1»' : 'ДОП. «2»'}
            </span>
          </div>
          <h2 className="text-xl font-heading text-white mt-0.5">
            {room.isExplored ? roomDef?.name || 'Комната' : 'Неисследованный отсек'}
          </h2>
        </div>
        <button
          onClick={() => selectRoom(null)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      {/* Тело инспектора */}
      <div className="py-3 space-y-3 max-h-[60vh] md:max-h-96 overflow-y-auto pr-1">
        {/* Статусы отсека */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
            <Package size={14} className="text-cyan-400" />
            <span className="text-slate-300">
              Предметов: <b className="text-white">{room.itemsCount}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
            <Laptop size={14} className={room.hasComputer ? 'text-cyan-400' : 'text-slate-600'} />
            <span className="text-slate-300">
              Компьютер: <b className="text-white">{room.hasComputer ? 'ДА' : 'НЕТ'}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
            <Flame size={14} className={room.hasFire ? 'text-orange-500' : 'text-slate-600'} />
            <span className="text-slate-300">
              Пожар: <b className="text-white">{room.hasFire ? 'ДА' : 'НЕТ'}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
            <Wrench size={14} className={room.hasMalfunction ? 'text-amber-400' : 'text-slate-600'} />
            <span className="text-slate-300">
              Поломка: <b className="text-white">{room.hasMalfunction ? 'ДА' : 'НЕТ'}</b>
            </span>
          </div>
        </div>

        {/* Описание свойства комнаты */}
        {room.isExplored && roomDef && (
          <div className="bg-slate-900/40 p-2.5 rounded border border-cyan-900/40">
            <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider mb-1">
              Действие комнаты [{roomDef.actionCost}]:
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">{roomDef.actionDescription}</div>
          </div>
        )}

        {/* Находящиеся в комнате объекты */}
        {room.occupantPlayerIds.length > 0 && (
          <div className="text-xs bg-slate-900/40 p-2 rounded flex items-center gap-2">
            <User size={14} className="text-cyan-400" />
            <span>
              В отсеке: <b className="text-cyan-300">Капитан</b>
            </span>
          </div>
        )}

        {room.objects.map((object) => (
          <div
            key={object.id}
            className="text-xs bg-red-950/30 border border-red-900/50 p-2 rounded flex items-center gap-2 text-rose-300"
          >
            <AlertCircle size={14} />
            <span>
              На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b>
            </span>
          </div>
        ))}
      </div>

      {/* Кнопки действий для тестирования билда v0.1.0 */}
      <div className="pt-3 border-t border-slate-800 flex gap-2">
        {!room.isExplored && (
          <button
            onClick={() => exploreRoom(room.id)}
            className="flex-1 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Eye size={14} /> Вскрыть отсек
          </button>
        )}
        {!isPlayerHere && (
          <button
            onClick={() => movePlayer(room.id)}
            className="flex-1 min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Footprints size={14} /> Переместиться сюда
          </button>
        )}
      </div>
    </div>
  );
};
