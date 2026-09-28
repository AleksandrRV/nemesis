import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { QuestDossier } from './QuestDossier';
import { buildQuestViews, questProgress, type QuestView } from './questBoardModel';

interface BoardQuestSectionProps {
  view: SanitizedGameState;
  canAct: boolean;
  onActivate: (quest: QuestView) => void;
  onShowRoom: (roomId: number) => void;
}

export const BoardQuestSection: React.FC<BoardQuestSectionProps> = ({ view, canAct, onActivate, onShowRoom }) => {
  const quests = buildQuestViews(view);
  const progress = questProgress(quests);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-slate-400">
        Квестовые Предметы лежат «горизонтально» и не работают, пока не выполнено условие. Активация — Действие [1]:
        карта превращается в обычный Предмет инвентаря. Выполнено {progress.active} из {progress.total}.
      </p>
      <ul className="flex gap-3 overflow-x-auto pb-2 pt-1" aria-label="Квесты персонажа">
        {quests.map((quest) => (
          <li key={quest.quest.id}>
            <QuestDossier quest={quest} canAct={canAct} onActivate={() => onActivate(quest)} onShowRoom={onShowRoom} />
          </li>
        ))}
      </ul>
    </div>
  );
};
