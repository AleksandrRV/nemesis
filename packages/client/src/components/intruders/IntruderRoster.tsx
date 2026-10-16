import { INTRUDER_ART_TYPES } from '../../art/intruderArt';
import { IntruderPortraitArt } from '../art/IntruderArt';
import { INTRUDER_COLORS } from '../board/intruderShapes';
import { INTRUDER_NAMES_RU } from '../board/intruderReference';
import { countOnBoardByType, type IntruderBoardModel } from './intruderBoardModel';

export function IntruderRoster({ model }: { model: IntruderBoardModel }) {
  const onBoard = countOnBoardByType(model);
  return (
    <ul aria-label="Виды Чужих" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {INTRUDER_ART_TYPES.map((type) => {
        const count = onBoard[type];
        const name = INTRUDER_NAMES_RU[type];
        return (
          <li
            key={type}
            data-intruder-roster={type}
            style={count > 0 ? { borderColor: INTRUDER_COLORS[type] } : undefined}
            className={`relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-xl border sm:w-28 lg:aspect-[4/3] lg:w-auto lg:flex-1 ${
              count > 0 ? '' : 'border-slate-800 opacity-60'
            }`}
          >
            <IntruderPortraitArt type={type} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent px-2 pb-1.5 pt-5">
              <span className="block text-[11px] font-bold uppercase leading-tight tracking-wider text-white">
                {name}
              </span>
              <span
                style={count > 0 ? { color: INTRUDER_COLORS[type] } : undefined}
                className="block font-mono text-[10px] text-slate-400"
              >
                {count > 0 ? `на борту: ${count}` : 'нет на борту'}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
