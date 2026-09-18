import React from 'react';
import type { CharacterClass } from '@nemesis/shared';
import { CHARACTERS } from '@nemesis/shared';
import { User, Shield, Wrench, Crosshair, Search, FlaskConical, Play, X } from 'lucide-react';

interface CharacterSelectModalProps {
  onSelect: (characterClass: CharacterClass) => void;
  defaultSeed?: string;
  onClose?: () => void;
}

const CLASS_ICONS: Record<CharacterClass, React.ReactNode> = {
  CAPTAIN: <Shield size={20} className="text-cyan-400" />,
  PILOT: <User size={20} className="text-sky-400" />,
  SCIENTIST: <FlaskConical size={20} className="text-emerald-400" />,
  SCOUT: <Search size={20} className="text-lime-400" />,
  SOLDIER: <Crosshair size={20} className="text-red-400" />,
  MECHANIC: <Wrench size={20} className="text-amber-400" />,
};

const CLASS_DESCRIPTIONS: Record<CharacterClass, string> = {
  CAPTAIN: 'Лидер экипажа. Вооружён надежным шестизарядным револьвером. Управляет приказами и тактикой.',
  PILOT: 'Специалист навигации корабля. Оснащен дробовиком. Умело ориентируется в отсеках.',
  SCIENTIST: 'Исследователь биологии Чужих. Носит компактный пистолет. Анализирует образцы и слабости.',
  SCOUT: 'Разведчик отсеков с высокотехнологичной энерговинтовкой. Быстро передвигается и избегает угроз.',
  SOLDIER: 'Опытный штурмовик с автоматической винтовкой. Эффективен в огневом контакте с Чужими.',
  MECHANIC: 'Техник корабля с мощным обрезом. Быстро чинит системы и запечатывает двери коридоров.',
};

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({ onSelect, onClose }) => {
  const [selectedClass, setSelectedClass] = React.useState<CharacterClass>('CAPTAIN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-150 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        )}

        <header className="border-b border-slate-800 pb-4 text-center">
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">ПОДГОТОВКА МИССИИ</span>
          <h2 className="text-2xl font-heading text-white tracking-wider mt-1">ВЫБОР ПЕРСОНАЖА</h2>
          <p className="text-xs text-slate-400 mt-1">Выберите члена экипажа для исследования корабля «Немезида»</p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHARACTERS.map((char) => {
            const isSelected = selectedClass === char.characterClass;
            return (
              <button
                key={char.characterClass}
                type="button"
                onClick={() => setSelectedClass(char.characterClass)}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.35)] -translate-y-1'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {CLASS_ICONS[char.characterClass]}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded">
                      Выбран
                    </span>
                  )}
                </div>
                <div className="font-heading text-sm text-white tracking-wide">{char.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-3 mt-1 leading-relaxed">
                  {CLASS_DESCRIPTIONS[char.characterClass]}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onSelect(selectedClass)}
            className="min-h-[44px] px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg active:scale-95 transition"
          >
            <Play size={16} fill="currentColor" />
            <span>Начать экспедицию</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
