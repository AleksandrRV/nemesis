import React from 'react';
import type { BoardObject, SanitizedRoomState } from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { X, Flame, Wrench, Laptop, Package, User, Footprints, AlertCircle, Ban } from 'lucide-react';

/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
const BOARD_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

const CATEGORY_LABELS: Record<SanitizedRoomState['category'], string> = {
  SPECIAL: 'ОСОБАЯ',
  ROOM_1: 'ОСНОВНАЯ «1»',
  ROOM_2: 'ДОП. «2»',
};

/** Скрытое значение показываем честно: игрок не знает ответа, а не «нет». */
function unknown(value: string | number | boolean | null): string {
  if (value === null) return '?';
  if (typeof value === 'boolean') return value ? 'ДА' : 'НЕТ';

  return String(value);
}

export const RoomInspector: React.FC = () => {
  const view = useGameStore((state) => state.view);
  const selectedRoomId = useGameStore((state) => state.selectedRoomId);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);

  if (!view || !selectedRoomId) return null;

  const room = view.ship.rooms[selectedRoomId];
  if (!room) return null;

  const roomDef =
    SPECIAL_ROOMS.find((definition) => definition.id === room.definitionId) ??
    BASIC_ROOMS_1.find((definition) => definition.id === room.definitionId) ??
    ADDITIONAL_ROOMS_2.find((definition) => definition.id === room.definitionId) ??
    null;

  const activePlayerId = view.meta.activePlayerId;
  const activePlayer = view.players[activePlayerId];
  const isPlayerHere = room.occupantPlayerIds.includes(activePlayerId);
  const occupantNames = room.occupantPlayerIds.map((playerId) => view.players[playerId]?.name ?? playerId);

  // Переходить можно только в соседний отсек через открытую Дверь (стр. 14):
  // правило берётся из ядра, чтобы интерфейс не расходился с движком.
  const reachableRoomIds = activePlayer ? findAdjacentOpenRoomIds(view, activePlayer.roomId) : [];
  const canMoveHere = !isPlayerHere && reachableRoomIds.includes(room.id);

  return (
    <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
      {/* Шапка инспектора */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
              ОТСЕК #{String(room.id).padStart(3, '0')}
            </span>
            <span className="text-xs font-mono text-slate-400">{CATEGORY_LABELS[room.category]}</span>
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

        {/* Описание свойства комнаты: только у вскрытого тайла */}
        {room.isExplored && roomDef && (
          <div className="bg-slate-900/40 p-2.5 rounded border border-cyan-900/40">
            <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider mb-1">
              Действие комнаты [{roomDef.actionCost}]:
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">{roomDef.actionDescription}</div>
          </div>
        )}

        {/* Персонажи в отсеке */}
        {occupantNames.length > 0 && (
          <div className="text-xs bg-slate-900/40 p-2 rounded flex items-center gap-2">
            <User size={14} className="text-cyan-400" />
            <span>
              В отсеке: <b className="text-cyan-300">{occupantNames.join(', ')}</b>
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

        {/* Отказ движка: игрок должен понимать, почему действие не прошло */}
        {rejection && (
          <div className="text-xs bg-amber-950/40 border border-amber-900/60 p-2 rounded flex items-start gap-2 text-amber-200">
            <Ban size={14} className="mt-0.5 shrink-0" />
            <span>{rejection}</span>
          </div>
        )}
      </div>

      {/* Действия: только те, что разрешены правилами. Подсветка доступных
          соседей и переход через открытую Дверь (стр. 14) заменяют телепорт. */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
        {isPlayerHere && room.isExplored && (
          <div className="flex flex-col gap-1.5">
            {/* Поиск в отсеке */}
            {room.definitionId !== 'NEST' && room.definitionId !== 'SLIME_ROOM' && (room.itemsCount ?? 0) > 0 && (
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'ACTION_SEARCH',
                    payload: { discardCardIds: [] },
                  })
                }
                className="w-full min-h-[38px] bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Package size={14} /> Обыскать отсек [цена: 1]
              </button>
            )}

            {/* Действие комнаты */}
            {roomDef && roomDef.actionCost > 0 && !room.hasMalfunction && (
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'ACTION_ROOM_ABILITY',
                    payload: { discardCardIds: [] },
                  })
                }
                className="w-full min-h-[38px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <span>Использовать консоль отсека [цена: {roomDef.actionCost}]</span>
              </button>
            )}
          </div>
        )}

        {canMoveHere && (
          <button
            onClick={() => dispatch({ type: 'ACTION_MOVE', payload: { targetRoomId: room.id, discardCardIds: [] } })}
            className="w-full min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Footprints size={14} /> Перейти в отсек [цена: 1]
          </button>
        )}
        {!canMoveHere && !isPlayerHere && (
          <div className="w-full min-h-[44px] bg-slate-900/60 border border-slate-800 text-slate-500 rounded-lg text-xs flex items-center justify-center gap-1.5 px-3 text-center">
            <Ban size={14} /> Сюда нет пути через открытую Дверь
          </div>
        )}
      </div>
    </div>
  );
};
