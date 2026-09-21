import React from 'react';
import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { COMBAT_DIE_FACE_LABELS } from '../../utils/labels';
import { roomLabel } from '../log/gameLogModel';

interface CombatResultViewProps {
  view: SanitizedGameState;
  events: GameLogEvent[];
}

/**
 * Результат боевой атаки (Стрельба или Рукопашная) из событий журнала: бросок
 * кубика, цена рукопашной (Заражение и Травма), карты Стойкости, гибель или
 * отступление Чужого, гибель атакующего. Чистый компонент — тестируется
 * SSR-рендером через тесты модалок.
 */
export const CombatResultView: React.FC<CombatResultViewProps> = ({ view, events }) => {
  const strike = events.find((event) => event.type === 'SHOT_FIRED' || event.type === 'MELEE_ATTACKED');
  const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
  const killed = events.find((event) => event.type === 'INTRUDER_KILLED');
  const retreated = events.find((event) => event.type === 'INTRUDER_RETREATED');
  const attackerDied = events.find((event) => event.type === 'PLAYER_DIED');

  return (
    <>
      {strike?.type === 'SHOT_FIRED' && (
        <div className="text-xs text-slate-300 leading-relaxed">
          Выстрел из «{strike.weaponName}»: кубик —{' '}
          <strong className="text-white">{COMBAT_DIE_FACE_LABELS[strike.dieFace]}</strong>
          {strike.woundsDealt > 0 ? `, Ран нанесено: ${strike.woundsDealt}.` : ' — промах.'}
        </div>
      )}

      {strike?.type === 'MELEE_ATTACKED' && (
        <div className="text-xs text-slate-300 leading-relaxed">
          Рукопашная атака: кубик — <strong className="text-white">{COMBAT_DIE_FACE_LABELS[strike.dieFace]}</strong>
          {strike.woundsDealt > 0 ? `, Ран нанесено: ${strike.woundsDealt}.` : ' — промах.'}
        </div>
      )}

      {strike?.type === 'MELEE_ATTACKED' && (
        <div className="text-xs text-slate-300 leading-relaxed">
          Цена атаки: <strong className="text-amber-300">+1 Заражение</strong>
          {strike.seriousWoundDealt > 0 && (
            <>
              {', '}
              <strong className="text-rose-300">+1 Тяжёлая Травма</strong>
            </>
          )}
          .
        </div>
      )}

      {toughness?.type === 'TOUGHNESS_CHECKED' && (
        <div className="text-xs text-slate-300 leading-relaxed">
          Проверка Стойкости:{' '}
          {toughness.attackCards
            .map((card) => `«${card.name}» (${card.toughness}${card.hasRetreat ? ', ↩' : ''})`)
            .join(' + ')}{' '}
          против {toughness.woundsTotal} Ран(ы).{' '}
          {toughness.retreated ? (
            <strong className="text-amber-300">Чужой отступает!</strong>
          ) : toughness.killed ? (
            <strong className="text-emerald-300">Чужой убит!</strong>
          ) : (
            <strong className="text-rose-300">Чужой выживает.</strong>
          )}
        </div>
      )}

      {killed?.type === 'INTRUDER_KILLED' && !toughness && (
        <div className="text-xs text-emerald-300">Личинка погибает от любой Раны.</div>
      )}

      {retreated?.type === 'INTRUDER_RETREATED' && (
        <div className="text-xs text-slate-300">Чужой отступает в {roomLabel(view, retreated.toRoomId)}.</div>
      )}

      {toughness?.type === 'TOUGHNESS_CHECKED' && toughness.retreated && !retreated && (
        <div className="text-xs text-slate-300">Отступать некуда: Чужой остаётся в отсеке.</div>
      )}

      {attackerDied?.type === 'PLAYER_DIED' && (
        <div className="text-xs text-rose-400">Персонаж погибает от полученной Травмы.</div>
      )}
    </>
  );
};
