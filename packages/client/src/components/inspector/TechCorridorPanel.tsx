import React from 'react';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '@nemesis/shared';
import { Fan, Volume2, Wrench, ScrollText, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { techEntranceRooms } from '../board/techCorridorModel';

const ROOM_DEFINITIONS = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

/**
 * Панель локации «Технические Коридоры» (Шаг 3 этапа 0.5.0): состояние
 * вентиляции, Шум, соединённые входы и доступы по книге правил (стр. 16).
 */
export const TechCorridorPanel: React.FC = () => {
  const view = useGameStore((state) => state.view);
  const closeTechnicalCorridors = useGameStore((state) => state.closeTechnicalCorridors);

  if (!view) return null;

  const hasNoise = view.ship.technicalCorridorNoise;
  const activePlayer = view.players[view.meta.activePlayerId];
  const handCardIds = new Set(activePlayer?.actionDeck.hand.map((card) => card.id) ?? []);
  const holdsMechanicCard = handCardIds.has('ACT_MEC_TECH_CORRIDORS');
  const holdsVentPlans = [...handCardIds].some((cardId) => cardId.startsWith('ITEM_YEL_TECH_CORRIDOR_PLANS'));

  return (
    <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300">
              ПОЛЕ ВЕНТИЛЯЦИИ
            </span>
            <span className="text-xs font-mono text-slate-400">стр. 9, 16</span>
          </div>
          <h2 className="text-xl font-heading text-white mt-0.5 flex items-center gap-2">
            <Fan size={18} className="text-amber-400" aria-hidden="true" />
            ТЕХНИЧЕСКИЕ КОРИДОРЫ
          </h2>
        </div>
        <button
          onClick={closeTechnicalCorridors}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Закрыть панель Технических Коридоров"
        >
          <X size={18} />
        </button>
      </div>

      <div className="py-3 space-y-3 max-h-[60vh] md:max-h-96 overflow-y-auto pr-1">
        <div
          role="status"
          className={`rounded border p-2.5 flex items-center gap-2 text-sm ${
            hasNoise
              ? 'border-red-700 bg-red-950/50 text-red-200'
              : 'border-emerald-900 bg-emerald-950/30 text-emerald-200'
          }`}
        >
          <Volume2 size={16} className={hasNoise ? 'text-red-400' : 'text-emerald-500'} aria-hidden="true" />
          {hasNoise
            ? 'В вентиляции Шум: маркер на поле Технических Коридоров считается на каждом Входе в них (стр. 16).'
            : 'Шума нет: вентиляция спокойна, маркер на поле Технических Коридоров отсутствует.'}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded border border-slate-800">
          Отдельное поле Технические Коридоры соединено вентиляционными шахтами со всеми отсеками, у которых есть Вход
          (красный маячок с номером). Входы и само поле недоступны для Персонажей; Чужой, направленный в номер входа,
          уходит с корабля: миниатюра снимается, все Раны сбрасываются, жетон возвращается в пул (стр. 16, 20).
        </p>

        <div>
          <div className="text-[11px] text-amber-400 uppercase font-bold tracking-wider mb-1">
            Отсеки с Входом в Технические Коридоры
          </div>
          <ul className="space-y-1">
            {techEntranceRooms().map((node) => {
              const room = view.ship.rooms[node.id];
              const definitionName =
                room?.isExplored && room.definitionId
                  ? (ROOM_DEFINITIONS.find((definition) => definition.id === room.definitionId)?.name ?? null)
                  : null;
              return (
                <li
                  key={node.id}
                  className="flex items-center justify-between text-xs bg-slate-900/50 border border-slate-800 rounded px-2 py-1.5"
                >
                  <span className="text-slate-200">
                    {definitionName ?? `Отсек #${String(node.id).padStart(3, '0')}`}
                    {!definitionName && room?.isExplored === false && (
                      <span className="text-slate-500"> — не исследован</span>
                    )}
                  </span>
                  <span className="font-mono text-red-400">входы {node.techNumbers.join(', ')}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider mb-1">
            Доступы по книге правил
          </div>
          <ul className="space-y-1 text-xs text-slate-300">
            <li className="flex items-start gap-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1.5">
              <Wrench size={13} className="mt-0.5 shrink-0 text-cyan-400" aria-hidden="true" />
              <span>
                Механик, карта «Технические коридоры»: переход в любую другую Комнату с Входом в Технические Коридоры.
                {holdsMechanicCard && <b className="text-cyan-300"> Карта у вас на руке.</b>}
              </span>
            </li>
            <li className="flex items-start gap-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1.5">
              <ScrollText size={13} className="mt-0.5 shrink-0 text-yellow-400" aria-hidden="true" />
              <span>
                Предмет «Планы технических коридоров» (Жёлтая колода): переход между Комнатами с Входом в вентиляцию.
                {holdsVentPlans && <b className="text-cyan-300"> Предмет у вас на руке.</b>}
              </span>
            </li>
          </ul>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Розыгрыш этих перемещений появится в следующих шагах разработки; сейчас движок отклоняет их явным отказом.
          </p>
        </div>
      </div>
    </div>
  );
};
