import { Crosshair, Hand } from 'lucide-react';

interface CombatActionButtonsProps {
  onShoot: () => void;
  onMelee: () => void;
}

/**
 * Пара кнопок боевых действий Боя (стр. 19): Стрельба и Рукопашная атака.
 * Показывается только активному игроку в Бою; панели цели открывают
 * ShootModal / MeleeModal.
 */
export function CombatActionButtons({ onShoot, onMelee }: CombatActionButtonsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onShoot}
        className="flex items-center gap-1 rounded border border-red-500 bg-red-950/70 px-2.5 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-900"
      >
        <Crosshair size={13} aria-hidden="true" />
        <span>Стрелять</span>
      </button>
      <button
        type="button"
        onClick={onMelee}
        className="flex items-center gap-1 rounded border border-orange-500 bg-orange-950/70 px-2.5 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-900"
      >
        <Hand size={13} aria-hidden="true" />
        <span>Рукопашная</span>
      </button>
    </>
  );
}
